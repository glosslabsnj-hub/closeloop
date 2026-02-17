import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Phone, Calendar, Users, UtensilsCrossed, Truck, Stethoscope,
} from "lucide-react";
import { startOfDay, startOfWeek, endOfDay } from "date-fns";

interface Metric {
  label: string;
  value: number | string;
  icon: React.ElementType;
  href: string;
}

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

  const getMetrics = (): Metric[] => {
    const base: Metric[] = [
      { label: "Calls Today", value: callsToday, icon: Phone, href: "/app/inbox?tab=calls" },
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
      {metrics.slice(0, 3).map((metric) => (
        <Card
          key={metric.label}
          className="cursor-pointer transition-colors hover:border-border/80"
          onClick={() => navigate(metric.href)}
        >
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {metric.label}
            </p>
            <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {metric.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
