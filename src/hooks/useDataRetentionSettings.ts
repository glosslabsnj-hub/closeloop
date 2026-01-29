import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { toast } from "sonner";

export interface DataRetentionSettings {
  tenant_id: string;
  store_recordings: boolean;
  store_transcripts: boolean;
  store_caller_phone: boolean;
  recording_retention_days: number | null;
  transcript_retention_days: number | null;
  call_summary_retention_days: number | null;
  audit_log_retention_days: number | null;
  require_verbal_consent: boolean;
  phi_minimization_enabled: boolean;
  allow_customer_memory: boolean;
  created_at: string;
  updated_at: string;
}

// HIPAA-compliant defaults
const hipaaDefaults: Omit<DataRetentionSettings, "tenant_id" | "created_at" | "updated_at"> = {
  store_recordings: false,
  store_transcripts: false,
  store_caller_phone: false,
  recording_retention_days: 0,
  transcript_retention_days: 0,
  call_summary_retention_days: 365,
  audit_log_retention_days: 730,
  require_verbal_consent: true,
  phi_minimization_enabled: true,
  allow_customer_memory: false,
};

// Standard defaults for non-medical
const standardDefaults: Omit<DataRetentionSettings, "tenant_id" | "created_at" | "updated_at"> = {
  store_recordings: true,
  store_transcripts: true,
  store_caller_phone: true,
  recording_retention_days: 90,
  transcript_retention_days: 90,
  call_summary_retention_days: 365,
  audit_log_retention_days: 730,
  require_verbal_consent: false,
  phi_minimization_enabled: false,
  allow_customer_memory: true,
};

export function useDataRetentionSettings() {
  const { tenant } = useAuth();
  const { hipaaMode, businessMode } = useTenantConfig();
  const queryClient = useQueryClient();
  const tenantId = tenant?.id;

  const defaults = hipaaMode ? hipaaDefaults : standardDefaults;

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["data-retention-settings", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from("data_retention_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (error) throw error;

      // Return existing settings or create default
      if (data) {
        return data as DataRetentionSettings;
      }

      // Create default settings based on business mode
      const newSettings = {
        tenant_id: tenantId,
        ...defaults,
      };

      const { data: created, error: insertError } = await supabase
        .from("data_retention_settings")
        .insert(newSettings)
        .select()
        .single();

      if (insertError) throw insertError;
      return created as DataRetentionSettings;
    },
    enabled: !!tenantId,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<DataRetentionSettings>) => {
      if (!tenantId) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("data_retention_settings")
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
      queryClient.invalidateQueries({ queryKey: ["data-retention-settings", tenantId] });
      toast.success("Data retention settings updated");
    },
    onError: (error) => {
      console.error("Failed to update data retention settings:", error);
      toast.error("Failed to update settings");
    },
  });

  // Computed helpers
  const effectiveSettings = settings || { tenant_id: tenantId || "", ...defaults, created_at: "", updated_at: "" };
  
  // What IS stored (for UI display)
  const storedDataList: string[] = [];
  if (effectiveSettings.store_recordings) storedDataList.push("Call recordings");
  if (effectiveSettings.store_transcripts) storedDataList.push("Full transcripts");
  if (effectiveSettings.store_caller_phone) storedDataList.push("Caller phone numbers");
  if (!hipaaMode || effectiveSettings.allow_customer_memory) storedDataList.push("Customer preferences");
  storedDataList.push("AI-generated call summaries");
  storedDataList.push("Audit logs");

  // What is NOT stored
  const notStoredList: string[] = [];
  if (!effectiveSettings.store_recordings) notStoredList.push("Call recordings");
  if (!effectiveSettings.store_transcripts) notStoredList.push("Full transcripts");
  if (!effectiveSettings.store_caller_phone) notStoredList.push("Caller phone numbers (redacted)");
  if (hipaaMode && !effectiveSettings.allow_customer_memory) notStoredList.push("Customer-specific preferences");

  return {
    settings: effectiveSettings,
    isLoading,
    error,
    updateSettings,
    isUpdating: updateSettings.isPending,
    hipaaMode,
    businessMode,
    storedDataList,
    notStoredList,
    defaults,
    isHIPAACompliant: hipaaMode && !effectiveSettings.store_recordings && !effectiveSettings.store_transcripts && !effectiveSettings.store_caller_phone,
  };
}
