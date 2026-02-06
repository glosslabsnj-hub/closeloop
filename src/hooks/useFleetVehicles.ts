import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface FleetVehicle {
  id: string;
  tenant_id: string;
  name: string;
  vehicle_type: string | null;
  license_plate: string | null;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  status: "available" | "in_use" | "maintenance" | "retired";
  capacity_notes: string | null;
  photo_url: string | null;
  current_driver_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  current_driver?: {
    id: string;
    full_name: string;
  } | null;
}

export interface CreateFleetVehicleInput {
  name: string;
  vehicle_type?: string;
  license_plate?: string;
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  status?: "available" | "in_use" | "maintenance" | "retired";
  capacity_notes?: string;
  current_driver_id?: string;
}

export interface UpdateFleetVehicleInput extends Partial<CreateFleetVehicleInput> {
  id: string;
}

export function useFleetVehicles() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vehicles, isLoading, error } = useQuery({
    queryKey: ["fleet-vehicles", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      
      const { data, error } = await supabase
        .from("fleet_vehicles")
        .select(`
          *,
          current_driver:fleet_drivers!fleet_vehicles_current_driver_id_fkey(id, full_name)
        `)
        .eq("tenant_id", tenant.id)
        .order("name");

      if (error) throw error;
      return data as FleetVehicle[];
    },
    enabled: !!tenant?.id,
  });

  const createVehicle = useMutation({
    mutationFn: async (input: CreateFleetVehicleInput) => {
      if (!tenant?.id) throw new Error("No tenant");
      
      const { data, error } = await supabase
        .from("fleet_vehicles")
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
      queryClient.invalidateQueries({ queryKey: ["fleet-vehicles"] });
      toast({ title: "Vehicle added successfully" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateVehicle = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateFleetVehicleInput) => {
      const { data, error } = await supabase
        .from("fleet_vehicles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet-vehicles"] });
      toast({ title: "Vehicle updated successfully" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteVehicle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fleet_vehicles")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet-vehicles"] });
      toast({ title: "Vehicle removed" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const availableVehicles = vehicles?.filter(v => v.status !== "retired") || [];

  return {
    vehicles: vehicles || [],
    availableVehicles,
    isLoading,
    error,
    createVehicle,
    updateVehicle,
    deleteVehicle,
  };
}
