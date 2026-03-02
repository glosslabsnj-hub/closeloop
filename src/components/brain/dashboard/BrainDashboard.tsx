/**
 * BrainDashboard - Hub with AI readiness hero, search, and category card grid
 *
 * Layout:
 * 1. Header with actions
 * 2. AI Readiness hero card (large circular progress + recommendations)
 * 3. Full-width search bar
 * 4. All categories as responsive card grid (no essential/more split)
 */

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAIN_CATEGORIES, type CategoryConfig } from "@/components/brain/layout/businessBrainNavConfig";
import { getModeCategories, getModeTabDef } from "@/config/brainModeLayout";
import { useAllCategoriesCompletion, type CategoryCompletionStats } from "@/hooks/useCategoryCompletion";
import { useBrainSummaries } from "@/hooks/useBrainSummaries";
import { useBrainItemStatuses } from "@/hooks/useBrainItemStatuses";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import { useAuth } from "@/contexts/AuthContext";
import { resolveCardTitle } from "@/data/industryTerminology";
import { WebsiteImportWizard } from "@/components/brain/uploads/WebsiteImportWizard";
import {
  Search, AlertCircle, Sparkles, Wand2,
} from "lucide-react";
import { BrainCategoryCard } from "./BrainCategoryCard";

interface BrainDashboardProps {
  onNavigate: (section: string) => void;
  onStartGuidedSetup?: () => void;
}

/**
 * Derive a one-line summary per category.
 * If no data exists, show a helpful action hint instead of blank text.
 */
function getCategorySummary(
  section: string,
  summaries: ReturnType<typeof useBrainSummaries>,
): string {
  switch (section) {
    case "about":
    case "business":
      return [summaries.businessInfo, summaries.hours].filter(Boolean).join(" · ") || "Add your business name and hours so your AI can introduce itself";
    case "services":
      return [summaries.catalog, summaries.pricingRules].filter(Boolean).join(" · ") || "Add what you offer so your AI can quote prices";
    case "operations":
      return [summaries.coverage, summaries.policies].filter(Boolean).join(" · ") || "Set your coverage area and business rules";
    case "ai-voice":
      return [summaries.scripts, summaries.guidelines].filter(Boolean).join(" · ") || "Customize how your AI sounds and behaves";
    case "training":
      return [summaries.scripts, summaries.faqs, summaries.objections].filter(Boolean).join(" · ") || "Teach your AI how to handle calls and answer questions";
    default:
      return "";
  }
}

export function BrainDashboard({ onNavigate, onStartGuidedSetup }: BrainDashboardProps) {
  const completions = useAllCategoriesCompletion();
  const summaries = useBrainSummaries();
  const itemStatuses = useBrainItemStatuses();
  const { businessMode } = useTenantConfig();
  const { tenant } = useAuth();
  const readiness = useAIReadinessV2();
  const [searchQuery, setSearchQuery] = useState("");
  const [websiteImportOpen, setWebsiteImportOpen] = useState(false);

  // Mode-specific categories
  const modeCategories = useMemo(() => getModeCategories(businessMode), [businessMode]);

  // Compute group labels per category from mode layout
  const categoryGroupLabels = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const cat of modeCategories) {
      const tabDef = getModeTabDef(businessMode, cat.section);
      if (tabDef?.groups.length) {
        map[cat.section] = tabDef.groups.map(g => g.label);
      }
    }
    return map;
  }, [modeCategories, businessMode]);

  // Compute group-based completion from item statuses.
  // This uses the SAME data source as the sidebar, preventing mismatches
  // where the sidebar shows "Done" but the card shows 0%.
  const groupCompletions = useMemo(() => {
    const result: Record<string, CategoryCompletionStats> = {};
    for (const cat of modeCategories) {
      const tabDef = getModeTabDef(businessMode, cat.section);
      if (!tabDef) continue;

      let total = 0;
      let completed = 0;
      let hasRequiredIncomplete = false;

      for (const group of tabDef.groups) {
        for (const itemId of group.itemIds) {
          const info = itemStatuses[itemId];
          if (!info || info.status === "optional") continue;
          total++;
          if (info.status === "complete") {
            completed++;
          } else if (info.status === "error") {
            hasRequiredIncomplete = true;
          }
        }
      }

      result[cat.section] = {
        totalFields: total,
        completedFields: completed,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 100,
        hasRequiredIncomplete,
      };
    }
    return result;
  }, [modeCategories, businessMode, itemStatuses]);

  // Intelligence category
  const intelligenceCategory = BRAIN_CATEGORIES.find((c) => c.section === "intelligence");

  // Overall progress (from group-based completion for accurate display)
  const overall = modeCategories.reduce(
    (acc, cat) => {
      const c = groupCompletions[cat.section];
      if (!c) return acc;
      return { total: acc.total + c.totalFields, completed: acc.completed + c.completedFields };
    },
    { total: 0, completed: 0 },
  );
  const overallPercent = overall.total > 0 ? Math.round((overall.completed / overall.total) * 100) : 100;

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    const allCats = intelligenceCategory
      ? [...modeCategories, intelligenceCategory]
      : modeCategories;
    if (!searchQuery.trim()) return allCats;
    const q = searchQuery.toLowerCase();
    return allCats.filter(
      (cat) =>
        cat.title.toLowerCase().includes(q) ||
        cat.description.toLowerCase().includes(q) ||
        getCategorySummary(cat.section, summaries).toLowerCase().includes(q),
    );
  }, [modeCategories, intelligenceCategory, searchQuery, summaries]);

  const isNewSetup = overallPercent < 50;
  const isReady = readiness.score >= 80;

  // Circular progress values
  const circumference = 2 * Math.PI * 54; // radius = 54
  const strokeDashoffset = circumference - (readiness.score / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Business Brain</h1>
          {tenant?.name && (
            <p className="text-sm text-muted-foreground mt-0.5">{tenant.name as string}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1 max-w-lg">
            {isNewSetup
              ? "Set up the essentials below so your AI can start handling calls."
              : "Fine-tune what your AI knows. Each section controls how it handles real calls."
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onStartGuidedSetup && overallPercent < 100 && (
            <Button variant="default" size="sm" onClick={onStartGuidedSetup} className="gap-1.5">
              <Wand2 className="h-4 w-4" />
              Guided Setup
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setWebsiteImportOpen(true)}>
            <Globe className="h-4 w-4 mr-1.5" />
            Import from Website
          </Button>
        </div>
      </div>

      <WebsiteImportWizard open={websiteImportOpen} onOpenChange={setWebsiteImportOpen} />

      {/* ── AI Readiness Hero Card ──────────────────────────────────── */}
      {!searchQuery && (
        <div className={cn(
          "rounded-xl border bg-card/60 backdrop-blur-sm p-6",
          isReady ? "border-primary/20 glow-primary-subtle" : "border-border/30",
        )}>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Circular progress */}
            <div className="relative shrink-0">
              <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
                {/* Background circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted/40"
                />
                {/* Progress circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className={cn(
                    "transition-all duration-700 ease-out",
                    isReady ? "text-primary" : "text-primary/70",
                  )}
                />
              </svg>
              {/* Score in center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-3xl font-bold tabular-nums">{readiness.score}</span>
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            {/* Status + recommendations */}
            <div className="flex-1 min-w-0 space-y-3 text-center sm:text-left">
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <Sparkles className={cn("h-5 w-5", isReady ? "text-primary" : "text-muted-foreground")} />
                  <p className="text-lg font-semibold">
                    {isReady ? "Your AI is ready for calls" : "Getting your AI ready"}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {isReady
                    ? "All essentials configured"
                    : `${readiness.recommendations.length} item${readiness.recommendations.length === 1 ? "" : "s"} to set up`
                  }
                </p>
              </div>

              {/* Recommendation chips */}
              {readiness.recommendations.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  {readiness.recommendations.slice(0, 3).map((rec, i) => {
                    const isP0 = readiness.p0Flags.some(f => rec.label.toLowerCase().includes(f.replace(/_/g, " ")));
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          if (rec.deep_link) {
                            const link = rec.deep_link.startsWith("/") ? rec.deep_link : `/${rec.deep_link}`;
                            const sectionMatch = link.match(/section=([^&]+)/);
                            if (sectionMatch) onNavigate(sectionMatch[1]);
                          }
                        }}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                          isP0
                            ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15",
                        )}
                      >
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{rec.label}</span>
                        {isP0 && <Badge variant="destructive" className="text-[10px] ml-1 shrink-0">Required</Badge>}
                      </button>
                    );
                  })}
                  {readiness.recommendations.length > 3 && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm text-muted-foreground bg-muted/50">
                      +{readiness.recommendations.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {isReady && (
                <div className="flex items-center gap-2 text-sm text-primary justify-center sm:justify-start">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-medium">All set! Your AI is fully configured.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Search Bar (full width) ─────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search settings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* ── Category Card Grid ──────────────────────────────────────── */}
      <div className="space-y-3">
        {searchQuery && (
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Results ({filteredCategories.length})
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories
            .sort((a, b) => a.order - b.order)
            .map((cat) => (
              <BrainCategoryCard
                key={cat.id}
                category={cat}
                resolvedTitle={resolveCardTitle(cat.titleKey, cat.title, businessMode)}
                completion={groupCompletions[cat.section] ?? { totalFields: 0, completedFields: 0, percentage: 100, hasRequiredIncomplete: false }}
                summaryText={getCategorySummary(cat.section, summaries)}
                groupLabels={categoryGroupLabels[cat.section]}
                onEdit={() => onNavigate(cat.section)}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
