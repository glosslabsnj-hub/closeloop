/**
 * cron-tenant-health: Run health checks for all active tenants daily.
 *
 * Calls tenant-health-check for each tenant, stores results in
 * tenant_health_snapshots, and detects regressions (score drops).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// --- Real-time Telegram alerts to Jack ---
const _telegramAlertTimestamps: number[] = [];
const TELEGRAM_MAX_ALERTS_PER_HOUR = 10;

async function sendAdminTelegram(message: string) {
  try {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    while (_telegramAlertTimestamps.length > 0 && _telegramAlertTimestamps[0] < oneHourAgo) {
      _telegramAlertTimestamps.shift();
    }
    if (_telegramAlertTimestamps.length >= TELEGRAM_MAX_ALERTS_PER_HOUR) {
      console.log("Telegram alert rate limit reached, skipping");
      return;
    }
    _telegramAlertTimestamps.push(now);

    const botToken = Deno.env.get("LENARD_TELEGRAM_BOT_TOKEN") || "8429513226:AAGnt47zIkkUIAyFB4Mb4_fYdptaV2iKnt0";
    const chatId = Deno.env.get("LENARD_TELEGRAM_CHAT_ID") || "6841391368";
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    });
  } catch { /* alerting must never block main flow */ }
}

serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const results = { checked: 0, healthy: 0, degraded: 0, critical: 0, errors: 0, regressions: 0 };

    // Get all active tenants
    const { data: tenants } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("is_active", true);

    if (!tenants?.length) {
      return new Response(JSON.stringify({ message: "No active tenants", ...results }));
    }

    for (const tenant of tenants) {
      try {
        // Call tenant-health-check
        const healthUrl = `${SUPABASE_URL}/functions/v1/tenant-health-check`;
        const response = await fetch(healthUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ tenant_id: tenant.id }),
        });

        if (!response.ok) {
          console.error(`[cron-tenant-health] Health check failed for ${tenant.name}: ${response.status}`);
          results.errors++;
          continue;
        }

        const health = await response.json();
        results.checked++;

        // Store snapshot
        await supabase.from("tenant_health_snapshots").insert({
          tenant_id: tenant.id,
          overall_score: health.overall_score,
          overall_status: health.overall_status,
          config_health: health.config_health,
          integration_health: health.integration_health,
          notification_health: health.notification_health,
          ai_health: health.ai_health,
          data_health: health.data_health,
          automation_health: health.automation_health || {},
          issues: health.issues,
          checked_at: health.checked_at,
        });

        // Count by status
        if (health.overall_status === "healthy") results.healthy++;
        else if (health.overall_status === "degraded") results.degraded++;
        else if (health.overall_status === "critical") results.critical++;

        // Check for regression (compare with previous snapshot)
        const { data: prevSnapshot } = await supabase
          .from("tenant_health_snapshots")
          .select("overall_score, overall_status")
          .eq("tenant_id", tenant.id)
          .lt("checked_at", health.checked_at)
          .order("checked_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (prevSnapshot && prevSnapshot.overall_score > health.overall_score + 10) {
          results.regressions++;
          console.warn(
            `[cron-tenant-health] REGRESSION: ${tenant.name} score dropped from ${prevSnapshot.overall_score} to ${health.overall_score}`
          );
        }

        // Telegram alert: score below 70 or critical status
        const p0Issues = (health.issues || []).filter((i: { severity?: string }) => i.severity === "critical" || i.severity === "p0");
        if (health.overall_score < 70 || p0Issues.length > 0) {
          const issueList = (health.issues || [])
            .slice(0, 5)
            .map((i: { message?: string; severity?: string }) => `- ${i.message || "Unknown"} (${i.severity || "?"})`)
            .join("\n");
          await sendAdminTelegram(
            `<b>HEALTH ALERT</b>: ${tenant.name}\nScore: ${health.overall_score} (${health.overall_status})\n${issueList ? `Issues:\n${issueList}` : "No details"}`
          );
        }
      } catch (err) {
        console.error(`[cron-tenant-health] Error for ${tenant.name}:`, err);
        results.errors++;
      }
    }

    // D5: Onboarding completion tracking — detect stalled signups
    try {
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Find tenants created >48h ago that haven't completed setup
      const { data: stalledTenants } = await supabase
        .from("tenants")
        .select("id, name, created_at")
        .eq("is_active", true)
        .lt("created_at", twoDaysAgo)
        .not("id", "in", `(${
          // Subquery: tenants with setup completed
          (await supabase
            .from("assistant_settings")
            .select("tenant_id")
            .not("setup_completed_at", "is", null)
          ).data?.map(r => `'${r.tenant_id}'`).join(",") || "'00000000-0000-0000-0000-000000000000'"
        })`);

      if (stalledTenants?.length) {
        await sendAdminTelegram(
          `<b>ONBOARDING STALLS</b>: ${stalledTenants.length} tenant(s) signed up >48h ago but haven't completed setup:\n${
            stalledTenants.slice(0, 5).map(t => `- ${t.name} (${new Date(t.created_at).toLocaleDateString()})`).join("\n")
          }`
        );
      }

      // Find tenants that completed setup but haven't received calls in 7+ days
      const { data: inactiveTenants } = await supabase
        .from("tenants")
        .select("id, name")
        .eq("is_active", true)
        .not("id", "in", `(${
          (await supabase
            .from("ai_call_sessions")
            .select("tenant_id")
            .gte("created_at", sevenDaysAgo)
          ).data?.map(r => `'${r.tenant_id}'`).join(",") || "'00000000-0000-0000-0000-000000000000'"
        })`);

      // Only alert for tenants that HAVE had calls before (not brand new)
      if (inactiveTenants?.length) {
        for (const t of inactiveTenants) {
          const { count } = await supabase
            .from("ai_call_sessions")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", t.id);
          if ((count || 0) > 0) {
            await sendAdminTelegram(
              `<b>INACTIVE TENANT</b>: ${t.name} hasn't received calls in 7+ days (had ${count} total calls)`
            );
          }
        }
      }
    } catch (e) {
      console.error("[cron-tenant-health] Onboarding tracking error:", e);
    }

    console.log(`[cron-tenant-health] Done:`, results);
    return new Response(JSON.stringify(results));
  } catch (error) {
    console.error("[cron-tenant-health] Fatal error:", error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
