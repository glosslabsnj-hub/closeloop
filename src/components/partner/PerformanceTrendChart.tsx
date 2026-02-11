import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import { useCallOutcomes, type CallOutcome } from "@/hooks/useIntelligence";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformanceTrendChartProps {
  className?: string;
}

function groupByDay(outcomes: CallOutcome[]) {
  const dayMap = new Map<string, { total: number; converted: number }>();

  for (const o of outcomes) {
    const day = o.created_at.slice(0, 10); // YYYY-MM-DD
    const entry = dayMap.get(day) || { total: 0, converted: 0 };
    entry.total++;
    if (
      o.outcome_type === "booked" ||
      o.outcome_type === "order_placed" ||
      o.outcome_type === "dispatch_created"
    ) {
      entry.converted++;
    }
    dayMap.set(day, entry);
  }

  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, { total, converted }]) => ({
      date: day.slice(5), // MM-DD
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
      totalCalls: total,
    }));
}

export function PerformanceTrendChart({ className }: PerformanceTrendChartProps) {
  const { data: outcomes, isLoading } = useCallOutcomes(30);

  const chartData = useMemo(
    () => groupByDay(outcomes ?? []),
    [outcomes]
  );

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Conversion Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Conversion Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            No call data yet. Conversion trends will appear after your first calls.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Conversion Trend (30 days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
              className="text-muted-foreground"
            />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value}%`, "Conversion Rate"]}
            />
            <Line
              type="monotone"
              dataKey="conversionRate"
              stroke="hsl(160, 60%, 45%)"
              strokeWidth={2}
              dot={{ fill: "hsl(160, 60%, 45%)", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
