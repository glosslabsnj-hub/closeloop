import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Brain, Building2, Package, MapPin, Calendar, FileText, Shield, Upload, AlertCircle } from "lucide-react";
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
import { cn } from "@/lib/utils";

/**
 * Business Brain - Centralized hub for ALL business knowledge editing
 *
 * NON-NEGOTIABLE RULES:
 * 1. This is the ONLY page where business knowledge can be edited
 * 2. All other pages must be read-only with "Edit in Business Brain" CTAs
 * 3. All writes route through src/lib/brain/writeBrainFact.ts
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
    label: "Business Profile",
    icon: Building2,
    description: "Name, contact, hours"
  },
  {
    id: "services",
    label: "Services & Pricing",
    icon: Package,
    description: "Catalog and pricing rules"
  },
  {
    id: "service-area",
    label: "Service Area",
    icon: MapPin,
    description: "Dispatch zones and coverage"
  },
  {
    id: "scheduling",
    label: "Scheduling",
    icon: Calendar,
    description: "Hours and availability"
  },
  {
    id: "policies",
    label: "Policies & Rules",
    icon: Shield,
    description: "Cancellation, payment, HIPAA"
  },
  {
    id: "faqs",
    label: "FAQs & Knowledge",
    icon: FileText,
    description: "Common questions"
  },
  {
    id: "assets",
    label: "Knowledge Assets",
    icon: Upload,
    description: "Documents and sources"
  },
  {
    id: "review-queue",
    label: "Review Queue",
    icon: AlertCircle,
    description: "Conflicts and approvals"
  }
];

export default function BusinessBrainPage() {
  const { tenant } = useAuth();
  const [activeSection, setActiveSection] = useState("profile");
  const reviewCount = useBrainReviewCount();

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <aside className="hidden lg:block w-60 border-r bg-sidebar sticky top-0 h-screen overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center gap-2 px-3 py-3 mb-2">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Business Brain</h2>
          </div>
          <nav className="space-y-0.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              const showBadge = item.id === "review-queue" && reviewCount > 0;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "nav-item w-full",
                    isActive ? "nav-item-active" : "nav-item-inactive"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-medium text-sm flex items-center gap-2">
                      <span className="truncate">{item.label}</span>
                      {showBadge && (
                        <Badge
                          variant={isActive ? "secondary" : "destructive"}
                          className="h-5 px-1.5 text-xs shrink-0"
                        >
                          {reviewCount}
                        </Badge>
                      )}
                    </div>
                    <div className={cn(
                      "text-xs truncate",
                      isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
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
        <div className="max-w-4xl py-6 px-4 sm:px-6 lg:px-8 animate-fade-in">
          {/* Header */}
          <div className="page-header">
            <h1 className="page-title">Business Brain</h1>
            <p className="page-subtitle">
              Centralized hub for all business knowledge. Changes sync to your AI in real-time.
            </p>
          </div>

          {/* Profile Section */}
          {activeSection === "profile" && (
            <div className="content-stack">
              <SettingsSection
                id="profile"
                title="Business Profile"
                description="Your business identity, contact information, and operating hours"
              >
                <BusinessProfileEditor />
              </SettingsSection>

              <IndustryTemplateCard />
            </div>
          )}

          {/* Services & Pricing Section */}
          {activeSection === "services" && (
            <SettingsSection
              id="services"
              title="Services & Pricing"
              description="Manage your service catalog, menu items, and pricing rules"
            >
              <div className="content-stack">
                <QuoteReadinessCard />
                <PricingRulesEditor />
                <ServiceCatalogEditor />
              </div>
            </SettingsSection>
          )}

          {/* Service Area Section */}
          {activeSection === "service-area" && (
            <SettingsSection
              id="service-area"
              title="Service Area"
              description="Define dispatch zones and delivery coverage areas"
            >
              <ServiceAreaManager />
            </SettingsSection>
          )}

          {/* Scheduling & Availability Section */}
          {activeSection === "scheduling" && (
            <SettingsSection
              id="scheduling"
              title="Scheduling & Availability"
              description="Configure hours, busyness rules, and availability slots"
            >
              <div className="content-stack">
                <BusynessRulesEditor />
                <AvailabilityHub />
              </div>
            </SettingsSection>
          )}

          {/* Policies & Rules Section */}
          {activeSection === "policies" && (
            <SettingsSection
              id="policies"
              title="Policies & Rules"
              description="Define business policies for cancellation, payment, HIPAA, and more"
            >
              <div className="content-stack">
                <RequiredQuestionsEditor />
                <AIBusinessPolicies />
                <BookingDeliverySettings />
                <FoodOrderSettings />
                <DispatchDeliverySettings />
                <MedicalHIPAASettings />
                <BusinessPoliciesEditor />
              </div>
            </SettingsSection>
          )}

          {/* FAQs & Knowledge Section */}
          {activeSection === "faqs" && (
            <SettingsSection
              id="faqs"
              title="FAQs & Knowledge"
              description="Manage frequently asked questions and objection responses"
            >
              <div className="content-stack">
                <BusinessFAQEditor />
                <BusinessObjectionEditor />
              </div>
            </SettingsSection>
          )}

          {/* Knowledge Assets Section */}
          {activeSection === "assets" && (
            <SettingsSection
              id="assets"
              title="Knowledge Assets"
              description="Upload and manage documents, PDFs, and other knowledge sources"
            >
              <BrainAssetsManager />
            </SettingsSection>
          )}

          {/* Review Queue Section */}
          {activeSection === "review-queue" && (
            <SettingsSection
              id="review-queue"
              title="Review Queue"
              description="Review conflicts, AI suggestions, and approve knowledge merges"
            >
              <BrainReviewQueue />
            </SettingsSection>
          )}
        </div>
      </main>
    </div>
  );
}
