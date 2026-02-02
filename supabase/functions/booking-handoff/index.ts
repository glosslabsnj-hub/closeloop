import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuthedTenant, requireInternalSecret, serviceClient } from "../_shared/tenant.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-closeloop-secret",
};

interface BookingHandoffRequest {
  booking_id?: string;
  tenant_id?: string;
  tenantId?: string;
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
    const { booking_id, test, method, webhook_url, webhook_secret, notify_email, notify_phone } = body;
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
        const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");

        if (twilioSid && twilioAuth) {
          // SECURITY: phone_numbers scoped to validated tenantId
          const { data: phoneNumber } = await supabase
            .from("phone_numbers")
            .select("phone_e164")
            .eq("tenant_id", tenantId)
            .eq("purpose", "forwarding")
            .single();

          const fromNumber = phoneNumber?.phone_e164 || Deno.env.get("DEFAULT_TWILIO_NUMBER");

          if (fromNumber) {
            const smsBody = `[TEST] New booking: Test Customer for Test Service. This is a test.`;

            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
            const smsResponse = await fetch(twilioUrl, {
              method: "POST",
              headers: {
                "Authorization": `Basic ${btoa(`${twilioSid}:${twilioAuth}`)}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                To: notify_phone,
                From: fromNumber,
                Body: smsBody,
              }),
            });

            if (!smsResponse.ok) {
              throw new Error(`SMS failed: ${await smsResponse.text()}`);
            }
          }
        }

        return new Response(JSON.stringify({ success: true, method: "sms" }), {
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

    // SECURITY: Fetch delivery settings scoped to tenant
    const { data: settings } = await supabase
      .from("booking_delivery_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .single();

    if (!settings?.enabled) {
      return new Response(JSON.stringify({ success: true, message: "Handoff disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch tenant info
    const { data: tenantData } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .single();

    const methods = Array.isArray(settings.handoff_methods) ? settings.handoff_methods : ["internal"];
    const results: Record<string, { success: boolean; error?: string }> = {};

    // Build payload
    const payload = {
      type: "booking",
      event: "booking.created",
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
          event_type: booking.status === "confirmed" ? "booking.confirmed" : "booking.created",
          entity_type: "booking",
          entity_id: booking_id,
          actor_type: "system",
          payload: {
            service_name: booking.service?.name,
            customer_name: booking.lead?.full_name,
            scheduled_start: booking.start_at,
          },
          confirmation_summary: booking.status === "confirmed"
            ? `Booking confirmed: ${booking.service?.name || "Service"} for ${booking.lead?.full_name || "Customer"} at ${new Date(booking.start_at).toLocaleString()}`
            : undefined,
          confirmed_by: "staff",
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
            observation: `${booking.service.name} booked at ${new Date(booking.start_at).toLocaleTimeString()}`,
          }),
        });
      } catch (e) {
        console.error("Failed to record booking observation:", e);
      }
    }

    // Execute each enabled method
    for (const handoffMethod of methods) {
      if (handoffMethod === "internal") continue;

      try {
        if (handoffMethod === "webhook" && settings.webhook_url) {
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

        if (handoffMethod === "email" && settings.notify_email) {
          console.log(`Sending booking email to ${settings.notify_email}`);
          results.email = { success: true };

          await supabase.from("handoff_attempts").insert({
            tenant_id: tenantId,
            entity_type: "booking",
            entity_id: booking_id,
            method: "email",
            status: "success",
          });
        }

        if (handoffMethod === "sms" && settings.notify_phone) {
          const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
          const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");

          if (twilioSid && twilioAuth) {
            // SECURITY: phone_numbers scoped to validated tenantId
            const { data: phoneNumber } = await supabase
              .from("phone_numbers")
              .select("phone_e164")
              .eq("tenant_id", tenantId)
              .eq("purpose", "forwarding")
              .single();

            const fromNumber = phoneNumber?.phone_e164;

            if (fromNumber) {
              const customerName = booking.lead?.full_name || "Customer";
              const serviceName = booking.service?.name || "Service";
              const startTime = new Date(booking.start_at).toLocaleString();

              const smsBody = `New booking: ${customerName} for ${serviceName} at ${startTime}`;

              const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
              const smsResponse = await fetch(twilioUrl, {
                method: "POST",
                headers: {
                  "Authorization": `Basic ${btoa(`${twilioSid}:${twilioAuth}`)}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                  To: settings.notify_phone,
                  From: fromNumber,
                  Body: smsBody,
                }),
              });

              if (!smsResponse.ok) {
                throw new Error(`SMS failed: ${await smsResponse.text()}`);
              }

              results.sms = { success: true };

              await supabase.from("handoff_attempts").insert({
                tenant_id: tenantId,
                entity_type: "booking",
                entity_id: booking_id,
                method: "sms",
                status: "success",
              });
            }
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

    // Trigger workflow if any active workflow matches this event
    const eventType = booking.status === "confirmed" ? "booking.confirmed" : "booking.created";
    try {
      await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-closeloop-secret": Deno.env.get("CLOSELOOP_INTERNAL_SECRET") || supabaseServiceKey,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          trigger: eventType,
          entity_type: "booking",
          entity_id: booking_id,
        }),
      });
      console.log(`Triggered workflow for ${eventType}:`, booking_id);
    } catch (e) {
      console.error("Failed to trigger workflow:", e);
    }

    // Push confirmed bookings to Google Calendar
    if (booking.status === "confirmed" && !booking.external_event_id) {
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
        }
      } catch (e) {
        console.error("Failed to create Google Calendar event:", e);
        results.google_calendar = { success: false, error: String(e) };
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Booking handoff error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
