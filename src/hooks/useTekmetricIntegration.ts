import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TekmetricShop {
  id: string | number;
  name: string;
  phone?: string;
  address?: string;
}

export interface TekmetricIntegration {
  id: string;
  is_active: boolean;
  last_synced_at: string | null;
  config_json: {
    shops?: TekmetricShop[];
    selected_shop_id?: string | number | null;
    selected_shop_name?: string | null;
  };
}

export function useTekmetricIntegration() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const integrationQuery = useQuery({
    queryKey: ["tekmetric-integration", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data, error } = await (supabase as any)
        .from("tenant_integrations")
        .select("id, is_active, last_synced_at, config_json")
        .eq("tenant_id", tenant.id)
        .eq("provider", "tekmetric")
        .maybeSingle();

      if (error) throw error;
      return data as TekmetricIntegration | null;
    },
    enabled: !!tenant?.id,
  });

  const authenticate = useMutation({
    mutationFn: async ({ client_id, client_secret }: { client_id: string; client_secret: string }) => {
      const { data, error } = await supabase.functions.invoke("tekmetric-auth", {
        body: { action: "exchange-token", client_id, client_secret, tenant_id: tenant?.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { shops: TekmetricShop[] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tekmetric-integration", tenant?.id] });
      toast.success("Connected to Tekmetric!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to connect to Tekmetric");
    },
  });

  const selectShop = useMutation({
    mutationFn: async (shop_id: string | number) => {
      const { data, error } = await supabase.functions.invoke("tekmetric-auth", {
        body: { action: "select-shop", shop_id, tenant_id: tenant?.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tekmetric-integration", tenant?.id] });
      toast.success("Shop selected — sync is now active!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to select shop");
    },
  });

  const toggle = useMutation({
    mutationFn: async (is_active: boolean) => {
      const { data, error } = await supabase.functions.invoke("tekmetric-auth", {
        body: { action: "toggle", is_active, tenant_id: tenant?.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, is_active) => {
      queryClient.invalidateQueries({ queryKey: ["tekmetric-integration", tenant?.id] });
      toast.success(is_active ? "Sync resumed" : "Sync paused");
    },
  });

  const syncNow = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-tekmetric", {
        body: { tenant_id: tenant?.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tekmetric-integration", tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ["active-jobs", tenant?.id] });
      const results = data?.results?.[0] || {};
      toast.success(`Synced: ${results.created || 0} new, ${results.updated || 0} updated`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Sync failed");
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("tekmetric-auth", {
        body: { action: "disconnect", tenant_id: tenant?.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tekmetric-integration", tenant?.id] });
      toast.success("Tekmetric disconnected");
    },
  });

  return {
    integration: integrationQuery.data,
    isLoading: integrationQuery.isLoading,
    isConnected: !!integrationQuery.data?.is_active && !!integrationQuery.data?.config_json?.selected_shop_id,
    authenticate,
    selectShop,
    toggle,
    syncNow,
    disconnect,
  };
}
