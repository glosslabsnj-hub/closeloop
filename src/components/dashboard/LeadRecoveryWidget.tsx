import { Link } from "react-router-dom";
import { RefreshCw, Clock, TrendingUp, TrendingDown, ArrowRight, DollarSign, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLeadRecoveryDashboard } from "@/hooks/useLeadRecoveryDashboard";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function LeadRecoveryWidget() {
  const [period, setPeriod] = useState<"month" | "week">("month");
  const { data, isLoading } = useLeadRecoveryDashboard(period);

  if (isLoading) {
    return <LeadRecoveryWidgetSkeleton />;
  }

  // Empty state - recovery not enabled or no campaigns
  if (!data || (!data.isEnabled && data.currentMonth.campaignsStarted === 0)) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Lead Recovery</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="rounded-full bg-muted p-4 mx-auto w-fit mb-4">
            <RefreshCw className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground">Recover More Leads</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Automatically follow up with leads who don't book on their first call.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/app/settings/recovery">
              Enable Lead Recovery
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const leadsChange = data.currentMonth.leadsRecovered - data.previousMonth.leadsRecovered;
  const revenueChange = data.currentMonth.recoveredRevenueCents - data.previousMonth.recoveredRevenueCents;

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Lead Recovery</CardTitle>
        <Select value={period} onValueChange={(v) => setPeriod(v as "month" | "week")}>
          <SelectTrigger className="w-32 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Top metrics row */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            icon={<RefreshCw className="w-4 h-4" />}
            label="Leads Recovered"
            value={data.currentMonth.leadsRecovered.toString()}
            change={leadsChange}
            changeLabel="vs last"
            colorClass="text-emerald-600 dark:text-emerald-400"
            bgClass="bg-emerald-50 dark:bg-emerald-950/30"
          />
          <MetricCard
            icon={<DollarSign className="w-4 h-4" />}
            label="Revenue Saved"
            value={formatCurrency(data.currentMonth.recoveredRevenueCents)}
            change={revenueChange}
            changeLabel=""
            formatChange={(v) => formatCurrency(Math.abs(v))}
            colorClass="text-emerald-600 dark:text-emerald-400"
            bgClass="bg-emerald-50 dark:bg-emerald-950/30"
          />
          <MetricCard
            icon={<Target className="w-4 h-4" />}
            label="Recovery Rate"
            value={`${data.currentMonth.recoveryRate.toFixed(0)}%`}
            colorClass="text-blue-600 dark:text-blue-400"
            bgClass="bg-blue-50 dark:bg-blue-950/30"
          />
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{data.activeCampaigns}</span> in active recovery
            </span>
          </div>
          <span className="text-muted-foreground/50">·</span>
          <div className="flex items-center gap-2">
            <Clock className={cn(
              "w-4 h-4",
              data.awaitingResponse > 0 ? "text-amber-500" : "text-muted-foreground"
            )} />
            <span className="text-muted-foreground">
              <span className={cn(
                "font-medium",
                data.awaitingResponse > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
              )}>
                {data.awaitingResponse}
              </span> awaiting response
            </span>
            {data.awaitingResponse > 0 && (
              <Badge 
                variant="outline" 
                className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800 animate-pulse text-xs"
              >
                Needs attention
              </Badge>
            )}
          </div>
        </div>

        {/* Footer links */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
            <Link to="/app/leads/recovery">View Recovery Queue</Link>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
            <Link to="/app/settings/recovery">
              Configure
              <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: number;
  changeLabel?: string;
  formatChange?: (value: number) => string;
  colorClass?: string;
  bgClass?: string;
}

function MetricCard({
  icon,
  label,
  value,
  change,
  changeLabel,
  formatChange,
  colorClass = "text-foreground",
  bgClass = "bg-muted",
}: MetricCardProps) {
  const hasChange = change !== undefined && change !== 0;
  const isPositive = (change || 0) >= 0;

  return (
    <div className={cn("p-3 rounded-lg", bgClass)}>
      <div className={cn("flex items-center gap-1.5 mb-1", colorClass)}>
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider opacity-80">
          {label}
        </span>
      </div>
      <div className={cn("text-2xl font-bold", colorClass)}>{value}</div>
      {hasChange && (
        <div className="flex items-center gap-1 mt-1">
          {isPositive ? (
            <TrendingUp className="w-3 h-3 text-emerald-500" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-500" />
          )}
          <span className={cn(
            "text-xs font-medium",
            isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          )}>
            {isPositive ? "+" : "-"}
            {formatChange ? formatChange(change) : Math.abs(change)}
          </span>
          {changeLabel && (
            <span className="text-xs text-muted-foreground">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

function LeadRecoveryWidgetSkeleton() {
  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-28" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-lg bg-muted/50">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="flex justify-between pt-2 border-t border-border/50">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 10000) {
    return `$${(dollars / 1000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);
}
