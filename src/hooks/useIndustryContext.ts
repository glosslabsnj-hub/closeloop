import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig, type BusinessMode } from "@/hooks/useTenantConfig";
import {
  getIndustryBySlug,
  type IndustryCatalogEntry,
  type IndustryCategory,
} from "@/data/industryCatalog";
import {
  getIndustryTerminology,
  type IndustryTerminology,
} from "@/data/industryTerminology";
import { getTerminology, type IndustryTerms } from "@/lib/terminology";
import {
  getIndustryBrainConfig,
  type IndustryBrainConfig,
} from "@/config/industryBrainConfig";

export interface IndustryContext {
  /** Industry slug from tenant (e.g. "hair-salon", "towing") or null */
  slug: string | null;
  /** Resolved category (e.g. "beauty_wellness", "dispatch_logistics") or null */
  category: IndustryCategory | null;
  /** Business mode — always resolved, falls back to "service" */
  mode: BusinessMode;
  /** Rich 29-field Brain terminology (mode → category → slug resolution) */
  terminology: IndustryTerminology;
  /** Simpler UI-level terms (booking/customer/service labels) */
  terms: IndustryTerms;
  /** Full catalog entry if slug matched, otherwise null */
  catalog: IndustryCatalogEntry | null;
  /** Brain, pricing, inbox, dashboard, and priority configuration */
  config: IndustryBrainConfig;
}

/**
 * Unified hook for all industry-aware presentation logic.
 *
 * Reads `tenant.industry` (slug) from AuthContext, resolves it through
 * the industry catalog, and computes terminology + configuration using
 * the 3-tier hierarchy: mode → category → slug.
 *
 * Falls back gracefully when no industry slug is set.
 */
export function useIndustryContext(): IndustryContext {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();

  return useMemo(() => {
    const slug = (tenant?.industry as string) || null;
    const catalogEntry = slug ? getIndustryBySlug(slug) : null;
    const category = catalogEntry?.category ?? null;
    const mode = catalogEntry?.businessMode ?? businessMode;

    const terminology = getIndustryTerminology(mode, category ?? undefined, slug ?? undefined);
    const terms = getTerminology(mode);
    const config = getIndustryBrainConfig(mode, category ?? undefined, slug ?? undefined);

    return {
      slug,
      category,
      mode,
      terminology,
      terms,
      catalog: catalogEntry ?? null,
      config,
    };
  }, [tenant?.id, tenant?.industry, tenant?.business_mode, businessMode]);
}
