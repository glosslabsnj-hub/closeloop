import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getLadderStep,
  hasVoiceFeature,
  hasSmsFeature,
  type PlanSku,
} from "@/config/pricing";
import type { Subscription, AssistantSettings } from "@/types/database";

interface UseSubscriptionResult {
  subscription: Subscription | null;
  assistantSettings: AssistantSettings | null;
  loading: boolean;
  error: string | null;
  hasActiveSubscription: boolean;
  canAccessApp: boolean;
  planSku: PlanSku | null;
  hasVoice: boolean;
  hasSms: boolean;
  createSubscription: (sku: PlanSku) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useSubscription(tenantId: string | null): UseSubscriptionResult {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [assistantSettings, setAssistantSettings] = useState<AssistantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!tenantId) {
      setSubscription(null);
      setAssistantSettings(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch subscription
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (subError) throw subError;
      setSubscription(subData);

      // Fetch assistant settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("assistant_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (settingsError) throw settingsError;
      setAssistantSettings(settingsData);
    } catch (err: any) {
      console.error("Failed to fetch subscription data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasActiveSubscription = subscription?.status === "active";
  
  // Users can access app if they have active subscription
  const canAccessApp = hasActiveSubscription;

  // Get the plan SKU (handle both new SKUs and legacy plan codes)
  const planSku = (subscription?.plan_code as PlanSku) || null;
  const hasVoice = hasVoiceFeature(planSku);
  const hasSms = hasSmsFeature(planSku);

  const createSubscription = async (sku: PlanSku) => {
    if (!tenantId) throw new Error("No tenant ID");

    // Get the ladder step details for usage limits
    const step = getLadderStep(sku);
    if (!step) throw new Error("Invalid plan SKU");

    // Create subscription with active status (requires payment)
    const { error: subError } = await supabase
      .from("subscriptions")
      .insert({
        tenant_id: tenantId,
        plan_code: sku,
        status: "active",
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        included_minutes: step.includedMinutes,
        included_sms_segments: step.includedSmsSegments,
        overage_minute_rate_cents: step.overageMinuteRate ? Math.round(step.overageMinuteRate * 100) : null,
        overage_sms_rate_cents: Math.round(step.overageSmsRate * 100),
      });

    if (subError) throw subError;

    // Initialize assistant settings based on SKU
    const { error: settingsError } = await supabase.rpc("initialize_assistant_settings", {
      _tenant_id: tenantId,
      _plan_code: sku,
    });

    if (settingsError) throw settingsError;

    // Initialize usage tracking for this billing period
    const periodStart = new Date();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    await supabase
      .from("subscription_usage")
      .insert({
        tenant_id: tenantId,
        billing_period_start: periodStart.toISOString(),
        billing_period_end: periodEnd.toISOString(),
        voice_minutes_used: 0,
        sms_segments_used: 0,
      });

    // Provision Twilio number for voice/both plans
    if (hasVoiceFeature(sku)) {
      try {
        console.log("Provisioning Twilio number for voice plan...");
        const { data, error: provisionError } = await supabase.functions.invoke("provision-twilio-number", {
          body: { tenant_id: tenantId, number_type: "local" },
        });
        
        if (provisionError) {
          console.error("Failed to provision number:", provisionError);
        } else if (data?.success) {
          console.log("Provisioned number:", data.phone_number);
        } else {
          console.error("Provisioning failed:", data?.error);
        }
      } catch (err) {
        console.error("Error calling provision function:", err);
        // Don't fail subscription creation if provisioning fails
      }
    }

    // Mark onboarding as complete
    await supabase
      .from("tenants")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", tenantId);

    await fetchData();
  };

  return {
    subscription,
    assistantSettings,
    loading,
    error,
    hasActiveSubscription,
    canAccessApp,
    planSku,
    hasVoice,
    hasSms,
    createSubscription,
    refetch: fetchData,
  };
}
