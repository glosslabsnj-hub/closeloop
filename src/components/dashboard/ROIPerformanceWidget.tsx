import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Phone,
  Target,
  ArrowRight,
  TestTube,
  HelpCircle,
  Settings,
  Truck,
  Scissors,
  UtensilsCrossed,
  Stethoscope,
  Building,
  BarChart3,
} from "lucide-react";
import { useROIDashboard } from "@/hooks/useROIDashboard";
import type { HeroIconName } from "@/config/industryRevenueConfig";
import {
  formatRevenue,
  formatTrend,
  formatROI,
  getROIExplanation,
  formatCountChange,
  buildStoryHeadline,
  getROIBadge,
  getWinMessage,
} from "@/lib/revenueUtils";
import { cn } from "@/lib/utils";

const HERO_ICONS: Record<HeroIconName, React.ElementType> = {
  Truck,
  Scissors,
  UtensilsCrossed,
  Stethoscope,
  Building,
};

function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px] text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

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
  tooltip,
}: {
  label: string;
  value: string | number;
  trend?: number;
  subtext?: string;
  icon: React.ElementType;
  accent: string;
  tooltip?: string;
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
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {label}
          {tooltip && <InfoTooltip text={tooltip} />}
        </p>
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
          <Skeleton className="h-5 w-64" />
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
  steps,
  encouragement,
}: {
  steps: [string, string, string];
  encouragement: string;
}) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Your Revenue Report
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center space-y-5">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-primary/60" />
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Once your AI starts handling calls, this widget will show your revenue, ROI, and trends.
          </p>

          {/* Step-by-step flow */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {steps.map((step, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-muted-foreground/30">&rarr;</span>}
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  {step}
                </span>
              </span>
            ))}
          </div>

          {/* Two CTAs */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/app/simulator")}
              className="gap-1.5"
            >
              <TestTube className="h-3.5 w-3.5" />
              Make a Test Call
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/app/settings/ai")}
              className="gap-1.5"
            >
              <Settings className="h-3.5 w-3.5" />
              AI Settings
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground/60 max-w-sm">
            {encouragement}
          </p>
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
        steps={data.emptyStateSteps}
        encouragement={data.emptyStateEncouragement}
      />
    );
  }

  const roiDisplay = formatROI(data.roiMultiplier);
  const roiExplanation = getROIExplanation(data.roiMultiplier);
  const roiBadge = getROIBadge(data.roiMultiplier, data.celebratoryTone);
  const entityChange = data.previousMonth
    ? formatCountChange(
        data.entitiesCreated - data.previousMonth.entitiesCreated,
        data.entityName
      )
    : undefined;

  const storyHeadline = buildStoryHeadline(data.storyTemplate, {
    verb: data.actionVerbPast,
    count: data.entitiesCreated,
    entity: data.entityName.toLowerCase(),
    value: formatRevenue(data.aiRevenueCents),
  });

  const winMessage = getWinMessage(
    {
      entitiesCreated: data.entitiesCreated,
      aiRevenueCents: data.aiRevenueCents,
      trends: { calls: data.trends.calls },
    },
    data.celebratoryTone
  );

  return (
    <TooltipProvider>
      <Card>
        <CardContent className="p-5 md:p-6">
          {/* Header: story headline + badge */}
          <div className="flex items-start justify-between mb-2">
            <div className="space-y-1 min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {storyHeadline}
              </h3>
              {winMessage && (
                <p className="text-xs text-muted-foreground">
                  {winMessage}
                </p>
              )}
            </div>
            <Badge variant="muted" size="sm" className="flex-shrink-0 ml-3">
              This Month
            </Badge>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-5 md:grid-cols-5 md:gap-6 mt-5">
            {/* AI Revenue */}
            <MetricCell
              label="AI Revenue"
              value={formatRevenue(data.aiRevenueCents)}
              trend={data.trends.revenue}
              icon={DollarSign}
              accent="text-emerald-500"
              tooltip="Revenue from bookings created by your AI agent"
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

            {/* Calls — industry-native label */}
            <MetricCell
              label={data.callsLabel}
              value={data.totalCalls}
              trend={data.trends.calls}
              icon={Phone}
              accent="text-violet-500"
            />

            {/* Conversion Rate */}
            <MetricCell
              label="Conversion"
              value={`${Math.round(data.conversionRate)}%`}
              trend={data.trends.conversion}
              icon={TrendingUp}
              accent="text-amber-500"
              tooltip="Percentage of calls that resulted in a booking"
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
                  {roiBadge && (
                    <Badge variant={roiBadge.variant} size="sm" className="mt-1">
                      {roiBadge.label}
                    </Badge>
                  )}
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
    </TooltipProvider>
  );
}
