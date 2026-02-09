/**
 * detect-patterns
 * 
 * Cron job (runs hourly) that analyzes recent calls per tenant
 * to detect emerging patterns (time, service, conversion trends).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PatternData {
  pattern_type: string;
  pattern_key: string;
  description: string;
  confidence_score: number;
  data_json: Record<string, unknown>;
  is_actionable: boolean;
  suggested_action?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, name, business_mode")
      .not("onboarding_completed_at", "is", null);

    if (tenantsError) throw tenantsError;

    const results: { tenantId: string; patternsDetected: number }[] = [];
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    for (const tenant of tenants || []) {
      const patterns: PatternData[] = [];

      // 1. Analyze call outcomes for conversion patterns
      const { data: outcomes } = await supabase
        .from("call_outcomes")
        .select("outcome_type, intent, created_at, ai_handled_fully")
        .eq("tenant_id", tenant.id)
        .gte("created_at", last7Days);

      if (outcomes && outcomes.length >= 5) {
        // Calculate conversion rate
        const totalCalls = outcomes.length;
        const conversions = outcomes.filter(o => 
          ["booked", "order_placed", "dispatch_created"].includes(o.outcome_type)
        ).length;
        const conversionRate = conversions / totalCalls;

        // Detect low conversion pattern
        if (conversionRate < 0.3 && totalCalls >= 10) {
          patterns.push({
            pattern_type: "conversion_pattern",
            pattern_key: "low_conversion_rate",
            description: `Conversion rate is ${(conversionRate * 100).toFixed(1)}% over the last 7 days (${conversions}/${totalCalls} calls converted)`,
            confidence_score: Math.min(0.9, totalCalls / 50 + 0.5),
            data_json: { conversionRate, totalCalls, conversions },
            is_actionable: true,
            suggested_action: "Review knowledge gaps and FAQ responses to improve conversion",
          });
        }

        // Detect AI escalation pattern
        const escalations = outcomes.filter(o => !o.ai_handled_fully).length;
        const escalationRate = escalations / totalCalls;
        if (escalationRate > 0.2 && escalations >= 3) {
          patterns.push({
            pattern_type: "conversion_pattern",
            pattern_key: "high_escalation_rate",
            description: `${(escalationRate * 100).toFixed(1)}% of calls required human escalation`,
            confidence_score: Math.min(0.85, escalations / 10 + 0.5),
            data_json: { escalationRate, escalations, totalCalls },
            is_actionable: true,
            suggested_action: "Add more FAQs and policies to help AI handle common questions",
          });
        }
      }

      // 2. Analyze time patterns from call sessions
      const { data: sessions } = await supabase
        .from("ai_call_sessions")
        .select("started_at")
        .eq("tenant_id", tenant.id)
        .gte("started_at", last7Days);

      if (sessions && sessions.length >= 10) {
        // Group by hour
        const hourCounts: Record<number, number> = {};
        for (const s of sessions) {
          const hour = new Date(s.started_at).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }

        // Find peak hours
        const maxCount = Math.max(...Object.values(hourCounts));
        const peakHours = Object.entries(hourCounts)
          .filter(([_, count]) => count >= maxCount * 0.8)
          .map(([hour]) => parseInt(hour));

        if (peakHours.length > 0 && maxCount >= 3) {
          const peakTimeStr = peakHours.map(h => 
            `${h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}`
          ).join(", ");

          patterns.push({
            pattern_type: "time_pattern",
            pattern_key: "peak_call_hours",
            description: `Peak call times: ${peakTimeStr} (${maxCount} calls at peak)`,
            confidence_score: Math.min(0.9, sessions.length / 30 + 0.5),
            data_json: { hourCounts, peakHours, maxCount },
            is_actionable: false,
          });
        }
      }

      // 3. Analyze knowledge gaps for recurring themes
      const { data: gaps } = await supabase
        .from("knowledge_gaps")
        .select("question_theme, occurrence_count")
        .eq("tenant_id", tenant.id)
        .eq("is_resolved", false)
        .gte("occurrence_count", 3)
        .order("occurrence_count", { ascending: false })
        .limit(5);

      if (gaps && gaps.length > 0) {
        const totalOccurrences = gaps.reduce((sum, g) => sum + (g.occurrence_count || 0), 0);
        
        patterns.push({
          pattern_type: "objection_pattern",
          pattern_key: "recurring_knowledge_gaps",
          description: `${gaps.length} unresolved knowledge gaps with ${totalOccurrences} total occurrences`,
          confidence_score: 0.95,
          data_json: { gaps: gaps.map(g => ({ theme: g.question_theme, count: g.occurrence_count })) },
          is_actionable: true,
          suggested_action: "Review and resolve knowledge gaps in Business Brain > Training",
        });
      }

      // Upsert patterns for this tenant
      for (const pattern of patterns) {
        const { error: upsertError } = await supabase
          .from("business_patterns")
          .upsert({
            tenant_id: tenant.id,
            pattern_type: pattern.pattern_type,
            pattern_key: pattern.pattern_key,
            description: pattern.description,
            confidence_score: pattern.confidence_score,
            data_json: pattern.data_json,
            is_actionable: pattern.is_actionable,
            suggested_action: pattern.suggested_action,
            last_observed_at: new Date().toISOString(),
            observation_count: 1, // Will be incremented by trigger if exists
          }, {
            onConflict: "tenant_id,pattern_type,pattern_key",
          });

        if (upsertError) {
          console.error(`[detect-patterns] Failed to upsert pattern for ${tenant.id}:`, upsertError);
        }
      }

      results.push({ tenantId: tenant.id, patternsDetected: patterns.length });
    }

    console.log(`[detect-patterns] Processed ${results.length} tenants`);

    return new Response(JSON.stringify({ 
      success: true, 
      tenantsProcessed: results.length,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[detect-patterns] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
