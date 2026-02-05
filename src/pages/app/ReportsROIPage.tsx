import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  DollarSign,
  Phone,
  Target,
  TrendingUp,
  Award,
} from "lucide-react";
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
  Tooltip,
  LineChart,
  Line,
} from "recharts";
import { useROIReport, type DateRangeOption } from "@/hooks/useROIReport";
import {
  formatRevenue,
  formatROI,
  getROIExplanation,
} from "@/lib/revenueUtils";

const DATE_RANGE_OPTIONS: { value: DateRangeOption; label: string }[] = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "last_6_months", label: "Last 6 Months" },
];

const CHART_COLORS = {
  ai: "hsl(160, 60%, 45%)",
  manual: "hsl(220, 15%, 50%)",
  primary: "hsl(var(--primary))",
};

function ReportSkeleton() {
  return (
    <div className="space-y-6">
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
      <div className="grid md:grid-cols-2 gap-6">
        <Card><CardContent className="p-6"><Skeleton className="h-48" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-48" /></CardContent></Card>
      </div>
      <Card><CardContent className="p-6"><Skeleton className="h-56" /></CardContent></Card>
    </div>
  );
}

function RevenueBySourceChart({ ai, manual }: { ai: number; manual: number }) {
  const total = ai + manual;
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No revenue data yet
      </div>
    );
  }

  const data = [
    { name: "AI-Attributed", value: ai, color: CHART_COLORS.ai },
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
}: {
  funnel: { totalCalls: number; callsWithOutcome: number; entitiesCreated: number; entitiesCompleted: number };
  entityName: string;
}) {
  if (funnel.totalCalls === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No call data yet
      </div>
    );
  }

  const data = [
    { name: "Calls", value: funnel.totalCalls },
    { name: "Answered", value: funnel.callsWithOutcome },
    { name: `${entityName} Created`, value: funnel.entitiesCreated },
    { name: "Completed", value: funnel.entitiesCompleted },
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
        <Tooltip
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
        <Tooltip
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

export default function ReportsROIPage() {
  const [dateRange, setDateRange] = useState<DateRangeOption>("this_month");
  const { data, isLoading } = useROIReport(dateRange);

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        icon={<BarChart3 className="h-5 w-5" />}
        title="Revenue Report"
        description="Track your AI-generated revenue and ROI"
        action={
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
        }
      />

      {isLoading || !data ? (
        <ReportSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            <StatCard
              label="AI Revenue"
              value={formatRevenue(data.aiRevenueCents)}
              icon={DollarSign}
              variant="success"
              trend={
                data.trends.revenue
                  ? {
                      value: Math.round(data.trends.revenue),
                      label: "vs last period",
                      direction: data.trends.revenue >= 0 ? "up" : "down",
                    }
                  : undefined
              }
            />
            <StatCard
              label="Total Calls"
              value={String(data.totalCalls)}
              icon={Phone}
              trend={
                data.trends.calls
                  ? {
                      value: Math.round(data.trends.calls),
                      label: "vs last period",
                      direction: data.trends.calls >= 0 ? "up" : "down",
                    }
                  : undefined
              }
            />
            <StatCard
              label={data.entityName}
              value={String(data.entitiesCreated)}
              icon={Target}
              trend={
                data.trends.entities
                  ? {
                      value: Math.round(data.trends.entities),
                      label: "vs last period",
                      direction: data.trends.entities >= 0 ? "up" : "down",
                    }
                  : undefined
              }
            />
            <StatCard
              label="Conversion"
              value={`${Math.round(data.conversionRate)}%`}
              icon={TrendingUp}
              trend={
                data.trends.conversion
                  ? {
                      value: Math.round(data.trends.conversion),
                      label: "vs last period",
                      direction: data.trends.conversion >= 0 ? "up" : "down",
                    }
                  : undefined
              }
            />
            <StatCard
              label="ROI"
              value={formatROI(data.roiMultiplier)}
              icon={Award}
              variant="primary"
            />
          </div>

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Source</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueBySourceChart
                  ai={data.revenueBySource.ai}
                  manual={data.revenueBySource.manual}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <ConversionFunnelChart
                  funnel={data.conversionFunnel}
                  entityName={data.entityName}
                />
              </CardContent>
            </Card>
          </div>

          {/* Revenue Trend */}
          {data.monthlyData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueTrendChart data={data.monthlyData} />
              </CardContent>
            </Card>
          )}

          {/* ROI Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>ROI Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-md space-y-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">
                    Your subscription cost
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
                  <span className="text-sm font-medium">Your ROI</span>
                  <span className="text-xl font-bold text-primary">
                    {formatROI(data.roiMultiplier)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                  {getROIExplanation(data.roiMultiplier)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
