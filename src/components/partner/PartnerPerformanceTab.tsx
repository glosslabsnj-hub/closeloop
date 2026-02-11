import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, BarChart3, Phone, Percent } from "lucide-react";
import { ConversionMetricsCard } from "@/components/intelligence/ConversionMetricsCard";
import { PatternsList } from "@/components/intelligence/PatternsList";
import { WeeklyDigestCard } from "@/components/intelligence/WeeklyDigestCard";
import { PerformanceTrendChart } from "./PerformanceTrendChart";
import type { ROIDashboardData } from "@/hooks/useROIDashboard";

interface PartnerPerformanceTabProps {
  roiData: ROIDashboardData | null;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function PartnerPerformanceTab({ roiData }: PartnerPerformanceTabProps) {
  return (
    <div className="space-y-6">
      {/* Revenue Summary */}
      {roiData?.hasData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                <span className="text-xs">AI Revenue</span>
              </div>
              <p className="text-xl font-bold tabular-nums">
                {formatCents(roiData.aiRevenueCents)}
              </p>
              {roiData.trends.revenue !== 0 && (
                <p
                  className={`text-xs ${
                    roiData.trends.revenue > 0
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  {roiData.trends.revenue > 0 ? "+" : ""}
                  {Math.round(roiData.trends.revenue)}% vs last month
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="text-xs">{roiData.entityName}</span>
              </div>
              <p className="text-xl font-bold tabular-nums">
                {roiData.entitiesCreated}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                <span className="text-xs">Calls Handled</span>
              </div>
              <p className="text-xl font-bold tabular-nums">
                {roiData.totalCalls}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Percent className="h-3.5 w-3.5" />
                <span className="text-xs">ROI</span>
              </div>
              <p className="text-xl font-bold tabular-nums">
                {roiData.roiMultiplier.toFixed(1)}x
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Conversion Metrics */}
      <ConversionMetricsCard days={30} />

      {/* Trend Chart */}
      <PerformanceTrendChart />

      {/* Patterns + Digest */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PatternsList maxItems={5} />
        <WeeklyDigestCard />
      </div>
    </div>
  );
}
