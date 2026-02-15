import React from "react";
/**
 * Phase 5: GO LIVE — Review setup + launch
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, Pencil, Sparkles, TestTube2, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { getIndustryBySlug } from "@/data/industryCatalog";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";
import type { EditableService } from "@/components/onboarding/ServicePreviewStep";
import type { AITone, AIBookingMode } from "@/components/onboarding/CommunicationPreferences";
import type { AfterHoursBehavior } from "./OnboardingAI";
import type { WorkStyle } from "./OnboardingIdentity";

const modeLabels: Record<BusinessMode, string> = {
  service: "Service Business",
  dispatch: "Dispatch / On-Demand",
  food: "Food & Hospitality",
  medical: "Medical / Healthcare",
  general: "General Business",
  sales: "Sales Business",
};

const toneLabels: Record<AITone, string> = {
  professional: "Professional",
  friendly: "Friendly",
  casual: "Casual",
};

const bookingLabels: Record<AIBookingMode, string> = {
  auto_book: "Auto-booking enabled",
  pending_approval: "Book + require approval",
  suggest_callback: "Suggest + callback",
  callback_only: "Callback only",
};

const afterHoursLabels: Record<AfterHoursBehavior, string> = {
  ai_24_7: "24/7 AI answering",
  voicemail: "Voicemail",
  text_back: "Text back with hours",
};

interface OnboardingReviewProps {
  businessName: string;
  businessMode: BusinessMode;
  industrySlug: string;
  services: EditableService[];
  aiTone: AITone;
  bookingMode: AIBookingMode;
  afterHours: AfterHoursBehavior;
  is24x7: boolean;
  workStyle: WorkStyle;
  serviceAreaRadius?: number;
  onEditPhase: (phase: number) => void;
  onTestAI: () => void;
  onGoLive: () => void;
  loading: boolean;
}

export const OnboardingReview = React.memo(function OnboardingReview({
  businessName,
  businessMode,
  industrySlug,
  services,
  aiTone,
  bookingMode,
  afterHours,
  is24x7,
  workStyle,
  serviceAreaRadius,
  onEditPhase,
  onTestAI,
  onGoLive,
  loading,
}: OnboardingReviewProps) {
  const industryEntry = getIndustryBySlug(industrySlug);
  const enabledServices = services.filter((s) => s.enabled);

  // Calculate simple readiness
  const checks = [
    { label: `${enabledServices.length} services configured`, done: enabledServices.length > 0 },
    { label: is24x7 ? "24/7 answering" : "Business hours set", done: true },
    { label: `${toneLabels[aiTone]} AI tone`, done: true },
    { label: bookingLabels[bookingMode], done: true },
    { label: afterHoursLabels[afterHours], done: true },
  ];

  if ((workStyle === "go_to_customer" || workStyle === "both") && serviceAreaRadius) {
    checks.push({ label: `${serviceAreaRadius} mile service area`, done: true });
  }

  const readiness = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          You're ready to go live! 🚀
        </h2>
        <p className="mt-2 text-muted-foreground">
          Review your setup, then launch your AI receptionist.
        </p>
      </div>

      {/* Business Summary Card */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {industryEntry && <span className="text-2xl">{industryEntry.icon}</span>}
              <div>
                <p className="text-lg font-semibold">{businessName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary">{modeLabels[businessMode]}</Badge>
                  {industryEntry && (
                    <Badge variant="outline" className="text-xs">{industryEntry.name}</Badge>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onEditPhase(1)}
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Edit identity"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Setup Checklist */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Setup Summary</p>
            <button
              type="button"
              onClick={() => onEditPhase(2)}
              className="text-muted-foreground hover:text-primary transition-colors text-xs"
            >
              Edit
            </button>
          </div>
          <div className="space-y-2">
            {checks.map((check, idx) => (
              <div key={idx} className="flex items-center gap-2.5">
                <div className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full shrink-0",
                  check.done ? "bg-primary/10" : "bg-muted"
                )}>
                  <Check className={cn(
                    "h-3 w-3",
                    check.done ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <span className="text-sm">{check.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Readiness Score */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">AI Readiness</p>
            </div>
            <span className="text-sm font-semibold text-primary">{readiness}%</span>
          </div>
          <Progress value={readiness} className="h-2" />
          <p className="text-xs text-muted-foreground">
            You can continue to improve your setup from the dashboard after going live.
          </p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 pt-2">
        <Button
          size="lg"
          onClick={onGoLive}
          disabled={loading}
          className="w-full gap-2"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Setting up...
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4" />
              Go Live Now
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={onTestAI}
          disabled={loading}
          className="w-full gap-2"
        >
          <TestTube2 className="h-4 w-4" />
          Test Your AI First
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Everything can be fine-tuned later in your{" "}
        <span className="font-medium text-foreground">Business Brain</span>.
      </p>
    </div>
  );
});
