import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Brain, Check, AlertCircle, ArrowRight, CheckCircle2,
  Package, Clock, HelpCircle, FileText, Calendar, MapPin, UtensilsCrossed, Users
} from "lucide-react";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { getIndustryOnboardingConfig, type SetupChecklistItem } from "@/config/industryOnboardingConfig";

interface ConfigureAIStepProps {
  onComplete: () => void;
  isComplete: boolean;
}

const checklistIconMap: Record<SetupChecklistItem["icon"], typeof Package> = {
  services: Package,
  hours: Clock,
  faqs: HelpCircle,
  calendar: Calendar,
  coverage: MapPin,
  menu: UtensilsCrossed,
  policies: FileText,
  team: Users,
};

export function ConfigureAIStep({ onComplete, isComplete }: ConfigureAIStepProps) {
  const navigate = useNavigate();
  const { score, p0Flags, p1Flags, loading, stepProgress } = useAIReadinessV2();
  const { slug, category, mode } = useIndustryContext();

  const config = useMemo(
    () => getIndustryOnboardingConfig(mode, category ?? undefined, slug ?? undefined),
    [mode, category, slug]
  );

  const readinessPercent = score || 0;
  const meetsThreshold = readinessPercent >= 85 && p0Flags.length === 0;

  // Determine completion of each checklist item from P0/P1 flags
  const allFlags = [...p0Flags, ...p1Flags];
  const checklistWithStatus = config.setupChecklist.map((item) => {
    const isItemComplete = item.flagKeys
      ? item.flagKeys.every((fk) => !allFlags.includes(fk))
      : true; // No flags to check = assume complete
    return { ...item, isComplete: isItemComplete };
  });

  if (isComplete || meetsThreshold) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Check className="h-5 w-5" />
            AI Knowledge Ready
          </CardTitle>
          <CardDescription>
            Your AI has everything it needs to answer calls effectively.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score display */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Readiness Score</span>
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {readinessPercent}%
            </Badge>
          </div>

          <Button
            onClick={onComplete}
            className="w-full gap-2"
          >
            Continue to Go Live
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Step-based progress display
  const stepsRemaining = stepProgress.totalSteps - stepProgress.completedSteps;
  const stepPercent = stepProgress.totalSteps > 0
    ? Math.round((stepProgress.completedSteps / stepProgress.totalSteps) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Configure Your AI Knowledge
        </CardTitle>
        <CardDescription>
          Complete {stepsRemaining} {stepsRemaining === 1 ? "item" : "items"} so your AI can start answering calls
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step Progress (more intuitive than percentage) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {stepProgress.completedSteps} of {stepProgress.totalSteps} items complete
            </span>
            <span className={`text-sm font-medium ${stepPercent >= 100 ? 'text-primary' : 'text-muted-foreground'}`}>
              {loading ? "..." : `${readinessPercent}%`}
            </span>
          </div>
          <Progress value={stepPercent} className="h-2" />
          {stepProgress.nextStepTitle && (
            <p className="text-xs text-muted-foreground">
              Next up: <span className="font-medium text-foreground">{stepProgress.nextStepTitle}</span>
            </p>
          )}
        </div>

        {/* Industry-specific checklist */}
        <div className="space-y-2">
          {checklistWithStatus.map((item) => {
            const Icon = checklistIconMap[item.icon] || AlertCircle;
            return (
              <div
                key={item.label}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  item.isComplete
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-destructive/20 bg-destructive/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  {item.isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">{item.label}</span>
                </div>
                {!item.isComplete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/app/business-brain?mode=setup")}
                    className="gap-1 text-xs"
                  >
                    Fix
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Main CTA — links to guided setup */}
        <Button
          onClick={() => navigate("/app/business-brain?mode=setup")}
          className="w-full gap-2"
          size="lg"
        >
          <Brain className="h-5 w-5" />
          {stepProgress.completedSteps > 0
            ? `Continue Setup (${stepsRemaining} left)`
            : "Start Guided Setup"
          }
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Step-by-step guide to teach your AI about your business
        </p>
      </CardContent>
    </Card>
  );
}
