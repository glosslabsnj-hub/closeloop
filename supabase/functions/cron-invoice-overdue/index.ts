/**
 * cron-invoice-overdue: Mark overdue invoices and send payment reminders.
 *
 * Runs daily. Checks for invoices past due_at that are still in sent/viewed status.
 * Sends a reminder to the customer and notifies the business owner.
 *
 * Mode-aware: different reminder tones per business type.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTenantSms } from "../_shared/sms-sender.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MODE_REMINDER_TEMPLATES: Record<string, string> = {
  service:
    "Hi {{customer_name}}, this is a friendly reminder that your invoice #{{invoice_number}} for ${{amount}} from {{business_name}} is past due. {{payment_line}}Thanks! Reply STOP to opt out.",
  dispatch:
    "Hi {{customer_name}}, your balance of ${{amount}} with {{business_name}} (Invoice #{{invoice_number}}) is past due. {{payment_line}}Please settle at your earliest convenience. Reply STOP to opt out.",
  food:
    "Hi {{customer_name}}, just a reminder about your outstanding balance of ${{amount}} with {{business_name}}. {{payment_line}}Reply STOP to opt out.",
  medical:
    "Hi {{customer_name}}, this is {{business_name}}. Your balance of ${{amount}} (Invoice #{{invoice_number}}) is past due. {{payment_line}}Please contact us if you have questions. Reply STOP to opt out.",
  general:
    "Hi {{customer_name}}, your invoice #{{invoice_number}} for ${{amount}} from {{business_name}} is past due. {{payment_line}}Reply STOP to opt out.",
};

function resolveTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date().toISOString();
    const results = { marked_overdue: 0, reminders_sent: 0, owner_notified: 0, errors: 0 };

    // Find invoices that are past due
    const { data: overdueInvoices } = await supabase
      .from("invoices")
      .select("*, tenants:tenant_id(name, business_mode)")
      .in("status", ["sent", "viewed"])
      .lt("due_at", now)
      .gt("balance_due_cents", 0);

    if (!overdueInvoices?.length) {
      return new Response(JSON.stringify({ message: "No overdue invoices", ...results }));
    }

    for (const invoice of overdueInvoices) {
      try {
        // Mark as overdue
        await supabase
          .from("invoices")
          .update({ status: "overdue" })
          .eq("id", invoice.id);
        results.marked_overdue++;

        const tenant = invoice.tenants as any;
        const mode = tenant?.business_mode || "general";
        const template = MODE_REMINDER_TEMPLATES[mode] || MODE_REMINDER_TEMPLATES.general;
        const amount = (invoice.balance_due_cents / 100).toFixed(2);
        const paymentLine = invoice.payment_url
          ? `Pay here: ${invoice.payment_url} `
          : "Please contact us to arrange payment. ";

        // Send reminder to customer
        if (invoice.customer_phone) {
          const message = resolveTemplate(template, {
            customer_name: invoice.customer_name || "there",
            invoice_number: invoice.invoice_number || "",
            amount,
            business_name: tenant?.name || "",
            payment_line: paymentLine,
          });

          const smsResult = await sendTenantSms({
            tenantId: invoice.tenant_id,
            to: invoice.customer_phone,
            body: message,
          });

          if (smsResult.success) results.reminders_sent++;
        }

        // Notify business owner
        const { data: deliverySettings } = await supabase
          .from("booking_delivery_settings")
          .select("notify_phone")
          .eq("tenant_id", invoice.tenant_id)
          .maybeSingle();

        if (deliverySettings?.notify_phone) {
          await sendTenantSms({
            tenantId: invoice.tenant_id,
            to: deliverySettings.notify_phone,
            body: `Overdue: Invoice #${invoice.invoice_number} ($${amount}) for ${invoice.customer_name} is past due.`,
          });
          results.owner_notified++;
        }
      } catch (err) {
        console.error(`[cron-invoice-overdue] Error for invoice ${invoice.id}:`, err);
        results.errors++;
      }
    }

    console.log(`[cron-invoice-overdue] Done:`, results);
    return new Response(JSON.stringify(results));
  } catch (error) {
    console.error("[cron-invoice-overdue] Fatal error:", error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
