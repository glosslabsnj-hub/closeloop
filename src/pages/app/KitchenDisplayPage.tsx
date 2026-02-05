import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  UtensilsCrossed,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Volume2,
  VolumeX,
  Maximize,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface KitchenOrder {
  id: string;
  order_number: string;
  order_type: "pickup" | "delivery" | "dine_in";
  customer_name: string | null;
  items: Array<{
    name: string;
    quantity: number;
    modifications?: string[];
    notes?: string;
  }>;
  status: "pending" | "preparing" | "ready" | "completed";
  created_at: string;
  estimated_ready_at: string | null;
  table_number?: string;
  priority?: boolean;
}

function getOrderAge(createdAt: string): number {
  return differenceInMinutes(new Date(), new Date(createdAt));
}

function getAgeColor(minutes: number): string {
  if (minutes < 10) return "text-green-600";
  if (minutes < 20) return "text-yellow-600";
  return "text-red-600";
}

function getAgeBadgeColor(minutes: number): string {
  if (minutes < 10) return "bg-green-100 text-green-700";
  if (minutes < 20) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700 animate-pulse";
}

function OrderCard({
  order,
  onBump,
  onRecall,
}: {
  order: KitchenOrder;
  onBump: () => void;
  onRecall: () => void;
}) {
  const ageMinutes = getOrderAge(order.created_at);
  const isOverdue = ageMinutes >= 20;

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all",
        order.status === "preparing" && "ring-2 ring-primary",
        isOverdue && "ring-2 ring-red-500"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "px-4 py-2 flex items-center justify-between",
          order.order_type === "delivery" && "bg-blue-500 text-white",
          order.order_type === "pickup" && "bg-green-500 text-white",
          order.order_type === "dine_in" && "bg-purple-500 text-white"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">#{order.order_number}</span>
          {order.priority && (
            <Badge variant="destructive" className="text-xs">RUSH</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getAgeBadgeColor(ageMinutes)}>
            <Clock className="h-3 w-3 mr-1" />
            {ageMinutes}m
          </Badge>
        </div>
      </div>

      {/* Order Info */}
      <div className="px-4 py-2 border-b bg-muted/50">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {order.customer_name || "Guest"}
            {order.table_number && ` • Table ${order.table_number}`}
          </span>
          <Badge variant="outline" className="uppercase text-xs">
            {order.order_type.replace("_", " ")}
          </Badge>
        </div>
      </div>

      {/* Items */}
      <CardContent className="p-4">
        <div className="space-y-3">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex gap-3">
              <span className="font-bold text-lg w-6">{item.quantity}x</span>
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                {item.modifications && item.modifications.length > 0 && (
                  <p className="text-sm text-orange-600">
                    {item.modifications.join(", ")}
                  </p>
                )}
                {item.notes && (
                  <p className="text-sm text-muted-foreground italic">
                    Note: {item.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Actions */}
      <div className="px-4 py-3 border-t bg-muted/30 flex gap-2">
        {order.status === "pending" && (
          <Button className="flex-1" onClick={onBump}>
            Start Preparing
          </Button>
        )}
        {order.status === "preparing" && (
          <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={onBump}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Ready
          </Button>
        )}
        {order.status === "ready" && (
          <>
            <Button className="flex-1" variant="outline" onClick={onRecall}>
              Recall
            </Button>
            <Button className="flex-1" onClick={onBump}>
              Complete
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

export default function KitchenDisplayPage() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id ?? null;
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load orders
  useEffect(() => {
    if (!tenantId) return;
    loadOrders();

    // Subscribe to new orders
    const channel = supabase
      .channel("kitchen-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_orders",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          loadOrders();
          if (soundEnabled) {
            playNotificationSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, soundEnabled]);

  // Refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, [tenantId]);

  const loadOrders = async () => {
    if (!tenantId) return;

    try {
      // Try to load from food_orders table
      const { data, error } = await supabase
        .from("food_orders")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("status", ["pending", "preparing", "ready"])
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load orders:", error);
        // If table doesn't exist, use demo data
        setOrders(getDemoOrders());
      } else {
        setOrders(data as KitchenOrder[] || []);
      }
    } catch {
      setOrders(getDemoOrders());
    } finally {
      setIsLoading(false);
    }
  };

  const getDemoOrders = (): KitchenOrder[] => [
    {
      id: "demo-1",
      order_number: "1042",
      order_type: "pickup",
      customer_name: "John D.",
      items: [
        { name: "Cheeseburger", quantity: 2, modifications: ["No onions", "Extra cheese"] },
        { name: "French Fries", quantity: 1, notes: "Extra crispy" },
        { name: "Chocolate Shake", quantity: 1 },
      ],
      status: "pending",
      created_at: new Date(Date.now() - 5 * 60000).toISOString(),
      estimated_ready_at: null,
    },
    {
      id: "demo-2",
      order_number: "1043",
      order_type: "delivery",
      customer_name: "Sarah M.",
      items: [
        { name: "Caesar Salad", quantity: 1, modifications: ["Dressing on side"] },
        { name: "Grilled Chicken Sandwich", quantity: 1 },
      ],
      status: "preparing",
      created_at: new Date(Date.now() - 12 * 60000).toISOString(),
      estimated_ready_at: null,
      priority: true,
    },
    {
      id: "demo-3",
      order_number: "1044",
      order_type: "dine_in",
      customer_name: null,
      table_number: "7",
      items: [
        { name: "Margherita Pizza", quantity: 1 },
        { name: "Buffalo Wings", quantity: 1, modifications: ["Extra hot"] },
        { name: "Diet Coke", quantity: 2 },
      ],
      status: "ready",
      created_at: new Date(Date.now() - 18 * 60000).toISOString(),
      estimated_ready_at: null,
    },
  ];

  const playNotificationSound = () => {
    try {
      const audio = new Audio("/notification.mp3");
      audio.play().catch(() => {});
    } catch {}
  };

  const handleBump = async (order: KitchenOrder) => {
    const nextStatus: Record<string, string> = {
      pending: "preparing",
      preparing: "ready",
      ready: "completed",
    };

    // For demo orders, just update local state
    if (order.id.startsWith("demo-")) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, status: nextStatus[o.status] as KitchenOrder["status"] }
            : o
        ).filter((o) => o.status !== "completed")
      );
      return;
    }

    // For real orders, update database
    await supabase
      .from("food_orders")
      .update({ status: nextStatus[order.status] })
      .eq("id", order.id);
  };

  const handleRecall = async (order: KitchenOrder) => {
    if (order.id.startsWith("demo-")) {
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: "preparing" } : o))
      );
      return;
    }

    await supabase
      .from("food_orders")
      .update({ status: "preparing" })
      .eq("id", order.id);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen", isFullscreen ? "bg-gray-900" : "")}>
      <PageContainer maxWidth="full" className={isFullscreen ? "p-4" : ""}>
        <PageHeader
          icon={<UtensilsCrossed className="h-5 w-5" />}
          title="Kitchen Display"
          description="Real-time order queue for kitchen staff"
          action={
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={loadOrders}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={toggleFullscreen}>
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          }
        />

        {/* Stats Bar */}
        <div className="flex gap-4 mb-6">
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Clock className="h-4 w-4 mr-2" />
            Pending: {pendingOrders.length}
          </Badge>
          <Badge variant="outline" className="text-lg px-4 py-2 bg-primary/10">
            <UtensilsCrossed className="h-4 w-4 mr-2" />
            Preparing: {preparingOrders.length}
          </Badge>
          <Badge variant="outline" className="text-lg px-4 py-2 bg-green-500/10 text-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Ready: {readyOrders.length}
          </Badge>
        </div>

        {/* Order Columns */}
        <div className="grid grid-cols-3 gap-4">
          {/* Pending Column */}
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              New Orders ({pendingOrders.length})
            </h2>
            <div className="space-y-4">
              {pendingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onBump={() => handleBump(order)}
                  onRecall={() => {}}
                />
              ))}
              {pendingOrders.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No pending orders
                </p>
              )}
            </div>
          </div>

          {/* Preparing Column */}
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
              Preparing ({preparingOrders.length})
            </h2>
            <div className="space-y-4">
              {preparingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onBump={() => handleBump(order)}
                  onRecall={() => {}}
                />
              ))}
              {preparingOrders.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No orders being prepared
                </p>
              )}
            </div>
          </div>

          {/* Ready Column */}
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Ready ({readyOrders.length})
            </h2>
            <div className="space-y-4">
              {readyOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onBump={() => handleBump(order)}
                  onRecall={() => handleRecall(order)}
                />
              ))}
              {readyOrders.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No orders ready
                </p>
              )}
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
