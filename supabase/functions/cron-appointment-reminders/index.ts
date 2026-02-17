/**
 * cron-appointment-reminders: Send SMS reminders for upcoming appointments.
 *
 * Called by pg_cron every 15 minutes. Sends reminders based on tenant's
 * configured timing in assistant_settings.settings_json.sms_templates.
 *
 * Uses shared sms-sender for intelligent 10DLC/toll-free routing.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTenantSms } from "../_shared/sms-sender.ts";

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
    const results = { checked: 0, sent_reminders: 0, errors: 0, skipped_sms: 0 };

    // Get all tenants with SMS templates configured
    const { data: allSettings, error: settingsErr } = await supabase
      .from("assistant_settings")
      .select("tenant_id, settings_json");

    if (settingsErr) {
      console.error("[cron-appointment-reminders] Error fetching settings:", settingsErr);
      return new Response(JSON.stringify({ error: settingsErr.message }), { status: 500 });
    }

    const enabledTenants = (allSettings || []).filter((s: any) => {
      const json = s.settings_json as Record<string, any> | null;
      return json?.sms_templates?.appointment_reminder?.enabled === true;
    });

    if (enabledTenants.length === 0) {
      return new Response(JSON.stringify({ message: "No tenants with reminders enabled", ...results }));
    }

    const tenantIds = enabledTenants.map((s: any) => s.tenant_id);

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
      const tenantSettings = settingsMap.get(tenantId) || {};
      const smsTemplates = tenantSettings.sms_templates || {};
      const reminderConfig = smsTemplates.appointment_reminder || {};
      const delayMinutes = reminderConfig.delayMinutes || 1440;
      const template = reminderConfig.message || DEFAULT_REMINDER_TEMPLATE;

      // Window: target time ± 15 min (cron frequency)
      const targetMs = delayMinutes * 60 * 1000;
      const windowStart = new Date(now.getTime() + targetMs - 15 * 60 * 1000).toISOString();
      const windowEnd = new Date(now.getTime() + targetMs + 15 * 60 * 1000).toISOString();

      const isShortReminder = delayMinutes <= 120;
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

          const smsResult = await sendTenantSms({
            tenantId,
            to: phone,
            body: message,
          });

          if (smsResult.success) {
            await supabase
              .from("bookings")
              .update({ [flagColumn]: true })
              .eq("id", booking.id);
            results.sent_reminders++;

            // 3.2: Also queue an outbound AI voice reminder call
            try {
              await supabase.from("outbound_call_queue").insert({
                tenant_id: tenantId,
                customer_phone: phone,
                call_purpose: "reminder",
                scheduled_at: new Date(new Date(booking.start_at).getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours before appointment
                context_json: {
                  customer_name: lead?.full_name || "",
                  service_name: (booking.services as any)?.name || "your appointment",
                  appointment_time: startTime,
                  appointment_date: startDate,
                  booking_id: booking.id,
                },
                max_attempts: 2,
              });
            } catch (queueErr) {
              console.warn(`[cron-appointment-reminders] Failed to queue voice reminder:`, queueErr);
            }
          } else if (smsResult.skipped) {
            results.skipped_sms++;
          } else {
            console.error(`[cron-appointment-reminders] SMS failed for ${booking.id}:`, smsResult.error);
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
