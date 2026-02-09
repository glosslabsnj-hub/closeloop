/**
 * build-weekly-digest
 * 
 * Cron job (runs weekly) that creates comprehensive weekly summaries
 * with metrics, highlights, and recommendations for each tenant.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeeklyMetrics {
  total_calls: number;
  ai_handled_calls: number;
  ai_handle_rate: number;
  bookings_created: number;
  orders_placed: number;
  dispatches_created: number;
  callbacks_scheduled: number;
  escalations: number;
  conversion_rate: number;
  avg_call_duration_seconds: number;
  estimated_revenue_cents: number;
  knowledge_gaps_created: number;
  patterns_detected: number;
}

interface Highlight {
  type: string;
  title: string;
  value: string;
  trend?: "up" | "down" | "stable";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate period (last 7 days)
    const periodEnd = new Date();
    periodEnd.setHours(23, 59, 59, 999);
    const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    periodStart.setHours(0, 0, 0, 0);

    const periodStartStr = periodStart.toISOString();
    const periodEndStr = periodEnd.toISOString();
    const periodStartDate = periodStart.toISOString().split("T")[0];
    const periodEndDate = periodEnd.toISOString().split("T")[0];

    // Get all active tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, name, business_mode")
      .not("onboarding_completed_at", "is", null);

    if (tenantsError) throw tenantsError;

    const results: { tenantId: string; digestCreated: boolean }[] = [];

    for (const tenant of tenants || []) {
      // Get call outcomes for the week
      const { data: outcomes } = await supabase
        .from("call_outcomes")
        .select("*")
        .eq("tenant_id", tenant.id)
        .gte("created_at", periodStartStr)
        .lte("created_at", periodEndStr);

      const outcomesList = outcomes || [];

      // Calculate metrics
      const totalCalls = outcomesList.length;
      const aiHandledCalls = outcomesList.filter(o => o.ai_handled_fully).length;
      const bookingsCreated = outcomesList.filter(o => o.outcome_type === "booked").length;
      const ordersPlaced = outcomesList.filter(o => o.outcome_type === "order_placed").length;
      const dispatchesCreated = outcomesList.filter(o => o.outcome_type === "dispatch_created").length;
      const callbacksScheduled = outcomesList.filter(o => o.outcome_type === "callback_scheduled").length;
      const escalations = outcomesList.filter(o => !o.ai_handled_fully).length;
      
      const conversions = bookingsCreated + ordersPlaced + dispatchesCreated;
      const conversionRate = totalCalls > 0 ? conversions / totalCalls : 0;
      const aiHandleRate = totalCalls > 0 ? aiHandledCalls / totalCalls : 0;
      
      const totalDuration = outcomesList.reduce((sum, o) => sum + (o.duration_seconds || 0), 0);
      const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
      
      const estimatedRevenue = outcomesList.reduce((sum, o) => sum + (o.conversion_value_cents || 0), 0);

      // Get knowledge gaps created this week
      const { count: gapsCreated } = await supabase
        .from("knowledge_gaps")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .gte("created_at", periodStartStr)
        .lte("created_at", periodEndStr);

      // Get patterns detected this week
      const { count: patternsDetected } = await supabase
        .from("business_patterns")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .gte("last_observed_at", periodStartStr)
        .lte("last_observed_at", periodEndStr);

      const metrics: WeeklyMetrics = {
        total_calls: totalCalls,
        ai_handled_calls: aiHandledCalls,
        ai_handle_rate: aiHandleRate,
        bookings_created: bookingsCreated,
        orders_placed: ordersPlaced,
        dispatches_created: dispatchesCreated,
        callbacks_scheduled: callbacksScheduled,
        escalations,
        conversion_rate: conversionRate,
        avg_call_duration_seconds: avgDuration,
        estimated_revenue_cents: estimatedRevenue,
        knowledge_gaps_created: gapsCreated || 0,
        patterns_detected: patternsDetected || 0,
      };

      // Build highlights
      const highlights: Highlight[] = [];

      if (totalCalls > 0) {
        highlights.push({
          type: "calls",
          title: "Total Calls",
          value: `${totalCalls} calls handled`,
        });

        highlights.push({
          type: "ai_performance",
          title: "AI Handle Rate",
          value: `${(aiHandleRate * 100).toFixed(0)}% handled without escalation`,
        });

        if (conversions > 0) {
          highlights.push({
            type: "conversions",
            title: "Conversions",
            value: `${conversions} successful outcomes (${(conversionRate * 100).toFixed(0)}% rate)`,
          });
        }
      }

      if (estimatedRevenue > 0) {
        highlights.push({
          type: "revenue",
          title: "Tracked Revenue",
          value: `$${(estimatedRevenue / 100).toFixed(2)} from orders`,
        });
      }

      // Get unactioned insights as recommendations
      const { data: insights } = await supabase
        .from("intelligence_insights")
        .select("title, recommended_action, severity, impact_estimate")
        .eq("tenant_id", tenant.id)
        .eq("is_actioned", false)
        .order("severity", { ascending: false })
        .limit(3);

      const recommendations = (insights || []).map(i => ({
        priority: i.severity === "critical" ? "high" : i.severity === "warning" ? "medium" : "low",
        action: i.recommended_action || i.title,
        impact: i.impact_estimate || "medium",
      }));

      // Insert digest
      const { error: digestError } = await supabase
        .from("intelligence_digest")
        .upsert({
          tenant_id: tenant.id,
          period_start: periodStartDate,
          period_end: periodEndDate,
          digest_type: "weekly",
          metrics_json: metrics,
          highlights_json: highlights,
          recommendations_json: recommendations,
          patterns_discovered: patternsDetected || 0,
          gaps_identified: gapsCreated || 0,
        }, {
          onConflict: "tenant_id,period_start,period_end,digest_type",
        });

      if (digestError) {
        console.error(`[build-weekly-digest] Error for ${tenant.id}:`, digestError);
        results.push({ tenantId: tenant.id, digestCreated: false });
      } else {
        results.push({ tenantId: tenant.id, digestCreated: true });
      }
    }

    console.log(`[build-weekly-digest] Created digests for ${results.filter(r => r.digestCreated).length}/${results.length} tenants`);

    return new Response(JSON.stringify({ 
      success: true, 
      periodStart: periodStartDate,
      periodEnd: periodEndDate,
      tenantsProcessed: results.length,
      digestsCreated: results.filter(r => r.digestCreated).length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[build-weekly-digest] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
