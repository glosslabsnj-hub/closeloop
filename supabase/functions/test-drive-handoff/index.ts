import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireInternalSecret, serviceClient } from "../_shared/tenant.ts";

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

    // Fetch delivery settings
    const { data: settings } = await supabase
      .from("callback_delivery_settings")
      .select("*")
      .eq("tenant_id", tenant_id)
      .single();

    const methods = settings?.enabled && Array.isArray(settings.handoff_methods)
      ? settings.handoff_methods
      : ["internal"];
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

        if (method === "sms" && settings?.notify_phone) {
          const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
          const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
          if (twilioSid && twilioAuth) {
            const { data: phoneNumber } = await supabase
              .from("phone_numbers")
              .select("phone_e164")
              .eq("tenant_id", tenant_id)
              .eq("purpose", "forwarding")
              .single();
            const fromNumber = phoneNumber?.phone_e164 || Deno.env.get("DEFAULT_TWILIO_NUMBER");
            if (fromNumber) {
              const customerName = testDrive.customer?.full_name || "A customer";
              const smsBody = `Test drive scheduled: ${customerName} - ${vehicleDesc}, ${scheduledStr} at ${tenant?.name || "your business"}.${testDrive.trade_in_interest ? " Has trade-in." : ""}`;
              const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
              const resp = await fetch(twilioUrl, {
                method: "POST",
                headers: {
                  "Authorization": `Basic ${btoa(`${twilioSid}:${twilioAuth}`)}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({ To: settings.notify_phone, From: fromNumber, Body: smsBody }),
              });
              results.sms = { success: resp.ok, error: resp.ok ? undefined : `HTTP ${resp.status}` };
            }
          }
        }

        if (method === "email" && settings?.notify_email) {
          console.log(`[test-drive-handoff] Email delivery placeholder for ${settings.notify_email}`);
          results.email = { success: true };
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
