import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Lightbulb, ArrowRight } from "lucide-react";
import { InsightsFeed } from "@/components/intelligence/InsightsFeed";
import { HealthScoreRing } from "./HealthScoreRing";
import { BusinessStageCard } from "./BusinessStageCard";
import type { BusinessPartnerData } from "@/hooks/useBusinessPartner";

interface PartnerOverviewTabProps {
  data: BusinessPartnerData;
}

export function PartnerOverviewTab({ data }: PartnerOverviewTabProps) {
  // Find top strength (highest scoring breakdown item)
  const topStrength = (() => {
    const items = [
      { label: "Brain Completion", value: data.healthBreakdown.brainCompletion, max: 25 },
      { label: "AI Performance", value: data.healthBreakdown.aiPerformance, max: 25 },
      { label: "Revenue Trend", value: data.healthBreakdown.revenueTrend, max: 20 },
      { label: "Setup", value: data.healthBreakdown.setupCompleteness, max: 15 },
      { label: "Knowledge", value: data.healthBreakdown.knowledgeCoverage, max: 15 },
    ];
    return items.reduce((best, item) =>
      item.max > 0 && item.value / item.max > best.value / best.max ? item : best
    );
  })();

  // Top priority = first critical/warning finding
  const topPriority = data.auditFindings.find(
    (f) => f.severity === "critical" || f.severity === "warning"
  );

  // Top recommendation
  const topRecommendation = data.recommendations[0];

  return (
    <div className="space-y-6">
      {/* Health + Stage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business Health</CardTitle>
          </CardHeader>
          <CardContent>
            <HealthScoreRing
              score={data.healthScore}
              breakdown={data.healthBreakdown}
            />
          </CardContent>
        </Card>
        <BusinessStageCard
          stage={data.stage}
          stageDefinition={data.stageDefinition}
        />
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Strength */}
        <Card>
          <CardContent className="pt-5 space-y-2">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Top Strength</span>
            </div>
            <p className="font-medium text-sm">{topStrength.label}</p>
            <p className="text-xs text-muted-foreground">
              {Math.round((topStrength.value / topStrength.max) * 100)}% of maximum
            </p>
          </CardContent>
        </Card>

        {/* Top Priority */}
        <Card>
          <CardContent className="pt-5 space-y-2">
            <div className="flex items-center gap-2 text-orange-500">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Top Priority</span>
            </div>
            {topPriority ? (
              <>
                <p className="font-medium text-sm">{topPriority.title}</p>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                  <Link to={topPriority.actionLink}>
                    {topPriority.actionLabel} <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No critical issues found</p>
            )}
          </CardContent>
        </Card>

        {/* Top Recommendation */}
        <Card>
          <CardContent className="pt-5 space-y-2">
            <div className="flex items-center gap-2 text-blue-500">
              <Lightbulb className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Next Step</span>
            </div>
            {topRecommendation ? (
              <>
                <p className="font-medium text-sm">{topRecommendation.title}</p>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                  <Link to={topRecommendation.actionLink}>
                    {topRecommendation.actionLabel} <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">You're in great shape!</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <InsightsFeed maxItems={3} />
        </CardContent>
      </Card>
    </div>
  );
}
