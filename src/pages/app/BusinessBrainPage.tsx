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
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Section editors (unchanged logic)
import { PricingRulesEditor } from "@/components/settings/PricingRulesEditor";
import { BusynessRulesEditor } from "@/components/settings/BusynessRulesEditor";
import { ServiceCatalogEditor } from "@/components/brain/ServiceCatalogEditor";
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
  BRAIN_CATEGORIES,
} from "@/components/brain/layout";
import { usePoliciesSummaries } from "@/hooks/usePoliciesSummaries";
import { FileText, Shield, MessageSquareText, Send, Truck, UtensilsCrossed, HeartPulse } from "lucide-react";

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
  const policiesSummaries = usePoliciesSummaries();

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
              <>
                <BusinessBrainSectionCard
                  config={{
                    id: "business-info",
                    title: "Business Information",
                    purpose: "How your AI introduces your business",
                    usedByAI: [],
                    defaultCollapsed: false,
                  }}
                >
                  <BusinessProfileEditor />
                </BusinessBrainSectionCard>

                <BusinessBrainSectionCard
                  config={{
                    id: "templates",
                    title: "Quick Start Templates",
                    purpose: "Pre-built setups for common business types",
                    usedByAI: [],
                  }}
                >
                  <IndustryTemplateCard />
                </BusinessBrainSectionCard>
              </>
            )}

            {/* HOURS */}
            {activeSection === "hours" && (
              <BusinessBrainSectionCard
                config={{
                  id: "hours",
                  title: "Operating Hours",
                  purpose: "When your business is open",
                  usedByAI: [],
                  defaultCollapsed: false,
                }}
              >
                <BusinessHoursManager />
              </BusinessBrainSectionCard>
            )}

            {/* SERVICES */}
            {activeSection === "services" && (
              <>
                <BusinessBrainSectionCard
                  config={{
                    id: "pricing",
                    title: "Pricing Readiness",
                    purpose: "Check if your AI can quote prices",
                    usedByAI: [],
                    defaultCollapsed: false,
                  }}
                >
                  <QuoteReadinessCard />
                </BusinessBrainSectionCard>

                {!isDispatchMode && (
                  <BusinessBrainSectionCard
                    config={{
                      id: "pricing-rules",
                      title: "Pricing Rules",
                      purpose: "How your AI quotes prices",
                      usedByAI: [],
                    }}
                  >
                    <PricingRulesEditor />
                  </BusinessBrainSectionCard>
                )}

                <BusinessBrainSectionCard
                  config={{
                    id: "catalog",
                    title: isFoodMode ? "Menu" : isDispatchMode ? "Services" : "Services",
                    purpose: isFoodMode ? "Your menu items and pricing" : "Your services and pricing",
                    usedByAI: [],
                    defaultCollapsed: false,
                  }}
                >
                  {isFoodMode ? (
                    <MenuCatalogEditor />
                  ) : isDispatchMode ? (
                    <DispatchServiceCatalog />
                  ) : (
                    <ServiceCatalogEditor />
                  )}
                </BusinessBrainSectionCard>
              </>
            )}

            {/* SERVICE AREA - SIMPLIFIED */}
            {activeSection === "service-area" && (
              <div className="space-y-6">
                {/* Coverage Area - single expanded card */}
                <div className="rounded-lg border bg-card p-5">
                  <h2 className="text-base font-semibold mb-1">Where You Serve</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Define your service area so your AI knows which customers you can help.
                  </p>
                  <ServiceAreaPreview />
                  <div className="mt-4">
                    <ServiceAreaManager />
                  </div>
                </div>

                {/* ETA & Travel - simplified */}
                <div className="rounded-lg border bg-card p-5">
                  <h2 className="text-base font-semibold mb-1">Travel & Wait Times</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {isDispatchMode 
                      ? "How long until you can reach customers, based on distance from your base."
                      : "Estimated arrival times your AI quotes to callers."
                    }
                  </p>
                  {isDispatchMode ? <DispatchEtaSection /> : <DistanceEtaSection />}
                </div>

                {/* Busyness - only show if relevant */}
                <div className="rounded-lg border bg-card p-5">
                  <h2 className="text-base font-semibold mb-1">Current Workload</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    When you're busy, your AI adds extra wait time to ETAs.
                  </p>
                  <BusynessRulesEditor />
                </div>
              </div>
            )}

            {/* AVAILABILITY */}
            {activeSection === "availability" && (
              <BusinessBrainSectionCard
                config={{
                  id: "calendar",
                  title: "Calendar & Availability",
                  purpose: "Connect calendars for real-time availability",
                  usedByAI: [],
                  defaultCollapsed: false,
                }}
              >
                <AvailabilityHub />
              </BusinessBrainSectionCard>
            )}

            {/* POLICIES - Compact accordion view */}
            {activeSection === "policies" && (
              <div className="space-y-3">
                <CollapsibleBrainSection
                  id="policies"
                  title="Business Policies"
                  icon={FileText}
                  preview={policiesSummaries.policies}
                >
                  <BusinessPoliciesEditor />
                </CollapsibleBrainSection>

                <CollapsibleBrainSection
                  id="never-promise"
                  title="AI Guardrails"
                  icon={Shield}
                  preview={policiesSummaries.guardrails}
                >
                  <AINeverPromiseEditor />
                </CollapsibleBrainSection>

                <CollapsibleBrainSection
                  id="required-questions"
                  title="Required Questions"
                  icon={MessageSquareText}
                  preview={policiesSummaries.requiredQuestions}
                >
                  <RequiredQuestionsEditor />
                </CollapsibleBrainSection>

                {showBookingDelivery && (
                  <CollapsibleBrainSection
                    id="booking-delivery"
                    title="Booking Delivery"
                    icon={Send}
                    preview={policiesSummaries.bookingDelivery}
                  >
                    <BookingDeliverySettings />
                  </CollapsibleBrainSection>
                )}

                {showFoodDelivery && (
                  <CollapsibleBrainSection
                    id="food-settings"
                    title="Order Settings"
                    icon={UtensilsCrossed}
                    preview={policiesSummaries.foodSettings}
                  >
                    <FoodOrderSettings />
                  </CollapsibleBrainSection>
                )}

                {showDispatchDelivery && (
                  <CollapsibleBrainSection
                    id="dispatch-settings"
                    title="Dispatch Settings"
                    icon={Truck}
                    preview={policiesSummaries.dispatchSettings}
                  >
                    <DispatchDeliverySettings />
                  </CollapsibleBrainSection>
                )}

                {showMedicalSettings && (
                  <CollapsibleBrainSection
                    id="hipaa"
                    title="HIPAA Settings"
                    icon={HeartPulse}
                    preview={policiesSummaries.hipaa}
                  >
                    <MedicalHIPAASettings />
                  </CollapsibleBrainSection>
                )}
              </div>
            )}

            {/* AI BEHAVIOR */}
            {activeSection === "ai-behavior" && (
              <>
                <BusinessBrainSectionCard
                  config={{
                    id: "scripts",
                    title: "Greeting & Scripts",
                    purpose: "How your AI starts calls",
                    usedByAI: [],
                    speechReadyFields: ["greeting_script"],
                    defaultCollapsed: false,
                  }}
                >
                  <AIScriptsEditor />
                </BusinessBrainSectionCard>

                <BusinessBrainSectionCard
                  config={{
                    id: "guidelines",
                    title: "Business Guidelines",
                    purpose: "High-level instructions",
                    usedByAI: [],
                  }}
                >
                  <AIBusinessPolicies />
                </BusinessBrainSectionCard>

                <BusinessBrainSectionCard
                  config={{
                    id: "intelligence",
                    title: "Intelligence Settings",
                    purpose: "Advanced AI behavior",
                    usedByAI: [],
                  }}
                >
                  <IntelligenceSettingsForm />
                </BusinessBrainSectionCard>
              </>
            )}

            {/* KNOWLEDGE */}
            {activeSection === "knowledge" && (
              <>
                {reviewCount > 0 && (
                  <BusinessBrainSectionCard
                    config={{
                      id: "review",
                      title: "Review Queue",
                      purpose: "Items needing approval",
                      usedByAI: [],
                      defaultCollapsed: false,
                    }}
                    headerActions={
                      <Badge variant="destructive" className="text-xs">
                        {reviewCount}
                      </Badge>
                    }
                  >
                    <BrainReviewQueue />
                  </BusinessBrainSectionCard>
                )}

                <BusinessBrainSectionCard
                  config={{
                    id: "faqs",
                    title: "FAQs",
                    purpose: "Common questions and answers",
                    usedByAI: [],
                    defaultCollapsed: false,
                  }}
                >
                  <BusinessFAQEditor />
                </BusinessBrainSectionCard>

                <BusinessBrainSectionCard
                  config={{
                    id: "objections",
                    title: "Objection Handling",
                    purpose: "Responses when customers push back",
                    usedByAI: [],
                  }}
                >
                  <BusinessObjectionEditor />
                </BusinessBrainSectionCard>

                <BusinessBrainSectionCard
                  config={{
                    id: "custom",
                    title: "Custom Knowledge",
                    purpose: "Additional facts and info",
                    usedByAI: [],
                  }}
                >
                  <CustomKnowledgeEditor />
                </BusinessBrainSectionCard>

                <BusinessBrainSectionCard
                  config={{
                    id: "documents",
                    title: "Documents",
                    purpose: "Uploaded files and references",
                    usedByAI: [],
                  }}
                >
                  <BrainAssetsManager />
                </BusinessBrainSectionCard>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
