import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SquareIntegration {
  id: string;
  provider: string;
  display_name: string;
  status: "connected" | "disconnected" | "error";
  config_json: {
    location_id?: string;
    location_name?: string;
    team_member_id?: string;
  };
  error_message: string | null;
  last_tested_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useSquareIntegration() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const integrationQuery = useQuery({
    queryKey: ["square-integration", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("provider", "square_pos")
        .maybeSingle();

      if (error) throw error;
      return data as SquareIntegration | null;
    },
    enabled: !!tenant?.id,
  });

  const syncCustomers = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-square-customers", {
        body: { tenant_id: tenant?.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["square-integration", tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ["customers", tenant?.id] });
      const imported = data?.imported || 0;
      const updated = data?.updated || 0;
      toast.success(`Customers synced: ${imported} new, ${updated} updated`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Customer sync failed");
    },
  });

  const syncAvailability = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-square-availability", {
        body: { tenant_id: tenant?.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["square-integration", tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ["bookings", tenant?.id] });
      const synced = data?.synced || 0;
      toast.success(`Availability synced: ${synced} Square bookings imported`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Availability sync failed");
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      if (!integrationQuery.data?.id) throw new Error("No integration found");
      const { error } = await supabase
        .from("integrations")
        .update({ status: "disconnected", updated_at: new Date().toISOString() })
        .eq("id", integrationQuery.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["square-integration", tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ["integrations", tenant?.id] });
      toast.success("Square disconnected");
    },
  });

  return {
    integration: integrationQuery.data,
    isLoading: integrationQuery.isLoading,
    isConnected: integrationQuery.data?.status === "connected",
    syncCustomers,
    syncAvailability,
    disconnect,
  };
}
