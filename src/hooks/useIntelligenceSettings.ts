import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { toast } from "sonner";

export interface IntelligenceSettings {
  tenant_id: string;
  memory_enabled: boolean;
  share_memory_across_locations: boolean;
  copilot_can_suggest_rules: boolean;
  min_observation_threshold: number;
  min_confidence_threshold: number;
  created_at: string;
  updated_at: string;
}

const defaultSettings: Omit<IntelligenceSettings, "tenant_id" | "created_at" | "updated_at"> = {
  memory_enabled: false,
  share_memory_across_locations: false,
  copilot_can_suggest_rules: true,
  min_observation_threshold: 3,
  min_confidence_threshold: 0.65,
};

export function useIntelligenceSettings() {
  const { tenant } = useAuth();
  const { hipaaMode } = useTenantConfig();
  const queryClient = useQueryClient();
  const tenantId = tenant?.id;

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["intelligence-settings", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from("tenant_intelligence_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (error) throw error;

      // Return existing settings or create default
      if (data) {
        return data as IntelligenceSettings;
      }

      // Create default settings if none exist
      const { data: newSettings, error: insertError } = await supabase
        .from("tenant_intelligence_settings")
        .insert({ tenant_id: tenantId, ...defaultSettings })
        .select()
        .single();

      if (insertError) throw insertError;
      return newSettings as IntelligenceSettings;
    },
    enabled: !!tenantId,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<IntelligenceSettings>) => {
      if (!tenantId) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("tenant_intelligence_settings")
        .upsert({
          tenant_id: tenantId,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intelligence-settings", tenantId] });
      toast.success("Intelligence settings updated");
    },
    onError: (error) => {
      console.error("Failed to update intelligence settings:", error);
      toast.error("Failed to update settings");
    },
  });

  const toggleMemory = async (enabled: boolean) => {
    await updateSettings.mutateAsync({ memory_enabled: enabled });
  };

  const toggleCrossLocationSharing = async (enabled: boolean) => {
    await updateSettings.mutateAsync({ share_memory_across_locations: enabled });
  };

  return {
    settings: settings || { tenant_id: tenantId || "", ...defaultSettings, created_at: "", updated_at: "" },
    isLoading,
    error,
    updateSettings,
    toggleMemory,
    toggleCrossLocationSharing,
    isUpdating: updateSettings.isPending,
    // HIPAA mode affects customer-specific memory
    hipaaMode,
    customerMemoryBlocked: hipaaMode,
  };
}
