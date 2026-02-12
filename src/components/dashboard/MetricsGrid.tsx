import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useIndustryContext } from "@/hooks/useIndustryContext";
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
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { startOfDay, startOfWeek, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface Metric {
  label: string;
  value: number | string;
  icon: React.ElementType;
  href: string;
  change?: number;
  changeLabel?: string;
}

/**
 * MetricsGrid - Stripe-inspired stat cards
 * Clean, scannable, clickable
 */
export function MetricsGrid() {
  const navigate = useNavigate();
  const { tenant, assistantSettings } = useAuth();
  const { businessMode } = useTenantConfig();
  const caps = useCapabilities();
  const { terms } = useIndustryContext();
  const isCallbackOnly = businessMode === "service" &&
    (assistantSettings as Record<string, unknown> | null)?.ai_booking_mode === "callback_only";

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

  // Callback-only: new leads count
  const { data: newLeadsCount = 0 } = useQuery({
    queryKey: ["metrics-new-leads", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("status", "new");
      return count || 0;
    },
    enabled: !!tenant?.id && isCallbackOnly,
  });

  // Build metrics
  const getMetrics = (): Metric[] => {
    const base: Metric[] = [
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
          ...base,
          { label: "Customers", value: totalCustomers, icon: Users, href: "/app/customers" },
        ];
      case "dispatch":
        return [
          { label: "Active Jobs", value: jobsPending, icon: Truck, href: "/app/dispatch" },
          ...base,
          { label: "Customers", value: totalCustomers, icon: Users, href: "/app/customers" },
        ];
      case "medical":
        return [
          { label: "Intakes Today", value: intakesToday, icon: Stethoscope, href: "/app/medical-intake" },
          { label: terms.bookingsMetricLabel, value: bookingsWeek, icon: Calendar, href: "/app/bookings" },
          ...base,
        ];
      default:
        if (isCallbackOnly) {
          return [
            ...base,
            { label: "New Leads", value: newLeadsCount, icon: Users, href: "/app/inbox?tab=leads" },
            { label: "Customers", value: totalCustomers, icon: Users, href: "/app/customers" },
          ];
        }
        return [
          ...base,
          { label: terms.bookingsMetricLabel, value: bookingsWeek, icon: Calendar, href: "/app/bookings" },
          { label: "Customers", value: totalCustomers, icon: Users, href: "/app/customers" },
        ];
    }
  };

  const metrics = getMetrics();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {metrics.slice(0, 3).map((metric) => {
        const Icon = metric.icon;
        return (
          <Card
            key={metric.label}
            className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/20"
            onClick={() => navigate(metric.href)}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-all" />
              </div>
              <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                {metric.value}
              </p>
              <p className="text-xs font-medium text-muted-foreground mt-1">
                {metric.label}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
