/**
 * PriorityBadge
 *
 * Displays a call priority level with color coding.
 * Uses priority scoring results from computeCallPriority().
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PriorityLevel } from "@/config/industryBrainConfig";

interface PriorityBadgeProps {
  level: PriorityLevel;
  label: string;
  className?: string;
}

const LEVEL_STYLES: Record<PriorityLevel, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  low: "", // No badge shown for low priority
};

export function PriorityBadge({ level, label, className }: PriorityBadgeProps) {
  if (level === "low") return null;

  return (
    <Badge
      variant="outline"
      className={cn("text-xs", LEVEL_STYLES[level], className)}
    >
      {label}
    </Badge>
  );
}
