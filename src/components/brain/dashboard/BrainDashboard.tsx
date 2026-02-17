/**
 * BrainDashboard - Dashboard hub showing mode-specific category cards
 *
 * This is the Level 1 view of the Business Brain. It shows:
 * - Editorial micro-label header with overall completion
 * - Suggested next step banner
 * - 2-col responsive category cards with per-card progress rings
 * - Intelligence card appended separately (not part of the 5-tab structure)
 */

import { useMemo, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAIN_CATEGORIES, type CategoryConfig } from "@/components/brain/layout/businessBrainNavConfig";
import { getModeCategories } from "@/config/brainModeLayout";
import { BrainCategoryCard } from "./BrainCategoryCard";
import { BrainNextStepsBar } from "./BrainNextStepsBar";
import { NextStepSuggestion } from "@/components/brain/layout/NextStepSuggestion";
import { useAllCategoriesCompletion } from "@/hooks/useCategoryCompletion";
import { useBrainSummaries } from "@/hooks/useBrainSummaries";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { resolveCardTitle } from "@/data/industryTerminology";
import { WebsiteImportWizard } from "@/components/brain/WebsiteImportWizard";

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
    case "about":
    case "business":
      return [summaries.businessInfo, summaries.hours].filter(Boolean).join(" \u00B7 ");
    case "services":
      return [summaries.catalog, summaries.pricingRules].filter(Boolean).join(" \u00B7 ");
    case "operations":
      return [summaries.coverage, summaries.policies].filter(Boolean).join(" \u00B7 ");
    case "ai-voice":
      return [summaries.scripts, summaries.guidelines].filter(Boolean).join(" \u00B7 ");
    case "training":
      return [summaries.scripts, summaries.faqs, summaries.objections].filter(Boolean).join(" \u00B7 ");
    default:
      return "";
  }
}

export function BrainDashboard({ onNavigate }: BrainDashboardProps) {
  const completions = useAllCategoriesCompletion();
  const summaries = useBrainSummaries();
  const { businessMode } = useTenantConfig();
  const [websiteImportOpen, setWebsiteImportOpen] = useState(false);

  // Mode-specific categories (5 tabs)
  const modeCategories = useMemo(() => getModeCategories(businessMode), [businessMode]);

  // Intelligence category from BRAIN_CATEGORIES (appended separately)
  const intelligenceCategory = BRAIN_CATEGORIES.find((c) => c.section === "intelligence");

  // Overall progress across mode categories only (not intelligence)
  const overall = modeCategories.reduce(
    (acc, cat) => {
      const c = completions[cat.section];
      if (!c) return acc;
      return {
        total: acc.total + c.totalFields,
        completed: acc.completed + c.completedFields,
      };
    },
    { total: 0, completed: 0 },
  );
  const overallPercent = overall.total > 0 ? Math.round((overall.completed / overall.total) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Editorial header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Knowledge Base</p>
            <h1 className="text-2xl font-bold tracking-tight">Business Brain</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setWebsiteImportOpen(true)}>
              <Globe className="h-4 w-4 mr-1.5" />
              Import from Website
            </Button>
            <div className="text-right">
              <span className="text-sm font-medium">{overallPercent}%</span>
              <span className="text-xs text-muted-foreground ml-1">complete</span>
            </div>
          </div>
        </div>
        <Progress value={overallPercent} className="h-1" />
      </div>

      <WebsiteImportWizard open={websiteImportOpen} onOpenChange={setWebsiteImportOpen} />

      {/* Priority next steps engine */}
      <BrainNextStepsBar
        completions={completions}
        categories={modeCategories}
        onNavigate={onNavigate}
      />

      {/* Category cards grid — 2-col with more breathing room */}
      <div
        className={cn(
          "grid gap-5",
          "grid-cols-1 sm:grid-cols-2",
        )}
      >
        {[...modeCategories]
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

        {/* Intelligence card (separate from mode tabs) */}
        {intelligenceCategory && (
          <BrainCategoryCard
            category={intelligenceCategory}
            resolvedTitle={resolveCardTitle(intelligenceCategory.titleKey, intelligenceCategory.title, businessMode)}
            completion={completions[intelligenceCategory.section] ?? { totalFields: 0, completedFields: 0, percentage: 100, hasRequiredIncomplete: false }}
            summaryText={getCategorySummary(intelligenceCategory.section, summaries)}
            onNavigate={onNavigate}
          />
        )}
      </div>
    </div>
  );
}
