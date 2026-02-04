/**
 * Business Brain - Centralized hub for ALL business knowledge editing
 *
 * REDESIGNED FOR CLARITY:
 * - Hub view: Clean list of 8 setup areas with progress
 * - Section view: Focused editor with minimal chrome
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
  BusinessBrainNav,
  BusinessBrainSectionCard,
  HIPAAWarning,
  BRAIN_CATEGORIES,
} from "@/components/brain/layout";

const VALID_SECTIONS = ["profile", "hours", "services", "service-area", "availability", "policies", "ai-behavior", "knowledge"] as const;
type SectionId = typeof VALID_SECTIONS[number];

const LEGACY_SECTION_ALIASES: Record<string, SectionId> = {
  // Back-compat for older deep links mentioned across the app
  "calendar-sync": "availability",
  calendar: "availability",
};

const LEGACY_TAB_TO_SECTION: Record<string, { section: SectionId; hash?: string }> = {
  // Knowledge upload/review flows
  review: { section: "knowledge", hash: "review" },
  updates: { section: "knowledge", hash: "review" },
  assets: { section: "knowledge", hash: "documents" },
  uploads: { section: "knowledge", hash: "documents" },
  // Older “overview” landing
  overview: { section: "profile" },
  // Intelligence/memory deep link from settings
  memory: { section: "ai-behavior", hash: "intelligence" },
};

export default function BusinessBrainPage() {
  const { tenant } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const reviewCount = useBrainReviewCount();
  const { businessMode, hipaaMode } = useTenantConfig();
  const { isFoodMode, hasFoodOrders } = useFoodMode();

  const sectionParamRaw = searchParams.get("section");
  const legacyTab = searchParams.get("tab");

  const normalizedSectionParam = sectionParamRaw
    ? (LEGACY_SECTION_ALIASES[sectionParamRaw] ?? sectionParamRaw)
    : null;

  const { activeSection, focusHash } = useMemo(() => {
    // Primary: ?section=
    if (normalizedSectionParam && VALID_SECTIONS.includes(normalizedSectionParam as SectionId)) {
      return { activeSection: normalizedSectionParam as SectionId, focusHash: null as string | null };
    }

    // Back-compat: ?tab=
    if (legacyTab && LEGACY_TAB_TO_SECTION[legacyTab]) {
      const mapped = LEGACY_TAB_TO_SECTION[legacyTab];
      return { activeSection: mapped.section, focusHash: mapped.hash ?? null };
    }

    // Default: land directly in the first section (no setup hub)
    return { activeSection: "profile" as SectionId, focusHash: null as string | null };
  }, [legacyTab, normalizedSectionParam]);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleSectionChange = (section: string) => {
    setSearchParams({ section }, { replace: true });
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Normalize legacy links so users always see the 8 sections immediately.
  useEffect(() => {
    const sectionIsValid = normalizedSectionParam && VALID_SECTIONS.includes(normalizedSectionParam as SectionId);
    const sectionNeedsAliasRewrite = !!(sectionParamRaw && LEGACY_SECTION_ALIASES[sectionParamRaw]);

    // If coming from legacy ?tab= or legacy section alias, rewrite URL to canonical ?section=
    if (!sectionIsValid || legacyTab || sectionNeedsAliasRewrite) {
      setSearchParams({ section: activeSection }, { replace: true });
    }

    // Apply an optional focus hash for legacy deep links (review/uploads/memory)
    if (focusHash && window.location.hash.replace(/^#/, "") !== focusHash) {
      window.location.hash = focusHash;
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
    <div className="flex min-h-screen bg-background">
      {/* Desktop Nav */}
      <div className="hidden lg:block">
        <BusinessBrainNav
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-3xl py-6 px-4 sm:px-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {/* Mobile nav */}
              <div className="lg:hidden">
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
              </div>

              {currentCategory && (
                <div className="flex items-center gap-2">
                  <currentCategory.icon className="h-5 w-5 text-primary" />
                  <div className="leading-tight">
                    <h1 className="text-lg font-semibold">{currentCategory.title}</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">{currentCategory.description}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

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

            {/* SERVICE AREA */}
            {activeSection === "service-area" && (
              <>
                <BusinessBrainSectionCard
                  config={{
                    id: "coverage",
                    title: "Coverage Area",
                    purpose: "Where you provide service",
                    usedByAI: [],
                    defaultCollapsed: false,
                  }}
                >
                  <ServiceAreaPreview />
                  <div className="mt-4">
                    <ServiceAreaManager />
                  </div>
                </BusinessBrainSectionCard>

                <BusinessBrainSectionCard
                  config={{
                    id: "eta",
                    title: "Travel Times",
                    purpose: "How long it takes to reach customers",
                    usedByAI: [],
                  }}
                >
                  {isDispatchMode ? <DispatchEtaSection /> : <DistanceEtaSection />}
                </BusinessBrainSectionCard>

                <BusinessBrainSectionCard
                  config={{
                    id: "busyness",
                    title: "Current Workload",
                    purpose: "Adjust wait times when busy",
                    usedByAI: [],
                  }}
                >
                  <BusynessRulesEditor />
                </BusinessBrainSectionCard>
              </>
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

            {/* POLICIES */}
            {activeSection === "policies" && (
              <>
                <BusinessBrainSectionCard
                  config={{
                    id: "policies",
                    title: "Business Policies",
                    purpose: "Cancellation, deposits, and payments",
                    usedByAI: [],
                    defaultCollapsed: false,
                  }}
                >
                  <BusinessPoliciesEditor />
                </BusinessBrainSectionCard>

                <BusinessBrainSectionCard
                  config={{
                    id: "never-promise",
                    title: "AI Guardrails",
                    purpose: "Things your AI should never promise",
                    usedByAI: [],
                  }}
                >
                  <AINeverPromiseEditor />
                </BusinessBrainSectionCard>

                <BusinessBrainSectionCard
                  config={{
                    id: "required-questions",
                    title: "Required Questions",
                    purpose: "Info your AI must collect from callers",
                    usedByAI: [],
                  }}
                >
                  <RequiredQuestionsEditor />
                </BusinessBrainSectionCard>

                {showBookingDelivery && (
                  <BusinessBrainSectionCard
                    config={{
                      id: "booking-delivery",
                      title: "Booking Delivery",
                      purpose: "Where bookings get sent",
                      usedByAI: [],
                    }}
                  >
                    <BookingDeliverySettings />
                  </BusinessBrainSectionCard>
                )}

                {showFoodDelivery && (
                  <BusinessBrainSectionCard
                    config={{
                      id: "food-settings",
                      title: "Order Settings",
                      purpose: "Pickup, delivery, and orders",
                      usedByAI: [],
                    }}
                  >
                    <FoodOrderSettings />
                  </BusinessBrainSectionCard>
                )}

                {showDispatchDelivery && (
                  <BusinessBrainSectionCard
                    config={{
                      id: "dispatch-settings",
                      title: "Dispatch Settings",
                      purpose: "Where jobs get routed",
                      usedByAI: [],
                    }}
                  >
                    <DispatchDeliverySettings />
                  </BusinessBrainSectionCard>
                )}

                {showMedicalSettings && (
                  <BusinessBrainSectionCard
                    config={{
                      id: "hipaa",
                      title: "HIPAA Settings",
                      purpose: "Compliance configuration",
                      usedByAI: [],
                    }}
                  >
                    <MedicalHIPAASettings />
                  </BusinessBrainSectionCard>
                )}
              </>
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
