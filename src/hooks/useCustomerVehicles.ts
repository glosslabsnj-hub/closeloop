import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CustomerVehicle {
  id: string;
  tenant_id: string;
  customer_id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  color: string | null;
  vin: string | null;
  license_plate: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type VehicleInput = {
  customer_id: string;
  year?: number | null;
  make?: string;
  model?: string;
  color?: string;
  vin?: string;
  license_plate?: string;
  notes?: string;
};

export function useCustomerVehicles(customerId: string | null) {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["customer-vehicles", tenant?.id, customerId];

  const vehiclesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      if (!tenant?.id || !customerId) return [];
      const { data, error } = await (supabase as any)
        .from("customer_vehicles")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CustomerVehicle[];
    },
    enabled: !!tenant?.id && !!customerId,
  });

  const addVehicle = useMutation({
    mutationFn: async (input: VehicleInput) => {
      if (!tenant?.id) throw new Error("No tenant");
      const { data, error } = await (supabase as any)
        .from("customer_vehicles")
        .insert({
          tenant_id: tenant.id,
          customer_id: input.customer_id,
          year: input.year || null,
          make: input.make || null,
          model: input.model || null,
          color: input.color || null,
          vin: input.vin || null,
          license_plate: input.license_plate || null,
          notes: input.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Vehicle added");
    },
    onError: () => toast.error("Failed to add vehicle"),
  });

  const updateVehicle = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CustomerVehicle> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("customer_vehicles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Vehicle updated");
    },
    onError: () => toast.error("Failed to update vehicle"),
  });

  const deleteVehicle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("customer_vehicles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Vehicle removed");
    },
    onError: () => toast.error("Failed to remove vehicle"),
  });

  return {
    vehicles: vehiclesQuery.data ?? [],
    isLoading: vehiclesQuery.isLoading,
    addVehicle,
    updateVehicle,
    deleteVehicle,
  };
}
