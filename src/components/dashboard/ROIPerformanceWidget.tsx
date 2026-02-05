import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Phone,
  Target,
  ArrowRight,
  TestTube,
} from "lucide-react";
import { useROIDashboard } from "@/hooks/useROIDashboard";
import {
  formatRevenue,
  formatTrend,
  formatROI,
  getROIExplanation,
  formatCountChange,
} from "@/lib/revenueUtils";
import { cn } from "@/lib/utils";

function TrendIndicator({ percent }: { percent: number }) {
  const { value, direction } = formatTrend(percent);
  if (direction === "flat") return null;

  const Icon = direction === "up" ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        direction === "up" ? "text-emerald-500" : "text-red-400"
      )}
    >
      <Icon className="h-3 w-3" />
      {value}
    </span>
  );
}

function MetricCell({
  label,
  value,
  trend,
  subtext,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  trend?: number;
  subtext?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center bg-muted/50",
            accent
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl md:text-3xl font-bold tracking-tight">{value}</p>
      <div className="flex items-center gap-2">
        {trend !== undefined && trend !== 0 && <TrendIndicator percent={trend} />}
        {subtext && (
          <span className="text-xs text-muted-foreground">{subtext}</span>
        )}
      </div>
    </div>
  );
}

function WidgetSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WidgetEmpty({
  message,
  cta,
}: {
  message: string;
  cta: string;
}) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Your AI Performance
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-primary/60" />
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/app/simulator")}
            className="gap-1.5"
          >
            <TestTube className="h-3.5 w-3.5" />
            {cta}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ROIPerformanceWidget() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useROIDashboard();

  if (isLoading) return <WidgetSkeleton />;

  if (error || !data) return null;

  if (!data.hasData) {
    return (
      <WidgetEmpty
        message={data.emptyStateMessage}
        cta={data.emptyStateCta}
      />
    );
  }

  const roiDisplay = formatROI(data.roiMultiplier);
  const roiExplanation = getROIExplanation(data.roiMultiplier);
  const entityChange = data.previousMonth
    ? formatCountChange(
        data.entitiesCreated - data.previousMonth.entitiesCreated,
        data.entityName
      )
    : undefined;

  return (
    <Card>
      <CardContent className="p-5 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-medium text-muted-foreground">
            Your AI Performance
          </h3>
          <Badge variant="muted" size="sm">
            This Month
          </Badge>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-5 md:grid-cols-5 md:gap-6">
          {/* AI Revenue */}
          <MetricCell
            label="AI Revenue"
            value={formatRevenue(data.aiRevenueCents)}
            trend={data.trends.revenue}
            icon={DollarSign}
            accent="text-emerald-500"
          />

          {/* Entities Created */}
          <MetricCell
            label={`${data.entityName} ${data.actionVerbPast}`}
            value={data.entitiesCreated}
            trend={data.trends.entities}
            subtext={entityChange}
            icon={Target}
            accent="text-blue-500"
          />

          {/* Calls Handled */}
          <MetricCell
            label="Calls Handled"
            value={data.totalCalls}
            trend={data.trends.calls}
            icon={Phone}
            accent="text-violet-500"
          />

          {/* Conversion Rate */}
          <MetricCell
            label="Conversion Rate"
            value={`${Math.round(data.conversionRate)}%`}
            trend={data.trends.conversion}
            icon={TrendingUp}
            accent="text-amber-500"
          />

          {/* ROI Callout */}
          <div className="col-span-2 md:col-span-1">
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 h-full flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  ROI
                </p>
                <p className="text-3xl font-bold tracking-tight text-primary">
                  {roiDisplay}
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug mt-2">
                {roiExplanation}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 text-xs gap-1 px-0 justify-start text-primary hover:text-primary/80"
                onClick={() => navigate("/app/reports/roi")}
              >
                View Full Report
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
