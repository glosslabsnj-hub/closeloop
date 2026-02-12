/**
 * BrainDashboard - Dashboard hub showing 5 category cards
 *
 * This is the Level 1 view of the Business Brain. It shows:
 * - Editorial micro-label header with overall completion
 * - Suggested next step banner
 * - 2-col responsive category cards with per-card progress rings
 */

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { BRAIN_CATEGORIES, type CategoryConfig } from "@/components/brain/layout/businessBrainNavConfig";
import { BrainCategoryCard } from "./BrainCategoryCard";
import { NextStepSuggestion } from "@/components/brain/layout/NextStepSuggestion";
import { useAllCategoriesCompletion } from "@/hooks/useCategoryCompletion";
import { useBrainSummaries } from "@/hooks/useBrainSummaries";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { resolveCardTitle } from "@/data/industryTerminology";

interface BrainDashboardProps {
  onNavigate: (section: string) => void;
}

/**
 * Derive a one-line summary per category from the existing useBrainSummaries data.
 */
function getCategorySummary(
  section: string,
  summaries: ReturnType<typeof useBrainSummaries>,
): string {
  switch (section) {
    case "business":
      return [summaries.businessInfo, summaries.hours].filter(Boolean).join(" \u00B7 ");
    case "services":
      return [summaries.catalog, summaries.pricingRules].filter(Boolean).join(" \u00B7 ");
    case "operations":
      return [summaries.coverage, summaries.policies].filter(Boolean).join(" \u00B7 ");
    case "ai-voice":
      return [summaries.scripts, summaries.guidelines].filter(Boolean).join(" \u00B7 ");
    case "training":
      return [summaries.faqs, summaries.objections].filter(Boolean).join(" \u00B7 ");
    default:
      return "";
  }
}

/**
 * Find the first incomplete category (by order) to suggest as next step.
 */
function findSuggestedSection(
  completions: Record<string, { percentage: number }>,
): string | null {
  const ordered = [...BRAIN_CATEGORIES].sort((a, b) => a.order - b.order);
  for (const cat of ordered) {
    const stats = completions[cat.section];
    if (stats && stats.percentage < 100) return cat.section;
  }
  return null;
}

export function BrainDashboard({ onNavigate }: BrainDashboardProps) {
  const completions = useAllCategoriesCompletion();
  const summaries = useBrainSummaries();
  const { businessMode } = useTenantConfig();

  // Overall progress across all categories
  const overall = Object.values(completions).reduce(
    (acc, c) => ({
      total: acc.total + c.totalFields,
      completed: acc.completed + c.completedFields,
    }),
    { total: 0, completed: 0 },
  );
  const overallPercent = overall.total > 0 ? Math.round((overall.completed / overall.total) * 100) : 100;

  const suggestedSection = findSuggestedSection(completions);

  // Get the section *before* the suggested one so NextStepSuggestion picks the right message
  const completedForSuggestion = (() => {
    if (!suggestedSection) return null;
    const ordered = [...BRAIN_CATEGORIES].sort((a, b) => a.order - b.order);
    const idx = ordered.findIndex((c) => c.section === suggestedSection);
    if (idx <= 0) return null;
    return ordered[idx - 1].section;
  })();

  return (
    <div className="space-y-6">
      {/* Editorial header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Knowledge Base</p>
            <h1 className="text-2xl font-bold tracking-tight">Business Brain</h1>
          </div>
          <div className="text-right">
            <span className="text-sm font-medium">{overallPercent}%</span>
            <span className="text-xs text-muted-foreground ml-1">complete</span>
          </div>
        </div>
        <Progress value={overallPercent} className="h-1" />
      </div>

      {/* Suggested next step */}
      {suggestedSection && completedForSuggestion && (
        <NextStepSuggestion
          completedSection={completedForSuggestion}
          mode={businessMode}
          onNavigate={onNavigate}
        />
      )}

      {/* If the very first category is incomplete and there's no "completed before" */}
      {suggestedSection && !completedForSuggestion && (
        <NextStepSuggestion
          completedSection="business"
          mode={businessMode}
          onNavigate={onNavigate}
        />
      )}

      {/* Category cards grid — 2-col with more breathing room */}
      <div
        className={cn(
          "grid gap-5",
          "grid-cols-1 sm:grid-cols-2",
        )}
      >
        {[...BRAIN_CATEGORIES]
          .sort((a, b) => a.order - b.order)
          .map((cat) => (
            <BrainCategoryCard
              key={cat.id}
              category={cat}
              resolvedTitle={resolveCardTitle(cat.titleKey, cat.title, businessMode)}
              completion={completions[cat.section] ?? { totalFields: 0, completedFields: 0, percentage: 100, hasRequiredIncomplete: false }}
              summaryText={getCategorySummary(cat.section, summaries)}
              onNavigate={onNavigate}
            />
          ))}
      </div>
    </div>
  );
}
