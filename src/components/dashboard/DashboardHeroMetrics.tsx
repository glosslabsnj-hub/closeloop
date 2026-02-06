import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig, type BusinessMode } from "@/hooks/useTenantConfig";
import { useTerminology } from "@/hooks/useTerminology";
import { useROIDashboard } from "@/hooks/useROIDashboard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { 
  Phone, 
  Calendar, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Truck,
  UtensilsCrossed,
  Stethoscope,
  Users,
  Clock,
  ShoppingBag,
  Activity,
} from "lucide-react";
import { startOfDay, endOfDay, subDays, startOfMonth } from "date-fns";
import { formatRevenue } from "@/lib/revenueUtils";

interface HeroMetric {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: number; direction: "up" | "down" | "flat" };
  accent: string;
  href: string;
}

function TrendBadge({ value, direction }: { value: number; direction: "up" | "down" | "flat" }) {
  if (direction === "flat" || value === 0) return null;
  
  const Icon = direction === "up" ? TrendingUp : TrendingDown;
  const isPositive = direction === "up";
  
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-xs font-medium",
      isPositive ? "text-success" : "text-destructive"
    )}>
      <Icon className="h-3 w-3" />
      {Math.abs(value)}%
    </span>
  );
}

function MetricCard({ metric, onClick }: { metric: HeroMetric; onClick: () => void }) {
  const Icon = metric.icon;
  
  return (
    <Card 
      interactive 
      onClick={onClick}
      className="cursor-pointer group"
    >
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105",
            metric.accent
          )}>
            <Icon className="h-5 w-5" />
          </div>
          {metric.trend && (
            <TrendBadge value={metric.trend.value} direction={metric.trend.direction} />
          )}
        </div>
        <div>
          <p className="text-2xl md:text-3xl font-bold tracking-tight tabular-nums">
            {metric.value}
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            {metric.label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between mb-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardHeroMetrics() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const terms = useTerminology();
  const { data: roiData, isLoading: roiLoading } = useROIDashboard();

  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();
  const yesterdayStart = startOfDay(subDays(new Date(), 1)).toISOString();
  const yesterdayEnd = endOfDay(subDays(new Date(), 1)).toISOString();
  const monthStart = startOfMonth(new Date()).toISOString();

  // Fetch calls today vs yesterday
  const { data: callsData, isLoading: callsLoading } = useQuery({
    queryKey: ["hero-calls", tenant?.id, todayStart],
    queryFn: async () => {
      if (!tenant?.id) return { today: 0, yesterday: 0 };
      
      const [todayResult, yesterdayResult] = await Promise.all([
        supabase
          .from("ai_call_sessions")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .gte("started_at", todayStart)
          .lte("started_at", todayEnd),
        supabase
          .from("ai_call_sessions")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .gte("started_at", yesterdayStart)
          .lte("started_at", yesterdayEnd),
      ]);
      
      return {
        today: todayResult.count || 0,
        yesterday: yesterdayResult.count || 0,
      };
    },
    enabled: !!tenant?.id,
  });

  // Fetch mode-specific primary metric
  const { data: primaryMetric, isLoading: primaryLoading } = useQuery({
    queryKey: ["hero-primary", tenant?.id, businessMode, todayStart],
    queryFn: async () => {
      if (!tenant?.id) return { today: 0, yesterday: 0 };
      
      let table = "bookings";
      const dateField = "created_at";
      
      if (businessMode === "dispatch") {
        table = "dispatch_jobs";
      } else if (businessMode === "food") {
        table = "food_orders";
      } else if (businessMode === "medical") {
        table = "bookings"; // Medical uses appointments/bookings
      }
      
      const [todayResult, yesterdayResult] = await Promise.all([
        supabase
          .from(table as any)
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .gte(dateField, todayStart)
          .lte(dateField, todayEnd),
        supabase
          .from(table as any)
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .gte(dateField, yesterdayStart)
          .lte(dateField, yesterdayEnd),
      ]);
      
      return {
        today: todayResult.count || 0,
        yesterday: yesterdayResult.count || 0,
      };
    },
    enabled: !!tenant?.id,
  });

  // Fetch mode-specific tertiary metric
  const { data: tertiaryMetric, isLoading: tertiaryLoading } = useQuery({
    queryKey: ["hero-tertiary", tenant?.id, businessMode, monthStart],
    queryFn: async () => {
      if (!tenant?.id) return null;
      
      switch (businessMode) {
        case "service": {
          // Utilization: completed bookings / total slots available (simplified)
          const { count: completed } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenant.id)
            .eq("status", "completed")
            .gte("created_at", monthStart);
          const { count: total } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenant.id)
            .gte("created_at", monthStart);
          const utilization = total && total > 0 ? Math.round((completed || 0) / total * 100) : 0;
          return { value: `${utilization}%`, label: "Utilization" };
        }
        case "food": {
          // Average Order Value
          const { data: orders } = await supabase
            .from("food_orders")
            .select("total_cents")
            .eq("tenant_id", tenant.id)
            .gte("created_at", monthStart);
          if (!orders || orders.length === 0) return { value: "$0", label: "Avg Order" };
          const totalCents = orders.reduce((sum, o) => sum + (o.total_cents || 0), 0);
          const avgCents = Math.round(totalCents / orders.length);
          return { value: formatRevenue(avgCents), label: "Avg Order" };
        }
        case "dispatch": {
          // Average Response Time (time from created to dispatched)
          const { data: jobs } = await supabase
            .from("dispatch_jobs")
            .select("created_at, dispatched_at")
            .eq("tenant_id", tenant.id)
            .not("dispatched_at", "is", null)
            .gte("created_at", monthStart)
            .limit(100);
          if (!jobs || jobs.length === 0) return { value: "—", label: "Avg Response" };
          let totalMinutes = 0;
          let count = 0;
          jobs.forEach(j => {
            if (j.dispatched_at && j.created_at) {
              const diff = (new Date(j.dispatched_at).getTime() - new Date(j.created_at).getTime()) / 60000;
              if (diff > 0 && diff < 1440) { // Less than 24 hours
                totalMinutes += diff;
                count++;
              }
            }
          });
          const avgMin = count > 0 ? Math.round(totalMinutes / count) : 0;
          return { value: avgMin > 0 ? `${avgMin}m` : "—", label: "Avg Response" };
        }
        case "medical": {
          // Show Rate (confirmed / total appointments)
          const { count: confirmed } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenant.id)
            .in("status", ["confirmed", "completed"])
            .gte("created_at", monthStart);
          const { count: total } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenant.id)
            .gte("created_at", monthStart);
          const showRate = total && total > 0 ? Math.round((confirmed || 0) / total * 100) : 0;
          return { value: `${showRate}%`, label: "Show Rate" };
        }
        default:
          return null;
      }
    },
    enabled: !!tenant?.id,
  });

  // Fetch patient count for medical mode
  const { data: patientCount, isLoading: patientLoading } = useQuery({
    queryKey: ["hero-patients", tenant?.id, monthStart],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id);
      return count || 0;
    },
    enabled: !!tenant?.id && businessMode === "medical",
  });

  const isLoading = callsLoading || primaryLoading || roiLoading || tertiaryLoading || 
    (businessMode === "medical" && patientLoading);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <MetricSkeleton key={i} />)}
      </div>
    );
  }

  const getTrend = (today: number, yesterday: number): HeroMetric["trend"] => {
    if (yesterday === 0) return { value: 0, direction: "flat" };
    const change = Math.round(((today - yesterday) / yesterday) * 100);
    return {
      value: Math.abs(change),
      direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
    };
  };

  const callsTrend = getTrend(callsData?.today || 0, callsData?.yesterday || 0);
  const primaryTrend = getTrend(primaryMetric?.today || 0, primaryMetric?.yesterday || 0);

  // Build metrics based on business mode
  const getMetricsByMode = (): HeroMetric[] => {
    const callsMetric: HeroMetric = {
      label: "Calls Today",
      value: callsData?.today || 0,
      icon: Phone,
      trend: callsTrend,
      accent: "bg-primary/10 text-primary",
      href: "/app/inbox",
    };

    const revenueMetric: HeroMetric = {
      label: "AI Revenue",
      value: roiData ? formatRevenue(roiData.aiRevenueCents) : "$0",
      icon: DollarSign,
      trend: roiData?.trends ? {
        value: Math.abs(Math.round(roiData.trends.revenue)),
        direction: roiData.trends.revenue > 0 ? "up" : roiData.trends.revenue < 0 ? "down" : "flat",
      } : undefined,
      accent: "bg-success/10 text-success",
      href: "/app/reports/roi",
    };

    switch (businessMode) {
      case "food":
        return [
          callsMetric,
          {
            label: "Orders Today",
            value: primaryMetric?.today || 0,
            icon: UtensilsCrossed,
            trend: primaryTrend,
            accent: "bg-orange-500/10 text-orange-500",
            href: "/app/orders",
          },
          revenueMetric,
          {
            label: tertiaryMetric?.label || "Avg Order",
            value: tertiaryMetric?.value || "$0",
            icon: ShoppingBag,
            accent: "bg-warning/10 text-warning",
            href: "/app/orders",
          },
        ];

      case "dispatch":
        return [
          callsMetric,
          {
            label: "Jobs Today",
            value: primaryMetric?.today || 0,
            icon: Truck,
            trend: primaryTrend,
            accent: "bg-purple-500/10 text-purple-500",
            href: "/app/dispatch",
          },
          revenueMetric,
          {
            label: tertiaryMetric?.label || "Avg Response",
            value: tertiaryMetric?.value || "—",
            icon: Clock,
            accent: "bg-info/10 text-info",
            href: "/app/dispatch",
          },
        ];

      case "medical":
        return [
          callsMetric,
          {
            label: "Appointments",
            value: primaryMetric?.today || 0,
            icon: Stethoscope,
            trend: primaryTrend,
            accent: "bg-teal-500/10 text-teal-500",
            href: "/app/bookings",
          },
          {
            label: "Patients",
            value: patientCount || 0,
            icon: Users,
            accent: "bg-blue-500/10 text-blue-500",
            href: "/app/customers",
          },
          {
            label: tertiaryMetric?.label || "Show Rate",
            value: tertiaryMetric?.value || "0%",
            icon: Activity,
            accent: "bg-success/10 text-success",
            href: "/app/reports",
          },
        ];

      case "service":
      case "general":
      default:
        return [
          callsMetric,
          {
            label: terms.bookingsMetricLabel || "Bookings Today",
            value: primaryMetric?.today || 0,
            icon: Calendar,
            trend: primaryTrend,
            accent: "bg-blue-500/10 text-blue-500",
            href: "/app/bookings",
          },
          revenueMetric,
          {
            label: tertiaryMetric?.label || "Utilization",
            value: tertiaryMetric?.value || "0%",
            icon: TrendingUp,
            accent: "bg-warning/10 text-warning",
            href: "/app/reports/roi",
          },
        ];
    }
  };

  const metrics = getMetricsByMode();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <MetricCard 
          key={metric.label} 
          metric={metric} 
          onClick={() => navigate(metric.href)}
        />
      ))}
    </div>
  );
}
