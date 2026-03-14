import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Phone,
  Target,
  TrendingUp,
  Award,
  HelpCircle,
  ChevronDown,
  TestTube,
  Settings,
  BarChart3,
  Truck,
  Scissors,
  UtensilsCrossed,
  Stethoscope,
  Building,
  RefreshCw,
  ArrowRight,
  Share2,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
} from "recharts";
import { useROIReport, type DateRangeOption, type RevenueByServiceItem } from "@/hooks/useROIReport";
import type { HeroIconName } from "@/config/industryRevenueConfig";
import {
  formatRevenue,
  formatROI,
  getROIExplanation,
  buildStoryHeadline,
  getROIBadge,
  getWinMessage,
  getReceptionistComparison,
  getMonthsFreeComparison,
  getHoursSavedEstimate,
} from "@/lib/revenueUtils";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DATE_RANGE_OPTIONS: { value: DateRangeOption; label: string }[] = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "last_6_months", label: "Last 6 Months" },
];

const CHART_COLORS = {
  ai: "hsl(160, 60%, 45%)",
  recovery: "hsl(142, 70%, 45%)", // Green for recovery
  manual: "hsl(220, 15%, 50%)",
  primary: "hsl(var(--primary))",
};

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
        <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help inline-block ml-1" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-5 w-80" />
          <Skeleton className="h-4 w-full max-w-lg" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card><CardContent className="p-6"><Skeleton className="h-32" /></CardContent></Card>
    </div>
  );
}

function RevenueBySourceChart({ ai, manual, recovery = 0 }: { ai: number; manual: number; recovery?: number }) {
  const total = ai + manual + recovery;
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No revenue data yet
      </div>
    );
  }

  const data = [
    { name: "AI-Attributed", value: ai, color: CHART_COLORS.ai },
    { name: "Lead Recovery", value: recovery, color: CHART_COLORS.recovery },
    { name: "Manual", value: manual, color: CHART_COLORS.manual },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex items-center gap-6">
      <div className="w-40 h-40 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={65}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-3">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-muted-foreground">{entry.name}</span>
            <span className="text-sm font-medium ml-auto">
              {formatRevenue(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConversionFunnelChart({
  funnel,
  entityName,
  funnelLabels,
}: {
  funnel: { totalCalls: number; callsWithOutcome: number; entitiesCreated: number; entitiesCompleted: number };
  entityName: string;
  funnelLabels?: [string, string, string, string];
}) {
  if (funnel.totalCalls === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No call data yet
      </div>
    );
  }

  const labels = funnelLabels || ["Calls", "Answered", `${entityName} Created`, "Completed"];
  const data = [
    { name: labels[0], value: funnel.totalCalls },
    { name: labels[1], value: funnel.callsWithOutcome },
    { name: labels[2], value: funnel.entitiesCreated },
    { name: labels[3], value: funnel.entitiesCompleted },
  ];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border) / 0.3)" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          width={110}
          axisLine={false}
          tickLine={false}
        />
        <RechartsTooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Bar dataKey="value" fill={CHART_COLORS.ai} radius={[0, 4, 4, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function RevenueTrendChart({ data }: { data: { monthLabel: string; aiRevenueCents: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-56 text-sm text-muted-foreground">
        Not enough data for trend chart
      </div>
    );
  }

  const chartData = data.map((d) => ({
    month: d.monthLabel,
    revenue: d.aiRevenueCents / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
        />
        <RechartsTooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value: number) => [`$${value.toLocaleString()}`, "AI Revenue"]}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke={CHART_COLORS.ai}
          strokeWidth={2}
          dot={{ fill: CHART_COLORS.ai, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

const SERVICE_COLORS = [
  "hsl(160, 60%, 45%)",
  "hsl(200, 60%, 50%)",
  "hsl(260, 50%, 55%)",
  "hsl(30, 70%, 50%)",
  "hsl(340, 60%, 50%)",
  "hsl(180, 50%, 45%)",
  "hsl(80, 50%, 45%)",
  "hsl(310, 50%, 50%)",
];

function RevenueByServiceChart({ items, bookingsLabel }: { items: RevenueByServiceItem[]; bookingsLabel: string }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No service revenue data yet
      </div>
    );
  }

  const chartData = items.slice(0, 8).map((item, i) => ({
    name: item.serviceName,
    revenue: item.revenueCents / 100,
    count: item.count,
    color: SERVICE_COLORS[i % SERVICE_COLORS.length],
  }));

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 40)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border) / 0.3)" />
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            width={120}
            axisLine={false}
            tickLine={false}
          />
          <RechartsTooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number, _name: string, props: any) => [
              `$${value.toLocaleString()} (${props.payload.count} ${bookingsLabel})`,
              "Revenue",
            ]}
          />
          <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={24}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ReportEmpty({
  steps,
  encouragement,
  heroIcon,
}: {
  steps: [string, string, string];
  encouragement: string;
  heroIcon: HeroIconName;
}) {
  const navigate = useNavigate();
  const _HeroIcon = HERO_ICONS[heroIcon];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
      <div className="h-14 w-14 rounded-2xl bg-muted/60 border border-border/30 flex items-center justify-center">
        <BarChart3 className="h-7 w-7 text-muted-foreground/70" />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Your Revenue Report</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Once your AI starts handling calls, this report will show your revenue, ROI, and trends.
        </p>
      </div>

      {/* Step-by-step flow */}
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-2 text-sm text-muted-foreground">
        {steps.map((step, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="hidden sm:inline text-muted-foreground/30">&rarr;</span>}
            <span className="inline-flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              {step}
            </span>
          </span>
        ))}
      </div>

      {/* Two CTAs */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => navigate("/app/simulator")}
          className="gap-2"
        >
          <TestTube className="h-4 w-4" />
          Make a Test Call
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigate("/app/business-brain")}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          AI Setup
        </Button>
      </div>

      <p className="text-xs text-muted-foreground/60 max-w-sm">
        {encouragement}
      </p>
    </div>
  );
}

export default function ReportsROIPage() {
  const _navigate = useNavigate();
  const { tenant } = useAuth();
  const [dateRange, setDateRange] = useState<DateRangeOption>("this_month");
  const [chartsOpen, setChartsOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const { data, isLoading, error: reportError, refetch } = useROIReport(dateRange);
  const { terms } = useIndustryContext();

  const handleShareReport = useCallback(async () => {
    if (!tenant?.id) return;
    try {
      const { data: settings, error } = await supabase
        .from("tenant_revenue_settings" as any)
        .select("share_token")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error) throw error;
      const token = (settings as any)?.share_token;
      if (!token) {
        toast.error("Share token not available. Try again later.");
        return;
      }
      const url = `${window.location.origin}/roi/${tenant.id}/${token}`;
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      toast.success("Share link copied to clipboard");
      setTimeout(() => setShareCopied(false), 2000);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate share link");
    }
  }, [tenant?.id]);

  const _HeroIcon = data ? HERO_ICONS[data.heroIcon] : BarChart3;

  // Override static entityName with industry-aware terminology
  // e.g. plumber sees "Jobs" instead of generic "Appointments"
  const entityName = terms.bookingsMetricLabel || data?.entityName || "Bookings";
  const entityNameLower = terms.bookings || data?.entityName.toLowerCase() || "bookings";
  const entityNameSingularLower = terms.booking || data?.entityNameSingular?.toLowerCase() || entityNameLower.replace(/s$/, '');

  // Build story-driven content when we have data
  // Use singular form when count = 1 (e.g. "1 job" not "1 jobs")
  const storyHeadline = data
    ? buildStoryHeadline(data.storyTemplate, {
        verb: data.actionVerbPast,
        count: data.entitiesCreated,
        entity: data.entitiesCreated === 1 ? entityNameSingularLower : entityNameLower,
        value: formatRevenue(data.aiRevenueCents),
      })
    : "";

  const hasData = data && (data.totalCalls > 0 || data.entitiesCreated > 0);

  if (reportError) {
    return (
      <TooltipProvider>
        <PageContainer maxWidth="xl">
          <div className="mx-auto max-w-lg py-16">
            <Card>
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-7 w-7 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold">Couldn't load your revenue report</h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  This is usually a temporary connection issue. Try again, or come back in a minute.
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                  Try again
                </Button>
                <div className="flex items-center justify-center gap-3 text-sm">
                  <Link to="/app" className="text-primary hover:underline">Back to Dashboard</Link>
                  <span className="text-border">·</span>
                  <a href="mailto:support@getfluxdata.com" className="text-muted-foreground hover:underline">Contact Support</a>
                </div>
              </CardContent>
            </Card>
          </div>
        </PageContainer>
      </TooltipProvider>
    );
  }

  return (
    <ErrorBoundary context="loading your reports">
    <TooltipProvider>
      <PageContainer maxWidth="xl">
        <PageHeader
          title="Revenue Report"
          description={hasData ? storyHeadline : "Track your AI-generated revenue and ROI"}
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareReport}
                disabled={!hasData}
              >
                {shareCopied ? <Check className="h-4 w-4 mr-1" /> : <Share2 className="h-4 w-4 mr-1" />}
                {shareCopied ? "Copied!" : "Share Report"}
              </Button>
              <Select
                value={dateRange}
                onValueChange={(v) => setDateRange(v as DateRangeOption)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />

        {isLoading || !data ? (
          <ReportSkeleton />
        ) : !hasData ? (
          <ReportEmpty
            steps={data.emptyStateSteps}
            encouragement={data.emptyStateEncouragement}
            heroIcon={data.heroIcon}
          />
        ) : (
          <div className="space-y-6">
            {/* Narrative Summary Card (Level 1 — Glance) */}
            <NarrativeSummary data={data} storyHeadline={storyHeadline} />

            {/* Key Metrics (Level 2 — Overview) */}
            <KeyMetrics data={data} bookingLabel={terms.booking} bookingsLabel={terms.bookings} entityName={entityName} />

            {/* ROI Breakdown */}
            <ROIBreakdown data={data} />

            {/* Lead Recovery Impact - only show if there's recovery data */}
            {(data.leadsRecovered > 0 || data.totalRecoveryCampaigns > 0) && (
              <LeadRecoveryImpact data={data} />
            )}

            {/* Deep Dive: Charts & Trends (collapsible) */}
            <Collapsible open={chartsOpen} onOpenChange={setChartsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full flex items-center justify-between py-3 px-4 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <span>Deep Dive: Charts & Trends</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      chartsOpen && "rotate-180"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-6 pt-2">
                {/* Charts Row */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="bg-card/60 backdrop-blur-sm border-border/30">
                    <CardHeader>
                      <CardTitle>Revenue by Source</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RevenueBySourceChart
                        ai={data.revenueBySource.ai}
                        manual={data.revenueBySource.manual}
                        recovery={data.revenueBySource.recovery}
                      />
                    </CardContent>
                  </Card>

                  <Card className="bg-card/60 backdrop-blur-sm border-border/30">
                    <CardHeader>
                      <CardTitle>Conversion Funnel</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ConversionFunnelChart
                        funnel={data.conversionFunnel}
                        entityName={entityName}
                        funnelLabels={data.funnelLabels}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Revenue by Service Type */}
                {data.revenueByService.length > 0 && (
                  <Card className="bg-card/60 backdrop-blur-sm border-border/30">
                    <CardHeader>
                      <CardTitle>Revenue by Service</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RevenueByServiceChart items={data.revenueByService} bookingsLabel={terms.bookings} />
                    </CardContent>
                  </Card>
                )}

                {/* Revenue Trend */}
                {data.monthlyData.length > 1 && (
                  <Card className="bg-card/60 backdrop-blur-sm border-border/30">
                    <CardHeader>
                      <CardTitle>Revenue Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RevenueTrendChart data={data.monthlyData} />
                    </CardContent>
                  </Card>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </PageContainer>
    </TooltipProvider>
    </ErrorBoundary>
  );
}

// --- Sub-components for the report page ---

function NarrativeSummary({
  data,
  storyHeadline,
}: {
  data: NonNullable<ReturnType<typeof useROIReport>["data"]>;
  storyHeadline: string;
}) {
  const HeroIcon = HERO_ICONS[data.heroIcon];

  const winMessage = getWinMessage(
    {
      entitiesCreated: data.entitiesCreated,
      aiRevenueCents: data.aiRevenueCents,
      trends: { calls: data.trends.calls },
    },
    data.celebratoryTone
  );

  const hoursSaved = getHoursSavedEstimate(data.totalCalls);
  const receptionistWeeks = getReceptionistComparison(data.aiRevenueCents);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <HeroIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-2 min-w-0">
            <h2 className="text-base font-semibold text-foreground">
              {storyHeadline}
            </h2>
            <p className="text-sm text-muted-foreground">
              Your AI handled {data.totalCalls} {data.callsLabel.toLowerCase()} with a{" "}
              {Math.round(data.conversionRate)}% conversion rate.
              {hoursSaved && ` ${hoursSaved}.`}
            </p>
            {receptionistWeeks && (
              <p className="text-sm text-muted-foreground/80">
                {receptionistWeeks}.
              </p>
            )}
            {winMessage && (
              <p className="text-sm text-primary/80 font-medium">
                {winMessage}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KeyMetrics({
  data,
  bookingLabel,
  bookingsLabel,
  entityName,
}: {
  data: NonNullable<ReturnType<typeof useROIReport>["data"]>;
  bookingLabel: string;
  bookingsLabel: string;
  entityName: string;
}) {
  const roiBadge = getROIBadge(data.roiMultiplier, data.celebratoryTone);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
      {/* AI Revenue */}
      <Card className="card-elevated card-interactive border-success/20 bg-success/5 backdrop-blur-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">
              AI Revenue
              <InfoTooltip text={`Revenue from ${bookingsLabel} created by your AI agent`} />
            </p>
            <div className="p-2 rounded-lg bg-success/10 text-success">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[28px] font-bold tracking-tight leading-none">{formatRevenue(data.aiRevenueCents)}</p>
          {data.trends.revenue !== 0 && (
            <TrendLine value={data.trends.revenue} />
          )}
        </CardContent>
      </Card>

      {/* Calls */}
      <Card className="card-elevated card-interactive bg-card/60 backdrop-blur-sm border-border/30">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">{data.callsLabel}</p>
            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
              <Phone className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[28px] font-bold tracking-tight leading-none">{data.totalCalls}</p>
          {data.trends.calls !== 0 && (
            <TrendLine value={data.trends.calls} />
          )}
        </CardContent>
      </Card>

      {/* Entities */}
      <Card className="card-elevated card-interactive bg-card/60 backdrop-blur-sm border-border/30">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">{entityName}</p>
            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[28px] font-bold tracking-tight leading-none">{data.entitiesCreated}</p>
          {data.trends.entities !== 0 && (
            <TrendLine value={data.trends.entities} />
          )}
        </CardContent>
      </Card>

      {/* Conversion */}
      <Card className="card-elevated card-interactive bg-card/60 backdrop-blur-sm border-border/30">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Conversion
              <InfoTooltip text={`Percentage of calls that resulted in a ${bookingLabel}`} />
            </p>
            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[28px] font-bold tracking-tight leading-none">{Math.round(data.conversionRate)}%</p>
          {data.trends.conversion !== 0 && (
            <TrendLine value={data.trends.conversion} />
          )}
        </CardContent>
      </Card>

      {/* ROI */}
      <Card className="card-elevated card-interactive border-primary/20 bg-primary/5 backdrop-blur-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">
              ROI
              <InfoTooltip text="Return on investment: AI revenue divided by subscription cost" />
            </p>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[28px] font-bold tracking-tight leading-none text-primary">{formatROI(data.roiMultiplier)}</p>
          {roiBadge && (
            <Badge variant={roiBadge.variant} size="sm" className="mt-1">
              {roiBadge.label}
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TrendLine({ value }: { value: number }) {
  const direction = value >= 0 ? "up" : "down";
  return (
    <div className="flex items-center gap-1 text-xs mt-1">
      {direction === "up" ? (
        <TrendingUp className="h-3 w-3 text-success" />
      ) : (
        <TrendingUp className="h-3 w-3 text-destructive rotate-180" />
      )}
      <span className={cn("font-medium", direction === "up" ? "text-success" : "text-destructive")}>
        {Math.abs(Math.round(value))}%
      </span>
      <span className="text-muted-foreground">vs last period</span>
    </div>
  );
}

function ROIBreakdown({
  data,
}: {
  data: NonNullable<ReturnType<typeof useROIReport>["data"]>;
}) {
  const roiBadge = getROIBadge(data.roiMultiplier, data.celebratoryTone);
  const receptionistWeeks = getReceptionistComparison(data.aiRevenueCents);
  const monthsFree = getMonthsFreeComparison(data.roiMultiplier);

  return (
    <Card>
      <CardHeader>
        <CardTitle>ROI Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-w-md space-y-4">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">
              Subscription cost
            </span>
            <span className="text-sm font-medium">
              {formatRevenue(data.subscriptionCostCents)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">
              AI-generated revenue
            </span>
            <span className="text-sm font-medium text-emerald-500">
              {formatRevenue(data.aiRevenueCents)}
            </span>
          </div>
          <div className="border-t border-border/50" />
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Your ROI</span>
              {roiBadge && (
                <Badge variant={roiBadge.variant} size="sm">
                  {roiBadge.label}
                </Badge>
              )}
            </div>
            <span className="text-xl font-bold text-primary">
              {formatROI(data.roiMultiplier)}
            </span>
          </div>

          {/* ROI explanation + real-world comparisons */}
          <div className="bg-muted/30 rounded-xl p-3 space-y-2">
            <p className="text-sm text-muted-foreground">
              {getROIExplanation(data.roiMultiplier)}
            </p>
            {receptionistWeeks && (
              <p className="text-sm text-muted-foreground/80">
                {receptionistWeeks}.
              </p>
            )}
            {monthsFree && (
              <p className="text-sm text-muted-foreground/80">
                {monthsFree}.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LeadRecoveryImpact({
  data,
}: {
  data: NonNullable<ReturnType<typeof useROIReport>["data"]>;
}) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  return (
    <Card className="border-success/20 bg-success/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCw className="h-4 w-4 text-success" />
          Lead Recovery Impact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-success">{data.leadsRecovered}</p>
            <p className="text-sm text-muted-foreground">Leads Recovered</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">
              {formatCurrency(data.recoveredRevenueCents)}
            </p>
            <p className="text-sm text-muted-foreground">Revenue Saved</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{data.recoveryRate.toFixed(0)}%</p>
            <p className="text-sm text-muted-foreground">Recovery Rate</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          These are customers who didn't book on their first call but converted
          after automated follow-up.
        </p>

        <Button variant="link" asChild className="p-0 h-auto">
          <Link to="/app/leads/recovery?status=converted" className="flex items-center gap-1">
            View Recovered Leads <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
