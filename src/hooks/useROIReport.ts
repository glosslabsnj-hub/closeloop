import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { supabase } from "@/integrations/supabase/client";
import { getIndustryRevenueConfig, type HeroIconName } from "@/config/industryRevenueConfig";
import { getLadderStep, mapLegacyToNewSku } from "@/config/pricing";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export type DateRangeOption = "this_month" | "last_month" | "last_3_months" | "last_6_months";

export interface MonthlyDataPoint {
  month: string; // "2026-02"
  monthLabel: string; // "Feb"
  aiRevenueCents: number;
  manualRevenueCents: number;
  totalRevenueCents: number;
  entitiesCreated: number;
  totalCalls: number;
  conversionRate: number;
}

export interface ConversionFunnel {
  totalCalls: number;
  callsWithOutcome: number;
  entitiesCreated: number;
  entitiesCompleted: number;
}

export interface ROIReportData {
  // Summary for selected range
  aiRevenueCents: number;
  totalRevenueCents: number;
  totalCalls: number;
  entitiesCreated: number;
  conversionRate: number;
  roiMultiplier: number;
  subscriptionCostCents: number;

  // Lead recovery stats
  leadsRecovered: number;
  recoveredRevenueCents: number;
  recoveryRate: number;
  totalRecoveryCampaigns: number;

  // Trends vs previous period
  trends: {
    revenue: number;
    calls: number;
    entities: number;
    conversion: number;
  };

  // Chart data
  monthlyData: MonthlyDataPoint[];
  revenueBySource: { ai: number; manual: number; recovery: number };
  conversionFunnel: ConversionFunnel;

  // Config
  entityName: string;
  entityNameSingular: string;
  actionVerbPast: string;

  // Story-driven UI config
  storyTemplate: string;
  callsLabel: string;
  heroIcon: HeroIconName;
  celebratoryTone: boolean;
  emptyStateSteps: [string, string, string];
  emptyStateEncouragement: string;
  funnelLabels: [string, string, string, string];
}

function getMonthRange(option: DateRangeOption): { start: Date; end: Date; months: number } {
  const now = new Date();
  const end = endOfMonth(now);

  switch (option) {
    case "last_month": {
      const prev = subMonths(now, 1);
      return { start: startOfMonth(prev), end: endOfMonth(prev), months: 1 };
    }
    case "last_3_months":
      return { start: startOfMonth(subMonths(now, 2)), end, months: 3 };
    case "last_6_months":
      return { start: startOfMonth(subMonths(now, 5)), end, months: 6 };
    case "this_month":
    default:
      return { start: startOfMonth(now), end, months: 1 };
  }
}

export function useROIReport(dateRange: DateRangeOption = "this_month") {
  const { tenant, subscription } = useAuth();
  const { businessMode } = useTenantConfig();
  const config = getIndustryRevenueConfig(businessMode);

  const query = useQuery({
    queryKey: ["roi-report", tenant?.id, dateRange, businessMode],
    queryFn: async (): Promise<ROIReportData> => {
      if (!tenant?.id) throw new Error("No tenant");

      const { start, end, months } = getMonthRange(dateRange);
      const startStr = start.toISOString();
      const endStr = end.toISOString();

      // Fetch all attributions in range
      const { data: attributions, error: attrErr } = await supabase
        .from("revenue_attributions" as any)
        .select("revenue_cents, source_type, status, attributed_at")
        .eq("tenant_id", tenant.id)
        .gte("attributed_at", startStr)
        .lte("attributed_at", endStr);

      if (attrErr) throw attrErr;

      // Fetch all calls in range
      const { data: sessions, error: sessErr } = await supabase
        .from("ai_call_sessions")
        .select("started_at, outcome")
        .eq("tenant_id", tenant.id)
        .gte("started_at", startStr)
        .lte("started_at", endStr);

      if (sessErr) throw sessErr;

      const items = (attributions as any[]) || [];
      const calls = sessions || [];

      // Active (non-cancelled) attributions
      const active = items.filter((a) => a.status !== "cancelled");
      const aiItems = active.filter((a) => a.source_type === "ai_call");
      const recoveryItems = active.filter((a) => a.source_type === "lead_recovery");
      const manualItems = active.filter((a) => a.source_type !== "ai_call" && a.source_type !== "lead_recovery");

      const aiRevenueCents = aiItems.reduce((s: number, a: any) => s + (a.revenue_cents || 0), 0);
      const recoveryRevenueCents = recoveryItems.reduce((s: number, a: any) => s + (a.revenue_cents || 0), 0);
      const manualRevenueCents = manualItems.reduce((s: number, a: any) => s + (a.revenue_cents || 0), 0);
      const totalRevenueCents = aiRevenueCents + recoveryRevenueCents + manualRevenueCents;

      const totalCalls = calls.length;
      const callsWithOutcome = calls.filter((c) => c.outcome && c.outcome !== "lost").length;
      const entitiesCreated = aiItems.length;
      const entitiesCompleted = aiItems.filter((a) => a.status === "completed").length;
      const conversionRate = totalCalls > 0 ? (entitiesCreated / totalCalls) * 100 : 0;

      // Fetch lead recovery campaign stats
      const { data: recoveryCampaigns } = await supabase
        .from("lead_recovery_campaigns")
        .select("id, recovered_value_cents, status")
        .eq("tenant_id", tenant.id)
        .gte("created_at", startStr)
        .lte("created_at", endStr);

      const allCampaigns = (recoveryCampaigns as any[]) || [];
      const convertedCampaigns = allCampaigns.filter((c) => c.status === "converted");
      const leadsRecovered = convertedCampaigns.length;
      const recoveredRevenueCentsFromCampaigns = convertedCampaigns.reduce(
        (s: number, c: any) => s + (c.recovered_value_cents || 0),
        0
      );
      const totalRecoveryCampaigns = allCampaigns.length;
      const recoveryRate = totalRecoveryCampaigns > 0 ? (leadsRecovered / totalRecoveryCampaigns) * 100 : 0;

      // Subscription cost
      let subscriptionCostCents = 24900;
      const { data: revSettings } = await supabase
        .from("tenant_revenue_settings" as any)
        .select("subscription_cost_override_cents")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if ((revSettings as any)?.subscription_cost_override_cents) {
        subscriptionCostCents = (revSettings as any).subscription_cost_override_cents;
      } else if (subscription) {
        const planCode = (subscription as any).plan_code;
        if (planCode) {
          const step = getLadderStep(mapLegacyToNewSku(planCode));
          if (step && step.price > 0) subscriptionCostCents = step.price * 100;
        }
      }

      const totalCostCents = subscriptionCostCents * months;
      const roiMultiplier = totalCostCents > 0 ? Math.round((aiRevenueCents / totalCostCents) * 10) / 10 : 0;

      // Build monthly data points
      const monthlyData: MonthlyDataPoint[] = [];
      for (let i = months - 1; i >= 0; i--) {
        const m = subMonths(new Date(), i);
        const mStart = startOfMonth(m);
        const mEnd = endOfMonth(m);
        const mKey = format(mStart, "yyyy-MM");
        const mLabel = format(mStart, "MMM");

        const mAttr = active.filter((a) => {
          const d = new Date(a.attributed_at);
          return d >= mStart && d <= mEnd;
        });
        const mAi = mAttr.filter((a) => a.source_type === "ai_call");
        const mManual = mAttr.filter((a) => a.source_type !== "ai_call");
        const mCalls = calls.filter((c) => {
          const d = new Date(c.started_at);
          return d >= mStart && d <= mEnd;
        });

        const aiRev = mAi.reduce((s: number, a: any) => s + (a.revenue_cents || 0), 0);
        const manualRev = mManual.reduce((s: number, a: any) => s + (a.revenue_cents || 0), 0);

        monthlyData.push({
          month: mKey,
          monthLabel: mLabel,
          aiRevenueCents: aiRev,
          manualRevenueCents: manualRev,
          totalRevenueCents: aiRev + manualRev,
          entitiesCreated: mAi.length,
          totalCalls: mCalls.length,
          conversionRate: mCalls.length > 0 ? (mAi.length / mCalls.length) * 100 : 0,
        });
      }

      // Trends: compare first half to second half of range, or current vs previous period
      let trends = { revenue: 0, calls: 0, entities: 0, conversion: 0 };
      if (months === 1 && dateRange === "this_month") {
        // Compare to last month
        const prevStart = startOfMonth(subMonths(new Date(), 1)).toISOString();
        const prevEnd = endOfMonth(subMonths(new Date(), 1)).toISOString();

        const { data: prevAttr } = await supabase
          .from("revenue_attributions" as any)
          .select("revenue_cents, status")
          .eq("tenant_id", tenant.id)
          .eq("source_type", "ai_call")
          .gte("attributed_at", prevStart)
          .lte("attributed_at", prevEnd);

        const { count: prevCalls } = await supabase
          .from("ai_call_sessions")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .gte("started_at", prevStart)
          .lte("started_at", prevEnd);

        const prevActive = ((prevAttr as any[]) || []).filter((a) => a.status !== "cancelled");
        const prevRev = prevActive.reduce((s: number, a: any) => s + (a.revenue_cents || 0), 0);
        const prevEntities = prevActive.length;
        const pc = prevCalls || 0;
        const prevConv = pc > 0 ? (prevEntities / pc) * 100 : 0;

        const pctChange = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

        trends = {
          revenue: pctChange(aiRevenueCents, prevRev),
          calls: pctChange(totalCalls, pc),
          entities: pctChange(entitiesCreated, prevEntities),
          conversion: pctChange(conversionRate, prevConv),
        };
      }

      return {
        aiRevenueCents,
        totalRevenueCents,
        totalCalls,
        entitiesCreated,
        conversionRate,
        roiMultiplier,
        subscriptionCostCents: totalCostCents,

        // Lead recovery stats
        leadsRecovered,
        recoveredRevenueCents: recoveredRevenueCentsFromCampaigns,
        recoveryRate,
        totalRecoveryCampaigns,

        trends,
        monthlyData,
        revenueBySource: { ai: aiRevenueCents, manual: manualRevenueCents, recovery: recoveryRevenueCents },
        conversionFunnel: {
          totalCalls,
          callsWithOutcome,
          entitiesCreated,
          entitiesCompleted,
        },
        entityName: config.entityName,
        entityNameSingular: config.entityNameSingular,
        actionVerbPast: config.actionVerbPast,
        storyTemplate: config.storyTemplate,
        callsLabel: config.callsLabel,
        heroIcon: config.heroIcon,
        celebratoryTone: config.celebratoryTone,
        emptyStateSteps: config.emptyStateSteps,
        emptyStateEncouragement: config.emptyStateEncouragement,
        funnelLabels: config.funnelLabels,
      };
    },
    enabled: !!tenant?.id,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
