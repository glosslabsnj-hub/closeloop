import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useTerminology } from "@/hooks/useTerminology";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Phone, 
  Calendar, 
  TrendingUp,
  Users,
  UtensilsCrossed,
  Truck,
  Stethoscope,
} from "lucide-react";
import { startOfDay, startOfWeek, endOfDay } from "date-fns";

interface Metric {
  label: string;
  value: number | string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: React.ElementType;
  href: string;
  accent: string;
}

/**
 * MetricsGrid - Clean, scannable business metrics
 * Designed to be glanced at, not studied
 */
export function MetricsGrid() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const terms = useTerminology();

  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();
  const weekStart = startOfWeek(new Date()).toISOString();

  // Fetch calls today
  const { data: callsToday = 0 } = useQuery({
    queryKey: ["metrics-calls", tenant?.id, todayStart],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("ai_call_sessions")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .gte("started_at", todayStart)
        .lte("started_at", todayEnd);
      return count || 0;
    },
    enabled: !!tenant?.id,
  });

  // Fetch bookings this week
  const { data: bookingsWeek = 0 } = useQuery({
    queryKey: ["metrics-bookings", tenant?.id, weekStart],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .gte("created_at", weekStart);
      return count || 0;
    },
    enabled: !!tenant?.id,
  });

  // Fetch customers
  const { data: totalCustomers = 0 } = useQuery({
    queryKey: ["metrics-customers", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id);
      return count || 0;
    },
    enabled: !!tenant?.id,
  });

  // Mode-specific queries
  const { data: ordersToday = 0 } = useQuery({
    queryKey: ["metrics-orders", tenant?.id, todayStart],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("food_orders")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .gte("created_at", todayStart);
      return count || 0;
    },
    enabled: !!tenant?.id && businessMode === "food",
  });

  const { data: jobsPending = 0 } = useQuery({
    queryKey: ["metrics-dispatch", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("dispatch_jobs")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .in("status", ["pending", "assigned"]);
      return count || 0;
    },
    enabled: !!tenant?.id && businessMode === "dispatch",
  });

  const { data: intakesToday = 0 } = useQuery({
    queryKey: ["metrics-intakes", tenant?.id, todayStart],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("medical_intakes")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .gte("created_at", todayStart);
      return count || 0;
    },
    enabled: !!tenant?.id && businessMode === "medical",
  });

  // Build metrics based on mode
  const getMetrics = (): Metric[] => {
    const baseMetrics: Metric[] = [
      { 
        label: "Calls Today", 
        value: callsToday, 
        icon: Phone, 
        href: "/app/inbox?tab=calls",
        accent: "text-emerald-500",
      },
    ];

    switch (businessMode) {
      case "food":
        return [
          { label: "Orders Today", value: ordersToday, icon: UtensilsCrossed, href: "/app/orders", accent: "text-orange-500" },
          ...baseMetrics,
          { label: "Customers", value: totalCustomers, icon: Users, href: "/app/customers", accent: "text-violet-500" },
        ];
      case "dispatch":
        return [
          { label: "Jobs Pending", value: jobsPending, icon: Truck, href: "/app/dispatch", accent: "text-sky-500" },
          ...baseMetrics,
          { label: "Customers", value: totalCustomers, icon: Users, href: "/app/customers", accent: "text-violet-500" },
        ];
      case "medical":
        return [
          { label: "Intakes Today", value: intakesToday, icon: Stethoscope, href: "/app/medical-intake", accent: "text-rose-500" },
          { label: terms.bookingsMetricLabel, value: bookingsWeek, icon: Calendar, href: "/app/bookings", accent: "text-blue-500" },
          ...baseMetrics,
        ];
      default:
        return [
          ...baseMetrics,
          { label: terms.bookingsMetricLabel, value: bookingsWeek, icon: Calendar, href: "/app/bookings", accent: "text-blue-500" },
          { label: "Customers", value: totalCustomers, icon: Users, href: "/app/customers", accent: "text-violet-500" },
        ];
    }
  };

  const metrics = getMetrics();

  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4">
      {metrics.slice(0, 3).map((metric, index) => {
        const Icon = metric.icon;
        return (
          <button
            key={metric.label}
            onClick={() => navigate(metric.href)}
            className={cn(
              "group relative p-4 md:p-5 rounded-xl bg-card border border-border/50 text-left transition-all duration-200",
              "hover:border-border hover:shadow-md hover:-translate-y-0.5",
              "focus:outline-none focus:ring-2 focus:ring-primary/30",
              "animate-fade-in",
              index === 0 && "stagger-1",
              index === 1 && "stagger-2",
              index === 2 && "stagger-3"
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-3xl md:text-4xl font-bold tracking-tight tabular-nums">
                  {metric.value}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {metric.label}
                </p>
              </div>
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center bg-muted/50 transition-transform group-hover:scale-110",
                metric.accent
              )}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}