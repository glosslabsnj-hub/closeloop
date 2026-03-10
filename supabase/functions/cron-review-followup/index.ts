/**
 * cron-review-followup: Second-chance review nudge for customers who
 * received a review request but haven't left one yet.
 *
 * Runs daily. Checks bookings where review_sent=true but no review
 * was detected within 3-7 days (configurable per mode).
 *
 * Mode-aware: some business types (dispatch/roadside) skip follow-ups.
 * Each mode has a different follow-up template and timing.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTenantSms } from "../_shared/sms-sender.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Mode-specific follow-up templates (softer than initial request)
const MODE_FOLLOWUP_TEMPLATES: Record<string, string> = {
  service:
    "Hey {{customer_name}}, just checking in! If you had a great experience with {{business_name}}, a quick review would mean the world to us: {{review_link}} Thanks! Reply STOP to opt out.",
  food:
    "Hi {{customer_name}}, hope you enjoyed your meal from {{business_name}}! If you have a sec, a review helps us a lot: {{review_link}} Reply STOP to opt out.",
  medical:
    "Hi {{customer_name}}, we hope your visit to {{business_name}} went well. If you'd like to share your experience, here's a link: {{review_link}} Reply STOP to opt out.",
  general:
    "Hey {{customer_name}}, just a friendly reminder from {{business_name}}. We'd love to hear your feedback: {{review_link}} Reply STOP to opt out.",
};

// Which modes get follow-up nudges (dispatch/roadside = no)
const MODE_FOLLOWUP_ENABLED: Record<string, boolean> = {
  service: true,
  dispatch: false,
  food: true,
  medical: true,
  general: true,
};

// Days to wait before follow-up
const MODE_FOLLOWUP_DAYS: Record<string, number> = {
  service: 5,
  food: 3,
  medical: 7,
  general: 5,
};

function resolveTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const results = { checked: 0, sent: 0, errors: 0, skipped: 0 };

    // Get all tenants with review links
    const { data: tenants } = await supabase
      .from("tenants")
      .select("id, name, review_link, business_mode")
      .eq("is_active", true)
      .not("review_link", "is", null);

    if (!tenants?.length) {
      return new Response(JSON.stringify({ message: "No tenants with review links", ...results }));
    }

    for (const tenant of tenants) {
      const mode = tenant.business_mode || "general";

      // Skip modes that don't get follow-ups
      if (!(MODE_FOLLOWUP_ENABLED[mode] ?? true)) {
        results.skipped++;
        continue;
      }

      const followupDays = MODE_FOLLOWUP_DAYS[mode] || 5;
      const followupDate = new Date();
      followupDate.setDate(followupDate.getDate() - followupDays);

      // Window: bookings completed 'followupDays' ago (+/- 12 hours)
      const windowStart = new Date(followupDate.getTime() - 12 * 60 * 60 * 1000).toISOString();
      const windowEnd = new Date(followupDate.getTime() + 12 * 60 * 60 * 1000).toISOString();

      // Find bookings where first review was sent but no follow-up yet
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, tenant_id, end_at, lead_id, leads(full_name, phone), services(name)")
        .eq("tenant_id", tenant.id)
        .eq("status", "completed")
        .eq("review_sent", true)
        .eq("review_followup_sent", false)
        .gte("end_at", windowStart)
        .lte("end_at", windowEnd);

      if (!bookings?.length) continue;
      results.checked += bookings.length;

      const template = MODE_FOLLOWUP_TEMPLATES[mode] || MODE_FOLLOWUP_TEMPLATES.general;

      for (const booking of bookings) {
        try {
          const lead = booking.leads as any;
          const phone = lead?.phone;
          if (!phone) continue;

          const message = resolveTemplate(template, {
            customer_name: lead?.full_name || "there",
            business_name: tenant.name || "",
            review_link: tenant.review_link || "",
          });

          const smsResult = await sendTenantSms({
            tenantId: tenant.id,
            to: phone,
            body: message,
          });

          if (smsResult.success) {
            await supabase
              .from("bookings")
              .update({ review_followup_sent: true })
              .eq("id", booking.id);
            results.sent++;
          } else if (!smsResult.skipped) {
            results.errors++;
          }
        } catch (err) {
          console.error(`[cron-review-followup] Error for ${booking.id}:`, err);
          results.errors++;
        }
      }
    }

    console.log(`[cron-review-followup] Done:`, results);
    return new Response(JSON.stringify(results));
  } catch (error) {
    console.error("[cron-review-followup] Fatal error:", error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
