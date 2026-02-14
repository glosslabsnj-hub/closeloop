/**
 * cron-no-show-detection: Auto-detect and handle booking no-shows.
 *
 * Called by pg_cron every 30 minutes. Finds confirmed bookings whose
 * start_at + grace_period has passed without being marked completed,
 * and transitions them to no_show status.
 *
 * Fires booking.no_show workflow trigger for follow-up automations.
 *
 * Grace period defaults to 60 minutes and can be configured via
 * assistant_settings.settings_json.no_show_grace_minutes.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEFAULT_GRACE_MINUTES = 60;

serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();
    const results = { checked: 0, marked_no_show: 0, errors: 0 };

    // Get all tenants with no-show detection enabled
    const { data: allSettings, error: settingsErr } = await supabase
      .from("assistant_settings")
      .select("tenant_id, settings_json")
      .eq("voice_ai_enabled", true);

    if (settingsErr) {
      console.error("[cron-no-show-detection] Error fetching settings:", settingsErr);
      return new Response(JSON.stringify({ error: settingsErr.message }), { status: 500 });
    }

    // Filter to tenants with no-show detection enabled (default: enabled for all)
    const enabledTenants = (allSettings || []).filter((s: any) => {
      const json = s.settings_json as Record<string, any> | null;
      return json?.no_show_auto_detect !== false; // enabled by default
    });

    if (enabledTenants.length === 0) {
      return new Response(JSON.stringify({ message: "No tenants with no-show detection", ...results }));
    }

    // Build tenant config map
    const configMap = new Map<string, { grace_minutes: number }>();
    for (const s of enabledTenants) {
      const json = (s.settings_json as Record<string, any>) || {};
      configMap.set(s.tenant_id, {
        grace_minutes: json.no_show_grace_minutes || DEFAULT_GRACE_MINUTES,
      });
    }

    const tenantIds = enabledTenants.map((s: any) => s.tenant_id);

    // Find confirmed bookings that are overdue (start_at + grace < now)
    // Use the most conservative grace period (minimum) to cast a wide net,
    // then filter per-tenant
    const maxGrace = Math.max(...Array.from(configMap.values()).map((c) => c.grace_minutes), DEFAULT_GRACE_MINUTES);
    const cutoff = new Date(now.getTime() - maxGrace * 60 * 1000).toISOString();

    const { data: overdueBookings, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, tenant_id, start_at, lead_id")
      .in("tenant_id", tenantIds)
      .eq("status", "confirmed")
      .lte("start_at", cutoff)
      .limit(200);

    if (bookingErr) {
      console.error("[cron-no-show-detection] Error fetching bookings:", bookingErr);
      return new Response(JSON.stringify({ error: bookingErr.message }), { status: 500 });
    }

    results.checked = overdueBookings?.length || 0;

    for (const booking of overdueBookings || []) {
      try {
        // Check tenant-specific grace period
        const config = configMap.get(booking.tenant_id);
        const grace = config?.grace_minutes || DEFAULT_GRACE_MINUTES;
        const bookingCutoff = new Date(new Date(booking.start_at).getTime() + grace * 60 * 1000);

        if (now < bookingCutoff) continue; // Not yet overdue for this tenant's grace

        // Mark as no_show
        const { error: updateErr } = await supabase
          .from("bookings")
          .update({ status: "no_show" })
          .eq("id", booking.id);

        if (updateErr) {
          console.error(`[cron-no-show-detection] Failed to update ${booking.id}:`, updateErr);
          results.errors++;
          continue;
        }

        // Fire workflow trigger for follow-up
        const internalSecret = Deno.env.get("CLOSELOOP_INTERNAL_SECRET") || SUPABASE_SERVICE_ROLE_KEY;
        await fetch(`${SUPABASE_URL}/functions/v1/trigger-workflow`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-closeloop-secret": internalSecret,
          },
          body: JSON.stringify({
            tenant_id: booking.tenant_id,
            trigger: "booking.no_show",
            entity_type: "booking",
            entity_id: booking.id,
          }),
        }).catch((err) => console.error(`[cron-no-show-detection] Workflow trigger error:`, err));

        results.marked_no_show++;
      } catch (err) {
        console.error(`[cron-no-show-detection] Error processing ${booking.id}:`, err);
        results.errors++;
      }
    }

    console.log("[cron-no-show-detection] Done:", results);
    return new Response(JSON.stringify(results));
  } catch (error) {
    console.error("[cron-no-show-detection] Fatal error:", error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
