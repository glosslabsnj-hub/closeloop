/**
 * cron-appointment-reminders: Send SMS reminders for upcoming appointments.
 *
 * Called by pg_cron every 15 minutes. Sends reminders based on tenant's
 * configured timing in assistant_settings.settings_json.sms_templates.
 *
 * Checks A2P registration status before sending.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DEFAULT_REMINDER_TEMPLATE =
  "Hi {{customer_name}}, this is a reminder that your {{service_name}} appointment with {{business_name}} is coming up at {{appointment_time}}. We look forward to seeing you!";

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
    const results = { checked: 0, sent_reminders: 0, errors: 0, skipped_a2p: 0 };

    // Get all tenants with SMS templates configured
    const { data: allSettings, error: settingsErr } = await supabase
      .from("assistant_settings")
      .select("tenant_id, settings_json");

    if (settingsErr) {
      console.error("[cron-appointment-reminders] Error fetching settings:", settingsErr);
      return new Response(JSON.stringify({ error: settingsErr.message }), { status: 500 });
    }

    // Filter to tenants with reminder enabled via sms_templates
    const enabledTenants = (allSettings || []).filter((s: any) => {
      const json = s.settings_json as Record<string, any> | null;
      const smsTemplates = json?.sms_templates;
      return smsTemplates?.appointment_reminder?.enabled === true;
    });

    if (enabledTenants.length === 0) {
      return new Response(JSON.stringify({ message: "No tenants with reminders enabled", ...results }));
    }

    const tenantIds = enabledTenants.map((s: any) => s.tenant_id);

    // Check A2P status for each tenant
    const { data: a2pStatuses } = await supabase
      .from("a2p_registrations")
      .select("tenant_id, status")
      .in("tenant_id", tenantIds);

    const a2pApproved = new Set(
      (a2pStatuses || [])
        .filter((a: any) => a.status === "approved")
        .map((a: any) => a.tenant_id)
    );

    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");

    if (!twilioSid || !twilioAuth) {
      console.error("[cron-appointment-reminders] Twilio not configured");
      return new Response(JSON.stringify({ error: "Twilio not configured" }), { status: 500 });
    }

    // Build tenant settings map
    const settingsMap = new Map<string, any>();
    for (const s of enabledTenants) {
      settingsMap.set(s.tenant_id, s.settings_json || {});
    }

    // Get tenant business names
    const { data: tenants } = await supabase
      .from("tenants")
      .select("id, name")
      .in("id", tenantIds);
    const tenantNameMap = new Map((tenants || []).map((t: any) => [t.id, t.name]));

    // Process each tenant
    for (const tenantId of tenantIds) {
      // Skip tenants without approved A2P
      if (!a2pApproved.has(tenantId)) {
        results.skipped_a2p++;
        console.log(`[cron-appointment-reminders] Skipping ${tenantId}: A2P not approved`);
        continue;
      }

      const tenantSettings = settingsMap.get(tenantId) || {};
      const smsTemplates = tenantSettings.sms_templates || {};
      const reminderConfig = smsTemplates.appointment_reminder || {};
      const delayMinutes = reminderConfig.delayMinutes || 1440; // default 24h
      const template = reminderConfig.message || DEFAULT_REMINDER_TEMPLATE;

      // Window: target time ± 15 min (cron frequency)
      const targetMs = delayMinutes * 60 * 1000;
      const windowStart = new Date(now.getTime() + targetMs - 15 * 60 * 1000).toISOString();
      const windowEnd = new Date(now.getTime() + targetMs + 15 * 60 * 1000).toISOString();

      // Determine which reminder flag to check based on delay
      const isShortReminder = delayMinutes <= 120; // 2h or less = "1h" flag
      const flagColumn = isShortReminder ? "reminder_sent_1h" : "reminder_sent_24h";

      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, tenant_id, start_at, lead_id, service_id, leads(full_name, phone), services(name)")
        .eq("tenant_id", tenantId)
        .in("status", ["confirmed", "pending"])
        .gte("start_at", windowStart)
        .lte("start_at", windowEnd)
        .eq(flagColumn, false);

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

      if (!phoneNum?.phone_e164) {
        console.error(`[cron-appointment-reminders] No phone for tenant ${tenantId}`);
        continue;
      }

      const businessName = tenantNameMap.get(tenantId) || "";

      for (const booking of bookings) {
        try {
          const lead = booking.leads as any;
          const phone = lead?.phone;
          if (!phone) continue;

          const startTime = new Date(booking.start_at).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });
          const startDate = new Date(booking.start_at).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          });

          const message = resolveTemplate(template, {
            customer_name: lead?.full_name || "there",
            service_name: (booking.services as any)?.name || "your appointment",
            business_name: businessName,
            appointment_time: startTime,
            appointment_date: startDate,
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
              .update({ [flagColumn]: true })
              .eq("id", booking.id);
            results.sent_reminders++;
          } else {
            console.error(`[cron-appointment-reminders] SMS failed for ${booking.id}:`, await smsResponse.text());
            results.errors++;
          }
        } catch (err) {
          console.error(`[cron-appointment-reminders] Error for ${booking.id}:`, err);
          results.errors++;
        }
      }
    }

    console.log(`[cron-appointment-reminders] Done:`, results);
    return new Response(JSON.stringify(results));
  } catch (error) {
    console.error("[cron-appointment-reminders] Fatal error:", error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
