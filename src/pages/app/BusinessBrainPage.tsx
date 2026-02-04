/**
 * Business Brain - Centralized hub for ALL business knowledge editing
 *
 * IMMERSIVE HUB REDESIGN:
 * =======================
 * - When landing without ?section=: Show immersive Hub with step cards
 * - When ?section=X is present: Show the editor for that section
 * - Preserves all existing save handlers and data flows
 *
 * SECTIONS (8 areas, URL controlled via ?section=):
 * - profile: BusinessProfileEditor + IndustryTemplateCard
 * - hours: BusinessHoursManager
 * - services: QuoteReadinessCard + PricingRulesEditor + (ServiceCatalogEditor|MenuCatalogEditor|DispatchServiceCatalog)
 * - service-area: ServiceAreaPreview + ServiceAreaManager + (DistanceEtaSection|DispatchEtaSection) + BusynessRulesEditor
 * - availability: AvailabilityHub
 * - policies: BusinessPoliciesEditor + AINeverPromiseEditor + RequiredQuestionsEditor + mode-specific settings
 * - ai-behavior: AIScriptsEditor + AIBusinessPolicies + IntelligenceSettingsForm
 * - knowledge: BrainReviewQueue + BusinessFAQEditor + BusinessObjectionEditor + CustomKnowledgeEditor + BrainAssetsManager
 *
 * NON-NEGOTIABLE RULES:
 * 1. This is the ONLY page where business knowledge can be edited
 * 2. All other pages must be read-only with "Edit in Business Brain" CTAs
 * 3. All writes route through src/lib/brain/writeBrainFact.ts
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft,
  Eye,
  Menu,
  Maximize2, 
  Minimize2,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Existing section editors (unchanged)
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

// New layout components
import {
  BusinessBrainNav,
  BusinessBrainSectionCard,
  SetupProgressBar,
  SummaryHeader,
  HIPAAWarning,
  BRAIN_CATEGORIES,
} from "@/components/brain/layout";

// Hub components
import { BusinessBrainHub } from "@/components/brain/hub";

// Explainability components
import {
  BrainHowItWorks,
  BrainSetupChecklist,
  BrainPreviewPanel,
} from "@/components/brain/explainability";

const VALID_SECTIONS = ["profile", "hours", "services", "service-area", "availability", "policies", "ai-behavior", "knowledge"] as const;
type SectionId = typeof VALID_SECTIONS[number];

export default function BusinessBrainPage() {
  const { tenant } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const reviewCount = useBrainReviewCount();
  const { businessMode, hipaaMode } = useTenantConfig();
  const { isFoodMode, hasFoodOrders } = useFoodMode();
  
  // Get section from URL - if no section, show hub
  const sectionParam = searchParams.get("section");
  const activeSection = VALID_SECTIONS.includes(sectionParam as SectionId) 
    ? (sectionParam as SectionId) 
    : null;
  
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  // Focus mode state - persisted to localStorage
  const [focusMode, setFocusMode] = useState(() => {
    return localStorage.getItem('business-brain-focus-mode') === 'true';
  });

  // Toggle focus mode and persist
  const toggleFocusMode = () => {
    const newValue = !focusMode;
    setFocusMode(newValue);
    localStorage.setItem('business-brain-focus-mode', String(newValue));
    window.dispatchEvent(new CustomEvent('business-brain-focus-mode', { detail: newValue }));
  };

  // Escape key exits focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusMode) {
        toggleFocusMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode]);

  // Preview panel state
  const [previewOpen, setPreviewOpen] = useState(false);

  // Section change handler - navigates to a section editor
  const handleSectionChange = (section: string) => {
    setSearchParams({ section }, { replace: true });
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Back to hub handler
  const handleBackToHub = () => {
    setSearchParams({}, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  // Get current category for section title
  const currentCategory = activeSection 
    ? BRAIN_CATEGORIES.find(c => c.section === activeSection)
    : null;

  // If no section selected, show the hub
  if (!activeSection) {
    return (
      <div className="flex min-h-screen bg-background">
        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-4xl py-6 px-4 sm:px-6 lg:px-8">
            <BusinessBrainHub onNavigateToSection={handleSectionChange} />
          </div>
        </main>
      </div>
    );
  }

  // Section editor view
  return (
    <div className="flex min-h-screen bg-background">
      {/* Preview Panel (Sheet) */}
      <BrainPreviewPanel
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        activeSection={activeSection}
      />

      {/* Desktop Left Navigation - Hidden in Focus Mode */}
      {!focusMode && (
        <div className="hidden lg:block">
          <BusinessBrainNav
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
          />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-4xl py-6 px-4 sm:px-6 lg:px-8">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToHub}
                className="gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Hub
              </Button>
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Menu className="h-4 w-4" />
                    {currentCategory?.title || "Menu"}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToHub}
                className="gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Hub
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <div className="flex items-center gap-3">
                  {currentCategory && (
                    <>
                      <currentCategory.icon className="h-6 w-6 text-primary" />
                      <h1 className="text-2xl font-bold">{currentCategory.title}</h1>
                    </>
                  )}
                </div>
                <p className="text-muted-foreground mt-1">
                  {currentCategory?.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewOpen(true)}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFocusMode}
                className="gap-2"
              >
                {focusMode ? (
                  <>
                    <Minimize2 className="h-4 w-4" />
                    Exit Focus
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-4 w-4" />
                    Focus
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Summary Header */}
          <SummaryHeader className="mb-4" />

          {/* How This Works Strip */}
          <BrainHowItWorks 
            onOpenPreview={() => setPreviewOpen(true)} 
            className="mb-4"
          />

          {/* Setup Progress */}
          <SetupProgressBar 
            onNavigateToSection={handleSectionChange}
            className="mb-4"
          />

          {/* Setup Checklist (P0/P1 issues) */}
          <BrainSetupChecklist 
            className="mb-6" 
            onNavigateToSection={handleSectionChange}
          />

          {/* HIPAA Warning for medical mode */}
          {hipaaMode && activeSection !== "policies" && (
            <HIPAAWarning className="mb-4" />
          )}

          {/* ==================== SECTION CONTENT ==================== */}
          <div className="space-y-4">
            
            {/* PROFILE / IDENTITY */}
            {activeSection === "profile" && (
              <>
                <BusinessBrainSectionCard
                  config={{
                    id: "business-info",
                    title: "Business Information",
                    purpose: "Name, contact, timezone, and location your AI introduces",
                    usedByAI: [
                      "Introduces your business by name on every call",
                      "Mentions years in business to build trust",
                      "Answers location and contact questions",
                    ],
                    speechReadyFields: ["tagline", "location_summary"],
                    defaultCollapsed: false,
                  }}
                  examples={[
                    { label: "Tagline", value: "Your trusted local HVAC experts since 1985" },
                    { label: "Location", value: "We're located in downtown Springfield, right off Main Street" },
                  ]}
                  avoidList={[
                    "Leaving business name blank",
                    "Using a personal name instead of business name",
                    "Forgetting to set timezone (causes scheduling issues)",
                  ]}
                >
                  <BusinessProfileEditor />
                </BusinessBrainSectionCard>

                <BusinessBrainSectionCard
                  config={{
                    id: "industry-templates",
                    title: "Quick Start Templates",
                    purpose: "Pre-built setups for common business types",
                    usedByAI: [
                      "Applies industry best practices automatically",
                      "Pre-fills common services and policies",
                    ],
                  }}
                >
                  <IndustryTemplateCard />
                </BusinessBrainSectionCard>
              </>
            )}

            {/* HOURS / OPERATIONS */}
            {activeSection === "hours" && (
              <BusinessBrainSectionCard
                config={{
                  id: "business-hours",
                  title: "Weekly Schedule",
                  purpose: "When your business is open for calls and appointments",
                  usedByAI: [
                    "Tells callers if you're open or closed",
                    "Suggests available booking times",
                    "Explains hours when asked",
                  ],
                  defaultCollapsed: false,
                }}
                avoidList={[
                  "Not setting hours (AI can't tell callers when you're open)",
                  "Forgetting holidays or special closures",
                  "Hours that don't match actual availability",
                ]}
              >
                <BusinessHoursManager />
              </BusinessBrainSectionCard>
            )}

            {/* SERVICES / OFFERINGS */}
            {activeSection === "services" && (
              <>
                <BusinessBrainSectionCard
                  config={{
                    id: "pricing-readiness",
                    title: "Pricing Readiness",
                    purpose: "Check if your AI can accurately quote prices",
                    usedByAI: [
                      "Determines if AI can give quotes vs. 'callback for pricing'",
                      "Shows what's missing for accurate pricing",
                    ],
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
                      purpose: "How your AI quotes prices — fixed, ranges, or callback",
                      usedByAI: [
                        "Decides between exact quote vs. 'starting at' vs. 'I'll have someone call you'",
                        "Applies discounts or upsells when appropriate",
                      ],
                    }}
                    avoidList={[
                      "Allowing AI to quote without configured prices",
                      "Inconsistent pricing between channels",
                    ]}
                  >
                    <PricingRulesEditor />
                  </BusinessBrainSectionCard>
                )}

                <BusinessBrainSectionCard
                  config={{
                    id: "catalog",
                    title: isFoodMode ? "Menu Items" : isDispatchMode ? "Dispatch Services" : "Your Services",
                    purpose: isFoodMode 
                      ? "All your menu items, categories, and pricing" 
                      : "All your services and their pricing",
                    usedByAI: [
                      isFoodMode 
                        ? "Reads menu items when customers ask what you serve"
                        : "Tells callers what you offer when they ask",
                      "Quotes prices accurately for each item",
                      "Matches caller needs to the right service",
                    ],
                    defaultCollapsed: false,
                  }}
                  avoidList={
                    isFoodMode
                      ? [
                          "Missing prices (AI can't quote costs)",
                          "Vague item names (be specific: 'Large Pepperoni Pizza' not 'Pizza')",
                          "Forgetting modifiers and add-ons",
                        ]
                      : isDispatchMode
                      ? [
                          "Missing distance tiers (can't quote long-distance jobs)",
                          "Not setting a base price (quotes will be $0)",
                          "Forgetting vehicle-specific rates",
                        ]
                      : [
                          "Leaving prices blank (AI can't quote)",
                          "Vague service names (be specific about what's included)",
                          "Missing duration estimates (hard to schedule)",
                        ]
                  }
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

            {/* SERVICE AREA & ETA / COVERAGE */}
            {activeSection === "service-area" && (
              <>
                <BusinessBrainSectionCard
                  config={{
                    id: "coverage-summary",
                    title: "Current Coverage",
                    purpose: "Quick view of where you currently serve",
                    usedByAI: [
                      "Checks if caller location is in your service area",
                      "Politely declines jobs outside coverage",
                    ],
                    defaultCollapsed: false,
                  }}
                >
                  <ServiceAreaPreview />
                </BusinessBrainSectionCard>

                <BusinessBrainSectionCard
                  config={{
                    id: "service-area-settings",
                    title: "Service Area Rules",
                    purpose: "Define exactly where your business provides service",
                    usedByAI: [
                      "Uses radius, ZIP codes, or counties to determine coverage",
                      "Delivers out-of-area message when needed",
                    ],
                    speechReadyFields: ["out_of_area_message"],
                  }}
                  examples={
                    isDispatchMode
                      ? [
                          { label: "Dispatch", value: "We cover a 50-mile radius from downtown. Jobs outside that range may have additional fees." },
                        ]
                      : [
                          { label: "Service", value: "We serve all of Cook County and parts of DuPage County." },
                          { label: "Out of area", value: "It looks like you're outside our normal service area. I can take your info and have someone call you back." },
                        ]
                  }
                  avoidList={[
                    "No base address set (can't calculate distances)",
                    "Service radius too small (missing potential customers)",
                    "Robotic out-of-area messages",
                  ]}
                >
                  <ServiceAreaManager />
                </BusinessBrainSectionCard>

                <BusinessBrainSectionCard
                  config={{
                    id: "eta-settings",
                    title: "ETA & Travel Times",
                    purpose: "How long it takes to reach customers",
                    usedByAI: [
                      isDispatchMode
                        ? "Calculates accurate ETAs based on distance"
                        : "Estimates arrival or travel times when relevant",
                      "Quotes realistic timeframes to callers",
                    ],
                  }}
                >
                  {isDispatchMode ? <DispatchEtaSection /> : <DistanceEtaSection />}
                </BusinessBrainSectionCard>

                <BusinessBrainSectionCard
                  config={{
                    id: "busyness",
                    title: "Current Workload",
                    purpose: "Adjust wait times based on how busy you are right now",
                    usedByAI: [
                      "Adds wait time to ETAs when you're busy",
                      "Manages caller expectations realistically",
                    ],
                  }}
                >
                  <BusynessRulesEditor />
                </BusinessBrainSectionCard>
              </>
            )}

            {/* CALENDAR / AVAILABILITY */}
            {activeSection === "availability" && (
              <BusinessBrainSectionCard
                config={{
                  id: "calendar-sync",
                  title: "Calendar Connections",
                  purpose: "Connect external calendars for real-time availability",
                  usedByAI: [
                    "Checks your calendar before offering appointment times",
                    "Avoids double-booking automatically",
                    "Respects blocked times and buffers",
                  ],
                  defaultCollapsed: false,
                }}
                avoidList={[
                  "Not connecting your calendar (AI might double-book)",
                  "Forgetting to block personal time",
                  "Not granting correct calendar permissions",
                ]}
              >
                <AvailabilityHub />
              </BusinessBrainSectionCard>
            )}

            {/* POLICIES & RULES */}
            {activeSection === "policies" && (
              <>
                {hipaaMode && <HIPAAWarning className="mb-4" />}

                <BusinessBrainSectionCard
                  config={{
                    id: "business-policies",
                    title: "Business Policies",
                    purpose: "Cancellations, deposits, and payment terms",
                    usedByAI: [
                      "Explains policies before they become objections",
                      "Answers payment and cancellation questions",
                    ],
                    speechReadyFields: ["cancellation_policy", "deposit_policy"],
                    defaultCollapsed: false,
                  }}
                  examples={[
                    { label: "Cancellation", value: "Just give us 24 hours notice and there's no charge." },
                    { label: "Deposit", value: "We ask for a $50 deposit to hold your spot, and that goes toward your total." },
                  ]}
                  avoidList={[
                    "Legal jargon (keep it conversational)",
                    "Policies that are too long to speak naturally",
                    "Missing payment information",
                  ]}
                >
                  <BusinessPoliciesEditor />
                </BusinessBrainSectionCard>

                <BusinessBrainSectionCard
                  config={{
                    id: "never-promise",
                    title: "What AI Should Never Promise",
                    purpose: "Hard limits on what your AI can commit to",
                    usedByAI: [
                      "Prevents over-promising on pricing or timelines",
                      "Redirects to 'let me have someone call you' when appropriate",
                    ],
                  }}
                >
                  <AINeverPromiseEditor />
                </BusinessBrainSectionCard>

                <BusinessBrainSectionCard
                  config={{
                    id: "required-questions",
                    title: "Required Questions",
                    purpose: "Information your AI must collect from every caller",
                    usedByAI: [
                      "Ensures every call captures the essentials (name, phone, etc.)",
                      "Collects mode-specific info (address for dispatch, party size for reservations)",
                    ],
                    defaultCollapsed: false,
                  }}
                  examples={
                    isDispatchMode
                      ? [
                          { label: "Pickup", value: "What's the pickup address?" },
                          { label: "Vehicle", value: "What type of vehicle do you have?" },
                          { label: "Destination", value: "Where are you heading?" },
                        ]
                      : isFoodMode
                      ? [
                          { label: "Order type", value: "Is this for pickup or delivery?" },
                          { label: "Delivery address", value: "What's the delivery address?" },
                          { label: "Name", value: "What name should I put on the order?" },
                        ]
                      : [
                          { label: "Service", value: "What service are you looking for?" },
                          { label: "Address", value: "What's the service address?" },
                          { label: "Preferred time", value: "Do you have a preferred date or time?" },
                        ]
                  }
                >
                  <RequiredQuestionsEditor />
                </BusinessBrainSectionCard>

                {showBookingDelivery && (
                  <BusinessBrainSectionCard
                    config={{
                      id: "booking-delivery",
                      title: "Booking Delivery",
                      purpose: "Where new bookings get sent",
                      usedByAI: [
                        "Routes confirmed bookings to your preferred destination",
                      ],
                    }}
                  >
                    <BookingDeliverySettings />
                  </BusinessBrainSectionCard>
                )}

                {showFoodDelivery && (
                  <BusinessBrainSectionCard
                    config={{
                      id: "food-delivery",
                      title: "Order Settings",
                      purpose: "Pickup, delivery, and order handling",
                      usedByAI: [
                        "Determines if delivery is available and minimums",
                        "Sets pickup procedures and wait times",
                      ],
                    }}
                  >
                    <FoodOrderSettings />
                  </BusinessBrainSectionCard>
                )}

                {showDispatchDelivery && (
                  <BusinessBrainSectionCard
                    config={{
                      id: "dispatch-delivery",
                      title: "Dispatch Delivery",
                      purpose: "Where new jobs get routed",
                      usedByAI: [
                        "Sends new jobs to your dispatch queue or system",
                      ],
                    }}
                  >
                    <DispatchDeliverySettings />
                  </BusinessBrainSectionCard>
                )}

                {showMedicalSettings && (
                  <BusinessBrainSectionCard
                    config={{
                      id: "hipaa-settings",
                      title: "HIPAA & Compliance",
                      purpose: "Medical practice compliance settings",
                      usedByAI: [
                        "Applies HIPAA-safe language and data handling",
                        "Limits what gets stored for compliance",
                      ],
                      priority: "warning",
                    }}
                  >
                    <MedicalHIPAASettings />
                  </BusinessBrainSectionCard>
                )}
              </>
            )}

            {/* AI BEHAVIOR / SETUP */}
            {activeSection === "ai-behavior" && (
              <>
                <BusinessBrainSectionCard
                  config={{
                    id: "scripts",
                    title: "Greeting & Scripts",
                    purpose: "How your AI starts and ends calls",
                    usedByAI: [
                      "Delivers your custom greeting on every call",
                      "Uses your fallback script when uncertain",
                    ],
                    speechReadyFields: ["greeting_script", "fallback_script"],
                    defaultCollapsed: false,
                  }}
                  examples={[
                    { label: "Greeting", value: "Thanks for calling Mike's Plumbing! How can I help you today?" },
                    { label: "Fallback", value: "Let me get your number and have someone call you right back with that info." },
                  ]}
                  avoidList={[
                    "Overly formal greetings (sound robotic)",
                    "Generic greetings that don't mention your business",
                    "Scripts that are too long",
                  ]}
                >
                  <AIScriptsEditor />
                </BusinessBrainSectionCard>

                <BusinessBrainSectionCard
                  config={{
                    id: "business-rules",
                    title: "Business Guidelines",
                    purpose: "High-level instructions for your AI",
                    usedByAI: [
                      "Follows your rules about when to offer vs. require callbacks",
                      "Adjusts tone and approach per your preferences",
                    ],
                  }}
                >
                  <AIBusinessPolicies />
                </BusinessBrainSectionCard>

                <BusinessBrainSectionCard
                  config={{
                    id: "intelligence",
                    title: "Intelligence Settings",
                    purpose: "Advanced AI behavior tuning",
                    usedByAI: [
                      "Controls memory, learning, and adaptation features",
                    ],
                  }}
                >
                  <IntelligenceSettingsForm />
                </BusinessBrainSectionCard>
              </>
            )}

            {/* KNOWLEDGE & TRAINING */}
            {activeSection === "knowledge" && (
              <>
                {reviewCount > 0 && (
                  <BusinessBrainSectionCard
                    config={{
                      id: "review-queue",
                      title: "Review Queue",
                      purpose: "Items needing your approval before the AI uses them",
                      usedByAI: [
                        "Pending items won't be used until you approve",
                        "Ensures AI only says what you've vetted",
                      ],
                      priority: "error",
                      defaultCollapsed: false,
                    }}
                    headerActions={
                      <Badge variant="destructive" className="text-xs">
                        {reviewCount} pending
                      </Badge>
                    }
                  >
                    <BrainReviewQueue />
                  </BusinessBrainSectionCard>
                )}

                <BusinessBrainSectionCard
                  config={{
                    id: "faqs",
                    title: "Frequently Asked Questions",
                    purpose: "Common questions and your approved answers",
                    usedByAI: [
                      "Answers FAQs instantly without guessing",
                      "Reduces 'I don't know' responses",
                    ],
                    defaultCollapsed: false,
                  }}
                  avoidList={[
                    "Too few FAQs (AI makes up answers)",
                    "Answers that are too long or complex",
                    "Outdated information",
                  ]}
                >
                  <BusinessFAQEditor />
                </BusinessBrainSectionCard>

                <BusinessBrainSectionCard
                  config={{
                    id: "objections",
                    title: "Handling Objections",
                    purpose: "How to respond when customers push back",
                    usedByAI: [
                      "Addresses 'too expensive' or 'not sure' concerns",
                      "Keeps conversations moving toward booking",
                    ],
                  }}
                >
                  <BusinessObjectionEditor />
                </BusinessBrainSectionCard>

                <BusinessBrainSectionCard
                  config={{
                    id: "custom-knowledge",
                    title: "Custom Knowledge",
                    purpose: "Additional facts and information",
                    usedByAI: [
                      "Provides extra context for unusual questions",
                    ],
                  }}
                >
                  <CustomKnowledgeEditor />
                </BusinessBrainSectionCard>

                <BusinessBrainSectionCard
                  config={{
                    id: "documents",
                    title: "Uploaded Documents",
                    purpose: "PDFs, menus, and reference materials",
                    usedByAI: [
                      "References uploaded files for detailed info",
                    ],
                  }}
                >
                  <BrainAssetsManager />
                </BusinessBrainSectionCard>

                {reviewCount === 0 && (
                  <BusinessBrainSectionCard
                    config={{
                      id: "review-queue-empty",
                      title: "Review Queue",
                      purpose: "No items pending review",
                      usedByAI: [
                        "All uploaded content has been reviewed",
                      ],
                    }}
                  >
                    <p className="text-sm text-muted-foreground">
                      When you upload documents or add knowledge, items that need approval will appear here.
                    </p>
                  </BusinessBrainSectionCard>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
