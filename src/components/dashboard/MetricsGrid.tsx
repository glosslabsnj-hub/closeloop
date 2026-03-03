import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Phone, Calendar, Users, UtensilsCrossed, Truck, Stethoscope,
} from "lucide-react";
import { startOfDay, startOfWeek, endOfDay } from "date-fns";
import { AnimatedNumber } from "@/components/ui/animated-number";

interface Metric {
  label: string;
  value: number | string;
  icon: React.ElementType;
  href: string;
}

export function MetricsGrid() {
  const navigate = useNavigate();
  const { tenant, effectiveTenantId, assistantSettings } = useAuth();
  const tenantId = effectiveTenantId ?? tenant?.id;
  const { businessMode } = useTenantConfig();
  const caps = useCapabilities();
  const { terms } = useIndustryContext();
  const isCallbackOnly = businessMode === "service" &&
    (assistantSettings as Record<string, unknown> | null)?.ai_booking_mode === "callback_only";

  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();
  const weekStart = startOfWeek(new Date()).toISOString();

  const { data: callsToday = 0 } = useQuery({
    queryKey: ["metrics-calls", tenantId, todayStart],
    queryFn: async () => {
      if (!tenantId) return 0;
      const { count } = await supabase
        .from("ai_call_sessions")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("started_at", todayStart)
        .lte("started_at", todayEnd);
      return count || 0;
    },
    enabled: !!tenantId,
  });

  const { data: bookingsWeek = 0 } = useQuery({
    queryKey: ["metrics-bookings", tenantId, weekStart],
    queryFn: async () => {
      if (!tenantId) return 0;
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("created_at", weekStart);
      return count || 0;
    },
    enabled: !!tenantId,
  });

  const { data: totalCustomers = 0 } = useQuery({
    queryKey: ["metrics-customers", tenantId],
    queryFn: async () => {
      if (!tenantId) return 0;
      const { count } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);
      return count || 0;
    },
    enabled: !!tenantId,
  });

  const { data: ordersToday = 0 } = useQuery({
    queryKey: ["metrics-orders", tenantId, todayStart],
    queryFn: async () => {
      if (!tenantId) return 0;
      const { count } = await supabase
        .from("food_orders")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("created_at", todayStart);
      return count || 0;
    },
    enabled: !!tenantId && caps.hasFoodOrders,
  });

  const { data: jobsPending = 0 } = useQuery({
    queryKey: ["metrics-dispatch", tenantId],
    queryFn: async () => {
      if (!tenantId) return 0;
      const { count } = await supabase
        .from("dispatch_jobs")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .in("status", ["pending", "assigned"]);
      return count || 0;
    },
    enabled: !!tenantId && caps.hasDispatchQueue,
  });

  const { data: intakesToday = 0 } = useQuery({
    queryKey: ["metrics-intakes", tenantId, todayStart],
    queryFn: async () => {
      if (!tenantId) return 0;
      const { count } = await supabase
        .from("medical_intakes")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("created_at", todayStart);
      return count || 0;
    },
    enabled: !!tenantId && caps.hasMedicalIntake,
  });

  const { data: newLeadsCount = 0 } = useQuery({
    queryKey: ["metrics-new-leads", tenantId],
    queryFn: async () => {
      if (!tenantId) return 0;
      const { count } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "new");
      return count || 0;
    },
    enabled: !!tenantId && isCallbackOnly,
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
          { label: terms.customers.charAt(0).toUpperCase() + terms.customers.slice(1), value: totalCustomers, icon: Users, href: "/app/customers" },
        ];
      case "dispatch":
        return [
          { label: "Active Jobs", value: jobsPending, icon: Truck, href: "/app/dispatch" },
          ...base,
          { label: terms.customers.charAt(0).toUpperCase() + terms.customers.slice(1), value: totalCustomers, icon: Users, href: "/app/customers" },
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
            { label: terms.customers.charAt(0).toUpperCase() + terms.customers.slice(1), value: totalCustomers, icon: Users, href: "/app/customers" },
          ];
        }
        return [
          ...base,
          { label: terms.bookingsMetricLabel, value: bookingsWeek, icon: Calendar, href: "/app/bookings" },
          { label: terms.customers.charAt(0).toUpperCase() + terms.customers.slice(1), value: totalCustomers, icon: Users, href: "/app/customers" },
        ];
    }
  };

  const metrics = getMetrics();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
      {metrics.slice(0, 3).map((metric) => {
        const Icon = metric.icon;
        return (
          <button
            key={metric.label}
            className="text-left p-2.5 sm:p-5 rounded-lg sm:rounded-xl bg-card/60 backdrop-blur-sm border border-border/30 card-interactive cursor-pointer group"
            onClick={() => navigate(metric.href)}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/10 group-hover:bg-primary/15 group-hover:shadow-[0_0_16px_-4px_hsl(230_70%_62%/0.2)] transition-all">
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              </div>
              <p className="text-xs sm:text-[13px] font-medium text-muted-foreground/80 truncate">
                {metric.label}
              </p>
            </div>
            <p className="text-xl sm:text-2xl lg:text-[36px] font-bold tracking-tight tabular-nums text-foreground leading-none">
              {typeof metric.value === "number" ? (
                <AnimatedNumber value={metric.value} />
              ) : (
                metric.value
              )}
            </p>
          </button>
        );
      })}
    </div>
  );
}
