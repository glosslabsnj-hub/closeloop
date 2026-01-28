import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  MapPin,
  Clock,
  Printer,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface OrderItem {
  name: string;
  qty: number;
  base_price?: number;
  modifiers?: string[];
  item_notes?: string;
}

interface HandoffAttempt {
  id: string;
  method: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface Order {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  address_json: unknown;
  items_json: unknown;
  special_instructions: string | null;
  requested_time: string | null;
  totals_estimate: unknown;
  handoff_state: unknown;
  total_cents: number | null;
  created_at: string;
}

interface OrderDetailsDrawerProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700",
  confirmed: "bg-blue-500/10 text-blue-700",
  preparing: "bg-orange-500/10 text-orange-700",
  ready: "bg-green-500/10 text-green-700",
  out_for_delivery: "bg-purple-500/10 text-purple-700",
  completed: "bg-green-500/10 text-green-700",
  cancelled: "bg-red-500/10 text-red-700",
  needs_followup: "bg-amber-500/10 text-amber-700",
};

export function OrderDetailsDrawer({ order, open, onOpenChange }: OrderDetailsDrawerProps) {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const items = Array.isArray(order?.items_json) ? (order.items_json as OrderItem[]) : [];
  const address = order?.address_json as { street?: string; city?: string; zip?: string } | null;

  // Fetch handoff attempts for this order
  const { data: handoffAttempts } = useQuery({
    queryKey: ["handoff-attempts", order?.id],
    queryFn: async () => {
      if (!order?.id) return [];
      const { data, error } = await supabase
        .from("handoff_attempts")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as HandoffAttempt[];
    },
    enabled: !!order?.id && open,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!order?.id) throw new Error("No order");
      const { error } = await supabase
        .from("food_orders")
        .update({ status: newStatus as any })
        .eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food-orders"] });
      toast({ title: "Order status updated" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const retryHandoffMutation = useMutation({
    mutationFn: async (method: string) => {
      if (!order?.id || !tenant?.id) throw new Error("No order or tenant");
      
      const response = await supabase.functions.invoke("order-handoff", {
        body: {
          order_id: order.id,
          tenant_id: tenant.id,
          methods: [method],
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["handoff-attempts", order?.id] });
      toast({ title: "Handoff retry initiated" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Retry failed", description: error.message });
    },
  });

  const handlePrint = () => {
    if (order?.id) {
      navigate(`/app/orders/${order.id}/ticket`);
    }
  };

  const formatCurrency = (cents: number | null | undefined) => {
    if (cents == null) return "$0.00";
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (!order) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="font-mono">{order.order_number}</SheetTitle>
            <Badge className={statusColors[order.status] || ""}>
              {order.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <SheetDescription>
            {format(new Date(order.created_at), "MMMM d, yyyy 'at' h:mm a")}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Order Type & Time */}
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm capitalize">
              {order.order_type}
            </Badge>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {order.requested_time 
                ? format(new Date(order.requested_time), "h:mm a")
                : "ASAP"
              }
            </div>
          </div>

          <Separator />

          {/* Customer Info */}
          <div className="space-y-2">
            <h3 className="font-semibold">Customer</h3>
            <p className="font-medium">{order.customer_name || "Unknown"}</p>
            {order.customer_phone && (
              <a 
                href={`tel:${order.customer_phone}`}
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Phone className="h-4 w-4" />
                {order.customer_phone}
              </a>
            )}
            {address && (order.order_type === "delivery" || order.order_type === "catering") && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5" />
                <div>
                  {address.street}
                  {address.city && <><br />{address.city} {address.zip}</>}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-3">
            <h3 className="font-semibold">Items ({items.length})</h3>
            {items.map((item, idx) => (
              <div key={idx} className="p-3 border rounded-lg">
                <div className="flex justify-between font-medium">
                  <span>{item.qty}x {item.name}</span>
                  {item.base_price && (
                    <span>{formatCurrency(item.base_price * item.qty)}</span>
                  )}
                </div>
                {item.modifiers && item.modifiers.length > 0 && (
                  <div className="mt-1 pl-4 text-sm text-muted-foreground">
                    {item.modifiers.map((mod, i) => (
                      <div key={i}>+ {mod}</div>
                    ))}
                  </div>
                )}
                {item.item_notes && (
                  <div className="mt-1 pl-4 text-sm italic text-muted-foreground">
                    "{item.item_notes}"
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Special Instructions - PROMINENT */}
          {order.special_instructions && (
            <>
              <Separator />
              <div className="p-4 border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <h3 className="font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  SPECIAL INSTRUCTIONS
                </h3>
                <p className="font-medium whitespace-pre-wrap">{order.special_instructions}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(order.total_cents)}</span>
            </div>
          </div>

          <Separator />

          {/* Handoff Status */}
          <div className="space-y-3">
            <h3 className="font-semibold">Handoff Status</h3>
            {handoffAttempts && handoffAttempts.length > 0 ? (
              <div className="space-y-2">
                {handoffAttempts.map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="flex items-center gap-2">
                      {attempt.status === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="capitalize">{attempt.method}</span>
                    </div>
                    {attempt.status === "failed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => retryHandoffMutation.mutate(attempt.method)}
                        disabled={retryHandoffMutation.isPending}
                      >
                        {retryHandoffMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Retry
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No handoff attempts yet</p>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-4">
            <h3 className="font-semibold">Actions</h3>
            
            <div className="flex gap-2">
              <Select 
                value={order.status} 
                onValueChange={(v) => updateStatusMutation.mutate(v)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Update status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="needs_followup">Needs Follow-up</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
