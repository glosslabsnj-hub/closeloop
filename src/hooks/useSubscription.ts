import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Subscription, AssistantSettings, PlanCode } from "@/types/database";

interface UseSubscriptionResult {
  subscription: Subscription | null;
  assistantSettings: AssistantSettings | null;
  loading: boolean;
  error: string | null;
  hasActiveSubscription: boolean;
  canAccessApp: boolean;
  createSubscription: (planCode: PlanCode) => Promise<void>;
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

  const hasActiveSubscription = subscription?.status === "active" || subscription?.status === "trialing";
  
  // Users can access app if they have active subscription
  const canAccessApp = hasActiveSubscription;

  const createSubscription = async (planCode: PlanCode) => {
    if (!tenantId) throw new Error("No tenant ID");

    // Create subscription with active status (paid upfront)
    const { error: subError } = await supabase
      .from("subscriptions")
      .insert({
        tenant_id: tenantId,
        plan_code: planCode,
        status: "active",
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      });

    if (subError) throw subError;

    // Initialize assistant settings based on plan
    const { error: settingsError } = await supabase.rpc("initialize_assistant_settings", {
      _tenant_id: tenantId,
      _plan_code: planCode,
    });

    if (settingsError) throw settingsError;

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
    createSubscription,
    refetch: fetchData,
  };
}
