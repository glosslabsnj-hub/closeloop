import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getLadderStep,
  calculateOverageCost,
  getNextUpgrade,
  type PlanSku,
  type PlanLadderStep,
} from "@/config/pricing";
import type { SubscriptionUsage, Subscription } from "@/types/database";

export interface UsageData {
  voiceMinutesUsed: number;
  smsSegmentsUsed: number;
  includedMinutes: number | null;
  includedSmsSegments: number | null;
  overageMinuteRate: number | null;
  overageSmsRate: number;
  projectedVoiceOverage: number;
  projectedSmsOverage: number;
  billingPeriodStart: Date | null;
  billingPeriodEnd: Date | null;
  voicePercentUsed: number;
  smsPercentUsed: number;
}

interface UseUsageResult {
  usage: UsageData | null;
  loading: boolean;
  error: string | null;
  nextUpgrade: PlanLadderStep | null;
  refetch: () => Promise<void>;
}

export function useUsage(tenantId: string | null, planSku: PlanSku | null): UseUsageResult {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!tenantId) {
      setUsage(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch current billing period usage
      const now = new Date().toISOString();
      const { data: usageData, error: usageError } = await supabase
        .from("subscription_usage")
        .select("*")
        .eq("tenant_id", tenantId)
        .lte("billing_period_start", now)
        .gte("billing_period_end", now)
        .maybeSingle();

      if (usageError) throw usageError;

      // Fetch subscription for limits
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (subError) throw subError;

      // Get plan details from config if we have a SKU
      const step = planSku ? getLadderStep(planSku) : null;

      // Use subscription data or fall back to plan config
      const includedMinutes = (subData as any)?.included_minutes ?? step?.includedMinutes ?? null;
      const includedSmsSegments = (subData as any)?.included_sms_segments ?? step?.includedSmsSegments ?? null;
      const overageMinuteRateCents = (subData as any)?.overage_minute_rate_cents;
      const overageSmsRateCents = (subData as any)?.overage_sms_rate_cents;

      const overageMinuteRate = overageMinuteRateCents 
        ? overageMinuteRateCents / 100 
        : step?.overageMinuteRate ?? null;
      const overageSmsRate = overageSmsRateCents 
        ? overageSmsRateCents / 100 
        : step?.overageSmsRate ?? 0.03;

      const voiceMinutesUsed = usageData?.voice_minutes_used ?? 0;
      const smsSegmentsUsed = usageData?.sms_segments_used ?? 0;

      const projectedVoiceOverage = includedMinutes !== null && overageMinuteRate !== null
        ? calculateOverageCost(voiceMinutesUsed, includedMinutes, overageMinuteRate)
        : 0;

      const projectedSmsOverage = includedSmsSegments !== null
        ? calculateOverageCost(smsSegmentsUsed, includedSmsSegments, overageSmsRate)
        : 0;

      const voicePercentUsed = includedMinutes 
        ? Math.min(100, Math.round((voiceMinutesUsed / includedMinutes) * 100))
        : 0;
      const smsPercentUsed = includedSmsSegments 
        ? Math.min(100, Math.round((smsSegmentsUsed / includedSmsSegments) * 100))
        : 0;

      setUsage({
        voiceMinutesUsed,
        smsSegmentsUsed,
        includedMinutes,
        includedSmsSegments,
        overageMinuteRate,
        overageSmsRate,
        projectedVoiceOverage,
        projectedSmsOverage,
        billingPeriodStart: usageData?.billing_period_start 
          ? new Date(usageData.billing_period_start) 
          : null,
        billingPeriodEnd: usageData?.billing_period_end 
          ? new Date(usageData.billing_period_end) 
          : null,
        voicePercentUsed,
        smsPercentUsed,
      });
    } catch (err: any) {
      console.error("Failed to fetch usage data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, planSku]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const nextUpgrade = planSku ? getNextUpgrade(planSku) : null;

  return {
    usage,
    loading,
    error,
    nextUpgrade,
    refetch: fetchUsage,
  };
}
