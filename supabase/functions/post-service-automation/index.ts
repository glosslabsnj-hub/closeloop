/**
 * post-service-automation: Triggered when a booking is marked "completed".
 *
 * Orchestrates the full post-service chain:
 * 1. Generate invoice (if auto-invoice enabled for this business mode)
 * 2. Send thank-you / receipt SMS to customer
 * 3. Queue review request (delayed, via cron-review-requests)
 * 4. Fire automation-executor for "booking.completed" event
 * 5. Update booking with completion metadata
 *
 * Mode-aware: each business type has different post-service flows.
 * - Service (HVAC/plumbing): invoice + review request + seasonal follow-up
 * - Dispatch (towing): invoice + thank-you (no review for roadside)
 * - Food: receipt already sent at POS, just review request
 * - Medical: balance billing handled separately, satisfaction survey
 * - General: invoice + review request
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTenantSms } from "../_shared/sms-sender.ts";
import { corsHeaders, jsonResponse, errorResponse, corsResponse } from "../_shared/cors.ts";
import { getAutomationConfig } from "../_shared/automationSettings.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface PostServiceRequest {
  booking_id: string;
  tenant_id: string;
  completed_by?: string;        // "staff" | "system" | "integration"
  completion_notes?: string;
  actual_duration_minutes?: number;
  additional_charges?: Array<{
    description: string;
    amount_cents: number;
  }>;
}

// Mode-specific post-service templates
const MODE_THANKYOU_TEMPLATES: Record<string, string> = {
  service: "Hi {{customer_name}}, your {{service_name}} with {{business_name}} is complete! {{invoice_line}}We appreciate your business. {{review_line}}Reply STOP to opt out.",
  dispatch: "Hi {{customer_name}}, your service with {{business_name}} is complete. {{invoice_line}}Thanks for choosing us! Reply STOP to opt out.",
  food: "Thanks for your order, {{customer_name}}! We hope you enjoyed everything from {{business_name}}. {{review_line}}Reply STOP to opt out.",
  medical: "Hi {{customer_name}}, thank you for visiting {{business_name}} today. {{invoice_line}}We hope you had a great experience. Reply STOP to opt out.",
  general: "Hi {{customer_name}}, your {{service_name}} with {{business_name}} is complete! {{invoice_line}}Thank you for your business. {{review_line}}Reply STOP to opt out.",
};

// Which modes auto-generate invoices by default
const MODE_AUTO_INVOICE_DEFAULTS: Record<string, boolean> = {
  service: true,    // HVAC/plumber always invoices after work
  dispatch: true,   // Towing invoices after delivery
  food: false,      // Usually pre-paid at POS
  medical: false,   // Complex billing, handled externally
  general: true,    // Default to invoicing
};

// Which modes request reviews by default
const MODE_REVIEW_REQUEST_DEFAULTS: Record<string, boolean> = {
  service: true,
  dispatch: false,  // Roadside assist - not ideal for reviews
  food: true,
  medical: true,
  general: true,
};

function resolveTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: PostServiceRequest = await req.json();
    const { booking_id, tenant_id, completed_by, completion_notes, actual_duration_minutes, additional_charges } = body;

    if (!booking_id || !tenant_id) {
      return errorResponse("Missing required fields: booking_id, tenant_id");
    }

    const results: Record<string, any> = {
      invoice: null,
      thank_you_sms: null,
      review_queued: false,
      automation_triggered: false,
    };

    // Fetch booking with related data
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select(`
        *,
        lead:leads(*),
        service:services(*)
      `)
      .eq("id", booking_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (bookingErr || !booking) {
      return errorResponse("Booking not found or access denied", 404);
    }

    // Fetch tenant info
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name, business_mode, industry")
      .eq("id", tenant_id)
      .single();

    const mode = tenant?.business_mode || "general";

    // Fetch assistant settings
    const { data: settingsRow } = await supabase
      .from("assistant_settings")
      .select("settings_json")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    const settings = (settingsRow?.settings_json as Record<string, any>) || {};
    const timezone = settings.timezone || "America/New_York";

    // Fetch mode-specific workflow config for invoice preferences
    let autoInvoice = MODE_AUTO_INVOICE_DEFAULTS[mode] ?? true;
    let autoReview = MODE_REVIEW_REQUEST_DEFAULTS[mode] ?? true;
    let invoiceDueDays = 30;
    let taxRate = 0;

    // Check workflow config for overrides
    const configTable = `${mode}_workflow_config`;
    try {
      const { data: wfConfig } = await supabase
        .from(configTable)
        .select("*")
        .eq("tenant_id", tenant_id)
        .maybeSingle();

      if (wfConfig) {
        if (wfConfig.auto_invoice !== undefined) autoInvoice = wfConfig.auto_invoice;
        if (wfConfig.auto_review_request !== undefined) autoReview = wfConfig.auto_review_request;
        if (wfConfig.invoice_due_days) invoiceDueDays = wfConfig.invoice_due_days;
        if (wfConfig.tax_rate) taxRate = wfConfig.tax_rate;
      }
    } catch {
      // Table might not exist for this mode yet — use defaults
    }

    // Check if tenant has opted out via messaging_automations
    const completionConfig = await getAutomationConfig(
      supabase, tenant_id, "service_completion" as any, settings
    );

    // ─── 1. GENERATE INVOICE ─────────────────────────────────────
    let invoiceId: string | null = null;
    let paymentUrl: string | null = null;

    if (autoInvoice && booking.service) {
      const lineItems: any[] = [];

      // Primary service
      const servicePrice = booking.service.price_amount
        ? Math.round(booking.service.price_amount * 100) // Convert dollars to cents
        : 0;

      if (servicePrice > 0) {
        lineItems.push({
          description: booking.service.name,
          quantity: 1,
          unit_price_cents: servicePrice,
          total_cents: servicePrice,
          service_id: booking.service.id,
        });
      }

      // Additional charges (e.g., parts, materials, emergency fee)
      if (additional_charges?.length) {
        for (const charge of additional_charges) {
          lineItems.push({
            description: charge.description,
            quantity: 1,
            unit_price_cents: charge.amount_cents,
            total_cents: charge.amount_cents,
          });
        }
      }

      const subtotalCents = lineItems.reduce((sum, item) => sum + item.total_cents, 0);
      const taxCents = Math.round(subtotalCents * taxRate);
      const depositApplied = booking.deposit_paid
        ? (booking.service.deposit_amount ? Math.round(booking.service.deposit_amount * 100) : 0)
        : 0;
      const totalCents = subtotalCents + taxCents;
      const balanceDue = Math.max(0, totalCents - depositApplied);

      if (balanceDue > 0) {
        // Build mode-specific metadata
        const metadata: Record<string, any> = { business_mode: mode };
        if (actual_duration_minutes) metadata.actual_duration_minutes = actual_duration_minutes;
        if (completion_notes) metadata.completion_notes = completion_notes;

        const dueAt = new Date();
        dueAt.setDate(dueAt.getDate() + invoiceDueDays);

        const { data: invoice, error: invoiceErr } = await supabase
          .from("invoices")
          .insert({
            tenant_id,
            booking_id,
            lead_id: booking.lead_id,
            status: "draft",
            customer_name: booking.lead?.full_name || "Customer",
            customer_email: booking.lead?.email || null,
            customer_phone: booking.lead?.phone || null,
            line_items: lineItems,
            subtotal_cents: subtotalCents,
            tax_rate: taxRate,
            tax_cents: taxCents,
            deposit_applied_cents: depositApplied,
            total_cents: totalCents,
            amount_paid_cents: 0,
            balance_due_cents: balanceDue,
            issued_at: new Date().toISOString(),
            due_at: dueAt.toISOString(),
            notes: completion_notes || null,
            metadata,
          })
          .select("id, invoice_number")
          .single();

        if (!invoiceErr && invoice) {
          invoiceId = invoice.id;
          results.invoice = {
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            total_cents: totalCents,
            balance_due_cents: balanceDue,
          };

          // Link invoice to booking
          await supabase
            .from("bookings")
            .update({ invoice_id: invoice.id })
            .eq("id", booking_id);

          // Try to generate payment link via Stripe Connect
          try {
            const paymentResponse = await fetch(
              `${SUPABASE_URL}/functions/v1/generate-invoice-payment`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({
                  tenant_id,
                  invoice_id: invoice.id,
                }),
              }
            );

            if (paymentResponse.ok) {
              const paymentResult = await paymentResponse.json();
              if (paymentResult.payment_url) {
                paymentUrl = paymentResult.payment_url;
                results.invoice.payment_url = paymentUrl;
              }
            }
          } catch {
            // Payment link generation is optional — invoice still created
            console.log(`[post-service] Payment link generation skipped for invoice ${invoice.id}`);
          }

          // Update invoice status to "sent" if we'll send it
          await supabase
            .from("invoices")
            .update({ status: "sent" })
            .eq("id", invoice.id);
        } else {
          console.error("[post-service] Failed to create invoice:", invoiceErr);
          results.invoice = { error: invoiceErr?.message || "Failed to create invoice" };
        }
      } else {
        results.invoice = { skipped: true, reason: "No balance due (fully prepaid or free service)" };
      }
    } else if (!autoInvoice) {
      results.invoice = { skipped: true, reason: `Auto-invoice disabled for ${mode} mode` };
    }

    // ─── 2. THANK-YOU / RECEIPT SMS ──────────────────────────────
    const customerPhone = booking.lead?.phone;
    if (customerPhone) {
      const template = MODE_THANKYOU_TEMPLATES[mode] || MODE_THANKYOU_TEMPLATES.general;

      // Build invoice line (only if invoice was created)
      let invoiceLine = "";
      if (invoiceId && results.invoice?.balance_due_cents > 0) {
        const balanceDollars = (results.invoice.balance_due_cents / 100).toFixed(2);
        invoiceLine = paymentUrl
          ? `Your balance of $${balanceDollars} can be paid here: ${paymentUrl} `
          : `Your balance is $${balanceDollars}. `;
      }

      // Build review line (only if reviews enabled for this mode)
      const reviewLine = autoReview
        ? "We'd love your feedback! "
        : "";

      const message = resolveTemplate(template, {
        customer_name: booking.lead?.full_name || "there",
        service_name: booking.service?.name || "service",
        business_name: tenant?.name || "us",
        invoice_line: invoiceLine,
        review_line: reviewLine,
      });

      const smsResult = await sendTenantSms({
        tenantId: tenant_id,
        to: customerPhone,
        body: message,
      });

      results.thank_you_sms = smsResult.success
        ? { sent: true, channel: smsResult.channel }
        : smsResult.skipped
          ? { skipped: true }
          : { error: smsResult.error };
    }

    // ─── 3. QUEUE REVIEW REQUEST ─────────────────────────────────
    // Review requests are handled by cron-review-requests which checks
    // recently completed bookings. We just need to mark the booking
    // as eligible for review request.
    if (autoReview) {
      await supabase
        .from("bookings")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", booking_id);

      results.review_queued = true;
    }

    // ─── 4. FIRE AUTOMATION EXECUTOR ─────────────────────────────
    try {
      const automationResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/automation-executor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            tenant_id,
            trigger_event: "booking.completed",
            entity_type: "booking",
            entity_id: booking_id,
            payload: {
              booking_id,
              customer_name: booking.lead?.full_name,
              customer_phone: booking.lead?.phone,
              customer_email: booking.lead?.email,
              service_name: booking.service?.name,
              business_name: tenant?.name,
              business_mode: mode,
              invoice_id: invoiceId,
              payment_url: paymentUrl,
              completed_by: completed_by || "system",
            },
          }),
        }
      );

      if (automationResponse.ok) {
        const automationResult = await automationResponse.json();
        results.automation_triggered = true;
        results.automations_executed = automationResult.executed || 0;
      }
    } catch (e) {
      console.error("[post-service] Automation executor error:", e);
    }

    // ─── 5. RECORD AUDIT EVENT ───────────────────────────────────
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/record-audit-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-closeloop-secret": Deno.env.get("CLOSELOOP_INTERNAL_SECRET") || SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({
          tenant_id,
          event_type: "booking.completed",
          entity_type: "booking",
          entity_id: booking_id,
          actor_type: completed_by || "system",
          payload: {
            service_name: booking.service?.name,
            customer_name: booking.lead?.full_name,
            invoice_id: invoiceId,
            actual_duration_minutes,
          },
        }),
      });
    } catch (e) {
      console.error("[post-service] Audit event error:", e);
    }

    // ─── 6. NOTIFY BUSINESS OWNER ────────────────────────────────
    // Send owner a summary of the completed job
    const { data: deliverySettings } = await supabase
      .from("booking_delivery_settings")
      .select("*")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (deliverySettings?.enabled && deliverySettings?.notify_phone) {
      const ownerMsg = `Job complete: ${booking.service?.name || "Service"} for ${booking.lead?.full_name || "Customer"}${invoiceId ? ` — Invoice #${results.invoice?.invoice_number} sent ($${((results.invoice?.balance_due_cents || 0) / 100).toFixed(2)})` : ""}`;

      await sendTenantSms({
        tenantId: tenant_id,
        to: deliverySettings.notify_phone,
        body: ownerMsg,
      });
    }

    console.log(`[post-service] Completed for booking ${booking_id} (${mode} mode):`, results);
    return jsonResponse({ success: true, ...results });

  } catch (err) {
    console.error("[post-service] Error:", err);
    return errorResponse("Internal server error", 500);
  }
});
