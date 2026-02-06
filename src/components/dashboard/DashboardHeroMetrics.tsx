import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useTerminology } from "@/hooks/useTerminology";
import { useROIDashboard } from "@/hooks/useROIDashboard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  ChevronDown,
} from "lucide-react";
import { startOfDay, endOfDay, subDays, startOfMonth, subWeeks, subMonths } from "date-fns";
import { formatRevenue } from "@/lib/revenueUtils";

type ComparisonPeriod = "yesterday" | "last_week" | "last_month";

interface HeroMetric {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: number; direction: "up" | "down" | "flat" };
  accent: string;
  href: string;
  sparkline?: number[];
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

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const height = 20;
  const width = 48;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-60"
      />
    </svg>
  );
}

function MetricCard({ 
  metric, 
  onClick,
  comparisonLabel,
}: { 
  metric: HeroMetric; 
  onClick: () => void;
  comparisonLabel: string;
}) {
  const Icon = metric.icon;
  const [isHovered, setIsHovered] = useState(false);
  
  const getSparklineColor = () => {
    if (metric.accent.includes("success")) return "hsl(var(--success))";
    if (metric.accent.includes("warning")) return "hsl(var(--warning))";
    if (metric.accent.includes("info")) return "hsl(var(--info))";
    if (metric.accent.includes("primary")) return "hsl(var(--primary))";
    return "hsl(var(--muted-foreground))";
  };
  
  return (
    <Card 
      interactive 
      onClick={onClick}
      className="cursor-pointer group relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105",
            metric.accent
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2">
            {isHovered && metric.sparkline && metric.sparkline.length > 1 && (
              <div className="animate-in fade-in-50 duration-200">
                <MiniSparkline data={metric.sparkline} color={getSparklineColor()} />
              </div>
            )}
            {metric.trend && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <TrendBadge value={metric.trend.value} direction={metric.trend.direction} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  vs {comparisonLabel}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
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
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>("yesterday");

  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();
  
  const getComparisonDates = () => {
    const now = new Date();
    switch (comparisonPeriod) {
      case "last_week":
        return { start: startOfDay(subWeeks(now, 1)).toISOString(), end: endOfDay(subWeeks(now, 1)).toISOString() };
      case "last_month":
        return { start: startOfDay(subMonths(now, 1)).toISOString(), end: endOfDay(subMonths(now, 1)).toISOString() };
      default:
        return { start: startOfDay(subDays(now, 1)).toISOString(), end: endOfDay(subDays(now, 1)).toISOString() };
    }
  };
  
  const comparisonDates = getComparisonDates();
  const monthStart = startOfMonth(new Date()).toISOString();

  // Fetch calls today vs comparison + sparkline
  const { data: callsData, isLoading: callsLoading } = useQuery({
    queryKey: ["hero-calls", tenant?.id, todayStart, comparisonPeriod],
    queryFn: async () => {
      if (!tenant?.id) return { today: 0, comparison: 0, sparkline: [] };
      
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return { start: startOfDay(date).toISOString(), end: endOfDay(date).toISOString() };
      });
      
      const [todayResult, comparisonResult, ...sparklineResults] = await Promise.all([
        supabase.from("ai_call_sessions").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).gte("started_at", todayStart).lte("started_at", todayEnd),
        supabase.from("ai_call_sessions").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).gte("started_at", comparisonDates.start).lte("started_at", comparisonDates.end),
        ...last7Days.map(({ start, end }) => supabase.from("ai_call_sessions").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).gte("started_at", start).lte("started_at", end)),
      ]);
      
      return { today: todayResult.count || 0, comparison: comparisonResult.count || 0, sparkline: sparklineResults.map(r => r.count || 0) };
    },
    enabled: !!tenant?.id,
  });

  // Fetch mode-specific primary metric
  const { data: primaryMetric, isLoading: primaryLoading } = useQuery({
    queryKey: ["hero-primary", tenant?.id, businessMode, todayStart, comparisonPeriod],
    queryFn: async () => {
      if (!tenant?.id) return { today: 0, comparison: 0, sparkline: [] };
      
      let table = "bookings";
      if (businessMode === "dispatch") table = "dispatch_jobs";
      else if (businessMode === "food") table = "food_orders";
      
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return { start: startOfDay(date).toISOString(), end: endOfDay(date).toISOString() };
      });
      
      const [todayResult, comparisonResult, ...sparklineResults] = await Promise.all([
        supabase.from(table as any).select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).gte("created_at", todayStart).lte("created_at", todayEnd),
        supabase.from(table as any).select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).gte("created_at", comparisonDates.start).lte("created_at", comparisonDates.end),
        ...last7Days.map(({ start, end }) => supabase.from(table as any).select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).gte("created_at", start).lte("created_at", end)),
      ]);
      
      return { today: todayResult.count || 0, comparison: comparisonResult.count || 0, sparkline: sparklineResults.map(r => r.count || 0) };
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
          const { count: completed } = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("status", "completed").gte("created_at", monthStart);
          const { count: total } = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).gte("created_at", monthStart);
          return { value: `${total && total > 0 ? Math.round((completed || 0) / total * 100) : 0}%`, label: "Utilization" };
        }
        case "food": {
          const { data: orders } = await supabase.from("food_orders").select("total_cents").eq("tenant_id", tenant.id).gte("created_at", monthStart);
          if (!orders?.length) return { value: "$0", label: "Avg Order" };
          return { value: formatRevenue(Math.round(orders.reduce((sum, o) => sum + (o.total_cents || 0), 0) / orders.length)), label: "Avg Order" };
        }
        case "dispatch": {
          const { data: jobs } = await supabase.from("dispatch_jobs").select("created_at, dispatched_at").eq("tenant_id", tenant.id).not("dispatched_at", "is", null).gte("created_at", monthStart).limit(100);
          if (!jobs?.length) return { value: "—", label: "Avg Response" };
          let totalMin = 0, count = 0;
          jobs.forEach(j => { if (j.dispatched_at) { const diff = (new Date(j.dispatched_at).getTime() - new Date(j.created_at).getTime()) / 60000; if (diff > 0 && diff < 1440) { totalMin += diff; count++; } } });
          return { value: count > 0 ? `${Math.round(totalMin / count)}m` : "—", label: "Avg Response" };
        }
        case "medical": {
          const { count: confirmed } = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).in("status", ["confirmed", "completed"]).gte("created_at", monthStart);
          const { count: total } = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).gte("created_at", monthStart);
          return { value: `${total && total > 0 ? Math.round((confirmed || 0) / total * 100) : 0}%`, label: "Show Rate" };
        }
        default: return null;
      }
    },
    enabled: !!tenant?.id,
  });

  // Fetch patient count for medical mode
  const { data: patientCount, isLoading: patientLoading } = useQuery({
    queryKey: ["hero-patients", tenant?.id],
    queryFn: async () => { if (!tenant?.id) return 0; const { count } = await supabase.from("customers").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id); return count || 0; },
    enabled: !!tenant?.id && businessMode === "medical",
  });

  const isLoading = callsLoading || primaryLoading || roiLoading || tertiaryLoading || (businessMode === "medical" && patientLoading);
  const comparisonLabels: Record<ComparisonPeriod, string> = { yesterday: "yesterday", last_week: "last week", last_month: "last month" };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end"><Skeleton className="h-8 w-28" /></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <MetricSkeleton key={i} />)}</div>
      </div>
    );
  }

  const getTrend = (today: number, comparison: number): HeroMetric["trend"] => {
    if (comparison === 0) return { value: 0, direction: "flat" };
    const change = Math.round(((today - comparison) / comparison) * 100);
    return { value: Math.abs(change), direction: change > 0 ? "up" : change < 0 ? "down" : "flat" };
  };

  const callsTrend = getTrend(callsData?.today || 0, callsData?.comparison || 0);
  const primaryTrend = getTrend(primaryMetric?.today || 0, primaryMetric?.comparison || 0);

  const getMetricsByMode = (): HeroMetric[] => {
    const callsMetric: HeroMetric = { label: "Calls Today", value: callsData?.today || 0, icon: Phone, trend: callsTrend, accent: "bg-primary/10 text-primary", href: "/app/inbox", sparkline: callsData?.sparkline };
    const revenueMetric: HeroMetric = { label: "AI Revenue", value: roiData ? formatRevenue(roiData.aiRevenueCents) : "$0", icon: DollarSign, trend: roiData?.trends ? { value: Math.abs(Math.round(roiData.trends.revenue)), direction: roiData.trends.revenue > 0 ? "up" : roiData.trends.revenue < 0 ? "down" : "flat" } : undefined, accent: "bg-success/10 text-success", href: "/app/reports/roi" };

    switch (businessMode) {
      case "food": return [callsMetric, { label: "Orders Today", value: primaryMetric?.today || 0, icon: UtensilsCrossed, trend: primaryTrend, accent: "bg-warning/10 text-warning", href: "/app/orders", sparkline: primaryMetric?.sparkline }, revenueMetric, { label: tertiaryMetric?.label || "Avg Order", value: tertiaryMetric?.value || "$0", icon: ShoppingBag, accent: "bg-warning/10 text-warning", href: "/app/orders" }];
      case "dispatch": return [callsMetric, { label: "Jobs Today", value: primaryMetric?.today || 0, icon: Truck, trend: primaryTrend, accent: "bg-info/10 text-info", href: "/app/dispatch", sparkline: primaryMetric?.sparkline }, revenueMetric, { label: tertiaryMetric?.label || "Avg Response", value: tertiaryMetric?.value || "—", icon: Clock, accent: "bg-info/10 text-info", href: "/app/dispatch" }];
      case "medical": return [callsMetric, { label: "Appointments", value: primaryMetric?.today || 0, icon: Stethoscope, trend: primaryTrend, accent: "bg-info/10 text-info", href: "/app/bookings", sparkline: primaryMetric?.sparkline }, { label: "Patients", value: patientCount || 0, icon: Users, accent: "bg-info/10 text-info", href: "/app/customers" }, { label: tertiaryMetric?.label || "Show Rate", value: tertiaryMetric?.value || "0%", icon: Activity, accent: "bg-success/10 text-success", href: "/app/reports" }];
      default: return [callsMetric, { label: terms.bookingsMetricLabel || "Bookings Today", value: primaryMetric?.today || 0, icon: Calendar, trend: primaryTrend, accent: "bg-info/10 text-info", href: "/app/bookings", sparkline: primaryMetric?.sparkline }, revenueMetric, { label: tertiaryMetric?.label || "Utilization", value: tertiaryMetric?.value || "0%", icon: TrendingUp, accent: "bg-warning/10 text-warning", href: "/app/reports/roi" }];
    }
  };

  const metrics = getMetricsByMode();

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">vs {comparisonLabels[comparisonPeriod]}<ChevronDown className="h-3.5 w-3.5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setComparisonPeriod("yesterday")}>vs Yesterday</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setComparisonPeriod("last_week")}>vs Last Week</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setComparisonPeriod("last_month")}>vs Last Month</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (<MetricCard key={metric.label} metric={metric} onClick={() => navigate(metric.href)} comparisonLabel={comparisonLabels[comparisonPeriod]} />))}
      </div>
    </div>
  );
}
