/**
 * BrainProgressIndicator - Shows overall Business Brain completion status
 * 
 * Features:
 * - Shows "X of Y sections configured"
 * - Color-coded by completion percentage
 * - Lists top 3 incomplete items on hover
 * - Sticky position at top of content area
 */

import { Circle, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface IncompleteItem {
  section: string;
  label: string;
}

interface BrainProgressIndicatorProps {
  completedSections: number;
  totalSections: number;
  incompleteItems: IncompleteItem[];
  onNavigateToSection?: (section: string) => void;
  className?: string;
}

export function BrainProgressIndicator({
  completedSections,
  totalSections,
  incompleteItems,
  onNavigateToSection,
  className,
}: BrainProgressIndicatorProps) {
  const percentage = totalSections > 0 
    ? Math.round((completedSections / totalSections) * 100) 
    : 0;
  
  const isComplete = percentage === 100;
  const isGettingStarted = percentage < 25;
  const isNearComplete = percentage >= 75;

  // Color based on completion
  const getProgressColor = () => {
    if (isComplete) return "bg-green-500";
    if (isNearComplete) return "bg-blue-500";
    if (isGettingStarted) return "bg-amber-500";
    return "bg-primary";
  };

  const getStatusText = () => {
    if (isComplete) return "Your AI is fully configured!";
    if (isNearComplete) return "Almost there!";
    if (isGettingStarted) return "Let's get started";
    return "Making progress";
  };

  const topIncomplete = incompleteItems.slice(0, 3);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-card",
              isComplete && "border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30",
              className
            )}
          >
            {/* Status Icon */}
            <div className={cn(
              "flex items-center justify-center h-8 w-8 rounded-full",
              isComplete 
                ? "bg-green-100 dark:bg-green-900/50" 
                : "bg-muted"
            )}>
              {isComplete ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : isGettingStarted ? (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            {/* Progress Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium truncate">
                  {getStatusText()}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {completedSections}/{totalSections}
                </span>
              </div>
              <Progress 
                value={percentage} 
                className="h-1.5"
              />
            </div>
          </div>
        </TooltipTrigger>

        {/* Tooltip with incomplete items */}
        {!isComplete && topIncomplete.length > 0 && (
          <TooltipContent 
            side="bottom" 
            align="start"
            className="w-64 p-0"
          >
            <div className="p-3">
              <p className="text-xs font-medium mb-2">Still needs setup:</p>
              <ul className="space-y-1.5">
                {topIncomplete.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Circle className="h-2 w-2 text-muted-foreground" />
                    <button
                      type="button"
                      onClick={() => onNavigateToSection?.(item.section)}
                      className="text-xs text-muted-foreground hover:text-foreground hover:underline text-left"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
              {incompleteItems.length > 3 && (
                <p className="text-xs text-muted-foreground mt-2">
                  +{incompleteItems.length - 3} more
                </p>
              )}
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact variant for mobile or sidebar
 */
export function BrainProgressRing({
  completedSections,
  totalSections,
  className,
}: Pick<BrainProgressIndicatorProps, "completedSections" | "totalSections" | "className">) {
  const percentage = totalSections > 0 
    ? Math.round((completedSections / totalSections) * 100) 
    : 0;

  const circumference = 2 * Math.PI * 18; // radius = 18
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg className="h-12 w-12 -rotate-90">
        {/* Background circle */}
        <circle
          cx="24"
          cy="24"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx="24"
          cy="24"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className={cn(
            percentage === 100 ? "text-green-500" : "text-primary"
          )}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: "stroke-dashoffset 0.5s ease-in-out",
          }}
        />
      </svg>
      <span className="absolute text-xs font-medium">
        {percentage}%
      </span>
    </div>
  );
}
