import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

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
    <nav className="space-y-1">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isComplete = stepNumber < currentStep;
        const isClickable = isComplete && onStepClick;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => isClickable && onStepClick(stepNumber)}
            disabled={!isClickable}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all",
              isActive && "bg-primary/10",
              isComplete && "hover:bg-muted/50 cursor-pointer",
              !isComplete && !isActive && "opacity-50 cursor-default"
            )}
          >
            {/* Step indicator */}
            <div className="relative flex shrink-0 items-center justify-center">
              {/* Pulse ring for current step */}
              {isActive && (
                <span className="absolute inset-0 h-8 w-8 rounded-full bg-primary/20 animate-ping" />
              )}
              <div
                className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                  isActive && "bg-primary text-primary-foreground",
                  isComplete && "bg-primary text-primary-foreground",
                  !isActive && !isComplete && "bg-muted text-muted-foreground"
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
                  !isActive && !isComplete && "text-muted-foreground"
                )}
              >
                {step.title}
              </p>
              {isActive && (
                <p className="text-[13px] text-muted-foreground truncate">
                  {step.description}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </nav>
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
