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
      <nav className="space-y-1">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isComplete = stepNumber < currentStep;
          const isClickable = stepNumber <= currentStep && !!onStepClick;
          const isFuture = stepNumber > currentStep;

          const button = (
            <button
              key={step.id}
              type="button"
              onClick={() => isClickable && onStepClick(stepNumber)}
              disabled={!isClickable}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all relative",
                isActive && "bg-primary/10",
                isClickable && !isActive && "hover:bg-muted/50 cursor-pointer",
                isFuture && "opacity-50 cursor-not-allowed",
                isActive && "border-l-2 border-primary"
              )}
            >
              {/* Step indicator */}
              <div className="relative flex shrink-0 items-center justify-center">
                {isActive && (
                  <span className="absolute inset-0 h-8 w-8 rounded-full bg-primary/20 animate-ping" />
                )}
                <div
                  className={cn(
                    "relative flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                    isActive && "bg-primary text-primary-foreground",
                    isComplete && "bg-primary text-primary-foreground",
                    isFuture && "bg-muted text-muted-foreground"
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : stepNumber}
                </div>
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
                {(isActive || isComplete) && (
                  <p className="text-[13px] text-muted-foreground truncate">
                    {isComplete ? "Click to edit" : step.description}
                  </p>
                )}
              </div>
            </button>
          );

          if (isFuture) {
            return (
              <Tooltip key={step.id}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right">
                  Complete previous steps first
                </TooltipContent>
              </Tooltip>
            );
          }

          return button;
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
