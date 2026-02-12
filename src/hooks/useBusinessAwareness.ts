import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIndustryContext, type IndustryContext } from "@/hooks/useIndustryContext";
import { useCapabilities, type Capabilities } from "@/hooks/useCapabilities";
import { useServices } from "@/hooks/useServices";
import { useKnowledgeGaps, type TopGap } from "@/hooks/useKnowledgeGaps";
import { useConversionMetrics } from "@/hooks/useIntelligence";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";
import type { IndustryTerms } from "@/lib/terminology";
import type { IndustryTerminology } from "@/data/industryTerminology";
import type { BusinessMode } from "@/hooks/useTenantConfig";

export type ComplexityTier = "simple" | "standard" | "complex";

export interface BusinessAwareness {
  // From useIndustryContext
  slug: string | null;
  category: string | null;
  mode: BusinessMode;
  terminology: IndustryTerminology;
  terms: IndustryTerms;

  // From useCapabilities
  caps: Capabilities;

  // From useServices
  serviceCount: number;
  serviceNames: string[];
  servicesWithoutPrices: string[];

  // From useKnowledgeGaps
  gapCount: number;
  topGaps: TopGap[];

  // From useConversionMetrics(30)
  recentCallCount: number;
  conversionRate: number;
  hangupRate: number;

  // From useCalendarConnections
  hasCalendar: boolean;

  // From useAuth
  businessName: string;
  aiBehaviorMode: string;

  // Lightweight query
  staffCount: number;

  // Computed
  complexityTier: ComplexityTier;
  isNewBusiness: boolean;
  hasDataForAnalysis: boolean;
  missingCritical: string[];

  // FAQ count (from knowledge gaps query context)
  faqCount: number;
}

function computeComplexityTier(
  staffCount: number,
  serviceCount: number,
  caps: Capabilities,
): ComplexityTier {
  if (
    staffCount > 5 ||
    caps.hasFleetManagement ||
    caps.hasImpoundLot ||
    serviceCount > 30
  ) {
    return "complex";
  }
  if (staffCount <= 1 && serviceCount < 10 && !caps.hasFleetManagement) {
    return "simple";
  }
  return "standard";
}

/**
 * Composes existing hooks into a single business-aware context.
 * No new DB queries except a lightweight staff count.
 */
export function useBusinessAwareness(): BusinessAwareness {
  const { tenant, assistantSettings } = useAuth();
  const industry = useIndustryContext();
  const caps = useCapabilities();
  const { services } = useServices();
  const { topGaps, totalUnresolvedCount } = useKnowledgeGaps();
  const { metrics } = useConversionMetrics(30);
  const { hasConnectedCalendar } = useCalendarConnections();

  // One lightweight query: staff count
  const { data: staffCount = 0 } = useQuery({
    queryKey: ["staff-count", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count, error } = await supabase
        .from("tenant_users")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!tenant?.id,
    staleTime: 300_000, // 5 minutes — staff rarely changes
  });

  // FAQ count (lightweight, separate from knowledge gaps)
  const { data: faqCount = 0 } = useQuery({
    queryKey: ["faq-count", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count, error } = await supabase
        .from("business_faqs")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!tenant?.id,
    staleTime: 60_000,
  });

  return useMemo(() => {
    const activeServices = (services || []).filter((s) => s.is_active !== false);
    const serviceNames = activeServices.slice(0, 10).map((s) => s.name);
    const servicesWithoutPrices = activeServices
      .filter((s) => !s.price_amount && s.price_type !== "quote_only")
      .map((s) => s.name);

    const complexityTier = computeComplexityTier(staffCount, activeServices.length, caps);

    const missingCritical: string[] = [];
    if (activeServices.length === 0 && !caps.isFoodBusiness) missingCritical.push("no_services");
    if (faqCount === 0) missingCritical.push("no_faqs");
    if (!hasConnectedCalendar && caps.hasBooking) missingCritical.push("no_calendar");
    if (!tenant?.hours_json || Object.keys((tenant.hours_json as Record<string, unknown>) || {}).length === 0) {
      missingCritical.push("no_hours");
    }

    return {
      // Industry context
      slug: industry.slug,
      category: industry.category,
      mode: industry.mode,
      terminology: industry.terminology,
      terms: industry.terms,

      // Capabilities
      caps,

      // Services
      serviceCount: activeServices.length,
      serviceNames,
      servicesWithoutPrices,

      // Knowledge gaps
      gapCount: totalUnresolvedCount,
      topGaps: topGaps.slice(0, 5),

      // Conversion metrics (30 days)
      recentCallCount: metrics.totalCalls,
      conversionRate: metrics.conversionRate,
      hangupRate: metrics.hangupRate,

      // Calendar
      hasCalendar: hasConnectedCalendar,

      // Auth/tenant
      businessName: (tenant as any)?.business_name || tenant?.name || "",
      aiBehaviorMode: (assistantSettings as Record<string, unknown>)?.ai_booking_mode as string || "full_service",

      // Staff
      staffCount,

      // Computed
      complexityTier,
      isNewBusiness: metrics.totalCalls < 5,
      hasDataForAnalysis: metrics.totalCalls >= 10,
      missingCritical,

      // FAQ count
      faqCount,
    };
  }, [
    services,
    caps,
    topGaps,
    totalUnresolvedCount,
    metrics,
    hasConnectedCalendar,
    tenant?.id,
    (tenant as any)?.business_name,
    tenant?.hours_json,
    assistantSettings,
    industry,
    staffCount,
    faqCount,
  ]);
}
