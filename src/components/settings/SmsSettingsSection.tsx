import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SettingsCard } from "./SettingsSection";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SmsRegistrationStatus } from "@/components/dashboard/SmsRegistrationStatus";
import {
  AlertCircle,
  CalendarCheck,
  Bell,
  Star,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useIndustryContext } from "@/hooks/useIndustryContext";

interface SmsTemplate {
  enabled: boolean;
  message: string;
  delayMinutes?: number;
}

interface SmsSettings {
  appointment_confirmation: SmsTemplate;
  appointment_reminder: SmsTemplate;
  review_request: SmsTemplate;
}

function getDefaultSettings(appointmentLabel: string): SmsSettings {
  return {
    appointment_confirmation: {
      enabled: true,
      message:
        `Hi {{customer_name}}! Your ${appointmentLabel} with {{business_name}} is confirmed for {{appointment_date}} at {{appointment_time}}. Reply STOP to opt out.`,
    },
    appointment_reminder: {
      enabled: true,
      message:
        `Reminder: Your ${appointmentLabel} with {{business_name}} is tomorrow at {{appointment_time}}. See you then! Reply STOP to unsubscribe.`,
      delayMinutes: 1440,
    },
    review_request: {
      enabled: false,
      message:
        `Thank you for choosing {{business_name}}! We'd love your feedback — please leave us a review: {{review_link}}. Reply STOP to opt out.`,
      delayMinutes: 60,
    },
  };
}

// Known default message patterns — if saved template matches one of these,
// it was never customized and should regenerate with correct terminology.
const DEFAULT_PATTERNS = [
  /^Hi \{\{customer_name\}\}! Your \w+ with \{\{business_name\}\} is confirmed/,
  /^Reminder: (You have a|Your) \w+ with \{\{business_name\}\} (is )?tomorrow/,
  /^Thank you for (visiting|choosing) \{\{business_name\}\}/,
];

function isDefaultTemplate(message: string, index: number): boolean {
  return DEFAULT_PATTERNS[index]?.test(message) ?? false;
}

// Static fallback for useState initialization (before terminology loads)
const DEFAULT_SETTINGS = getDefaultSettings("appointment");

const REMINDER_OPTIONS = [
  { label: "1 hour before", value: 60 },
  { label: "2 hours before", value: 120 },
  { label: "4 hours before", value: 240 },
  { label: "24 hours before", value: 1440 },
  { label: "48 hours before", value: 2880 },
];

const REVIEW_DELAY_OPTIONS = [
  { label: "30 minutes after", value: 30 },
  { label: "1 hour after", value: 60 },
  { label: "2 hours after", value: 120 },
  { label: "24 hours after", value: 1440 },
];

// Template variable descriptions are rendered dynamically via getTemplateVariables()
function getTemplateVariables(customerLabel: string, bookingLabel: string) {
  return [
    { key: "{{customer_name}}", desc: `${customerLabel}'s name` },
    { key: "{{business_name}}", desc: "Your business name" },
    { key: "{{appointment_date}}", desc: `${bookingLabel} date` },
    { key: "{{appointment_time}}", desc: `${bookingLabel} time` },
    { key: "{{service_name}}", desc: "Service booked" },
    { key: "{{review_link}}", desc: "Review page link" },
  ];
}

function capitalize(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SmsSettingsSection() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const { terminology, terms } = useIndustryContext();
  const bookingLabel = capitalize(terminology.appointmentLabel);
  const customerLabel = capitalize(terminology.customerLabel);

  // Fetch A2P status
  const { data: a2pStatus } = useQuery({
    queryKey: ["a2p-status", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data, error } = await supabase
        .from("a2p_registrations")
        .select("status, failure_reason, toll_free_verified")
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id,
    refetchInterval: 60_000,
  });

  // Fetch settings from assistant_settings.settings_json
  const { data: assistantSettings } = useQuery({
    queryKey: ["assistant-settings-sms", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data, error } = await supabase
        .from("assistant_settings")
        .select("settings_json")
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id,
  });

  // Fetch review link from tenants table
  const { data: tenantData } = useQuery({
    queryKey: ["tenant-review-link", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data, error } = await supabase
        .from("tenants")
        .select("review_link")
        .eq("id", tenant.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id,
  });

  const savedSmsSettings = (assistantSettings?.settings_json as any)?.sms_templates as SmsSettings | undefined;
  const [settings, setSettings] = useState<SmsSettings>(DEFAULT_SETTINGS);
  const [reviewLink, setReviewLink] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // Sync from server when data loads — use terminology-aware defaults if no saved settings.
  // If saved templates match a known default pattern, regenerate with correct terminology
  // so that a plumber sees "job" not "appointment".
  useEffect(() => {
    const terminologyDefaults = getDefaultSettings(terminology.appointmentLabel);
    if (savedSmsSettings) {
      const keys: (keyof SmsSettings)[] = ["appointment_confirmation", "appointment_reminder", "review_request"];
      const merged = { ...savedSmsSettings };
      keys.forEach((key, i) => {
        if (merged[key] && isDefaultTemplate(merged[key].message, i)) {
          merged[key] = { ...merged[key], message: terminologyDefaults[key].message };
        }
      });
      setSettings(merged);
    } else if (terminology.appointmentLabel) {
      setSettings(terminologyDefaults);
    }
  }, [savedSmsSettings, terminology.appointmentLabel]);

  useEffect(() => {
    if (tenantData?.review_link) {
      setReviewLink(tenantData.review_link);
    }
  }, [tenantData?.review_link]);

  const saveMutation = useMutation({
    mutationFn: async (newSettings: SmsSettings) => {
      if (!tenant?.id) throw new Error("No tenant");

      // Save SMS templates to assistant_settings
      const existingJson = (assistantSettings?.settings_json as Record<string, unknown>) || {};
      const updatedJson = JSON.parse(JSON.stringify({ ...existingJson, sms_templates: newSettings }));
      const { error: settingsError } = await supabase
        .from("assistant_settings")
        .update({
          settings_json: updatedJson,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenant.id);
      if (settingsError) throw settingsError;

      // Save review link to tenants table
      if (reviewLink !== (tenantData?.review_link || "")) {
        const { error: tenantError } = await supabase
          .from("tenants")
          .update({ review_link: reviewLink || null })
          .eq("id", tenant.id);
        if (tenantError) throw tenantError;
      }
    },
    onSuccess: () => {
      toast.success("SMS settings saved");
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["assistant-settings-sms"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-review-link"] });
    },
    onError: () => toast.error("Failed to save SMS settings"),
  });

  const updateTemplate = (
    key: keyof SmsSettings,
    field: keyof SmsTemplate,
    value: string | boolean | number
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
    setIsDirty(true);
  };

  const isApproved = a2pStatus?.status === "approved";
  const isTollFreeActive = a2pStatus?.toll_free_verified && !isApproved;
  const canSend = isApproved || isTollFreeActive;
  const isPending = a2pStatus && !["approved", "failed"].includes(a2pStatus.status) && !isTollFreeActive;
  const noRegistration = !a2pStatus;

  return (
    <div className="space-y-6">
      {/* Registration Status Banner */}
      <SettingsCard
        title="SMS Registration Status"
        description="Your phone number needs to be verified with carriers before sending text messages."
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <SmsRegistrationStatus />
          </div>
          {canSend && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={isApproved ? "default" : "secondary"} className="text-xs">
                {isApproved ? "Verified sender" : "Sending via backup number"}
              </Badge>
              {isTollFreeActive && (
                <span className="text-muted-foreground text-xs">
                  Messages sent from a backup number while your number is being verified
                </span>
              )}
            </div>
          )}
          {isPending && (
            <p className="text-sm text-muted-foreground">
              Registration is in progress. You can configure templates now — they'll activate once a channel is verified.
            </p>
          )}
          {noRegistration && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>
                Complete your business identity in onboarding to start SMS registration.
              </span>
            </div>
          )}
          {a2pStatus?.status === "failed" && (
            <div className="text-sm text-destructive">
              <p>Registration failed: {a2pStatus.failure_reason}</p>
              <p className="text-muted-foreground mt-1">Contact support for assistance.</p>
            </div>
          )}
        </div>
      </SettingsCard>

      {/* Template Variables Reference */}
      <SettingsCard
        title="Available Variables"
        description="Use these placeholders in your message templates."
      >
        <div className="flex flex-wrap gap-2">
          {getTemplateVariables(customerLabel, bookingLabel).map((v) => (
            <Badge key={v.key} variant="secondary" className="gap-1 font-mono text-xs">
              {v.key}
              <span className="font-sans text-muted-foreground">— {v.desc}</span>
            </Badge>
          ))}
        </div>
      </SettingsCard>

      {/* Booking/Appointment Confirmation */}
      <SettingsCard
        title={`${bookingLabel} Confirmation`}
        description={`Sent immediately when ${/^[aeiou]/i.test(terminology.appointmentLabel) ? "an" : "a"} ${terminology.appointmentLabel} is confirmed.`}
        onSave={() => saveMutation.mutate(settings)}
        isSaving={saveMutation.isPending}
        isDirty={isDirty}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" />
              <Label>Send confirmation text</Label>
            </div>
            <Switch
              checked={settings.appointment_confirmation.enabled}
              onCheckedChange={(v) => updateTemplate("appointment_confirmation", "enabled", v)}
            />
          </div>
          {settings.appointment_confirmation.enabled && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Message template</Label>
              <Textarea
                value={settings.appointment_confirmation.message}
                onChange={(e) =>
                  updateTemplate("appointment_confirmation", "message", e.target.value)
                }
                rows={3}
                className="font-mono text-sm"
                placeholder="Type your confirmation message..."
              />
              <p className="text-xs text-muted-foreground">
                {settings.appointment_confirmation.message.length}/1600 characters
              </p>
            </div>
          )}
        </div>
      </SettingsCard>

      {/* Booking/Appointment Reminder */}
      <SettingsCard
        title={`${bookingLabel} Reminder`}
        description={`Sent before the ${terminology.appointmentLabel} to reduce no-shows.`}
        onSave={() => saveMutation.mutate(settings)}
        isSaving={saveMutation.isPending}
        isDirty={isDirty}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Label>Send reminder SMS</Label>
            </div>
            <Switch
              checked={settings.appointment_reminder.enabled}
              onCheckedChange={(v) => updateTemplate("appointment_reminder", "enabled", v)}
            />
          </div>
          {settings.appointment_reminder.enabled && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Send reminder</Label>
                <select
                  value={settings.appointment_reminder.delayMinutes}
                  onChange={(e) =>
                    updateTemplate("appointment_reminder", "delayMinutes", Number(e.target.value))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {REMINDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Message template</Label>
                <Textarea
                  value={settings.appointment_reminder.message}
                  onChange={(e) =>
                    updateTemplate("appointment_reminder", "message", e.target.value)
                  }
                  rows={3}
                  className="font-mono text-sm"
                  placeholder="Type your reminder message..."
                />
                <p className="text-xs text-muted-foreground">
                  {settings.appointment_reminder.message.length}/1600 characters
                </p>
              </div>
            </div>
          )}
        </div>
      </SettingsCard>

      {/* Review Request */}
      <SettingsCard
        title="Review Request"
        description={`Ask for a review after the ${terminology.appointmentLabel} is completed.`}
        onSave={() => saveMutation.mutate(settings)}
        isSaving={saveMutation.isPending}
        isDirty={isDirty}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              <Label>Send review request SMS</Label>
            </div>
            <Switch
              checked={settings.review_request.enabled}
              onCheckedChange={(v) => updateTemplate("review_request", "enabled", v)}
            />
          </div>
          {settings.review_request.enabled && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Send review request</Label>
                <select
                  value={settings.review_request.delayMinutes}
                  onChange={(e) =>
                    updateTemplate("review_request", "delayMinutes", Number(e.target.value))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {REVIEW_DELAY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Review link URL</Label>
                <Input
                  value={reviewLink}
                  onChange={(e) => {
                    setReviewLink(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="https://g.page/your-business/review"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Paste your Google, Yelp, or other review page link
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Message template</Label>
                <Textarea
                  value={settings.review_request.message}
                  onChange={(e) =>
                    updateTemplate("review_request", "message", e.target.value)
                  }
                  rows={3}
                  className="font-mono text-sm"
                  placeholder="Type your review request message..."
                />
                <p className="text-xs text-muted-foreground">
                  {settings.review_request.message.length}/1600 characters
                </p>
              </div>
            </div>
          )}
        </div>
      </SettingsCard>
    </div>
  );
}
