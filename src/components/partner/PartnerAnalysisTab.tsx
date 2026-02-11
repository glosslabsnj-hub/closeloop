import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { HealthScoreRing } from "./HealthScoreRing";
import { BusinessStageCard } from "./BusinessStageCard";
import { ExecutiveSummaryBanner } from "./ExecutiveSummaryBanner";
import { AnalysisSection } from "./AnalysisSection";
import { ProblemCard } from "./ProblemCard";
import { GrowthOpportunityCard } from "./GrowthOpportunityCard";
import { BenchmarkCard } from "./BenchmarkCard";
import type { PartnerAnalysis } from "@/types/partnerAnalysis";
import type { HealthBreakdown } from "@/hooks/useBusinessPartner";
import type { BusinessStage, StageDefinition } from "@/config/partnerStageDefinitions";

interface PartnerAnalysisTabProps {
  analysis: PartnerAnalysis | null;
  isLoading: boolean;
  isRefreshing: boolean;
  generatedAt: string | null;
  isCached: boolean;
  onRefresh: () => void;
  canRefresh: boolean;
  refreshCountToday: number;
  maxRefreshes: number;
  // Real-time data (no AI wait)
  healthScore: number;
  healthBreakdown: HealthBreakdown;
  stage: BusinessStage;
  stageDefinition: StageDefinition;
}

function AnalysisLoading() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-sm font-medium">
              Generating your personalized analysis...
            </span>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[120px]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-[100px]" />
        <Skeleton className="h-[100px]" />
        <Skeleton className="h-[100px]" />
      </div>
    </div>
  );
}

export function PartnerAnalysisTab({
  analysis,
  isLoading,
  isRefreshing,
  generatedAt,
  isCached,
  onRefresh,
  canRefresh,
  refreshCountToday,
  maxRefreshes,
  healthScore,
  healthBreakdown,
  stage,
  stageDefinition,
}: PartnerAnalysisTabProps) {
  return (
    <div className="space-y-6">
      {/* Executive Summary — only when analysis is ready */}
      {analysis && (
        <ExecutiveSummaryBanner
          headline={analysis.executive_summary.headline}
          stageAssessment={analysis.executive_summary.stage_assessment}
          grade={analysis.executive_summary.overall_grade}
          gradeReasoning={analysis.executive_summary.grade_reasoning}
          generatedAt={generatedAt}
          isCached={isCached}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          canRefresh={canRefresh}
          refreshCountToday={refreshCountToday}
          maxRefreshes={maxRefreshes}
        />
      )}

      {/* Health + Stage (real-time, no AI wait) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <HealthScoreRing score={healthScore} breakdown={healthBreakdown} />
          </CardContent>
        </Card>
        <BusinessStageCard
          stage={stage}
          stageDefinition={stageDefinition}
        />
      </div>

      {/* AI Analysis sections — loading or content */}
      {isLoading ? (
        <AnalysisLoading />
      ) : analysis ? (
        <>
          {/* Current State */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            {analysis.current_state.strengths.length > 0 && (
              <AnalysisSection title="Strengths">
                <div className="space-y-2">
                  {analysis.current_state.strengths.map((item, i) => (
                    <Card key={i}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <div className="space-y-0.5">
                            <h4 className="font-medium text-sm">{item.title}</h4>
                            <p className="text-sm text-muted-foreground">{item.explanation}</p>
                            {item.evidence && (
                              <p className="text-xs text-muted-foreground italic">{item.evidence}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AnalysisSection>
            )}

            {/* Weaknesses */}
            {analysis.current_state.weaknesses.length > 0 && (
              <AnalysisSection title="Areas for Improvement">
                <div className="space-y-2">
                  {analysis.current_state.weaknesses.map((item, i) => (
                    <Card key={i}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start gap-2">
                          <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                          <div className="space-y-0.5">
                            <h4 className="font-medium text-sm">{item.title}</h4>
                            <p className="text-sm text-muted-foreground">{item.explanation}</p>
                            {item.evidence && (
                              <p className="text-xs text-muted-foreground italic">{item.evidence}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AnalysisSection>
            )}
          </div>

          {/* Problems */}
          {(analysis.problems.critical.length > 0 || analysis.problems.warnings.length > 0) && (
            <AnalysisSection
              title="Problems to Address"
              description="Issues that need your attention, ordered by severity"
            >
              <div className="space-y-2">
                {analysis.problems.critical.map((p, i) => (
                  <ProblemCard key={`critical-${i}`} problem={p} severity="critical" />
                ))}
                {analysis.problems.warnings.map((p, i) => (
                  <ProblemCard key={`warning-${i}`} problem={p} severity="warning" />
                ))}
              </div>
            </AnalysisSection>
          )}

          {/* Growth Opportunities */}
          {(analysis.growth.quick_wins.length > 0 ||
            analysis.growth.strategic_initiatives.length > 0 ||
            analysis.growth.industry_specific.length > 0) && (
            <AnalysisSection
              title="Growth Opportunities"
              description="Ways to grow your business with AI"
            >
              <div className="space-y-4">
                {analysis.growth.quick_wins.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Quick Wins</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {analysis.growth.quick_wins.map((item, i) => (
                        <GrowthOpportunityCard key={i} item={item} />
                      ))}
                    </div>
                  </div>
                )}
                {analysis.growth.strategic_initiatives.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Strategic Initiatives
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {analysis.growth.strategic_initiatives.map((item, i) => (
                        <GrowthOpportunityCard key={i} item={item} />
                      ))}
                    </div>
                  </div>
                )}
                {analysis.growth.industry_specific.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Industry-Specific
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {analysis.growth.industry_specific.map((item, i) => (
                        <GrowthOpportunityCard key={i} item={item} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AnalysisSection>
          )}

          {/* Industry Context */}
          {analysis.industry_context.narrative && (
            <AnalysisSection title="Industry Context">
              <Card>
                <CardContent className="pt-4 pb-4 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {analysis.industry_context.narrative}
                  </p>
                  {analysis.industry_context.benchmarks.length > 0 && (
                    <div className="space-y-3 pt-2">
                      {analysis.industry_context.benchmarks.map((b, i) => (
                        <BenchmarkCard key={i} benchmark={b} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </AnalysisSection>
          )}
        </>
      ) : null}
    </div>
  );
}
