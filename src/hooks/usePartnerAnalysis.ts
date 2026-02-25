/**
 * usePartnerAnalysis — React Query hook for AI-generated business analysis
 *
 * Fetches cached analysis from the partner-analysis edge function.
 * Supports manual refresh with rate limiting (3/day).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PartnerAnalysisResponse } from "@/types/partnerAnalysis";

async function fetchAnalysis(
  tenantId: string,
  forceRefresh: boolean
): Promise<PartnerAnalysisResponse> {
  const { data, error } = await supabase.functions.invoke("partner-analysis", {
    body: { tenant_id: tenantId, force_refresh: forceRefresh },
  });

  if (error) {
    throw new Error(error.message || "Failed to fetch analysis");
  }

  return data as PartnerAnalysisResponse;
}

export function usePartnerAnalysis() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id;
  const queryClient = useQueryClient();

  const queryKey = ["partner-analysis", tenantId];

  const query = useQuery<PartnerAnalysisResponse>({
    queryKey,
    queryFn: () => fetchAnalysis(tenantId!, false),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 min React Query cache
    retry: 1,
  });

  const refreshMutation = useMutation({
    mutationFn: () => fetchAnalysis(tenantId!, true),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      toast.success("Analysis refreshed");
    },
    onError: (err: Error) => {
      if (err.message?.includes("429") || err.message?.includes("refresh limit")) {
        toast.error("Daily refresh limit reached. Try again tomorrow.");
      } else {
        toast.error("Failed to refresh analysis");
      }
    },
  });

  const refreshCountToday = query.data?.refresh_count_today ?? 0;
  const maxRefreshes = query.data?.max_refreshes_per_day ?? 3;

  return {
    analysis: query.data?.analysis ?? null,
    isLoading: query.isLoading,
    isRefreshing: refreshMutation.isPending,
    generatedAt: query.data?.generated_at ?? null,
    isCached: query.data?.is_cached ?? false,
    error: query.error ?? null,
    refresh: () => refreshMutation.mutate(),
    canRefresh: refreshCountToday < maxRefreshes,
    refreshCountToday,
    maxRefreshes,
  };
}
