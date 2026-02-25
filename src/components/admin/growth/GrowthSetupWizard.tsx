import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  CheckCircle2, Circle, Mail, Share2, Megaphone, Search,
  ChevronRight, ChevronDown, Loader2, Save, Rocket, Key, X,
  AlertTriangle, ExternalLink, Sparkles, Globe,
} from "lucide-react";
import { useAdminGrowthSettings, useUpdateAdminGrowthSettings, type AdminGrowthSettings } from "@/hooks/useAdminGrowthSettings";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const ALL_INDUSTRIES = [
  "towing", "plumber", "hvac", "electrician", "locksmith",
  "auto repair", "dental", "med spa", "salon", "pest control",
  "landscaping", "roofing", "mobile detailing", "cleaning service",
  "restaurant", "veterinary", "real estate", "insurance agency",
  "law firm", "fitness studio",
];

const _ALL_PLATFORMS = ["linkedin", "twitter", "facebook", "instagram", "tiktok"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

interface StepConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  checkConnected: (secrets: string[], settings: AdminGrowthSettings | null) => boolean;
}

const STEPS: StepConfig[] = [
  {
    id: "email",
    title: "Email Sending",
    subtitle: "Connect Resend to send outreach emails automatically",
    icon: Mail,
    color: "text-blue-600",
    checkConnected: (secrets) => secrets.includes("RESEND_API_KEY"),
  },
  {
    id: "discovery",
    title: "Lead Discovery",
    subtitle: "Pick industries & locations to auto-find new leads",
    icon: Search,
    color: "text-emerald-600",
    checkConnected: (_, settings) => !!(settings?.auto_discovery_enabled && (settings?.discovery_industries?.length ?? 0) > 0 && (settings?.discovery_locations?.length ?? 0) > 0),
  },
  {
    id: "social",
    title: "Social Media",
    subtitle: "Connect accounts to auto-post content",
    icon: Share2,
    color: "text-purple-600",
    checkConnected: (secrets) => secrets.includes("TWITTER_ACCESS_TOKEN") || secrets.includes("LINKEDIN_ACCESS_TOKEN"),
  },
  {
    id: "ads",
    title: "Paid Ads",
    subtitle: "Connect Google or Meta to run ad campaigns",
    icon: Megaphone,
    color: "text-pink-600",
    checkConnected: (secrets) => secrets.includes("GOOGLE_ADS_CLIENT_ID") || secrets.includes("META_MARKETING_TOKEN"),
  },
];

function useSecretNames() {
  return useQuery({
    queryKey: ["growth-secret-names"],
    queryFn: async () => {
      // We can't read secret values, but we can check if they exist via edge function
      // For now, we'll use a lightweight check
      const { data } = await supabase.functions.invoke("admin-check-secrets", {
        body: { keys: ["RESEND_API_KEY", "TWITTER_ACCESS_TOKEN", "TWITTER_CONSUMER_KEY", "LINKEDIN_ACCESS_TOKEN", "GOOGLE_ADS_CLIENT_ID", "META_MARKETING_TOKEN"] },
      });
      return (data?.found ?? []) as string[];
    },
    staleTime: 60_000,
    retry: false,
    // If edge function doesn't exist yet, return empty
    placeholderData: [],
  });
}

export function GrowthSetupWizard() {
  const { data: settings, isLoading: settingsLoading } = useAdminGrowthSettings();
  const updateSettings = useUpdateAdminGrowthSettings();
  const { data: secretNames = [] } = useSecretNames();
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<AdminGrowthSettings>>({});
  const [locationInput, setLocationInput] = useState("");

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const completedCount = STEPS.filter((s) => s.checkConnected(secretNames, settings ?? null)).length;
  const allDone = completedCount === STEPS.length;

  const update = (key: keyof AdminGrowthSettings, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: keyof AdminGrowthSettings, item: string) => {
    const arr = (form[key] as string[]) || [];
    update(key, arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  };

  const saveSettings = () => {
    const { _id, _created_at, _updated_at, _discovery_stats, _best_industries, _best_locations, ...rest } = form as any;
    updateSettings.mutate(rest);
  };

  const addLocation = () => {
    const loc = locationInput.trim();
    if (!loc) return;
    const locs = (form.discovery_locations as string[]) || [];
    if (!locs.includes(loc)) update("discovery_locations", [...locs, loc]);
    setLocationInput("");
  };

  if (settingsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Setup Your Growth Engine</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {allDone
                  ? "All systems connected! Your engine is running."
                  : `${completedCount} of ${STEPS.length} steps complete — finish setup to go fully autonomous`}
              </p>
            </div>
          </div>
          {!allDone && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
              <AlertTriangle className="h-3 w-3 mr-1" /> Setup Incomplete
            </Badge>
          )}
          {allDone && (
            <Badge className="text-xs bg-emerald-500">
              <CheckCircle2 className="h-3 w-3 mr-1" /> All Connected
            </Badge>
          )}
        </div>
        {/* Progress bar */}
        <div className="w-full h-2 bg-muted rounded-full mt-3 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / STEPS.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pb-4">
        {STEPS.map((step, idx) => {
          const isConnected = step.checkConnected(secretNames, settings ?? null);
          const isExpanded = expandedStep === step.id;
          const Icon = step.icon;

          return (
            <div key={step.id} className="border rounded-lg overflow-hidden">
              {/* Step Header */}
              <button
                className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                onClick={() => setExpandedStep(isExpanded ? null : step.id)}
              >
                <div className="flex items-center justify-center">
                  {isConnected ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                      {idx + 1}
                    </div>
                  )}
                </div>
                <Icon className={`h-4 w-4 ${step.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{step.title}</span>
                    {isConnected && <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-300">Connected</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{step.subtitle}</p>
                </div>
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>

              {/* Step Content */}
              {isExpanded && (
                <div className="border-t px-4 py-4 bg-muted/20 space-y-4">
                  {step.id === "email" && <EmailStep isConnected={isConnected} />}
                  {step.id === "discovery" && (
                    <DiscoveryStep
                      form={form}
                      update={update}
                      toggleArrayItem={toggleArrayItem}
                      locationInput={locationInput}
                      setLocationInput={setLocationInput}
                      addLocation={addLocation}
                      onSave={saveSettings}
                      isSaving={updateSettings.isPending}
                    />
                  )}
                  {step.id === "social" && <SocialStep isConnected={isConnected} />}
                  {step.id === "ads" && <AdsStep isConnected={isConnected} />}
                </div>
              )}
            </div>
          );
        })}

        {/* Quick Settings */}
        <div className="border rounded-lg p-3 mt-3">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Quick Settings</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">From Email</Label>
              <Input value={form.outreach_from_email ?? ""} onChange={(e) => update("outreach_from_email", e.target.value)} className="h-8 text-sm mt-1" placeholder="hello@getfluxdata.com" />
            </div>
            <div>
              <Label className="text-xs">From Name</Label>
              <Input value={form.outreach_from_name ?? ""} onChange={(e) => update("outreach_from_name", e.target.value)} className="h-8 text-sm mt-1" placeholder="Flux Receptionist" />
            </div>
            <div>
              <Label className="text-xs">Demo Link</Label>
              <Input value={form.demo_link ?? ""} onChange={(e) => update("demo_link", e.target.value)} className="h-8 text-sm mt-1" placeholder="https://getfluxdata.com" />
            </div>
            <div>
              <Label className="text-xs">Trial / Signup Link</Label>
              <Input value={form.trial_link ?? ""} onChange={(e) => update("trial_link", e.target.value)} className="h-8 text-sm mt-1" placeholder="https://getfluxdata.com/signup" />
            </div>
            <div>
              <Label className="text-xs">Alert Email</Label>
              <Input value={form.notification_email ?? ""} onChange={(e) => update("notification_email", e.target.value || null)} className="h-8 text-sm mt-1" placeholder="admin@getfluxdata.com" />
            </div>
            <div>
              <Label className="text-xs">Quiet Hours</Label>
              <div className="flex items-center gap-1 mt-1">
                <Input value={form.outreach_quiet_hours_start ?? "21:00"} onChange={(e) => update("outreach_quiet_hours_start", e.target.value)} className="h-8 text-sm" placeholder="21:00" />
                <span className="text-xs text-muted-foreground">to</span>
                <Input value={form.outreach_quiet_hours_end ?? "08:00"} onChange={(e) => update("outreach_quiet_hours_end", e.target.value)} className="h-8 text-sm" placeholder="08:00" />
              </div>
            </div>
          </div>
          <div className="mt-3">
            <Label className="text-xs">Quiet Days (no outreach)</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {DAYS.map((day, i) => (
                <Badge
                  key={day}
                  variant={(form.outreach_quiet_days || []).includes(DAY_FULL[i]) ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => toggleArrayItem("outreach_quiet_days", DAY_FULL[i])}
                >
                  {day}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-2">
              <Switch checked={form.notify_on_response ?? true} onCheckedChange={(v) => update("notify_on_response", v)} />
              <Label className="text-xs">Notify on response</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.notify_on_conversion ?? true} onCheckedChange={(v) => update("notify_on_conversion", v)} />
              <Label className="text-xs">Notify on conversion</Label>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button size="sm" onClick={saveSettings} disabled={updateSettings.isPending}>
              {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save Settings
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────── Step: Email ───────── */
function EmailStep({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="space-y-3">
      <div className="bg-background rounded-lg p-3 border space-y-2">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium">Resend API Key</span>
          {isConnected && <Badge className="text-[9px] bg-emerald-500">Added</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          Resend sends your outreach emails. Here's how to get your API key:
        </p>
        <ol className="text-xs text-muted-foreground space-y-1 ml-4 list-decimal">
          <li>Go to <a href="https://resend.com/signup" target="_blank" rel="noreferrer" className="text-primary underline">resend.com</a> and create a free account</li>
          <li>Navigate to <strong>API Keys</strong> in the left sidebar</li>
          <li>Click <strong>"Create API Key"</strong>, name it "Flux Receptionist Growth"</li>
          <li>Copy the key and click the button below to paste it in</li>
        </ol>
        {!isConnected && (
          <AddSecretButton secretName="RESEND_API_KEY" label="Add Resend API Key" />
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">
        💡 Resend's free plan includes 100 emails/day — perfect for getting started.
      </p>
    </div>
  );
}

/* ───────── Step: Discovery ───────── */
function DiscoveryStep({
  form, update, toggleArrayItem, locationInput, setLocationInput, addLocation, onSave, isSaving,
}: {
  form: Partial<AdminGrowthSettings>;
  update: (key: keyof AdminGrowthSettings, value: any) => void;
  toggleArrayItem: (key: keyof AdminGrowthSettings, item: string) => void;
  locationInput: string;
  setLocationInput: (v: string) => void;
  addLocation: () => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Pick the industries and locations you want to target. The engine will automatically search for businesses that could benefit from Flux Receptionist and add them to your pipeline.
      </p>

      <div className="flex items-center gap-2 mb-2">
        <Switch
          checked={form.auto_discovery_enabled ?? false}
          onCheckedChange={(v) => update("auto_discovery_enabled", v)}
        />
        <Label className="text-sm font-medium">Enable Auto-Discovery</Label>
      </div>

      <div>
        <Label className="text-xs font-medium">Which industries? (click to select)</Label>
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
        <Label className="text-xs font-medium">Where? (add cities / regions)</Label>
        <div className="flex gap-2 mt-1">
          <Input
            placeholder='e.g. "Austin, TX" or "Los Angeles, CA"'
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
              <button className="ml-1" onClick={() => update("discovery_locations", ((form.discovery_locations as string[]) || []).filter((l) => l !== loc))}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Search every (hours)</Label>
          <Input type="number" value={form.discovery_frequency_hours ?? 24} onChange={(e) => update("discovery_frequency_hours", Number(e.target.value))} className="h-8 text-sm mt-1" />
        </div>
        <div>
          <Label className="text-xs">Max leads per search</Label>
          <Input type="number" value={form.discovery_max_per_run ?? 50} onChange={(e) => update("discovery_max_per_run", Number(e.target.value))} className="h-8 text-sm mt-1" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save Discovery Settings
        </Button>
      </div>
    </div>
  );
}

/* ───────── Step: Social ───────── */
function SocialStep({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Connect your social media accounts so the engine can auto-post content that drives awareness and inbound leads.
      </p>

      <div className="space-y-2">
        <SocialAccountCard
          platform="Twitter / X"
          secretName="TWITTER_ACCESS_TOKEN"
          isConnected={isConnected}
          instructions={[
            "Go to developer.x.com and create a project",
            "Under 'Keys and Tokens', generate your Access Token & Secret",
            "Also copy your Consumer Key (API Key) & Consumer Secret",
            "Click below to add all 4 keys",
          ]}
          secrets={["TWITTER_CONSUMER_KEY", "TWITTER_CONSUMER_SECRET", "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_TOKEN_SECRET"]}
        />

        <div className="bg-background rounded-lg p-3 border">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-blue-700" />
            <span className="text-sm font-medium">LinkedIn, Facebook, Instagram</span>
            <Badge variant="outline" className="text-[9px]">Coming Soon</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            These integrations are on the roadmap. For now, the engine generates draft posts you can manually share.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ───────── Step: Ads ───────── */
function AdsStep({ _isConnected }: { isConnected: boolean }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Connect ad platforms to let the engine create and manage campaigns automatically.
      </p>

      <div className="bg-background rounded-lg p-3 border">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-pink-600" />
          <span className="text-sm font-medium">Google Ads & Meta Ads</span>
          <Badge variant="outline" className="text-[9px]">Coming Soon</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          For now, the engine generates ad copy, headlines, and targeting suggestions you can paste into Google Ads or Meta Ads Manager. Full automation is on the roadmap.
        </p>
      </div>
    </div>
  );
}

/* ───────── Social Account Card ───────── */
function SocialAccountCard({
  platform, secretName, isConnected, instructions, secrets,
}: {
  platform: string;
  secretName: string;
  isConnected: boolean;
  instructions: string[];
  secrets: string[];
}) {
  return (
    <div className="bg-background rounded-lg p-3 border space-y-2">
      <div className="flex items-center gap-2">
        <Share2 className="h-4 w-4 text-sky-500" />
        <span className="text-sm font-medium">{platform}</span>
        {isConnected && <Badge className="text-[9px] bg-emerald-500">Connected</Badge>}
      </div>
      {!isConnected && (
        <>
          <ol className="text-xs text-muted-foreground space-y-1 ml-4 list-decimal">
            {instructions.map((inst, i) => <li key={i}>{inst}</li>)}
          </ol>
          <AddSecretButton secretName={secrets[0]} label={`Add ${platform} Keys`} allSecrets={secrets} />
        </>
      )}
    </div>
  );
}

/* ───────── Add Secret Button (triggers the Lovable secret modal) ───────── */
function AddSecretButton({ secretName, label, allSecrets }: { secretName: string; label: string; allSecrets?: string[] }) {
  const [requested, setRequested] = useState(false);

  // This component just shows a helpful button. The actual secret adding
  // must be done through the Lovable platform's secret management.
  return (
    <div className="flex items-center gap-2 mt-2">
      <Button
        size="sm"
        variant="outline"
        className="text-xs"
        onClick={() => {
          setRequested(true);
          toast.info(
            `To add ${label}, go to your project settings → Cloud → Secrets and add: ${(allSecrets || [secretName]).join(", ")}`,
            { duration: 10000 }
          );
        }}
      >
        <Key className="h-3.5 w-3.5 mr-1" />
        {label}
      </Button>
      {requested && (
        <span className="text-[10px] text-muted-foreground">
          Check the toast message for instructions ↑
        </span>
      )}
    </div>
  );
}
