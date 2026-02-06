import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTerminology } from "@/hooks/useTerminology";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Lock,
  Settings,
  Users,
  MapPin,
  Calendar,
  CreditCard,
  Bell,
  Shield,
  Database,
  ChevronRight,
  Zap,
  Bug,
  AlertTriangle,
  DollarSign,
  RefreshCw,
  Webhook,
} from "lucide-react";
import { CallContextDebugger } from "@/components/ai/CallContextDebugger";
import { PlanUpgradeCard } from "@/components/settings/PlanUpgradeCard";
import { MultiLocationManager } from "@/components/settings/MultiLocationManager";
import { DeliveryIntegrationsSettings } from "@/components/settings/DeliveryIntegrationsSettings";
import { AutomationRulesSettings } from "@/components/settings/AutomationRulesSettings";
import { DataControlsPanel } from "@/components/settings/DataControlsPanel";
import { DangerZoneSection } from "@/components/settings/DangerZoneSection";
import { SettingsCard } from "@/components/settings/SettingsSection";
import { RevenueSettingsSection } from "@/components/settings/RevenueSettingsSection";
import { RecoverySettingsSection } from "@/components/settings/recovery/RecoverySettingsSection";

interface SettingsGroup {
  id: string;
  label: string;
  items: SettingsItem[];
}

interface SettingsItem {
  id: string;
  icon: typeof Settings;
  label: string;
  description: string;
}

const settingsGroups: SettingsGroup[] = [
  {
    id: "team-locations",
    label: "Team & Locations",
    items: [
      {
        id: "team",
        icon: Users,
        label: "Team Members",
        description: "Staff accounts and permissions",
      },
      {
        id: "locations",
        icon: MapPin,
        label: "Locations",
        description: "Manage multiple business locations",
      },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    items: [
      {
        id: "calendar",
        icon: Calendar,
        label: "Calendar Sync",
        description: "Google Calendar, Outlook sync",
      },
      {
        id: "payments",
        icon: CreditCard,
        label: "Payments",
        description: "Stripe, Square integration",
      },
      {
        id: "webhooks",
        icon: Webhook,
        label: "Webhooks",
        description: "Push data to external systems",
      },
      {
        id: "notifications",
        icon: Bell,
        label: "Notifications",
        description: "SMS, email, push settings",
      },
    ],
  },
  {
    id: "ai-features",
    label: "AI Features",
    items: [
      {
        id: "automation",
        icon: Zap,
        label: "Automation Rules",
        description: "Auto-confirm, follow-ups, routing",
      },
      {
        id: "recovery",
        icon: RefreshCw,
        label: "Lead Recovery",
        description: "Automatic follow-up for missed leads",
      },
      {
        id: "revenue",
        icon: DollarSign,
        label: "Revenue Tracking",
        description: "Configure ROI calculations",
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      {
        id: "billing",
        icon: CreditCard,
        label: "Subscription & Billing",
        description: "Plan, invoices, payment method",
      },
      {
        id: "security",
        icon: Shield,
        label: "Security",
        description: "Password, two-factor authentication",
      },
      {
        id: "data-privacy",
        icon: Database,
        label: "Data & Privacy",
        description: "Export data, retention settings",
      },
    ],
  },
  {
    id: "advanced",
    label: "Advanced",
    items: [
      {
        id: "developer",
        icon: Bug,
        label: "Developer Tools",
        description: "Debug tools for troubleshooting",
      },
      {
        id: "danger",
        icon: AlertTriangle,
        label: "Danger Zone",
        description: "Destructive actions",
      },
    ],
  },
];

export default function SettingsPage() {
  const { user, signOut, tenant } = useAuth();
  const terms = useTerminology();

  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Section content renderers
  const renderSectionContent = () => {
    switch (activeSection) {
      case "team":
        return (
          <SettingsCard
            title="Team Members"
            description="People who can access this account."
            headerAction={<Button size="sm">Invite Member</Button>}
          >
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
                  {user?.email?.[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{user?.email}</p>
                  <p className="text-sm text-muted-foreground">Owner</p>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">You</span>
            </div>
          </SettingsCard>
        );

      case "locations":
        return <MultiLocationManager />;

      case "calendar":
      case "payments":
      case "webhooks":
        return <DeliveryIntegrationsSettings />;

      case "notifications":
        return (
          <SettingsCard
            title="Notification Preferences"
            description="Choose which events trigger alerts to you."
          >
            {[
              { label: "New leads", description: "When a new lead comes in" },
              { label: terms.bookingsMetricLabel, description: `When ${terms.bookings} are created or changed` },
              { label: "Payments", description: "When deposits are collected" },
              { label: "AI escalations", description: "When AI needs human help" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Switch defaultChecked />
              </div>
            ))}
          </SettingsCard>
        );

      case "automation":
        return <AutomationRulesSettings />;

      case "recovery":
        return <RecoverySettingsSection />;

      case "revenue":
        return <RevenueSettingsSection />;

      case "billing":
        return <PlanUpgradeCard />;

      case "security":
        return (
          <SettingsCard
            title="Security Settings"
            description="Manage your account security."
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-sm">Password</p>
                  <p className="text-sm text-muted-foreground">Last changed 30 days ago</p>
                </div>
                <Button variant="outline" size="sm">Change Password</Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-sm">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                </div>
                <Button variant="outline" size="sm">Enable</Button>
              </div>
            </div>
          </SettingsCard>
        );

      case "data-privacy":
        return <DataControlsPanel />;

      case "developer":
        return (
          <>
            <SettingsCard
              title="Debug Tools"
              description="Inspect what data is passed to the AI during calls."
            >
              <p className="text-sm text-muted-foreground">
                These tools help you understand and troubleshoot AI behavior.
              </p>
            </SettingsCard>
            {tenant?.id && <CallContextDebugger tenantId={tenant.id} />}
          </>
        );

      case "danger":
        return <DangerZoneSection />;

      default:
        return null;
    }
  };

  // Overview mode - show all groups
  if (!activeSection) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your account and preferences
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {settingsGroups.map((group) => (
            <div key={group.id}>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {group.label}
              </h2>
              <Card>
                <div className="divide-y">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <item.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {item.description}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>

        {/* Account Access */}
        <Card className="border-white/[0.06]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Sign out of your account</p>
              <p className="text-sm text-muted-foreground">You can sign back in anytime</p>
            </div>
            <Button variant="outline" onClick={signOut}>
              <Lock className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Detail view - show specific section
  const currentItem = settingsGroups
    .flatMap((g) => g.items)
    .find((item) => item.id === activeSection);

  return (
    <div className="space-y-6">
      {/* Back button and header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveSection(null)}
          className="-ml-2 mb-2 gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          Settings
        </Button>
        <div className="flex items-center gap-3">
          {currentItem && (
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <currentItem.icon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {currentItem?.label || "Settings"}
            </h1>
            {currentItem?.description && (
              <p className="text-sm text-muted-foreground">
                {currentItem.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Section content */}
      <div className="space-y-6">{renderSectionContent()}</div>
    </div>
  );
}
