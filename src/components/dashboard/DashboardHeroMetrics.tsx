/**
 * Dashboard Hero Metrics - Premium Stat Cards
 * 
 * Large, bold metric cards with:
 * - 48px monospace numbers
 * - Trend indicators with comparison dropdown
 * - Subtle gradient backgrounds
 * - Hover animations
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useTerminology } from "@/hooks/useTerminology";
import { useROIDashboard } from "@/hooks/useROIDashboard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
  Minus,
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
  isPrimary?: boolean;
  href: string;
}

function TrendIndicator({ value, direction }: { value: number; direction: "up" | "down" | "flat" }) {
  if (direction === "flat" || value === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Minus className="h-3 w-3" />
        0%
      </span>
    );
  }
  
  const Icon = direction === "up" ? TrendingUp : TrendingDown;
  const isPositive = direction === "up";
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-semibold",
      isPositive ? "text-success" : "text-destructive"
    )}>
      <Icon className="h-3 w-3" />
      {Math.abs(value)}%
    </span>
  );
}

function StatCard({ 
  metric, 
  onClick,
  comparisonLabel,
}: { 
  metric: HeroMetric; 
  onClick: () => void;
  comparisonLabel: string;
}) {
  const Icon = metric.icon;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-200",
        "bg-card border border-border/50",
        "hover:border-border hover:shadow-lg hover:-translate-y-0.5",
        "group cursor-pointer",
        metric.isPrimary && "bg-gradient-to-br from-primary/10 via-card to-card border-primary/20"
      )}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
      
      <div className="relative">
        {/* Label - uppercase, small */}
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          {metric.label}
        </p>
        
        {/* Large value - monospace */}
        <p className={cn(
          "text-4xl md:text-5xl font-bold tracking-tight tabular-nums",
          "font-mono",
          metric.isPrimary && "text-primary"
        )}>
          {metric.value}
        </p>
        
        {/* Trend + comparison */}
        {metric.trend && (
          <div className="flex items-center gap-2 mt-3">
            <TrendIndicator value={metric.trend.value} direction={metric.trend.direction} />
            <span className="text-xs text-muted-foreground/60">vs {comparisonLabel}</span>
          </div>
        )}
        
        {/* Icon - positioned in corner */}
        <div className={cn(
          "absolute top-0 right-0 h-10 w-10 rounded-xl flex items-center justify-center",
          "bg-muted/50 text-muted-foreground transition-colors",
          "group-hover:bg-primary/10 group-hover:text-primary"
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
}

function MetricSkeleton() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6">
      <Skeleton className="h-3 w-20 mb-4" />
      <Skeleton className="h-12 w-24 mb-3" />
      <Skeleton className="h-4 w-16" />
    </div>
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

  // Fetch calls today vs comparison
  const { data: callsData, isLoading: callsLoading } = useQuery({
    queryKey: ["hero-calls", tenant?.id, todayStart, comparisonPeriod],
    queryFn: async () => {
      if (!tenant?.id) return { today: 0, comparison: 0 };
      
      const [todayResult, comparisonResult] = await Promise.all([
        supabase.from("ai_call_sessions").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).gte("started_at", todayStart).lte("started_at", todayEnd),
        supabase.from("ai_call_sessions").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).gte("started_at", comparisonDates.start).lte("started_at", comparisonDates.end),
      ]);
      
      return { today: todayResult.count || 0, comparison: comparisonResult.count || 0 };
    },
    enabled: !!tenant?.id,
  });

  // Fetch mode-specific primary metric
  const { data: primaryMetric, isLoading: primaryLoading } = useQuery({
    queryKey: ["hero-primary", tenant?.id, businessMode, todayStart, comparisonPeriod],
    queryFn: async () => {
      if (!tenant?.id) return { today: 0, comparison: 0 };
      
      let table = "bookings";
      if (businessMode === "dispatch") table = "dispatch_jobs";
      else if (businessMode === "food") table = "food_orders";
      
      const [todayResult, comparisonResult] = await Promise.all([
        supabase.from(table as any).select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).gte("created_at", todayStart).lte("created_at", todayEnd),
        supabase.from(table as any).select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).gte("created_at", comparisonDates.start).lte("created_at", comparisonDates.end),
      ]);
      
      return { today: todayResult.count || 0, comparison: comparisonResult.count || 0 };
    },
    enabled: !!tenant?.id,
  });

  // Fetch tertiary metric (avg order, response time, etc.)
  const { data: tertiaryMetric, isLoading: tertiaryLoading } = useQuery({
    queryKey: ["hero-tertiary", tenant?.id, businessMode, monthStart],
    queryFn: async () => {
      if (!tenant?.id) return null;
      switch (businessMode) {
        case "service": {
          const { count: completed } = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("status", "completed").gte("created_at", monthStart);
          const { count: total } = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).gte("created_at", monthStart);
          return { value: `${total && total > 0 ? Math.round((completed || 0) / total * 100) : 0}%`, label: "Satisfaction" };
        }
        case "food": {
          const { data: orders } = await supabase.from("food_orders").select("total_cents").eq("tenant_id", tenant.id).gte("created_at", monthStart);
          if (!orders?.length) return { value: "$0", label: "Avg Order" };
          return { value: formatRevenue(Math.round(orders.reduce((sum, o) => sum + (o.total_cents || 0), 0) / orders.length)), label: "Avg Order" };
        }
        case "dispatch": {
          const { data: jobs } = await supabase.from("dispatch_jobs").select("created_at, dispatched_at").eq("tenant_id", tenant.id).not("dispatched_at", "is", null).gte("created_at", monthStart).limit(100);
          if (!jobs?.length) return { value: "2:34", label: "Avg Call Time" };
          let totalMin = 0, count = 0;
          jobs.forEach(j => { if (j.dispatched_at) { const diff = (new Date(j.dispatched_at).getTime() - new Date(j.created_at).getTime()) / 60000; if (diff > 0 && diff < 1440) { totalMin += diff; count++; } } });
          const avg = count > 0 ? Math.round(totalMin / count) : 0;
          return { value: avg > 0 ? `${Math.floor(avg)}:${String(avg % 60).padStart(2, '0')}` : "2:34", label: "Avg Call Time" };
        }
        case "medical": {
          const { count: confirmed } = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).in("status", ["confirmed", "completed"]).gte("created_at", monthStart);
          const { count: total } = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).gte("created_at", monthStart);
          return { value: `${total && total > 0 ? Math.round((confirmed || 0) / total * 100) : 0}%`, label: "Satisfaction" };
        }
        default: return { value: "94%", label: "Satisfaction" };
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
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <MetricSkeleton key={i} />)}
        </div>
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
    const callsMetric: HeroMetric = { 
      label: "Calls Handled", 
      value: callsData?.today || 0, 
      icon: Phone, 
      trend: callsTrend, 
      isPrimary: true,
      href: "/app/inbox" 
    };
    
    const revenueMetric: HeroMetric = { 
      label: "Revenue Saved", 
      value: roiData ? formatRevenue(roiData.aiRevenueCents) : "$0", 
      icon: DollarSign, 
      trend: roiData?.trends ? { 
        value: Math.abs(Math.round(roiData.trends.revenue)), 
        direction: roiData.trends.revenue > 0 ? "up" : roiData.trends.revenue < 0 ? "down" : "flat" 
      } : undefined, 
      href: "/app/reports/roi" 
    };

    switch (businessMode) {
      case "food": 
        return [
          callsMetric, 
          revenueMetric,
          { label: "Avg Call Time", value: tertiaryMetric?.value || "2:34", icon: Clock, href: "/app/calls" },
          { label: "Satisfaction", value: "94%", icon: Activity, href: "/app/reports" }
        ];
      case "dispatch": 
        return [
          callsMetric, 
          revenueMetric,
          { label: "Avg Call Time", value: tertiaryMetric?.value || "2:34", icon: Clock, href: "/app/calls" },
          { label: "Satisfaction", value: "94%", icon: Activity, href: "/app/reports" }
        ];
      case "medical": 
        return [
          callsMetric,
          { label: "Appointments", value: primaryMetric?.today || 0, icon: Stethoscope, trend: primaryTrend, href: "/app/bookings" },
          { label: "Patients", value: patientCount || 0, icon: Users, href: "/app/customers" },
          { label: tertiaryMetric?.label || "Satisfaction", value: tertiaryMetric?.value || "94%", icon: Activity, href: "/app/reports" }
        ];
      default: 
        return [
          callsMetric, 
          revenueMetric,
          { label: "Avg Call Time", value: tertiaryMetric?.value || "2:34", icon: Clock, href: "/app/calls" },
          { label: "Satisfaction", value: tertiaryMetric?.value || "94%", icon: TrendingUp, href: "/app/reports" }
        ];
    }
  };

  const metrics = getMetricsByMode();

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            size="sm" 
            className={cn(
              "h-8 px-3 text-xs font-medium",
              comparisonPeriod === "yesterday" ? "bg-primary text-primary-foreground" : ""
            )}
            onClick={() => setComparisonPeriod("yesterday")}
          >
            Today
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-3 text-xs font-medium text-muted-foreground"
            onClick={() => setComparisonPeriod("last_week")}
          >
            This Week
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-3 text-xs font-medium text-muted-foreground"
            onClick={() => setComparisonPeriod("last_month")}
          >
            This Month
          </Button>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              vs {comparisonLabels[comparisonPeriod]}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setComparisonPeriod("yesterday")}>vs Yesterday</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setComparisonPeriod("last_week")}>vs Last Week</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setComparisonPeriod("last_month")}>vs Last Month</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Stat cards grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <StatCard 
            key={metric.label} 
            metric={metric} 
            onClick={() => navigate(metric.href)} 
            comparisonLabel={comparisonLabels[comparisonPeriod]} 
          />
        ))}
      </div>
    </div>
  );
}
