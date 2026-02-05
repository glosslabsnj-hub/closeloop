import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RevenueSettings {
  id: string;
  tenant_id: string;
  default_service_value_cents: number;
  subscription_cost_override_cents: number | null;
  send_monthly_report: boolean;
}

export function useRevenueSettings() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["revenue-settings", tenant?.id],
    queryFn: async (): Promise<RevenueSettings | null> => {
      if (!tenant?.id) return null;

      const { data, error } = await supabase
        .from("tenant_revenue_settings" as any)
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as RevenueSettings | null;
    },
    enabled: !!tenant?.id,
  });

  const upsertSettings = useMutation({
    mutationFn: async (updates: Partial<Omit<RevenueSettings, "id" | "tenant_id">>) => {
      if (!tenant?.id) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("tenant_revenue_settings" as any)
        .upsert(
          {
            tenant_id: tenant.id,
            ...updates,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenue-settings", tenant?.id] });
      toast.success("Revenue settings saved");
    },
    onError: (err: any) => {
      toast.error(`Failed to save settings: ${err.message}`);
    },
  });

  return {
    settings: settingsQuery.data ?? null,
    isLoading: settingsQuery.isLoading,
    error: settingsQuery.error,
    upsertSettings,
  };
}
