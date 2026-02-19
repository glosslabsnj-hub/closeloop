import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, X } from "lucide-react";
import { useAdminGrowthSettings, useUpdateAdminGrowthSettings, type AdminGrowthSettings } from "@/hooks/useAdminGrowthSettings";

const ALL_INDUSTRIES = [
  "towing", "plumber", "hvac", "electrician", "locksmith",
  "auto repair", "dental", "med spa", "salon", "pest control",
  "landscaping", "roofing", "mobile detailing", "cleaning service",
  "restaurant", "veterinary", "real estate", "insurance agency",
  "law firm", "fitness studio",
];

const ALL_PLATFORMS = ["linkedin", "twitter", "facebook", "instagram", "tiktok"];
const AD_PLATFORMS = ["google", "meta", "linkedin"];
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

interface GrowthSettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function GrowthSettingsPanel({ open, onClose }: GrowthSettingsPanelProps) {
  const { data: settings, isLoading } = useAdminGrowthSettings();
  const updateSettings = useUpdateAdminGrowthSettings();
  const [form, setForm] = useState<Partial<AdminGrowthSettings>>({});
  const [locationInput, setLocationInput] = useState("");

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (!open) return null;

  const update = (key: keyof AdminGrowthSettings, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: keyof AdminGrowthSettings, item: string) => {
    const arr = (form[key] as string[]) || [];
    update(key, arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  };

  const addLocation = () => {
    const loc = locationInput.trim();
    if (!loc) return;
    const locs = (form.discovery_locations as string[]) || [];
    if (!locs.includes(loc)) update("discovery_locations", [...locs, loc]);
    setLocationInput("");
  };

  const removeLocation = (loc: string) => {
    update("discovery_locations", ((form.discovery_locations as string[]) || []).filter((l) => l !== loc));
  };

  const handleSave = () => {
    const { id, created_at, updated_at, ...rest } = form as any;
    updateSettings.mutate(rest, { onSuccess: onClose });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-background w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-xl border shadow-xl">
        <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold">Growth Engine Settings</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={updateSettings.isPending}>
              {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Discovery */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Auto-Discovery</CardTitle>
                <Switch
                  checked={form.auto_discovery_enabled ?? false}
                  onCheckedChange={(v) => update("auto_discovery_enabled", v)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Industries</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {ALL_INDUSTRIES.map((ind) => (
                    <Badge
                      key={ind}
                      variant={(form.discovery_industries || []).includes(ind) ? "default" : "outline"}
                      className="cursor-pointer text-xs capitalize"
                      onClick={() => toggleArrayItem("discovery_industries", ind)}
                    >
                      {ind}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Locations</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="e.g. Austin, TX"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLocation())}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={addLocation}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(form.discovery_locations || []).map((loc) => (
                    <Badge key={loc} variant="secondary" className="text-xs">
                      {loc}
                      <button className="ml-1" onClick={() => removeLocation(loc)}><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Frequency (hours)</Label>
                  <Input type="number" value={form.discovery_frequency_hours ?? 24} onChange={(e) => update("discovery_frequency_hours", Number(e.target.value))} className="h-8 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Max per run</Label>
                  <Input type="number" value={form.discovery_max_per_run ?? 50} onChange={(e) => update("discovery_max_per_run", Number(e.target.value))} className="h-8 text-sm mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Outreach */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Outreach</CardTitle>
                <Switch
                  checked={form.auto_outreach_enabled ?? false}
                  onCheckedChange={(v) => update("auto_outreach_enabled", v)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">From Email</Label>
                  <Input value={form.outreach_from_email ?? ""} onChange={(e) => update("outreach_from_email", e.target.value)} className="h-8 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-xs">From Name</Label>
                  <Input value={form.outreach_from_name ?? ""} onChange={(e) => update("outreach_from_name", e.target.value)} className="h-8 text-sm mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Daily Email Limit</Label>
                  <Input type="number" value={form.outreach_daily_email_limit ?? 50} onChange={(e) => update("outreach_daily_email_limit", Number(e.target.value))} className="h-8 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Daily SMS Limit</Label>
                  <Input type="number" value={form.outreach_daily_sms_limit ?? 20} onChange={(e) => update("outreach_daily_sms_limit", Number(e.target.value))} className="h-8 text-sm mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Quiet Hours Start</Label>
                  <Input value={form.outreach_quiet_hours_start ?? "21:00"} onChange={(e) => update("outreach_quiet_hours_start", e.target.value)} className="h-8 text-sm mt-1" placeholder="21:00" />
                </div>
                <div>
                  <Label className="text-xs">Quiet Hours End</Label>
                  <Input value={form.outreach_quiet_hours_end ?? "08:00"} onChange={(e) => update("outreach_quiet_hours_end", e.target.value)} className="h-8 text-sm mt-1" placeholder="08:00" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Quiet Days</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {DAYS.map((day) => (
                    <Badge
                      key={day}
                      variant={(form.outreach_quiet_days || []).includes(day) ? "default" : "outline"}
                      className="cursor-pointer text-xs capitalize"
                      onClick={() => toggleArrayItem("outreach_quiet_days", day)}
                    >
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Social Content</CardTitle>
                <Switch
                  checked={form.auto_social_enabled ?? false}
                  onCheckedChange={(v) => update("auto_social_enabled", v)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Platforms</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {ALL_PLATFORMS.map((p) => (
                    <Badge
                      key={p}
                      variant={(form.social_platforms || []).includes(p) ? "default" : "outline"}
                      className="cursor-pointer text-xs capitalize"
                      onClick={() => toggleArrayItem("social_platforms", p)}
                    >
                      {p === "twitter" ? "Twitter/X" : p}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Posts per Week</Label>
                  <Input type="number" value={form.social_posts_per_week ?? 5} onChange={(e) => update("social_posts_per_week", Number(e.target.value))} className="h-8 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Tone</Label>
                  <Select value={form.social_tone ?? "professional"} onValueChange={(v) => update("social_tone", v)}>
                    <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="educational">Educational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.social_auto_post ?? false} onCheckedChange={(v) => update("social_auto_post", v)} />
                <Label className="text-xs">Auto-post (vs draft-only)</Label>
              </div>
            </CardContent>
          </Card>

          {/* Ads */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Ad Campaigns</CardTitle>
                <Switch
                  checked={form.auto_ads_enabled ?? false}
                  onCheckedChange={(v) => update("auto_ads_enabled", v)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Platforms</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {AD_PLATFORMS.map((p) => (
                    <Badge
                      key={p}
                      variant={(form.ads_platforms || []).includes(p) ? "default" : "outline"}
                      className="cursor-pointer text-xs capitalize"
                      onClick={() => toggleArrayItem("ads_platforms", p)}
                    >
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Weekly Budget Hint ($)</Label>
                <Input type="number" value={form.ads_weekly_budget_hint ?? ""} onChange={(e) => update("ads_weekly_budget_hint", e.target.value ? Number(e.target.value) : null)} className="h-8 text-sm mt-1" placeholder="Optional" />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Alert Email</Label>
                <Input value={form.notification_email ?? ""} onChange={(e) => update("notification_email", e.target.value || null)} className="h-8 text-sm mt-1" placeholder="admin@example.com" />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={form.notify_on_response ?? true} onCheckedChange={(v) => update("notify_on_response", v)} />
                  <Label className="text-xs">Notify on response</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.notify_on_conversion ?? true} onCheckedChange={(v) => update("notify_on_conversion", v)} />
                  <Label className="text-xs">Notify on conversion</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
