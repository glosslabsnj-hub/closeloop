import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { getReadinessVerb, getAutoBookSummary } from "@/data/industryTerminology";
import { supabase } from "@/integrations/supabase/client";
import { getIndustryRevenueConfig, type HeroIconName } from "@/config/industryRevenueConfig";
import { getLadderStep, mapLegacyToNewSku } from "@/config/pricing";
import { calculateROI, percentChange } from "@/lib/revenueUtils";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export interface ROIDashboardData {
  // Current month
  aiRevenueCents: number;
  entitiesCreated: number;
  totalCalls: number;
  conversionRate: number;
  subscriptionCostCents: number;
  roiMultiplier: number;

  // Previous month (for trends)
  previousMonth: {
    aiRevenueCents: number;
    entitiesCreated: number;
    totalCalls: number;
    conversionRate: number;
  } | null;

  // Trends (percentage change)
  trends: {
    revenue: number;
    entities: number;
    calls: number;
    conversion: number;
  };

  // Industry config for UI
  entityName: string;
  entityNameSingular: string;
  actionVerbPast: string;
  emptyStateMessage: string;
  emptyStateCta: string;
  successMessage: string;

  // Story-driven UI config
  storyTemplate: string;
  callsLabel: string;
  heroIcon: HeroIconName;
  celebratoryTone: boolean;
  emptyStateSteps: [string, string, string];
  emptyStateEncouragement: string;

  // State
  hasData: boolean;
}

// Mode-specific empty state configuration
interface ModeEmptyStateConfig {
  steps: [string, string, string];
  encouragement: string;
}

function getModeEmptyState(mode: string, autoSummary: string, readinessVerb: string): ModeEmptyStateConfig {
  const cap = readinessVerb.charAt(0).toUpperCase() + readinessVerb.slice(1);
  switch (mode) {
    case "service": return {
      steps: ["Add your services & pricing", "Connect your phone", `${cap} via AI`],
      encouragement: `Your AI is ready to ${readinessVerb} and answer questions 24/7.`,
    };
    case "dispatch": return {
      steps: ["Add service types & rates", "Connect your phone", "Dispatch jobs via AI calls"],
      encouragement: "Your AI is ready to dispatch jobs and provide ETAs around the clock.",
    };
    case "food": return {
      steps: ["Add your menu items", "Configure order settings", "Take orders via AI calls"],
      encouragement: "Your AI is ready to take orders, reservations, and answer menu questions.",
    };
    case "medical": return {
      steps: ["Add services & visit types", "Configure patient intake", "Schedule patients via AI"],
      encouragement: `Your AI is ready to ${autoSummary} and handle patient inquiries securely.`,
    };
    case "sales": return {
      steps: ["Add your inventory & pricing", "Connect your phone", "Qualify prospects via AI calls"],
      encouragement: "Your AI is ready to answer calls, qualify buyers, and schedule test drives 24/7.",
    };
    default: return {
      steps: ["Add your offerings", "Connect your phone", "Capture leads via AI calls"],
      encouragement: "Your AI is ready to answer calls and capture leads for your business.",
    };
  }
}

async function fetchMonthStats(tenantId: string, monthStart: string, monthEnd: string) {
  // Fetch AI-attributed entities for this month
  const { data: attributions, error: attrError } = await supabase
    .from("revenue_attributions" as any)
    .select("revenue_cents, status")
    .eq("tenant_id", tenantId)
    .eq("source_type", "ai_call")
    .gte("attributed_at", monthStart)
    .lte("attributed_at", monthEnd);

  if (attrError) throw attrError;

  // Fetch total calls for this month
  const { count: totalCalls, error: callsError } = await supabase
    .from("ai_call_sessions")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("started_at", monthStart)
    .lte("started_at", monthEnd);

  if (callsError) throw callsError;

  const items = (attributions as any[]) || [];
  const activeItems = items.filter((a) => a.status !== "cancelled");
  const aiRevenueCents = activeItems.reduce((sum: number, a: any) => sum + (a.revenue_cents || 0), 0);
  const entitiesCreated = activeItems.length;
  const calls = totalCalls || 0;
  const conversionRate = calls > 0 ? (entitiesCreated / calls) * 100 : 0;

  return { aiRevenueCents, entitiesCreated, totalCalls: calls, conversionRate };
}

export function useROIDashboard() {
  const { tenant, subscription } = useAuth();
  const { businessMode } = useTenantConfig();
  const { terminology, terms } = useIndustryContext();
  const config = getIndustryRevenueConfig(businessMode);

  // Get mode-specific empty state config with dynamic terminology
  const readinessVerb = getReadinessVerb(terminology.appointmentLabel);
  const autoSummary = getAutoBookSummary(terminology.appointmentLabel);
  const modeEmptyState = getModeEmptyState(businessMode, autoSummary, readinessVerb);

  const query = useQuery({
    queryKey: ["roi-dashboard", tenant?.id, businessMode],
    queryFn: async (): Promise<ROIDashboardData> => {
      if (!tenant?.id) throw new Error("No tenant");

      const now = new Date();
      const currentMonthStart = startOfMonth(now).toISOString();
      const currentMonthEnd = endOfMonth(now).toISOString();

      const prevMonth = subMonths(now, 1);
      const prevMonthStart = startOfMonth(prevMonth).toISOString();
      const prevMonthEnd = endOfMonth(prevMonth).toISOString();

      // Fetch current and previous month in parallel
      const [current, previous] = await Promise.all([
        fetchMonthStats(tenant.id, currentMonthStart, currentMonthEnd),
        fetchMonthStats(tenant.id, prevMonthStart, prevMonthEnd),
      ]);

      // Get subscription cost
      let subscriptionCostCents = 9900; // Default $99 (Growth plan)

      // Check for manual override
      const { data: revenueSettings } = await supabase
        .from("tenant_revenue_settings" as any)
        .select("subscription_cost_override_cents")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if ((revenueSettings as any)?.subscription_cost_override_cents) {
        subscriptionCostCents = (revenueSettings as any).subscription_cost_override_cents;
      } else if (subscription) {
        // Derive from plan_code
        const planCode = (subscription as any).plan_code;
        if (planCode) {
          const mappedSku = mapLegacyToNewSku(planCode);
          const step = getLadderStep(mappedSku);
          if (step && step.price > 0) {
            subscriptionCostCents = step.price * 100;
          }
        }
      }

      const roiMultiplier = calculateROI(current.aiRevenueCents, subscriptionCostCents);

      const hasPrevData = previous.totalCalls > 0;

      return {
        ...current,
        subscriptionCostCents,
        roiMultiplier,
        previousMonth: hasPrevData ? previous : null,
        trends: {
          revenue: hasPrevData ? percentChange(current.aiRevenueCents, previous.aiRevenueCents) : 0,
          entities: hasPrevData ? percentChange(current.entitiesCreated, previous.entitiesCreated) : 0,
          calls: hasPrevData ? percentChange(current.totalCalls, previous.totalCalls) : 0,
          conversion: hasPrevData ? percentChange(current.conversionRate, previous.conversionRate) : 0,
        },
        entityName: config.entityName,
        entityNameSingular: config.entityNameSingular,
        actionVerbPast: config.actionVerbPast,
        emptyStateMessage: config.emptyStateMessage,
        emptyStateCta: config.emptyStateCta,
        successMessage: config.successMessage,
        storyTemplate: config.storyTemplate,
        callsLabel: config.callsLabel,
        heroIcon: config.heroIcon,
        celebratoryTone: config.celebratoryTone,
        // Use mode-specific empty state config instead of generic config
        emptyStateSteps: modeEmptyState.steps,
        emptyStateEncouragement: modeEmptyState.encouragement,
        hasData: current.totalCalls > 0 || current.entitiesCreated > 0,
      };
    },
    enabled: !!tenant?.id,
    refetchInterval: 60000, // Refresh every minute
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
