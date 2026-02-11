import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";

interface SalesInventoryItem {
  id: string;
  tenant_id: string;
  stock_number: string | null;
  vin: string | null;
  year: string | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  body_style: string | null;
  color_exterior: string | null;
  color_interior: string | null;
  msrp_cents: number | null;
  asking_price_cents: number | null;
  internet_price_cents: number | null;
  condition: string | null;
  mileage: number | null;
  status: string;
  features: string[] | null;
  description: string | null;
  external_id: string | null;
  external_source: string | null;
  last_synced_at: string | null;
  photo_urls: string[] | null;
  lot_location: string | null;
  days_on_lot: number;
  created_at: string;
  updated_at: string;
}

type SalesInventoryInsert = Omit<SalesInventoryItem, "id" | "created_at" | "updated_at">;

export function useSalesInventory() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const inventoryQuery = useQuery({
    queryKey: ["sales-inventory", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const { data, error } = await supabase
        .from("sales_inventory")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SalesInventoryItem[];
    },
    enabled: !!tenant?.id,
  });

  const createItem = useMutation({
    mutationFn: async (item: Omit<SalesInventoryInsert, "tenant_id">) => {
      if (!tenant?.id) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("sales_inventory")
        .insert({ ...item, tenant_id: tenant.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-inventory", tenant?.id] });
      toast({ title: "Item added", description: "Inventory item created." });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Try again?", variant: "destructive" });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SalesInventoryItem> & { id: string }) => {
      const { data, error } = await supabase
        .from("sales_inventory")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-inventory", tenant?.id] });
      toast({ title: "Item updated", description: "Changes saved." });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Try again?", variant: "destructive" });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales_inventory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-inventory", tenant?.id] });
      toast({ title: "Item removed", description: "Inventory item deleted." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const stats = useMemo(() => {
    const items = inventoryQuery.data ?? [];
    return {
      total: items.length,
      available: items.filter((i) => i.status === "available").length,
      pending: items.filter((i) => i.status === "pending").length,
      sold: items.filter((i) => i.status === "sold").length,
      newCondition: items.filter((i) => i.condition === "new").length,
      usedCondition: items.filter((i) => i.condition === "used").length,
    };
  }, [inventoryQuery.data]);

  return {
    inventory: inventoryQuery.data ?? [],
    isLoading: inventoryQuery.isLoading,
    error: inventoryQuery.error,
    stats,
    createItem,
    updateItem,
    deleteItem,
    refetch: inventoryQuery.refetch,
  };
}
