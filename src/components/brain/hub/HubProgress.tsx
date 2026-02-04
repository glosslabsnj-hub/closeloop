/**
 * HubProgress - Simple progress bar for Business Brain Hub
 */

import { cn } from "@/lib/utils";
import type { BusinessMode } from "@/hooks/useTenantConfig";

interface HubProgressProps {
  completedSteps: number;
  totalSteps: number;
  mode: BusinessMode;
  className?: string;
}

export function HubProgress({ completedSteps, totalSteps, className }: HubProgressProps) {
  const percentage = Math.round((completedSteps / totalSteps) * 100);
  const isComplete = completedSteps >= totalSteps;
  
  return (
    <div className={cn("mt-4", className)}>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-muted-foreground">
          {isComplete ? "All set!" : "Setup progress"}
        </span>
        <span className="font-medium">{completedSteps} of {totalSteps}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isComplete ? "bg-emerald-500" : "bg-primary"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
