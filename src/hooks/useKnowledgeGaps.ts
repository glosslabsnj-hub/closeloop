import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface KnowledgeGap {
  id: string;
  tenant_id: string;
  gap_type: string;
  description: string;
  customer_question: string | null;
  ai_session_id: string | null;
  priority: number;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  occurrence_count: number;
  created_at: string;
}

export interface GapTypeAggregate {
  gap_type: string;
  total_count: number;
  unresolved_count: number;
  total_occurrences: number;
  highest_priority: number;
  latest_occurrence: string;
}

export interface TopGap {
  gap_type: string;
  description: string;
  occurrence_count: number;
  priority: number;
  created_at: string;
  latest_question: string | null;
}

export interface UseKnowledgeGapsResult {
  /** All unresolved gaps */
  unresolvedGaps: KnowledgeGap[];
  /** Aggregated counts by gap type */
  gapTypeAggregates: GapTypeAggregate[];
  /** Top 10 most frequent gaps */
  topGaps: TopGap[];
  /** Total unresolved count */
  totalUnresolvedCount: number;
  /** Total occurrence count (sum of all occurrence_count) */
  totalOccurrences: number;
  /** Loading state */
  loading: boolean;
  /** Error if any */
  error: Error | null;
  /** Refetch function */
  refetch: () => void;
}

/**
 * Hook to query and aggregate knowledge gaps data
 * Provides counts by type, top gaps, and deep link mappings
 */
export function useKnowledgeGaps(): UseKnowledgeGapsResult {
  const { tenant } = useAuth();

  const query = useQuery({
    queryKey: ["knowledge-gaps-aggregated", tenant?.id],
    queryFn: async (): Promise<{
      unresolvedGaps: KnowledgeGap[];
      gapTypeAggregates: GapTypeAggregate[];
      topGaps: TopGap[];
    }> => {
      if (!tenant?.id) {
        return {
          unresolvedGaps: [],
          gapTypeAggregates: [],
          topGaps: [],
        };
      }

      // Fetch all unresolved gaps
      const { data: unresolvedGaps, error: unresolvedError } = await supabase
        .from("knowledge_gaps")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("resolved", false)
        .order("created_at", { ascending: false });

      if (unresolvedError) {
        console.error("Error fetching unresolved gaps:", unresolvedError);
        throw unresolvedError;
      }

      const gaps = (unresolvedGaps || []) as KnowledgeGap[];

      // Aggregate by gap_type
      const typeMap = new Map<string, GapTypeAggregate>();

      for (const gap of gaps) {
        const existing = typeMap.get(gap.gap_type);
        if (existing) {
          existing.total_count += 1;
          existing.unresolved_count += 1;
          existing.total_occurrences += gap.occurrence_count;
          existing.highest_priority = Math.max(existing.highest_priority, gap.priority);
          if (new Date(gap.created_at) > new Date(existing.latest_occurrence)) {
            existing.latest_occurrence = gap.created_at;
          }
        } else {
          typeMap.set(gap.gap_type, {
            gap_type: gap.gap_type,
            total_count: 1,
            unresolved_count: 1,
            total_occurrences: gap.occurrence_count,
            highest_priority: gap.priority,
            latest_occurrence: gap.created_at,
          });
        }
      }

      const gapTypeAggregates = Array.from(typeMap.values()).sort(
        (a, b) => b.total_occurrences - a.total_occurrences
      );

      // Get top gaps by occurrence_count
      const topGaps: TopGap[] = gaps
        .sort((a, b) => {
          // Sort by priority first (higher is more important), then by occurrence_count
          if (b.priority !== a.priority) {
            return b.priority - a.priority;
          }
          return b.occurrence_count - a.occurrence_count;
        })
        .slice(0, 10)
        .map((gap) => ({
          gap_type: gap.gap_type,
          description: gap.description,
          occurrence_count: gap.occurrence_count,
          priority: gap.priority,
          created_at: gap.created_at,
          latest_question: gap.customer_question,
        }));

      return {
        unresolvedGaps: gaps,
        gapTypeAggregates,
        topGaps,
      };
    },
    enabled: !!tenant?.id,
    staleTime: 30_000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  const unresolvedGaps = query.data?.unresolvedGaps || [];
  const totalUnresolvedCount = unresolvedGaps.length;
  const totalOccurrences = unresolvedGaps.reduce(
    (sum, gap) => sum + gap.occurrence_count,
    0
  );

  return {
    unresolvedGaps,
    gapTypeAggregates: query.data?.gapTypeAggregates || [],
    topGaps: query.data?.topGaps || [],
    totalUnresolvedCount,
    totalOccurrences,
    loading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

/**
 * Map gap types to human-readable labels
 */
export function getGapTypeLabel(gapType: string): string {
  const labels: Record<string, string> = {
    missing_policy: "Missing Policy",
    missing_pricing: "Missing Pricing",
    missing_service_area: "Service Area Undefined",
    unanswered_question: "Unanswered Question",
    missing_hours: "Missing Hours",
    missing_faq: "Missing FAQ",
    other: "Other",
  };
  return labels[gapType] || gapType;
}

/**
 * Map gap types to deep link fix pages
 */
export function getGapTypeDeepLink(gapType: string): string {
  const links: Record<string, string> = {
    missing_policy: "/app/business-brain?section=training&item=policies",
    missing_pricing: "/app/business-brain?section=services&item=catalog",
    missing_service_area: "/app/business-brain?section=operations&item=coverage",
    unanswered_question: "/app/business-brain?section=training&item=faqs",
    missing_hours: "/app/business-brain?section=about&item=business-hours",
    missing_faq: "/app/business-brain?section=training&item=faqs",
    other: "/app/business-brain?section=training",
  };
  return links[gapType] || "/app/business-brain";
}

/**
 * Get action label for gap type (what to do to fix it)
 */
export function getGapTypeAction(gapType: string): string {
  const actions: Record<string, string> = {
    missing_policy: "Add Policies",
    missing_pricing: "Add Pricing",
    missing_service_area: "Define Service Area",
    unanswered_question: "Add FAQ",
    missing_hours: "Set Hours",
    missing_faq: "Add FAQs",
    other: "Review",
  };
  return actions[gapType] || "Fix";
}
