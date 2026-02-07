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
// FleetManagementSection removed - fleet accessible via sidebar

// Hooks
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useFoodMode } from "@/hooks/useFoodMode";

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
} from "@/components/brain/layout";
import { useBrainSummaries } from "@/hooks/useBrainSummaries";
import { 
  FileText, Shield, MessageSquareText, Send, Truck, UtensilsCrossed, HeartPulse,
  Building2, Palette, Clock, DollarSign, Tag, MapPin, Navigation, Gauge,
  Calendar, Mic, BookOpen, Brain, HelpCircle, MessageCircle, Lightbulb, FileUp, AlertCircle,
  Warehouse, Phone, FileCheck, Briefcase, Package
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
  const { isFoodMode, hasFoodOrders } = useFoodMode();
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

  const handleSectionChange = (section: string) => {
    setSearchParams({ section }, { replace: true });
    setMobileNavOpen(false);
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

  // Mode-aware visibility
  const showBookingDelivery = ["service", "medical", "general"].includes(businessMode);
  const showDispatchDelivery = businessMode === "dispatch";
  const showFoodDelivery = businessMode === "food" || hasFoodOrders;
  const showMedicalSettings = businessMode === "medical";
  const isDispatchMode = businessMode === "dispatch";

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
              <div className="space-y-3">
                <SectionHelper sectionId="profile" businessMode={businessMode} className="mb-4" />
                
                <CollapsibleBrainSection
                  id="business-info"
                  title="Business Information"
                  icon={Building2}
                  preview={summaries.businessInfo}
                >
                  <BusinessProfileEditor />
                </CollapsibleBrainSection>

                <CollapsibleBrainSection
                  id="templates"
                  title="Quick Start Templates"
                  icon={Palette}
                  preview={summaries.templates}
                >
                  <IndustryTemplateCard />
                </CollapsibleBrainSection>
              </div>
            )}

            {/* HOURS - Single section, always expanded */}
            {activeSection === "hours" && (
              <div className="space-y-3">
                <SectionHelper sectionId="hours" businessMode={businessMode} />
                
                <div className="rounded-lg border bg-card p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-muted">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">Operating Hours</h3>
                      <p className="text-xs text-muted-foreground">{summaries.hours}</p>
                    </div>
                  </div>
                  <BusinessHoursManager />
                </div>
              </div>
            )}

            {/* SERVICES */}
            {activeSection === "services" && (
              <div className="space-y-3">
                <SectionHelper sectionId="services" businessMode={businessMode} />
                
                {/* Pricing Readiness - inline, not collapsible */}
                <QuoteReadinessCard />

                {!isDispatchMode && (
                  <CollapsibleBrainSection
                    id="pricing-rules"
                    title="Pricing Rules"
                    icon={DollarSign}
                    preview={summaries.pricingRules}
                  >
                    <PricingRulesEditor />
                  </CollapsibleBrainSection>
                )}

                <CollapsibleBrainSection
                  id="catalog"
                  title={isFoodMode ? "Menu" : "Services"}
                  icon={Tag}
                  preview={summaries.catalog}
                >
                  {isFoodMode ? (
                    <MenuCatalogEditor />
                  ) : isDispatchMode ? (
                    <DispatchServiceCatalog />
                  ) : (
                    <ServiceCatalogEditor />
                  )}
                </CollapsibleBrainSection>

                <CollapsibleBrainSection
                  id="additional-services"
                  title="Additional Services"
                  icon={Wrench}
                  preview="Secondary services beyond your core business"
                >
                  <AdditionalServicesEditor />
                </CollapsibleBrainSection>
              </div>
            )}

            {/* SERVICE AREA */}
            {activeSection === "service-area" && (
              <div className="space-y-3">
                <SectionHelper sectionId="service-area" businessMode={businessMode} />
                
                <CollapsibleBrainSection
                  id="coverage"
                  title="Where You Serve"
                  icon={MapPin}
                  preview={summaries.coverage}
                >
                  <ServiceAreaPreview />
                  <div className="mt-4">
                    <ServiceAreaManager />
                  </div>
                </CollapsibleBrainSection>

                <CollapsibleBrainSection
                  id="travel-times"
                  title="Travel & Wait Times"
                  icon={Navigation}
                  preview={summaries.travelTimes}
                >
                  {isDispatchMode ? <DispatchEtaSection /> : <DistanceEtaSection />}
                </CollapsibleBrainSection>

                <CollapsibleBrainSection
                  id="workload"
                  title="Current Workload"
                  icon={Gauge}
                  preview={summaries.workload}
                >
                  <BusynessRulesEditor />
                </CollapsibleBrainSection>
              </div>
            )}

            {/* AVAILABILITY - Single section, always expanded */}
            {activeSection === "availability" && (
              <div className="space-y-3">
                <SectionHelper sectionId="availability" businessMode={businessMode} />
                
                <div className="rounded-lg border bg-card p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-muted">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">Calendar & Availability</h3>
                      <p className="text-xs text-muted-foreground">{summaries.calendar}</p>
                    </div>
                  </div>
                  <AvailabilityHub />
                </div>
              </div>
            )}

            {/* POLICIES - Compact accordion view with visual groupings */}
            {activeSection === "policies" && (
              <div className="space-y-3">
                <SectionHelper sectionId="policies" businessMode={businessMode} />
                
                {/* Core Policies Group */}
                <SectionGroupHeader label="Core Policies" icon={Briefcase} />
                
                <CollapsibleBrainSection
                  id="policies"
                  title="Business Policies"
                  icon={FileText}
                  preview={summaries.policies}
                >
                  <BusinessPoliciesEditor />
                </CollapsibleBrainSection>

                <CollapsibleBrainSection
                  id="never-promise"
                  title="AI Guardrails"
                  icon={Shield}
                  preview={summaries.guardrails}
                >
                  <AINeverPromiseEditor />
                </CollapsibleBrainSection>

                <CollapsibleBrainSection
                  id="required-questions"
                  title="Required Questions"
                  icon={MessageSquareText}
                  preview={summaries.requiredQuestions}
                >
                  <RequiredQuestionsEditor />
                </CollapsibleBrainSection>

                {showBookingDelivery && (
                  <CollapsibleBrainSection
                    id="booking-delivery"
                    title="Booking Delivery"
                    icon={Send}
                    preview={summaries.bookingDelivery}
                  >
                    <BookingDeliverySettings />
                  </CollapsibleBrainSection>
                )}

                {showFoodDelivery && (
                  <CollapsibleBrainSection
                    id="food-settings"
                    title="Order Settings"
                    icon={UtensilsCrossed}
                    preview={summaries.foodSettings}
                  >
                    <FoodOrderSettings />
                  </CollapsibleBrainSection>
                )}

                {/* Dispatch Operations Group - only show for dispatch mode */}
                {showDispatchDelivery && (
                  <SectionGroupHeader label="Dispatch Operations" icon={Truck} />
                )}

                {showDispatchDelivery && (
                  <CollapsibleBrainSection
                    id="dispatch-settings"
                    title="Dispatch Settings"
                    icon={Truck}
                    preview={summaries.dispatchSettings}
                  >
                    <DispatchDeliverySettings />
                  </CollapsibleBrainSection>
                )}

                {showDispatchDelivery && (
                  <CollapsibleBrainSection
                    id="distance-pricing"
                    title="How You Charge for Distance"
                    icon={Navigation}
                    preview="Configure default distance pricing method"
                  >
                    <DistanceBasisSettings />
                  </CollapsibleBrainSection>
                )}

                {showDispatchDelivery && (
                  <CollapsibleBrainSection
                    id="ivr-routing"
                    title="Call Routing (IVR)"
                    icon={Phone}
                    preview="Configure towing vs impound call routing"
                  >
                    <DispatchIvrSettings />
                  </CollapsibleBrainSection>
                )}

                {/* Impound Lot Group - only show for dispatch mode */}
                {showDispatchDelivery && (
                  <SectionGroupHeader label="Impound Lot" icon={Warehouse} />
                )}

                {showDispatchDelivery && (
                  <CollapsibleBrainSection
                    id="impound-lot"
                    title="Impound Lot Details"
                    icon={Warehouse}
                    preview="Lot location, hours, and directions"
                  >
                    <ImpoundLotEditor />
                  </CollapsibleBrainSection>
                )}

                {showDispatchDelivery && (
                  <CollapsibleBrainSection
                    id="impound-fees"
                    title="Impound Fee Structure"
                    icon={DollarSign}
                    preview="Tow fees, storage, and payment methods"
                  >
                    <ImpoundFeesEditor />
                  </CollapsibleBrainSection>
                )}

                {showDispatchDelivery && (
                  <CollapsibleBrainSection
                    id="impound-release"
                    title="Release Requirements"
                    icon={FileCheck}
                    preview="Documents needed to release vehicles"
                  >
                    <ImpoundReleaseEditor />
                  </CollapsibleBrainSection>
                )}


                {showMedicalSettings && (
                  <CollapsibleBrainSection
                    id="hipaa"
                    title="HIPAA Settings"
                    icon={HeartPulse}
                    preview={summaries.hipaa}
                  >
                    <MedicalHIPAASettings />
                  </CollapsibleBrainSection>
                )}
              </div>
            )}

            {/* AI BEHAVIOR */}
            {activeSection === "ai-behavior" && (
              <div className="space-y-3">
                <SectionHelper sectionId="ai-behavior" businessMode={businessMode} />
                
                {/* Service Call Flow - only for service/general modes */}
                {(businessMode === "service" || businessMode === "general") && (
                  <ServiceCallFlowSettings />
                )}

                <CollapsibleBrainSection
                  id="scripts"
                  title="Greeting & Scripts"
                  icon={Mic}
                  preview={summaries.scripts}
                >
                  <AIScriptsEditor />
                </CollapsibleBrainSection>

                <CollapsibleBrainSection
                  id="guidelines"
                  title="Business Guidelines"
                  icon={BookOpen}
                  preview={summaries.guidelines}
                >
                  <AIBusinessPolicies />
                </CollapsibleBrainSection>

                <CollapsibleBrainSection
                  id="intelligence"
                  title="Intelligence Settings"
                  icon={Brain}
                  preview={summaries.intelligence}
                >
                  <IntelligenceSettingsForm />
                </CollapsibleBrainSection>
              </div>
            )}

            {/* KNOWLEDGE */}
            {activeSection === "knowledge" && (
              <div className="space-y-3">
                <SectionHelper sectionId="knowledge" businessMode={businessMode} />
                
                {reviewCount > 0 && (
                  <CollapsibleBrainSection
                    id="review"
                    title="Review Queue"
                    icon={AlertCircle}
                    preview={`${reviewCount} item${reviewCount === 1 ? "" : "s"} need${reviewCount === 1 ? "s" : ""} review`}
                    defaultExpanded
                  >
                    <BrainReviewQueue />
                  </CollapsibleBrainSection>
                )}

                <CollapsibleBrainSection
                  id="faqs"
                  title="FAQs"
                  icon={HelpCircle}
                  preview={summaries.faqs}
                >
                  <BusinessFAQEditor />
                </CollapsibleBrainSection>

                <CollapsibleBrainSection
                  id="objections"
                  title="Objection Handling"
                  icon={MessageCircle}
                  preview={summaries.objections}
                >
                  <BusinessObjectionEditor />
                </CollapsibleBrainSection>

                <CollapsibleBrainSection
                  id="custom"
                  title="Custom Knowledge"
                  icon={Lightbulb}
                  preview={summaries.custom}
                >
                  <CustomKnowledgeEditor />
                </CollapsibleBrainSection>

                <CollapsibleBrainSection
                  id="documents"
                  title="Documents"
                  icon={FileUp}
                  preview={summaries.documents}
                >
                  <BrainAssetsManager />
                </CollapsibleBrainSection>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
