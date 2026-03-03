import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lock, Settings, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CallContextDebugger } from "@/components/ai/CallContextDebugger";
import { PlanUpgradeCard } from "@/components/settings/PlanUpgradeCard";
import { MultiLocationManager } from "@/components/settings/MultiLocationManager";
import { SubscriptionDetailsCard } from "@/components/settings/SubscriptionDetailsCard";
import { DeliveryIntegrationsSettings } from "@/components/settings/DeliveryIntegrationsSettings";
import { AutomationRulesSettings } from "@/components/settings/AutomationRulesSettings";
import { DataControlsPanel } from "@/components/settings/DataControlsPanel";
import { SettingsSidebar, SettingsNavConfig } from "@/components/settings/SettingsSidebar";
import { MobileSettingsNav } from "@/components/settings/MobileSettingsNav";
// BusinessBrainCTA removed for cleaner settings layout
import { DangerZoneSection } from "@/components/settings/DangerZoneSection";
import { BusinessHoursManager } from "@/components/brain/profile/BusinessHoursManager";
import { NotificationPreferencesPanel } from "@/components/settings/NotificationPreferencesPanel";
import { SettingsCard } from "@/components/settings/SettingsSection";
import { RevenueSettingsSection } from "@/components/settings/RevenueSettingsSection";
import { RecoverySettingsSection } from "@/components/settings/recovery/RecoverySettingsSection";
import { SmsSettingsSection } from "@/components/settings/SmsSettingsSection";
import { ReferralNetworkSettings } from "@/components/settings/ReferralNetworkSettings";
import { ReferralTransferLog } from "@/components/settings/ReferralTransferLog";
import { useFoodMode } from "@/hooks/useFoodMode";
import { useModuleEnabled, useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function SettingsPage() {
  const { user, signOut, tenant, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const { isFoodMode } = useFoodMode();
  const { hipaaMode } = useTenantConfig();
  const { _terms } = useIndustryContext();
  const isBookingEnabled = useModuleEnabled("booking");
  const isDispatchEnabled = useModuleEnabled("dispatch_queue");
  const isMedicalMode = useModuleEnabled("medical_intake");
  const { hasReferralNetwork, hasLeadFollowUp } = useCapabilities();

  // Check if tenant has any call data
  const { data: hasCallData } = useQuery({
    queryKey: ["has-call-data", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return false;
      const { count } = await supabase
        .from("ai_call_sessions")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .limit(1);
      return (count || 0) > 0;
    },
    enabled: !!tenant?.id,
  });

  // Default to first available section
  const [activeSection, setActiveSection] = useState("hours");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("staff");
  const [inviteSending, setInviteSending] = useState(false);

  const handleInviteMember = async () => {
    if (!inviteEmail || !tenant?.id) return;
    setInviteSending(true);
    try {
      const { error } = await (supabase as any)
        .from("tenant_users")
        .insert({
          tenant_id: tenant.id,
          invited_email: inviteEmail,
          role: inviteRole,
        });

      if (error) {
        if (error.message.includes("invited_email") || error.code === "42703") {
          toast({
            title: "Invite sent",
            description: `Share this link with ${inviteEmail}: ${window.location.origin}/signup?invite=${tenant.id}&role=${inviteRole}`,
          });
        } else {
          throw error;
        }
      } else {
        toast({ title: "Invite sent", description: `${inviteEmail} has been invited as ${inviteRole}.` });
      }

      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("staff");
    } catch (err) {
      toast({ title: "Failed to invite", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setInviteSending(false);
    }
  };

  // Navigation config based on enabled modules and business mode
  const _isDispatchMode = isDispatchEnabled && !isBookingEnabled && !isFoodMode;
  const navConfig: SettingsNavConfig = {
    showHipaa: isMedicalMode || hipaaMode,
    showBookingDelivery: isBookingEnabled,
    showDispatchDelivery: isDispatchEnabled,
    showFoodSettings: isFoodMode,
    showRecovery: hasLeadFollowUp,
    showReferralNetwork: hasReferralNetwork,
    hasCallData: hasCallData ?? false,
    isSuperAdmin,
  };

  // Simplified section metadata
  const sectionMeta: Record<string, { title: string; description: string }> = {
    hours: {
      title: "Business Hours",
      description: "Set when your business is open. Your AI agent uses these to handle calls appropriately.",
    },
    team: {
      title: "Team Members",
      description: "Manage who has access to your account and their permissions.",
    },
    plan: {
      title: "Plan & Billing",
      description: "View your current plan, usage limits, and upgrade options.",
    },
    revenue: {
      title: "Revenue Tracking",
      description: "Configure how your AI-generated revenue and ROI are calculated.",
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
      title: "Developer Tools",
      description: "Advanced debugging tools for troubleshooting.",
    },
    danger: {
      title: "Danger Zone",
      description: "Irreversible and destructive actions. Proceed with caution.",
    },
    recovery: {
      title: "Lead Recovery",
      description: "Configure automatic follow-up for leads who don't book.",
    },
    sms: {
      title: "SMS Messaging",
      description: "Configure automated text messages for confirmations, reminders, and reviews.",
    },
    "referral-network": {
      title: "Referral Network",
      description: "Connect callers with other businesses when you can't help them directly.",
    },
  };

  const currentMeta = sectionMeta[activeSection] || { title: "Settings", description: "" };

  const renderSectionContent = () => {
    switch (activeSection) {
      case "hours":
        return (
          <SettingsCard
            title="Business Hours"
            description="Your AI agent will let callers know when you're open and adjust its behavior outside business hours."
          >
            <BusinessHoursManager />
          </SettingsCard>
        );

      case "team":
        return (
          <>
            <SettingsCard
              title="Team Members"
              description="People who can access this account."
              headerAction={
                <Button size="sm" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              }
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

            {/* Invite Member Dialog */}
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your team. They will receive access based on their assigned role.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="teammate@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {inviteRole === "manager" && "Full access to manage settings, team, and data."}
                      {inviteRole === "staff" && "Can manage bookings, leads, and day-to-day operations."}
                      {inviteRole === "viewer" && "Read-only access to dashboards and reports."}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInviteMember} disabled={!inviteEmail || inviteSending}>
                    {inviteSending ? "Sending..." : "Send Invite"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        );

      case "plan":
        return (
          <>
            <PlanUpgradeCard />
            <SubscriptionDetailsCard />
            <MultiLocationManager />
          </>
        );

      case "revenue":
        return <RevenueSettingsSection />;

      case "data-privacy":
        return <DataControlsPanel />;

      case "alerts":
        return <NotificationPreferencesPanel />;

      case "integrations":
        return <DeliveryIntegrationsSettings />;

      case "automation":
        return <AutomationRulesSettings />;

      case "developer":
        return (
          <>
            <SettingsCard
              title="Debug Tools"
              description="Inspect what data is passed to the AI during calls."
            >
              <p className="text-sm text-muted-foreground">
                These tools help you understand and troubleshoot AI behavior. Only use if you're comfortable with technical details.
              </p>
            </SettingsCard>
            {tenant?.id && <CallContextDebugger tenantId={tenant.id} />}
          </>
        );

      case "danger":
        return <DangerZoneSection />;

      case "recovery":
        return <RecoverySettingsSection />;

      case "sms":
        return <SmsSettingsSection />;

      case "referral-network":
        return (
          <>
            <ReferralNetworkSettings />
            <ReferralTransferLog />
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
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md py-4 sm:py-6 px-4 sm:px-6 md:px-8 lg:px-12 relative">
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
          <div className="divider-gradient absolute bottom-0 left-0 right-0" />
        </header>

        {/* Content */}
        <div className="px-4 sm:px-6 md:px-8 lg:px-12 py-4 sm:py-6 space-y-6 max-w-4xl">

          {/* Section Content */}
          <ErrorBoundary context="loading your settings">
            <div className="space-y-6">
              {renderSectionContent()}
            </div>
          </ErrorBoundary>

          {/* Account Access - Always visible at bottom */}
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm card-interactive">
            <CardHeader>
              <CardTitle className="text-foreground text-base">Account Access</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
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
      </main>
    </div>
  );
}
