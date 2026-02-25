import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { captureException, captureMessage } from "../_shared/sentry.ts";

/**
 * Check Handoff Failures
 *
 * This function should be run on a schedule (e.g., every 15 minutes) to:
 * 1. Check for failed handoff deliveries
 * 2. Send alerts to tenant owners via email/SMS
 * 3. Send alerts to the Flux Receptionist ops team for critical failures
 *
 * Alert thresholds:
 * - Single failure: Log only (will be retried)
 * - 2+ failures for same tenant in 1 hour: Notify tenant owner
 * - 5+ failures globally in 1 hour: Notify ops team (Slack/email)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Thresholds
const TENANT_ALERT_THRESHOLD = 2; // Failures per tenant before alerting
const GLOBAL_ALERT_THRESHOLD = 5; // Global failures before ops alert
const LOOKBACK_MINUTES = 60; // Check failures in the last hour

interface FailureSummary {
  tenant_id: string;
  tenant_name: string;
  owner_email: string | null;
  failure_count: number;
  entity_types: string[];
  latest_error: string | null;
  first_failure_at: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const OPS_ALERT_EMAIL = Deno.env.get("OPS_ALERT_EMAIL") || "support@getfluxdata.com";
  const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_OPS_WEBHOOK_URL");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase configuration");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log("Starting handoff failure check...");

    const lookbackTime = new Date();
    lookbackTime.setMinutes(lookbackTime.getMinutes() - LOOKBACK_MINUTES);
    const lookbackIso = lookbackTime.toISOString();

    // Count failures by tenant in the lookback window — check BOTH tables
    const [deliveryResult, handoffResult] = await Promise.all([
      supabase
        .from("delivery_attempts")
        .select(`
          tenant_id,
          entity_type,
          error_message,
          created_at,
          tenants!inner(business_name, owner_email)
        `)
        .eq("status", "failed")
        .gte("created_at", lookbackIso)
        .order("created_at", { ascending: false }),
      supabase
        .from("handoff_attempts")
        .select(`
          tenant_id,
          entity_type,
          error_message,
          created_at,
          tenants!inner(business_name, owner_email)
        `)
        .eq("status", "failed")
        .gte("created_at", lookbackIso)
        .order("created_at", { ascending: false }),
    ]);

    if (deliveryResult.error) {
      console.error("Failed to fetch delivery_attempts failures:", deliveryResult.error);
    }
    if (handoffResult.error) {
      console.error("Failed to fetch handoff_attempts failures:", handoffResult.error);
    }

    // Merge results from both tables, tagging the source
    const deliveryFailures = (deliveryResult.data || []).map((f: Record<string, unknown>) => ({ ...f, _source: "delivery_attempts" }));
    const handoffFailures = (handoffResult.data || []).map((f: Record<string, unknown>) => ({ ...f, _source: "handoff_attempts" }));
    const failureData = [...deliveryFailures, ...handoffFailures];

    if (failureData.length === 0) {
      console.log("No failures found in lookback window");
      return new Response(
        JSON.stringify({
          status: "success",
          message: "No failures to report",
          lookback_minutes: LOOKBACK_MINUTES,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Aggregate failures by tenant
    const failuresByTenant: Map<string, FailureSummary> = new Map();

    for (const failure of failureData) {
      const tenantId = failure.tenant_id;
      const existing = failuresByTenant.get(tenantId);

      if (existing) {
        existing.failure_count++;
        if (!existing.entity_types.includes(failure.entity_type)) {
          existing.entity_types.push(failure.entity_type);
        }
        // Keep the most recent error
        if (!existing.latest_error && failure.error_message) {
          existing.latest_error = failure.error_message;
        }
       } else {
         const tenantData = failure.tenants as unknown as { business_name: string; owner_email: string | null };
         failuresByTenant.set(tenantId, {
           tenant_id: tenantId,
           tenant_name: tenantData?.business_name || "Unknown",
           owner_email: tenantData?.owner_email || null,
          failure_count: 1,
          entity_types: [failure.entity_type],
          latest_error: failure.error_message || null,
          first_failure_at: failure.created_at,
        });
      }
    }

    const totalFailures = failureData.length;
    const alertResults: { tenant_id: string; alerted: boolean; method?: string }[] = [];

    console.log(`Found ${totalFailures} failures across ${failuresByTenant.size} tenants`);

    // Check if we need global ops alert
    if (totalFailures >= GLOBAL_ALERT_THRESHOLD) {
      console.log(`Global alert threshold reached: ${totalFailures} failures`);
      await sendOpsAlert(
        supabase,
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        SLACK_WEBHOOK_URL,
        OPS_ALERT_EMAIL,
        totalFailures,
        failuresByTenant
      );
    }

    // Check per-tenant thresholds and send alerts
    for (const [tenantId, summary] of failuresByTenant) {
      if (summary.failure_count >= TENANT_ALERT_THRESHOLD) {
        console.log(
          `Tenant ${tenantId} (${summary.tenant_name}) has ${summary.failure_count} failures - alerting`
        );

        // Check if we've already alerted this tenant recently
        const { data: recentAlert } = await supabase
          .from("audit_events")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("event_type", "handoff.alert_sent")
          .gte("occurred_at", lookbackIso)
          .limit(1)
          .single();

        if (recentAlert) {
          console.log(`Already alerted tenant ${tenantId} recently, skipping`);
          alertResults.push({ tenant_id: tenantId, alerted: false, method: "already_alerted" });
          continue;
        }

        // Send alert to tenant owner
        const alertSent = await sendTenantAlert(
          supabase,
          SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY,
          summary
        );

        alertResults.push({
          tenant_id: tenantId,
          alerted: alertSent,
          method: summary.owner_email ? "email" : "dashboard_only",
        });
      }
    }

    // Log summary to Sentry
    if (totalFailures > 0) {
      await captureMessage(
        `Handoff failures detected: ${totalFailures} in last ${LOOKBACK_MINUTES} minutes`,
        totalFailures >= GLOBAL_ALERT_THRESHOLD ? "error" : "warning",
        {
          tags: { function: "check-handoff-failures" },
          extra: {
            total_failures: totalFailures,
            affected_tenants: failuresByTenant.size,
            alerts_sent: alertResults.filter((r) => r.alerted).length,
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        status: "success",
        total_failures: totalFailures,
        affected_tenants: failuresByTenant.size,
        alerts: alertResults,
        lookback_minutes: LOOKBACK_MINUTES,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Failure check error:", error);

    await captureException(error, {
      tags: { function: "check-handoff-failures" },
    });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Send alert to ops team
 async function sendOpsAlert(
   supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  slackWebhookUrl: string | undefined,
  opsEmail: string,
  totalFailures: number,
  failuresByTenant: Map<string, FailureSummary>
): Promise<void> {
  const tenantSummaries = Array.from(failuresByTenant.values())
    .sort((a, b) => b.failure_count - a.failure_count)
    .slice(0, 5)
    .map((s) => `${s.tenant_name}: ${s.failure_count} failures (${s.entity_types.join(", ")})`)
    .join("\n");

  const message = `
Flux Receptionist Handoff Alert

${totalFailures} handoff failures detected in the last hour.

Top affected tenants:
${tenantSummaries}

Please check the dashboard for details.
  `.trim();

  // Send to Slack if configured
  if (slackWebhookUrl) {
    try {
      await fetch(slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: message,
          attachments: [
            {
              color: "danger",
              title: "Handoff Failure Alert",
              fields: [
                { title: "Total Failures", value: String(totalFailures), short: true },
                { title: "Affected Tenants", value: String(failuresByTenant.size), short: true },
              ],
            },
          ],
        }),
      });
      console.log("Sent Slack alert to ops channel");
    } catch (e) {
      console.error("Failed to send Slack alert:", e);
    }
  }

   // Log the ops alert
   try {
     await supabase.from("audit_events").insert({
       tenant_id: null,
       event_type: "system.ops_alert_sent",
       actor_type: "system",
       payload: {
         alert_type: "handoff_failures",
         total_failures: totalFailures,
         affected_tenants: failuresByTenant.size,
         message,
       },
     });
   } catch (e) {
     console.error("Failed to log ops alert:", e);
   }
 }

 // Send alert to tenant owner
 async function sendTenantAlert(
   supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  summary: FailureSummary
): Promise<boolean> {
  const { tenant_id, tenant_name, owner_email, failure_count, entity_types, latest_error } = summary;

   // Log the alert to audit_events
   try {
     await supabase.from("audit_events").insert({
       tenant_id,
       event_type: "handoff.alert_sent",
       actor_type: "system",
       payload: {
         failure_count,
         entity_types,
         latest_error,
         owner_email,
       },
     });
   } catch (e) {
     console.error("Failed to log tenant alert:", e);
   }
 
   // Create a dashboard notification
   try {
     await supabase.from("notifications").insert({
       tenant_id,
       type: "handoff_failure",
       title: "Handoff Delivery Issues",
       message: `${failure_count} handoff deliveries have failed in the last hour. Please check your integration settings.`,
       severity: "warning",
       read: false,
     });
   } catch {
     // notifications table might not exist, ignore
   }

  // Trigger notification workflow if email is available
  if (owner_email) {
    try {
      await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          tenant_id,
          trigger: "handoff.failure_alert",
          is_critical: failure_count >= 5,
          details: {
            failure_count,
            entity_types,
            latest_error,
            owner_email,
            business_name: tenant_name,
          },
        }),
      });
      return true;
    } catch (e) {
      console.error(`Failed to trigger alert workflow for tenant ${tenant_id}:`, e);
      return false;
    }
  }

  return false;
}
