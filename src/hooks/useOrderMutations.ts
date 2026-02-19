/**
 * useOrderMutations — extracted CRUD mutations for food_orders.
 *
 * Replaces inline mutations scattered across OrdersPage and OrderDetailsDrawer.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

export interface OrderMutationInput {
  orderId: string;
  status: OrderStatus;
}

export function useOrderMutations() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["food-orders", tenant?.id] });
  };

  /** Update order status (the most common operation) */
  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: OrderMutationInput) => {
      const updates: Record<string, unknown> = { status };
      // Auto-set timestamps for terminal states
      if (status === "completed" || status === "cancelled") {
        updates.completed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("food_orders")
        .update(updates)
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      invalidate();
      const label = STATUS_LABELS[status] || status;
      toast({ title: `Order ${label.toLowerCase()}` });
    },
    onError: (error) => {
      toast({ title: "Failed to update order", description: String(error), variant: "destructive" });
    },
  });

  /** Cancel an order with optional reason */
  const cancelOrder = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason?: string }) => {
      const updates: Record<string, unknown> = {
        status: "cancelled" as OrderStatus,
        completed_at: new Date().toISOString(),
      };
      if (reason) {
        updates.special_instructions = reason;
      }
      const { error } = await supabase
        .from("food_orders")
        .update(updates)
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Order cancelled" });
    },
    onError: (error) => {
      toast({ title: "Failed to cancel order", description: String(error), variant: "destructive" });
    },
  });

  /** Create a new order */
  const createOrder = useMutation({
    mutationFn: async (data: {
      customer_name: string;
      customer_phone?: string;
      order_type: string;
      items_json: unknown[];
      special_instructions?: string;
    }) => {
      if (!tenant?.id) throw new Error("No tenant");
      const orderNum = `ORD-${Date.now().toString(36).toUpperCase()}`;
      const { data: order, error } = await supabase
        .from("food_orders")
        .insert({
          tenant_id: tenant.id,
          order_number: orderNum,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone || null,
          order_type: data.order_type,
          items_json: data.items_json as any,
          special_instructions: data.special_instructions || null,
          status: "pending" as OrderStatus,
        })
        .select()
        .single();
      if (error) throw error;
      return order;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Order created" });
    },
    onError: (error) => {
      toast({ title: "Failed to create order", description: String(error), variant: "destructive" });
    },
  });

  /** Retry handoff (notification delivery) for an order */
  const retryHandoff = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke("order-handoff", {
        body: { order_id: orderId, tenant_id: tenant?.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Handoff retried" });
    },
    onError: (error) => {
      toast({ title: "Handoff retry failed", description: String(error), variant: "destructive" });
    },
  });

  /** Mark an order as paid */
  const markPaid = useMutation({
    mutationFn: async ({ orderId, paymentMethod }: { orderId: string; paymentMethod?: string }) => {
      const { error } = await supabase
        .from("food_orders")
        .update({
          payment_status: "paid",
          payment_method: paymentMethod || "cash",
        } as any)
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Marked as paid" });
    },
    onError: (error) => {
      toast({ title: "Failed to mark as paid", description: String(error), variant: "destructive" });
    },
  });

  return {
    updateStatus,
    cancelOrder,
    createOrder,
    retryHandoff,
    markPaid,
  };
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for Delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};
