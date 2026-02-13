import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface FieldEdgeIntegration {
  id: string;
  is_active: boolean;
  last_synced_at: string | null;
  config_json: {
    base_url?: string;
    company_name?: string;
  };
}

export function useFieldEdgeIntegration() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const integrationQuery = useQuery({
    queryKey: ["fieldedge-integration", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data, error } = await (supabase as any)
        .from("tenant_integrations")
        .select("id, is_active, last_synced_at, config_json")
        .eq("tenant_id", tenant.id)
        .eq("provider", "fieldedge")
        .maybeSingle();

      if (error) throw error;
      return data as FieldEdgeIntegration | null;
    },
    enabled: !!tenant?.id,
  });

  const authenticate = useMutation({
    mutationFn: async ({ api_key, base_url }: { api_key: string; base_url?: string }) => {
      const { data, error } = await supabase.functions.invoke("fieldedge-auth", {
        body: { action: "connect", api_key, base_url, tenant_id: tenant?.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fieldedge-integration", tenant?.id] });
      toast.success("Connected to FieldEdge!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to connect to FieldEdge");
    },
  });

  const toggle = useMutation({
    mutationFn: async (is_active: boolean) => {
      const { data, error } = await supabase.functions.invoke("fieldedge-auth", {
        body: { action: "toggle", is_active, tenant_id: tenant?.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, is_active) => {
      queryClient.invalidateQueries({ queryKey: ["fieldedge-integration", tenant?.id] });
      toast.success(is_active ? "Sync resumed" : "Sync paused");
    },
  });

  const syncNow = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-fieldedge", {
        body: { tenant_id: tenant?.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["fieldedge-integration", tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ["active-jobs", tenant?.id] });
      const r = data?.results || {};
      toast.success(`Synced: ${r.created || 0} new, ${r.updated || 0} updated`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Sync failed");
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("fieldedge-auth", {
        body: { action: "disconnect", tenant_id: tenant?.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fieldedge-integration", tenant?.id] });
      toast.success("FieldEdge disconnected");
    },
  });

  return {
    integration: integrationQuery.data,
    isLoading: integrationQuery.isLoading,
    isConnected: !!integrationQuery.data?.is_active,
    authenticate,
    toggle,
    syncNow,
    disconnect,
  };
}
