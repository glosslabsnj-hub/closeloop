import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTerminology } from "@/hooks/useTerminology";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Lock, Settings } from "lucide-react";
import { CallContextDebugger } from "@/components/ai/CallContextDebugger";
import { PlanUpgradeCard } from "@/components/settings/PlanUpgradeCard";
import { MultiLocationManager } from "@/components/settings/MultiLocationManager";
import { DeliveryIntegrationsSettings } from "@/components/settings/DeliveryIntegrationsSettings";
import { AutomationRulesSettings } from "@/components/settings/AutomationRulesSettings";
import { DataControlsPanel } from "@/components/settings/DataControlsPanel";
import { SettingsSidebar, SettingsNavConfig } from "@/components/settings/SettingsSidebar";
import { MobileSettingsNav } from "@/components/settings/MobileSettingsNav";
import { BusinessBrainCTA } from "@/components/settings/BusinessBrainCTA";
import { useFoodMode } from "@/hooks/useFoodMode";
import { useModuleEnabled, useTenantConfig } from "@/hooks/useTenantConfig";

export default function SettingsPage() {
  const { user, signOut, tenant } = useAuth();
  const { isFoodMode } = useFoodMode();
  const { hipaaMode } = useTenantConfig();
  const terms = useTerminology();
  const isBookingEnabled = useModuleEnabled("booking");
  const isDispatchEnabled = useModuleEnabled("dispatch_queue");
  const isMedicalMode = useModuleEnabled("medical_intake");

  // Default to first available section
  const [activeSection, setActiveSection] = useState("team");

  // Navigation config based on enabled modules
  const navConfig: SettingsNavConfig = {
    showHipaa: isMedicalMode || hipaaMode,
    showBookingDelivery: isBookingEnabled,
    showDispatchDelivery: isDispatchEnabled,
    showFoodSettings: isFoodMode,
  };

  // Simplified section metadata
  const sectionMeta: Record<string, { title: string; description: string }> = {
    team: {
      title: "Team Members",
      description: "Manage who has access to your account and their permissions.",
    },
    plan: {
      title: "Plan & Billing",
      description: "View your current plan, usage limits, and upgrade options.",
    },
    "data-privacy": {
      title: "Data Controls",
      description: "Control what call data is saved and for how long. Manage recording and transcript storage.",
    },
    alerts: {
      title: "Alerts",
      description: "Choose which events trigger email and SMS alerts to you.",
    },
    integrations: {
      title: "Integrations",
      description: "Push bookings, orders, and leads to your existing tools via webhooks.",
    },
    automation: {
      title: "Automation Rules",
      description: "Auto-confirm bookings, send follow-ups, and route leads automatically.",
    },
    developer: {
      title: "Developer Tools (Optional)",
      description: "Advanced debugging tools. Most users won't need this.",
    },
  };

  const currentMeta = sectionMeta[activeSection] || { title: "Settings", description: "" };

  const renderSectionContent = () => {
    switch (activeSection) {
      case "team":
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>People who can access this account</CardDescription>
                </div>
                <Button>Invite Member</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      {user?.email?.[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{user?.email}</p>
                      <p className="text-sm text-muted-foreground">Owner</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">You</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "plan":
        return (
          <>
            <PlanUpgradeCard />
            <MultiLocationManager />
          </>
        );

      case "data-privacy":
        return <DataControlsPanel />;

      case "alerts":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what triggers alerts to you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "New leads", description: "When a new lead comes in" },
                { label: terms.bookingsMetricLabel, description: `When ${terms.bookings} are created or changed` },
                { label: "Payments", description: "When deposits are collected" },
                { label: "AI escalations", description: "When AI needs human help" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        );

      case "integrations":
        return <DeliveryIntegrationsSettings />;

      case "automation":
        return <AutomationRulesSettings />;

      case "developer":
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Debug Tools</CardTitle>
                <CardDescription>Inspect what data is passed to the AI during calls</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  These tools help you understand and troubleshoot AI behavior. Only use if you're comfortable with technical details.
                </p>
              </CardContent>
            </Card>
            {tenant?.id && <CallContextDebugger tenantId={tenant.id} />}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <SettingsSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        config={navConfig}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        {/* Page Header - Sticky */}
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm py-6 px-6 md:px-8 lg:px-12 border-b border-white/[0.04]">
          {/* Mobile Navigation */}
          <div className="md:hidden mb-4">
            <MobileSettingsNav
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              config={navConfig}
            />
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex-shrink-0 text-muted-foreground">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {currentMeta.title}
              </h1>
              {currentMeta.description && (
                <p className="text-sm text-muted-foreground/70 mt-0.5">
                  {currentMeta.description}
                </p>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-6 md:px-8 lg:px-12 py-6 space-y-6 max-w-4xl">
          {/* Business Brain CTA Banner */}
          <BusinessBrainCTA />

          {/* Section Content */}
          <div className="space-y-6">
            {renderSectionContent()}
          </div>

          {/* Account Access - Always visible at bottom */}
          <Card className="border-white/[0.06]">
            <CardHeader>
              <CardTitle className="text-foreground">Account Access</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sign out of your account</p>
                <p className="text-sm text-muted-foreground">You can sign back in anytime</p>
              </div>
              <Button variant="outline" onClick={signOut}>
                <Lock className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
