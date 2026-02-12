import { useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { computeStepProgress } from "@/config/guidedSetupSteps";

export interface ReadinessRecommendation {
  label: string;
  deep_link: string;
}

export interface AIReadinessResult {
  score: number;
  p0_flags: string[];
  p1_flags: string[];
  recommendations: ReadinessRecommendation[];
  last_computed_at: string | null;
  business_mode: string;
  error?: string;
}

export interface StepProgress {
  /** Total guided setup steps for this mode */
  totalSteps: number;
  /** Number of steps already completed */
  completedSteps: number;
  /** The next step to work on (null if all done) */
  nextStepTitle: string | null;
}

export interface UseAIReadinessV2 {
  /** 0-100 readiness score */
  score: number;
  /** Must-fix items to go live */
  p0Flags: string[];
  /** Recommended improvements */
  p1Flags: string[];
  /** Actionable recommendations with deep links */
  recommendations: ReadinessRecommendation[];
  /** Business mode */
  businessMode: string;
  /** Can go live (score >= 85 AND no P0 flags) */
  canGoLive: boolean;
  /** Is ready for production (score >= 85) */
  isReady: boolean;
  /** Is loading */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refetch readiness data */
  refetch: () => void;
  /** Last computed timestamp */
  lastComputedAt: string | null;
  /** Step-based progress for guided setup */
  stepProgress: StepProgress;
}

/**
 * V2 AI Readiness hook that uses server-side RPC for accurate scoring
 * based on business_mode and all relevant data.
 */
export function useAIReadinessV2(): UseAIReadinessV2 {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ["ai-readiness-v2", tenant?.id],
    queryFn: async (): Promise<AIReadinessResult> => {
      if (!tenant?.id) {
        return {
          score: 0,
          p0_flags: [],
          p1_flags: [],
          recommendations: [],
          last_computed_at: null,
          business_mode: "service",
        };
      }
      
      const { data, error } = await supabase.rpc("get_ai_readiness", {
        tenant_uuid: tenant.id,
      });
      
      if (error) {
        console.error("Error fetching AI readiness:", error);
        return {
          score: 0,
          p0_flags: [],
          p1_flags: [],
          recommendations: [],
          last_computed_at: null,
          business_mode: "service",
          error: error.message,
        };
      }
      
      // Cast the result to our expected type
      const result = data as unknown as AIReadinessResult;
      return {
        score: result.score ?? 0,
        p0_flags: Array.isArray(result.p0_flags) ? result.p0_flags : [],
        p1_flags: Array.isArray(result.p1_flags) ? result.p1_flags : [],
        recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
        last_computed_at: result.last_computed_at ?? null,
        business_mode: result.business_mode ?? "service",
        error: result.error,
      };
    },
    enabled: !!tenant?.id,
    staleTime: 30_000, // 30 seconds
    refetchOnWindowFocus: true,
  });
  
  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["ai-readiness-v2", tenant?.id] });
  }, [queryClient, tenant?.id]);
  
  const result = query.data;
  const score = result?.score ?? 0;
  const p0Flags = result?.p0_flags ?? [];
  const p1Flags = result?.p1_flags ?? [];
  const bMode = (result?.business_mode ?? "service") as import("@/hooks/useTenantConfig").BusinessMode;

  // Compute step-based progress for guided setup
  const allFlags = useMemo(() => [...p0Flags, ...p1Flags], [p0Flags, p1Flags]);
  const stepProgress = useMemo((): StepProgress => {
    const prog = computeStepProgress(bMode, allFlags);
    return {
      totalSteps: prog.totalSteps,
      completedSteps: prog.completedSteps,
      nextStepTitle: prog.nextStep?.title ?? null,
    };
  }, [bMode, allFlags]);

  return {
    score,
    p0Flags,
    p1Flags,
    recommendations: result?.recommendations ?? [],
    businessMode: result?.business_mode ?? "service",
    canGoLive: score >= 85 && p0Flags.length === 0,
    isReady: score >= 85,
    loading: query.isLoading,
    error: result?.error ?? null,
    refetch,
    lastComputedAt: result?.last_computed_at ?? null,
    stepProgress,
  };
}

/**
 * Helper to format P0/P1 flag keys into human-readable labels
 * Uses plain English that matches the issue mapping
 */
export function formatReadinessFlag(flag: string): string {
  const flagLabels: Record<string, string> = {
    // Global
    missing_business_name: "Add your business name",
    missing_timezone: "Set your timezone",
    missing_hours: "Set your business hours",
    missing_policies: "Add payment & cancellation info",
    missing_faqs: "Add at least 5 FAQs",
    few_faqs: "Add more FAQs (need 5+)",
    
    // Service mode
    no_services: "Add your services",
    few_services: "Add at least 3 services",
    missing_pricing: "Add prices to your services",
    missing_booking_mode: "Set how bookings work",
    missing_name_intake: "Require customer name",
    missing_phone_intake: "Require phone number",
    missing_service_area: "Define where you serve",
    
    // Food mode
    no_menu_items: "Add your menu",
    few_menu_items: "Add more menu items (need 10+)",
    ordering_disabled: "Turn on ordering",
    ordering_not_configured: "Finish ordering setup",
    missing_menu_prices: "Add prices to menu items",
    
    // Dispatch mode
    missing_pickup_intake: "Require pickup address",
    missing_vehicle_intake: "Ask for vehicle type",
    missing_urgency_intake: "Ask about urgency",
    no_dispatch_services: "Add your dispatch services",
    
    // Medical mode
    hipaa_disabled: "Enable HIPAA mode",
    missing_data_retention: "Set data retention rules",
    hipaa_storage_warning: "Review HIPAA storage",
    no_medical_services: "Add appointment types",
  };
  
  return flagLabels[flag] || flag.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
