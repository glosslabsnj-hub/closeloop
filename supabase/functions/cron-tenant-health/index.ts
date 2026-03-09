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
      } catch (err) {
        console.error(`[cron-tenant-health] Error for ${tenant.name}:`, err);
        results.errors++;
      }
    }

    console.log(`[cron-tenant-health] Done:`, results);
    return new Response(JSON.stringify(results));
  } catch (error) {
    console.error("[cron-tenant-health] Fatal error:", error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
