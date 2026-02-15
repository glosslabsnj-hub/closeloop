/**
 * BrainCategoryRow - Single row in the settings list with icon, title, summary, progress bar, and edit button
 */

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import type { CategoryConfig } from "@/components/brain/layout/businessBrainNavConfig";
import type { CategoryCompletionStats } from "@/hooks/useCategoryCompletion";

interface BrainCategoryRowProps {
  category: CategoryConfig;
  resolvedTitle?: string;
  completion: CategoryCompletionStats;
  summaryText: string;
  onEdit: () => void;
}

export function BrainCategoryRow({
  category,
  resolvedTitle,
  completion,
  summaryText,
  onEdit,
}: BrainCategoryRowProps) {
  const Icon = category.icon;
  const displayTitle = resolvedTitle || category.title;
  const isComplete = completion.percentage === 100;

  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex items-center gap-4 w-full p-4 text-left hover:bg-muted/30 transition-colors group"
    >
      {/* Icon */}
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
        isComplete ? "bg-primary/10" : "bg-muted",
      )}>
        <Icon className={cn(
          "h-4 w-4",
          isComplete ? "text-primary" : "text-muted-foreground",
        )} />
      </div>

      {/* Title + summary + progress */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{displayTitle}</p>
          <span className="text-xs font-medium tabular-nums text-muted-foreground shrink-0">
            {completion.percentage}%
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{summaryText || category.description}</p>
        <Progress value={completion.percentage} className="h-1" />
      </div>

      {/* Edit arrow */}
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
