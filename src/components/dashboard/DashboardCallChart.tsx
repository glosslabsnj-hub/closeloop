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
  Cell,
} from "recharts";
import { 
  startOfDay, 
  subDays, 
  format, 
  eachDayOfInterval,
} from "date-fns";
import { cn } from "@/lib/utils";

type TimeRange = "7d" | "14d" | "30d";
type DataView = "calls" | "booked" | "revenue";

export function DashboardCallChart() {
  const { tenant } = useAuth();
  const [range, setRange] = useState<TimeRange>("7d");
  const [dataView, setDataView] = useState<DataView>("calls");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const daysMap: Record<TimeRange, number> = { "7d": 7, "14d": 14, "30d": 30 };
  const days = daysMap[range];

  const { data: chartData, isLoading } = useQuery({
    queryKey: ["call-chart", tenant?.id, range],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const startDate = startOfDay(subDays(new Date(), days - 1));
      const endDate = new Date();

      // Fetch calls with booking info
      const { data: calls, error: callsError } = await supabase
        .from("ai_call_sessions")
        .select("started_at, outcome, booking_id")
        .eq("tenant_id", tenant.id)
        .gte("started_at", startDate.toISOString())
        .lte("started_at", endDate.toISOString());

      if (callsError) throw callsError;

      // Fetch bookings for revenue data
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("created_at, services(price)")
        .eq("tenant_id", tenant.id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (bookingsError) throw bookingsError;

      // Build day buckets
      const interval = eachDayOfInterval({ start: startDate, end: endDate });
      const buckets: Record<string, { total: number; booked: number; revenue: number }> = {};

      interval.forEach((date) => {
        const key = format(date, "yyyy-MM-dd");
        buckets[key] = { total: 0, booked: 0, revenue: 0 };
      });

      // Fill call buckets
      calls?.forEach((call) => {
        const key = format(new Date(call.started_at), "yyyy-MM-dd");
        if (buckets[key]) {
          buckets[key].total++;
          if (call.outcome === "booked") {
            buckets[key].booked++;
          }
        }
      });

      // Fill revenue buckets
      bookings?.forEach((booking) => {
        const key = format(new Date(booking.created_at), "yyyy-MM-dd");
        if (buckets[key]) {
          const price = (booking.services as any)?.price || 0;
          buckets[key].revenue += price;
        }
      });

      // Convert to array
      return interval.map((date) => {
        const key = format(date, "yyyy-MM-dd");
        const dayLabel = days <= 7 
          ? format(date, "EEE")
          : format(date, "M/d");

        return {
          date: key,
          label: dayLabel,
          calls: buckets[key].total,
          booked: buckets[key].booked,
          revenue: buckets[key].revenue,
        };
      });
    },
    enabled: !!tenant?.id,
  });

  const totalCalls = chartData?.reduce((sum, d) => sum + d.calls, 0) || 0;
  const totalBooked = chartData?.reduce((sum, d) => sum + d.booked, 0) || 0;
  const totalRevenue = chartData?.reduce((sum, d) => sum + d.revenue, 0) || 0;

  const getDataKey = () => {
    switch (dataView) {
      case "booked": return "booked";
      case "revenue": return "revenue";
      default: return "calls";
    }
  };

  const getBarColor = () => {
    switch (dataView) {
      case "booked": return "hsl(var(--success))";
      case "revenue": return "hsl(var(--warning))";
      default: return "hsl(var(--primary))";
    }
  };

  const formatValue = (value: number) => {
    if (dataView === "revenue") {
      return `$${value.toLocaleString()}`;
    }
    return value.toString();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg font-medium">Call Volume</CardTitle>
          <div className="flex items-center gap-2">
            {/* Data view toggle */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
              {(["calls", "booked", "revenue"] as DataView[]).map((v) => (
                <Button
                  key={v}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2.5 text-xs font-medium capitalize",
                    dataView === v 
                      ? "bg-background shadow-sm text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setDataView(v)}
                >
                  {v}
                </Button>
              ))}
            </div>
            {/* Time range toggle */}
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
                  {r === "7d" ? "7D" : r === "14d" ? "2W" : "30D"}
                </Button>
              ))}
            </div>
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
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-warning" />
            <span className="text-xs text-muted-foreground">
              ${totalRevenue.toLocaleString()} revenue
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
              <BarChart 
                data={chartData} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onMouseMove={(state) => {
                  if (state.activeTooltipIndex !== undefined) {
                    setActiveIndex(state.activeTooltipIndex);
                  }
                }}
                onMouseLeave={() => setActiveIndex(null)}
              >
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
                  tickFormatter={(value) => dataView === "revenue" ? `$${value}` : value}
                />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-border/50 bg-popover px-3 py-2 shadow-lg">
                        <p className="text-xs font-medium text-foreground mb-1">{label}</p>
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">
                            <span className="text-primary font-medium">{data.calls}</span> calls
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <span className="text-success font-medium">{data.booked}</span> booked
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <span className="text-warning font-medium">${data.revenue.toLocaleString()}</span> revenue
                          </p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar 
                  dataKey={getDataKey()} 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={getBarColor()}
                      opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                      style={{ transition: 'opacity 150ms' }}
                    />
                  ))}
                </Bar>
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
