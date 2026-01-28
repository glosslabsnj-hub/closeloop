import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Tenant = Database["public"]["Tables"]["tenants"]["Row"];
type TenantUpdate = Database["public"]["Tables"]["tenants"]["Update"];
type AssistantSettings = Database["public"]["Tables"]["assistant_settings"]["Row"];
type AssistantSettingsUpdate = Database["public"]["Tables"]["assistant_settings"]["Update"];

export function useTenantSettings() {
  const { tenant, refreshTenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateTenant = useMutation({
    mutationFn: async (updates: TenantUpdate) => {
      if (!tenant?.id) throw new Error("No tenant");
      
      const { data, error } = await supabase
        .from("tenants")
        .update(updates)
        .eq("id", tenant.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refreshTenant?.();
      queryClient.invalidateQueries({ queryKey: ["tenant"] });
      toast({ title: "Settings saved", description: "Your changes have been saved." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    tenant,
    updateTenant,
    isUpdating: updateTenant.isPending,
  };
}

export function useAssistantSettings() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["assistant_settings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      
      const { data, error } = await supabase
        .from("assistant_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
      return data as AssistantSettings | null;
    },
    enabled: !!tenant?.id,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: AssistantSettingsUpdate) => {
      if (!tenant?.id) throw new Error("No tenant");
      
      const { data, error } = await supabase
        .from("assistant_settings")
        .update(updates)
        .eq("tenant_id", tenant.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistant_settings", tenant?.id] });
      toast({ title: "Settings saved", description: "Your changes have been saved." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    updateSettings,
    isUpdating: updateSettings.isPending,
    refetch: settingsQuery.refetch,
  };
}

export function useAvailabilitySlots() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const slotsQuery = useQuery({
    queryKey: ["availability_slots", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      
      const { data, error } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("day_of_week", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id,
  });

  const saveSlots = useMutation({
    mutationFn: async (slots: Array<{
      day_of_week: number;
      start_time: string;
      end_time: string;
      is_available: boolean;
    }>) => {
      if (!tenant?.id) throw new Error("No tenant");
      
      // Delete existing slots
      await supabase.from("availability_slots").delete().eq("tenant_id", tenant.id);
      
      // Insert new slots
      if (slots.length > 0) {
        const { error } = await supabase
          .from("availability_slots")
          .insert(slots.map((s) => ({ ...s, tenant_id: tenant.id })));

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability_slots", tenant?.id] });
      toast({ title: "Hours saved", description: "Your availability has been updated." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    slots: slotsQuery.data ?? [],
    isLoading: slotsQuery.isLoading,
    saveSlots,
    isSaving: saveSlots.isPending,
    refetch: slotsQuery.refetch,
  };
}
