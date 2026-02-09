/**
 * BrainCategoryCard - Visual card for one category on the Dashboard Hub
 *
 * Shows icon, title, description, progress ring, summary text, and
 * navigates to the detail view on click.
 */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BrainProgressRing } from "@/components/brain/layout/BrainProgressIndicator";
import type { CategoryConfig } from "@/components/brain/layout/businessBrainNavConfig";
import type { CategoryCompletionStats } from "@/hooks/useCategoryCompletion";

interface BrainCategoryCardProps {
  category: CategoryConfig;
  completion: CategoryCompletionStats;
  summaryText: string;
  onNavigate: (section: string) => void;
}

export function BrainCategoryCard({
  category,
  completion,
  summaryText,
  onNavigate,
}: BrainCategoryCardProps) {
  const Icon = category.icon;
  const isComplete = completion.percentage === 100;
  const hasWarning = completion.hasRequiredIncomplete;

  return (
    <motion.button
      type="button"
      onClick={() => onNavigate(category.section)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex flex-col items-start gap-3 rounded-xl border bg-card p-5 text-left shadow-sm transition-shadow hover:shadow-md w-full",
        hasWarning && "border-amber-300 dark:border-amber-700",
        isComplete && "border-green-200 dark:border-green-800",
      )}
    >
      {/* Top row: icon + progress ring */}
      <div className="flex w-full items-center justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            isComplete
              ? "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
              : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <BrainProgressRing
          completedSections={completion.completedFields}
          totalSections={completion.totalFields}
          size="sm"
        />
      </div>

      {/* Title & description */}
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold leading-tight">{category.title}</h3>
        <p className="text-xs text-muted-foreground">{category.description}</p>
      </div>

      {/* Summary line */}
      <p className="text-xs text-muted-foreground line-clamp-2">{summaryText}</p>
    </motion.button>
  );
}
