/**
 * BrainCategoryRow - Single row in the settings list with icon, title, summary, progress bar, and edit button
 * 
 * Improved: clearer progress labels and color-coded status
 */

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ChevronRight, CheckCircle2 } from "lucide-react";
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
  const isEmpty = completion.totalFields === 0;
  const hasWarning = completion.hasRequiredIncomplete;

  // Status label
  const statusLabel = isEmpty
    ? "Optional"
    : isComplete
    ? "Complete"
    : hasWarning
    ? `${completion.completedFields}/${completion.totalFields} — action needed`
    : `${completion.completedFields} of ${completion.totalFields} done`;

  return (
    <button
      type="button"
      onClick={onEdit}
      className={cn(
        "flex items-center gap-4 w-full p-4 text-left hover:bg-card/90 hover:shadow-sm transition-all group",
        isComplete ? "border-l-2 border-l-primary" : hasWarning ? "border-l-2 border-l-warning" : "border-l-2 border-l-transparent",
      )}
    >
      {/* Icon */}
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
        isComplete ? "bg-primary/10 border border-primary/15" : hasWarning ? "bg-destructive/10 border border-destructive/15" : "bg-muted border border-border/20",
      )}>
        {isComplete ? (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        ) : (
          <Icon className={cn(
            "h-4 w-4",
            hasWarning ? "text-destructive" : "text-muted-foreground",
          )} />
        )}
      </div>

      {/* Title + summary + progress */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{displayTitle}</p>
          <span className={cn(
            "text-xs font-medium tabular-nums shrink-0",
            isComplete ? "text-primary" : hasWarning ? "text-destructive" : "text-muted-foreground",
          )}>
            {statusLabel}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{summaryText || category.description}</p>
        {!isEmpty && <Progress value={completion.percentage} className="h-1" />}
      </div>

      {/* Edit arrow */}
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
