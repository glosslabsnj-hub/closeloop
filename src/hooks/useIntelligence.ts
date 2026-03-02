/**
 * Intelligence Layer Hooks
 *
 * Hooks for fetching call outcomes, patterns, insights, and digests
 * from the intelligence tables.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "./useTenantConfig";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CallOutcome {
  id: string;
  tenant_id: string;
  session_id: string | null;
  outcome_type: string;
  intent: string | null;
  service_requested: string | null;
  conversion_value_cents: number | null;
  duration_seconds: number | null;
  ai_handled_fully: boolean;
  escalation_reason: string | null;
  created_at: string;
}

export interface BusinessPattern {
  id: string;
  tenant_id: string;
  pattern_type: string;
  pattern_key: string;
  description: string;
  confidence_score: number;
  observation_count: number;
  first_observed_at: string;
  last_observed_at: string;
  data_json: Record<string, unknown>;
  is_actionable: boolean;
  suggested_action: string | null;
  is_dismissed: boolean;
  dismissed_at: string | null;
  created_at: string;
}

export interface IntelligenceInsight {
  id: string;
  tenant_id: string;
  insight_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  recommended_action: string | null;
  action_link: string | null;
  impact_estimate: string | null;
  source_pattern_id: string | null;
  is_read: boolean;
  is_actioned: boolean;
  actioned_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface IntelligenceDigest {
  id: string;
  tenant_id: string;
  period_start: string;
  period_end: string;
  digest_type: string;
  metrics_json: {
    total_calls: number;
    converted_calls: number;
    conversion_rate: number;
    hangups: number;
    escalations: number;
    avg_duration_seconds: number;
    faq_only: number;
  };
  highlights_json: Array<{ type: string; description: string }>;
  recommendations_json: Array<{ title: string; action: string | null; link: string | null }>;
  patterns_discovered: number;
  gaps_identified: number;
  created_at: string;
}

export interface ConversionMetrics {
  totalCalls: number;
  convertedCalls: number;
  conversionRate: number;
  hangupRate: number;
  escalationRate: number;
  avgDurationSeconds: number;
  totalRevenueCents: number;
  outcomeBreakdown: Record<string, number>;
}

// ─── Call Outcomes ──────────────────────────────────────────────────────────

export function useCallOutcomes(days = 7) {
  const { tenant } = useAuth();
  const tenantId = tenant?.id;

  return useQuery({
    queryKey: ["call-outcomes", tenantId, days],
    queryFn: async () => {
      if (!tenantId) return [];
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("call_outcomes")
        .select("*")
        .eq("tenant_id", tenantId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data || []) as CallOutcome[];
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

/** Map business mode to its conversion outcome types */
const CONVERSION_OUTCOMES: Record<string, string[]> = {
  service: ["booked"],
  dispatch: ["dispatch"],
  food: ["order_placed"],
  medical: ["booked", "intake_completed"],
  sales: ["booked", "lead_qualified"],
  general: ["booked", "callback"],
};

export function useConversionMetrics(days = 7) {
  const { data: outcomes = [], ...rest } = useCallOutcomes(days);
  const { businessMode } = useTenantConfig();

  const metrics: ConversionMetrics = {
    totalCalls: outcomes.length,
    convertedCalls: 0,
    conversionRate: 0,
    hangupRate: 0,
    escalationRate: 0,
    avgDurationSeconds: 0,
    totalRevenueCents: 0,
    outcomeBreakdown: {},
  };

  if (outcomes.length === 0) return { metrics, ...rest };

  const validConversions = CONVERSION_OUTCOMES[businessMode] || ["booked"];
  const converted = outcomes.filter(o =>
    validConversions.includes(o.outcome_type)
  );
  const hangups = outcomes.filter(o => o.outcome_type === "hangup");
  const escalations = outcomes.filter(o => o.outcome_type === "transferred");
  const durations = outcomes.filter(o => o.duration_seconds).map(o => o.duration_seconds!);

  metrics.convertedCalls = converted.length;
  metrics.conversionRate = outcomes.length > 0 ? converted.length / outcomes.length : 0;
  metrics.hangupRate = outcomes.length > 0 ? hangups.length / outcomes.length : 0;
  metrics.escalationRate = outcomes.length > 0 ? escalations.length / outcomes.length : 0;
  metrics.avgDurationSeconds = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;
  metrics.totalRevenueCents = outcomes
    .filter(o => o.conversion_value_cents)
    .reduce((sum, o) => sum + (o.conversion_value_cents || 0), 0);

  // Breakdown by outcome type
  for (const o of outcomes) {
    metrics.outcomeBreakdown[o.outcome_type] = (metrics.outcomeBreakdown[o.outcome_type] || 0) + 1;
  }

  return { metrics, ...rest };
}

// ─── Business Patterns ──────────────────────────────────────────────────────

export function useBusinessPatterns() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id;

  return useQuery({
    queryKey: ["business-patterns", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("business_patterns")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_dismissed", false)
        .order("confidence_score", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as BusinessPattern[];
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

export function useDismissPattern() {
  const queryClient = useQueryClient();
  const { tenant } = useAuth();

  return useMutation({
    mutationFn: async (patternId: string) => {
      const { error } = await supabase
        .from("business_patterns")
        .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
        .eq("id", patternId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-patterns", tenant?.id] });
    },
  });
}

// ─── Intelligence Insights ──────────────────────────────────────────────────

export function useIntelligenceInsights(includeActioned = false) {
  const { tenant } = useAuth();
  const tenantId = tenant?.id;

  return useQuery({
    queryKey: ["intelligence-insights", tenantId, includeActioned],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase
        .from("intelligence_insights")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!includeActioned) {
        query = query.eq("is_actioned", false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as IntelligenceInsight[];
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useUnreadInsightCount() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id;

  return useQuery({
    queryKey: ["intelligence-insights-unread-count", tenantId],
    queryFn: async () => {
      if (!tenantId) return 0;
      const { count, error } = await supabase
        .from("intelligence_insights")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("is_read", false)
        .eq("is_actioned", false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useMarkInsightRead() {
  const queryClient = useQueryClient();
  const { tenant } = useAuth();

  return useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from("intelligence_insights")
        .update({ is_read: true })
        .eq("id", insightId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intelligence-insights", tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ["intelligence-insights-unread-count", tenant?.id] });
    },
  });
}

export function useMarkInsightActioned() {
  const queryClient = useQueryClient();
  const { tenant } = useAuth();

  return useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from("intelligence_insights")
        .update({ is_actioned: true, actioned_at: new Date().toISOString(), is_read: true })
        .eq("id", insightId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intelligence-insights", tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ["intelligence-insights-unread-count", tenant?.id] });
    },
  });
}

// ─── Intelligence Digest ────────────────────────────────────────────────────

export function useLatestDigest() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id;

  return useQuery({
    queryKey: ["intelligence-digest", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("intelligence_digest")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("digest_type", "weekly")
        .order("period_end", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as IntelligenceDigest | null;
    },
    enabled: !!tenantId,
    staleTime: 300_000,
  });
}
