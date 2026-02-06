import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { 
  startOfDay, 
  subDays, 
  format, 
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { cn } from "@/lib/utils";

type TimeRange = "7d" | "14d" | "30d";

export function DashboardCallChart() {
  const { tenant } = useAuth();
  const [range, setRange] = useState<TimeRange>("7d");

  const daysMap: Record<TimeRange, number> = { "7d": 7, "14d": 14, "30d": 30 };
  const days = daysMap[range];

  const { data: chartData, isLoading } = useQuery({
    queryKey: ["call-chart", tenant?.id, range],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const startDate = startOfDay(subDays(new Date(), days - 1));
      const endDate = new Date();

      const { data: calls, error } = await supabase
        .from("ai_call_sessions")
        .select("started_at, outcome")
        .eq("tenant_id", tenant.id)
        .gte("started_at", startDate.toISOString())
        .lte("started_at", endDate.toISOString());

      if (error) throw error;

      // Build day buckets
      const interval = eachDayOfInterval({ start: startDate, end: endDate });
      const buckets: Record<string, { total: number; booked: number }> = {};

      interval.forEach((date) => {
        const key = format(date, "yyyy-MM-dd");
        buckets[key] = { total: 0, booked: 0 };
      });

      // Fill buckets
      calls?.forEach((call) => {
        const key = format(new Date(call.started_at), "yyyy-MM-dd");
        if (buckets[key]) {
          buckets[key].total++;
          if (call.outcome === "booked") {
            buckets[key].booked++;
          }
        }
      });

      // Convert to array
      return interval.map((date) => {
        const key = format(date, "yyyy-MM-dd");
        const dayLabel = days <= 7 
          ? format(date, "EEE") // Mon, Tue, etc
          : format(date, "M/d"); // 1/15, 1/16, etc

        return {
          date: key,
          label: dayLabel,
          calls: buckets[key].total,
          booked: buckets[key].booked,
        };
      });
    },
    enabled: !!tenant?.id,
  });

  const totalCalls = chartData?.reduce((sum, d) => sum + d.calls, 0) || 0;
  const totalBooked = chartData?.reduce((sum, d) => sum + d.booked, 0) || 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Call Volume</CardTitle>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            {(["7d", "14d", "30d"] as TimeRange[]).map((r) => (
              <Button
                key={r}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2.5 text-xs font-medium",
                  range === r 
                    ? "bg-background shadow-sm text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setRange(r)}
              >
                {r === "7d" ? "7 Days" : r === "14d" ? "2 Weeks" : "30 Days"}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground">
              {totalCalls} total calls
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-success" />
            <span className="text-xs text-muted-foreground">
              {totalBooked} booked
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : chartData && chartData.length > 0 ? (
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false} 
                  stroke="hsl(var(--border))" 
                  strokeOpacity={0.5}
                />
                <XAxis 
                  dataKey="label" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  dy={8}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  allowDecimals={false}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border border-border/50 bg-popover px-3 py-2 shadow-lg">
                        <p className="text-xs font-medium text-foreground mb-1">{label}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="text-primary font-medium">{payload[0]?.value}</span> calls
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="text-success font-medium">{payload[1]?.value}</span> booked
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar 
                  dataKey="calls" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar 
                  dataKey="booked" 
                  fill="hsl(var(--success))" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No call data yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
