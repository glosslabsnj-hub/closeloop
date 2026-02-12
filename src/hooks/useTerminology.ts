import { useTenantConfig } from "@/hooks/useTenantConfig";
import { getTerminology, type IndustryTerms } from "@/lib/terminology";

/**
 * @deprecated Use `useIndustryContext()` from `@/hooks/useIndustryContext` instead.
 * It provides the same `terms` plus industry-aware config, terminology, and slug.
 *
 * Migration: `const terms = useTerminology()` → `const { terms } = useIndustryContext()`
 */
export function useTerminology(): IndustryTerms {
  const { businessMode } = useTenantConfig();
  return getTerminology(businessMode);
}
