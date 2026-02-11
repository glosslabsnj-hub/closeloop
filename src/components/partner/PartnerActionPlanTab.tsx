import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CalendarDays, CalendarRange } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionItemCard } from "./ActionItemCard";
import { AnalysisSection } from "./AnalysisSection";
import type { PartnerAnalysis } from "@/types/partnerAnalysis";
import type { StageDefinition } from "@/config/partnerStageDefinitions";

interface PartnerActionPlanTabProps {
  analysis: PartnerAnalysis | null;
  isLoading: boolean;
  stageDefinition: StageDefinition;
}

export function PartnerActionPlanTab({
  analysis,
  isLoading,
  stageDefinition,
}: PartnerActionPlanTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[80px]" />
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          No analysis available yet. Visit the Analysis tab to generate one.
        </CardContent>
      </Card>
    );
  }

  const { action_plan } = analysis;

  return (
    <div className="space-y-6">
      {/* Stage context */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm">
            <span className="font-medium">Stage: {stageDefinition.label}</span>
            {" — "}
            <span className="text-muted-foreground">{stageDefinition.description}</span>
          </p>
        </CardContent>
      </Card>

      {/* This Week */}
      {action_plan.this_week.length > 0 && (
        <AnalysisSection title="This Week">
          <Card>
            <CardHeader className="pb-0 pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Priority Actions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-2 pb-2">
              <div className="divide-y">
                {action_plan.this_week.map((item, i) => (
                  <ActionItemCard key={i} item={item} index={i} />
                ))}
              </div>
            </CardContent>
          </Card>
        </AnalysisSection>
      )}

      {/* This Month */}
      {action_plan.this_month.length > 0 && (
        <AnalysisSection title="This Month">
          <Card>
            <CardHeader className="pb-0 pt-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-sm">Growth Actions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-2 pb-2">
              <div className="divide-y">
                {action_plan.this_month.map((item, i) => (
                  <ActionItemCard key={i} item={item} index={i} />
                ))}
              </div>
            </CardContent>
          </Card>
        </AnalysisSection>
      )}

      {/* This Quarter */}
      {action_plan.this_quarter.length > 0 && (
        <AnalysisSection title="This Quarter">
          <Card>
            <CardHeader className="pb-0 pt-4">
              <div className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-purple-500" />
                <CardTitle className="text-sm">Strategic Goals</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-2 pb-2">
              <div className="divide-y">
                {action_plan.this_quarter.map((item, i) => (
                  <ActionItemCard key={i} item={item} index={i} />
                ))}
              </div>
            </CardContent>
          </Card>
        </AnalysisSection>
      )}
    </div>
  );
}
