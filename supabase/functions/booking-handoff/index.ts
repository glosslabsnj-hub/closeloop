import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuthedTenant, requireInternalSecret, serviceClient } from "../_shared/tenant.ts";
import { captureException } from "../_shared/sentry.ts";
import { sendEmail } from "../_shared/sendEmail.ts";
import { sendTenantSms } from "../_shared/sms-sender.ts";
import { getAppointmentLabel } from "../_shared/terminology.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-closeloop-secret",
};

interface BookingHandoffRequest {
  booking_id?: string;
  tenant_id?: string;
  tenantId?: string;
  event?: "created" | "confirmed" | "cancelled" | "completed";
  test?: boolean;
  method?: string;
  webhook_url?: string;
  webhook_secret?: string;
  notify_email?: string;
  notify_phone?: string;
}

async function createHmacSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return `sha256=${hashHex}`;
}

/**
 * Validate access - supports both user JWT and internal secret
 */
async function validateAccess(
  req: Request,
  requestedTenantId: string | null
): Promise<{ tenantId: string; isInternalCall: boolean }> {
  const hasAuthHeader = req.headers.get("authorization")?.startsWith("Bearer ");
  const hasInternalSecret = req.headers.get("x-closeloop-secret");

  // Try user JWT first
  if (hasAuthHeader) {
    const { tenantId } = await requireAuthedTenant(req, requestedTenantId);
    return { tenantId, isInternalCall: false };
  }

  // Fall back to internal secret for system triggers
  if (hasInternalSecret) {
    requireInternalSecret(req);
    if (!requestedTenantId) {
      throw new Error("tenant_id required for internal calls");
    }
    return { tenantId: requestedTenantId, isInternalCall: true };
  }

  throw new Error("Missing Authorization header or x-closeloop-secret");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: BookingHandoffRequest = await req.json();
    const { booking_id, event: eventType, test, method, webhook_url, webhook_secret, notify_email, notify_phone } = body;
    const isCancellation = eventType === "cancelled";
    const requestedTenantId = body.tenant_id ?? body.tenantId ?? null;

    // SECURITY: Validate access (user JWT or internal secret)
    const { tenantId, isInternalCall } = await validateAccess(req, requestedTenantId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = serviceClient();

    // Handle test requests (requires user JWT, not internal)
    if (test) {
      if (isInternalCall) {
        throw new Error("Test mode requires user authentication, not internal secret");
      }

      const testPayload = {
        type: "booking",
        event: "test",
        tenant_id: tenantId,
        booking_id: "test-booking-123",
        customer: {
          name: "Test Customer",
          phone: "+15551234567",
          email: "test@example.com",
        },
        service: {
          name: "Test Service",
          duration_minutes: 60,
        },
        scheduled_start: new Date().toISOString(),
        scheduled_end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        notes: "This is a test booking",
        created_at: new Date().toISOString(),
      };

      if (method === "webhook" && webhook_url) {
        const payloadString = JSON.stringify(testPayload);
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (webhook_secret) {
          headers["X-CloseLoop-Signature"] = await createHmacSignature(payloadString, webhook_secret);
        }

        const response = await fetch(webhook_url, {
          method: "POST",
          headers,
          body: payloadString,
        });

        if (!response.ok) {
          throw new Error(`Webhook returned ${response.status}: ${await response.text()}`);
        }

        return new Response(JSON.stringify({ success: true, method: "webhook" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (method === "email" && notify_email) {
        console.log(`[TEST] Would send email to ${notify_email}:`, testPayload);
        return new Response(JSON.stringify({ success: true, method: "email", message: "Email test logged" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (method === "sms" && notify_phone) {
        const smsResult = await sendTenantSms({
          tenantId,
          to: notify_phone,
          body: `[TEST] New booking: Test Customer for Test Service. This is a test.`,
        });

        if (!smsResult.success && !smsResult.skipped) {
          throw new Error(`SMS failed: ${smsResult.error}`);
        }

        return new Response(JSON.stringify({ success: true, method: "sms", skipped: smsResult.skipped }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "Test completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Real booking handoff
    if (!booking_id) {
      throw new Error("booking_id is required for non-test requests");
    }

    // SECURITY: Fetch booking AND verify it belongs to the validated tenant
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        lead:leads(*),
        service:services(*)
      `)
      .eq("id", booking_id)
      .eq("tenant_id", tenantId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found or access denied`);
    }

    // Fetch delivery settings scoped to tenant (for owner notifications only)
    const { data: settings } = await supabase
      .from("booking_delivery_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    // Fetch tenant info (including mode + industry for terminology)
    const { data: tenantData } = await supabase
      .from("tenants")
      .select("name, business_mode, industry, phone_public, address")
      .eq("id", tenantId)
      .single();

    // Fetch assistant settings (timezone + SMS templates) once for reuse below
    const { data: assistSettingsRow } = await supabase
      .from("assistant_settings")
      .select("settings_json")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    const tenantTimezone = (assistSettingsRow?.settings_json as any)?.timezone || "America/New_York";

    // Owner notification methods are gated by delivery settings;
    // critical post-booking actions (audit, workflow, calendar, customer SMS) always run
    const ownerMethods = settings?.enabled && Array.isArray(settings.handoff_methods)
      ? settings.handoff_methods.filter((m: string) => m !== "internal")
      : [];
    const results: Record<string, { success: boolean; error?: string }> = {};

    // Build payload
    const payloadEventType = isCancellation ? "booking.cancelled" : (booking.status === "confirmed" ? "booking.confirmed" : "booking.created");
    const payload = {
      type: "booking",
      event: payloadEventType,
      tenant_id: tenantId,
      tenant_name: tenantData?.name,
      booking_id: booking.id,
      customer: {
        name: booking.lead?.full_name || "Unknown",
        phone: booking.lead?.phone || null,
        email: booking.lead?.email || null,
      },
      service: booking.service ? {
        name: booking.service.name,
        duration_minutes: booking.service.duration_minutes,
        price_amount: booking.service.price_amount,
      } : null,
      scheduled_start: booking.start_at,
      scheduled_end: booking.end_at,
      status: booking.status,
      deposit_required: booking.deposit_required,
      deposit_paid: booking.deposit_paid,
      notes: booking.notes,
      created_at: booking.created_at,
    };

    // Record audit event for booking created (internal call, use service key)
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    try {
      await fetch(`${supabaseUrl}/functions/v1/record-audit-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-closeloop-secret": Deno.env.get("CLOSELOOP_INTERNAL_SECRET") || supabaseServiceKey,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          event_type: isCancellation ? "booking.cancelled" : (booking.status === "confirmed" ? "booking.confirmed" : "booking.created"),
          entity_type: "booking",
          entity_id: booking_id,
          actor_type: "system",
          payload: {
            service_name: booking.service?.name,
            customer_name: booking.lead?.full_name,
            scheduled_start: booking.start_at,
          },
          confirmation_summary: isCancellation
            ? `Booking cancelled: ${booking.service?.name || "Service"} for ${booking.lead?.full_name || "Customer"} at ${new Date(booking.start_at).toLocaleString("en-US", { timeZone: tenantTimezone })}`
            : booking.status === "confirmed"
            ? `Booking confirmed: ${booking.service?.name || "Service"} for ${booking.lead?.full_name || "Customer"} at ${new Date(booking.start_at).toLocaleString("en-US", { timeZone: tenantTimezone })}`
            : undefined,
          confirmed_by: isCancellation ? "dashboard" : "staff",
        }),
      });
    } catch (e) {
      console.error("Failed to record booking audit event:", e);
    }

    // Record observation for booking pattern
    if (booking.service?.name) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/record-observation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-closeloop-secret": Deno.env.get("CLOSELOOP_INTERNAL_SECRET") || supabaseServiceKey,
          },
          body: JSON.stringify({
            tenantId: tenantId,
            observationType: "service_pattern",
            subjectKey: `service_${booking.service.id}`,
            observation: `${booking.service.name} booked at ${new Date(booking.start_at).toLocaleTimeString("en-US", { timeZone: tenantTimezone })}`,
          }),
        });
      } catch (e) {
        console.error("Failed to record booking observation:", e);
      }
    }

    // Helper: compute notification status from results for owner methods only
    function computeNotificationStatus(
      ownerMethods: string[],
      results: Record<string, { success: boolean; error?: string }>
    ): { notification_status: "delivered" | "partial" | "failed" | "none"; warnings: string[] } {
      if (ownerMethods.length === 0) {
        return { notification_status: "none", warnings: [] };
      }
      const ownerResults = ownerMethods
        .filter((m) => results[m] !== undefined)
        .map((m) => ({ method: m, ...results[m] }));

      const succeeded = ownerResults.filter((r) => r.success).length;
      const failed = ownerResults.filter((r) => !r.success);
      const warnings = failed.map((r) => `${r.method}_failed: ${r.error || "unknown"}`);

      if (succeeded === 0 && ownerResults.length > 0) {
        warnings.unshift("booking_created_but_owner_not_notified");
        return { notification_status: "failed", warnings };
      }
      if (failed.length > 0) {
        return { notification_status: "partial", warnings };
      }
      return { notification_status: "delivered", warnings: [] };
    }

    // Execute owner notification methods (gated by delivery settings)
    for (const handoffMethod of ownerMethods) {
      try {
        if (handoffMethod === "webhook" && settings?.webhook_url) {
          const payloadString = JSON.stringify(payload);
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };

          if (settings.webhook_secret) {
            headers["X-CloseLoop-Signature"] = await createHmacSignature(payloadString, settings.webhook_secret);
          }

          const response = await fetch(settings.webhook_url, {
            method: "POST",
            headers,
            body: payloadString,
          });

          if (!response.ok) {
            throw new Error(`Webhook returned ${response.status}`);
          }

          results.webhook = { success: true };

          await supabase.from("handoff_attempts").insert({
            tenant_id: tenantId,
            entity_type: "booking",
            entity_id: booking_id,
            method: "webhook",
            status: "success",
          });
        }

        if (handoffMethod === "email" && settings?.notify_email) {
          const customerName = payload.customer.name || "Customer";
          const serviceName = payload.service?.name || "Service";
          const startTime = new Date(payload.scheduled_start).toLocaleString("en-US", { timeZone: tenantTimezone });
          const businessName = payload.tenant_name || "Your Business";

          const emailSubject = isCancellation
            ? `Booking Cancelled: ${customerName} — ${serviceName}`
            : `New Booking: ${customerName} — ${serviceName}`;
          const emailHtml = isCancellation
            ? `
              <h2>Booking Cancelled</h2>
              <p><strong>Customer:</strong> ${customerName}</p>
              ${payload.customer.phone ? `<p><strong>Phone:</strong> ${payload.customer.phone}</p>` : ""}
              <p><strong>Service:</strong> ${serviceName}</p>
              <p><strong>Was Scheduled:</strong> ${startTime}</p>
              ${payload.notes ? `<p><strong>Notes:</strong> ${payload.notes}</p>` : ""}
            `.trim()
            : `
              <h2>New Booking Received</h2>
              <p><strong>Customer:</strong> ${customerName}</p>
              ${payload.customer.phone ? `<p><strong>Phone:</strong> ${payload.customer.phone}</p>` : ""}
              <p><strong>Service:</strong> ${serviceName}</p>
              <p><strong>Scheduled:</strong> ${startTime}</p>
              ${payload.notes ? `<p><strong>Notes:</strong> ${payload.notes}</p>` : ""}
              ${payload.deposit_required && !payload.deposit_paid ? `<p><em>Deposit required — not yet paid</em></p>` : ""}
            `.trim();

          const emailResult = await sendEmail({
            to: settings.notify_email,
            subject: emailSubject,
            businessName,
            html: emailHtml,
          });

          results.email = { success: emailResult.success, error: emailResult.error };

          await supabase.from("handoff_attempts").insert({
            tenant_id: tenantId,
            entity_type: "booking",
            entity_id: booking_id,
            method: "email",
            status: emailResult.success ? "success" : "failed",
            error_message: emailResult.error || null,
          });
        }

        if (handoffMethod === "sms" && settings?.notify_phone) {
          const customerName = booking.lead?.full_name || "Customer";
          const serviceName = booking.service?.name || "Service";
          const startTime = new Date(booking.start_at).toLocaleString("en-US", { timeZone: tenantTimezone });
          const smsBody = isCancellation
            ? `Cancelled: ${customerName} for ${serviceName} (was ${startTime})`
            : `New booking: ${customerName} for ${serviceName} at ${startTime}`;

          const smsResult = await sendTenantSms({
            tenantId,
            to: settings.notify_phone,
            body: smsBody,
          });

          if (smsResult.success) {
            results.sms = { success: true };
            await supabase.from("handoff_attempts").insert({
              tenant_id: tenantId,
              entity_type: "booking",
              entity_id: booking_id,
              method: "sms",
              status: "success",
            });
          } else if (!smsResult.skipped) {
            throw new Error(`SMS failed: ${smsResult.error}`);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results[handoffMethod] = { success: false, error: errorMessage };

        await supabase.from("handoff_attempts").insert({
          tenant_id: tenantId,
          entity_type: "booking",
          entity_id: booking_id,
          method: handoffMethod,
          status: "failed",
          error_message: errorMessage,
        });
      }
    }

    // For completions: delegate to post-service-automation which handles the entire chain
    if (eventType === "completed") {
      try {
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const postServiceResponse = await fetch(
          `${supabaseUrl}/functions/v1/post-service-automation`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              booking_id,
              tenant_id: tenantId,
              completed_by: isInternalCall ? "system" : "staff",
            }),
          }
        );

        const postServiceResult = await postServiceResponse.json();
        const { notification_status, warnings } = computeNotificationStatus(ownerMethods, results);
        const responseBody: Record<string, unknown> = {
          success: true,
          notification_status,
          results: { ...results, post_service: postServiceResult },
        };
        if (warnings.length > 0) responseBody.warnings = warnings;

        // Log to delivery_attempts if all owner notifications failed
        if (notification_status === "failed") {
          await supabase.from("delivery_attempts").insert({
            tenant_id: tenantId,
            entity_type: "booking",
            entity_id: booking_id,
            method: "all",
            status: "failed",
            error_message: "all_owner_notifications_failed",
          }).then(() => {}, () => {});
        }

        return new Response(
          JSON.stringify(responseBody),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        console.error("[booking-handoff] Post-service automation error:", e);
        return new Response(
          JSON.stringify({ success: false, error: "Post-service automation failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // For cancellations: update booking status, send customer SMS, then return
    if (isCancellation) {
      // Update booking status to canceled
      const { error: cancelUpdateError } = await supabase
        .from("bookings")
        .update({ status: "canceled", canceled_at: new Date().toISOString() })
        .eq("id", booking_id)
        .eq("tenant_id", tenantId);

      if (cancelUpdateError) {
        console.error(`[booking-handoff] Failed to update booking status to canceled:`, cancelUpdateError);
      } else {
        console.log(`[booking-handoff] Booking ${booking_id} status updated to canceled`);
      }

      try {
        const customerPhone = booking.lead?.phone;
        if (customerPhone) {
          const smsTemplates = (assistSettingsRow?.settings_json as any)?.sms_templates;
          const cancelConfig = smsTemplates?.appointment_cancellation;
          const cancelEnabled = cancelConfig ? cancelConfig.enabled : true;

          if (cancelEnabled) {
            const apptLabel = getAppointmentLabel(tenantData?.business_mode || "service", tenantData?.industry);
            const template = cancelConfig?.message ||
              `Hi {{customer_name}}, your {{service_name}} with {{business_name}} has been cancelled. If you'd like to rebook, give us a call. Reply STOP to opt out.`;

            const message = template
              .replace(/\{\{customer_name\}\}/g, booking.lead?.full_name || "there")
              .replace(/\{\{business_name\}\}/g, tenantData?.name || "us")
              .replace(/\{\{service_name\}\}/g, booking.service?.name || apptLabel)
              .replace(/\{\{appointment_time\}\}/g, new Date(booking.start_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tenantTimezone }))
              .replace(/\{\{appointment_date\}\}/g, new Date(booking.start_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: tenantTimezone }));

            const smsResult = await sendTenantSms({ tenantId, to: customerPhone, body: message });
            if (smsResult.success) {
              results.customer_cancellation = { success: true };
              console.log(`[booking-handoff] Cancellation SMS sent for ${booking_id}`);
            } else if (!smsResult.skipped) {
              console.error(`[booking-handoff] Customer cancellation SMS failed:`, smsResult.error);
            }
          }
        }
      } catch (e) {
        console.error("[booking-handoff] Customer cancellation SMS error:", e);
      }

      const cancelNotif = computeNotificationStatus(ownerMethods, results);
      const cancelResponseBody: Record<string, unknown> = {
        success: true,
        notification_status: cancelNotif.notification_status,
        results,
      };
      if (cancelNotif.warnings.length > 0) cancelResponseBody.warnings = cancelNotif.warnings;

      if (cancelNotif.notification_status === "failed") {
        await supabase.from("delivery_attempts").insert({
          tenant_id: tenantId,
          entity_type: "booking",
          entity_id: booking_id,
          method: "all",
          status: "failed",
          error_message: "all_owner_notifications_failed",
        }).then(() => {}, () => {});
      }

      return new Response(JSON.stringify(cancelResponseBody), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Trigger workflow if any active workflow matches this event
    const workflowTrigger = booking.status === "confirmed" ? "booking.confirmed" : "booking.created";
    try {
      await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-closeloop-secret": Deno.env.get("CLOSELOOP_INTERNAL_SECRET") || supabaseServiceKey,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          trigger: workflowTrigger,
          entity_type: "booking",
          entity_id: booking_id,
        }),
      });
      console.log(`Triggered workflow for ${workflowTrigger}:`, booking_id);
    } catch (e) {
      console.error("Failed to trigger workflow:", e);
    }

    // Push bookings to Google Calendar (confirmed or pending_deposit without deposit required)
    const shouldSyncCalendar = !booking.external_event_id && (
      booking.status === "confirmed" ||
      (booking.status === "pending_deposit" && !booking.deposit_required)
    );
    if (shouldSyncCalendar) {
      try {
        const calendarResponse = await fetch(`${supabaseUrl}/functions/v1/create-calendar-event`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-closeloop-secret": Deno.env.get("CLOSELOOP_INTERNAL_SECRET") || supabaseServiceKey,
          },
          body: JSON.stringify({
            booking_id,
            tenant_id: tenantId,
          }),
        });

        const calendarResult = await calendarResponse.json();
        if (calendarResult.success) {
          console.log(`Created Google Calendar event for booking ${booking_id}:`, calendarResult.event_id);
          results.google_calendar = { success: true };
        } else if (calendarResult.skipped) {
          console.log(`Skipped Google Calendar for booking ${booking_id}:`, calendarResult.message);
        } else {
          console.error(`Failed to create calendar event:`, calendarResult.error);
          results.google_calendar = { success: false, error: calendarResult.error };
          // Record for retry
          await supabase.from("handoff_attempts").insert({
            tenant_id: tenantId,
            entity_type: "booking",
            entity_id: booking_id,
            method: "google_calendar",
            status: "failed",
            error_message: calendarResult.error || "Calendar sync failed",
            request_payload: { booking_id, tenant_id: tenantId },
          });
        }
      } catch (e) {
        console.error("Failed to create Google Calendar event:", e);
        results.google_calendar = { success: false, error: String(e) };
        // Record for retry
        await supabase.from("handoff_attempts").insert({
          tenant_id: tenantId,
          entity_type: "booking",
          entity_id: booking_id,
          method: "google_calendar",
          status: "failed",
          error_message: String(e),
          request_payload: { booking_id, tenant_id: tenantId },
        });
      }
    }

    // ─── SQUARE APPOINTMENTS SYNC ──────────────────────────────────
    // Push booking to Square if the tenant has a connected square_pos integration
    if (shouldSyncCalendar) {
      try {
        const squareResponse = await fetch(`${supabaseUrl}/functions/v1/sync-square-booking`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-closeloop-secret": Deno.env.get("CLOSELOOP_INTERNAL_SECRET") || supabaseServiceKey,
          },
          body: JSON.stringify({
            booking_id,
            tenant_id: tenantId,
          }),
        });

        const squareResult = await squareResponse.json();
        if (squareResult.success) {
          console.log(`Synced to Square for booking ${booking_id}:`, squareResult.square_booking_id);
          results.square = { success: true, booking_id: squareResult.square_booking_id };
        } else if (squareResult.skipped) {
          console.log(`Skipped Square for booking ${booking_id}:`, squareResult.message);
        } else {
          console.error(`Failed to sync to Square:`, squareResult.error);
          results.square = { success: false, error: squareResult.error };
          // Record for retry
          await supabase.from("handoff_attempts").insert({
            tenant_id: tenantId,
            entity_type: "booking",
            entity_id: booking_id,
            method: "square",
            status: "failed",
            error_message: squareResult.error || "Square sync failed",
            request_payload: { booking_id, tenant_id: tenantId },
          });
        }
      } catch (e) {
        console.error("Failed to sync Square booking:", e);
        results.square = { success: false, error: String(e) };
        // Record for retry
        await supabase.from("handoff_attempts").insert({
          tenant_id: tenantId,
          entity_type: "booking",
          entity_id: booking_id,
          method: "square",
          status: "failed",
          error_message: String(e),
          request_payload: { booking_id, tenant_id: tenantId },
        });
      }
    }

    // ─── CUSTOMER CONFIRMATION SMS ───────────────────────────────────
    // Send confirmation SMS to the CUSTOMER (not the owner) if enabled
    // This always runs (not gated by delivery settings) — customers expect confirmation
    try {
      const customerPhone = booking.lead?.phone;
      if (customerPhone) {
        const smsTemplates = (assistSettingsRow?.settings_json as any)?.sms_templates;
        const confirmationConfig = smsTemplates?.appointment_confirmation;
        // Default to enabled=true if the tenant hasn't configured SMS settings yet
        // (matches the default in the Settings UI which shows confirmation as enabled by default)
        const confirmationEnabled = confirmationConfig ? confirmationConfig.enabled : true;

        if (confirmationEnabled) {
          const startTime = new Date(booking.start_at).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: tenantTimezone,
          });
          const startDate = new Date(booking.start_at).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            timeZone: tenantTimezone,
          });

          const apptLabel = getAppointmentLabel(tenantData?.business_mode || "service", tenantData?.industry);
          const template = confirmationConfig?.message ||
            `Hey {{customer_name}}! You're all set with {{business_name}} on {{appointment_date}} at {{appointment_time}}. See you then! Reply STOP to opt out.`;

          const message = template
            .replace(/\{\{customer_name\}\}/g, booking.lead?.full_name || "there")
            .replace(/\{\{business_name\}\}/g, tenantData?.name || "us")
            .replace(/\{\{service_name\}\}/g, booking.service?.name || `your ${apptLabel}`)
            .replace(/\{\{appointment_time\}\}/g, startTime)
            .replace(/\{\{appointment_date\}\}/g, startDate);

          const smsResult = await sendTenantSms({
            tenantId,
            to: customerPhone,
            body: message,
          });

          if (smsResult.success) {
            await supabase
              .from("bookings")
              .update({ confirmation_sent: true })
              .eq("id", booking_id);
            results.customer_confirmation = { success: true };
            console.log(`[booking-handoff] Confirmation SMS sent via ${smsResult.channel} for ${booking_id}`);
          } else if (smsResult.skipped) {
            console.log(`[booking-handoff] Skipping customer SMS: no verified channel for ${tenantId}`);
          } else {
            console.error(`[booking-handoff] Customer confirmation SMS failed:`, smsResult.error);
            results.customer_confirmation = { success: false, error: smsResult.error };
          }
        }
      }
    } catch (e) {
      console.error("[booking-handoff] Customer confirmation SMS error:", e);
      results.customer_confirmation = { success: false, error: String(e) };
    }

    // ─── CUSTOMER CONFIRMATION EMAIL ──────────────────────────────────
    // Send confirmation email to the CUSTOMER if they have an email address.
    // Runs alongside SMS — if SMS failed/skipped, email becomes the primary confirmation.
    try {
      const customerEmail = booking.lead?.email;
      if (customerEmail) {
        const customerName = booking.lead?.full_name || "there";
        const serviceName = booking.service?.name || "your appointment";
        const businessName = tenantData?.name || "Our Team";
        const businessPhone = tenantData?.phone_public || null;
        const businessAddress = tenantData?.address || null;

        const startTime = new Date(booking.start_at).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: tenantTimezone,
        });
        const startDate = new Date(booking.start_at).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          timeZone: tenantTimezone,
        });

        const emailSubject = `Your appointment with ${businessName} is confirmed`;
        const emailHtml = `
          <p>Hi ${customerName},</p>
          <p>Your appointment is confirmed:</p>
          <ul>
            <li><strong>Date:</strong> ${startDate}</li>
            <li><strong>Time:</strong> ${startTime}</li>
            <li><strong>Service:</strong> ${serviceName}</li>
            ${businessAddress ? `<li><strong>Location:</strong> ${businessAddress}</li>` : ""}
          </ul>
          ${businessPhone ? `<p>If you need to make changes, call <a href="tel:${businessPhone}">${businessPhone}</a>.</p>` : ""}
          <p>${businessName}</p>
        `.trim();

        const emailResult = await sendEmail({
          to: customerEmail,
          subject: emailSubject,
          businessName,
          html: emailHtml,
        });

        if (emailResult.success) {
          results.customer_confirmation_email = { success: true };
          console.log(`[booking-handoff] Confirmation email sent to ${customerEmail} for ${booking_id}`);
        } else {
          results.customer_confirmation_email = { success: false, error: emailResult.error };
          console.error(`[booking-handoff] Customer confirmation email failed:`, emailResult.error);
        }

        // Log to delivery_attempts
        await supabase.from("delivery_attempts").insert({
          tenant_id: tenantId,
          entity_type: "booking",
          entity_id: booking_id,
          method: "email",
          status: emailResult.success ? "success" : "failed",
          error_message: emailResult.error || null,
        }).then(() => {}, () => {});
      }
    } catch (e) {
      console.error("[booking-handoff] Customer confirmation email error:", e);
      results.customer_confirmation_email = { success: false, error: String(e) };
    }

    const finalNotif = computeNotificationStatus(ownerMethods, results);
    const finalResponseBody: Record<string, unknown> = {
      success: true,
      notification_status: finalNotif.notification_status,
      results,
    };
    if (finalNotif.warnings.length > 0) finalResponseBody.warnings = finalNotif.warnings;

    if (finalNotif.notification_status === "failed") {
      await supabase.from("delivery_attempts").insert({
        tenant_id: tenantId,
        entity_type: "booking",
        entity_id: booking_id,
        method: "all",
        status: "failed",
        error_message: "all_owner_notifications_failed",
      }).then(() => {}, () => {});
    }

    return new Response(JSON.stringify(finalResponseBody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Booking handoff error:", error);

    // Capture to Sentry for monitoring
    await captureException(error, {
      tags: { function: "booking-handoff" },
    });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
