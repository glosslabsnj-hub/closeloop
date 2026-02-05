import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
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
  Truck,
  ShoppingBag,
  Copy,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface OrderItem {
  name: string;
  qty: number;
  base_price?: number;
  price_cents?: number | null;
  menu_item_id?: string | null;
  matched?: boolean;
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
  subtotal_cents: number | null;
  tax_cents: number | null;
  total_cents: number | null;
  created_at: string;
}

interface OrderDetailsDrawerProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
   pending: { label: "Pending", color: "bg-warning/10 text-warning border-warning/30" },
   confirmed: { label: "Confirmed", color: "bg-info/10 text-info border-info/30" },
   preparing: { label: "Preparing", color: "bg-primary/10 text-primary border-primary/30" },
   ready: { label: "Ready", color: "bg-success/10 text-success border-success/30" },
   out_for_delivery: { label: "Out for Delivery", color: "bg-info/10 text-info border-info/30" },
   completed: { label: "Completed", color: "bg-muted text-muted-foreground border-border" },
   cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive border-destructive/30" },
   needs_followup: { label: "Needs Follow-up", color: "bg-warning/10 text-warning border-warning/30" },
};

export function OrderDetailsDrawer({ order, open, onOpenChange }: OrderDetailsDrawerProps) {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const items = Array.isArray(order?.items_json) ? (order.items_json as OrderItem[]) : [];
  const address = order?.address_json as { street?: string; city?: string; zip?: string } | null;
  const config = statusConfig[order?.status || "pending"];

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

  const handleCopyPhone = () => {
    if (order?.customer_phone) {
      navigator.clipboard.writeText(order.customer_phone);
      toast({ title: "Phone number copied" });
    }
  };

  const formatCurrency = (cents: number | null | undefined) => {
    if (cents == null) return "$0.00";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatOrderType = (type: string) => {
    if (type === "pickup") return "Pickup";
    if (type === "delivery") return "Delivery";
    if (type === "dine_in") return "Dine-in";
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (!order) return null;

  const isDelivery = order.order_type === "delivery";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b p-4 z-10">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SheetTitle className="font-mono text-xl">{order.order_number}</SheetTitle>
                <Badge className={config.color}>{config.label}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="gap-1">
                {isDelivery ? <Truck className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
                {formatOrderType(order.order_type)}
              </Badge>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {order.requested_time 
                  ? format(new Date(order.requested_time), "h:mm a")
                  : "ASAP"
                }
              </span>
              <span>{format(new Date(order.created_at), "MMM d, h:mm a")}</span>
            </div>
          </SheetHeader>
        </div>

        <div className="p-4 space-y-4">
          {/* Customer Info Card */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Customer</h3>
              <div>
                <p className="font-medium text-lg">{order.customer_name || "Unknown Customer"}</p>
                {order.customer_phone && (
                  <div className="flex items-center gap-2 mt-1">
                    <a 
                      href={`tel:${order.customer_phone}`}
                      className="flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <Phone className="h-4 w-4" />
                      {order.customer_phone}
                    </a>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyPhone}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              
              {isDelivery && (address || order.delivery_address) && (
                <div className="pt-2 border-t">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      {address?.street || order.delivery_address}
                      {address?.city && <><br />{address.city} {address.zip}</>}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Special Instructions - PROMINENT */}
          {order.special_instructions && (
            <Card className="border-2 border-amber-500/50 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <h3 className="font-bold text-amber-400">Special Instructions</h3>
                </div>
                <p className="whitespace-pre-wrap">{order.special_instructions}</p>
              </CardContent>
            </Card>
          )}

          {/* Items Card */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Items ({items.length})
                </h3>
              </div>
              
              {items.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No items recorded</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item, idx) => {
                    // Support both price_cents (new) and base_price (legacy)
                    const priceCents = item.price_cents ?? (item.base_price ? item.base_price : null);
                    const lineTotal = priceCents ? priceCents * item.qty : null;
                    
                    return (
                      <div key={idx} className="flex justify-between items-start py-2 border-b last:border-0">
                        <div className="flex-1">
                          <div className="font-medium flex items-center gap-2">
                            <span className="text-primary font-bold">{item.qty}×</span>
                            <span>{item.name}</span>
                            {item.matched === false && (
                              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
                                Unpriced
                              </Badge>
                            )}
                          </div>
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="mt-1 text-sm text-muted-foreground">
                              {item.modifiers.map((mod, i) => (
                                <span key={i} className="block">+ {mod}</span>
                              ))}
                            </div>
                          )}
                          {item.item_notes && (
                            <p className="mt-1 text-sm italic text-muted-foreground">
                              "{item.item_notes}"
                            </p>
                          )}
                        </div>
                        {lineTotal !== null ? (
                          <span className="font-medium shrink-0 ml-4">
                            {formatCurrency(lineTotal)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground shrink-0 ml-4">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Totals */}
              <div className="pt-3 border-t space-y-1">
                {order.subtotal_cents != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(order.subtotal_cents)}</span>
                  </div>
                )}
                {order.tax_cents != null && order.tax_cents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(order.tax_cents)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-1">
                  <span>Total</span>
                  <span>{formatCurrency(order.total_cents)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Handoff Status (collapsible, minimal by default) */}
          {handoffAttempts && handoffAttempts.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Notifications
                </h3>
                <div className="space-y-2">
                  {handoffAttempts.slice(0, 3).map((attempt) => (
                    <div key={attempt.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {attempt.status === "success" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
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
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sticky Footer Actions */}
        <div className="sticky bottom-0 bg-background border-t p-4 space-y-3">
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

            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
