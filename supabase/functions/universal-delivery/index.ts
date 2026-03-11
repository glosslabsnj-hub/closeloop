import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail as sendResendEmail } from "../_shared/sendEmail.ts";
import { sendTenantSms } from "../_shared/sms-sender.ts";
import { captureException } from "../_shared/sentry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DeliveryRequest {
  tenant_id: string;
  entity_type: "order" | "booking" | "dispatch" | "reservation" | "catering" | "intake" | "callback" | "job_update";
  entity_id: string;
  test_mode?: boolean;
}

interface CustomerInfo {
  name: string;
  phone: string | null;
  email: string | null;
}

interface DeliveryPayload {
  type: string;
  tenant_id: string;
  entity_id: string;
  business_mode: string;
  created_at: string;
  customer: CustomerInfo;
  summary: string;
  details: Record<string, unknown>;
}

function btoa(str: string): string {
  return btoa(str);
}

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary);
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(payload);
  
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, data);
  const signatureArray = new Uint8Array(signature);
  return Array.from(signatureArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sendWebhook(
  url: string,
  payload: DeliveryPayload,
  settings: Record<string, unknown>
): Promise<{ success: boolean; error?: string; response?: string }> {
  try {
    const payloadStr = JSON.stringify(payload);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add signature if secret exists
    if (settings.webhook_secret) {
      const signature = await signPayload(payloadStr, settings.webhook_secret as string);
      headers["X-Signature"] = signature;
      headers["X-Signature-Algorithm"] = "HMAC-SHA256";
    }

    // Handle auth modes
    const authMode = settings.auth_mode as string;
    if (authMode === "header" && settings.auth_header_name && settings.auth_header_value) {
      headers[settings.auth_header_name as string] = settings.auth_header_value as string;
    } else if (authMode === "basic" && settings.basic_user && settings.basic_pass) {
      const credentials = `${settings.basic_user}:${settings.basic_pass}`;
      headers["Authorization"] = `Basic ${toBase64(credentials)}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: payloadStr,
    });

    const responseText = await response.text();

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${responseText.slice(0, 500)}`,
        response: responseText,
      };
    }

    return { success: true, response: responseText };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdminClient = any;

async function sendEmail(
  _supabaseAdmin: SupabaseAdminClient,
  _tenantId: string,
  email: string,
  payload: DeliveryPayload
): Promise<{ success: boolean; error?: string }> {
  const typeLabel = payload.type.charAt(0).toUpperCase() + payload.type.slice(1);
  const subject = `New ${typeLabel}: ${payload.summary}`;

  const customerHtml = payload.customer.name !== "Unknown"
    ? `<p><strong>Customer:</strong> ${payload.customer.name}</p>` : "";
  const phoneHtml = payload.customer.phone
    ? `<p><strong>Phone:</strong> <a href="tel:${payload.customer.phone}">${payload.customer.phone}</a></p>` : "";
  const detailRows = Object.entries(payload.details)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666;font-size:14px;">${k.replace(/_/g, " ")}</td><td style="padding:4px 0;font-size:14px;">${v}</td></tr>`)
    .join("\n");

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="margin:0 0 16px;font-size:20px;">${typeLabel} Notification</h2>
      <p style="margin:0 0 12px;font-size:15px;">${payload.summary}</p>
      ${customerHtml}
      ${phoneHtml}
      ${detailRows ? `<table style="margin:16px 0;border-collapse:collapse;">${detailRows}</table>` : ""}
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0;"/>
      <p style="color:#999;font-size:12px;">Sent by Flux Receptionist for ${payload.business_mode} business</p>
    </div>
  `.trim();

  const result = await sendResendEmail({ to: email, subject, html });
  return { success: result.success, error: result.error };
}

async function sendSMS(
  _supabaseAdmin: SupabaseAdminClient,
  tenantId: string,
  phone: string,
  payload: DeliveryPayload
): Promise<{ success: boolean; error?: string }> {
  const customerName = payload.customer.name && payload.customer.name !== "Unknown" ? payload.customer.name : null;
  const message = `New ${payload.type}${customerName ? ` from ${customerName}` : ""}: ${payload.summary}${payload.customer.phone ? " | Call back: " + payload.customer.phone : ""}`;

  const result = await sendTenantSms({
    tenantId,
    to: phone,
    body: message,
  });

  if (result.skipped) {
    return { success: false, error: result.reason || "No verified SMS channel" };
  }

  return { success: result.success, error: result.error };
}

async function buildPayload(
  supabaseAdmin: SupabaseAdminClient,
  tenantId: string,
  entityType: string,
  entityId: string
): Promise<DeliveryPayload | null> {
  // Get tenant info
  const { data: tenantData } = await supabaseAdmin
    .from("tenants")
    .select("name, business_mode, hipaa_mode")
    .eq("id", tenantId)
    .single();

  const tenant = tenantData as { name: string; business_mode: string; hipaa_mode?: boolean } | null;

  if (!tenant) return null;

  const hipaaMode = tenant.business_mode === "medical" && tenant.hipaa_mode === true;

  let customer: CustomerInfo = { name: "Unknown", phone: null, email: null };
  let summary = "";
  let details: Record<string, unknown> = {};

  switch (entityType) {
    case "booking": {
      const { data: bookingData } = await supabaseAdmin
        .from("bookings")
        .select(`
          *,
          leads(full_name, phone, email),
          services(name, duration_minutes)
        `)
        .eq("id", entityId)
        .single();

      const booking = bookingData as {
        start_at: string;
        end_at: string;
        notes: string | null;
        status: string;
        deposit_required: boolean;
        deposit_paid: boolean;
        leads?: { full_name: string; phone: string | null; email: string | null } | null;
        services?: { name: string; duration_minutes: number } | null;
      } | null;

      if (!booking) return null;

      customer = {
        name: booking.leads?.full_name || "Unknown",
        phone: booking.leads?.phone || null,
        email: booking.leads?.email || null,
      };
      summary = `${booking.services?.name || "Appointment"} on ${new Date(booking.start_at).toLocaleDateString()}`;
      details = {
        service: booking.services?.name,
        scheduled_start: booking.start_at,
        scheduled_end: booking.end_at,
        notes: booking.notes,
        status: booking.status,
        deposit_required: booking.deposit_required,
        deposit_paid: booking.deposit_paid,
      };
      break;
    }

    case "dispatch": {
      const { data: jobData } = await supabaseAdmin
        .from("dispatch_jobs")
        .select("*")
        .eq("id", entityId)
        .single();

      const job = jobData as {
        customer_name: string | null;
        customer_phone: string | null;
        job_type: string | null;
        job_number: string;
        priority: string;
        status: string;
        pickup_address: string | null;
        dropoff_address: string | null;
        description: string | null;
        scheduled_at: string | null;
        estimated_duration_minutes: number | null;
      } | null;

      if (!job) return null;

      customer = {
        name: job.customer_name || "Unknown",
        phone: job.customer_phone || null,
        email: null,
      };
      summary = `${job.job_type || "Job"} - ${job.priority} priority`;
      details = {
        job_number: job.job_number,
        job_type: job.job_type,
        priority: job.priority,
        status: job.status,
        pickup_address: job.pickup_address,
        dropoff_address: job.dropoff_address,
        description: job.description,
        scheduled_at: job.scheduled_at,
        estimated_duration_minutes: job.estimated_duration_minutes,
      };
      break;
    }

    case "order": {
      const { data: orderData } = await supabaseAdmin
        .from("food_orders")
        .select("*")
        .eq("id", entityId)
        .single();

      const order = orderData as {
        customer_name: string | null;
        customer_phone: string | null;
        order_number: string;
        order_type: string;
        items_json: unknown;
        special_instructions: string | null;
        requested_time: string | null;
        delivery_address: string | null;
        subtotal_cents: number | null;
        total_cents: number | null;
        status: string;
      } | null;

      if (!order) return null;

      customer = {
        name: order.customer_name || "Unknown",
        phone: order.customer_phone || null,
        email: null,
      };
      summary = `Order #${order.order_number} - ${order.order_type}`;
      details = {
        order_number: order.order_number,
        order_type: order.order_type,
        items: order.items_json,
        special_instructions: order.special_instructions,
        requested_time: order.requested_time,
        delivery_address: order.delivery_address,
        subtotal_cents: order.subtotal_cents,
        total_cents: order.total_cents,
        status: order.status,
      };
      break;
    }

    case "reservation": {
      const { data: reservationData } = await supabaseAdmin
        .from("reservations")
        .select("*")
        .eq("id", entityId)
        .single();

      const reservation = reservationData as {
        customer_name: string | null;
        customer_phone: string | null;
        customer_email: string | null;
        party_size: number;
        reservation_time: string;
        notes: string | null;
        status: string;
      } | null;

      if (!reservation) return null;

      customer = {
        name: reservation.customer_name || "Unknown",
        phone: reservation.customer_phone || null,
        email: reservation.customer_email || null,
      };
      summary = `Reservation for ${reservation.party_size} on ${new Date(reservation.reservation_time).toLocaleDateString()}`;
      details = {
        party_size: reservation.party_size,
        reservation_time: reservation.reservation_time,
        notes: reservation.notes,
        status: reservation.status,
      };
      break;
    }

    case "catering": {
      const { data: cateringData } = await supabaseAdmin
        .from("catering_requests")
        .select("*")
        .eq("id", entityId)
        .single();

      const catering = cateringData as {
        customer_name: string;
        customer_phone: string | null;
        customer_email: string | null;
        event_date: string | null;
        event_time: string | null;
        event_type: string | null;
        guest_count: number | null;
        location: string | null;
        menu_preferences: string | null;
        dietary_restrictions: string | null;
        budget_range: string | null;
        notes: string | null;
        status: string;
      } | null;

      if (!catering) return null;

      customer = {
        name: catering.customer_name || "Unknown",
        phone: catering.customer_phone || null,
        email: catering.customer_email || null,
      };
      summary = `Catering for ${catering.guest_count || "?"} guests on ${catering.event_date || "TBD"}`;
      details = {
        event_date: catering.event_date,
        event_time: catering.event_time,
        event_type: catering.event_type,
        guest_count: catering.guest_count,
        location: catering.location,
        menu_preferences: catering.menu_preferences,
        dietary_restrictions: catering.dietary_restrictions,
        budget_range: catering.budget_range,
        notes: catering.notes,
        status: catering.status,
      };
      break;
    }

    case "intake": {
      const { data: intakeData } = await supabaseAdmin
        .from("medical_intakes")
        .select(`
          *,
          customers(full_name, phone_e164, email)
        `)
        .eq("id", entityId)
        .single();

      const intake = intakeData as {
        intake_type: string | null;
        urgency_level: string | null;
        reason_for_visit: string | null;
        preferred_date: string | null;
        preferred_time_range: string | null;
        insurance_provider: string | null;
        verbal_consent_given: boolean | null;
        status: string;
        customers?: { full_name: string; phone_e164: string | null; email: string | null } | null;
      } | null;

      if (!intake) return null;

      customer = {
        name: intake.customers?.full_name || "Unknown",
        phone: hipaaMode ? "[REDACTED]" : intake.customers?.phone_e164 || null,
        email: hipaaMode ? "[REDACTED]" : intake.customers?.email || null,
      };

      // HIPAA: minimize data in payload
      if (hipaaMode) {
        summary = `Medical intake - ${intake.urgency_level || "routine"} priority`;
        details = {
          intake_type: intake.intake_type,
          urgency_level: intake.urgency_level,
          preferred_date: intake.preferred_date,
          preferred_time_range: intake.preferred_time_range,
          status: intake.status,
          // Omit reason_for_visit and ai_summary in HIPAA mode
        };
      } else {
        summary = `Medical intake: ${intake.reason_for_visit?.slice(0, 50) || "General"}`;
        details = {
          intake_type: intake.intake_type,
          urgency_level: intake.urgency_level,
          reason_for_visit: intake.reason_for_visit,
          preferred_date: intake.preferred_date,
          preferred_time_range: intake.preferred_time_range,
          insurance_provider: intake.insurance_provider,
          verbal_consent_given: intake.verbal_consent_given,
          status: intake.status,
        };
      }
      break;
    }

    case "callback": {
      // Callbacks can come from two tables:
      // - opportunities (mid-call tool: elevenlabs-create-callback)
      // - callback_requests (post-call webhook: persistCallback)
      // Try opportunities first, then fall back to callback_requests.
      const { data: opportunityData } = await supabaseAdmin
        .from("opportunities")
        .select(`
          *,
          customers(full_name, phone_e164, email)
        `)
        .eq("id", entityId)
        .maybeSingle();

      if (opportunityData) {
        const opportunity = opportunityData as {
          notes: string | null;
          context_json: Record<string, unknown> | null;
          status: string;
          customers?: { full_name: string; phone_e164: string | null; email: string | null } | null;
        };
        const ctx = opportunity.context_json || {};
        customer = {
          name: opportunity.customers?.full_name || (ctx.customer_name as string) || "Unknown",
          phone: opportunity.customers?.phone_e164 || (ctx.caller_phone as string) || null,
          email: opportunity.customers?.email || null,
        };
        summary = `Callback requested: ${(ctx.reason as string) || "Customer wants a call back"}`;
        details = {
          reason: ctx.reason || null,
          department: ctx.department || null,
          preferred_time: ctx.preferred_time || null,
          caller_phone: ctx.caller_phone || null,
          session_id: ctx.session_id || null,
          status: opportunity.status,
        };
        break;
      }

      // Fallback: check callback_requests table (post-call webhook path)
      const { data: callbackData } = await supabaseAdmin
        .from("callback_requests")
        .select("*")
        .eq("id", entityId)
        .maybeSingle();

      if (!callbackData) return null;

      const cb = callbackData as {
        customer_name: string | null;
        customer_phone: string | null;
        best_time: string | null;
        message: string | null;
        status: string;
        session_id: string | null;
      };
      customer = {
        name: cb.customer_name || "Unknown",
        phone: cb.customer_phone || null,
        email: null,
      };
      summary = `Callback requested: ${cb.message || "Customer wants a call back"}`;
      details = {
        best_time: cb.best_time || null,
        message: cb.message || null,
        caller_phone: cb.customer_phone || null,
        session_id: cb.session_id || null,
        status: cb.status,
      };
      break;
    }

    case "job_update": {
      const { data: jobData } = await supabaseAdmin
        .from("active_jobs")
        .select("*")
        .eq("id", entityId)
        .single();

      const job = jobData as {
        id: string;
        job_number: string;
        title: string;
        status: string;
        priority: string;
        customer_name: string | null;
        customer_phone: string | null;
        notes: string | null;
      } | null;

      if (!job) return null;

      customer = {
        name: job.customer_name || "Customer",
        phone: job.customer_phone || null,
        email: null,
      };
      summary = `🔧 Job update: ${job.title} (${job.job_number}) — status: ${job.status.replace("_", " ")}`;
      details = {
        job_number: job.job_number,
        title: job.title,
        status: job.status,
        priority: job.priority,
      };
      break;
    }

    default:
      return null;
  }

  return {
    type: entityType,
    tenant_id: tenantId,
    entity_id: entityId,
    business_mode: tenant.business_mode || "service",
    created_at: new Date().toISOString(),
    customer,
    summary,
    details,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { tenant_id, entity_type, entity_id, test_mode } = (await req.json()) as DeliveryRequest;

    if (!tenant_id || !entity_type || !entity_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: tenant_id, entity_type, entity_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get delivery settings
    const { data: settingsData } = await supabaseAdmin
      .from("universal_delivery_settings")
      .select("*")
      .eq("tenant_id", tenant_id)
      .single();

    let settings = settingsData as Record<string, unknown> | null;

    if (!settings) {
      // Initialize default settings
      await supabaseAdmin
        .from("universal_delivery_settings")
        .insert({ tenant_id });

      settings = {} as Record<string, unknown>;
    }

    // Determine if any notification channel is configured
    const hasEmail = !!(settings.email_enabled && settings.notify_email);
    const hasSms = !!(settings.sms_enabled && settings.notify_phone);
    const hasWebhook = !!(settings.webhook_enabled && settings.webhook_url);
    const hasAnyChannel = hasEmail || hasSms || hasWebhook;

    // Fallback: if no channels configured, try to find an owner email
    let fallbackEmail: string | null = null;
    if (!hasAnyChannel) {
      // Try tenant email first
      const { data: tenantRow } = await supabaseAdmin
        .from("tenants")
        .select("email, owner_id")
        .eq("id", tenant_id)
        .single();

      if (tenantRow?.email) {
        fallbackEmail = tenantRow.email;
      } else if (tenantRow?.owner_id) {
        // Last resort: look up the auth user's email
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(tenantRow.owner_id);
        if (userData?.user?.email) {
          fallbackEmail = userData.user.email;
        }
      }
    }

    // Build payload
    const payload = await buildPayload(supabaseAdmin, tenant_id, entity_type, entity_id);
    
    if (!payload && !test_mode) {
      return new Response(
        JSON.stringify({ error: "Entity not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If test mode, use a sample payload
    const deliveryPayload = test_mode && !payload ? {
      type: entity_type,
      tenant_id,
      entity_id: "test-" + Date.now(),
      business_mode: "service",
      created_at: new Date().toISOString(),
      customer: { name: "Test Customer", phone: "+15551234567", email: "test@example.com" },
      summary: `Test ${entity_type} delivery`,
      details: { test: true, message: "This is a test payload" },
    } : payload!;

    const results: Record<string, unknown> = { internal: true };

    // Webhook delivery
    if (settings.webhook_enabled && settings.webhook_url) {
      const webhookResult = await sendWebhook(settings.webhook_url as string, deliveryPayload, settings);
      results.webhook = webhookResult;

      // Log attempt
      await supabaseAdmin.from("delivery_attempts").insert({
        tenant_id,
        entity_type,
        entity_id,
        method: "webhook",
        status: webhookResult.success ? "success" : "failed",
        error_message: webhookResult.error || null,
        request_payload: deliveryPayload,
        response_body: webhookResult.response || null,
      });
    }

    // Email delivery
    if (settings.email_enabled && settings.notify_email) {
      const emailResult = await sendEmail(supabaseAdmin, tenant_id, settings.notify_email as string, deliveryPayload);
      results.email = emailResult;

      await supabaseAdmin.from("delivery_attempts").insert({
        tenant_id,
        entity_type,
        entity_id,
        method: "email",
        status: emailResult.success ? "success" : "failed",
        error_message: emailResult.error || null,
        request_payload: deliveryPayload,
      });
    }

    // SMS delivery
    if (settings.sms_enabled && settings.notify_phone) {
      const smsResult = await sendSMS(supabaseAdmin, tenant_id, settings.notify_phone as string, deliveryPayload);
      results.sms = smsResult;

      await supabaseAdmin.from("delivery_attempts").insert({
        tenant_id,
        entity_type,
        entity_id,
        method: "sms",
        status: smsResult.success ? "success" : "failed",
        error_message: smsResult.error || null,
        request_payload: deliveryPayload,
      });
    }

    // Fallback email delivery when no channels are configured
    if (!hasAnyChannel && fallbackEmail) {
      const fallbackResult = await sendEmail(supabaseAdmin, tenant_id, fallbackEmail, deliveryPayload);
      results.fallback_email = fallbackResult;

      await supabaseAdmin.from("delivery_attempts").insert({
        tenant_id,
        entity_type,
        entity_id,
        method: "email",
        status: fallbackResult.success ? "success" : "failed",
        error_message: fallbackResult.error || null,
        request_payload: deliveryPayload,
      });
    }

    // Check if ANY notification was actually delivered
    const anySucceeded =
      (results.webhook as { success?: boolean })?.success ||
      (results.email as { success?: boolean })?.success ||
      (results.sms as { success?: boolean })?.success ||
      (results.fallback_email as { success?: boolean })?.success ||
      false;

    // If no channel was even attempted (no settings AND no fallback found)
    if (!hasAnyChannel && !fallbackEmail) {
      await supabaseAdmin.from("delivery_attempts").insert({
        tenant_id,
        entity_type,
        entity_id,
        method: "none",
        status: "failed",
        error_message: "all_channels_exhausted",
        request_payload: deliveryPayload,
      });
    }

    const warnings: string[] = [];
    let notificationStatus: "delivered" | "partial" | "failed" = "delivered";

    if (!anySucceeded) {
      notificationStatus = "failed";
      warnings.push("no_owner_notification_delivered");
    } else if (!hasAnyChannel && fallbackEmail) {
      notificationStatus = "partial";
      warnings.push("used_fallback_email_no_delivery_settings_configured");
    }

    // Trigger workflow for this entity type if not already handled by specific handoff functions
    // (reservation, catering, intake are only handled here)
    if (["reservation", "catering", "intake"].includes(entity_type) && !test_mode) {
      const triggerMap: Record<string, string> = {
        reservation: "reservation.created",
        catering: "catering.created",
        intake: "intake.created",
      };
      try {
        await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            tenant_id,
            trigger: triggerMap[entity_type],
            entity_type,
            entity_id,
          }),
        });
        console.log(`Triggered workflow for ${triggerMap[entity_type]}:`, entity_id);
      } catch (e) {
        console.error("Failed to trigger workflow:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification_status: notificationStatus,
        ...(warnings.length > 0 ? { warnings } : {}),
        results,
        payload: test_mode ? deliveryPayload : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Universal delivery error:", error);
    await captureException(error, {
      tags: { function: "universal-delivery" },
    });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});