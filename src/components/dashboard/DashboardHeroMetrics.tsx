import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
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
} from "lucide-react";
import { startOfDay, endOfDay, subDays } from "date-fns";
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
      let statusField = "status";
      let dateField = "created_at";
      
      if (businessMode === "dispatch") {
        table = "dispatch_jobs";
      } else if (businessMode === "food") {
        table = "food_orders";
      } else if (businessMode === "medical") {
        table = "medical_intakes";
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

  const isLoading = callsLoading || primaryLoading || roiLoading;

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
  const getPrimaryMetric = (): HeroMetric => {
    switch (businessMode) {
      case "dispatch":
        return {
          label: "Jobs Today",
          value: primaryMetric?.today || 0,
          icon: Truck,
          trend: primaryTrend,
          accent: "bg-purple-500/10 text-purple-500",
          href: "/app/dispatch",
        };
      case "food":
        return {
          label: "Orders Today",
          value: primaryMetric?.today || 0,
          icon: UtensilsCrossed,
          trend: primaryTrend,
          accent: "bg-orange-500/10 text-orange-500",
          href: "/app/orders",
        };
      case "medical":
        return {
          label: "Intakes Today",
          value: primaryMetric?.today || 0,
          icon: Stethoscope,
          trend: primaryTrend,
          accent: "bg-teal-500/10 text-teal-500",
          href: "/app/medical-intake",
        };
      default:
        return {
          label: terms.bookingsMetricLabel || "Bookings Today",
          value: primaryMetric?.today || 0,
          icon: Calendar,
          trend: primaryTrend,
          accent: "bg-blue-500/10 text-blue-500",
          href: "/app/bookings",
        };
    }
  };

  const metrics: HeroMetric[] = [
    {
      label: "Calls Today",
      value: callsData?.today || 0,
      icon: Phone,
      trend: callsTrend,
      accent: "bg-primary/10 text-primary",
      href: "/app/inbox",
    },
    getPrimaryMetric(),
    {
      label: "AI Revenue",
      value: roiData ? formatRevenue(roiData.aiRevenueCents) : "$0",
      icon: DollarSign,
      trend: roiData?.trends ? {
        value: Math.abs(Math.round(roiData.trends.revenue)),
        direction: roiData.trends.revenue > 0 ? "up" : roiData.trends.revenue < 0 ? "down" : "flat",
      } : undefined,
      accent: "bg-success/10 text-success",
      href: "/app/reports/roi",
    },
    {
      label: "AI ROI",
      value: roiData && roiData.roiMultiplier > 0 ? `${Math.round(roiData.roiMultiplier * 100)}%` : "—",
      icon: TrendingUp,
      accent: "bg-warning/10 text-warning",
      href: "/app/reports/roi",
    },
  ];

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
