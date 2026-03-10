/**
 * invoice-payment-complete: Called when a customer completes payment on an invoice.
 *
 * Updates invoice status to "paid", notifies business owner,
 * and triggers any post-payment automations.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTenantSms } from "../_shared/sms-sender.ts";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Can be called via redirect (GET with query params) or POST
    let invoiceId: string | null = null;

    if (req.method === "GET") {
      const url = new URL(req.url);
      invoiceId = url.searchParams.get("invoice_id");
    } else {
      const body = await req.json();
      invoiceId = body.invoice_id;
    }

    if (!invoiceId) {
      return errorResponse("Missing invoice_id");
    }

    // Fetch invoice
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (invErr || !invoice) {
      return errorResponse("Invoice not found", 404);
    }

    // Update invoice to paid
    await supabase
      .from("invoices")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        amount_paid_cents: invoice.total_cents,
        balance_due_cents: 0,
      })
      .eq("id", invoiceId);

    // Notify business owner
    const { data: deliverySettings } = await supabase
      .from("booking_delivery_settings")
      .select("notify_phone")
      .eq("tenant_id", invoice.tenant_id)
      .maybeSingle();

    if (deliverySettings?.notify_phone) {
      const amount = (invoice.total_cents / 100).toFixed(2);
      await sendTenantSms({
        tenantId: invoice.tenant_id,
        to: deliverySettings.notify_phone,
        body: `Payment received! Invoice #${invoice.invoice_number} — $${amount} from ${invoice.customer_name}.`,
      });
    }

    // Record audit event
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/record-audit-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          tenant_id: invoice.tenant_id,
          event_type: "invoice.paid",
          entity_type: "invoice",
          entity_id: invoiceId,
          actor_type: "customer",
          payload: {
            invoice_number: invoice.invoice_number,
            amount_cents: invoice.total_cents,
            customer_name: invoice.customer_name,
          },
        }),
      });
    } catch {
      // Non-critical
    }

    // Fire automation executor for "invoice.paid" event
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/automation-executor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          tenant_id: invoice.tenant_id,
          trigger_event: "invoice.paid",
          entity_type: "invoice",
          entity_id: invoiceId,
          payload: {
            invoice_number: invoice.invoice_number,
            customer_name: invoice.customer_name,
            customer_phone: invoice.customer_phone,
            customer_email: invoice.customer_email,
            amount_cents: invoice.total_cents,
            booking_id: invoice.booking_id,
          },
        }),
      });
    } catch {
      // Non-critical
    }

    // If this was a redirect from Stripe, show a thank you page
    if (req.method === "GET") {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("name")
        .eq("id", invoice.tenant_id)
        .single();

      const html = `<!DOCTYPE html>
<html><head><title>Payment Complete</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8fafc}
.card{background:white;border-radius:12px;padding:48px;text-align:center;box-shadow:0 4px 6px rgba(0,0,0,0.07);max-width:400px}
.check{width:64px;height:64px;border-radius:50%;background:#10b981;display:flex;align-items:center;justify-content:center;margin:0 auto 24px}
.check svg{width:32px;height:32px;fill:white}
h1{font-size:24px;color:#1e293b;margin:0 0 12px}
p{color:#64748b;margin:0;line-height:1.6}
</style></head><body>
<div class="card">
<div class="check"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
<h1>Payment Complete</h1>
<p>Thank you for your payment to ${tenant?.name || "the business"}. Your invoice #${invoice.invoice_number} has been marked as paid.</p>
</div></body></html>`;

      return new Response(html, {
        headers: { "Content-Type": "text/html", ...corsHeaders },
      });
    }

    return jsonResponse({ success: true, invoice_id: invoiceId, status: "paid" });

  } catch (err) {
    console.error("[invoice-payment-complete] Error:", err);
    return errorResponse("Internal server error", 500);
  }
});
