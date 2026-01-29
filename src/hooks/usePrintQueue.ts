import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface PrintableOrder {
  id: string;
  order_number: string;
  order_type: string;
  customer_name: string | null;
  items_json: unknown;
  special_instructions: string | null;
  total_cents: number | null;
  handoff_state: {
    print_requested?: boolean;
    print_format?: "thermal" | "full";
    print_copies?: number;
    print_requested_at?: string;
    print_completed?: boolean;
    print_completed_at?: string;
    print_dismissed?: boolean;
  } | null;
  created_at: string;
}

export function usePrintQueue() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingPrints, isLoading } = useQuery({
    queryKey: ["print-queue", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      
      const { data, error } = await supabase
        .from("food_orders")
        .select("id, order_number, order_type, customer_name, items_json, special_instructions, total_cents, handoff_state, created_at")
        .eq("tenant_id", tenant.id)
        .not("handoff_state", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      // Filter for orders with print_requested = true that haven't been marked as printed
      const printQueue = (data || []).filter((order: any) => {
        const state = order.handoff_state as PrintableOrder["handoff_state"];
        return state?.print_requested === true && !state?.print_completed;
      });
      
      return printQueue as PrintableOrder[];
    },
    enabled: !!tenant?.id,
    refetchInterval: 5000, // Check every 5 seconds
  });

  const markPrinted = useMutation({
    mutationFn: async (orderId: string) => {
      const { data: order, error: fetchError } = await supabase
        .from("food_orders")
        .select("handoff_state")
        .eq("id", orderId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { error } = await supabase
        .from("food_orders")
        .update({
          handoff_state: {
            ...(order?.handoff_state as Record<string, unknown> || {}),
            print_completed: true,
            print_completed_at: new Date().toISOString(),
          },
        })
        .eq("id", orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["print-queue"] });
      toast({ title: "Order marked as printed" });
    },
    onError: (error) => {
      toast({ title: "Failed to update print status", description: String(error), variant: "destructive" });
    },
  });

  const dismissPrint = useMutation({
    mutationFn: async (orderId: string) => {
      const { data: order, error: fetchError } = await supabase
        .from("food_orders")
        .select("handoff_state")
        .eq("id", orderId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { error } = await supabase
        .from("food_orders")
        .update({
          handoff_state: {
            ...(order?.handoff_state as Record<string, unknown> || {}),
            print_requested: false,
            print_dismissed: true,
          },
        })
        .eq("id", orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["print-queue"] });
    },
  });

  return {
    pendingPrints: pendingPrints || [],
    isLoading,
    markPrinted,
    dismissPrint,
    hasPendingPrints: (pendingPrints?.length || 0) > 0,
  };
}
