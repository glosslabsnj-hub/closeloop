import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  UtensilsCrossed, 
  Clock, 
  Truck,
  CheckCircle2,
  Plus,
  Printer,
  Eye,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { OrderDetailsDrawer } from "@/components/orders/OrderDetailsDrawer";
import { useNavigate } from "react-router-dom";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  confirmed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  preparing: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  ready: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  out_for_delivery: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-destructive/10 text-destructive",
  needs_followup: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

interface FoodOrder {
  id: string;
  tenant_id: string;
  order_number: string;
  order_type: string;
  status: string;
  customer_id: string | null;
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

export default function OrdersPage() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<FoodOrder | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("orderSoundEnabled") !== "false";
  });
  const [lastOrderCount, setLastOrderCount] = useState<number | null>(null);

  // Check for auto-print setting
  const { data: deliverySettings } = useQuery({
    queryKey: ["order-delivery-settings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data } = await supabase
        .from("order_delivery_settings")
        .select("auto_print, print_format")
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      return data;
    },
    enabled: !!tenant?.id,
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ["food-orders", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("food_orders")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as FoodOrder[];
    },
    enabled: !!tenant?.id,
    refetchInterval: 10000, // Refetch every 10 seconds for new orders
  });

  // New order detection with sound/alert
  useEffect(() => {
    if (!orders || lastOrderCount === null) {
      setLastOrderCount(orders?.length || 0);
      return;
    }

    const newOrders = orders.filter(o => 
      o.status === "confirmed" && 
      new Date(o.created_at).getTime() > Date.now() - 60000 // Within last minute
    );

    if (orders.length > lastOrderCount && newOrders.length > 0) {
      const newOrder = newOrders[0];
      
      // Play sound if enabled
      if (soundEnabled) {
        try {
          // Create a simple beep sound
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.value = 800;
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
          console.log("Audio not available");
        }
      }

      // Show toast with print option if auto_print is enabled
      if (deliverySettings?.auto_print) {
        toast({
          title: "🍽️ New Order Received!",
          description: `Order #${newOrder.order_number} - ${newOrder.order_type.toUpperCase()}`,
          action: (
            <Button 
              size="sm" 
              onClick={() => navigate(`/app/orders/${newOrder.id}/ticket?auto=true`)}
            >
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
          ),
        });
      } else {
        toast({
          title: "🍽️ New Order Received!",
          description: `Order #${newOrder.order_number} - ${newOrder.order_type.toUpperCase()}`,
        });
      }
    }

    setLastOrderCount(orders.length);
  }, [orders, lastOrderCount, soundEnabled, deliverySettings, toast, navigate]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from("food_orders")
        .update({ status: status as any })
        .eq("id", orderId);
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

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem("orderSoundEnabled", String(newValue));
  };

  const handleViewOrder = (order: FoodOrder) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
  };

  const handlePrint = (orderId: string) => {
    navigate(`/app/orders/${orderId}/ticket`);
  };

  const filteredOrders = orders?.filter(order => 
    statusFilter === "all" || order.status === statusFilter
  ) || [];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Manage incoming food orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={toggleSound} title={soundEnabled ? "Mute alerts" : "Enable alerts"}>
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {orders?.filter(o => o.status === "pending" || o.status === "confirmed").length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Preparing</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {orders?.filter(o => o.status === "preparing").length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Out for Delivery</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {orders?.filter(o => o.status === "out_for_delivery").length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Today Completed</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {orders?.filter(o => 
                o.status === "completed" && 
                new Date(o.created_at).toDateString() === new Date().toDateString()
              ).length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="needs_followup">Needs Follow-up</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Special</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const items = Array.isArray(order.items_json) ? order.items_json : [];
                  return (
                    <TableRow 
                      key={order.id} 
                      className={order.status === "confirmed" ? "bg-primary/5" : ""}
                    >
                      <TableCell className="font-mono font-medium">
                        {order.order_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.customer_name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {order.order_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {items.length} item{items.length !== 1 ? "s" : ""}
                      </TableCell>
                      <TableCell>
                        {order.special_instructions ? (
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            ⚠️ Yes
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        ${((order.total_cents || 0) / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[order.status] || ""}>
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleViewOrder(order)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handlePrint(order.id)}
                            title="Print ticket"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Select
                            value={order.status}
                            onValueChange={(status) => 
                              updateStatusMutation.mutate({ orderId: order.id, status })
                            }
                          >
                            <SelectTrigger className="w-[120px] h-8">
                              <SelectValue />
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
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Details Drawer */}
      <OrderDetailsDrawer
        order={selectedOrder}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
