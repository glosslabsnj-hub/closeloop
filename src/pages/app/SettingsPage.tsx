import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantSettings, useAvailabilitySlots, useAssistantSettings } from "@/hooks/useSettings";
import { useFoodMode } from "@/hooks/useFoodMode";
import { useModuleEnabled, useTenantConfig } from "@/hooks/useTenantConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lock, Loader2 } from "lucide-react";
import { CallContextDebugger } from "@/components/ai/CallContextDebugger";
import { FoodOrderSettings } from "@/components/settings/FoodOrderSettings";
import { BookingDeliverySettings } from "@/components/settings/BookingDeliverySettings";
import { DispatchDeliverySettings } from "@/components/settings/DispatchDeliverySettings";
import { MedicalHIPAASettings } from "@/components/settings/MedicalHIPAASettings";
import { PlanUpgradeCard } from "@/components/settings/PlanUpgradeCard";
import { MultiLocationManager } from "@/components/settings/MultiLocationManager";
import { DeliveryIntegrationsSettings } from "@/components/settings/DeliveryIntegrationsSettings";
import { AutomationRulesSettings } from "@/components/settings/AutomationRulesSettings";
import { IntelligenceSettingsForm } from "@/components/settings/IntelligenceSettingsForm";
import { AIBusinessPolicies } from "@/components/settings/AIBusinessPolicies";
import { DataControlsPanel } from "@/components/settings/DataControlsPanel";
import { SettingsSidebar, SettingsNavConfig } from "@/components/settings/SettingsSidebar";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { MobileSettingsNav } from "@/components/settings/MobileSettingsNav";
import { AvailabilityHub } from "@/components/availability/AvailabilityHub";

const timezones = [
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
];

const daysOfWeek = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

interface HoursState {
  [key: number]: { enabled: boolean; start: string; end: string };
}

export default function SettingsPage() {
  const { user, signOut, tenant } = useAuth();
  const { tenant: tenantData, updateTenant, isUpdating } = useTenantSettings();
  const { settings: assistantSettings, updateSettings, isUpdating: isUpdatingSettings } = useAssistantSettings();
  const { slots, saveSlots, isSaving } = useAvailabilitySlots();
  const { isFoodMode } = useFoodMode();
  const { hipaaMode } = useTenantConfig();
  const isBookingEnabled = useModuleEnabled("booking");
  const isDispatchEnabled = useModuleEnabled("dispatch_queue");
  const isMedicalMode = useModuleEnabled("medical_intake");
  const [activeSection, setActiveSection] = useState("profile");

  // Business form state
  const [businessName, setBusinessName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [phone, setPhone] = useState("");
  const [tagline, setTagline] = useState("");

  // Hours state
  const [hours, setHours] = useState<HoursState>(() => {
    const initial: HoursState = {};
    daysOfWeek.forEach((d) => {
      initial[d.value] = { enabled: d.value !== 0, start: "09:00", end: "17:00" };
    });
    return initial;
  });

  // Navigation config based on enabled modules
  const navConfig: SettingsNavConfig = {
    showHipaa: isMedicalMode || hipaaMode,
    showBookingDelivery: isBookingEnabled,
    showDispatchDelivery: isDispatchEnabled,
    showFoodSettings: isFoodMode,
  };

  // Initialize from tenant and assistant settings
  useEffect(() => {
    if (tenantData) {
      setBusinessName(tenantData.name || "");
      setTimezone(tenantData.timezone || "America/New_York");
      setTagline(tenantData.tagline || "");
    }
  }, [tenantData]);

  // Load phone from assistant_settings (primary source) or fall back to tenant
  useEffect(() => {
    if (assistantSettings?.business_phone_number) {
      setPhone(assistantSettings.business_phone_number);
    } else if (tenantData?.phone_public) {
      setPhone(tenantData.phone_public);
    }
  }, [assistantSettings, tenantData]);

  // Initialize hours from slots
  useEffect(() => {
    if (slots.length > 0) {
      const newHours: HoursState = {};
      daysOfWeek.forEach((d) => {
        const slot = slots.find((s) => s.day_of_week === d.value);
        if (slot) {
          newHours[d.value] = {
            enabled: slot.is_available ?? true,
            start: slot.start_time,
            end: slot.end_time,
          };
        } else {
          newHours[d.value] = { enabled: false, start: "09:00", end: "17:00" };
        }
      });
      setHours(newHours);
    }
  }, [slots]);

  const handleSaveBusiness = async () => {
    await updateTenant.mutateAsync({
      name: businessName,
      timezone,
      phone_public: phone || null,
      tagline: tagline || null,
    });

    if (phone) {
      await updateSettings.mutateAsync({
        business_phone_number: phone,
      });
    }
  };

  const handleSaveHours = async () => {
    const slotsToSave = daysOfWeek
      .filter((d) => hours[d.value]?.enabled)
      .map((d) => ({
        day_of_week: d.value,
        start_time: hours[d.value].start,
        end_time: hours[d.value].end,
        is_available: true,
      }));
    await saveSlots.mutateAsync(slotsToSave);
  };

  const isSavingBusiness = isUpdating || isUpdatingSettings;

  // Section descriptions for user-friendly context
  const sectionMeta: Record<string, { title: string; description: string }> = {
    profile: {
      title: "Business Profile",
      description: "Your business name, phone number, and timezone. This helps your AI answer questions accurately.",
    },
    hours: {
      title: "Business Hours",
      description: "When you're open for calls and appointments. Your AI will use this to schedule bookings.",
    },
    team: {
      title: "Team Members",
      description: "Manage who has access to your account and their permissions.",
    },
    "ai-learning": {
      title: "AI Learning",
      description: "How your AI learns from interactions and improves over time.",
    },
    "data-privacy": {
      title: "Data & Privacy",
      description: "Control what call data is saved and for how long. Manage recording and transcript storage.",
    },
    hipaa: {
      title: "HIPAA Compliance",
      description: "Medical privacy settings to ensure your practice stays compliant.",
    },
    alerts: {
      title: "How You Get Notified",
      description: "Choose which events trigger email and SMS alerts to you.",
    },
    integrations: {
      title: "Where Things Go",
      description: "Push bookings, orders, and leads to your existing tools via webhooks and integrations.",
    },
    automation: {
      title: "Automation Rules",
      description: "Auto-confirm bookings, send follow-ups, and route leads automatically.",
    },
    plan: {
      title: "Your Plan",
      description: "View your current plan, usage limits, and upgrade options.",
    },
    developer: {
      title: "Developer Tools",
      description: "Debug and inspect AI behavior. For advanced users only.",
    },
  };

  const currentMeta = sectionMeta[activeSection] || { title: "Settings", description: "" };

  const renderSectionContent = () => {
    switch (activeSection) {
      case "profile":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Update your business details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="We make your car shine!"
                />
              </div>
              <div className="space-y-2">
                <Label>Public Phone Number</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555-0123" />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveBusiness} disabled={isSavingBusiness}>
                {isSavingBusiness && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        );

      case "hours":
        return <AvailabilityHub />;

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

      case "ai-learning":
        return (
          <>
            <IntelligenceSettingsForm />
            <AIBusinessPolicies />
          </>
        );

      case "data-privacy":
        return <DataControlsPanel />;

      case "hipaa":
        return <MedicalHIPAASettings />;

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
                { label: "Bookings", description: "When appointments are booked or changed" },
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
        return (
          <div className="space-y-6">
            <DeliveryIntegrationsSettings />
            {isBookingEnabled && <BookingDeliverySettings />}
            {isDispatchEnabled && <DispatchDeliverySettings />}
            {isFoodMode && <FoodOrderSettings />}
          </div>
        );

      case "automation":
        return <AutomationRulesSettings />;

      case "plan":
        return (
          <>
            <PlanUpgradeCard />
            <MultiLocationManager />
          </>
        );

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
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        {/* Mobile Navigation */}
        <MobileSettingsNav
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          config={navConfig}
        />

        {/* Section Header + Content */}
        <SettingsSection title={currentMeta.title} description={currentMeta.description}>
          {renderSectionContent()}
        </SettingsSection>

        {/* Danger Zone - Always visible at bottom */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sign out of your account</p>
              <p className="text-sm text-muted-foreground">You'll need to sign in again</p>
            </div>
            <Button variant="destructive" onClick={signOut}>
              <Lock className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
