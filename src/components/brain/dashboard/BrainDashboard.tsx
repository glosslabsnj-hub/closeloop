/**
 * BrainDashboard - Simplified hub with AI readiness first, essential actions, progressive disclosure
 *
 * Layout:
 * 1. Header with AI readiness progress
 * 2. Essential settings (3 most important for their mode)
 * 3. All settings (collapsible)
 * 4. Intelligence + advanced
 */

import { useMemo, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAIN_CATEGORIES, type CategoryConfig } from "@/components/brain/layout/businessBrainNavConfig";
import { getModeCategories, getModeTabDef } from "@/config/brainModeLayout";
import { useAllCategoriesCompletion } from "@/hooks/useCategoryCompletion";
import { useBrainSummaries } from "@/hooks/useBrainSummaries";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import { useAuth } from "@/contexts/AuthContext";
import { resolveCardTitle } from "@/data/industryTerminology";
import { WebsiteImportWizard } from "@/components/brain/uploads/WebsiteImportWizard";
import {
  Search, Eye, Clock, Bot, UtensilsCrossed, Truck, ShoppingBag, Package,
  ChevronRight, ChevronDown, AlertCircle, Sparkles, Wand2,
} from "lucide-react";
import { BrainQuickAction } from "./BrainQuickAction";
import { BrainCategoryRow } from "./BrainCategoryRow";

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

/** Sections considered essential for getting started */
const ESSENTIAL_SECTIONS = ["about", "services", "training"];

export function BrainDashboard({ onNavigate, onStartGuidedSetup }: BrainDashboardProps) {
  const completions = useAllCategoriesCompletion();
  const summaries = useBrainSummaries();
  const { businessMode } = useTenantConfig();
  const { tenant } = useAuth();
  const readiness = useAIReadinessV2();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllSettings, setShowAllSettings] = useState(false);
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

  // Intelligence category
  const intelligenceCategory = BRAIN_CATEGORIES.find((c) => c.section === "intelligence");

  // Overall progress
  const overall = modeCategories.reduce(
    (acc, cat) => {
      const c = completions[cat.section];
      if (!c) return acc;
      return { total: acc.total + c.totalFields, completed: acc.completed + c.completedFields };
    },
    { total: 0, completed: 0 },
  );
  const overallPercent = overall.total > 0 ? Math.round((overall.completed / overall.total) * 100) : 100;

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return modeCategories;
    const q = searchQuery.toLowerCase();
    return modeCategories.filter(
      (cat) =>
        cat.title.toLowerCase().includes(q) ||
        cat.description.toLowerCase().includes(q) ||
        getCategorySummary(cat.section, summaries).toLowerCase().includes(q),
    );
  }, [modeCategories, searchQuery, summaries]);

  // Split into essential + other
  const essentialCategories = filteredCategories
    .filter((c) => ESSENTIAL_SECTIONS.includes(c.section))
    .sort((a, b) => a.order - b.order);

  const otherCategories = filteredCategories
    .filter((c) => !ESSENTIAL_SECTIONS.includes(c.section))
    .sort((a, b) => a.order - b.order);

  const isNewSetup = overallPercent < 50;
  const isReady = readiness.score >= 80;

  // Quick actions — mode-aware labels and icons
  const quickActions = useMemo(() => {
    const servicesIcon = businessMode === "food" ? UtensilsCrossed
      : businessMode === "dispatch" ? Truck
      : businessMode === "sales" ? ShoppingBag
      : Package;
    const servicesLabel = businessMode === "food" ? "Menu"
      : businessMode === "dispatch" ? "Services"
      : businessMode === "sales" ? "Products"
      : "Services";
    return [
      { id: "about", icon: Clock, label: "Hours", section: "about", item: "business-hours" },
      { id: "services", icon: servicesIcon, label: servicesLabel, section: "services" },
      { id: "training", icon: Bot, label: "AI Tone", section: "training", item: "scripts" },
    ];
  }, [businessMode]);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
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
      </div>

      <WebsiteImportWizard open={websiteImportOpen} onOpenChange={setWebsiteImportOpen} />

      {/* ── AI Readiness — FIRST, most important visual ──────────── */}
      {!searchQuery && (
        <div className={cn(
          "rounded-xl border bg-card/60 backdrop-blur-sm p-5 space-y-4",
          isReady ? "border-primary/20 glow-primary-subtle" : "border-border/30",
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 glow-primary-sm">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {isReady ? "Your AI is ready for calls" : "Getting your AI ready"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isReady ? "All essentials configured" : `${readiness.recommendations.length} item${readiness.recommendations.length === 1 ? "" : "s"} to set up`}
                </p>
              </div>
            </div>
            <span className="text-sm font-bold tabular-nums">{readiness.score}%</span>
          </div>
          <Progress value={readiness.score} className="h-2" />

          {readiness.recommendations.length > 0 && (
            <div className="space-y-1.5">
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
                      "flex items-center gap-3 w-full p-2.5 rounded-lg border border-transparent hover:border-border/20 hover:bg-card/80 transition-colors text-left group",
                      isP0 ? "accent-left-destructive" : "accent-left-warning",
                    )}
                  >
                    <AlertCircle className={cn("h-4 w-4 shrink-0", isP0 ? "text-destructive" : "text-warning")} />
                    <span className="text-sm flex-1 truncate">{rec.label}</span>
                    {isP0 && <Badge variant="destructive" className="text-[10px] shrink-0">Required</Badge>}
                    <span className="text-xs text-primary font-medium shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      Fix now
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {isReady && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">All set! Your AI is fully configured.</span>
            </div>
          )}
        </div>
      )}

      {/* ── Quick Actions ──────────────────────────────────────────── */}
      {!searchQuery && (
        <div className="space-y-2">
          <div className="divider-gradient" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">
            Quick Actions
          </p>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <BrainQuickAction
                key={action.id}
                icon={action.icon}
                label={action.label}
                onClick={() => {
                  const params = action.item
                    ? `${action.section}`
                    : action.section;
                  onNavigate(params);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Search (appears when user wants to find something specific) ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate("training")}
          className="gap-1.5 hidden sm:flex"
        >
          <Eye className="h-3.5 w-3.5" />
          View AI Preview
        </Button>
      </div>

      {/* ── Essential Settings (always visible) ─────────────────── */}
      {!searchQuery && essentialCategories.length > 0 && (
        <div className="space-y-2">
          <div className="divider-gradient" />
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isNewSetup ? "Set Up These First" : "Essential Settings"}
            </p>
            {isNewSetup && (
              <Badge variant="outline" className="text-[10px]">Most Important</Badge>
            )}
          </div>
          <div className="rounded-xl border-border/30 border bg-card/60 backdrop-blur-sm divide-y divide-border/20">
            {essentialCategories.map((cat) => (
              <BrainCategoryRow
                key={cat.id}
                category={cat}
                resolvedTitle={resolveCardTitle(cat.titleKey, cat.title, businessMode)}
                completion={completions[cat.section] ?? { totalFields: 0, completedFields: 0, percentage: 100, hasRequiredIncomplete: false }}
                summaryText={getCategorySummary(cat.section, summaries)}
                groupLabels={categoryGroupLabels[cat.section]}
                onEdit={() => onNavigate(cat.section)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── More Settings (collapsible) ──────────────────────────── */}
      {!searchQuery && otherCategories.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowAllSettings(!showAllSettings)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAllSettings ? (
              <ChevronDown className="h-3.5 w-3.5 transition-transform" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 transition-transform" />
            )}
            More Settings ({otherCategories.length})
          </button>
          {showAllSettings && (
            <div className="rounded-xl border-border/30 border bg-card/60 backdrop-blur-sm divide-y divide-border/20">
              {otherCategories.map((cat) => (
                <BrainCategoryRow
                  key={cat.id}
                  category={cat}
                  resolvedTitle={resolveCardTitle(cat.titleKey, cat.title, businessMode)}
                  completion={completions[cat.section] ?? { totalFields: 0, completedFields: 0, percentage: 100, hasRequiredIncomplete: false }}
                  summaryText={getCategorySummary(cat.section, summaries)}
                  groupLabels={categoryGroupLabels[cat.section]}
                  onEdit={() => onNavigate(cat.section)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Search results (show all when searching) ─────────────── */}
      {searchQuery && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Results ({filteredCategories.length})
          </p>
          <div className="rounded-xl border-border/30 border bg-card/60 backdrop-blur-sm divide-y divide-border/20">
            {filteredCategories
              .sort((a, b) => a.order - b.order)
              .map((cat) => (
                <BrainCategoryRow
                  key={cat.id}
                  category={cat}
                  resolvedTitle={resolveCardTitle(cat.titleKey, cat.title, businessMode)}
                  completion={completions[cat.section] ?? { totalFields: 0, completedFields: 0, percentage: 100, hasRequiredIncomplete: false }}
                  summaryText={getCategorySummary(cat.section, summaries)}
                  groupLabels={categoryGroupLabels[cat.section]}
                  onEdit={() => onNavigate(cat.section)}
                />
              ))}
          </div>
        </div>
      )}

      {/* Intelligence card */}
      {!searchQuery && intelligenceCategory && showAllSettings && (
        <div className="rounded-xl border-border/30 border bg-card/60 backdrop-blur-sm divide-y divide-border/20">
          <BrainCategoryRow
            category={intelligenceCategory}
            resolvedTitle={resolveCardTitle(intelligenceCategory.titleKey, intelligenceCategory.title, businessMode)}
            completion={completions[intelligenceCategory.section] ?? { totalFields: 0, completedFields: 0, percentage: 100, hasRequiredIncomplete: false }}
            summaryText={getCategorySummary(intelligenceCategory.section, summaries)}
            groupLabels={categoryGroupLabels[intelligenceCategory.section]}
            onEdit={() => onNavigate(intelligenceCategory.section)}
          />
        </div>
      )}
    </div>
  );
}
