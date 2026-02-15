/**
 * cron-review-requests: Send review request SMS after completed appointments.
 *
 * Called by pg_cron every 15 minutes. Sends review request based on tenant's
 * configured delay in assistant_settings.settings_json.sms_templates.review_request.
 *
 * Checks A2P registration status before sending.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const results = { checked: 0, sent: 0, errors: 0, skipped_a2p: 0, skipped_no_link: 0 };

    // Get all tenants with review request enabled
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

    // Check A2P status
    const { data: a2pStatuses } = await supabase
      .from("a2p_registrations")
      .select("tenant_id, status")
      .in("tenant_id", tenantIds);

    const a2pApproved = new Set(
      (a2pStatuses || [])
        .filter((a: any) => a.status === "approved")
        .map((a: any) => a.tenant_id)
    );

    // Get tenant info (name + review_link)
    const { data: tenants } = await supabase
      .from("tenants")
      .select("id, name, review_link")
      .in("id", tenantIds);

    const tenantMap = new Map((tenants || []).map((t: any) => [t.id, t]));

    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");

    if (!twilioSid || !twilioAuth) {
      console.error("[cron-review-requests] Twilio not configured");
      return new Response(JSON.stringify({ error: "Twilio not configured" }), { status: 500 });
    }

    for (const setting of enabledTenants) {
      const tenantId = setting.tenant_id;

      if (!a2pApproved.has(tenantId)) {
        results.skipped_a2p++;
        continue;
      }

      const tenant = tenantMap.get(tenantId);
      const reviewLink = tenant?.review_link;

      if (!reviewLink) {
        results.skipped_no_link++;
        console.log(`[cron-review-requests] Skipping ${tenantId}: no review_link configured`);
        continue;
      }

      const smsTemplates = (setting.settings_json as any)?.sms_templates || {};
      const reviewConfig = smsTemplates.review_request || {};
      const delayMinutes = reviewConfig.delayMinutes || 60;
      const template = reviewConfig.message || DEFAULT_REVIEW_TEMPLATE;

      // Find completed bookings where end_at was delayMinutes ago (±15min window)
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

      // Get From number
      const { data: phoneNum } = await supabase
        .from("phone_numbers")
        .select("phone_e164")
        .eq("tenant_id", tenantId)
        .in("purpose", ["forwarding", "primary"])
        .limit(1)
        .single();

      if (!phoneNum?.phone_e164) continue;

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

          const smsResponse = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${btoa(`${twilioSid}:${twilioAuth}`)}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                To: phone,
                From: phoneNum.phone_e164,
                Body: message,
              }),
            },
          );

          if (smsResponse.ok) {
            await supabase
              .from("bookings")
              .update({ review_sent: true })
              .eq("id", booking.id);
            results.sent++;
          } else {
            console.error(`[cron-review-requests] SMS failed for ${booking.id}:`, await smsResponse.text());
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
