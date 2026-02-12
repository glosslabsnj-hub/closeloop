/**
 * Business Brain - Centralized hub for ALL business knowledge editing
 *
 * REDESIGNED: Sidebar + Content Panel layout
 * - Level 1: Dashboard with 5 category cards, progress rings, summaries (unchanged)
 * - Level 2: Sidebar + content panel split (replaces card-wall pattern)
 *
 * All existing editors, hooks, and save logic preserved.
 * Backward-compatible URL aliases for all legacy section params.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed } from "lucide-react";

// Hooks
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useFoodMode } from "@/hooks/useFoodMode";
import { useFoodOrderSettings } from "@/hooks/useFoodOrderSettings";
import { getIndustryTerminology, resolveCardTitle } from "@/data/industryTerminology";
import { SECTION_RELEVANCE } from "@/config/brainSectionRelevance";
import { useCategoryCompletion } from "@/hooks/useCategoryCompletion";
import { useBrainSummaries } from "@/hooks/useBrainSummaries";
import { useAddOnSections, type AddOnItem } from "@/hooks/useAddOnSections";
import { useBrainReviewCount } from "@/components/brain/BrainReviewQueue";
import { useBrainItemStatuses } from "@/hooks/useBrainItemStatuses";

// Registry + renderer
import {
  getVisibleItems,
  groupSectionItems,
  findItemById,
  findItemForHash,
  type NewSectionId,
  type VisibilityFlags,
} from "@/config/brainSectionRegistry";
import { SECTION_GUIDANCE } from "@/config/brainGuidance";
import { BrainEditorRenderer } from "@/components/brain/layout/BrainEditorRenderer";

// Layout components
import {
  AddOnGroup,
  HIPAAWarning,
  BRAIN_CATEGORIES,
  BrainProgressIndicator,
  BrainSetupBanner,
  CompletionCelebration,
  NextStepSuggestion,
} from "@/components/brain/layout";

// Dashboard components
import { BrainDashboard } from "@/components/brain/dashboard/BrainDashboard";
import { BrainSectionDetail } from "@/components/brain/dashboard/BrainSectionDetail";

// Intelligence components
import { IntelligenceDashboard } from "@/components/intelligence";

// Tab-specific banner components
import { QuoteReadinessCard } from "@/components/brain/QuoteReadinessCard";
import ServiceCallFlowSettings from "@/components/ai/ServiceCallFlowSettings";
import AIBehaviorModeSelector from "@/components/ai/AIBehaviorModeSelector";


// ─── Section IDs ────────────────────────────────────────────────────────────

const NEW_VALID_SECTIONS = ["business", "services", "operations", "ai-voice", "training", "intelligence"] as const;

/** All old section params still work — resolve to the new tab */
const LEGACY_SECTION_ALIASES: Record<string, NewSectionId> = {
  profile: "business",
  hours: "business",
  availability: "business",
  "calendar-sync": "business",
  calendar: "business",
  "service-area": "operations",
  policies: "operations",
  "ai-behavior": "ai-voice",
  knowledge: "training",
};

/** Scroll/item targets when navigating to merged tabs via legacy section IDs */
const LEGACY_ITEM_TARGETS: Record<string, string> = {
  hours: "business-hours",
  availability: "calendar-sync",
  "calendar-sync": "calendar-sync",
  "service-area": "coverage",
  policies: "policies",
};

/** Legacy tab param mapping (from old ?tab= format) */
const LEGACY_TAB_TO_SECTION: Record<string, { section: NewSectionId; item?: string }> = {
  review: { section: "training", item: "review" },
  updates: { section: "training", item: "review" },
  assets: { section: "training", item: "documents" },
  uploads: { section: "training", item: "documents" },
  overview: { section: "business" },
  memory: { section: "intelligence" },
};

// ─── Animation variants ─────────────────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function BusinessBrainPage() {
  const { tenant } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const reviewCount = useBrainReviewCount();
  const { businessMode, hipaaMode } = useTenantConfig();
  const caps = useCapabilities();
  const { isFoodMode } = useFoodMode();
  const { acceptsDelivery: foodAcceptsDelivery, acceptsCatering: foodAcceptsCatering, needsCoverageSettings: foodNeedsCoverage } = useFoodOrderSettings();
  const summaries = useBrainSummaries();
  const terms = getIndustryTerminology(businessMode);
  const statuses = useBrainItemStatuses();

  // Add-on sections per tab
  const servicesAddOns = useAddOnSections("services");
  const coverageAddOns = useAddOnSections("service-area");
  const policiesAddOns = useAddOnSections("policies");
  const knowledgeAddOns = useAddOnSections("knowledge");

  // Merge add-on items for operations tab
  const operationsAddOnItems = [...coverageAddOns.addOnItems, ...policiesAddOns.addOnItems];
  const operationsEnableAddOn = useCallback(async (item: AddOnItem) => {
    const coverageIds = new Set(coverageAddOns.addOnItems.map(i => i.id));
    if (coverageIds.has(item.id)) {
      await coverageAddOns.enableAddOn(item);
    } else {
      await policiesAddOns.enableAddOn(item);
    }
  }, [coverageAddOns, policiesAddOns]);

  const sectionParamRaw = searchParams.get("section");
  const legacyTab = searchParams.get("tab");
  const itemParamRaw = searchParams.get("item");

  // Resolve legacy section aliases
  const normalizedSectionParam = sectionParamRaw
    ? (LEGACY_SECTION_ALIASES[sectionParamRaw] ?? sectionParamRaw)
    : null;

  // Determine active section — null means dashboard hub
  const { activeSection, defaultItemId } = useMemo(() => {
    // Legacy ?tab= params
    if (legacyTab && LEGACY_TAB_TO_SECTION[legacyTab]) {
      const mapped = LEGACY_TAB_TO_SECTION[legacyTab];
      return { activeSection: mapped.section as NewSectionId, defaultItemId: mapped.item ?? null };
    }
    // ?section= param
    if (normalizedSectionParam && NEW_VALID_SECTIONS.includes(normalizedSectionParam as NewSectionId)) {
      const legacyItemTarget = sectionParamRaw ? LEGACY_ITEM_TARGETS[sectionParamRaw] : null;
      return { activeSection: normalizedSectionParam as NewSectionId, defaultItemId: legacyItemTarget ?? null };
    }
    // Legacy section needing alias rewrite
    if (sectionParamRaw && LEGACY_SECTION_ALIASES[sectionParamRaw]) {
      const resolved = LEGACY_SECTION_ALIASES[sectionParamRaw];
      const legacyItemTarget = LEGACY_ITEM_TARGETS[sectionParamRaw] ?? null;
      return { activeSection: resolved, defaultItemId: legacyItemTarget };
    }
    return { activeSection: null as NewSectionId | null, defaultItemId: null as string | null };
  }, [legacyTab, normalizedSectionParam, sectionParamRaw]);

  // Build visibility flags for the registry
  const visibilityFlags: VisibilityFlags = useMemo(() => ({
    isFoodMode,
    foodAcceptsDelivery,
    foodAcceptsCatering,
    foodNeedsCoverage,
    showBookingDelivery: caps.isSchedulingBusiness,
    showFoodDelivery: caps.hasFoodOrders,
    isRelevant: (id: string) => {
      // Check if this section has a relevance rule in ANY tab
      const rule = SECTION_RELEVANCE.find(s => s.sectionId === id);
      if (!rule) return true; // No rule = always relevant
      // Delegate to the owning tab's rule directly
      return rule.isRelevant(caps, (tenant?.capabilities_json as Record<string, boolean>) || {});
    },
    reviewCount,
  }), [isFoodMode, foodAcceptsDelivery, foodAcceptsCatering, foodNeedsCoverage, caps, servicesAddOns, coverageAddOns, policiesAddOns, knowledgeAddOns, reviewCount]);

  // Get visible items for active tab
  const visibleItems = useMemo(() => {
    if (!activeSection) return [];
    return getVisibleItems(activeSection, businessMode, caps, visibilityFlags);
  }, [activeSection, businessMode, caps, visibilityFlags]);

  // Group items for sidebar
  const groups = useMemo(() => groupSectionItems(visibleItems), [visibleItems]);

  // Resolve active item ID
  const activeItemId = useMemo(() => {
    if (!activeSection || activeSection === "intelligence") return null;

    // 1. Explicit ?item= param
    if (itemParamRaw) {
      const match = visibleItems.find(i => i.id === itemParamRaw);
      if (match) return match.id;
    }

    // 2. Hash deep-link
    const hash = window.location.hash.replace(/^#/, "");
    if (hash) {
      const resolved = findItemForHash(activeSection, hash);
      if (resolved) {
        const match = visibleItems.find(i => i.id === resolved);
        if (match) return match.id;
      }
    }

    // 3. Legacy default item from section alias
    if (defaultItemId) {
      const match = visibleItems.find(i => i.id === defaultItemId);
      if (match) return match.id;
    }

    // 4. Default to first visible item on desktop, null on mobile
    // We always default to first item — mobile handles the list/editor toggle in BrainSectionDetail
    return visibleItems[0]?.id ?? null;
  }, [activeSection, itemParamRaw, defaultItemId, visibleItems]);

  // Find the active item object
  const activeItem = useMemo(() => {
    if (!activeSection || !activeItemId) return null;
    return findItemById(activeSection, activeItemId) ?? null;
  }, [activeSection, activeItemId]);

  // ─── Navigation handlers ─────────────────────────────────────────────────

  const handleSectionChange = useCallback((section: string) => {
    if (!section) {
      setSearchParams({}, { replace: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const resolved = LEGACY_SECTION_ALIASES[section] || section;
    setSearchParams({ section: resolved }, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setSearchParams]);

  const handleItemChange = useCallback((itemId: string) => {
    if (!activeSection) return;
    if (!itemId) {
      // Mobile back — clear item param
      setSearchParams({ section: activeSection }, { replace: true });
      return;
    }
    setSearchParams({ section: activeSection, item: itemId }, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSection, setSearchParams]);

  // Rewrite legacy params on mount
  useEffect(() => {
    const sectionNeedsAliasRewrite = !!(sectionParamRaw && LEGACY_SECTION_ALIASES[sectionParamRaw]);

    if (legacyTab && LEGACY_TAB_TO_SECTION[legacyTab]) {
      const mapped = LEGACY_TAB_TO_SECTION[legacyTab];
      const params: Record<string, string> = { section: mapped.section };
      if (mapped.item) params.item = mapped.item;
      setSearchParams(params, { replace: true });
      return;
    }

    if (sectionNeedsAliasRewrite && activeSection) {
      const params: Record<string, string> = { section: activeSection };
      const itemTarget = sectionParamRaw ? LEGACY_ITEM_TARGETS[sectionParamRaw] : null;
      if (itemTarget) params.item = itemTarget;
      setSearchParams(params, { replace: true });
    }

    // Handle hash → item param
    const hash = window.location.hash.replace(/^#/, "");
    if (hash && activeSection && activeSection !== "intelligence") {
      const resolved = findItemForHash(activeSection, hash);
      if (resolved) {
        setSearchParams({ section: activeSection, item: resolved }, { replace: true });
      }
    }
  }, [activeSection, legacyTab, sectionParamRaw, setSearchParams]);

  // ─── Guidance helpers ──────────────────────────────────────────────────────

  const getSectionGuidance = (sectionId: string) => {
    const g = SECTION_GUIDANCE[sectionId];
    if (!g) return {};
    return {
      whyText: g.why,
      whatText: g.what,
      tipText: g.tips[businessMode] || g.tips.default,
    };
  };

  const getCardConfig = (cardId: string) => {
    for (const cat of BRAIN_CATEGORIES) {
      const card = cat.cards.find(c => c.id === cardId);
      if (card) return card;
    }
    return undefined;
  };

  const getUsedByAI = (cardId: string): string[] | undefined => {
    return getCardConfig(cardId)?.usedByAI;
  };

  // ─── Early returns ─────────────────────────────────────────────────────────

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const isDispatchMode = caps.isDispatchBusiness;

  const currentCategory = activeSection
    ? BRAIN_CATEGORIES.find(c => c.section === activeSection) ?? null
    : null;

  // ─── Build banner content per tab ──────────────────────────────────────────

  const buildBannerContent = () => {
    if (!activeSection) return undefined;

    switch (activeSection) {
      case "business":
        return (
          <>
            {summaries.completionStats.percentage >= 100 && (
              <CompletionCelebration
                enhancements={[
                  { id: "faqs", label: "Add FAQs", description: "Reduce \"I don't know\" responses", section: "training" },
                  { id: "objections", label: "Handle objections", description: "Address price pushback", section: "training" },
                  { id: "documents", label: "Upload documents", description: "Reference materials for AI", section: "training" },
                ]}
                onNavigate={handleSectionChange}
                onGoToDashboard={() => window.location.href = "/app"}
              />
            )}
            {summaries.completionStats.percentage < 100 && summaries.completionStats.percentage < 50 && (
              <BrainSetupBanner
                steps={[
                  { id: "business-info", label: "Business Info", section: "business", isComplete: !!tenant?.name },
                  { id: "hours", label: "Set Hours", section: "business", isComplete: summaries.hours !== "No hours set yet" },
                  { id: "services", label: `Add ${terms.servicesLabel}`, section: "services", isComplete: summaries.catalog !== "No services added yet" },
                  { id: "scripts", label: "Greeting Script", section: "ai-voice", isComplete: summaries.scripts !== "Using the default — customize to match your style" },
                ]}
                onContinue={handleSectionChange}
                dismissible
              />
            )}
            {summaries.completionStats.percentage < 100 && (
              <BrainProgressIndicator
                completedSections={summaries.completionStats.completed}
                totalSections={summaries.completionStats.total}
                incompleteItems={summaries.completionStats.incompleteItems}
                onNavigateToSection={handleSectionChange}
              />
            )}
            {tenant?.name && summaries.hours !== "No hours set yet" && (summaries.catalog === "No services added yet") && (
              <NextStepSuggestion
                completedSection="business"
                mode={businessMode}
                onNavigate={handleSectionChange}
              />
            )}
          </>
        );

      case "services":
        return <QuoteReadinessCard />;

      case "operations":
        if ((businessMode === "food" || isFoodMode) && !foodNeedsCoverage) {
          return (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <UtensilsCrossed className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Coverage Settings Not Configured</p>
                  <p className="text-sm text-muted-foreground">
                    If you offer <strong>delivery</strong> or <strong>catering/private events</strong>, you'll need to configure your coverage area so your AI knows where you can serve.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSectionChange("services")}
                  >
                    <UtensilsCrossed className="h-4 w-4 mr-2" />
                    Configure Service Types
                  </Button>
                  <p className="text-xs text-muted-foreground pt-2">
                    Enable Delivery or Catering in <strong>Services &amp; Pricing</strong> and the coverage options will appear here.
                  </p>
                </div>
              </div>
            </div>
          );
        }
        return undefined;

      case "ai-voice":
        if (caps.isServiceBusiness || caps.derivedPrimaryMode === "general") {
          return (
            <div className="space-y-6">
              <AIBehaviorModeSelector />
              <ServiceCallFlowSettings />
            </div>
          );
        }
        return undefined;

      default:
        return undefined;
    }
  };

  // ─── Build add-on content per tab ──────────────────────────────────────────

  const buildAddOnContent = () => {
    if (!activeSection) return undefined;

    switch (activeSection) {
      case "services":
        if (servicesAddOns.addOnItems.length > 0) {
          return <AddOnGroup items={servicesAddOns.addOnItems} onEnable={servicesAddOns.enableAddOn} />;
        }
        return undefined;

      case "operations":
        if (operationsAddOnItems.length > 0) {
          return <AddOnGroup items={operationsAddOnItems} onEnable={operationsEnableAddOn} />;
        }
        return undefined;

      case "training":
        if (knowledgeAddOns.addOnItems.length > 0) {
          return <AddOnGroup items={knowledgeAddOns.addOnItems} onEnable={knowledgeAddOns.enableAddOn} />;
        }
        return undefined;

      default:
        return undefined;
    }
  };

  // ─── Resolve usedByAI + guidance for active item ───────────────────────────

  const activeUsedByAI = activeItemId ? getUsedByAI(activeItemId) : undefined;
  const activeGuidance = activeItemId ? getSectionGuidance(activeItemId) : undefined;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1">
        <div className="container max-w-6xl py-8 px-4 sm:px-6 lg:px-8">
          {/* HIPAA Warning */}
          {hipaaMode && <HIPAAWarning className="mb-4" />}

          <AnimatePresence mode="wait">
            {/* ═══ DASHBOARD HUB (no ?section= param) ═══ */}
            {!activeSection && (
              <motion.div
                key="dashboard"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <BrainDashboard onNavigate={handleSectionChange} />
              </motion.div>
            )}

            {/* ═══ INTELLIGENCE (bypasses sidebar layout) ═══ */}
            {activeSection === "intelligence" && currentCategory && (
              <motion.div
                key="section-intelligence"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <IntelligenceDashboard businessMode={businessMode} />
              </motion.div>
            )}

            {/* ═══ SECTION DETAIL VIEWS (sidebar + content) ═══ */}
            {activeSection && activeSection !== "intelligence" && currentCategory && (
              <motion.div
                key={`section-${activeSection}`}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <BrainSectionDetailHost
                  activeSection={activeSection}
                  currentCategory={currentCategory}
                  onBack={() => handleSectionChange("")}
                  onNavigate={handleSectionChange}
                  activeItemId={activeItemId}
                  onItemChange={handleItemChange}
                  groups={groups}
                  statuses={statuses}
                  activeItem={activeItem}
                  usedByAI={activeUsedByAI}
                  guidance={activeGuidance}
                  bannerContent={buildBannerContent()}
                  addOnContent={buildAddOnContent()}
                  businessMode={businessMode}
                  caps={caps}
                  isFoodMode={isFoodMode}
                  isDispatchMode={isDispatchMode}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

    </div>
  );
}

// ─── Section Detail Host ─────────────────────────────────────────────────────
// Thin wrapper that adds completion stats and renders the editor.

interface SectionDetailHostProps {
  activeSection: NewSectionId;
  currentCategory: (typeof BRAIN_CATEGORIES)[number];
  onBack: () => void;
  onNavigate: (section: string) => void;
  activeItemId: string | null;
  onItemChange: (itemId: string) => void;
  groups: ReturnType<typeof groupSectionItems>;
  statuses: ReturnType<typeof useBrainItemStatuses>;
  activeItem: ReturnType<typeof findItemById> | null;
  usedByAI?: string[];
  guidance?: { whyText?: string; whatText?: string; tipText?: string };
  bannerContent?: React.ReactNode;
  addOnContent?: React.ReactNode;
  businessMode: ReturnType<typeof useTenantConfig>["businessMode"];
  caps: ReturnType<typeof useCapabilities>;
  isFoodMode: boolean;
  isDispatchMode: boolean;
}

function BrainSectionDetailHost({
  activeSection,
  currentCategory,
  onBack,
  onNavigate,
  activeItemId,
  onItemChange,
  groups,
  statuses,
  activeItem,
  usedByAI,
  guidance,
  bannerContent,
  addOnContent,
  businessMode,
  caps,
  isFoodMode,
  isDispatchMode,
}: SectionDetailHostProps) {
  const completion = useCategoryCompletion(activeSection);

  const categoryTitle = resolveCardTitle(currentCategory.titleKey, currentCategory.title, businessMode);

  return (
    <BrainSectionDetail
      category={currentCategory}
      resolvedTitle={categoryTitle}
      completion={completion}
      onBack={onBack}
      onNavigate={onNavigate}
      activeItemId={activeItemId}
      onItemChange={onItemChange}
      groups={groups}
      statuses={statuses}
      activeItem={activeItem ?? null}
      usedByAI={usedByAI}
      guidance={guidance}
      bannerContent={bannerContent}
      addOnContent={addOnContent}
      editorContent={
        activeItemId ? (
          <BrainEditorRenderer
            itemId={activeItemId}
            businessMode={businessMode}
            caps={caps}
            isFoodMode={isFoodMode}
            isDispatchMode={isDispatchMode}
          />
        ) : null
      }
    />
  );
}
