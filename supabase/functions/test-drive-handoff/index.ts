import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireInternalSecret, serviceClient } from "../_shared/tenant.ts";
import { sendTenantSms } from "../_shared/sms-sender.ts";
import { sendEmail } from "../_shared/sendEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-closeloop-secret",
};

interface TestDriveHandoffRequest {
  tenant_id: string;
  test_drive_id: string;
  session_id?: string;
}

async function createHmacSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);
  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return `sha256=${hashArray.map(b => b.toString(16).padStart(2, "0")).join("")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    requireInternalSecret(req);
    const body: TestDriveHandoffRequest = await req.json();
    const { tenant_id, test_drive_id } = body;

    if (!tenant_id || !test_drive_id) {
      throw new Error("tenant_id and test_drive_id are required");
    }

    const supabase = serviceClient();

    // Fetch test drive with customer
    const { data: testDrive, error: tdError } = await supabase
      .from("test_drives")
      .select("*, customer:customers(*)")
      .eq("id", test_drive_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (tdError || !testDrive) {
      throw new Error("Test drive not found or access denied");
    }

    // Fetch tenant info
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenant_id)
      .single();

    // Fetch delivery settings — prefer booking_delivery_settings (has handoff_methods schema),
    // fall back to callback_delivery_settings (different column names)
    const { data: bookingSettings } = await supabase
      .from("booking_delivery_settings")
      .select("*")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    const { data: callbackSettings } = !bookingSettings ? await supabase
      .from("callback_delivery_settings")
      .select("*")
      .eq("tenant_id", tenant_id)
      .maybeSingle() : { data: null };

    // Normalize settings from whichever table we found
    const settings = bookingSettings ? {
      enabled: bookingSettings.enabled,
      handoff_methods: bookingSettings.handoff_methods,
      webhook_url: bookingSettings.webhook_url,
      webhook_secret: bookingSettings.webhook_secret,
      notify_email: bookingSettings.notify_email,
      notify_phone: bookingSettings.notify_phone,
    } : callbackSettings ? {
      enabled: callbackSettings.sms_enabled || callbackSettings.email_enabled,
      handoff_methods: [
        "internal",
        ...(callbackSettings.email_enabled ? ["email"] : []),
        ...(callbackSettings.sms_enabled ? ["sms"] : []),
        ...(callbackSettings.webhook_url ? ["webhook"] : []),
      ],
      webhook_url: callbackSettings.webhook_url,
      webhook_secret: callbackSettings.webhook_secret,
      notify_email: callbackSettings.email_recipient,
      notify_phone: callbackSettings.sms_recipient_phone,
    } : null;

    // Resolve methods — handoff_methods can be array ["sms","email"] or object {"sms":true,"email":true}
    function resolveHandoffMethods(hm: unknown): string[] {
      if (Array.isArray(hm)) return hm;
      if (hm && typeof hm === "object") return Object.entries(hm).filter(([, v]) => v).map(([k]) => k);
      return ["internal"];
    }
    const methods = settings?.enabled ? resolveHandoffMethods(settings.handoff_methods) : ["internal"];
    if (!methods.includes("internal")) methods.unshift("internal");

    // Fallback: if no notify_email, look up tenant owner's email
    let notifyEmail = settings?.notify_email || null;
    let notifyPhone = settings?.notify_phone || null;
    if (!notifyEmail || !notifyPhone) {
      const { data: ownerUser } = await supabase
        .from("tenant_users")
        .select("user_id")
        .eq("tenant_id", tenant_id)
        .limit(1)
        .maybeSingle();
      if (ownerUser?.user_id) {
        const { data: authData } = await supabase.auth.admin.getUserById(ownerUser.user_id);
        if (authData?.user?.email && !notifyEmail) {
          notifyEmail = authData.user.email;
          if (!methods.includes("email")) methods.push("email");
        }
        if (authData?.user?.phone && !notifyPhone) {
          notifyPhone = authData.user.phone;
          if (!methods.includes("sms")) methods.push("sms");
        }
      }
    }
    const results: Record<string, { success: boolean; error?: string }> = {};

    // Build vehicle description
    const vehicleParts: string[] = [];
    if (testDrive.vehicle_year) vehicleParts.push(testDrive.vehicle_year);
    if (testDrive.vehicle_make) vehicleParts.push(testDrive.vehicle_make);
    if (testDrive.vehicle_model) vehicleParts.push(testDrive.vehicle_model);
    const vehicleDesc = vehicleParts.join(" ") || "Vehicle TBD";

    // Format scheduled time
    let scheduledStr = "Time TBD";
    if (testDrive.scheduled_date && testDrive.scheduled_time) {
      scheduledStr = `${testDrive.scheduled_date} at ${testDrive.scheduled_time}`;
    } else if (testDrive.scheduled_at) {
      scheduledStr = new Date(testDrive.scheduled_at).toLocaleString("en-US", {
        weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      });
    }

    // Build payload
    const handoffPayload = {
      type: "test_drive",
      event: "test_drive.created",
      tenant_id,
      tenant_name: tenant?.name,
      test_drive_id: testDrive.id,
      customer: {
        name: testDrive.customer?.full_name || "Unknown",
        phone: testDrive.customer?.phone_e164 || null,
        email: testDrive.customer?.email || null,
      },
      vehicle: vehicleDesc,
      vehicle_stock_number: testDrive.vehicle_stock_number,
      scheduled_at: testDrive.scheduled_at,
      scheduled_date: testDrive.scheduled_date,
      scheduled_time: testDrive.scheduled_time,
      duration_minutes: testDrive.duration_minutes,
      trade_in_interest: testDrive.trade_in_interest,
      trade_in_vehicle_info: testDrive.trade_in_vehicle_info,
      financing_interest: testDrive.financing_interest,
      budget_range: testDrive.budget_range,
      sales_rep_requested: testDrive.sales_rep_requested,
      status: testDrive.status,
      notes: testDrive.notes,
      created_at: testDrive.created_at,
    };

    // Execute delivery methods
    for (const method of methods) {
      try {
        if (method === "webhook" && settings?.webhook_url) {
          const payloadString = JSON.stringify(handoffPayload);
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (settings.webhook_secret) {
            headers["X-CloseLoop-Signature"] = await createHmacSignature(payloadString, settings.webhook_secret);
          }
          const resp = await fetch(settings.webhook_url, { method: "POST", headers, body: payloadString });
          results.webhook = { success: resp.ok, error: resp.ok ? undefined : `HTTP ${resp.status}` };
        }

        if (method === "sms" && notifyPhone) {
          const customerName = testDrive.customer?.full_name || "A customer";
          const smsBody = `Test drive scheduled: ${customerName} - ${vehicleDesc}, ${scheduledStr} at ${tenant?.name || "your business"}.${testDrive.trade_in_interest ? " Has trade-in." : ""}`;
          const smsResult = await sendTenantSms({
            tenantId: tenant_id,
            to: notifyPhone,
            body: smsBody,
          });
          if (smsResult.success) {
            results.sms = { success: true };
          } else if (smsResult.skipped) {
            console.log(`[test-drive-handoff] No verified SMS channel for tenant ${tenant_id}`);
            results.sms = { success: false, error: "No verified SMS channel" };
          } else {
            results.sms = { success: false, error: smsResult.error };
          }
        }

        if (method === "email" && notifyEmail) {
          const customerName = testDrive.customer?.full_name || "A customer";
          const emailResult = await sendEmail({
            to: notifyEmail!,
            subject: `Test Drive Scheduled: ${customerName} - ${vehicleDesc}`,
            businessName: tenant?.name || "Your Business",
            html: `
              <div style="font-family: sans-serif; max-width: 600px;">
                <h2 style="color: #1a1a1a;">Test Drive Scheduled</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px; color: #666;">Customer</td><td style="padding: 8px; font-weight: bold;">${customerName}</td></tr>
                  ${testDrive.customer?.phone_e164 ? `<tr><td style="padding: 8px; color: #666;">Phone</td><td style="padding: 8px;"><a href="tel:${testDrive.customer.phone_e164}">${testDrive.customer.phone_e164}</a></td></tr>` : ""}
                  ${testDrive.customer?.email ? `<tr><td style="padding: 8px; color: #666;">Email</td><td style="padding: 8px;">${testDrive.customer.email}</td></tr>` : ""}
                  <tr><td style="padding: 8px; color: #666;">Vehicle</td><td style="padding: 8px; font-weight: bold;">${vehicleDesc}</td></tr>
                  <tr><td style="padding: 8px; color: #666;">Scheduled</td><td style="padding: 8px;">${scheduledStr}</td></tr>
                  <tr><td style="padding: 8px; color: #666;">Duration</td><td style="padding: 8px;">${testDrive.duration_minutes || 30} minutes</td></tr>
                  ${testDrive.trade_in_interest ? `<tr><td style="padding: 8px; color: #666;">Trade-In</td><td style="padding: 8px;">Interested${testDrive.trade_in_vehicle_info ? ` - ${testDrive.trade_in_vehicle_info}` : ""}</td></tr>` : ""}
                  ${testDrive.financing_interest ? `<tr><td style="padding: 8px; color: #666;">Financing</td><td style="padding: 8px;">Interested</td></tr>` : ""}
                  ${testDrive.budget_range ? `<tr><td style="padding: 8px; color: #666;">Budget</td><td style="padding: 8px;">${testDrive.budget_range}</td></tr>` : ""}
                  ${testDrive.sales_rep_requested ? `<tr><td style="padding: 8px; color: #666;">Rep Requested</td><td style="padding: 8px;">${testDrive.sales_rep_requested}</td></tr>` : ""}
                  ${testDrive.notes ? `<tr><td style="padding: 8px; color: #666;">Notes</td><td style="padding: 8px;">${testDrive.notes}</td></tr>` : ""}
                </table>
                <p style="margin-top: 16px; color: #666; font-size: 13px;">Via Flux Receptionist</p>
              </div>
            `,
          });
          results.email = { success: emailResult.success, error: emailResult.error };
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        results[method] = { success: false, error: errMsg };
      }
    }

    // Log handoff attempts
    for (const [method, result] of Object.entries(results)) {
      await supabase.from("handoff_attempts").insert({
        tenant_id,
        entity_type: "test_drive",
        entity_id: test_drive_id,
        method,
        status: result.success ? "success" : "failed",
        error_message: result.error || null,
      });
    }

    return new Response(JSON.stringify({ success: true, methods: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("[test-drive-handoff] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
