/**
 * cron-customer-reactivation: Send win-back SMS to inactive customers.
 *
 * Finds customers whose last completed booking was 60+ days ago
 * and sends a personalized reactivation text. Dedup: won't re-send
 * within 30 days. Respects do_not_contact flag.
 *
 * Triggered by pg_cron daily (or manually via POST).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTenantSms } from "../_shared/sms-sender.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DEFAULT_REACTIVATION_TEMPLATE =
  "Hey {{first_name}}, it's been a while! {{business_name}} here. Ready for another detail? Book online or just text us back. We'd love to see you again!";

function resolveTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const results = { checked: 0, sent: 0, skipped_recent: 0, skipped_dnc: 0, skipped_no_phone: 0, errors: 0 };

    // Find tenants with reactivation enabled in assistant_settings
    // Default: enabled for all tenants unless explicitly disabled
    const { data: allSettings } = await supabase
      .from("assistant_settings")
      .select("tenant_id, settings_json, missed_call_textback_enabled");

    // Get tenant info
    const tenantIds = (allSettings || []).map((s: any) => s.tenant_id);
    if (tenantIds.length === 0) {
      return new Response(JSON.stringify({ message: "No tenants configured", ...results }));
    }

    const { data: tenants } = await supabase
      .from("tenants")
      .select("id, name, website")
      .in("id", tenantIds);

    const tenantMap = new Map((tenants || []).map((t: any) => [t.id, t]));
    const settingsMap = new Map((allSettings || []).map((s: any) => [s.tenant_id, s]));

    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    for (const tenantId of tenantIds) {
      const tenant = tenantMap.get(tenantId);
      if (!tenant) continue;

      const settings = settingsMap.get(tenantId);
      const settingsJson = settings?.settings_json as Record<string, any> | null;

      // Check if reactivation is enabled (default: true)
      if (settingsJson?.customer_reactivation?.enabled === false) continue;

      const customTemplate = settingsJson?.sms_templates?.reactivation?.template;
      const inactiveDays = settingsJson?.customer_reactivation?.inactive_days || 60;
      const inactiveCutoff = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000).toISOString();

      // Find customers with completed bookings older than the cutoff
      // who don't have any bookings after the cutoff
      const { data: leads } = await supabase
        .from("leads")
        .select("id, phone_e164, full_name, tenant_id")
        .eq("tenant_id", tenantId)
        .not("phone_e164", "is", null);

      if (!leads?.length) continue;

      for (const lead of leads) {
        results.checked++;

        if (!lead.phone_e164) {
          results.skipped_no_phone++;
          continue;
        }

        // Check do_not_contact on corresponding customer
        const { data: customer } = await supabase
          .from("customers")
          .select("do_not_contact")
          .eq("tenant_id", tenantId)
          .eq("phone_e164", lead.phone_e164)
          .maybeSingle();

        if (customer?.do_not_contact) {
          results.skipped_dnc++;
          continue;
        }

        // Check if they have a completed booking before cutoff
        const { data: oldBookings } = await supabase
          .from("bookings")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("lead_id", lead.id)
          .eq("status", "completed")
          .lt("start_at", inactiveCutoff)
          .limit(1);

        if (!oldBookings?.length) continue; // Never had a completed booking, or too recent

        // Check they don't have a recent booking (any status except cancelled)
        const { data: recentBookings } = await supabase
          .from("bookings")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("lead_id", lead.id)
          .neq("status", "cancelled")
          .gte("start_at", inactiveCutoff)
          .limit(1);

        if (recentBookings?.length) continue; // They have a recent booking

        // Dedup: check if we already sent a reactivation within 30 days
        const { data: recentTexts } = await supabase
          .from("missed_call_textbacks")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("caller_phone", lead.phone_e164)
          .eq("reason", "reactivation")
          .gte("sent_at", thirtyDaysAgo)
          .limit(1);

        if (recentTexts?.length) {
          results.skipped_recent++;
          continue;
        }

        // Build and send the message
        const firstName = (lead.full_name || "").split(" ")[0] || "there";
        const template = customTemplate || DEFAULT_REACTIVATION_TEMPLATE;
        const message = resolveTemplate(template, {
          first_name: firstName,
          business_name: tenant.name || "us",
          website: tenant.website || "",
        });

        const smsResult = await sendTenantSms({
          tenantId,
          to: lead.phone_e164,
          body: message,
        });

        // Log the reactivation attempt (reuse missed_call_textbacks table)
        await supabase.from("missed_call_textbacks").insert({
          tenant_id: tenantId,
          caller_phone: lead.phone_e164,
          twilio_sms_sid: smsResult.twilioSid || null,
          off_behavior: "REACTIVATION",
          reason: "reactivation",
        });

        if (smsResult.success) {
          results.sent++;
          console.log(`[reactivation] Sent to ${lead.phone_e164} for ${tenant.name}`);
        } else if (smsResult.skipped) {
          results.skipped_no_phone++;
          console.log(`[reactivation] Skipped ${lead.phone_e164}: ${smsResult.reason}`);
        } else {
          results.errors++;
          console.error(`[reactivation] Failed ${lead.phone_e164}: ${smsResult.error}`);
        }
      }
    }

    console.log(`[cron-customer-reactivation] Done:`, results);
    return new Response(JSON.stringify({ success: true, ...results }));
  } catch (err) {
    console.error("[cron-customer-reactivation] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500 },
    );
  }
});
