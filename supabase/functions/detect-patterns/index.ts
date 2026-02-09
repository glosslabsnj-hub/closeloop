/**
 * detect-patterns
 *
 * Analyzes recent call_outcomes for a tenant to detect business patterns
 * and generate actionable intelligence_insights.
 *
 * Can be called:
 * - Automatically every N calls (from process-call-outcome)
 * - Manually from the Intelligence Dashboard
 * - Via cron for weekly digest generation
 *
 * Payload:
 *   tenant_id       - Required
 *   generate_digest  - Optional, if true also generates a weekly digest
 *   lookback_days    - Optional, defaults to 7
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";

interface DetectPatternsPayload {
  tenant_id: string;
  generate_digest?: boolean;
  lookback_days?: number;
}

interface CallOutcome {
  id: string;
  outcome_type: string;
  intent: string | null;
  service_requested: string | null;
  duration_seconds: number | null;
  ai_handled_fully: boolean;
  escalation_reason: string | null;
  created_at: string;
}

interface PatternResult {
  pattern_type: string;
  pattern_key: string;
  description: string;
  confidence_score: number;
  data_json: Record<string, unknown>;
  is_actionable: boolean;
  suggested_action: string | null;
}

interface InsightResult {
  insight_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  recommended_action: string | null;
  action_link: string | null;
  impact_estimate: string | null;
}

// ─── Pattern Detection Functions ────────────────────────────────────────────

function detectTimePatterns(outcomes: CallOutcome[]): PatternResult[] {
  const patterns: PatternResult[] = [];
  const hourBuckets: Record<number, { total: number; converted: number }> = {};
  const dayBuckets: Record<number, { total: number; converted: number }> = {};

  for (const o of outcomes) {
    const dt = new Date(o.created_at);
    const hour = dt.getHours();
    const day = dt.getDay();
    const converted = ["booked", "order_placed", "dispatch_created"].includes(o.outcome_type);

    if (!hourBuckets[hour]) hourBuckets[hour] = { total: 0, converted: 0 };
    hourBuckets[hour].total++;
    if (converted) hourBuckets[hour].converted++;

    if (!dayBuckets[day]) dayBuckets[day] = { total: 0, converted: 0 };
    dayBuckets[day].total++;
    if (converted) dayBuckets[day].converted++;
  }

  // Find peak hours (top 3 by volume)
  const sortedHours = Object.entries(hourBuckets)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 3);

  if (sortedHours.length > 0 && sortedHours[0][1].total >= 3) {
    const peakHours = sortedHours.map(([h]) => `${h}:00`).join(", ");
    patterns.push({
      pattern_type: "time_pattern",
      pattern_key: "peak_call_hours",
      description: `Most calls come in at ${peakHours}. Consider ensuring full staffing during these times.`,
      confidence_score: Math.min(0.95, 0.5 + (sortedHours[0][1].total / outcomes.length)),
      data_json: { hourBuckets, peakHours: sortedHours.map(([h]) => parseInt(h)) },
      is_actionable: true,
      suggested_action: "Review staffing during peak hours",
    });
  }

  // Find best conversion hours
  const conversionByHour = Object.entries(hourBuckets)
    .filter(([, v]) => v.total >= 2)
    .map(([h, v]) => ({ hour: parseInt(h), rate: v.converted / v.total, total: v.total }))
    .sort((a, b) => b.rate - a.rate);

  if (conversionByHour.length >= 2) {
    const bestHour = conversionByHour[0];
    const worstHour = conversionByHour[conversionByHour.length - 1];
    if (bestHour.rate - worstHour.rate > 0.2) {
      patterns.push({
        pattern_type: "conversion_pattern",
        pattern_key: "hourly_conversion_spread",
        description: `Conversion rate is ${Math.round(bestHour.rate * 100)}% at ${bestHour.hour}:00 but only ${Math.round(worstHour.rate * 100)}% at ${worstHour.hour}:00.`,
        confidence_score: Math.min(0.9, 0.5 + (bestHour.total + worstHour.total) / outcomes.length),
        data_json: { best: bestHour, worst: worstHour, allHours: conversionByHour },
        is_actionable: true,
        suggested_action: `Investigate why ${worstHour.hour}:00 calls convert poorly`,
      });
    }
  }

  return patterns;
}

function detectServiceTrends(outcomes: CallOutcome[]): PatternResult[] {
  const patterns: PatternResult[] = [];
  const serviceCounts: Record<string, { total: number; converted: number }> = {};

  for (const o of outcomes) {
    if (!o.service_requested) continue;
    const svc = o.service_requested.toLowerCase().trim();
    if (!serviceCounts[svc]) serviceCounts[svc] = { total: 0, converted: 0 };
    serviceCounts[svc].total++;
    if (["booked", "order_placed", "dispatch_created"].includes(o.outcome_type)) {
      serviceCounts[svc].converted++;
    }
  }

  const sorted = Object.entries(serviceCounts)
    .sort(([, a], [, b]) => b.total - a.total);

  // Top requested service
  if (sorted.length > 0 && sorted[0][1].total >= 3) {
    const [topService, topData] = sorted[0];
    const convRate = topData.converted / topData.total;
    patterns.push({
      pattern_type: "service_trend",
      pattern_key: `top_service_${topService.replace(/\s+/g, "_").substring(0, 30)}`,
      description: `"${topService}" is your most requested service (${topData.total} calls, ${Math.round(convRate * 100)}% conversion).`,
      confidence_score: Math.min(0.95, 0.5 + topData.total / outcomes.length),
      data_json: { service: topService, ...topData, conversionRate: convRate },
      is_actionable: convRate < 0.5,
      suggested_action: convRate < 0.5
        ? `"${topService}" has low conversion — check pricing or add FAQ answers`
        : null,
    });
  }

  // Low-conversion services
  for (const [svc, data] of sorted) {
    if (data.total >= 3 && data.converted / data.total < 0.3) {
      patterns.push({
        pattern_type: "service_trend",
        pattern_key: `low_conv_${svc.replace(/\s+/g, "_").substring(0, 30)}`,
        description: `"${svc}" has only ${Math.round((data.converted / data.total) * 100)}% conversion across ${data.total} calls.`,
        confidence_score: Math.min(0.85, 0.5 + data.total / outcomes.length),
        data_json: { service: svc, ...data },
        is_actionable: true,
        suggested_action: `Review pricing and FAQ coverage for "${svc}"`,
      });
    }
  }

  return patterns;
}

function detectConversionPatterns(outcomes: CallOutcome[]): PatternResult[] {
  const patterns: PatternResult[] = [];

  const total = outcomes.length;
  if (total < 5) return patterns;

  const converted = outcomes.filter(o =>
    ["booked", "order_placed", "dispatch_created"].includes(o.outcome_type)
  ).length;
  const hangups = outcomes.filter(o => o.outcome_type === "hangup").length;
  const escalated = outcomes.filter(o => o.outcome_type === "transferred").length;

  const conversionRate = converted / total;
  const hangupRate = hangups / total;
  const escalationRate = escalated / total;

  // Overall conversion rate
  patterns.push({
    pattern_type: "conversion_pattern",
    pattern_key: "overall_conversion_rate",
    description: `Overall conversion rate: ${Math.round(conversionRate * 100)}% (${converted}/${total} calls). ${hangups} hangups, ${escalated} escalations.`,
    confidence_score: Math.min(0.95, 0.6 + total / 50),
    data_json: { total, converted, hangups, escalated, conversionRate, hangupRate, escalationRate },
    is_actionable: conversionRate < 0.4,
    suggested_action: conversionRate < 0.4
      ? "Conversion rate is below 40% — review objection handling and pricing"
      : null,
  });

  // High hangup rate
  if (hangupRate > 0.3 && total >= 5) {
    patterns.push({
      pattern_type: "conversion_pattern",
      pattern_key: "high_hangup_rate",
      description: `${Math.round(hangupRate * 100)}% of calls end in hangup. Callers may not be finding what they need.`,
      confidence_score: Math.min(0.9, 0.5 + hangups / total),
      data_json: { hangupRate, hangups, total },
      is_actionable: true,
      suggested_action: "Review your greeting script and FAQ coverage — callers may be leaving before getting answers",
    });
  }

  // High escalation rate
  if (escalationRate > 0.2 && total >= 5) {
    patterns.push({
      pattern_type: "conversion_pattern",
      pattern_key: "high_escalation_rate",
      description: `${Math.round(escalationRate * 100)}% of calls need human help. Your AI may need more training.`,
      confidence_score: Math.min(0.9, 0.5 + escalated / total),
      data_json: { escalationRate, escalated, total },
      is_actionable: true,
      suggested_action: "Add more FAQs, objection responses, and policies so your AI can handle more calls",
    });
  }

  // Average call duration pattern
  const durations = outcomes.filter(o => o.duration_seconds).map(o => o.duration_seconds!);
  if (durations.length >= 5) {
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const longCalls = durations.filter(d => d > 300).length;
    if (longCalls / durations.length > 0.3) {
      patterns.push({
        pattern_type: "capacity_pattern",
        pattern_key: "long_call_ratio",
        description: `${Math.round((longCalls / durations.length) * 100)}% of calls last over 5 minutes (avg ${Math.round(avgDuration / 60)} min). This may indicate complex inquiries.`,
        confidence_score: 0.7,
        data_json: { avgDuration, longCalls, totalWithDuration: durations.length },
        is_actionable: true,
        suggested_action: "Review long calls — adding FAQs or better service descriptions may shorten them",
      });
    }
  }

  return patterns;
}

// ─── Insight Generation ─────────────────────────────────────────────────────

function generateInsights(patterns: PatternResult[], outcomes: CallOutcome[]): InsightResult[] {
  const insights: InsightResult[] = [];
  const total = outcomes.length;

  for (const p of patterns) {
    if (!p.is_actionable || p.confidence_score < 0.6) continue;

    if (p.pattern_key === "high_hangup_rate") {
      insights.push({
        insight_type: "conversion_drop",
        severity: "warning",
        title: "Callers are hanging up",
        description: p.description,
        recommended_action: p.suggested_action,
        action_link: "/app/brain?section=ai-voice#scripts",
        impact_estimate: `Could recover ${Math.round((p.data_json as Record<string, number>).hangups * 0.3)} calls/week`,
      });
    }

    if (p.pattern_key === "high_escalation_rate") {
      insights.push({
        insight_type: "knowledge_gap",
        severity: "warning",
        title: "Too many calls need human help",
        description: p.description,
        recommended_action: p.suggested_action,
        action_link: "/app/brain?section=training#faqs",
        impact_estimate: `Could save ${Math.round((p.data_json as Record<string, number>).escalated * 0.5)} escalations/week`,
      });
    }

    if (p.pattern_key.startsWith("low_conv_")) {
      const svc = (p.data_json as Record<string, unknown>).service as string;
      insights.push({
        insight_type: "service_recommendation",
        severity: "info",
        title: `Low conversion for "${svc}"`,
        description: p.description,
        recommended_action: p.suggested_action,
        action_link: "/app/brain?section=services#catalog",
        impact_estimate: null,
      });
    }

    if (p.pattern_key === "overall_conversion_rate" && (p.data_json as Record<string, number>).conversionRate < 0.4) {
      insights.push({
        insight_type: "conversion_drop",
        severity: "critical",
        title: "Conversion rate below 40%",
        description: `Only ${Math.round((p.data_json as Record<string, number>).conversionRate * 100)}% of ${total} calls result in a booking, order, or dispatch.`,
        recommended_action: "Review your objection handling, pricing, and FAQ coverage",
        action_link: "/app/brain?section=training#objections",
        impact_estimate: `Improving to 50% could add ${Math.round(total * 0.1)} more bookings/week`,
      });
    }

    if (p.pattern_key === "peak_call_hours") {
      insights.push({
        insight_type: "time_opportunity",
        severity: "info",
        title: "Peak call times identified",
        description: p.description,
        recommended_action: p.suggested_action,
        action_link: "/app/brain?section=business#business-hours",
        impact_estimate: null,
      });
    }

    if (p.pattern_key === "long_call_ratio") {
      insights.push({
        insight_type: "capacity_warning",
        severity: "info",
        title: "Many calls are running long",
        description: p.description,
        recommended_action: p.suggested_action,
        action_link: "/app/brain?section=training#faqs",
        impact_estimate: null,
      });
    }
  }

  return insights;
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const payload: DetectPatternsPayload = await req.json();

    if (!payload.tenant_id) {
      return errorResponse("Missing required field: tenant_id");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const lookbackDays = payload.lookback_days || 7;
    const lookbackDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

    // Fetch recent call outcomes
    const { data: outcomes, error: fetchError } = await supabase
      .from("call_outcomes")
      .select("id, outcome_type, intent, service_requested, duration_seconds, ai_handled_fully, escalation_reason, created_at")
      .eq("tenant_id", payload.tenant_id)
      .gte("created_at", lookbackDate)
      .order("created_at", { ascending: false })
      .limit(500);

    if (fetchError) {
      return errorResponse(`Failed to fetch outcomes: ${fetchError.message}`, 500);
    }

    if (!outcomes || outcomes.length < 3) {
      return jsonResponse({
        success: true,
        message: "Not enough data for pattern detection",
        outcomes_count: outcomes?.length || 0,
        patterns_found: 0,
        insights_generated: 0,
      });
    }

    // Run detection algorithms
    const allPatterns: PatternResult[] = [
      ...detectTimePatterns(outcomes),
      ...detectServiceTrends(outcomes),
      ...detectConversionPatterns(outcomes),
    ];

    // Upsert patterns (using the unique index on tenant_id, pattern_type, pattern_key)
    let patternsUpserted = 0;
    for (const p of allPatterns) {
      const { error: upsertErr } = await supabase
        .from("business_patterns")
        .upsert(
          {
            tenant_id: payload.tenant_id,
            pattern_type: p.pattern_type,
            pattern_key: p.pattern_key,
            description: p.description,
            confidence_score: p.confidence_score,
            observation_count: outcomes.length,
            last_observed_at: new Date().toISOString(),
            data_json: p.data_json,
            is_actionable: p.is_actionable,
            suggested_action: p.suggested_action,
          },
          { onConflict: "tenant_id,pattern_type,pattern_key" }
        );

      if (!upsertErr) patternsUpserted++;
    }

    // Generate insights from actionable patterns
    const insights = generateInsights(allPatterns, outcomes);

    // Insert insights (skip duplicates by checking recent existing)
    let insightsCreated = 0;
    for (const insight of insights) {
      // Check if a similar insight exists in the last 7 days
      const { data: existing } = await supabase
        .from("intelligence_insights")
        .select("id")
        .eq("tenant_id", payload.tenant_id)
        .eq("insight_type", insight.insight_type)
        .eq("title", insight.title)
        .gte("created_at", lookbackDate)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const { error: insertErr } = await supabase
        .from("intelligence_insights")
        .insert({
          tenant_id: payload.tenant_id,
          insight_type: insight.insight_type,
          severity: insight.severity,
          title: insight.title,
          description: insight.description,
          recommended_action: insight.recommended_action,
          action_link: insight.action_link,
          impact_estimate: insight.impact_estimate,
          expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks
        });

      if (!insertErr) insightsCreated++;
    }

    // Generate weekly digest if requested
    let digestCreated = false;
    if (payload.generate_digest) {
      const periodEnd = new Date();
      const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const total = outcomes.length;
      const converted = outcomes.filter(o =>
        ["booked", "order_placed", "dispatch_created"].includes(o.outcome_type)
      ).length;
      const durations = outcomes.filter(o => o.duration_seconds).map(o => o.duration_seconds!);
      const avgDuration = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

      const metricsJson = {
        total_calls: total,
        converted_calls: converted,
        conversion_rate: total > 0 ? Math.round((converted / total) * 100) : 0,
        hangups: outcomes.filter(o => o.outcome_type === "hangup").length,
        escalations: outcomes.filter(o => o.outcome_type === "transferred").length,
        avg_duration_seconds: avgDuration,
        faq_only: outcomes.filter(o => o.outcome_type === "faq_answered").length,
      };

      const highlightsJson = allPatterns
        .filter(p => p.confidence_score >= 0.7)
        .slice(0, 5)
        .map(p => ({ type: p.pattern_type, description: p.description }));

      const recommendationsJson = insights
        .filter(i => i.severity !== "info")
        .slice(0, 3)
        .map(i => ({ title: i.title, action: i.recommended_action, link: i.action_link }));

      const { error: digestErr } = await supabase
        .from("intelligence_digest")
        .upsert(
          {
            tenant_id: payload.tenant_id,
            period_start: periodStart.toISOString().split("T")[0],
            period_end: periodEnd.toISOString().split("T")[0],
            digest_type: "weekly",
            metrics_json: metricsJson,
            highlights_json: highlightsJson,
            recommendations_json: recommendationsJson,
            patterns_discovered: patternsUpserted,
            gaps_identified: insights.length,
          },
          { onConflict: "tenant_id,period_start,period_end,digest_type" }
        );

      digestCreated = !digestErr;
    }

    console.log(`[detect-patterns] tenant=${payload.tenant_id.substring(0, 8)}... outcomes=${outcomes.length} patterns=${patternsUpserted} insights=${insightsCreated}`);

    return jsonResponse({
      success: true,
      outcomes_analyzed: outcomes.length,
      patterns_found: patternsUpserted,
      insights_generated: insightsCreated,
      digest_created: digestCreated,
    });
  } catch (err) {
    console.error("[detect-patterns] Error:", err);
    return errorResponse(`Internal error: ${err instanceof Error ? err.message : "Unknown error"}`, 500);
  }
});
