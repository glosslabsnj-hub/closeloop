import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export interface LeadRecoveryStats {
  currentMonth: {
    leadsRecovered: number;
    recoveredRevenueCents: number;
    campaignsStarted: number;
    recoveryRate: number;
  };
  previousMonth: {
    leadsRecovered: number;
    recoveredRevenueCents: number;
  };
  activeCampaigns: number;
  awaitingResponse: number;
  isEnabled: boolean;
}

export function useLeadRecoveryDashboard(period: "month" | "week" = "month") {
  const { tenant } = useAuth();
  const tenantId = tenant?.id;

  return useQuery({
    queryKey: ["lead-recovery-dashboard", tenantId, period],
    queryFn: async (): Promise<LeadRecoveryStats> => {
      if (!tenantId) {
        return getEmptyStats();
      }

      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      const previousMonthStart = startOfMonth(subMonths(now, 1));
      const previousMonthEnd = endOfMonth(subMonths(now, 1));

      // Check if recovery is enabled
      const { data: settings } = await supabase
        .from("lead_recovery_settings")
        .select("recovery_enabled")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      const isEnabled = settings?.recovery_enabled ?? false;

      // Converted campaigns this month
      const { data: convertedThisMonth } = await supabase
        .from("lead_recovery_campaigns")
        .select("id, recovered_value_cents")
        .eq("tenant_id", tenantId)
        .eq("status", "converted")
        .gte("converted_at", currentMonthStart.toISOString())
        .lte("converted_at", currentMonthEnd.toISOString());

      // Campaigns started this month
      const { data: startedThisMonth } = await supabase
        .from("lead_recovery_campaigns")
        .select("id")
        .eq("tenant_id", tenantId)
        .gte("created_at", currentMonthStart.toISOString())
        .lte("created_at", currentMonthEnd.toISOString());

      // Converted campaigns previous month
      const { data: convertedLastMonth } = await supabase
        .from("lead_recovery_campaigns")
        .select("id, recovered_value_cents")
        .eq("tenant_id", tenantId)
        .eq("status", "converted")
        .gte("converted_at", previousMonthStart.toISOString())
        .lte("converted_at", previousMonthEnd.toISOString());

      // Active campaigns
      const { data: activeCampaigns } = await supabase
        .from("lead_recovery_campaigns")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("status", "active");

      // Paused (awaiting response) campaigns
      const { data: pausedCampaigns } = await supabase
        .from("lead_recovery_campaigns")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("status", "paused");

      // Calculate stats
      const recoveredThisMonth = convertedThisMonth?.length || 0;
      const recoveredRevenueThisMonth = (convertedThisMonth || []).reduce(
        (sum, c) => sum + (c.recovered_value_cents || 0),
        0
      );
      const campaignsStarted = startedThisMonth?.length || 0;
      const recoveryRate =
        campaignsStarted > 0 ? (recoveredThisMonth / campaignsStarted) * 100 : 0;

      const recoveredLastMonth = convertedLastMonth?.length || 0;
      const recoveredRevenueLastMonth = (convertedLastMonth || []).reduce(
        (sum, c) => sum + (c.recovered_value_cents || 0),
        0
      );

      return {
        currentMonth: {
          leadsRecovered: recoveredThisMonth,
          recoveredRevenueCents: recoveredRevenueThisMonth,
          campaignsStarted,
          recoveryRate,
        },
        previousMonth: {
          leadsRecovered: recoveredLastMonth,
          recoveredRevenueCents: recoveredRevenueLastMonth,
        },
        activeCampaigns: activeCampaigns?.length || 0,
        awaitingResponse: pausedCampaigns?.length || 0,
        isEnabled,
      };
    },
    enabled: !!tenantId,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

function getEmptyStats(): LeadRecoveryStats {
  return {
    currentMonth: {
      leadsRecovered: 0,
      recoveredRevenueCents: 0,
      campaignsStarted: 0,
      recoveryRate: 0,
    },
    previousMonth: {
      leadsRecovered: 0,
      recoveredRevenueCents: 0,
    },
    activeCampaigns: 0,
    awaitingResponse: 0,
    isEnabled: false,
  };
}
