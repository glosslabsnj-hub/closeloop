import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireInternalSecret, serviceClient } from "../_shared/tenant.ts";
import { sendTenantSms } from "../_shared/sms-sender.ts";
import { sendEmail } from "../_shared/sendEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-closeloop-secret",
};

interface SalesLeadHandoffRequest {
  tenant_id: string;
  sales_lead_id: string;
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
    const body: SalesLeadHandoffRequest = await req.json();
    const { tenant_id, sales_lead_id } = body;

    if (!tenant_id || !sales_lead_id) {
      throw new Error("tenant_id and sales_lead_id are required");
    }

    const supabase = serviceClient();

    // Fetch sales lead with customer
    const { data: lead, error: leadError } = await supabase
      .from("sales_leads")
      .select("*, customer:customers(*)")
      .eq("id", sales_lead_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (leadError || !lead) {
      throw new Error("Sales lead not found or access denied");
    }

    // Fetch tenant info
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenant_id)
      .single();

    // Fetch delivery settings (reuse callback delivery settings or a generic handoff config)
    const { data: settings } = await supabase
      .from("callback_delivery_settings")
      .select("*")
      .eq("tenant_id", tenant_id)
      .single();

    const methods = settings?.enabled && Array.isArray(settings.handoff_methods)
      ? settings.handoff_methods
      : ["internal"];
    const results: Record<string, { success: boolean; error?: string }> = {};

    // Build payload
    const handoffPayload = {
      type: "sales_lead",
      event: "sales_lead.created",
      tenant_id,
      tenant_name: tenant?.name,
      sales_lead_id: lead.id,
      lead_number: lead.lead_number,
      customer: {
        name: lead.customer?.full_name || "Unknown",
        phone: lead.customer?.phone_e164 || null,
        email: lead.customer?.email || null,
      },
      interest_type: lead.interest_type,
      vehicle_interest: lead.vehicle_interest,
      budget_range: lead.budget_range,
      timeline: lead.timeline,
      has_trade_in: lead.has_trade_in,
      trade_in_details: lead.trade_in_details,
      financing_preapproved: lead.financing_preapproved,
      priority: lead.priority,
      status: lead.status,
      notes: lead.notes,
      created_at: lead.created_at,
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
          const smsBody = `New sales lead ${lead.lead_number}: ${lead.customer?.full_name || "Unknown"} - ${lead.vehicle_interest || lead.interest_type || "General inquiry"}. Priority: ${lead.priority}. ${lead.timeline ? `Timeline: ${lead.timeline}` : ""}`;
          const smsResult = await sendTenantSms({
            tenantId: tenant_id,
            to: settings.notify_phone,
            body: smsBody,
          });
          if (smsResult.success) {
            results.sms = { success: true };
          } else if (smsResult.skipped) {
            console.log(`[sales-lead-handoff] No verified SMS channel for tenant ${tenant_id}`);
            results.sms = { success: false, error: "No verified SMS channel" };
          } else {
            results.sms = { success: false, error: smsResult.error };
          }
        }

        if (method === "email" && settings?.notify_email) {
          const customerName = lead.customer?.full_name || "Unknown";
          const vehicleInterest = lead.vehicle_interest || lead.interest_type || "General inquiry";
          const emailResult = await sendEmail({
            to: settings.notify_email,
            subject: `New Sales Lead: ${customerName} - ${vehicleInterest}`,
            businessName: tenant?.name || "Your Business",
            html: `
              <div style="font-family: sans-serif; max-width: 600px;">
                <h2 style="color: #1a1a1a;">New Sales Lead</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px; color: #666;">Customer</td><td style="padding: 8px; font-weight: bold;">${customerName}</td></tr>
                  ${lead.customer?.phone_e164 ? `<tr><td style="padding: 8px; color: #666;">Phone</td><td style="padding: 8px;"><a href="tel:${lead.customer.phone_e164}">${lead.customer.phone_e164}</a></td></tr>` : ""}
                  ${lead.customer?.email ? `<tr><td style="padding: 8px; color: #666;">Email</td><td style="padding: 8px;">${lead.customer.email}</td></tr>` : ""}
                  <tr><td style="padding: 8px; color: #666;">Interest</td><td style="padding: 8px;">${vehicleInterest}</td></tr>
                  ${lead.budget_range ? `<tr><td style="padding: 8px; color: #666;">Budget</td><td style="padding: 8px;">${lead.budget_range}</td></tr>` : ""}
                  ${lead.timeline ? `<tr><td style="padding: 8px; color: #666;">Timeline</td><td style="padding: 8px;">${lead.timeline}</td></tr>` : ""}
                  <tr><td style="padding: 8px; color: #666;">Priority</td><td style="padding: 8px; font-weight: bold; color: ${lead.priority === "hot" ? "#dc2626" : lead.priority === "high" ? "#ea580c" : "#1a1a1a"};">${(lead.priority || "normal").toUpperCase()}</td></tr>
                  ${lead.has_trade_in ? `<tr><td style="padding: 8px; color: #666;">Trade-In</td><td style="padding: 8px;">Yes${lead.trade_in_details ? ` - ${lead.trade_in_details}` : ""}</td></tr>` : ""}
                  ${lead.financing_preapproved ? `<tr><td style="padding: 8px; color: #666;">Financing</td><td style="padding: 8px;">Pre-approved</td></tr>` : ""}
                  ${lead.notes ? `<tr><td style="padding: 8px; color: #666;">Notes</td><td style="padding: 8px;">${lead.notes}</td></tr>` : ""}
                </table>
                <p style="margin-top: 16px; color: #666; font-size: 13px;">Lead #${lead.lead_number} via Flux Receptionist</p>
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
        entity_type: "sales_lead",
        entity_id: sales_lead_id,
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
    console.error("[sales-lead-handoff] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
