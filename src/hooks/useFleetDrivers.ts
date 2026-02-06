import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface FleetDriver {
  id: string;
  tenant_id: string;
  user_id: string | null;
  full_name: string;
  phone_e164: string | null;
  email: string | null;
  license_number: string | null;
  license_expiry: string | null;
  status: "active" | "inactive" | "on_break";
  default_vehicle_id: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  default_vehicle?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateFleetDriverInput {
  full_name: string;
  phone_e164?: string;
  email?: string;
  license_number?: string;
  license_expiry?: string;
  status?: "active" | "inactive" | "on_break";
  default_vehicle_id?: string;
}

export interface UpdateFleetDriverInput extends Partial<CreateFleetDriverInput> {
  id: string;
}

export function useFleetDrivers() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: drivers, isLoading, error } = useQuery({
    queryKey: ["fleet-drivers", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      
      const { data, error } = await supabase
        .from("fleet_drivers")
        .select(`
          *,
          default_vehicle:fleet_vehicles!fleet_drivers_default_vehicle_fkey(id, name)
        `)
        .eq("tenant_id", tenant.id)
        .order("full_name");

      if (error) throw error;
      return data as FleetDriver[];
    },
    enabled: !!tenant?.id,
  });

  const createDriver = useMutation({
    mutationFn: async (input: CreateFleetDriverInput) => {
      if (!tenant?.id) throw new Error("No tenant");
      
      const { data, error } = await supabase
        .from("fleet_drivers")
        .insert({
          tenant_id: tenant.id,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet-drivers"] });
      toast({ title: "Driver added successfully" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateDriver = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateFleetDriverInput) => {
      const { data, error } = await supabase
        .from("fleet_drivers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet-drivers"] });
      toast({ title: "Driver updated successfully" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteDriver = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fleet_drivers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet-drivers"] });
      toast({ title: "Driver removed" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const activeDrivers = drivers?.filter(d => d.status === "active") || [];

  return {
    drivers: drivers || [],
    activeDrivers,
    isLoading,
    error,
    createDriver,
    updateDriver,
    deleteDriver,
  };
}
