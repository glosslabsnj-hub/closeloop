/**
 * BrainSetupBanner - First-time user guidance banner
 * 
 * Shows for tenants with < 50% completion to guide them
 * through the essential setup steps.
 */

import { useState } from "react";
import { Target, X, ArrowRight, Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SetupStep {
  id: string;
  label: string;
  section: string;
  isComplete: boolean;
}

interface BrainSetupBannerProps {
  /** Essential setup steps */
  steps: SetupStep[];
  /** Callback when user clicks Continue Setup */
  onContinue: (section: string) => void;
  /** Callback when user dismisses the banner */
  onDismiss?: () => void;
  /** Whether the banner can be dismissed */
  dismissible?: boolean;
  /** Additional class names */
  className?: string;
}

export function BrainSetupBanner({
  steps,
  onContinue,
  onDismiss,
  dismissible = true,
  className,
}: BrainSetupBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const completedCount = steps.filter(s => s.isComplete).length;
  const totalCount = steps.length;
  const allComplete = completedCount === totalCount;

  // Find first incomplete step for "Continue Setup" button
  const nextStep = steps.find(s => !s.isComplete);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  // Don't show if all complete (use CompletionCelebration instead)
  if (allComplete) return null;

  return (
    <div
      className={cn(
        "rounded-lg border bg-gradient-to-br from-primary/5 via-background to-primary/5 p-5",
        "border-primary/20",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Getting Started</h3>
            <p className="text-sm text-muted-foreground">
              Complete these {totalCount} essentials to go live
            </p>
          </div>
        </div>

        {dismissible && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => onContinue(step.section)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left",
              step.isComplete
                ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900/50"
                : "bg-muted/50 border-muted hover:bg-muted hover:border-primary/30"
            )}
          >
            {step.isComplete ? (
              <Check className="h-4 w-4 text-green-600 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className={cn(
              "text-xs font-medium truncate",
              step.isComplete ? "text-green-700 dark:text-green-400" : "text-foreground"
            )}>
              {step.label}
            </span>
          </button>
        ))}
      </div>

      {/* Continue Button */}
      {nextStep && (
        <Button
          onClick={() => onContinue(nextStep.section)}
          className="w-full sm:w-auto"
        >
          Continue Setup
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}
    </div>
  );
}
