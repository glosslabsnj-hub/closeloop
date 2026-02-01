import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { KnowledgeUploadHub } from "@/components/knowledge/KnowledgeUploadHub";
import { BusinessProfileEditor } from "@/components/brain/BusinessProfileEditor";
import { BusinessPoliciesEditor } from "@/components/brain/BusinessPoliciesEditor";
import { ServiceAreaManager } from "@/components/brain/ServiceAreaManager";

/**
 * Business Brain - Centralized hub for ALL business knowledge editing
 *
 * NON-NEGOTIABLE RULES:
 * 1. This is the ONLY page where business knowledge can be edited
 * 2. All other pages must be read-only with "Edit in Business Brain" CTAs
 * 3. All writes route through src/lib/brain/writeBrainFact.ts
 *
 * Sections:
 * - #profile: Business name, contact info, hours
 * - #services: Service catalog, menu items, pricing rules
 * - #service-area: Dispatch zones (future)
 * - #scheduling: Hours, busyness, availability
 * - #policies: Cancellation, payment, HIPAA, retention, delivery handoff
 * - #faqs: Business FAQs
 * - #assets: Knowledge uploads
 * - #review-queue: Conflicts, suggestions, merge queue
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
    description: "Name, contact info, hours, and identity"
  },
  {
    id: "services",
    label: "Services & Pricing",
    icon: Package,
    description: "Service catalog, menu items, and pricing rules"
  },
  {
    id: "service-area",
    label: "Service Area",
    icon: MapPin,
    description: "Dispatch zones and delivery coverage (future)"
  },
  {
    id: "scheduling",
    label: "Scheduling & Availability",
    icon: Calendar,
    description: "Hours, busyness rules, and availability slots"
  },
  {
    id: "policies",
    label: "Policies & Rules",
    icon: Shield,
    description: "Cancellation, payment, HIPAA, retention, delivery"
  },
  {
    id: "faqs",
    label: "FAQs & Knowledge",
    icon: FileText,
    description: "Business FAQs and common questions"
  },
  {
    id: "assets",
    label: "Knowledge Assets",
    icon: Upload,
    description: "Uploaded documents and knowledge sources"
  },
  {
    id: "review-queue",
    label: "Review Queue",
    icon: AlertCircle,
    description: "Conflicts, suggestions, and merge approvals"
  }
];

export default function BusinessBrainPage() {
  const { tenant } = useAuth();
  const [activeSection, setActiveSection] = useState("profile");

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
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`
                    w-full flex items-start gap-3 px-3 py-2 rounded-md text-sm transition-colors
                    ${isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="text-left">
                    <div className="font-medium">{item.label}</div>
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
              Centralized hub for all business knowledge. All edits here flow to your AI assistant in real-time.
            </p>
          </div>

          {/* Profile Section */}
          {activeSection === "profile" && (
            <SettingsSection
              id="profile"
              title="Business Profile"
              description="Your business identity, contact information, and operating hours"
            >
              <BusinessProfileEditor />
            </SettingsSection>
          )}

          {/* Services & Pricing Section */}
          {activeSection === "services" && (
            <SettingsSection
              id="services"
              title="Services & Pricing"
              description="Manage your service catalog, menu items, and pricing rules"
            >
              <PricingRulesEditor />

              <div className="mt-6">
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
              description="Define business policies for cancellation, payment, HIPAA, and more"
            >
              <RequiredQuestionsEditor />

              <div className="mt-6">
                <AIBusinessPolicies />
              </div>

              <div className="mt-6">
                <BookingDeliverySettings />
              </div>

              <div className="mt-6">
                <FoodOrderSettings />
              </div>

              <div className="mt-6">
                <DispatchDeliverySettings />
              </div>

              <div className="mt-6">
                <MedicalHIPAASettings />
              </div>

              <div className="mt-6">
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
              <BusinessFAQEditor />

              <div className="mt-6">
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
              <KnowledgeUploadHub />
            </SettingsSection>
          )}

          {/* Review Queue Section */}
          {activeSection === "review-queue" && (
            <SettingsSection
              id="review-queue"
              title="Review Queue"
              description="Review conflicts, AI suggestions, and approve knowledge merges"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Review Queue</CardTitle>
                  <CardDescription>
                    Review and approve AI-detected conflicts and suggested knowledge updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm font-medium mb-2">Knowledge Review</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Approve AI suggestions, resolve knowledge conflicts, and manage merge requests
                    </p>
                    <p className="text-xs text-muted-foreground">
                      No pending items. The AI will flag conflicts when it detects inconsistencies in your knowledge base.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </SettingsSection>
          )}
        </div>
      </main>
    </div>
  );
}
