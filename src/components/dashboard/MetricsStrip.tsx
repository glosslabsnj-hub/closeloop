import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useTerminology } from "@/hooks/useTerminology";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
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
  value: number;
  icon: React.ElementType;
  href: string;
}

/**
 * MetricsStrip — 3 horizontal stat cards replacing the full MetricsGrid.
 * Mode-aware: each business mode sees different primary metrics.
 * Clickable cards link to the relevant page.
 */
export function MetricsStrip() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const caps = useCapabilities();
  const terms = useTerminology();

  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();
  const weekStart = startOfWeek(new Date()).toISOString();

  // Calls today
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

  // Bookings this week
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

  // Customers
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

  // Orders today (food mode)
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

  // Jobs pending (dispatch mode)
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

  // Intakes today (medical mode)
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

  // Build mode-aware metrics (always 3)
  const getMetrics = (): Metric[] => {
    const callsMetric: Metric = {
      label: "Calls Today",
      value: callsToday,
      icon: Phone,
      href: "/app/inbox",
    };

    switch (businessMode) {
      case "food":
        return [
          { label: "Orders Today", value: ordersToday, icon: UtensilsCrossed, href: "/app/orders" },
          callsMetric,
          { label: "Customers", value: totalCustomers, icon: Users, href: "/app/inbox" },
        ];
      case "dispatch":
        return [
          { label: "Jobs Pending", value: jobsPending, icon: Truck, href: "/app/dispatch" },
          callsMetric,
          { label: "Customers", value: totalCustomers, icon: Users, href: "/app/inbox" },
        ];
      case "medical":
        return [
          { label: "Intakes Today", value: intakesToday, icon: Stethoscope, href: "/app/medical-intake" },
          { label: terms.bookingsMetricLabel, value: bookingsWeek, icon: Calendar, href: "/app/bookings" },
          callsMetric,
        ];
      default:
        return [
          callsMetric,
          { label: terms.bookingsMetricLabel, value: bookingsWeek, icon: Calendar, href: "/app/bookings" },
          { label: "Customers", value: totalCustomers, icon: Users, href: "/app/inbox" },
        ];
    }
  };

  const metrics = getMetrics();

  return (
    <div className="grid gap-3 grid-cols-3">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card
            key={metric.label}
            variant="interactive"
            onClick={() => navigate(metric.href)}
            className="cursor-pointer"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 hidden sm:flex">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-semibold tracking-tight tabular-nums leading-none">
                    {metric.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">
                    {metric.label}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
