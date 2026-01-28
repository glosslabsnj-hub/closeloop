import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantSettings, useAvailabilitySlots, useAssistantSettings } from "@/hooks/useSettings";
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
import { Building2, Clock, Users, CreditCard, Bell, Lock, Loader2 } from "lucide-react";

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
  const { user, signOut, subscription } = useAuth();
  const { tenant, updateTenant, isUpdating } = useTenantSettings();
  const { settings: assistantSettings, updateSettings, isUpdating: isUpdatingSettings } = useAssistantSettings();
  const { slots, saveSlots, isSaving } = useAvailabilitySlots();

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
    if (tenant) {
      setBusinessName(tenant.name || "");
      setTimezone(tenant.timezone || "America/New_York");
      setTagline(tenant.tagline || "");
    }
  }, [tenant]);

  // Load phone from assistant_settings (primary source) or fall back to tenant
  useEffect(() => {
    if (assistantSettings?.business_phone_number) {
      setPhone(assistantSettings.business_phone_number);
    } else if (tenant?.phone_public) {
      setPhone(tenant.phone_public);
    }
  }, [assistantSettings, tenant]);

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

  const planLabel = subscription?.plan_code === "both" 
    ? "Pro Plan ($249/mo)" 
    : subscription?.plan_code === "voice" 
    ? "Voice Plan ($199/mo)" 
    : subscription?.plan_code === "text"
    ? "Text Plan ($99/mo)"
    : "No Plan";

  const isSavingBusiness = isUpdating || isUpdatingSettings;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your business settings</p>
      </div>

      <Tabs defaultValue="business" className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Business</span>
          </TabsTrigger>
          <TabsTrigger value="hours" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Hours</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
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
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Manage your plan and billing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-lg">{planLabel}</p>
                    <p className="text-sm text-muted-foreground">
                      {subscription?.status === "active"
                        ? "Billed monthly"
                        : subscription?.status === "trialing"
                        ? "Trial period"
                        : "Inactive"}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      subscription?.status === "active" || subscription?.status === "trialing"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {subscription?.status || "No subscription"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Change Plan
                  </Button>
                  <Button variant="outline" size="sm">
                    Update Payment
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
