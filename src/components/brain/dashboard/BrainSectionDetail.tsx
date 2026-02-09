/**
 * BrainSectionDetail - Wrapper for the detail view of a single category
 *
 * Shows:
 * - Back button to return to the dashboard hub
 * - Category icon + title + progress bar
 * - Children (the existing section content)
 * - Prev / Next category navigation at the bottom
 */

import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { BRAIN_CATEGORIES, type CategoryConfig } from "@/components/brain/layout/businessBrainNavConfig";
import type { CategoryCompletionStats } from "@/hooks/useCategoryCompletion";

interface BrainSectionDetailProps {
  category: CategoryConfig;
  completion: CategoryCompletionStats;
  onBack: () => void;
  onNavigate: (section: string) => void;
  children: React.ReactNode;
}

function getAdjacentCategories(section: string) {
  const sorted = [...BRAIN_CATEGORIES].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((c) => c.section === section);
  return {
    prev: idx > 0 ? sorted[idx - 1] : null,
    next: idx < sorted.length - 1 ? sorted[idx + 1] : null,
  };
}

export function BrainSectionDetail({
  category,
  completion,
  onBack,
  onNavigate,
  children,
}: BrainSectionDetailProps) {
  const Icon = category.icon;
  const { prev, next } = getAdjacentCategories(category.section);

  return (
    <div className="space-y-5">
      {/* Top bar: back + title + progress */}
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              completion.percentage === 100
                ? "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
                : "bg-primary/10 text-primary",
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold tracking-tight">{category.title}</h1>
            <p className="text-xs text-muted-foreground">{category.description}</p>
          </div>
          <span className="text-sm font-medium tabular-nums shrink-0">
            {completion.percentage}%
          </span>
        </div>

        <Progress value={completion.percentage} className="h-1.5" />
      </div>

      {/* Section content (passed as children) */}
      {children}

      {/* Prev / Next nav */}
      <div className="flex items-center justify-between pt-4 border-t">
        {prev ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(prev.section)}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" />
            {prev.title}
          </Button>
        ) : (
          <div />
        )}

        {next ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(next.section)}
            className="gap-1.5"
          >
            {next.title}
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
