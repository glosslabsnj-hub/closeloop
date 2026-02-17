import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

interface OnboardingProgressProps {
  steps: OnboardingStep[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
}

export function OnboardingProgress({ steps, currentStep, onStepClick }: OnboardingProgressProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <nav className="relative">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isComplete = stepNumber < currentStep;
          const isClickable = stepNumber <= currentStep && !!onStepClick;
          const isFuture = stepNumber > currentStep;
          const isLast = index === steps.length - 1;

          const content = (
            <div key={step.id} className="relative flex items-start gap-3">
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute left-4 top-10 w-0.5 h-[calc(100%-8px)]",
                    isComplete ? "bg-primary/30" : "bg-border"
                  )}
                />
              )}

              {/* Clickable step button */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(stepNumber)}
                disabled={!isClickable}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all relative z-10",
                  isActive && "bg-primary/10",
                  isClickable && !isActive && "hover:bg-muted/50 cursor-pointer",
                  isFuture && "opacity-50 cursor-not-allowed"
                )}
              >
                {/* Step circle */}
                <div
                  className={cn(
                    "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors border-2",
                    isActive && "bg-primary text-primary-foreground border-primary",
                    isComplete && "bg-primary/15 text-primary border-primary/40",
                    isFuture && "bg-background text-muted-foreground border-border"
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : stepNumber}
                </div>

                {/* Step text */}
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium truncate",
                      isActive && "text-foreground",
                      isComplete && "text-muted-foreground",
                      isFuture && "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  {isActive && (
                    <p className="text-xs text-muted-foreground truncate">
                      {step.description}
                    </p>
                  )}
                  {isComplete && isClickable && (
                    <p className="text-xs text-primary/70 truncate">Click to edit</p>
                  )}
                </div>
              </button>
            </div>
          );

          if (isFuture) {
            return (
              <Tooltip key={step.id}>
                <TooltipTrigger asChild>{content}</TooltipTrigger>
                <TooltipContent side="right">
                  Complete previous steps first
                </TooltipContent>
              </Tooltip>
            );
          }

          return content;
        })}
      </nav>
    </TooltipProvider>
  );
}

/** Compact mobile indicator: "Step 3 of 7" */
export function OnboardingProgressMobile({
  currentStep,
  totalSteps,
  stepTitle,
}: {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
}) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="p-4 border-b bg-card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">
          Step {currentStep} of {totalSteps}
        </p>
        <p className="text-sm text-muted-foreground">{stepTitle}</p>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
