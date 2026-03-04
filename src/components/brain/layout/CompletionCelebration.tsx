/**
 * CompletionCelebration - Success state when all essentials are complete
 * 
 * Shows a celebratory message with suggestions for optional
 * enhancements the user can make.
 */

import { PartyPopper, Check, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useIndustryContext } from "@/hooks/useIndustryContext";

interface Enhancement {
  id: string;
  label: string;
  description: string;
  section: string;
}

interface CompletionCelebrationProps {
  /** Optional enhancements to suggest */
  enhancements?: Enhancement[];
  /** Callback when user navigates to an enhancement */
  onNavigate?: (section: string) => void;
  /** Callback when user clicks "Go to Dashboard" */
  onGoToDashboard?: () => void;
  /** Additional class names */
  className?: string;
}

export function CompletionCelebration({
  enhancements = [],
  onNavigate,
  onGoToDashboard,
  className,
}: CompletionCelebrationProps) {
  const { terminology } = useIndustryContext();
  const apptLabelPlural = terminology.appointmentLabel === "appointment" ? "appointments" : `${terminology.appointmentLabel}s`;
  return (
    <div
      className={cn(
        "rounded-lg border bg-gradient-to-br from-green-50 via-background to-green-50/50",
        "dark:from-green-950/30 dark:via-background dark:to-green-950/20",
        "border-green-200 dark:border-green-900/50",
        "p-5",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50">
          <PartyPopper className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-foreground">
            Your AI is ready! 🎉
          </h3>
          <p className="text-sm text-muted-foreground">
            All essential sections are configured
          </p>
        </div>
      </div>

      {/* Capabilities */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        {[
          "Answer pricing questions",
          "Check availability",
          `Book ${apptLabelPlural}`,
          "Handle common questions",
        ].map((capability, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 text-sm text-foreground"
          >
            <Check className="h-4 w-4 text-green-600 shrink-0" />
            <span>{capability}</span>
          </div>
        ))}
      </div>

      {/* Optional Enhancements */}
      {enhancements.length > 0 && (
        <div className="border-t pt-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Want to take it further?</span>
          </div>
          <ul className="space-y-2">
            {enhancements.map((enhancement) => (
              <li key={enhancement.id}>
                <button
                  type="button"
                  onClick={() => onNavigate?.(enhancement.section)}
                  className="flex items-start gap-2 text-left hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded-md transition-colors w-full"
                >
                  <span className="text-primary mt-0.5">•</span>
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      {enhancement.label}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">
                      — {enhancement.description}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onGoToDashboard && (
          <Button onClick={onGoToDashboard} variant="outline">
            Go to Dashboard
          </Button>
        )}
        {onNavigate && (
          <Button onClick={() => onNavigate("knowledge")} variant="default">
            Keep Editing
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
