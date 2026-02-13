/**
 * Centralized Brain query invalidation.
 *
 * Call after ANY Business Brain save to ensure completion percentages,
 * readiness scores, and capability flags all refresh immediately.
 */
import type { QueryClient } from "@tanstack/react-query";

export function invalidateBrainQueries(queryClient: QueryClient, tenantId?: string) {
  queryClient.invalidateQueries({ queryKey: ["business-context"] });
  queryClient.invalidateQueries({ queryKey: ["business-capabilities", tenantId] });
  queryClient.invalidateQueries({ queryKey: ["ai-readiness-v2", tenantId] });
  queryClient.invalidateQueries({ queryKey: ["brain-summaries-tenant"] });
  queryClient.invalidateQueries({ queryKey: ["category-completion"] });
}
