/**
 * BrainCategoryCard - Visual card for one category on the Dashboard Hub
 *
 * Shows icon, title, description, progress ring, summary text, and
 * navigates to the detail view on click.
 *
 * Redesigned: Borderless with left-accent hover, inline icon, no icon boxes.
 */

import { cn } from "@/lib/utils";
import { BrainProgressRing } from "@/components/brain/layout/BrainProgressIndicator";
import type { CategoryConfig } from "@/components/brain/layout/businessBrainNavConfig";
import type { CategoryCompletionStats } from "@/hooks/useCategoryCompletion";

interface BrainCategoryCardProps {
  category: CategoryConfig;
  /** Dynamic title resolved from industry terminology (falls back to category.title) */
  resolvedTitle?: string;
  completion: CategoryCompletionStats;
  summaryText: string;
  onNavigate: (section: string) => void;
}

export function BrainCategoryCard({
  category,
  resolvedTitle,
  completion,
  summaryText,
  onNavigate,
}: BrainCategoryCardProps) {
  const Icon = category.icon;
  const isComplete = completion.percentage === 100;
  const _hasWarning = completion.hasRequiredIncomplete;
  const _essentialCount = category.cards.filter(c => c.setupPriority === "essential").length;

  return (
    <button
      type="button"
      onClick={() => onNavigate(category.section)}
      className={cn(
        "flex flex-col items-start gap-3 rounded-2xl bg-card p-5 text-left shadow-sm transition-all duration-200 w-full",
        "hover:bg-muted/30 hover:shadow-md",
      )}
    >
      {/* Title row: icon + title + progress ring */}
      <div className="flex w-full items-center gap-2">
        <Icon className={cn(
          "h-4 w-4 shrink-0",
          isComplete
            ? "text-green-600 dark:text-green-400"
            : "text-primary",
        )} />
        <h3 className="text-sm font-semibold leading-tight flex-1">{resolvedTitle || category.title}</h3>
        <BrainProgressRing
          completedSections={completion.completedFields}
          totalSections={completion.totalFields}
          size="sm"
        />
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground">{category.description}</p>

      {/* Summary */}
      <p className="text-xs text-muted-foreground line-clamp-2">{summaryText}</p>
    </button>
  );
}
