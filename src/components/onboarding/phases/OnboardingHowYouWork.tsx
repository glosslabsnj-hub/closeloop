import React from "react";
/**
 * Phase 2: HOW You Work — Work style + scenario discovery questions
 * Split from the original Phase 1 (OnboardingIdentity) for clarity.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Check, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ModeAwareQuestions } from "@/components/onboarding/ModeAwareQuestions";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

export type WorkStyle = "go_to_customer" | "customer_comes" | "both" | "online_remote";

const workStyleOptions: { value: WorkStyle; label: string; description: string }[] = [
  { value: "go_to_customer", label: "I go to customers", description: "Mobile or on-site services" },
  { value: "customer_comes", label: "Customers come to me", description: "Shop, office, or storefront" },
  { value: "both", label: "Both", description: "Shop + mobile services" },
  { value: "online_remote", label: "Online / Remote", description: "Virtual or phone-based" },
];

interface OnboardingHowYouWorkProps {
  businessMode: BusinessMode;
  industrySlug: string;
  workStyle: WorkStyle;
  onWorkStyleChange: (style: WorkStyle) => void;
  scenarioAnswers: Record<string, boolean>;
  onScenarioAnswersChange: (answers: Record<string, boolean>) => void;
  scenarioDetails: Record<string, string>;
  onScenarioDetailsChange: (details: Record<string, string>) => void;
}

export const OnboardingHowYouWork = React.memo(function OnboardingHowYouWork({
  businessMode,
  industrySlug,
  workStyle,
  onWorkStyleChange,
  scenarioAnswers,
  onScenarioAnswersChange,
  scenarioDetails,
  onScenarioDetailsChange,
}: OnboardingHowYouWorkProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          How does your business work?
        </h2>
        <p className="mt-2 text-muted-foreground">
          This helps us configure the right features for your AI.
        </p>
      </div>

      {/* Work Style */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">How do you work?</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-[200px]">This determines whether we set up service areas, coverage zones, or just a shop address.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {workStyleOptions.map((opt) => (
            <Card
              key={opt.value}
              className={cn(
                "cursor-pointer transition-all",
                workStyle === opt.value
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              )}
              onClick={() => onWorkStyleChange(opt.value)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
                {workStyle === opt.value && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Mode-Aware Scenario Questions */}
      <ModeAwareQuestions
        businessMode={businessMode}
        industrySlug={industrySlug}
        scenarioAnswers={scenarioAnswers}
        onScenarioAnswersChange={onScenarioAnswersChange}
        scenarioDetails={scenarioDetails}
        onScenarioDetailsChange={onScenarioDetailsChange}
      />
    </div>
  );
});
