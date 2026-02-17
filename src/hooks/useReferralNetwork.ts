import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ReferralNetworkSettings {
  id: string;
  tenant_id: string;
  enabled: boolean;
  accept_referrals: boolean;
  send_referrals: boolean;
  network_services: string[];
  network_categories: string[];
  network_tags: string[];
  network_lat: number | null;
  network_lng: number | null;
  network_radius_miles: number;
  quality_score: number;
  go_live_ready: boolean;
  voice_ai_active: boolean;
  preferred_partners: string[];
  blocked_tenant_ids: string[];
  same_industry_ok: boolean;
  max_referrals_per_day: number;
  referrals_today: number;
  intro_style: string;
  hipaa_compliant: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReferralTransfer {
  id: string;
  source_tenant_id: string;
  source_session_id: string | null;
  target_tenant_id: string | null;
  target_session_id: string | null;
  target_business_name: string | null;
  caller_phone_e164: string;
  caller_name: string | null;
  service_requested: string;
  service_category: string | null;
  caller_location: string | null;
  referral_reason: string | null;
  candidates_found: number;
  status: string;
  failure_reason: string | null;
  target_outcome: string | null;
  commission_cents: number;
  created_at: string;
  completed_at: string | null;
}

export function useReferralNetworkSettings() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id;

  return useQuery({
    queryKey: ["referral-network-settings", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from("referral_network_settings" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (error) throw error;
      return data as ReferralNetworkSettings | null;
    },
    enabled: !!tenantId,
  });
}

export function useUpdateReferralNetworkSettings() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<ReferralNetworkSettings>) => {
      if (!tenantId) throw new Error("No tenant");

      // Check if record exists
      const { data: existing } = await supabase
        .from("referral_network_settings" as any)
        .select("id")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("referral_network_settings" as any)
          .update(updates)
          .eq("tenant_id", tenantId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("referral_network_settings" as any)
          .insert({ tenant_id: tenantId, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referral-network-settings", tenantId] });
      toast.success("Referral network settings saved");
    },
    onError: (error) => {
      toast.error("Failed to save settings: " + (error as Error).message);
    },
  });
}

export function useReferralTransfers() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id;

  return useQuery({
    queryKey: ["referral-transfers", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("referral_transfers" as any)
        .select("*")
        .or(`source_tenant_id.eq.${tenantId},target_tenant_id.eq.${tenantId}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as ReferralTransfer[];
    },
    enabled: !!tenantId,
  });
}
