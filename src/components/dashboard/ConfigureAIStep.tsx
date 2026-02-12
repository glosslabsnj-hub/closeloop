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
  const { score, p0Flags, p1Flags, loading } = useAIReadinessV2();
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Configure Your AI Knowledge
        </CardTitle>
        <CardDescription>
          Fill out your business information so your AI knows how to help customers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Readiness Score */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">AI Readiness</span>
            <span className={`text-sm font-medium ${readinessPercent >= 85 ? 'text-primary' : 'text-muted-foreground'}`}>
              {loading ? "..." : `${readinessPercent}%`}
            </span>
          </div>
          <Progress value={readinessPercent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Reach 85% to unlock Go Live. Your AI needs this info to answer calls correctly.
          </p>
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
                    onClick={() => navigate(item.fixPath)}
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

        {/* Main CTA */}
        <Button
          onClick={() => navigate("/app/business-brain")}
          className="w-full gap-2"
          size="lg"
        >
          <Brain className="h-5 w-5" />
          Open Business Brain
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          This is where your AI learns about your business
        </p>
      </CardContent>
    </Card>
  );
}
