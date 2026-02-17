/**
 * cron-review-requests: Send review request SMS after completed appointments.
 *
 * Called by pg_cron every 15 minutes. Uses shared sms-sender for
 * intelligent 10DLC/toll-free routing.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTenantSms } from "../_shared/sms-sender.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DEFAULT_REVIEW_TEMPLATE =
  "Thank you for visiting {{business_name}}! We'd love your feedback — please leave us a review: {{review_link}}. Reply STOP to opt out.";

function resolveTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();
    const results = { checked: 0, sent: 0, errors: 0, skipped_sms: 0, skipped_no_link: 0 };

    const { data: allSettings, error: settingsErr } = await supabase
      .from("assistant_settings")
      .select("tenant_id, settings_json");

    if (settingsErr) {
      console.error("[cron-review-requests] Error fetching settings:", settingsErr);
      return new Response(JSON.stringify({ error: settingsErr.message }), { status: 500 });
    }

    const enabledTenants = (allSettings || []).filter((s: any) => {
      const json = s.settings_json as Record<string, any> | null;
      return json?.sms_templates?.review_request?.enabled === true;
    });

    if (enabledTenants.length === 0) {
      return new Response(JSON.stringify({ message: "No tenants with review requests enabled", ...results }));
    }

    const tenantIds = enabledTenants.map((s: any) => s.tenant_id);

    const { data: tenants } = await supabase
      .from("tenants")
      .select("id, name, review_link")
      .in("id", tenantIds);

    const tenantMap = new Map((tenants || []).map((t: any) => [t.id, t]));

    for (const setting of enabledTenants) {
      const tenantId = setting.tenant_id;
      const tenant = tenantMap.get(tenantId);
      const reviewLink = tenant?.review_link;

      if (!reviewLink) {
        results.skipped_no_link++;
        continue;
      }

      const smsTemplates = (setting.settings_json as any)?.sms_templates || {};
      const reviewConfig = smsTemplates.review_request || {};
      const delayMinutes = reviewConfig.delayMinutes || 60;
      const template = reviewConfig.message || DEFAULT_REVIEW_TEMPLATE;

      const targetTime = new Date(now.getTime() - delayMinutes * 60 * 1000);
      const windowStart = new Date(targetTime.getTime() - 15 * 60 * 1000).toISOString();
      const windowEnd = new Date(targetTime.getTime() + 15 * 60 * 1000).toISOString();

      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, tenant_id, end_at, lead_id, service_id, leads(full_name, phone), services(name)")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .gte("end_at", windowStart)
        .lte("end_at", windowEnd)
        .eq("review_sent", false);

      if (!bookings?.length) continue;
      results.checked += bookings.length;

      for (const booking of bookings) {
        try {
          const lead = booking.leads as any;
          const phone = lead?.phone;
          if (!phone) continue;

          const message = resolveTemplate(template, {
            customer_name: lead?.full_name || "there",
            service_name: (booking.services as any)?.name || "your visit",
            business_name: tenant?.name || "",
            review_link: reviewLink,
          });

          const smsResult = await sendTenantSms({
            tenantId,
            to: phone,
            body: message,
          });

          if (smsResult.success) {
            await supabase
              .from("bookings")
              .update({ review_sent: true })
              .eq("id", booking.id);
            results.sent++;

            // 3.4: Also queue an outbound AI voice review request
            try {
              await supabase.from("outbound_call_queue").insert({
                tenant_id: tenantId,
                customer_phone: phone,
                call_purpose: "review",
                scheduled_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
                context_json: {
                  customer_name: lead?.full_name || "",
                  service_name: (booking.services as any)?.name || "your visit",
                  review_link: reviewLink,
                  booking_id: booking.id,
                },
                max_attempts: 1, // Only one attempt for review requests
              });
            } catch (queueErr) {
              console.warn(`[cron-review-requests] Failed to queue voice review request:`, queueErr);
            }
          } else if (smsResult.skipped) {
            results.skipped_sms++;
          } else {
            console.error(`[cron-review-requests] SMS failed for ${booking.id}:`, smsResult.error);
            results.errors++;
          }
        } catch (err) {
          console.error(`[cron-review-requests] Error for ${booking.id}:`, err);
          results.errors++;
        }
      }
    }

    console.log(`[cron-review-requests] Done:`, results);
    return new Response(JSON.stringify(results));
  } catch (error) {
    console.error("[cron-review-requests] Fatal error:", error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
