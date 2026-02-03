import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Brain, Building2, Package, MapPin, Calendar, Shield, Clock, Sparkles, BookOpen, AlertCircle } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { PricingRulesEditor } from "@/components/settings/PricingRulesEditor";
import { BusynessRulesEditor } from "@/components/settings/BusynessRulesEditor";
import { ServiceCatalogEditor } from "@/components/brain/ServiceCatalogEditor";
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
import { QuoteReadinessCard } from "@/components/brain/QuoteReadinessCard";
import { IndustryTemplateCard } from "@/components/brain/IndustryTemplateCard";
import { ServiceAreaPreview } from "@/components/debug/ServiceAreaPreview";
import { DistanceEtaSection } from "@/components/business-brain/DistanceEtaSection";
import { IntelligenceSettingsForm } from "@/components/settings/IntelligenceSettingsForm";
import { BusinessHoursManager } from "@/components/brain/BusinessHoursManager";
import { AINeverPromiseEditor } from "@/components/brain/AINeverPromiseEditor";
import { AIScriptsEditor } from "@/components/brain/AIScriptsEditor";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useFoodMode } from "@/hooks/useFoodMode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ExternalLink, Utensils } from "lucide-react";

/**
 * Business Brain - Centralized hub for ALL business knowledge editing
 *
 * NON-NEGOTIABLE RULES:
 * 1. This is the ONLY page where business knowledge can be edited
 * 2. All other pages must be read-only with "Edit in Business Brain" CTAs
 * 3. All writes route through src/lib/brain/writeBrainFact.ts
 *
 * Tab Structure (Reorganized):
 * - Profile & Identity: Business name, contact, website, years in business
 * - Operating Hours: Business hours with AI preview
 * - Services & Menu: Mode-aware services or menu items
 * - Service Area & ETA: Coverage zones and ETAs
 * - Availability: Calendar sync and blocks
 * - Policies & Rules: Mode-aware delivery settings, cancellation, AI restrictions
 * - AI Behavior: Scripts, intelligence, business policies
 * - Knowledge & Training: FAQs, objections, uploads, review queue
 */

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
    description: "Where you serve and travel times"
  },
  {
    id: "availability",
    label: "Availability",
    icon: Calendar,
    description: "Calendar sync and blocked times"
  },
  {
    id: "policies",
    label: "Policies & Rules",
    icon: Shield,
    description: "Cancellation, payment, delivery"
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
    description: "FAQs, objections, uploads, review"
  }
];

export default function BusinessBrainPage() {
  const { tenant } = useAuth();
  const [activeSection, setActiveSection] = useState("profile");
  const reviewCount = useBrainReviewCount();
  const { businessMode } = useTenantConfig();
  const { isFoodMode, hasFoodOrders, hasMenuKnowledge } = useFoodMode();

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

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Navigation */}
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
                  onClick={() => setActiveSection(item.id)}
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-5xl py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Business Brain</h1>
            <p className="text-muted-foreground">
              Everything your AI needs to know. All edits here flow to your assistant in real-time.
            </p>
          </div>

          {/* Profile & Identity Section */}
          {activeSection === "profile" && (
            <SettingsSection
              id="profile"
              title="Profile & Identity"
              description="Your business identity and contact information"
            >
              <BusinessProfileEditor />
              <div className="mt-6">
                <IndustryTemplateCard />
              </div>
            </SettingsSection>
          )}

          {/* Operating Hours Section */}
          {activeSection === "hours" && (
            <SettingsSection
              id="hours"
              title="Operating Hours"
              description="Set when your business is open. The AI uses this to answer 'Are you open?' and schedule appointments."
            >
              <BusinessHoursManager />
            </SettingsSection>
          )}

          {/* Services & Menu Section */}
          {activeSection === "services" && (
            <SettingsSection
              id="services"
              title="Services & Menu"
              description={isFoodMode ? "Manage your menu items and pricing" : "Manage your service catalog and pricing rules"}
            >
              <QuoteReadinessCard />

              <div className="mt-6">
                <PricingRulesEditor />
              </div>

              {/* Mode-aware: Services for most modes, Menu link for food mode */}
              {isFoodMode ? (
                <div className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Utensils className="h-5 w-5" />
                        Menu Items
                      </CardTitle>
                      <CardDescription>
                        Manage your food menu, categories, and item details
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild>
                        <Link to="/app/menu-center">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Menu Center
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="mt-6">
                  <ServiceCatalogEditor />
                </div>
              )}
            </SettingsSection>
          )}

          {/* Service Area & ETA Section */}
          {activeSection === "service-area" && (
            <SettingsSection
              id="service-area"
              title="Service Area & ETA"
              description="Define where you serve and estimated travel times"
            >
              <div className="mb-6">
                <ServiceAreaPreview />
              </div>
              <ServiceAreaManager />
              <div className="mt-6">
                <DistanceEtaSection />
              </div>
            </SettingsSection>
          )}

          {/* Availability Section */}
          {activeSection === "availability" && (
            <SettingsSection
              id="availability"
              title="Availability & Scheduling"
              description="Connect calendars and manage blocked times. Operating hours are set in the Hours tab."
            >
              <BusynessRulesEditor />
              <div className="mt-6">
                <AvailabilityHub />
              </div>
            </SettingsSection>
          )}

          {/* Policies & Rules Section */}
          {activeSection === "policies" && (
            <SettingsSection
              id="policies"
              title="Policies & Rules"
              description="Define business policies and what the AI must collect from callers"
            >
              {/* Core Policies */}
              <BusinessPoliciesEditor />

              <div className="mt-6">
                <AINeverPromiseEditor />
              </div>

              <div className="mt-6">
                <RequiredQuestionsEditor />
              </div>

              {/* Mode-specific Delivery Settings */}
              {showBookingDelivery && (
                <div className="mt-6">
                  <BookingDeliverySettings />
                </div>
              )}

              {showFoodDelivery && (
                <div className="mt-6">
                  <FoodOrderSettings />
                </div>
              )}

              {showDispatchDelivery && (
                <div className="mt-6">
                  <DispatchDeliverySettings />
                </div>
              )}

              {showMedicalSettings && (
                <div className="mt-6">
                  <MedicalHIPAASettings />
                </div>
              )}
            </SettingsSection>
          )}

          {/* AI Behavior Section */}
          {activeSection === "ai-behavior" && (
            <SettingsSection
              id="ai-behavior"
              title="AI Behavior"
              description="Customize how your AI speaks, negotiates, and learns"
            >
              <AIScriptsEditor />

              <div className="mt-6">
                <AIBusinessPolicies />
              </div>

              <div className="mt-6">
                <IntelligenceSettingsForm />
              </div>
            </SettingsSection>
          )}

          {/* Knowledge & Training Section */}
          {activeSection === "knowledge" && (
            <SettingsSection
              id="knowledge"
              title="Knowledge & Training"
              description="FAQs, objection responses, uploaded documents, and items needing review"
            >
              {reviewCount > 0 && (
                <div className="mb-6">
                  <Card className="border-destructive/50 bg-destructive/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        Review Queue
                        <Badge variant="destructive">{reviewCount}</Badge>
                      </CardTitle>
                      <CardDescription>
                        Items need your review before the AI can use them
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <BrainReviewQueue />
                    </CardContent>
                  </Card>
                </div>
              )}

              <BusinessFAQEditor />

              <div className="mt-6">
                <BusinessObjectionEditor />
              </div>

              <div className="mt-6">
                <BrainAssetsManager />
              </div>

              {reviewCount === 0 && (
                <div className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-muted-foreground" />
                        Review Queue
                      </CardTitle>
                      <CardDescription>
                        No items pending review
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <BrainReviewQueue />
                    </CardContent>
                  </Card>
                </div>
              )}
            </SettingsSection>
          )}
        </div>
      </main>
    </div>
  );
}
