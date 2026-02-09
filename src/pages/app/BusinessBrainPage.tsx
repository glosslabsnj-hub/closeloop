/**
 * Business Brain - Centralized hub for ALL business knowledge editing
 *
 * REDESIGNED: Dashboard Hub + Section Detail pattern
 * - Level 1: Dashboard with 5 category cards, progress rings, summaries
 * - Level 2: Detail view with back button, section content, prev/next nav
 *
 * All existing save logic, editors, and hooks preserved.
 * Backward-compatible URL aliases for all legacy section params.
 */

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Wrench } from "lucide-react";

// Section editors (unchanged logic)
import { PricingRulesEditor } from "@/components/settings/PricingRulesEditor";
import { BusynessRulesEditor } from "@/components/settings/BusynessRulesEditor";
import { ServiceCatalogEditor } from "@/components/brain/ServiceCatalogEditor";
import { AdditionalServicesEditor } from "@/components/brain/AdditionalServicesEditor";
import { MenuCatalogEditor } from "@/components/brain/MenuCatalogEditor";
import { DispatchServiceCatalog } from "@/components/brain/dispatch/DispatchServiceCatalog";
import { RequiredQuestionsEditor } from "@/components/settings/RequiredQuestionsEditor";
import { AIBusinessPolicies } from "@/components/settings/AIBusinessPolicies";
import { AvailabilityHub } from "@/components/availability/AvailabilityHub";
import { BusinessFAQEditor } from "@/components/brain/BusinessFAQEditor";
import { BusinessObjectionEditor } from "@/components/brain/BusinessObjectionEditor";
import { BookingDeliverySettings } from "@/components/settings/BookingDeliverySettings";
import { FoodOrderSettings } from "@/components/settings/FoodOrderSettings";
import { DispatchDeliverySettings } from "@/components/settings/DispatchDeliverySettings";
import { MedicalHIPAASettings } from "@/components/settings/MedicalHIPAASettings";
import { BusinessProfileEditor } from "@/components/brain/BusinessProfileEditor";
import { BusinessPoliciesEditor } from "@/components/brain/BusinessPoliciesEditor";
import { CustomPoliciesEditor } from "@/components/brain/CustomPoliciesEditor";
import { ServiceAreaManager } from "@/components/brain/ServiceAreaManager";
import { BrainAssetsManager } from "@/components/brain/BrainAssetsManager";
import { BrainReviewQueue, useBrainReviewCount } from "@/components/brain/BrainReviewQueue";
import { CustomKnowledgeEditor } from "@/components/brain/CustomKnowledgeEditor";
import { QuoteReadinessCard } from "@/components/brain/QuoteReadinessCard";
import { IndustryTemplateCard } from "@/components/brain/IndustryTemplateCard";
import { ServiceAreaPreview } from "@/components/debug/ServiceAreaPreview";
import { DistanceEtaSection } from "@/components/business-brain/DistanceEtaSection";
import { DispatchEtaSection } from "@/components/business-brain/DispatchEtaSection";
import { IntelligenceSettingsForm } from "@/components/settings/IntelligenceSettingsForm";
import { BusinessHoursManager } from "@/components/brain/BusinessHoursManager";
import { AINeverPromiseEditor } from "@/components/brain/AINeverPromiseEditor";
import { AIScriptsEditor } from "@/components/brain/AIScriptsEditor";
import ServiceCallFlowSettings from "@/components/ai/ServiceCallFlowSettings";
import {
  ImpoundLotEditor,
  ImpoundFeesEditor,
  ImpoundReleaseEditor,
  DispatchIvrSettings
} from "@/components/brain/dispatch/impound";
import { DistanceBasisSettings } from "@/components/brain/dispatch/DistanceBasisSettings";

// New mode-specific offerings editors
import { PriceModifiersEditor } from "@/components/brain/PriceModifiersEditor";
import { ServicePackagesEditor } from "@/components/brain/ServicePackagesEditor";
import { DispatchPricingEditor, DispatchCoverageZonesEditor } from "@/components/brain/dispatch";
import { FoodServiceTypesEditor, FoodSettingsEditor, MenuSizesEditor, DailySpecialsEditor, DeliveryZonesEditor } from "@/components/brain/food";
import { MedicalPricingEditor, MedicalCoverageEditor } from "@/components/brain/medical";
import { ServiceCoverageEditor } from "@/components/brain/service";
import { ResponseTimeEditor } from "@/components/brain/general";
import {
  MenuKnowledgeEditor,
  CateringKnowledgeEditor,
  VehicleKnowledgeEditor,
  RoadsideKnowledgeEditor,
  SymptomTriageEditor,
  InsuranceKnowledgeEditor,
  ProductKnowledgeEditor,
  AftercareInstructionsEditor,
  CompetitorKnowledgeEditor,
  SeasonalKnowledgeEditor,
} from "@/components/brain/knowledge";

// Hooks
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useFoodMode } from "@/hooks/useFoodMode";
import { useFoodOrderSettings } from "@/hooks/useFoodOrderSettings";
import { getIndustryTerminology } from "@/data/industryTerminology";
import { useCategoryCompletion } from "@/hooks/useCategoryCompletion";

// Layout components
import {
  AddOnGroup,
  HIPAAWarning,
  BRAIN_CATEGORIES,
  SectionSummaryCard,
  BrainProgressIndicator,
  EssentialGroup,
  AdvancedGroup,
  BrainSetupBanner,
  CompletionCelebration,
  NextStepSuggestion,
} from "@/components/brain/layout";
import { useBrainSummaries } from "@/hooks/useBrainSummaries";
import { useAddOnSections, type AddOnItem } from "@/hooks/useAddOnSections";
import { SECTION_GUIDANCE } from "@/config/brainGuidance";
import {
  FileText, Shield, MessageSquareText, Send, Truck, UtensilsCrossed, HeartPulse,
  Building2, Palette, Clock, DollarSign, Tag, MapPin, Navigation, Gauge,
  Calendar, Mic, BookOpen, Brain, HelpCircle, MessageCircle, Lightbulb, FileUp, AlertCircle,
  Warehouse, Phone, FileCheck, Package, Heart, Users
} from "lucide-react";

// Dashboard components
import { BrainDashboard } from "@/components/brain/dashboard/BrainDashboard";
import { BrainSectionDetail } from "@/components/brain/dashboard/BrainSectionDetail";

// ─── Section IDs ────────────────────────────────────────────────────────────

const NEW_VALID_SECTIONS = ["business", "services", "operations", "ai-voice", "training"] as const;
type NewSectionId = typeof NEW_VALID_SECTIONS[number];

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

/** Scroll targets when navigating to merged tabs via legacy section IDs */
const SCROLL_TARGETS: Record<string, string> = {
  hours: "business-hours",
  availability: "calendar-sync",
  "calendar-sync": "calendar-sync",
  "service-area": "coverage",
  policies: "policies",
};

/** Legacy tab param mapping (from old ?tab= format) */
const LEGACY_TAB_TO_SECTION: Record<string, { section: NewSectionId; hash?: string }> = {
  review: { section: "training", hash: "review" },
  updates: { section: "training", hash: "review" },
  assets: { section: "training", hash: "documents" },
  uploads: { section: "training", hash: "documents" },
  overview: { section: "business" },
  memory: { section: "ai-voice", hash: "intelligence" },
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

  // Add-on sections per (old) tab — combined for operations
  const servicesAddOns = useAddOnSections("services");
  const coverageAddOns = useAddOnSections("service-area");
  const policiesAddOns = useAddOnSections("policies");
  const knowledgeAddOns = useAddOnSections("knowledge");

  // Merge add-on items from both coverage and policies for the operations tab
  const operationsAddOnItems = [...coverageAddOns.addOnItems, ...policiesAddOns.addOnItems];
  const operationsEnableAddOn = async (item: AddOnItem) => {
    const coverageIds = new Set(coverageAddOns.addOnItems.map(i => i.id));
    if (coverageIds.has(item.id)) {
      await coverageAddOns.enableAddOn(item);
    } else {
      await policiesAddOns.enableAddOn(item);
    }
  };

  const sectionParamRaw = searchParams.get("section");
  const legacyTab = searchParams.get("tab");

  // Resolve legacy section aliases to new section IDs
  const normalizedSectionParam = sectionParamRaw
    ? (LEGACY_SECTION_ALIASES[sectionParamRaw] ?? sectionParamRaw)
    : null;

  // Determine active section — null means dashboard hub
  const { activeSection, focusHash } = useMemo(() => {
    // Legacy ?tab= params always resolve to a section detail
    if (legacyTab && LEGACY_TAB_TO_SECTION[legacyTab]) {
      const mapped = LEGACY_TAB_TO_SECTION[legacyTab];
      return { activeSection: mapped.section as NewSectionId, focusHash: mapped.hash ?? null };
    }
    // If there's a ?section= param, resolve it
    if (normalizedSectionParam && NEW_VALID_SECTIONS.includes(normalizedSectionParam as NewSectionId)) {
      const scrollTarget = sectionParamRaw ? SCROLL_TARGETS[sectionParamRaw] : null;
      return { activeSection: normalizedSectionParam as NewSectionId, focusHash: scrollTarget as string | null };
    }
    // If there's a raw section param that's not valid, it's still a legacy one needing rewrite — handled in useEffect
    if (sectionParamRaw && LEGACY_SECTION_ALIASES[sectionParamRaw]) {
      const resolved = LEGACY_SECTION_ALIASES[sectionParamRaw];
      const scrollTarget = SCROLL_TARGETS[sectionParamRaw] ?? null;
      return { activeSection: resolved, focusHash: scrollTarget };
    }
    // No params → show dashboard hub
    return { activeSection: null as NewSectionId | null, focusHash: null as string | null };
  }, [legacyTab, normalizedSectionParam, sectionParamRaw]);

  // Controlled expansion state for sections that need to collapse after save
  const [hoursExpanded, setHoursExpanded] = useState(true);

  const handleSectionChange = (section: string) => {
    if (!section) {
      // Navigate to dashboard hub
      setSearchParams({}, { replace: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const resolved = LEGACY_SECTION_ALIASES[section] || section;
    const scrollTarget = SCROLL_TARGETS[section];
    setSearchParams({ section: resolved }, { replace: true });
    if (scrollTarget) {
      setTimeout(() => {
        document.getElementById(scrollTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
    // Reset expansion states when changing sections
    setHoursExpanded(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Rewrite legacy params on mount
  useEffect(() => {
    const sectionNeedsAliasRewrite = !!(sectionParamRaw && LEGACY_SECTION_ALIASES[sectionParamRaw]);

    if (legacyTab && LEGACY_TAB_TO_SECTION[legacyTab]) {
      const mapped = LEGACY_TAB_TO_SECTION[legacyTab];
      setSearchParams({ section: mapped.section }, { replace: true });
      return;
    }

    if (sectionNeedsAliasRewrite && activeSection) {
      setSearchParams({ section: activeSection }, { replace: true });
    }

    // Handle hash scrolling
    const hashToUse = focusHash || window.location.hash.replace(/^#/, "");
    if (hashToUse) {
      setTimeout(() => {
        const element = document.getElementById(hashToUse);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          element.classList.add("ring-2", "ring-primary", "ring-offset-2");
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
          }, 2000);
        }
      }, 100);
    }
  }, [activeSection, focusHash, legacyTab, sectionParamRaw, setSearchParams]);

  // ─── Guidance helper ────────────────────────────────────────────────────

  const getGuidance = (sectionId: string) => {
    const g = SECTION_GUIDANCE[sectionId];
    if (!g) return {};
    return {
      guidanceText: `${g.what} ${g.why}`,
      guidanceTip: g.tips[businessMode] || g.tips.default,
    };
  };

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Capability-aware visibility
  const showBookingDelivery = caps.isSchedulingBusiness;
  const showFoodDelivery = caps.hasFoodOrders;
  const isDispatchMode = caps.isDispatchBusiness;

  const currentCategory = activeSection
    ? BRAIN_CATEGORIES.find(c => c.section === activeSection) ?? null
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content */}
      <main className="flex-1">
        <div className="container max-w-3xl py-6 px-4 sm:px-6">
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

            {/* ═══ SECTION DETAIL VIEWS ═══ */}
            {activeSection && currentCategory && (
              <motion.div
                key={`section-${activeSection}`}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <BrainSectionDetailWrapper
                  activeSection={activeSection}
                  currentCategory={currentCategory}
                  onBack={() => handleSectionChange("")}
                  onNavigate={handleSectionChange}
                  // Pass down all props needed for section content
                  tenant={tenant}
                  businessMode={businessMode}
                  caps={caps}
                  isFoodMode={isFoodMode}
                  isDispatchMode={isDispatchMode}
                  foodAcceptsDelivery={foodAcceptsDelivery}
                  foodAcceptsCatering={foodAcceptsCatering}
                  foodNeedsCoverage={foodNeedsCoverage}
                  summaries={summaries}
                  terms={terms}
                  reviewCount={reviewCount}
                  hoursExpanded={hoursExpanded}
                  setHoursExpanded={setHoursExpanded}
                  getGuidance={getGuidance}
                  showBookingDelivery={showBookingDelivery}
                  showFoodDelivery={showFoodDelivery}
                  servicesAddOns={servicesAddOns}
                  coverageAddOns={coverageAddOns}
                  policiesAddOns={policiesAddOns}
                  knowledgeAddOns={knowledgeAddOns}
                  operationsAddOnItems={operationsAddOnItems}
                  operationsEnableAddOn={operationsEnableAddOn}
                  handleSectionChange={handleSectionChange}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// ─── Section Detail Wrapper ─────────────────────────────────────────────────
// Extracts the BrainSectionDetail + section-specific content to keep the main
// component readable. All existing editor trees are preserved verbatim.

interface SectionDetailWrapperProps {
  activeSection: NewSectionId;
  currentCategory: (typeof BRAIN_CATEGORIES)[number];
  onBack: () => void;
  onNavigate: (section: string) => void;
  tenant: NonNullable<ReturnType<typeof useAuth>["tenant"]>;
  businessMode: ReturnType<typeof useTenantConfig>["businessMode"];
  caps: ReturnType<typeof useCapabilities>;
  isFoodMode: boolean;
  isDispatchMode: boolean;
  foodAcceptsDelivery: boolean;
  foodAcceptsCatering: boolean;
  foodNeedsCoverage: boolean;
  summaries: ReturnType<typeof useBrainSummaries>;
  terms: ReturnType<typeof getIndustryTerminology>;
  reviewCount: number;
  hoursExpanded: boolean;
  setHoursExpanded: (v: boolean) => void;
  getGuidance: (sectionId: string) => Record<string, string | undefined>;
  showBookingDelivery: boolean;
  showFoodDelivery: boolean;
  servicesAddOns: ReturnType<typeof useAddOnSections>;
  coverageAddOns: ReturnType<typeof useAddOnSections>;
  policiesAddOns: ReturnType<typeof useAddOnSections>;
  knowledgeAddOns: ReturnType<typeof useAddOnSections>;
  operationsAddOnItems: AddOnItem[];
  operationsEnableAddOn: (item: AddOnItem) => Promise<void>;
  handleSectionChange: (section: string) => void;
}

function BrainSectionDetailWrapper({
  activeSection,
  currentCategory,
  onBack,
  onNavigate,
  tenant,
  businessMode,
  caps,
  isFoodMode,
  isDispatchMode,
  foodAcceptsDelivery,
  foodAcceptsCatering,
  foodNeedsCoverage,
  summaries,
  terms,
  reviewCount,
  hoursExpanded,
  setHoursExpanded,
  getGuidance,
  showBookingDelivery,
  showFoodDelivery,
  servicesAddOns,
  coverageAddOns,
  policiesAddOns,
  knowledgeAddOns,
  operationsAddOnItems,
  operationsEnableAddOn,
  handleSectionChange,
}: SectionDetailWrapperProps) {
  const completion = useCategoryCompletion(activeSection);

  return (
    <BrainSectionDetail
      category={currentCategory}
      completion={completion}
      onBack={onBack}
      onNavigate={onNavigate}
    >
      <div className="space-y-4">
        {/* ═══ YOUR BUSINESS ═══ */}
        {activeSection === "business" && (
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

            <EssentialGroup title="Must-Have Setup" description="How your AI introduces your business">
              <SectionSummaryCard
                id="business-info"
                title="About Your Business"
                icon={Building2}
                status={tenant?.name ? "complete" : "incomplete"}
                statusText={summaries.businessInfo}
                isEssential
                mode={businessMode}
                {...getGuidance("business-info")}
              >
                <BusinessProfileEditor />
              </SectionSummaryCard>

              <SectionSummaryCard
                id="business-hours"
                title="Your Hours"
                icon={Clock}
                status={summaries.hours !== "No hours set yet" ? "complete" : "incomplete"}
                statusText={summaries.hours}
                isEssential
                mode={businessMode}
                expanded={hoursExpanded}
                onExpandedChange={setHoursExpanded}
                {...getGuidance("business-hours")}
              >
                <BusinessHoursManager
                  onSaveComplete={() => setHoursExpanded(false)}
                />
              </SectionSummaryCard>
            </EssentialGroup>

            {caps.isSchedulingBusiness && (
              <EssentialGroup title="Availability" description="Real-time availability from your calendar">
                <SectionSummaryCard
                  id="calendar-sync"
                  title="Calendar & Availability"
                  icon={Calendar}
                  status={summaries.calendar.includes("connected") ? "complete" : "incomplete"}
                  statusText={summaries.calendar}
                  mode={businessMode}
                  defaultExpanded
                  {...getGuidance("calendar-sync")}
                >
                  <AvailabilityHub />
                </SectionSummaryCard>
              </EssentialGroup>
            )}

            {tenant?.name && summaries.hours !== "No hours set yet" && (summaries.catalog === "No services added yet") && (
              <NextStepSuggestion
                completedSection="business"
                mode={businessMode}
                onNavigate={handleSectionChange}
              />
            )}

            <AdvancedGroup title="Quick Setup Templates" collapsedDescription="Pre-built templates for common industries">
              <SectionSummaryCard
                id="templates"
                title="Quick Setup Templates"
                icon={Palette}
                status="incomplete"
                statusText="Pre-built setups for common business types"
                mode={businessMode}
                {...getGuidance("templates")}
              >
                <IndustryTemplateCard />
              </SectionSummaryCard>
            </AdvancedGroup>
          </>
        )}

        {/* ═══ SERVICES & PRICING ═══ */}
        {activeSection === "services" && (
          <>
            <QuoteReadinessCard />

            <EssentialGroup title="What You Sell" description={isFoodMode ? `Your ${terms.serviceItemLabel}s and service types` : `${terms.servicesLabel} you provide`}>
              {isFoodMode && (
                <SectionSummaryCard
                  id="food-service-types"
                  title="Service Types"
                  icon={UtensilsCrossed}
                  status={foodNeedsCoverage ? "complete" : "incomplete"}
                  statusText={
                    foodAcceptsDelivery && foodAcceptsCatering
                      ? "Delivery & Catering enabled"
                      : foodAcceptsDelivery
                      ? "Delivery enabled"
                      : foodAcceptsCatering
                      ? "Catering enabled"
                      : "Dine-in & Pickup only"
                  }
                  isEssential
                  mode={businessMode}
                >
                  <FoodServiceTypesEditor />
                </SectionSummaryCard>
              )}

              {!isDispatchMode && !isFoodMode && (
                <SectionSummaryCard
                  id="pricing-rules"
                  title="How You Price Things"
                  icon={DollarSign}
                  status="incomplete"
                  statusText={summaries.pricingRules}
                  mode={businessMode}
                >
                  <PricingRulesEditor />
                </SectionSummaryCard>
              )}

              <SectionSummaryCard
                id="catalog"
                title={terms.servicesLabel}
                icon={Tag}
                status={summaries.catalog !== "No services added yet" ? "complete" : "incomplete"}
                statusText={summaries.catalog === "No services added yet" ? `No ${terms.serviceItemLabel}s added yet` : summaries.catalog}
                isEssential
                mode={businessMode}
                {...getGuidance("catalog")}
              >
                {isFoodMode ? (
                  <MenuCatalogEditor />
                ) : isDispatchMode ? (
                  <DispatchServiceCatalog />
                ) : (
                  <ServiceCatalogEditor />
                )}
              </SectionSummaryCard>
            </EssentialGroup>

            {servicesAddOns.isRelevant("price-modifiers") && (
              <AdvancedGroup title="Extra Fees & Surcharges" collapsedDescription="Size, urgency, and package pricing">
                <SectionSummaryCard
                  id="price-modifiers"
                  title="Extra Fees & Surcharges"
                  icon={DollarSign}
                  status="incomplete"
                  statusText="Size, urgency, and after-hours rate adjustments"
                  mode={businessMode}
                >
                  <PriceModifiersEditor />
                </SectionSummaryCard>

                {servicesAddOns.isRelevant("service-packages") && (
                  <SectionSummaryCard
                    id="service-packages"
                    title="Service Packages"
                    icon={Package}
                    status="incomplete"
                    statusText="Discounted bundles and membership plans"
                    mode={businessMode}
                  >
                    <ServicePackagesEditor />
                  </SectionSummaryCard>
                )}
              </AdvancedGroup>
            )}

            {servicesAddOns.isRelevant("dispatch-pricing") && (
              <AdvancedGroup title="Dispatch Pricing" collapsedDescription="Equipment fees and distance-based pricing">
                <SectionSummaryCard
                  id="dispatch-pricing"
                  title="Dispatch Fees"
                  icon={DollarSign}
                  status="incomplete"
                  statusText="Equipment, storage, release, and emergency fees"
                  mode={businessMode}
                >
                  <DispatchPricingEditor />
                </SectionSummaryCard>

                <SectionSummaryCard
                  id="distance-basis"
                  title="Distance Pricing"
                  icon={Navigation}
                  status="incomplete"
                  statusText="How mileage affects your quotes"
                  mode={businessMode}
                >
                  <DistanceBasisSettings />
                </SectionSummaryCard>
              </AdvancedGroup>
            )}

            {servicesAddOns.isRelevant("food-settings") && (
              <AdvancedGroup title="Order Options" collapsedDescription="Sizes, specials, and delivery settings">
                <SectionSummaryCard
                  id="food-settings"
                  title="Order Settings"
                  icon={UtensilsCrossed}
                  status="incomplete"
                  statusText="Delivery, pickup, and catering configuration"
                  mode={businessMode}
                >
                  <FoodSettingsEditor />
                </SectionSummaryCard>

                <SectionSummaryCard
                  id="menu-sizes"
                  title="Size Options"
                  icon={Tag}
                  status="incomplete"
                  statusText="S/M/L or Personal/Family size variants"
                  mode={businessMode}
                >
                  <MenuSizesEditor />
                </SectionSummaryCard>

                <SectionSummaryCard
                  id="daily-specials"
                  title="Specials & Deals"
                  icon={Lightbulb}
                  status="incomplete"
                  statusText="Happy hour, daily specials, limited-time offers"
                  mode={businessMode}
                >
                  <DailySpecialsEditor />
                </SectionSummaryCard>
              </AdvancedGroup>
            )}

            {servicesAddOns.isRelevant("medical-pricing") && (
              <AdvancedGroup title="Practice Pricing" collapsedDescription="Insurance, fees, and treatment packages">
                <SectionSummaryCard
                  id="medical-pricing"
                  title="Practice Pricing"
                  icon={HeartPulse}
                  status="incomplete"
                  statusText="Insurance, consultation fees, and payment options"
                  mode={businessMode}
                >
                  <MedicalPricingEditor />
                </SectionSummaryCard>

                <SectionSummaryCard
                  id="service-packages"
                  title="Treatment Packages"
                  icon={Package}
                  status="incomplete"
                  statusText="Series treatments and bundled services"
                  mode={businessMode}
                >
                  <ServicePackagesEditor />
                </SectionSummaryCard>
              </AdvancedGroup>
            )}

            <AdvancedGroup title="Other Things You Offer" collapsedDescription={`Additional offerings beyond your core ${terms.serviceItemLabel}s`}>
              <SectionSummaryCard
                id="additional-services"
                title="Other Things You Offer"
                icon={Wrench}
                status="incomplete"
                statusText={`Secondary ${terms.serviceItemLabel}s beyond your core business`}
                mode={businessMode}
              >
                <AdditionalServicesEditor />
              </SectionSummaryCard>
            </AdvancedGroup>

            {servicesAddOns.addOnItems.length > 0 && (
              <AddOnGroup items={servicesAddOns.addOnItems} onEnable={servicesAddOns.enableAddOn} />
            )}
          </>
        )}

        {/* ═══ HOW YOU OPERATE ═══ */}
        {activeSection === "operations" && (
          <>
            {(businessMode === "food" || isFoodMode) && !foodNeedsCoverage && (
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
            )}

            <EssentialGroup
              title="Where You Work"
              description={`Where your ${terms.teamMemberLabel}s provide ${terms.serviceItemLabel}s`}
              showBadge={["dispatch", "service"].includes(businessMode) || ((businessMode === "food" || isFoodMode) && foodNeedsCoverage)}
            >
              {(businessMode !== "food" && !isFoodMode) || foodNeedsCoverage ? (
                <>
                  <SectionSummaryCard
                    id="coverage"
                    title="Your Service Area"
                    icon={MapPin}
                    status="incomplete"
                    statusText={summaries.coverage}
                    isEssential={["dispatch", "service"].includes(businessMode) || foodNeedsCoverage}
                    mode={businessMode}
                    {...getGuidance("coverage")}
                  >
                    <ServiceAreaPreview />
                    <div className="mt-4">
                      <ServiceAreaManager />
                    </div>
                  </SectionSummaryCard>

                  <SectionSummaryCard
                    id="travel-times"
                    title={foodAcceptsDelivery && !foodAcceptsCatering ? "Delivery Times" :
                           !foodAcceptsDelivery && foodAcceptsCatering ? "Catering Coverage" :
                           "Arrival Estimates"}
                    icon={Navigation}
                    status="incomplete"
                    statusText={summaries.travelTimes}
                    mode={businessMode}
                  >
                    {isDispatchMode ? <DispatchEtaSection /> : <DistanceEtaSection />}
                  </SectionSummaryCard>
                </>
              ) : null}

              {businessMode === "service" && (
                <SectionSummaryCard
                  id="service-coverage"
                  title="Service Scheduling"
                  icon={Clock}
                  status="incomplete"
                  statusText="Same-day service, travel buffers, and duration settings"
                  mode={businessMode}
                >
                  <ServiceCoverageEditor />
                </SectionSummaryCard>
              )}

              {coverageAddOns.isRelevant("dispatch-zones") && (
                <SectionSummaryCard
                  id="dispatch-zones"
                  title="Coverage Zones & ETA"
                  icon={MapPin}
                  status="incomplete"
                  statusText="Distance zones, highway coverage, and ETA rules"
                  mode={businessMode}
                >
                  <DispatchCoverageZonesEditor />
                </SectionSummaryCard>
              )}

              {coverageAddOns.isRelevant("delivery-zones") && foodAcceptsDelivery && (
                <SectionSummaryCard
                  id="delivery-zones"
                  title="Delivery Zones"
                  icon={Truck}
                  status="incomplete"
                  statusText="Delivery areas, fees by zone, and peak hour adjustments"
                  mode={businessMode}
                >
                  <DeliveryZonesEditor />
                </SectionSummaryCard>
              )}

              {coverageAddOns.isRelevant("delivery-zones") && foodAcceptsCatering && (
                <SectionSummaryCard
                  id="catering-coverage"
                  title="Catering Coverage"
                  icon={Users}
                  status="incomplete"
                  statusText="Catering service areas and lead time requirements"
                  mode={businessMode}
                >
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Configure how far you'll travel for catering events and minimum lead time requirements.
                      Your AI will use this to qualify catering inquiries.
                    </p>
                    <DistanceEtaSection />
                  </div>
                </SectionSummaryCard>
              )}

              {coverageAddOns.isRelevant("medical-coverage") && (
                <SectionSummaryCard
                  id="medical-coverage"
                  title="Visit Options"
                  icon={HeartPulse}
                  status="incomplete"
                  statusText="Telehealth, home visits, and appointment scheduling"
                  mode={businessMode}
                >
                  <MedicalCoverageEditor />
                </SectionSummaryCard>
              )}

              {businessMode === "general" && (
                <SectionSummaryCard
                  id="response-times"
                  title="Response Times"
                  icon={Phone}
                  status="incomplete"
                  statusText="Callback targets and priority zones"
                  mode={businessMode}
                >
                  <ResponseTimeEditor />
                </SectionSummaryCard>
              )}

              <SectionSummaryCard
                id="workload"
                title="How Busy Are You Right Now?"
                icon={Gauge}
                status="incomplete"
                statusText={summaries.workload}
                mode={businessMode}
              >
                <BusynessRulesEditor />
              </SectionSummaryCard>
            </EssentialGroup>

            <EssentialGroup title="Your Business Rules" description={`Rules your AI follows when talking to ${terms.customerLabel}s`}>
              <SectionSummaryCard
                id="policies"
                title="Cancellation, Deposits & Payments"
                icon={FileText}
                status={summaries.policies !== "No policies set yet" ? "complete" : "incomplete"}
                statusText={summaries.policies}
                mode={businessMode}
                {...getGuidance("policies")}
              >
                <BusinessPoliciesEditor />
              </SectionSummaryCard>

              <SectionSummaryCard
                id="never-promise"
                title="What Your AI Should Never Promise"
                icon={Shield}
                status={summaries.guardrails !== "No limits set yet" ? "complete" : "incomplete"}
                statusText={summaries.guardrails}
                mode={businessMode}
                {...getGuidance("never-promise")}
              >
                <AINeverPromiseEditor />
              </SectionSummaryCard>

              <SectionSummaryCard
                id="required-questions"
                title="Info to Collect on Every Call"
                icon={MessageSquareText}
                status={summaries.requiredQuestions !== "Not set up yet" && summaries.requiredQuestions !== "No required fields set" ? "complete" : "incomplete"}
                statusText={summaries.requiredQuestions}
                mode={businessMode}
                {...getGuidance("required-questions")}
              >
                <RequiredQuestionsEditor />
              </SectionSummaryCard>

              <SectionSummaryCard
                id="custom-policies"
                title="Other Rules for Your AI"
                icon={FileText}
                status="incomplete"
                statusText="Additional policies for specific scenarios"
                mode={businessMode}
                {...getGuidance("custom-policies")}
              >
                <CustomPoliciesEditor />
              </SectionSummaryCard>
            </EssentialGroup>

            {(showBookingDelivery || showFoodDelivery) && (
              <AdvancedGroup title="Where Bookings Go" collapsedDescription="Where bookings and orders get sent">
                {showBookingDelivery && (
                  <SectionSummaryCard
                    id="booking-delivery"
                    title="Where to Send New Bookings"
                    icon={Send}
                    status={summaries.bookingDelivery !== "Not set up yet" && summaries.bookingDelivery !== "No delivery method set" ? "complete" : "incomplete"}
                    statusText={summaries.bookingDelivery}
                    mode={businessMode}
                    {...getGuidance("booking-delivery")}
                  >
                    <BookingDeliverySettings />
                  </SectionSummaryCard>
                )}

                {showFoodDelivery && (
                  <SectionSummaryCard
                    id="food-settings"
                    title="How Orders Are Handled"
                    icon={UtensilsCrossed}
                    status="incomplete"
                    statusText={summaries.foodSettings}
                    mode={businessMode}
                  >
                    <FoodOrderSettings />
                  </SectionSummaryCard>
                )}
              </AdvancedGroup>
            )}

            {policiesAddOns.isRelevant("dispatch-operations") && (
              <AdvancedGroup title="Dispatch Settings" collapsedDescription="Distance pricing and call routing" defaultCollapsed={false}>
                <SectionSummaryCard
                  id="dispatch-settings"
                  title="Where to Send New Jobs"
                  icon={Truck}
                  status={summaries.dispatchSettings !== "Not set up yet" && summaries.dispatchSettings !== "No notifications set" ? "complete" : "incomplete"}
                  statusText={summaries.dispatchSettings}
                  mode={businessMode}
                >
                  <DispatchDeliverySettings />
                </SectionSummaryCard>

                <SectionSummaryCard
                  id="distance-pricing"
                  title="How You Charge for Distance"
                  icon={Navigation}
                  status="incomplete"
                  statusText="Configure default distance pricing method"
                  mode={businessMode}
                >
                  <DistanceBasisSettings />
                </SectionSummaryCard>

                <SectionSummaryCard
                  id="ivr-routing"
                  title="Call Routing (IVR)"
                  icon={Phone}
                  status="incomplete"
                  statusText="Configure towing vs impound call routing"
                  mode={businessMode}
                >
                  <DispatchIvrSettings />
                </SectionSummaryCard>
              </AdvancedGroup>
            )}

            {policiesAddOns.isRelevant("impound-lot") && (
              <AdvancedGroup title="Impound Lot" collapsedDescription="Lot details, fees, and release requirements">
                <SectionSummaryCard
                  id="impound-lot"
                  title="Impound Lot Details"
                  icon={Warehouse}
                  status="incomplete"
                  statusText="Lot location, hours, and directions"
                  mode={businessMode}
                >
                  <ImpoundLotEditor />
                </SectionSummaryCard>

                <SectionSummaryCard
                  id="impound-fees"
                  title="Impound Fee Structure"
                  icon={DollarSign}
                  status="incomplete"
                  statusText="Tow fees, storage, and payment methods"
                  mode={businessMode}
                >
                  <ImpoundFeesEditor />
                </SectionSummaryCard>

                <SectionSummaryCard
                  id="impound-release"
                  title="Release Requirements"
                  icon={FileCheck}
                  status="incomplete"
                  statusText="Documents needed to release vehicles"
                  mode={businessMode}
                >
                  <ImpoundReleaseEditor />
                </SectionSummaryCard>
              </AdvancedGroup>
            )}

            {policiesAddOns.isRelevant("hipaa") && (
              <AdvancedGroup title="HIPAA Compliance" collapsedDescription="HIPAA and data handling settings">
                <SectionSummaryCard
                  id="hipaa"
                  title="HIPAA Compliance"
                  icon={HeartPulse}
                  status="warning"
                  statusText={summaries.hipaa}
                  mode={businessMode}
                >
                  <MedicalHIPAASettings />
                </SectionSummaryCard>
              </AdvancedGroup>
            )}

            {operationsAddOnItems.length > 0 && (
              <AddOnGroup items={operationsAddOnItems} onEnable={operationsEnableAddOn} />
            )}
          </>
        )}

        {/* ═══ AI PERSONALITY ═══ */}
        {activeSection === "ai-voice" && (
          <>
            {(caps.isServiceBusiness || caps.derivedPrimaryMode === "general") && (
              <ServiceCallFlowSettings />
            )}

            <EssentialGroup title="How Your AI Sounds" description="How your AI sounds and what it says">
              <SectionSummaryCard
                id="scripts"
                title="How Your AI Answers the Phone"
                icon={Mic}
                status={summaries.scripts !== "Using the default — customize to match your style" ? "complete" : "incomplete"}
                statusText={summaries.scripts}
                isEssential
                mode={businessMode}
                {...getGuidance("scripts")}
              >
                <AIScriptsEditor />
              </SectionSummaryCard>
            </EssentialGroup>

            <AdvancedGroup title="Behind the Scenes" collapsedDescription="Guidelines and learning settings">
              <SectionSummaryCard
                id="guidelines"
                title="Special Instructions for Your AI"
                icon={BookOpen}
                status={summaries.guidelines !== "No special instructions yet" ? "complete" : "incomplete"}
                statusText={summaries.guidelines}
                mode={businessMode}
                {...getGuidance("guidelines")}
              >
                <AIBusinessPolicies />
              </SectionSummaryCard>

              <SectionSummaryCard
                id="intelligence"
                title="Learning Preferences"
                icon={Brain}
                status="incomplete"
                statusText={summaries.intelligence}
                mode={businessMode}
                {...getGuidance("intelligence")}
              >
                <IntelligenceSettingsForm />
              </SectionSummaryCard>
            </AdvancedGroup>
          </>
        )}

        {/* ═══ KNOWLEDGE ═══ */}
        {activeSection === "training" && (
          <>
            {reviewCount > 0 && (
              <SectionSummaryCard
                id="review"
                title="Items Needing Your Approval"
                icon={AlertCircle}
                status="error"
                statusText={`${reviewCount} item${reviewCount === 1 ? "" : "s"} need${reviewCount === 1 ? "s" : ""} review`}
                mode={businessMode}
                defaultExpanded
              >
                <BrainReviewQueue />
              </SectionSummaryCard>
            )}

            <EssentialGroup title="Common Customer Questions" description={`Common ${terms.customerLabel} questions and objections`} showBadge={false}>
              <SectionSummaryCard
                id="faqs"
                title="Common Questions & Answers"
                icon={HelpCircle}
                status={summaries.faqs !== "No questions added yet — your AI says 'I'm not sure' to unknowns" ? "complete" : "incomplete"}
                statusText={summaries.faqs}
                mode={businessMode}
                {...getGuidance("faqs")}
              >
                <BusinessFAQEditor />
              </SectionSummaryCard>

              <SectionSummaryCard
                id="objections"
                title="When Customers Push Back"
                icon={MessageCircle}
                status={summaries.objections !== "No responses set — your AI uses generic replies to pushback" ? "complete" : "incomplete"}
                statusText={summaries.objections}
                mode={businessMode}
                {...getGuidance("objections")}
              >
                <BusinessObjectionEditor />
              </SectionSummaryCard>
            </EssentialGroup>

            {knowledgeAddOns.isRelevant("food-knowledge") && (
              <AdvancedGroup title="Food Knowledge" collapsedDescription="Menu details and catering info" defaultCollapsed={false}>
                <SectionSummaryCard
                  id="menu-knowledge"
                  title="Menu Item Details"
                  icon={UtensilsCrossed}
                  status="incomplete"
                  statusText="Detailed descriptions, allergens, and pairings"
                  mode={businessMode}
                >
                  <MenuKnowledgeEditor />
                </SectionSummaryCard>

                <SectionSummaryCard
                  id="catering-knowledge"
                  title="Catering by Event Type"
                  icon={Tag}
                  status="incomplete"
                  statusText="Event-specific requirements and pricing"
                  mode={businessMode}
                >
                  <CateringKnowledgeEditor />
                </SectionSummaryCard>
              </AdvancedGroup>
            )}

            {knowledgeAddOns.isRelevant("dispatch-knowledge") && (
              <AdvancedGroup title="Dispatch Knowledge" collapsedDescription="Vehicle types and roadside situations" defaultCollapsed={false}>
                <SectionSummaryCard
                  id="vehicle-knowledge"
                  title="Vehicle Requirements"
                  icon={Truck}
                  status="incomplete"
                  statusText="Equipment and procedures by vehicle type"
                  mode={businessMode}
                >
                  <VehicleKnowledgeEditor />
                </SectionSummaryCard>

                <SectionSummaryCard
                  id="roadside-knowledge"
                  title="Roadside Situations"
                  icon={AlertCircle}
                  status="incomplete"
                  statusText="Safety scripts and escalation triggers"
                  mode={businessMode}
                >
                  <RoadsideKnowledgeEditor />
                </SectionSummaryCard>
              </AdvancedGroup>
            )}

            {knowledgeAddOns.isRelevant("medical-knowledge") && (
              <AdvancedGroup title="Medical Knowledge" collapsedDescription="Symptoms, triage, and insurance info" defaultCollapsed={false}>
                <SectionSummaryCard
                  id="symptom-triage"
                  title="Symptom Triage Scripts"
                  icon={HeartPulse}
                  status="incomplete"
                  statusText="HIPAA-safe responses and escalation rules"
                  mode={businessMode}
                >
                  <SymptomTriageEditor />
                </SectionSummaryCard>

                <SectionSummaryCard
                  id="insurance-knowledge"
                  title="Insurance Carrier Info"
                  icon={Shield}
                  status="incomplete"
                  statusText="Carrier-specific scripts and coverage"
                  mode={businessMode}
                >
                  <InsuranceKnowledgeEditor />
                </SectionSummaryCard>
              </AdvancedGroup>
            )}

            {knowledgeAddOns.isRelevant("product-knowledge") && (
              <AdvancedGroup title="Service Knowledge" collapsedDescription="Products and materials you use">
                <SectionSummaryCard
                  id="product-knowledge"
                  title="Product & Material Knowledge"
                  icon={Package}
                  status="incomplete"
                  statusText="Products you use and their benefits"
                  mode={businessMode}
                >
                  <ProductKnowledgeEditor />
                </SectionSummaryCard>
              </AdvancedGroup>
            )}

            <AdvancedGroup title="More Options" collapsedDescription="Aftercare, competitors, and seasonal info">
              <SectionSummaryCard
                id="aftercare"
                title="Aftercare Instructions"
                icon={Heart}
                status="incomplete"
                statusText="Post-service care instructions"
                mode={businessMode}
              >
                <AftercareInstructionsEditor />
              </SectionSummaryCard>

              <SectionSummaryCard
                id="competitors"
                title="Competitor Positioning"
                icon={Users}
                status="incomplete"
                statusText="How to respond when competitors are mentioned"
                mode={businessMode}
              >
                <CompetitorKnowledgeEditor />
              </SectionSummaryCard>

              <SectionSummaryCard
                id="seasonal"
                title="Seasonal & Events"
                icon={Calendar}
                status="incomplete"
                statusText="Holiday and event-specific info"
                mode={businessMode}
              >
                <SeasonalKnowledgeEditor />
              </SectionSummaryCard>

              <SectionSummaryCard
                id="custom"
                title="Extra Info for Your AI"
                icon={Lightbulb}
                status={summaries.custom !== "Nothing extra added yet" ? "complete" : "incomplete"}
                statusText={summaries.custom}
                mode={businessMode}
                {...getGuidance("custom")}
              >
                <CustomKnowledgeEditor />
              </SectionSummaryCard>

              <SectionSummaryCard
                id="documents"
                title="Reference Documents"
                icon={FileUp}
                status="incomplete"
                statusText={summaries.documents}
                mode={businessMode}
                {...getGuidance("documents")}
              >
                <BrainAssetsManager />
              </SectionSummaryCard>
            </AdvancedGroup>

            {knowledgeAddOns.addOnItems.length > 0 && (
              <AddOnGroup items={knowledgeAddOns.addOnItems} onEnable={knowledgeAddOns.enableAddOn} />
            )}
          </>
        )}
      </div>
    </BrainSectionDetail>
  );
}
