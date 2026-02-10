import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useTerminology } from "@/hooks/useTerminology";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Phone, 
  Calendar, 
  Users,
  UtensilsCrossed,
  Truck,
  Stethoscope,
} from "lucide-react";
import { startOfDay, startOfWeek, endOfDay } from "date-fns";

interface Metric {
  label: string;
  value: number | string;
  icon: React.ElementType;
  href: string;
}

/**
 * MetricsGrid - Clean, scannable business metrics
 * Designed to be glanced at, not studied
 */
export function MetricsGrid() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const caps = useCapabilities();
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
    enabled: !!tenant?.id && caps.hasFoodOrders,
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
    enabled: !!tenant?.id && caps.hasDispatchQueue,
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
    enabled: !!tenant?.id && caps.hasMedicalIntake,
  });

  // Build metrics based on mode
  const getMetrics = (): Metric[] => {
    const baseMetrics: Metric[] = [
      { 
        label: "Calls Today", 
        value: callsToday, 
        icon: Phone, 
        href: "/app/inbox?tab=calls",
      },
    ];

    switch (businessMode) {
      case "food":
        return [
          { label: "Orders Today", value: ordersToday, icon: UtensilsCrossed, href: "/app/orders" },
          ...baseMetrics,
          { label: "Customers", value: totalCustomers, icon: Users, href: "/app/customers" },
        ];
      case "dispatch":
        return [
          { label: "Jobs Pending", value: jobsPending, icon: Truck, href: "/app/dispatch" },
          ...baseMetrics,
          { label: "Customers", value: totalCustomers, icon: Users, href: "/app/customers" },
        ];
      case "medical":
        return [
          { label: "Intakes Today", value: intakesToday, icon: Stethoscope, href: "/app/medical-intake" },
          { label: terms.bookingsMetricLabel, value: bookingsWeek, icon: Calendar, href: "/app/bookings" },
          ...baseMetrics,
        ];
      default:
        return [
          ...baseMetrics,
          { label: terms.bookingsMetricLabel, value: bookingsWeek, icon: Calendar, href: "/app/bookings" },
          { label: "Customers", value: totalCustomers, icon: Users, href: "/app/customers" },
        ];
    }
  };

  const metrics = getMetrics();

  return (
    <div className="flex items-center divide-x divide-border/30">
      {metrics.slice(0, 3).map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.label}
            className="flex-1 px-6 first:pl-0 py-3 group cursor-pointer"
            onClick={() => navigate(metric.href)}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">
                {metric.label}
              </p>
            </div>
            <p className="text-2xl font-semibold tracking-tight tabular-nums group-hover:text-primary transition-colors">
              {metric.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}