/**
 * BrainCategoryCard - Visual card component for the Brain dashboard grid
 *
 * Replaces BrainCategoryRow on the dashboard. Shows icon in a colored circle,
 * title, one-line summary, progress bar, and optional group badges.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import type { CategoryConfig } from "@/components/brain/layout/businessBrainNavConfig";
import type { CategoryCompletionStats } from "@/hooks/useCategoryCompletion";

interface BrainCategoryCardProps {
  category: CategoryConfig;
  resolvedTitle?: string;
  completion: CategoryCompletionStats;
  summaryText: string;
  groupLabels?: string[];
  onEdit: () => void;
}

export function BrainCategoryCard({
  category,
  resolvedTitle,
  completion,
  summaryText,
  groupLabels,
  onEdit,
}: BrainCategoryCardProps) {
  const Icon = category.icon;
  const displayTitle = resolvedTitle || category.title;
  const isComplete = completion.percentage === 100;
  const isEmpty = completion.totalFields === 0;
  const hasWarning = completion.hasRequiredIncomplete;

  return (
    <button
      type="button"
      onClick={onEdit}
      className={cn(
        "flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all duration-200",
        "bg-card/60 backdrop-blur-sm hover:shadow-md hover:-translate-y-0.5",
        isComplete
          ? "border-primary/20 hover:border-primary/30 hover:shadow-primary/5"
          : hasWarning
          ? "border-destructive/20 hover:border-destructive/30"
          : "border-border/30 hover:border-border/50",
      )}
    >
      {/* Icon circle */}
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
          isComplete
            ? "bg-primary/10 text-primary"
            : hasWarning
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground",
        )}
      >
        {isComplete ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </div>

      {/* Title + summary */}
      <div className="space-y-1 min-w-0 w-full">
        <p className="text-sm font-semibold truncate">{displayTitle}</p>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {summaryText || category.description}
        </p>
      </div>

      {/* Progress bar + percentage */}
      {!isEmpty && (
        <div className="w-full space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  isComplete
                    ? "bg-primary"
                    : hasWarning
                    ? "bg-destructive"
                    : "bg-primary/70",
                )}
                style={{ width: `${completion.percentage}%` }}
              />
            </div>
            <span
              className={cn(
                "text-xs font-medium tabular-nums ml-2.5 shrink-0",
                isComplete
                  ? "text-primary"
                  : hasWarning
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {completion.percentage}%
            </span>
          </div>
        </div>
      )}

      {/* Optional tag */}
      {isEmpty && (
        <span className="text-[10px] font-medium text-muted-foreground/60">
          Optional
        </span>
      )}

      {/* Group badges */}
      {groupLabels && groupLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {groupLabels.map((label) => (
            <Badge
              key={label}
              variant="secondary"
              className="text-[10px] px-1.5 py-0 font-normal"
            >
              {label}
            </Badge>
          ))}
        </div>
      )}
    </button>
  );
}
