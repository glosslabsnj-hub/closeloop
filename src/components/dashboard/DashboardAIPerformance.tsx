import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useROIDashboard } from "@/hooks/useROIDashboard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  ArrowRight, 
  Target,
  Clock,
  Star,
  MessageSquare,
  Bot,
} from "lucide-react";
import { startOfMonth, endOfMonth } from "date-fns";

interface PerformanceMetric {
  label: string;
  value: string | number;
  icon: React.ElementType;
  progress?: number;
  subtext?: string;
}

export function DashboardAIPerformance() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const { data: roiData, isLoading: roiLoading } = useROIDashboard();

  const monthStart = startOfMonth(new Date()).toISOString();
  const monthEnd = endOfMonth(new Date()).toISOString();

  // Fetch call metrics for this month
  const { data: callMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["ai-performance", tenant?.id, monthStart],
    queryFn: async () => {
      if (!tenant?.id) return null;

      const { data: calls, error } = await supabase
        .from("ai_call_sessions")
        .select("outcome, started_at, ended_at")
        .eq("tenant_id", tenant.id)
        .gte("started_at", monthStart)
        .lte("started_at", monthEnd);

      if (error) throw error;

      const totalCalls = calls?.length || 0;
      const bookedCalls = calls?.filter(c => c.outcome === "booked").length || 0;
      // Count calls that have an outcome (were answered)
      const answeredCalls = calls?.filter(c => c.outcome).length || 0;

      // Calculate average call duration
      let totalDuration = 0;
      let durationCount = 0;
      calls?.forEach(call => {
        if (call.started_at && call.ended_at) {
          const duration = new Date(call.ended_at).getTime() - new Date(call.started_at).getTime();
          if (duration > 0 && duration < 60 * 60 * 1000) { // Less than 1 hour
            totalDuration += duration;
            durationCount++;
          }
        }
      });

      const avgDurationMs = durationCount > 0 ? totalDuration / durationCount : 0;
      const avgMinutes = Math.floor(avgDurationMs / 60000);
      const avgSeconds = Math.floor((avgDurationMs % 60000) / 1000);

      return {
        totalCalls,
        bookedCalls,
        answeredCalls,
        bookingRate: totalCalls > 0 ? Math.round((bookedCalls / totalCalls) * 100) : 0,
        answerRate: totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0,
        avgCallTime: `${avgMinutes}:${avgSeconds.toString().padStart(2, '0')}`,
      };
    },
    enabled: !!tenant?.id,
  });

  const isLoading = roiLoading || metricsLoading;

  const metrics: PerformanceMetric[] = [
    {
      label: "Booking Rate",
      value: `${callMetrics?.bookingRate || 0}%`,
      icon: Target,
      progress: callMetrics?.bookingRate,
      subtext: `${callMetrics?.bookedCalls || 0} of ${callMetrics?.totalCalls || 0} calls`,
    },
    {
      label: "Avg Call Time",
      value: callMetrics?.avgCallTime || "0:00",
      icon: Clock,
    },
    {
      label: "Answer Rate",
      value: `${callMetrics?.answerRate || 0}%`,
      icon: MessageSquare,
      progress: callMetrics?.answerRate,
    },
    {
      label: "Conversion",
      value: roiData ? `${Math.round(roiData.conversionRate)}%` : "0%",
      icon: Star,
      progress: roiData ? Math.round(roiData.conversionRate) : 0,
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">AI Performance</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-sm h-8 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/app/reports/roi")}
          >
            View Insights
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{metric.label}</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{metric.value}</span>
                  </div>
                  {metric.progress !== undefined && (
                    <Progress 
                      value={metric.progress} 
                      className="h-1.5"
                    />
                  )}
                  {metric.subtext && (
                    <p className="text-xs text-muted-foreground">{metric.subtext}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
