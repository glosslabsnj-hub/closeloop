/**
 * Business Brain - Centralized hub for ALL business knowledge editing
 *
 * INVENTORY (for maintainability):
 * ================================
 * 
 * TABS (8 sections, URL controlled via ?section=):
 * - profile: BusinessProfileEditor + IndustryTemplateCard
 * - hours: BusinessHoursManager
 * - services: QuoteReadinessCard + PricingRulesEditor + (ServiceCatalogEditor|MenuCatalogEditor|DispatchServiceCatalog)
 * - service-area: ServiceAreaPreview + ServiceAreaManager + (DistanceEtaSection|DispatchEtaSection)
 * - availability: BusynessRulesEditor + AvailabilityHub
 * - policies: BusinessPoliciesEditor + AINeverPromiseEditor + RequiredQuestionsEditor + mode-specific settings
 * - ai-behavior: AIScriptsEditor + AIBusinessPolicies + IntelligenceSettingsForm
 * - knowledge: BrainReviewQueue + BusinessFAQEditor + BusinessObjectionEditor + CustomKnowledgeEditor + BrainAssetsManager
 * 
 * AI PAYLOAD FIELDS (maps to ElevenLabs dynamic variables):
 * - Profile: business_name, timezone, address, tagline, years_in_business
 * - Hours: hours_today, is_open_now
 * - Services: service_summary/menu_summary, pricing tiers
 * - Service Area: service_area_summary, base_address, radius
 * - Policies: cancellation_policy, deposit_policy, payment_methods
 * - AI Behavior: greeting_script, fallback_script, ai_policies_json
 * - Knowledge: FAQs, objections, custom knowledge
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
import { Brain, Building2, Package, MapPin, Calendar, Shield, Clock, Sparkles, BookOpen, AlertCircle, Maximize2, Minimize2 } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
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
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useFoodMode } from "@/hooks/useFoodMode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/brain/CollapsibleSection";

// Explainability layer components
import {
  BrainHowItWorks,
  BrainTabHeader,
  BrainSetupChecklist,
  BrainPreviewPanel,
  TAB_GUIDANCE,
} from "@/components/brain/explainability";

interface BrainNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const navigationItems: BrainNavItem[] = [
  {
    id: "profile",
    label: "Profile & Identity",
    icon: Building2,
    description: "Business name, contact, website, years"
  },
  {
    id: "hours",
    label: "Operating Hours",
    icon: Clock,
    description: "When you're open for business"
  },
  {
    id: "services",
    label: "Services & Menu",
    icon: Package,
    description: "What you offer and pricing"
  },
  {
    id: "service-area",
    label: "Service Area & ETA",
    icon: MapPin,
    description: "Coverage, travel times, and busyness"
  },
  {
    id: "availability",
    label: "Calendar Sync",
    icon: Calendar,
    description: "Connect calendars and block times"
  },
  {
    id: "policies",
    label: "Policies & Rules",
    icon: Shield,
    description: "Your business policies and what questions the AI must ask"
  },
  {
    id: "ai-behavior",
    label: "AI Behavior",
    icon: Sparkles,
    description: "Scripts, memory, intelligence"
  },
  {
    id: "knowledge",
    label: "Knowledge & Training",
    icon: BookOpen,
    description: "FAQs, customer concerns, uploaded documents, and items to review"
  }
];

const VALID_SECTIONS = ["profile", "hours", "services", "service-area", "availability", "policies", "ai-behavior", "knowledge"] as const;
type SectionId = typeof VALID_SECTIONS[number];

export default function BusinessBrainPage() {
  const { tenant } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const reviewCount = useBrainReviewCount();
  const { businessMode } = useTenantConfig();
  const { isFoodMode, hasFoodOrders, hasMenuKnowledge } = useFoodMode();
  
  // Get section from URL or default to profile
  const sectionParam = searchParams.get("section");
  const initialSection = VALID_SECTIONS.includes(sectionParam as SectionId) 
    ? (sectionParam as SectionId) 
    : "profile";
  
  const [activeSection, setActiveSection] = useState<SectionId>(initialSection);
  
  // Sync URL with active section
  useEffect(() => {
    if (activeSection !== sectionParam) {
      setSearchParams({ section: activeSection }, { replace: true });
    }
  }, [activeSection, sectionParam, setSearchParams]);
  
  // Handle URL changes (back/forward navigation)
  useEffect(() => {
    if (VALID_SECTIONS.includes(sectionParam as SectionId) && sectionParam !== activeSection) {
      setActiveSection(sectionParam as SectionId);
    }
  }, [sectionParam]);
  
  // Focus mode state - persisted to localStorage
  const [focusMode, setFocusMode] = useState(() => {
    return localStorage.getItem('business-brain-focus-mode') === 'true';
  });

  // Toggle focus mode and persist
  const toggleFocusMode = () => {
    const newValue = !focusMode;
    setFocusMode(newValue);
    localStorage.setItem('business-brain-focus-mode', String(newValue));
    // Dispatch custom event so AppLayout can respond
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

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const showBookingDelivery = ["service", "medical", "general"].includes(businessMode);
  const showDispatchDelivery = businessMode === "dispatch";
  const showFoodDelivery = businessMode === "food" || hasFoodOrders;
  const showMedicalSettings = businessMode === "medical";
  const isDispatchMode = businessMode === "dispatch";

  // Get current tab guidance
  const currentGuidance = TAB_GUIDANCE[activeSection]?.(businessMode) || TAB_GUIDANCE.profile(businessMode);

  // Get icon for current section
  const currentNavItem = navigationItems.find(item => item.id === activeSection);
  const CurrentIcon = currentNavItem?.icon;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Preview Panel (Sheet) */}
      <BrainPreviewPanel
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        activeSection={activeSection}
      />

      {/* Sidebar Navigation - Hidden in Focus Mode */}
      {!focusMode && (
        <aside className="hidden lg:block w-64 border-r border-border bg-card/50 sticky top-0 h-screen overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Brain className="h-6 w-6 text-primary" />
              <h2 className="text-lg font-semibold">Business Brain</h2>
            </div>
            <nav className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const showBadge = item.id === "knowledge" && reviewCount > 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id as SectionId)}
                    className={`
                      w-full flex items-start gap-3 px-3 py-2 rounded-md text-sm transition-colors relative
                      ${isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="text-left flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {item.label}
                        {showBadge && (
                          <Badge
                            variant={isActive ? "secondary" : "destructive"}
                            className="h-5 px-1.5 text-xs"
                          >
                            {reviewCount}
                          </Badge>
                        )}
                      </div>
                      <div className={`text-xs ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-5xl py-8 px-4 sm:px-6 lg:px-8">
          {/* Header with Focus Mode Toggle */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Business Brain</h1>
              <p className="text-muted-foreground">
                Everything your AI needs to know. All edits here flow to your assistant in real-time.
              </p>
            </div>
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
                  Focus Mode
                </>
              )}
            </Button>
          </div>

          {/* How This Works Strip */}
          <BrainHowItWorks 
            onOpenPreview={() => setPreviewOpen(true)} 
            className="mb-6"
          />

          {/* Setup Checklist */}
          <BrainSetupChecklist 
            className="mb-6" 
            onNavigateToSection={(section) => setActiveSection(section as SectionId)}
          />

          {/* Profile & Identity Section */}
          {activeSection === "profile" && (
            <div className="space-y-4">
              <BrainTabHeader
                title="Profile & Identity"
                icon={CurrentIcon && <CurrentIcon className="h-5 w-5" />}
                guidance={currentGuidance}
                businessMode={businessMode}
                onPreviewSection={() => setPreviewOpen(true)}
              />
              
              <CollapsibleSection
                title="Business Information"
                icon={<Building2 className="h-4 w-4" />}
                description="Name, contact info, timezone, and location"
                defaultCollapsed={false}
              >
                <BusinessProfileEditor />
              </CollapsibleSection>
              
              <CollapsibleSection
                title="Industry Templates"
                icon={<Package className="h-4 w-4" />}
                description="Quick setup using pre-built templates"
              >
                <IndustryTemplateCard />
              </CollapsibleSection>
            </div>
          )}

          {/* Operating Hours Section */}
          {activeSection === "hours" && (
            <div className="space-y-4">
              <BrainTabHeader
                title="Operating Hours"
                icon={<Clock className="h-5 w-5" />}
                guidance={TAB_GUIDANCE.hours(businessMode)}
                businessMode={businessMode}
                onPreviewSection={() => setPreviewOpen(true)}
              />
              
              <CollapsibleSection
                title="Weekly Schedule"
                icon={<Clock className="h-4 w-4" />}
                description="Your regular business hours"
                defaultCollapsed={false}
              >
                <BusinessHoursManager />
              </CollapsibleSection>
            </div>
          )}

          {/* Services & Menu Section */}
          {activeSection === "services" && (
            <div className="space-y-4">
              <BrainTabHeader
                title={isFoodMode ? "Menu & Pricing" : isDispatchMode ? "Dispatch Services & Rates" : "Services & Pricing"}
                icon={<Package className="h-5 w-5" />}
                guidance={TAB_GUIDANCE.services(businessMode)}
                businessMode={businessMode}
                onPreviewSection={() => setPreviewOpen(true)}
              />
              
              {/* Readiness check - always visible at top */}
              <CollapsibleSection
                title="Pricing Readiness"
                icon={<Package className="h-4 w-4" />}
                description="Check if your AI can quote prices"
                defaultCollapsed={false}
              >
                <QuoteReadinessCard />
              </CollapsibleSection>

              {/* Only show pricing rules for non-dispatch modes */}
              {!isDispatchMode && (
                <CollapsibleSection
                  title="Pricing Rules"
                  icon={<Package className="h-4 w-4" />}
                  description="How your AI quotes prices"
                >
                  <PricingRulesEditor />
                </CollapsibleSection>
              )}

              {/* Mode-aware service catalog */}
              <CollapsibleSection
                title={isFoodMode ? "Menu Items" : isDispatchMode ? "Dispatch Services" : "Your Services"}
                icon={<Package className="h-4 w-4" />}
                description={isFoodMode ? "All your menu items and pricing" : "All your services and pricing"}
                defaultCollapsed={false}
              >
                {isFoodMode ? (
                  <MenuCatalogEditor />
                ) : isDispatchMode ? (
                  <DispatchServiceCatalog />
                ) : (
                  <ServiceCatalogEditor />
                )}
              </CollapsibleSection>
            </div>
          )}

          {/* Service Area & ETA Section */}
          {activeSection === "service-area" && (
            <div className="space-y-4">
              <BrainTabHeader
                title="Where You Serve & Travel Times"
                icon={<MapPin className="h-5 w-5" />}
                guidance={TAB_GUIDANCE["service-area"](businessMode)}
                businessMode={businessMode}
                onPreviewSection={() => setPreviewOpen(true)}
              />
              
              {/* Service Area Preview - always visible */}
              <CollapsibleSection
                title="Current Coverage Summary"
                icon={<MapPin className="h-4 w-4" />}
                defaultCollapsed={false}
              >
                <ServiceAreaPreview />
              </CollapsibleSection>
              
              {/* Service Area Configuration */}
              <CollapsibleSection
                title="Service Area Settings"
                icon={<MapPin className="h-4 w-4" />}
                description="Define where your business provides services"
              >
                <ServiceAreaManager />
              </CollapsibleSection>
              
              {/* ETA Settings */}
              <CollapsibleSection
                title="ETA & Travel Time Settings"
                icon={<Clock className="h-4 w-4" />}
                description="How long it takes to reach customers"
              >
                {isDispatchMode ? <DispatchEtaSection /> : <DistanceEtaSection />}
              </CollapsibleSection>
              
              {/* Busyness / Wait Time Settings */}
              <CollapsibleSection
                title="Current Workload & Wait Times"
                icon={<Clock className="h-4 w-4" />}
                description="Adjust based on how busy you are right now"
              >
                <BusynessRulesEditor />
              </CollapsibleSection>
            </div>
          )}

          {/* Availability Section - Calendar Sync Only */}
          {activeSection === "availability" && (
            <div className="space-y-4">
              <BrainTabHeader
                title="Calendar & Availability"
                icon={<Calendar className="h-5 w-5" />}
                guidance={TAB_GUIDANCE.availability(businessMode)}
                businessMode={businessMode}
                onPreviewSection={() => setPreviewOpen(true)}
              />
              
              <CollapsibleSection
                title="Calendar Connections & Blocked Times"
                icon={<Calendar className="h-4 w-4" />}
                description="Sync your calendar to avoid double-booking"
                defaultCollapsed={false}
              >
                <AvailabilityHub />
              </CollapsibleSection>
            </div>
          )}

          {/* Policies & Rules Section */}
          {activeSection === "policies" && (
            <div className="space-y-4">
              <BrainTabHeader
                title="Policies & What to Collect"
                icon={<Shield className="h-5 w-5" />}
                guidance={TAB_GUIDANCE.policies(businessMode)}
                businessMode={businessMode}
                onPreviewSection={() => setPreviewOpen(true)}
              />
              
              <CollapsibleSection
                title="Business Policies"
                icon={<Shield className="h-4 w-4" />}
                description="Cancellations, deposits, and payment terms"
                defaultCollapsed={false}
              >
                <BusinessPoliciesEditor />
              </CollapsibleSection>

              <CollapsibleSection
                title="What the AI Should Never Promise"
                icon={<AlertCircle className="h-4 w-4" />}
                description="Set hard limits on what your AI can say"
              >
                <AINeverPromiseEditor />
              </CollapsibleSection>

              <CollapsibleSection
                title="Required Questions"
                icon={<Shield className="h-4 w-4" />}
                description="What info your AI must collect from every caller"
              >
                <RequiredQuestionsEditor />
              </CollapsibleSection>

              {/* Mode-specific Delivery Settings */}
              {showBookingDelivery && (
                <CollapsibleSection
                  title="Booking Delivery"
                  icon={<Shield className="h-4 w-4" />}
                  description="Where to send new bookings"
                >
                  <BookingDeliverySettings />
                </CollapsibleSection>
              )}

              {showFoodDelivery && (
                <CollapsibleSection
                  title="Order Settings"
                  icon={<Shield className="h-4 w-4" />}
                  description="Pickup, delivery, and order handling"
                >
                  <FoodOrderSettings />
                </CollapsibleSection>
              )}

              {showDispatchDelivery && (
                <CollapsibleSection
                  title="Dispatch Delivery"
                  icon={<Shield className="h-4 w-4" />}
                  description="Where to send new dispatch jobs"
                >
                  <DispatchDeliverySettings />
                </CollapsibleSection>
              )}

              {showMedicalSettings && (
                <CollapsibleSection
                  title="HIPAA & Compliance"
                  icon={<Shield className="h-4 w-4" />}
                  description="Medical practice compliance settings"
                  priority="warning"
                >
                  <MedicalHIPAASettings />
                </CollapsibleSection>
              )}
            </div>
          )}

          {/* AI Behavior Section */}
          {activeSection === "ai-behavior" && (
            <div className="space-y-4">
              <BrainTabHeader
                title="How Your AI Speaks & Acts"
                icon={<Sparkles className="h-5 w-5" />}
                guidance={TAB_GUIDANCE["ai-behavior"](businessMode)}
                businessMode={businessMode}
                onPreviewSection={() => setPreviewOpen(true)}
              />
              
              <CollapsibleSection
                title="Greeting & Scripts"
                icon={<Sparkles className="h-4 w-4" />}
                description="How your AI starts and ends calls"
                defaultCollapsed={false}
              >
                <AIScriptsEditor />
              </CollapsibleSection>

              <CollapsibleSection
                title="Business Rules & Guidelines"
                icon={<Sparkles className="h-4 w-4" />}
                description="High-level instructions for your AI"
              >
                <AIBusinessPolicies />
              </CollapsibleSection>

              <CollapsibleSection
                title="Intelligence Settings"
                icon={<Sparkles className="h-4 w-4" />}
                description="Advanced AI behavior tuning"
              >
                <IntelligenceSettingsForm />
              </CollapsibleSection>
            </div>
          )}

          {/* Knowledge & Training Section */}
          {activeSection === "knowledge" && (
            <div className="space-y-4">
              <BrainTabHeader
                title="FAQs & Knowledge"
                icon={<BookOpen className="h-5 w-5" />}
                guidance={TAB_GUIDANCE.knowledge(businessMode)}
                businessMode={businessMode}
                onPreviewSection={() => setPreviewOpen(true)}
              />
              
              {/* Review Queue - show prominently if items need review */}
              {reviewCount > 0 && (
                <CollapsibleSection
                  title="Review Queue"
                  icon={<AlertCircle className="h-4 w-4" />}
                  badge={<Badge variant="destructive">{reviewCount}</Badge>}
                  description="Items need your review before the AI can use them"
                  defaultCollapsed={false}
                  priority="error"
                >
                  <BrainReviewQueue />
                </CollapsibleSection>
              )}

              <CollapsibleSection
                title="Frequently Asked Questions"
                icon={<BookOpen className="h-4 w-4" />}
                description="Common questions and their answers"
                defaultCollapsed={false}
              >
                <BusinessFAQEditor />
              </CollapsibleSection>

              <CollapsibleSection
                title="Handling Objections & Concerns"
                icon={<BookOpen className="h-4 w-4" />}
                description="How to respond when customers push back"
              >
                <BusinessObjectionEditor />
              </CollapsibleSection>

              <CollapsibleSection
                title="Custom Knowledge"
                icon={<BookOpen className="h-4 w-4" />}
                description="Additional facts and information"
              >
                <CustomKnowledgeEditor />
              </CollapsibleSection>

              <CollapsibleSection
                title="Uploaded Documents"
                icon={<BookOpen className="h-4 w-4" />}
                description="PDFs, menus, and other files"
              >
                <BrainAssetsManager />
              </CollapsibleSection>

              {reviewCount === 0 && (
                <CollapsibleSection
                  title="Review Queue"
                  icon={<AlertCircle className="h-4 w-4" />}
                  description="No items pending review"
                >
                  <p className="text-sm text-muted-foreground">
                    When you upload documents or add knowledge, items that need approval will appear here.
                  </p>
                </CollapsibleSection>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
