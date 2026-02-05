import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface CustomerEquipment {
  id: string;
  tenant_id: string;
  customer_id: string;
  equipment_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  install_date: string | null;
  warranty_expiry: string | null;
  location_in_home: string | null;
  condition: "excellent" | "good" | "fair" | "poor" | null;
  last_service_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerEquipmentWithCustomer extends CustomerEquipment {
  customer?: {
    id: string;
    full_name: string | null;
    phone_e164: string | null;
    address: string | null;
  } | null;
}

export interface CreateEquipmentInput {
  customer_id: string;
  equipment_type: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  install_date?: string;
  warranty_expiry?: string;
  location_in_home?: string;
  condition?: CustomerEquipment["condition"];
  notes?: string;
}

export interface UpdateEquipmentInput extends Partial<CreateEquipmentInput> {
  id: string;
  last_service_date?: string;
}

const EQUIPMENT_TYPES = [
  { value: "hvac", label: "HVAC System" },
  { value: "furnace", label: "Furnace" },
  { value: "ac", label: "Air Conditioner" },
  { value: "heat_pump", label: "Heat Pump" },
  { value: "water_heater", label: "Water Heater" },
  { value: "boiler", label: "Boiler" },
  { value: "air_handler", label: "Air Handler" },
  { value: "ductwork", label: "Ductwork" },
  { value: "thermostat", label: "Thermostat" },
  { value: "humidifier", label: "Humidifier" },
  { value: "dehumidifier", label: "Dehumidifier" },
  { value: "air_purifier", label: "Air Purifier" },
  { value: "generator", label: "Generator" },
  { value: "electrical_panel", label: "Electrical Panel" },
  { value: "plumbing", label: "Plumbing System" },
  { value: "other", label: "Other" },
];

export function useCustomerEquipment(customerId?: string) {
  const { tenant } = useAuth();
  const tenantId = tenant?.id ?? null;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch equipment for a specific customer or all equipment
  const {
    data: equipment = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["customer_equipment", tenantId, customerId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from("customer_equipment")
        .select(`
          *,
          customer:customers(id, full_name, phone_e164, address)
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (customerId) {
        query = query.eq("customer_id", customerId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Failed to fetch customer equipment:", error);
        return [];
      }
      return data as CustomerEquipmentWithCustomer[];
    },
    enabled: !!tenantId,
    staleTime: 30000,
  });

  // Create equipment
  const createEquipment = useMutation({
    mutationFn: async (input: CreateEquipmentInput) => {
      if (!tenantId) throw new Error("No tenant ID");

      const { data, error } = await supabase
        .from("customer_equipment")
        .insert({
          tenant_id: tenantId,
          customer_id: input.customer_id,
          equipment_type: input.equipment_type,
          brand: input.brand || null,
          model: input.model || null,
          serial_number: input.serial_number || null,
          install_date: input.install_date || null,
          warranty_expiry: input.warranty_expiry || null,
          location_in_home: input.location_in_home || null,
          condition: input.condition || null,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer_equipment", tenantId] });
      toast({ title: "Equipment added" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update equipment
  const updateEquipment = useMutation({
    mutationFn: async (input: UpdateEquipmentInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from("customer_equipment")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer_equipment", tenantId] });
      toast({ title: "Equipment updated" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete equipment
  const deleteEquipment = useMutation({
    mutationFn: async (equipmentId: string) => {
      const { error } = await supabase
        .from("customer_equipment")
        .delete()
        .eq("id", equipmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer_equipment", tenantId] });
      toast({ title: "Equipment deleted" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Record service
  const recordService = useMutation({
    mutationFn: async (equipmentId: string) => {
      const { data, error } = await supabase
        .from("customer_equipment")
        .update({
          last_service_date: new Date().toISOString().split("T")[0],
          updated_at: new Date().toISOString(),
        })
        .eq("id", equipmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer_equipment", tenantId] });
      toast({ title: "Service recorded" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Get equipment with expiring warranties (next 90 days)
  const expiringWarranties = equipment.filter((e) => {
    if (!e.warranty_expiry) return false;
    const expiryDate = new Date(e.warranty_expiry);
    const today = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    return expiryDate >= today && expiryDate <= ninetyDaysFromNow;
  });

  // Get equipment needing service (not serviced in 12 months)
  const needsService = equipment.filter((e) => {
    if (!e.last_service_date) return true;
    const lastService = new Date(e.last_service_date);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return lastService < oneYearAgo;
  });

  return {
    equipment,
    isLoading,
    error,
    refetch,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    recordService,
    expiringWarranties,
    needsService,
    equipmentTypes: EQUIPMENT_TYPES,
  };
}
