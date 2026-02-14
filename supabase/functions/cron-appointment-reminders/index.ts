/**
 * cron-appointment-reminders: Send SMS reminders for upcoming appointments.
 *
 * Called by pg_cron every 15 minutes. Sends two reminders per booking:
 *   - 24h before: "Your appointment is tomorrow at X"
 *   - 1h before:  "Your appointment is in 1 hour"
 *
 * Requires migration:
 *   ALTER TABLE bookings ADD COLUMN reminder_sent_24h boolean DEFAULT false;
 *   ALTER TABLE bookings ADD COLUMN reminder_sent_1h boolean DEFAULT false;
 *
 * Reminder settings stored in assistant_settings.settings_json:
 *   { reminders_enabled: boolean, reminder_24h_template: string, reminder_1h_template: string }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DEFAULT_24H_TEMPLATE =
  "Hi {{customer_name}}, this is a reminder that your {{service_name}} appointment is tomorrow at {{time}}. Reply CONFIRM to confirm or call us to reschedule.";
const DEFAULT_1H_TEMPLATE =
  "Hi {{customer_name}}, your {{service_name}} appointment is in about 1 hour at {{time}}. We look forward to seeing you!";

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
    const results = { checked: 0, sent_24h: 0, sent_1h: 0, errors: 0 };

    // Get all tenants with active reminder settings
    const { data: allSettings, error: settingsErr } = await supabase
      .from("assistant_settings")
      .select("tenant_id, settings_json")
      .eq("voice_ai_enabled", true);

    if (settingsErr) {
      console.error("[cron-appointment-reminders] Error fetching settings:", settingsErr);
      return new Response(JSON.stringify({ error: settingsErr.message }), { status: 500 });
    }

    // Filter to tenants with reminders enabled
    const enabledTenants = (allSettings || []).filter((s: any) => {
      const json = s.settings_json as Record<string, any> | null;
      return json?.reminders_enabled === true;
    });

    if (enabledTenants.length === 0) {
      return new Response(JSON.stringify({ message: "No tenants with reminders enabled", ...results }));
    }

    const tenantIds = enabledTenants.map((s: any) => s.tenant_id);

    // Window: 24h ± 30min and 1h ± 30min from now
    const h24Start = new Date(now.getTime() + 23.5 * 60 * 60 * 1000).toISOString();
    const h24End = new Date(now.getTime() + 24.5 * 60 * 60 * 1000).toISOString();
    const h1Start = new Date(now.getTime() + 0.5 * 60 * 60 * 1000).toISOString();
    const h1End = new Date(now.getTime() + 1.5 * 60 * 60 * 1000).toISOString();

    // Fetch bookings needing 24h reminder
    const { data: bookings24h } = await supabase
      .from("bookings")
      .select("id, tenant_id, start_at, lead_id, service_id, leads(full_name, phone), services(name)")
      .in("tenant_id", tenantIds)
      .in("status", ["confirmed", "pending"])
      .gte("start_at", h24Start)
      .lte("start_at", h24End)
      .eq("reminder_sent_24h", false);

    // Fetch bookings needing 1h reminder
    const { data: bookings1h } = await supabase
      .from("bookings")
      .select("id, tenant_id, start_at, lead_id, service_id, leads(full_name, phone), services(name)")
      .in("tenant_id", tenantIds)
      .in("status", ["confirmed", "pending"])
      .gte("start_at", h1Start)
      .lte("start_at", h1End)
      .eq("reminder_sent_1h", false);

    results.checked = (bookings24h?.length || 0) + (bookings1h?.length || 0);

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

    // Send 24h reminders
    for (const booking of bookings24h || []) {
      try {
        const lead = booking.leads as any;
        const phone = lead?.phone;
        if (!phone) continue;

        const tenantSettings = settingsMap.get(booking.tenant_id) || {};
        const template = tenantSettings.reminder_24h_template || DEFAULT_24H_TEMPLATE;

        const startTime = new Date(booking.start_at).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });

        const message = resolveTemplate(template, {
          customer_name: lead?.full_name || "there",
          service_name: (booking.services as any)?.name || "your",
          time: startTime,
        });

        // Lookup Twilio from number for this tenant
        const { data: phoneNum } = await supabase
          .from("phone_numbers")
          .select("phone_e164")
          .eq("tenant_id", booking.tenant_id)
          .in("purpose", ["forwarding", "primary"])
          .limit(1)
          .single();

        if (!phoneNum?.phone_e164) continue;

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
            .update({ reminder_sent_24h: true })
            .eq("id", booking.id);
          results.sent_24h++;
        } else {
          console.error(`[cron-appointment-reminders] 24h SMS failed for ${booking.id}:`, await smsResponse.text());
          results.errors++;
        }
      } catch (err) {
        console.error(`[cron-appointment-reminders] Error processing 24h for ${booking.id}:`, err);
        results.errors++;
      }
    }

    // Send 1h reminders
    for (const booking of bookings1h || []) {
      try {
        const lead = booking.leads as any;
        const phone = lead?.phone;
        if (!phone) continue;

        const tenantSettings = settingsMap.get(booking.tenant_id) || {};
        const template = tenantSettings.reminder_1h_template || DEFAULT_1H_TEMPLATE;

        const startTime = new Date(booking.start_at).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });

        const message = resolveTemplate(template, {
          customer_name: lead?.full_name || "there",
          service_name: (booking.services as any)?.name || "your",
          time: startTime,
        });

        const { data: phoneNum } = await supabase
          .from("phone_numbers")
          .select("phone_e164")
          .eq("tenant_id", booking.tenant_id)
          .in("purpose", ["forwarding", "primary"])
          .limit(1)
          .single();

        if (!phoneNum?.phone_e164) continue;

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
            .update({ reminder_sent_1h: true })
            .eq("id", booking.id);
          results.sent_1h++;
        } else {
          console.error(`[cron-appointment-reminders] 1h SMS failed for ${booking.id}:`, await smsResponse.text());
          results.errors++;
        }
      } catch (err) {
        console.error(`[cron-appointment-reminders] Error processing 1h for ${booking.id}:`, err);
        results.errors++;
      }
    }

    console.log(`[cron-appointment-reminders] Done:`, results);
    return new Response(JSON.stringify(results));
  } catch (error) {
    console.error("[cron-appointment-reminders] Fatal error:", error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
