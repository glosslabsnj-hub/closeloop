import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface InventoryItem {
  id: string;
  tenant_id: string;
  sku: string | null;
  name: string;
  description: string | null;
  category: string | null;
  unit_cost_cents: number | null;
  sell_price_cents: number | null;
  unit_of_measure: string;
  min_stock_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryLocation {
  id: string;
  tenant_id: string;
  name: string;
  location_type: "warehouse" | "truck" | "van";
  assigned_user_id: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InventoryStock {
  id: string;
  tenant_id: string;
  item_id: string;
  location_id: string;
  quantity: number;
  updated_at: string;
  item?: InventoryItem;
  location?: InventoryLocation;
}

export interface InventoryTransaction {
  id: string;
  tenant_id: string;
  item_id: string;
  location_id: string;
  transaction_type: "usage" | "restock" | "transfer_in" | "transfer_out" | "adjustment";
  quantity: number;
  job_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CreateItemInput {
  sku?: string;
  name: string;
  description?: string;
  category?: string;
  unit_cost_cents?: number;
  sell_price_cents?: number;
  unit_of_measure?: string;
  min_stock_level?: number;
}

export interface CreateLocationInput {
  name: string;
  location_type?: "warehouse" | "truck" | "van";
  assigned_user_id?: string;
  address?: string;
}

export interface RecordUsageInput {
  item_id: string;
  location_id: string;
  quantity: number;
  job_id?: string;
  notes?: string;
}

export interface RestockInput {
  item_id: string;
  location_id: string;
  quantity: number;
  notes?: string;
}

export function useInventory() {
  const { tenant, user } = useAuth();
  const tenantId = tenant?.id ?? null;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all inventory items
  const {
    data: items = [],
    isLoading: itemsLoading,
  } = useQuery({
    queryKey: ["inventory_items", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name");
      if (error) {
        console.error("Failed to fetch inventory items:", error);
        return [];
      }
      return data as InventoryItem[];
    },
    enabled: !!tenantId,
    staleTime: 30000,
  });

  // Fetch all locations
  const {
    data: locations = [],
    isLoading: locationsLoading,
  } = useQuery({
    queryKey: ["inventory_locations", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("inventory_locations")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name");
      if (error) {
        console.error("Failed to fetch inventory locations:", error);
        return [];
      }
      return data as InventoryLocation[];
    },
    enabled: !!tenantId,
    staleTime: 30000,
  });

  // Fetch stock levels with item and location details
  const {
    data: stockLevels = [],
    isLoading: stockLoading,
  } = useQuery({
    queryKey: ["inventory_stock", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("inventory_stock")
        .select(`
          *,
          item:inventory_items(*),
          location:inventory_locations(*)
        `)
        .eq("tenant_id", tenantId);
      if (error) {
        console.error("Failed to fetch inventory stock:", error);
        return [];
      }
      return data as InventoryStock[];
    },
    enabled: !!tenantId,
    staleTime: 30000,
  });

  // Create item
  const createItem = useMutation({
    mutationFn: async (input: CreateItemInput) => {
      if (!tenantId) throw new Error("No tenant ID");
      const { data, error } = await supabase
        .from("inventory_items")
        .insert({
          tenant_id: tenantId,
          ...input,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_items", tenantId] });
      toast({ title: "Item created" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Create location
  const createLocation = useMutation({
    mutationFn: async (input: CreateLocationInput) => {
      if (!tenantId) throw new Error("No tenant ID");
      const { data, error } = await supabase
        .from("inventory_locations")
        .insert({
          tenant_id: tenantId,
          ...input,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_locations", tenantId] });
      toast({ title: "Location created" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Record usage (subtract from stock)
  const recordUsage = useMutation({
    mutationFn: async (input: RecordUsageInput) => {
      if (!tenantId) throw new Error("No tenant ID");

      // Update stock level
      const { data: existingStock } = await supabase
        .from("inventory_stock")
        .select("id, quantity")
        .eq("item_id", input.item_id)
        .eq("location_id", input.location_id)
        .single();

      if (existingStock) {
        await supabase
          .from("inventory_stock")
          .update({ quantity: existingStock.quantity - input.quantity })
          .eq("id", existingStock.id);
      }

      // Record transaction
      const { data, error } = await supabase
        .from("inventory_transactions")
        .insert({
          tenant_id: tenantId,
          item_id: input.item_id,
          location_id: input.location_id,
          transaction_type: "usage",
          quantity: -input.quantity,
          job_id: input.job_id || null,
          notes: input.notes || null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_stock", tenantId] });
      toast({ title: "Usage recorded" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Restock (add to stock)
  const restock = useMutation({
    mutationFn: async (input: RestockInput) => {
      if (!tenantId) throw new Error("No tenant ID");

      // Update or create stock level
      const { data: existingStock } = await supabase
        .from("inventory_stock")
        .select("id, quantity")
        .eq("item_id", input.item_id)
        .eq("location_id", input.location_id)
        .single();

      if (existingStock) {
        await supabase
          .from("inventory_stock")
          .update({ quantity: existingStock.quantity + input.quantity })
          .eq("id", existingStock.id);
      } else {
        await supabase
          .from("inventory_stock")
          .insert({
            tenant_id: tenantId,
            item_id: input.item_id,
            location_id: input.location_id,
            quantity: input.quantity,
          });
      }

      // Record transaction
      const { data, error } = await supabase
        .from("inventory_transactions")
        .insert({
          tenant_id: tenantId,
          item_id: input.item_id,
          location_id: input.location_id,
          transaction_type: "restock",
          quantity: input.quantity,
          notes: input.notes || null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_stock", tenantId] });
      toast({ title: "Stock updated" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Calculate low stock alerts
  const lowStockItems = stockLevels.filter((stock) => {
    const item = stock.item;
    if (!item) return false;
    return stock.quantity <= item.min_stock_level;
  });

  // Get stock for a specific item across all locations
  const getItemStock = (itemId: string) => {
    return stockLevels.filter((s) => s.item_id === itemId);
  };

  // Get stock for a specific location
  const getLocationStock = (locationId: string) => {
    return stockLevels.filter((s) => s.location_id === locationId);
  };

  return {
    items,
    locations,
    stockLevels,
    lowStockItems,
    isLoading: itemsLoading || locationsLoading || stockLoading,
    createItem,
    createLocation,
    recordUsage,
    restock,
    getItemStock,
    getLocationStock,
  };
}
