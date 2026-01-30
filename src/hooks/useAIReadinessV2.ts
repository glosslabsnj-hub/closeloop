import { useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  };
}

/**
 * Helper to format P0/P1 flag keys into human-readable labels
 */
export function formatReadinessFlag(flag: string): string {
  const flagLabels: Record<string, string> = {
    // Global
    missing_business_name: "Missing business name",
    missing_timezone: "Missing timezone",
    missing_hours: "Business hours not configured",
    missing_policies: "No business policies",
    missing_faqs: "Need at least 5 FAQs",
    few_faqs: "Need more FAQs (5+)",
    
    // Service mode
    no_services: "No services added",
    few_services: "Need at least 3 services",
    missing_pricing: "Services missing pricing",
    missing_booking_mode: "Booking mode not configured",
    missing_name_intake: "Intake missing customer name",
    missing_phone_intake: "Intake missing phone number",
    missing_service_area: "Service area not defined",
    
    // Food mode
    no_menu_items: "No menu items added",
    few_menu_items: "Need at least 10 menu items",
    ordering_disabled: "Ordering not enabled",
    ordering_not_configured: "Ordering settings incomplete",
    missing_menu_prices: "Menu items missing prices",
    
    // Dispatch mode
    missing_pickup_intake: "Intake missing pickup address",
    missing_vehicle_intake: "Intake missing vehicle type",
    missing_urgency_intake: "Intake missing urgency/priority",
    no_dispatch_services: "No dispatch services defined",
    
    // Medical mode
    hipaa_disabled: "HIPAA compliance mode disabled",
    missing_data_retention: "Data retention not configured",
    hipaa_storage_warning: "Review HIPAA storage settings",
    no_medical_services: "No appointment types added",
  };
  
  return flagLabels[flag] || flag.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
