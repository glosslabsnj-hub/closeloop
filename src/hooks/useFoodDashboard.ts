import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay } from "date-fns";

interface FoodOrder {
  id: string;
  status: string;
  order_type: string | null;
  customer_name: string | null;
  total_cents: number | null;
  created_at: string;
  scheduled_at: string | null;
}

interface FoodDashboardData {
  pendingOrders: FoodOrder[];
  preparingOrders: FoodOrder[];
  readyOrders: FoodOrder[];
  totalTodayCount: number;
  totalTodayRevenueCents: number;
}

export function useFoodDashboard(): {
  data: FoodDashboardData | null;
  isLoading: boolean;
} {
  const { tenant } = useAuth();

  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["food-dashboard", tenant?.id, todayStart],
    queryFn: async () => {
      if (!tenant?.id) return null;

      // Fetch today's active orders
      const { data: orders, error } = await supabase
        .from("food_orders")
        .select("id, status, order_type, customer_name, total_cents, created_at, scheduled_at")
        .eq("tenant_id", tenant.id)
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const allOrders = (orders || []) as FoodOrder[];

      const pendingOrders = allOrders.filter(o => o.status === "pending" || o.status === "confirmed");
      const preparingOrders = allOrders.filter(o => o.status === "preparing");
      const readyOrders = allOrders.filter(o => o.status === "ready");
      const totalTodayRevenueCents = allOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0);

      return {
        pendingOrders,
        preparingOrders,
        readyOrders,
        totalTodayCount: allOrders.length,
        totalTodayRevenueCents,
      };
    },
    enabled: !!tenant?.id,
    refetchInterval: 15000, // Refresh every 15 seconds for food orders
  });

  return { data: data ?? null, isLoading };
}
