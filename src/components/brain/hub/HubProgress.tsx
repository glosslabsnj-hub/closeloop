/**
 * HubProgress - Overall progress indicator for Business Brain Hub
 * 
 * Shows:
 * - Circular progress ring
 * - X of Y steps complete
 * - Mode-specific messaging
 */

import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusinessMode } from "@/hooks/useTenantConfig";

interface HubProgressProps {
  completedSteps: number;
  totalSteps: number;
  mode: BusinessMode;
  className?: string;
}

const modeLabels: Record<BusinessMode, string> = {
  service: "Service Business",
  dispatch: "Dispatch Business",
  food: "Food & Restaurant",
  medical: "Medical Practice",
  general: "General Business",
};

export function HubProgress({ completedSteps, totalSteps, mode, className }: HubProgressProps) {
  const percentage = Math.round((completedSteps / totalSteps) * 100);
  const isComplete = completedSteps >= totalSteps;

  // Calculate circle properties
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("flex items-center gap-6", className)}>
      {/* Circular Progress */}
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            className="text-muted/30"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn(
              "transition-all duration-500",
              isComplete ? "text-emerald-500" : "text-primary"
            )}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isComplete ? (
            <Check className="h-6 w-6 text-emerald-500" />
          ) : (
            <span className="text-lg font-bold">{percentage}%</span>
          )}
        </div>
      </div>

      {/* Text content */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">
            {isComplete ? "Setup Complete!" : "Brain Setup"}
          </h2>
          {isComplete && (
            <Sparkles className="h-5 w-5 text-emerald-500" />
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isComplete ? (
            <>Your AI is ready to handle calls for your {modeLabels[mode].toLowerCase()}</>
          ) : (
            <>{completedSteps} of {totalSteps} steps complete for your {modeLabels[mode].toLowerCase()}</>
          )}
        </p>
        {!isComplete && (
          <p className="text-xs text-muted-foreground/70 mt-1">
            Complete all steps to get the best results from your AI
          </p>
        )}
      </div>
    </div>
  );
}
