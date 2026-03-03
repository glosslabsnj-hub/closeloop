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

import { useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Loader2 } from "lucide-react";

// Hooks
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useFoodMode } from "@/hooks/useFoodMode";
import { useFoodOrderSettings } from "@/hooks/useFoodOrderSettings";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { SECTION_RELEVANCE } from "@/config/brainSectionRelevance";
import { useBrainSummaries } from "@/hooks/useBrainSummaries";
import { useAddOnSections, type AddOnItem } from "@/hooks/useAddOnSections";
import { useBrainReviewCount } from "@/components/brain/BrainReviewQueue";
import { useBrainItemStatuses } from "@/hooks/useBrainItemStatuses";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";

// Registry + renderer
import {
  groupSectionItems,
  findItemByIdGlobal,
  type BrainSectionItem,
  type VisibilityFlags,
} from "@/config/brainSectionRegistry";
import { getItemsForModeTab, getModeCategories } from "@/config/brainModeLayout";
import { SECTION_GUIDANCE } from "@/config/brainGuidance";

// Layout components (lightweight — no editor imports)
import {
  AddOnGroup,
  HIPAAWarning,
  BRAIN_CATEGORIES,
  BrainProgressIndicator,
  BrainSetupBanner,
  CompletionCelebration,
  NextStepSuggestion,
  type CategoryConfig,
} from "@/components/brain/layout";

// Dashboard components
import { BrainDashboard } from "@/components/brain/dashboard/BrainDashboard";

// Error boundary
import ErrorBoundary from "@/components/ErrorBoundary";

// Tab-specific banner components
import { QuoteReadinessCard } from "@/components/brain/editors/QuoteReadinessCard";

// ─── Lazy-loaded heavy sub-views ────────────────────────────────────────────
// These are code-split into separate chunks so the dashboard hub loads fast.
// BrainSectionDetailHost pulls in all 50+ editors (~600 kB); IntelligenceDashboard
// and WorkflowConfigEditor each have their own heavy dependency trees.
const BrainSectionDetailHost = lazy(() =>
  import("@/components/brain/BrainSectionDetailHost").then(m => ({ default: m.BrainSectionDetailHost }))
);
const IntelligenceDashboard = lazy(() =>
  import("@/components/intelligence").then(m => ({ default: m.IntelligenceDashboard }))
);
const WorkflowConfigEditor = lazy(() =>
  import("@/components/brain/WorkflowConfigEditor")
);
const GuidedSetupFlow = lazy(() =>
  import("@/components/brain/guided/GuidedSetupFlow").then(m => ({ default: m.GuidedSetupFlow }))
);

const LazyFallback = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);


// ─── Section IDs ────────────────────────────────────────────────────────────

/** Mode-shaped tab sections (replaces the old 6-tab fixed structure) */
type ModeSectionId = "about" | "services" | "operations" | "training" | "intelligence" | "workflow";
const NEW_VALID_SECTIONS = ["about", "services", "operations", "training", "intelligence", "workflow"] as const;

/** All old section params still work — resolve to the new tab */
const LEGACY_SECTION_ALIASES: Record<string, ModeSectionId> = {
  // Old tab names → new tab names
  business: "about",
  "ai-voice": "training",
  // Old granular sections → new merged tabs
  profile: "about",
  hours: "about",
  availability: "about",
  "calendar-sync": "about",
  calendar: "about",
  "service-area": "operations",
  rules: "training",
  policies: "training",
  "ai-behavior": "training",
  knowledge: "training",
};

/** Scroll/item targets when navigating to merged tabs via legacy section IDs */
const LEGACY_ITEM_TARGETS: Record<string, string> = {
  hours: "business-hours",
  availability: "calendar-sync",
  "calendar-sync": "calendar-sync",
  "service-area": "coverage",
  policies: "policies",
  "ai-behavior": "scripts",
  "ai-voice": "scripts",
};

/** Legacy tab param mapping (from old ?tab= format) */
const LEGACY_TAB_TO_SECTION: Record<string, { section: ModeSectionId; item?: string }> = {
  review: { section: "training", item: "review" },
  updates: { section: "training", item: "review" },
  assets: { section: "training", item: "documents" },
  uploads: { section: "training", item: "documents" },
  overview: { section: "about" },
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

  // Guided setup mode: ?mode=setup or auto-detected for new users
  const modeParam = searchParams.get("mode");
  const isGuidedMode = modeParam === "setup";
  const { p0Flags: _readinessP0Flags, score: readinessScore } = useAIReadinessV2();

  // Auto-trigger guided setup for new users with low readiness
  const isNewUserFirstVisit = !modeParam && readinessScore < 50 &&
    !localStorage.getItem("brain_guided_dismissed");
  const shouldShowGuided = isGuidedMode || isNewUserFirstVisit;

  const handleSwitchToFullBrain = useCallback(() => {
    localStorage.setItem("brain_guided_dismissed", "true");
    setSearchParams({ mode: "full" }, { replace: true });
  }, [setSearchParams]);

  const handleEnterGuidedMode = useCallback(() => {
    setSearchParams({ mode: "setup" }, { replace: true });
  }, [setSearchParams]);
  const caps = useCapabilities();
  const { isFoodMode } = useFoodMode();
  const { acceptsDelivery: foodAcceptsDelivery, acceptsCatering: foodAcceptsCatering, needsCoverageSettings: foodNeedsCoverage } = useFoodOrderSettings();
  const summaries = useBrainSummaries();
  const industryContext = useIndustryContext();
  const terms = industryContext.terminology;
  const statuses = useBrainItemStatuses();

  // Add-on sections per tab
  const servicesAddOns = useAddOnSections("services");
  const coverageAddOns = useAddOnSections("service-area");
  const policiesAddOns = useAddOnSections("policies");
  const knowledgeAddOns = useAddOnSections("knowledge");

  // Merge add-on items for operations tab
  const _operationsAddOnItems = [...coverageAddOns.addOnItems, ...policiesAddOns.addOnItems];
  const _operationsEnableAddOn = useCallback(async (item: AddOnItem) => {
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
      return { activeSection: mapped.section as ModeSectionId, defaultItemId: mapped.item ?? null };
    }
    // ?section= param
    if (normalizedSectionParam && NEW_VALID_SECTIONS.includes(normalizedSectionParam as ModeSectionId)) {
      const legacyItemTarget = sectionParamRaw ? LEGACY_ITEM_TARGETS[sectionParamRaw] : null;
      return { activeSection: normalizedSectionParam as ModeSectionId, defaultItemId: legacyItemTarget ?? null };
    }
    // Legacy section needing alias rewrite
    if (sectionParamRaw && LEGACY_SECTION_ALIASES[sectionParamRaw]) {
      const resolved = LEGACY_SECTION_ALIASES[sectionParamRaw];
      const legacyItemTarget = LEGACY_ITEM_TARGETS[sectionParamRaw] ?? null;
      return { activeSection: resolved, defaultItemId: legacyItemTarget };
    }
    return { activeSection: null as ModeSectionId | null, defaultItemId: null as string | null };
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

  // Get visible items for active tab (mode-shaped layout)
  const visibleItems = useMemo(() => {
    if (!activeSection) return [];
    return getItemsForModeTab(businessMode, activeSection, caps, visibilityFlags);
  }, [activeSection, businessMode, caps, visibilityFlags]);

  // Group items for sidebar
  const groups = useMemo(() => groupSectionItems(visibleItems), [visibleItems]);

  // Resolve active item ID
  const activeItemId = useMemo(() => {
    if (!activeSection || activeSection === "intelligence" || activeSection === "workflow") return null;

    // 1. Explicit ?item= param
    if (itemParamRaw) {
      const match = visibleItems.find(i => i.id === itemParamRaw);
      if (match) return match.id;
    }

    // 2. Hash deep-link
    const hash = window.location.hash.replace(/^#/, "");
    if (hash) {
      const globalMatch = findItemByIdGlobal(hash);
      if (globalMatch) {
        const match = visibleItems.find(i => i.id === globalMatch.id);
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

  // Find the active item object (global lookup, not tab-scoped)
  const activeItem = useMemo(() => {
    if (!activeSection || !activeItemId) return null;
    return findItemByIdGlobal(activeItemId) ?? null;
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
      const globalMatch = findItemByIdGlobal(hash);
      if (globalMatch) {
        setSearchParams({ section: activeSection, item: globalMatch.id }, { replace: true });
      }
    }
  }, [activeSection, legacyTab, sectionParamRaw, setSearchParams]);

  // ─── Guidance helpers ──────────────────────────────────────────────────────

  const getSectionGuidance = (sectionId: string) => {
    const g = SECTION_GUIDANCE[sectionId];
    if (!g) return {};
    const label = terms.appointmentLabel || "appointment";
    const labelPlural = label + "s";
    const resolve = (s: string) =>
      s.replace(/\{\{appointmentLabel\}\}/g, label)
       .replace(/\{\{appointmentLabelPlural\}\}/g, labelPlural);
    return {
      whyText: resolve(g.why),
      whatText: resolve(g.what),
      tipText: resolve(g.tips[businessMode] || g.tips.default),
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

  // Mode-shaped categories for dashboard + detail views (must be before early returns)
  const modeCategories = useMemo(() => getModeCategories(businessMode), [businessMode]);

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
    ? modeCategories.find(c => c.section === activeSection)
      // Fallback: construct a minimal category so URL navigation always works
      ?? (NEW_VALID_SECTIONS.includes(activeSection as any) ? {
        id: `mode-${activeSection}`,
        title: activeSection.charAt(0).toUpperCase() + activeSection.slice(1),
        description: "",
        icon: "Settings",
        section: activeSection,
        order: 0,
        cards: [],
      } as ReturnType<typeof getModeCategories>[number] : null)
    : null;

  // ─── Build banner content per tab ──────────────────────────────────────────

  const buildBannerContent = () => {
    if (!activeSection) return undefined;

    switch (activeSection) {
      case "about":
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
                  { id: "business-info", label: "Business Info", section: "about", isComplete: !!tenant?.name },
                  { id: "hours", label: "Set Hours", section: "about", isComplete: summaries.hours !== "No hours set yet" },
                  { id: "services", label: `Add ${terms.servicesLabel}`, section: "services", isComplete: summaries.catalog !== "No services added yet" },
                  { id: "scripts", label: "Greeting Script", section: "training", isComplete: summaries.scripts !== "Using the default — customize to match your style" },
                ]}
                onContinue={handleSectionChange}
                dismissible
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

      case "training":
        // AI behavior settings are now proper sidebar items (ai-behavior-mode, call-flow)
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

      case "operations": {
        const opsAddOns = [...coverageAddOns.addOnItems, ...policiesAddOns.addOnItems];
        if (opsAddOns.length > 0) {
          const enableAddOn = async (item: Parameters<typeof coverageAddOns.enableAddOn>[0]) => {
            await coverageAddOns.enableAddOn(item);
            await policiesAddOns.enableAddOn(item);
          };
          return <AddOnGroup items={opsAddOns} onEnable={enableAddOn} />;
        }
        return undefined;
      }

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

          {/* ═══ GUIDED SETUP MODE ═══ */}
          {shouldShowGuided && (
            <ErrorBoundary context="loading Business Brain">
              <Suspense fallback={<LazyFallback />}>
                <GuidedSetupFlow onSwitchToFullBrain={handleSwitchToFullBrain} />
              </Suspense>
            </ErrorBoundary>
          )}

          {/* ═══ NORMAL BRAIN MODE ═══ */}
          {!shouldShowGuided && (
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
                <ErrorBoundary context="loading Business Brain">
                  <BrainDashboard onNavigate={handleSectionChange} onStartGuidedSetup={handleEnterGuidedMode} />
                </ErrorBoundary>
              </motion.div>
            )}

            {/* ═══ INTELLIGENCE (bypasses sidebar layout) ═══ */}
            {activeSection === "intelligence" && (
              <motion.div
                key="section-intelligence"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <ErrorBoundary context="loading Business Brain">
                  <Suspense fallback={<LazyFallback />}>
                    <IntelligenceDashboard businessMode={businessMode} />
                  </Suspense>
                </ErrorBoundary>
              </motion.div>
            )}

            {/* ═══ WORKFLOW CONFIGURATION (bypasses sidebar layout) ═══ */}
            {activeSection === "workflow" && (
              <motion.div
                key="section-workflow"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <ErrorBoundary context="loading Business Brain">
                  <Suspense fallback={<LazyFallback />}>
                    <WorkflowConfigEditor />
                  </Suspense>
                </ErrorBoundary>
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
                <ErrorBoundary context="loading Business Brain">
                <Suspense fallback={<LazyFallback />}>
                <BrainSectionDetailHost
                  activeSection={activeSection}
                  currentCategory={currentCategory}
                  modeCategories={modeCategories}
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
                </Suspense>
                </ErrorBoundary>
              </motion.div>
            )}
          </AnimatePresence>
          )}
        </div>
      </main>

    </div>
  );
}
