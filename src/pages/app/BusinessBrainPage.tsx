/**
 * Business Brain - Centralized hub for ALL business knowledge editing
 *
 * REDESIGNED FOR CLARITY:
 * - Horizontal tabs showing all 8 sections at once
 * - Focused editor per section with minimal chrome
 * - All existing save logic preserved
 */

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Menu, Wrench } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
import { MedicalPricingEditor, MedicalCoverageEditor, MedicalPoliciesEditor } from "@/components/brain/medical";
import { ServiceCoverageEditor, ServicePoliciesEditor } from "@/components/brain/service";
import { ResponseTimeEditor, GeneralPoliciesEditor } from "@/components/brain/general";
import { DispatchPoliciesEditor } from "@/components/brain/dispatch";
import { FoodPoliciesEditor } from "@/components/brain/food";
import { IntakeRequirementsEditor } from "@/components/brain/shared/IntakeRequirementsEditor";

// Mode-specific knowledge editors
import {
  ModeFAQSuggestions,
  ModeObjectionSuggestions,
  ModeKnowledgeSuggestions,
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

// Layout components
import {
  BusinessBrainTabs,
  BusinessBrainNav,
  BusinessBrainSectionCard,
  CollapsibleBrainSection,
  HIPAAWarning,
  SectionHelper,
  SectionGroupHeader,
  BRAIN_CATEGORIES,
  // NEW: Phase 1 components
  SectionSummaryCard,
  BrainProgressIndicator,
  AIPreviewBanner,
  EssentialGroup,
  AdvancedGroup,
  BrainSetupBanner,
  CompletionCelebration,
  NextStepSuggestion,
  getModeGradient,
} from "@/components/brain/layout";
import { useBrainSummaries } from "@/hooks/useBrainSummaries";
import { 
  FileText, Shield, MessageSquareText, Send, Truck, UtensilsCrossed, HeartPulse,
  Building2, Palette, Clock, DollarSign, Tag, MapPin, Navigation, Gauge,
  Calendar, Mic, BookOpen, Brain, HelpCircle, MessageCircle, Lightbulb, FileUp, AlertCircle,
  Warehouse, Phone, FileCheck, Briefcase, Package, Heart, Users
} from "lucide-react";

const VALID_SECTIONS = ["profile", "hours", "services", "service-area", "availability", "policies", "ai-behavior", "knowledge"] as const;
type SectionId = typeof VALID_SECTIONS[number];

const LEGACY_SECTION_ALIASES: Record<string, SectionId> = {
  "calendar-sync": "availability",
  calendar: "availability",
};

const LEGACY_TAB_TO_SECTION: Record<string, { section: SectionId; hash?: string }> = {
  review: { section: "knowledge", hash: "review" },
  updates: { section: "knowledge", hash: "review" },
  assets: { section: "knowledge", hash: "documents" },
  uploads: { section: "knowledge", hash: "documents" },
  overview: { section: "profile" },
  memory: { section: "ai-behavior", hash: "intelligence" },
};

export default function BusinessBrainPage() {
  const { tenant } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const reviewCount = useBrainReviewCount();
  const { businessMode, hipaaMode } = useTenantConfig();
  const caps = useCapabilities();
  const { isFoodMode, hasFoodOrders } = useFoodMode();
  const { acceptsDelivery: foodAcceptsDelivery, acceptsCatering: foodAcceptsCatering, needsCoverageSettings: foodNeedsCoverage } = useFoodOrderSettings();
  const summaries = useBrainSummaries();

  const sectionParamRaw = searchParams.get("section");
  const legacyTab = searchParams.get("tab");

  const normalizedSectionParam = sectionParamRaw
    ? (LEGACY_SECTION_ALIASES[sectionParamRaw] ?? sectionParamRaw)
    : null;

  const { activeSection, focusHash } = useMemo(() => {
    if (normalizedSectionParam && VALID_SECTIONS.includes(normalizedSectionParam as SectionId)) {
      return { activeSection: normalizedSectionParam as SectionId, focusHash: null as string | null };
    }
    if (legacyTab && LEGACY_TAB_TO_SECTION[legacyTab]) {
      const mapped = LEGACY_TAB_TO_SECTION[legacyTab];
      return { activeSection: mapped.section, focusHash: mapped.hash ?? null };
    }
    return { activeSection: "profile" as SectionId, focusHash: null as string | null };
  }, [legacyTab, normalizedSectionParam]);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  // Controlled expansion state for sections that need to collapse after save
  const [hoursExpanded, setHoursExpanded] = useState(true);

  const handleSectionChange = (section: string) => {
    setSearchParams({ section }, { replace: true });
    setMobileNavOpen(false);
    // Reset expansion states when changing sections
    setHoursExpanded(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const sectionIsValid = normalizedSectionParam && VALID_SECTIONS.includes(normalizedSectionParam as SectionId);
    const sectionNeedsAliasRewrite = !!(sectionParamRaw && LEGACY_SECTION_ALIASES[sectionParamRaw]);

    if (!sectionIsValid || legacyTab || sectionNeedsAliasRewrite) {
      setSearchParams({ section: activeSection }, { replace: true });
    }

    // Handle hash scrolling - either from legacy mapping or direct URL hash
    const hashToUse = focusHash || window.location.hash.replace(/^#/, "");
    if (hashToUse) {
      // Small delay to ensure elements are rendered
      setTimeout(() => {
        const element = document.getElementById(hashToUse);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          // Highlight the card briefly to draw attention
          element.classList.add("ring-2", "ring-primary", "ring-offset-2");
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
          }, 2000);
        }
      }, 100);
    }
  }, [activeSection, focusHash, legacyTab, normalizedSectionParam, sectionParamRaw, setSearchParams]);

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Capability-aware visibility
  const showBookingDelivery = caps.isSchedulingBusiness;
  const showDispatchDelivery = caps.isDispatchBusiness;
  const showFoodDelivery = caps.hasFoodOrders;
  const showMedicalSettings = caps.isMedicalBusiness;
  const isDispatchMode = caps.isDispatchBusiness;

  const currentCategory = BRAIN_CATEGORIES.find(c => c.section === activeSection) ?? null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Desktop: Horizontal Tabs */}
      <div className="hidden md:block sticky top-0 z-30">
        <BusinessBrainTabs
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />
      </div>

      {/* Mobile: Hamburger + Sheet */}
      <div className="md:hidden sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <BusinessBrainNav
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
              />
            </SheetContent>
          </Sheet>

          {currentCategory && (
            <div className="flex items-center gap-2">
              <currentCategory.icon className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">{currentCategory.title}</h1>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        <div className="container max-w-3xl py-6 px-4 sm:px-6">
          {/* HIPAA Warning */}
          {hipaaMode && <HIPAAWarning className="mb-4" />}

          {/* SECTION CONTENT */}
          <div className="space-y-4">
            
            {/* PROFILE */}
            {activeSection === "profile" && (
              <div className="space-y-4">
                {/* Completion Celebration - shows when all essentials done */}
                {summaries.completionStats.percentage >= 100 && (
                  <CompletionCelebration
                    enhancements={[
                      { id: "faqs", label: "Add FAQs", description: "Reduce \"I don't know\" responses", section: "knowledge" },
                      { id: "objections", label: "Handle objections", description: "Address price pushback", section: "knowledge" },
                      { id: "documents", label: "Upload documents", description: "Reference materials for AI", section: "knowledge" },
                    ]}
                    onNavigate={handleSectionChange}
                    onGoToDashboard={() => window.location.href = "/app"}
                  />
                )}

                {/* Setup Banner for new users */}
                {summaries.completionStats.percentage < 100 && summaries.completionStats.percentage < 50 && (
                  <BrainSetupBanner
                    steps={[
                      { id: "business-info", label: "Business Info", section: "profile", isComplete: !!tenant?.name },
                      { id: "hours", label: "Set Hours", section: "hours", isComplete: summaries.hours !== "No hours set yet" },
                      { id: "services", label: "Add Services", section: "services", isComplete: summaries.catalog !== "No items added yet" },
                      { id: "scripts", label: "Greeting Script", section: "ai-behavior", isComplete: summaries.scripts !== "Using default greeting" },
                    ]}
                    onContinue={handleSectionChange}
                    dismissible
                  />
                )}

                {/* Progress Indicator */}
                {summaries.completionStats.percentage < 100 && (
                  <BrainProgressIndicator
                    completedSections={summaries.completionStats.completed}
                    totalSections={summaries.completionStats.total}
                    incompleteItems={summaries.completionStats.incompleteItems}
                    onNavigateToSection={handleSectionChange}
                  />
                )}
                
                <EssentialGroup title="Core Identity" description="How your AI introduces your business">
                  <SectionSummaryCard
                    id="business-info"
                    title="Business Information"
                    icon={Building2}
                    status={tenant?.name ? "complete" : "incomplete"}
                    statusText={summaries.businessInfo}
                    isEssential
                    mode={businessMode}
                  >
                    <BusinessProfileEditor />
                  </SectionSummaryCard>
                </EssentialGroup>

                {/* Next step suggestion */}
                {tenant?.name && summaries.hours === "No hours set yet" && (
                  <NextStepSuggestion
                    completedSection="profile"
                    mode={businessMode}
                    onNavigate={handleSectionChange}
                  />
                )}

                <AdvancedGroup title="Quick Start" collapsedDescription="Pre-built templates for common industries">
                  <SectionSummaryCard
                    id="templates"
                    title="Quick Start Templates"
                    icon={Palette}
                    status="incomplete"
                    statusText={summaries.templates}
                    mode={businessMode}
                  >
                    <IndustryTemplateCard />
                  </SectionSummaryCard>
                </AdvancedGroup>
              </div>
            )}

            {/* HOURS - Single essential section */}
            {activeSection === "hours" && (
              <div className="space-y-4">
                <EssentialGroup title="Business Hours" description="When customers can reach you">
                  <SectionSummaryCard
                    id="business-hours"
                    title="Operating Hours"
                    icon={Clock}
                    status={summaries.hours !== "No hours set yet" ? "complete" : "incomplete"}
                    statusText={summaries.hours}
                    isEssential
                    mode={businessMode}
                    expanded={hoursExpanded}
                    onExpandedChange={setHoursExpanded}
                  >
                    <BusinessHoursManager 
                      onSaveComplete={() => setHoursExpanded(false)} 
                    />
                  </SectionSummaryCard>
                </EssentialGroup>

                {/* Next step suggestion after hours are set */}
                {summaries.hours !== "No hours set yet" && summaries.catalog === "No items added yet" && (
                  <NextStepSuggestion
                    completedSection="hours"
                    mode={businessMode}
                    onNavigate={handleSectionChange}
                  />
                )}
              </div>
            )}

            {/* SERVICES */}
            {activeSection === "services" && (
              <div className="space-y-4">
                {/* Pricing Readiness - inline, not collapsible */}
                <QuoteReadinessCard />

                <EssentialGroup title="Core Offerings" description={isFoodMode ? "Your menu items and service types" : "Services you provide"}>
                  {/* Food mode: Service types first (what do you offer?) */}
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
                      title="Pricing Rules"
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
                    title={isFoodMode ? "Menu" : isDispatchMode ? "Tow Services" : "Services"}
                    icon={Tag}
                    status={summaries.catalog !== "No items added yet" ? "complete" : "incomplete"}
                    statusText={summaries.catalog}
                    isEssential
                    mode={businessMode}
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

                {/* Mode-specific pricing sections */}
                {(businessMode === "service" || businessMode === "general") && (
                  <AdvancedGroup title="Pricing Adjustments" collapsedDescription="Size, urgency, and package pricing">
                    <SectionSummaryCard
                      id="price-modifiers"
                      title="Price Adjustments"
                      icon={DollarSign}
                      status="incomplete"
                      statusText="Size, urgency, and after-hours rate adjustments"
                      mode={businessMode}
                    >
                      <PriceModifiersEditor />
                    </SectionSummaryCard>

                    <SectionSummaryCard
                      id="service-packages"
                      title="Packages & Bundles"
                      icon={Package}
                      status="incomplete"
                      statusText="Discounted bundles and membership plans"
                      mode={businessMode}
                    >
                      <ServicePackagesEditor />
                    </SectionSummaryCard>
                  </AdvancedGroup>
                )}

                {isDispatchMode && (
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

                {isFoodMode && (
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

                {businessMode === "medical" && (
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

                <AdvancedGroup title="Secondary Services" collapsedDescription="Additional offerings beyond your core business">
                  <SectionSummaryCard
                    id="additional-services"
                    title="Additional Services"
                    icon={Wrench}
                    status="incomplete"
                    statusText="Secondary services beyond your core business"
                    mode={businessMode}
                  >
                    <AdditionalServicesEditor />
                  </SectionSummaryCard>
                </AdvancedGroup>
              </div>
            )}

            {/* SERVICE AREA */}
            {activeSection === "service-area" && (
              <div className="space-y-4">
                {/* Food business in-house only notice */}
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
                          Enable Delivery or Catering in <strong>Services → Service Types</strong> and the coverage options will appear here.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <EssentialGroup 
                  title="Coverage Area" 
                  description="Where your business provides service"
                  showBadge={["dispatch", "service"].includes(businessMode) || ((businessMode === "food" || isFoodMode) && foodNeedsCoverage)}
                >
                  {/* Only show location/coverage for non-food or food with delivery/catering */}
                  {(businessMode !== "food" && !isFoodMode) || foodNeedsCoverage ? (
                    <>
                      <SectionSummaryCard
                        id="coverage"
                        title="Where You Serve"
                        icon={MapPin}
                        status="incomplete"
                        statusText={summaries.coverage}
                        isEssential={["dispatch", "service"].includes(businessMode) || foodNeedsCoverage}
                        mode={businessMode}
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
                               "Travel & Wait Times"}
                        icon={Navigation}
                        status="incomplete"
                        statusText={summaries.travelTimes}
                        mode={businessMode}
                      >
                        {isDispatchMode ? <DispatchEtaSection /> : <DistanceEtaSection />}
                      </SectionSummaryCard>
                    </>
                  ) : null}
                </EssentialGroup>

                {/* Mode-specific coverage settings */}
                <AdvancedGroup 
                  title="Mode-Specific Settings" 
                  collapsedDescription="Additional coverage options for your business type"
                  defaultCollapsed={false}
                >
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

                  {isDispatchMode && (
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

                  {/* Only show delivery zones when food business accepts delivery */}
                  {(businessMode === "food" || isFoodMode) && foodAcceptsDelivery && (
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

                  {/* Catering coverage for food businesses that accept catering */}
                  {(businessMode === "food" || isFoodMode) && foodAcceptsCatering && (
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

                  {businessMode === "medical" && (
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
                    title="Current Workload"
                    icon={Gauge}
                    status="incomplete"
                    statusText={summaries.workload}
                    mode={businessMode}
                  >
                    <BusynessRulesEditor />
                  </SectionSummaryCard>
                </AdvancedGroup>
              </div>
            )}

            {/* AVAILABILITY */}
            {activeSection === "availability" && (
              <div className="space-y-4">
                <EssentialGroup title="Calendar Sync" description="Real-time availability from your calendar">
                  <SectionSummaryCard
                    id="calendar-sync"
                    title="Calendar & Availability"
                    icon={Calendar}
                    status={summaries.calendar.includes("connected") ? "complete" : "incomplete"}
                    statusText={summaries.calendar}
                    mode={businessMode}
                    defaultExpanded
                  >
                    <AvailabilityHub />
                  </SectionSummaryCard>
                </EssentialGroup>
              </div>
            )}

            {/* POLICIES */}
            {activeSection === "policies" && (
              <div className="space-y-4">
                <EssentialGroup title="Core Policies" description="Rules your AI follows when talking to customers">
                  <SectionSummaryCard
                    id="policies"
                    title="Business Policies"
                    icon={FileText}
                    status={summaries.policies !== "No policies configured yet" ? "complete" : "incomplete"}
                    statusText={summaries.policies}
                    mode={businessMode}
                  >
                    <BusinessPoliciesEditor />
                  </SectionSummaryCard>

                  <SectionSummaryCard
                    id="never-promise"
                    title="AI Guardrails"
                    icon={Shield}
                    status={summaries.guardrails !== "No guardrails configured yet" ? "complete" : "incomplete"}
                    statusText={summaries.guardrails}
                    mode={businessMode}
                  >
                    <AINeverPromiseEditor />
                  </SectionSummaryCard>

                  <SectionSummaryCard
                    id="required-questions"
                    title="Required Questions"
                    icon={MessageSquareText}
                    status={summaries.requiredQuestions !== "Not configured yet" && summaries.requiredQuestions !== "No required fields set" ? "complete" : "incomplete"}
                    statusText={summaries.requiredQuestions}
                    mode={businessMode}
                  >
                    <RequiredQuestionsEditor />
                  </SectionSummaryCard>
                  <SectionSummaryCard
                    id="custom-policies"
                    title="Custom Policies"
                    icon={FileText}
                    status="incomplete"
                    statusText="Additional policies for specific scenarios"
                    mode={businessMode}
                  >
                    <CustomPoliciesEditor />
                  </SectionSummaryCard>
                </EssentialGroup>

                {/* Delivery Settings */}
                <AdvancedGroup title="Delivery & Notifications" collapsedDescription="Where bookings and jobs get sent">
                  {showBookingDelivery && (
                    <SectionSummaryCard
                      id="booking-delivery"
                      title="Booking Delivery"
                      icon={Send}
                      status={summaries.bookingDelivery !== "Not configured yet" && summaries.bookingDelivery !== "No delivery method set" ? "complete" : "incomplete"}
                      statusText={summaries.bookingDelivery}
                      mode={businessMode}
                    >
                      <BookingDeliverySettings />
                    </SectionSummaryCard>
                  )}

                  {showFoodDelivery && (
                    <SectionSummaryCard
                      id="food-settings"
                      title="Order Settings"
                      icon={UtensilsCrossed}
                      status="incomplete"
                      statusText={summaries.foodSettings}
                      mode={businessMode}
                    >
                      <FoodOrderSettings />
                    </SectionSummaryCard>
                  )}
                </AdvancedGroup>

                {/* Dispatch Operations Group */}
                {showDispatchDelivery && (
                  <AdvancedGroup title="Dispatch Operations" collapsedDescription="Distance pricing and call routing" defaultCollapsed={false}>
                    <SectionSummaryCard
                      id="dispatch-settings"
                      title="Dispatch Settings"
                      icon={Truck}
                      status={summaries.dispatchSettings !== "Not configured yet" && summaries.dispatchSettings !== "No notifications set" ? "complete" : "incomplete"}
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

                {/* Impound Lot Group */}
                {showDispatchDelivery && (
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

                {/* Medical Compliance */}
                {showMedicalSettings && (
                  <AdvancedGroup title="Compliance" collapsedDescription="HIPAA and data handling settings">
                    <SectionSummaryCard
                      id="hipaa"
                      title="HIPAA Settings"
                      icon={HeartPulse}
                      status="warning"
                      statusText={summaries.hipaa}
                      mode={businessMode}
                    >
                      <MedicalHIPAASettings />
                    </SectionSummaryCard>
                  </AdvancedGroup>
                )}
              </div>
            )}

            {/* AI BEHAVIOR */}
            {activeSection === "ai-behavior" && (
              <div className="space-y-4">
                {/* Service Call Flow - only for service/general modes */}
                {(caps.isServiceBusiness || caps.derivedPrimaryMode === "general") && (
                  <ServiceCallFlowSettings />
                )}

                <EssentialGroup title="Voice & Scripts" description="How your AI sounds and what it says">
                  <SectionSummaryCard
                    id="scripts"
                    title="Greeting & Scripts"
                    icon={Mic}
                    status={summaries.scripts !== "Using default greeting" ? "complete" : "incomplete"}
                    statusText={summaries.scripts}
                    isEssential
                    mode={businessMode}
                  >
                    <AIScriptsEditor />
                  </SectionSummaryCard>
                </EssentialGroup>

                <AdvancedGroup title="AI Behavior" collapsedDescription="Guidelines and learning settings">
                  <SectionSummaryCard
                    id="guidelines"
                    title="Business Guidelines"
                    icon={BookOpen}
                    status={summaries.guidelines !== "No guidelines configured yet" ? "complete" : "incomplete"}
                    statusText={summaries.guidelines}
                    mode={businessMode}
                  >
                    <AIBusinessPolicies />
                  </SectionSummaryCard>

                  <SectionSummaryCard
                    id="intelligence"
                    title="Intelligence Settings"
                    icon={Brain}
                    status="incomplete"
                    statusText={summaries.intelligence}
                    mode={businessMode}
                  >
                    <IntelligenceSettingsForm />
                  </SectionSummaryCard>
                </AdvancedGroup>
              </div>
            )}

            {/* KNOWLEDGE */}
            {activeSection === "knowledge" && (
              <div className="space-y-4">
                {/* Review Queue - shows with warning if items pending */}
                {reviewCount > 0 && (
                  <SectionSummaryCard
                    id="review"
                    title="Review Queue"
                    icon={AlertCircle}
                    status="error"
                    statusText={`${reviewCount} item${reviewCount === 1 ? "" : "s"} need${reviewCount === 1 ? "s" : ""} review`}
                    mode={businessMode}
                    defaultExpanded
                  >
                    <BrainReviewQueue />
                  </SectionSummaryCard>
                )}

                <EssentialGroup title="Core Knowledge" description="Common questions and objections" showBadge={false}>
                  <SectionSummaryCard
                    id="faqs"
                    title="FAQs"
                    icon={HelpCircle}
                    status={summaries.faqs !== "No FAQs added yet" ? "complete" : "incomplete"}
                    statusText={summaries.faqs}
                    mode={businessMode}
                  >
                    <BusinessFAQEditor />
                  </SectionSummaryCard>

                  <SectionSummaryCard
                    id="objections"
                    title="Objection Handling"
                    icon={MessageCircle}
                    status={summaries.objections !== "No objection responses yet" ? "complete" : "incomplete"}
                    statusText={summaries.objections}
                    mode={businessMode}
                  >
                    <BusinessObjectionEditor />
                  </SectionSummaryCard>
                </EssentialGroup>

                {/* Mode-specific knowledge */}
                {isFoodMode && (
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

                {isDispatchMode && (
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

                {businessMode === "medical" && (
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

                {(businessMode === "service" || businessMode === "general") && (
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

                {/* Shared knowledge sections */}
                <AdvancedGroup title="Additional Knowledge" collapsedDescription="Aftercare, competitors, and seasonal info">
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
                    title="Custom Knowledge"
                    icon={Lightbulb}
                    status={summaries.custom !== "No custom knowledge yet" ? "complete" : "incomplete"}
                    statusText={summaries.custom}
                    mode={businessMode}
                  >
                    <CustomKnowledgeEditor />
                  </SectionSummaryCard>

                  <SectionSummaryCard
                    id="documents"
                    title="Documents"
                    icon={FileUp}
                    status="incomplete"
                    statusText={summaries.documents}
                    mode={businessMode}
                  >
                    <BrainAssetsManager />
                  </SectionSummaryCard>
                </AdvancedGroup>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
