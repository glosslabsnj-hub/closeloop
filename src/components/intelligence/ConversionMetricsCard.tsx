/**
 * ConversionMetricsCard - Shows key call conversion metrics at a glance
 */

import { Phone, TrendingUp, TrendingDown, Clock, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversionMetrics } from "@/hooks/useIntelligence";

interface MetricBoxProps {
  label: string;
  value: string;
  subtext?: string;
  icon: typeof Phone;
  trend?: "up" | "down" | "neutral";
}

function MetricBox({ label, value, subtext, icon: Icon, trend }: MetricBoxProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
      <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-muted shrink-0">
        <Icon className="h-4.5 w-4.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1.5">
          <p className="text-lg font-semibold tabular-nums">{value}</p>
          {trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-green-600" />}
          {trend === "down" && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
        </div>
        {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
      </div>
    </div>
  );
}

interface ConversionMetricsCardProps {
  days?: number;
  className?: string;
}

export function ConversionMetricsCard({ days = 7, className }: ConversionMetricsCardProps) {
  const { metrics, isLoading } = useConversionMetrics(days);

  if (isLoading) {
    return (
      <div className={cn("rounded-lg border bg-card p-4", className)}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-muted/50 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (metrics.totalCalls === 0) {
    return (
      <div className={cn("rounded-lg border bg-card p-6 text-center", className)}>
        <Phone className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">No calls tracked yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Conversion metrics will appear here after your AI handles some calls.
        </p>
      </div>
    );
  }

  const avgMinutes = Math.round(metrics.avgDurationSeconds / 60);
  const revenueEstimate = (metrics.totalRevenueCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  });

  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Last {days} Days</h3>
        <span className="text-xs text-muted-foreground">{metrics.totalCalls} calls</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricBox
          label="Conversion Rate"
          value={`${Math.round(metrics.conversionRate * 100)}%`}
          subtext={`${metrics.convertedCalls} converted`}
          icon={TrendingUp}
          trend={metrics.conversionRate >= 0.5 ? "up" : metrics.conversionRate < 0.3 ? "down" : "neutral"}
        />
        <MetricBox
          label="Est. Revenue"
          value={revenueEstimate}
          subtext="from AI-handled calls"
          icon={DollarSign}
        />
        <MetricBox
          label="Avg Call Length"
          value={`${avgMinutes} min`}
          subtext={`${metrics.totalCalls} total calls`}
          icon={Clock}
        />
        <MetricBox
          label="AI Handled"
          value={`${Math.round((1 - metrics.escalationRate) * 100)}%`}
          subtext={`${Object.entries(metrics.outcomeBreakdown).filter(([k]) => k === "transferred").reduce((s, [, v]) => s + v, 0)} escalated`}
          icon={Phone}
          trend={metrics.escalationRate < 0.15 ? "up" : metrics.escalationRate > 0.3 ? "down" : "neutral"}
        />
      </div>
    </div>
  );
}
