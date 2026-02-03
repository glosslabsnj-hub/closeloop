import { useTenantConfig } from "@/hooks/useTenantConfig";
import { getTerminology, type IndustryTerms } from "@/lib/terminology";

/**
 * Hook to get industry-aware terminology based on the current tenant's business mode.
 * Use this to display contextually appropriate terms throughout the UI.
 *
 * @example
 * const terms = useTerminology();
 * <h1>{terms.bookingsPageTitle}</h1> // "Schedule" for service, "Orders" for food, etc.
 */
export function useTerminology(): IndustryTerms {
  const { businessMode } = useTenantConfig();
  return getTerminology(businessMode);
}
