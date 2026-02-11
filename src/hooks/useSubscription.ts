import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getLadderStep,
  hasVoiceFeature,
  hasSmsFeature,
  mapLegacyToNewSku,
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
  createSubscription: (sku: PlanSku, additionalLocations?: number) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useSubscription(tenantId: string | null, isSuperAdmin: boolean = false): UseSubscriptionResult {
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
  const rawPlanCode = subscription?.plan_code || null;
  const planSku = rawPlanCode ? mapLegacyToNewSku(rawPlanCode) : null;
  const hasVoice = hasVoiceFeature(planSku);
  const hasSms = hasSmsFeature(planSku);

  const createSubscription = async (sku: PlanSku, additionalLocations: number = 0) => {
    if (!tenantId) throw new Error("No tenant ID");

    // Get the ladder step details for usage limits
    const step = getLadderStep(sku);
    if (!step) throw new Error("Invalid plan SKU");

    // Check for existing subscription first
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (existingSub) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          plan_code: sku as string, // Cast to string for DB compatibility
          status: "active",
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          included_minutes: step.includedMinutes,
          included_sms_segments: step.includedSmsSegments,
          overage_minute_rate_cents: step.overageMinuteRate ? Math.round(step.overageMinuteRate * 100) : null,
          overage_sms_rate_cents: Math.round((step.overageSmsRate || 0) * 100),
        } as any)
        .eq("id", existingSub.id);

      if (updateError) throw updateError;
    } else {
      // Create new subscription with active status (requires payment)
      const { error: subError } = await supabase
        .from("subscriptions")
        .insert({
          tenant_id: tenantId,
          plan_code: sku as string, // Cast to string for DB compatibility
          status: "active",
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          included_minutes: step.includedMinutes,
          included_sms_segments: step.includedSmsSegments,
          overage_minute_rate_cents: step.overageMinuteRate ? Math.round(step.overageMinuteRate * 100) : null,
          overage_sms_rate_cents: Math.round((step.overageSmsRate || 0) * 100),
        } as any);

      if (subError) throw subError;
    }

    // Store additional locations in tenant metadata (for billing display)
    if (additionalLocations > 0) {
      await supabase
        .from("tenants")
        .update({ 
          // Store in existing metadata field or a suitable column
          // For now, we'll just log this - actual location management would need schema support
        })
        .eq("id", tenantId);
    }

    // Initialize assistant settings based on SKU
    try {
      const { error: settingsError } = await supabase.rpc("initialize_assistant_settings", {
        _tenant_id: tenantId,
        _plan_code: sku as string,
      } as any);

      if (settingsError) {
        console.error("Failed to initialize assistant settings:", settingsError);
      }
    } catch (err) {
      console.error("Error initializing assistant settings:", err);
    }

    // Initialize usage tracking for this billing period
    const periodStart = new Date();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    // Check for existing usage record first
    const { data: existingUsage } = await supabase
      .from("subscription_usage")
      .select("id")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!existingUsage) {
      await supabase
        .from("subscription_usage")
        .insert({
          tenant_id: tenantId,
          billing_period_start: periodStart.toISOString(),
          billing_period_end: periodEnd.toISOString(),
          voice_minutes_used: 0,
          sms_segments_used: 0,
        });
    }

    // Provision Twilio number for voice plans (skip for super admin test tenants)
    if (hasVoiceFeature(sku) && !isSuperAdmin) {
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
