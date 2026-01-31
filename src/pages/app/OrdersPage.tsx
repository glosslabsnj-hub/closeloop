import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  UtensilsCrossed, 
  Clock, 
  Truck,
  CheckCircle2,
  Plus,
  Volume2,
  VolumeX,
  Loader2,
  ShoppingBag,
  AlertCircle,
  Printer,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { OrderDetailsDrawer } from "@/components/orders/OrderDetailsDrawer";
import { OrderCard } from "@/components/orders/OrderCard";
import { useNavigate } from "react-router-dom";

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

type OrderTab = "active" | "ready" | "completed" | "all";

export default function OrdersPage() {
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["food_orders"]);
  
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<OrderTab>("active");
  const [selectedOrder, setSelectedOrder] = useState<FoodOrder | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("orderSoundEnabled") !== "false";
  });
  const [lastOrderCount, setLastOrderCount] = useState<number | null>(null);

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
    refetchInterval: 10000,
  });

  // New order detection with sound/alert
  useEffect(() => {
    if (!orders || lastOrderCount === null) {
      setLastOrderCount(orders?.length || 0);
      return;
    }

    const newOrders = orders.filter(o => 
      (o.status === "pending" || o.status === "confirmed") && 
      new Date(o.created_at).getTime() > Date.now() - 60000
    );

    if (orders.length > lastOrderCount && newOrders.length > 0) {
      const newOrder = newOrders[0];
      
      if (soundEnabled) {
        try {
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

  // Filter orders by tab
  const getFilteredOrders = () => {
    if (!orders) return [];
    switch (activeTab) {
      case "active":
        return orders.filter(o => ["pending", "confirmed", "preparing"].includes(o.status));
      case "ready":
        return orders.filter(o => ["ready", "out_for_delivery"].includes(o.status));
      case "completed":
        return orders.filter(o => ["completed", "cancelled"].includes(o.status));
      case "all":
      default:
        return orders;
    }
  };

  const filteredOrders = getFilteredOrders();

  // Stats
  const activeCount = orders?.filter(o => ["pending", "confirmed", "preparing"].includes(o.status)).length || 0;
  const readyCount = orders?.filter(o => ["ready", "out_for_delivery"].includes(o.status)).length || 0;
  const todayCompleted = orders?.filter(o => 
    o.status === "completed" && 
    new Date(o.created_at).toDateString() === new Date().toDateString()
  ).length || 0;
  const needsAttention = orders?.filter(o => o.status === "pending" || o.status === "needs_followup").length || 0;

  if (moduleLoading || !isAllowed) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">Manage incoming food orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={toggleSound} 
            title={soundEnabled ? "Mute alerts" : "Enable alerts"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* Needs Attention Banner */}
      {needsAttention > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <AlertCircle className="h-5 w-5 text-amber-400" />
          <span className="text-sm font-medium text-amber-400">
            {needsAttention} order{needsAttention !== 1 ? "s" : ""} need{needsAttention === 1 ? "s" : ""} attention
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-auto"
            onClick={() => setActiveTab("active")}
          >
            View
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setActiveTab("active")}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
                <UtensilsCrossed className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setActiveTab("ready")}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <ShoppingBag className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{readyCount}</p>
                <p className="text-xs text-muted-foreground">Ready</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setActiveTab("completed")}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayCompleted}</p>
                <p className="text-xs text-muted-foreground">Today Done</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <Truck className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {orders?.filter(o => o.order_type === "delivery" && !["completed", "cancelled"].includes(o.status)).length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Deliveries</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as OrderTab)}>
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="active" className="gap-1.5">
            Active
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {activeCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ready" className="gap-1.5">
            Ready
            {readyCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {readyCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <UtensilsCrossed className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">No orders</h3>
                <p className="text-sm text-muted-foreground">
                  {activeTab === "active" 
                    ? "No active orders right now"
                    : activeTab === "ready"
                    ? "No orders ready for pickup/delivery"
                    : activeTab === "completed"
                    ? "No completed orders today"
                    : "No orders found"
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onView={() => handleViewOrder(order)}
                  onPrint={() => handlePrint(order.id)}
                  onStatusChange={(status) => updateStatusMutation.mutate({ orderId: order.id, status })}
                  isUpdating={updateStatusMutation.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Order Details Drawer */}
      <OrderDetailsDrawer
        order={selectedOrder}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
