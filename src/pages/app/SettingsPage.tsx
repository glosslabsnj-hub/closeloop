import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantSettings, useAvailabilitySlots, useAssistantSettings } from "@/hooks/useSettings";
import { useFoodMode } from "@/hooks/useFoodMode";
import { useModuleEnabled, useTenantConfig } from "@/hooks/useTenantConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Clock, Users, CreditCard, Bell, Lock, Loader2, Bug, UtensilsCrossed, Calendar, Truck, Stethoscope } from "lucide-react";
import { CallContextDebugger } from "@/components/ai/CallContextDebugger";
import { FoodOrderSettings } from "@/components/settings/FoodOrderSettings";
import { BookingDeliverySettings } from "@/components/settings/BookingDeliverySettings";
import { DispatchDeliverySettings } from "@/components/settings/DispatchDeliverySettings";
import { MedicalHIPAASettings } from "@/components/settings/MedicalHIPAASettings";
import { MobileSettingsTabs } from "@/components/settings/MobileSettingsTabs";
import { PlanUpgradeCard } from "@/components/settings/PlanUpgradeCard";
import { MultiLocationManager } from "@/components/settings/MultiLocationManager";

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
  const [activeTab, setActiveTab] = useState("business");

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
    // Update tenant
    await updateTenant.mutateAsync({
      name: businessName,
      timezone,
      phone_public: phone || null,
      tagline: tagline || null,
    });

    // Also update assistant_settings.business_phone_number to keep in sync
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

  // Tab configuration for mobile
  const tabConfig = [
    { value: "business", label: "Business", icon: Building2, visible: true },
    { value: "hours", label: "Hours", icon: Clock, visible: true },
    { value: "team", label: "Team", icon: Users, visible: true },
    { value: "billing", label: "Billing", icon: CreditCard, visible: true },
    { value: "notifications", label: "Notifications", icon: Bell, visible: true },
    { value: "food", label: "Food", icon: UtensilsCrossed, visible: isFoodMode },
    { value: "booking-delivery", label: "Booking Delivery", icon: Calendar, visible: isBookingEnabled },
    { value: "dispatch-delivery", label: "Dispatch Delivery", icon: Truck, visible: isDispatchEnabled },
    { value: "hipaa", label: "HIPAA", icon: Stethoscope, visible: isMedicalMode || hipaaMode },
    { value: "developer", label: "Developer", icon: Bug, visible: true },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your business settings</p>
      </div>

      {/* Mobile Tab Selector */}
      <MobileSettingsTabs
        tabs={tabConfig}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1 hidden md:flex">
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="h-4 w-4" />
            Business
          </TabsTrigger>
          <TabsTrigger value="hours" className="gap-2">
            <Clock className="h-4 w-4" />
            Hours
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          {isFoodMode && (
            <TabsTrigger value="food" className="gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              Food
            </TabsTrigger>
          )}
          {isBookingEnabled && (
            <TabsTrigger value="booking-delivery" className="gap-2">
              <Calendar className="h-4 w-4" />
              Booking Delivery
            </TabsTrigger>
          )}
          {isDispatchEnabled && (
            <TabsTrigger value="dispatch-delivery" className="gap-2">
              <Truck className="h-4 w-4" />
              Dispatch Delivery
            </TabsTrigger>
          )}
          {(isMedicalMode || hipaaMode) && (
            <TabsTrigger value="hipaa" className="gap-2">
              <Stethoscope className="h-4 w-4" />
              HIPAA
            </TabsTrigger>
          )}
          <TabsTrigger value="developer" className="gap-2">
            <Bug className="h-4 w-4" />
            Developer
          </TabsTrigger>
        </TabsList>

        {/* Business Tab */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Profile</CardTitle>
              <CardDescription>Basic information about your business</CardDescription>
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
        </TabsContent>

        {/* Hours Tab */}
        <TabsContent value="hours" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Hours</CardTitle>
              <CardDescription>Set when you're available for appointments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {daysOfWeek.map((day) => (
                  <div key={day.value} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={hours[day.value]?.enabled ?? false}
                        onCheckedChange={(checked) =>
                          setHours((prev) => ({
                            ...prev,
                            [day.value]: { ...prev[day.value], enabled: checked },
                          }))
                        }
                      />
                      <span className="font-medium">{day.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={hours[day.value]?.start ?? "09:00"}
                        onChange={(e) =>
                          setHours((prev) => ({
                            ...prev,
                            [day.value]: { ...prev[day.value], start: e.target.value },
                          }))
                        }
                        className="w-28"
                        disabled={!hours[day.value]?.enabled}
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={hours[day.value]?.end ?? "17:00"}
                        onChange={(e) =>
                          setHours((prev) => ({
                            ...prev,
                            [day.value]: { ...prev[day.value], end: e.target.value },
                          }))
                        }
                        className="w-28"
                        disabled={!hours[day.value]?.enabled}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={handleSaveHours} disabled={isSaving} className="mt-4">
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Hours
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage who has access to your account</CardDescription>
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
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <PlanUpgradeCard />
          <MultiLocationManager />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what you want to be notified about</CardDescription>
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
        </TabsContent>

        {/* Food Tab - Only for food tenants */}
        {isFoodMode && (
          <TabsContent value="food" className="space-y-6">
            <FoodOrderSettings />
          </TabsContent>
        )}

        {/* Booking Delivery Tab - Only for booking-enabled tenants */}
        {isBookingEnabled && (
          <TabsContent value="booking-delivery" className="space-y-6">
            <BookingDeliverySettings />
          </TabsContent>
        )}

        {/* Dispatch Delivery Tab - Only for dispatch-enabled tenants */}
        {isDispatchEnabled && (
          <TabsContent value="dispatch-delivery" className="space-y-6">
            <DispatchDeliverySettings />
          </TabsContent>
        )}

        {/* HIPAA Settings Tab - Only for medical tenants */}
        {(isMedicalMode || hipaaMode) && (
          <TabsContent value="hipaa" className="space-y-6">
            <MedicalHIPAASettings />
          </TabsContent>
        )}

        {/* Developer Tab */}
        <TabsContent value="developer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Developer Tools</CardTitle>
              <CardDescription>Debug and inspect AI call context</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Use these tools to inspect what data is being passed to the AI during calls.
              </p>
            </CardContent>
          </Card>
          
          {tenant?.id && <CallContextDebugger tenantId={tenant.id} />}
        </TabsContent>
      </Tabs>

      {/* Danger Zone */}
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
    </div>
  );
}
