import { useState, useEffect, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/settings/SettingsSection";
import {
  useNotificationPreferences,
  type NotificationEvent,
} from "@/hooks/useNotificationPreferences";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const BASE_CATEGORY_LABELS: Record<string, string> = {
  calls: "Calls & Leads",
  bookings: "Bookings",
  intelligence: "Intelligence",
  reports: "Reports",
  mode_specific: "Business-Specific",
};

const CATEGORY_ORDER = ["calls", "bookings", "intelligence", "reports", "mode_specific"];

function groupByCategory(events: NotificationEvent[]) {
  const groups: Record<string, NotificationEvent[]> = {};
  for (const event of events) {
    if (!groups[event.category]) groups[event.category] = [];
    groups[event.category].push(event);
  }
  return groups;
}

/** Pluralize a noun: "dispatch" → "dispatches", "job" → "jobs" */
function pluralizeNoun(word: string): string {
  if (/(?:ch|sh|s|x|z)$/i.test(word)) return `${word}es`;
  return `${word}s`;
}

/** Return "an" if word starts with a vowel, "a" otherwise */
function article(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

/**
 * Resolve notification event labels using mode-aware terminology.
 * A plumber sees "New jobs" instead of "New bookings".
 */
function resolveEventLabel(event: NotificationEvent, apptLabel: string): { label: string; description: string } {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const plural = pluralizeNoun(apptLabel);

  switch (event.eventType) {
    case "new_booking":
      return { label: `New ${plural}`, description: `When ${article(apptLabel)} ${apptLabel} is created` };
    case "booking_cancelled":
      return { label: `${cap(apptLabel)} cancellations`, description: `When ${article(apptLabel)} ${apptLabel} is cancelled` };
    case "daily_summary":
      return { label: event.label, description: `A daily digest of calls and ${plural}` };
    case "handoff_failure":
      return { label: event.label, description: `When ${article(apptLabel)} ${apptLabel} handoff fails` };
    default:
      return { label: event.label, description: event.description };
  }
}

function NotificationContactSection() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!tenant?.id || loaded) return;
    (async () => {
      const { data } = await supabase
        .from("universal_delivery_settings")
        .select("notify_phone, notify_email")
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      if (data) {
        setPhone(data.notify_phone || "");
        setEmail(data.notify_email || "");
      }
      setLoaded(true);
    })();
  }, [tenant?.id, loaded]);

  const save = useCallback(async () => {
    if (!tenant?.id) return;
    setSaving(true);
    try {
      const digits = phone.replace(/\D/g, "");
      const normalizedPhone = digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith("1") ? `+${digits}` : phone;

      // Update universal delivery settings
      await supabase.from("universal_delivery_settings").upsert({
        tenant_id: tenant.id,
        notify_phone: normalizedPhone || null,
        notify_email: email || null,
        sms_enabled: !!normalizedPhone,
        email_enabled: !!email,
      }, { onConflict: "tenant_id" });

      // Update ALL delivery settings tables so every mode gets the right contacts
      // Most tables use notify_phone/notify_email columns
      // Build handoff_methods based on what contact info is provided
      const handoffMethods: string[] = ["internal"];
      if (normalizedPhone) handoffMethods.push("sms");
      if (email) handoffMethods.push("email");

      for (const table of [
        "booking_delivery_settings",
        "dispatch_delivery_settings",
        "order_delivery_settings",
      ] as const) {
        await supabase.from(table).upsert({
          tenant_id: tenant.id,
          notify_phone: normalizedPhone || null,
          notify_email: email || null,
          enabled: true,
          handoff_methods: handoffMethods,
        }, { onConflict: "tenant_id" });
      }

      // callback_delivery_settings uses different column names
      await supabase.from("callback_delivery_settings").upsert({
        tenant_id: tenant.id,
        sms_recipient_phone: normalizedPhone || null,
        email_recipient: email || null,
      }, { onConflict: "tenant_id" });

      // medical_intake_delivery_settings also uses different column names
      await supabase.from("medical_intake_delivery_settings").upsert({
        tenant_id: tenant.id,
        sms_recipient_phone: normalizedPhone || null,
        email_recipient: email || null,
        sms_enabled: !!normalizedPhone,
        email_enabled: !!email,
      }, { onConflict: "tenant_id" });

      // Update owner forward number for call transfers
      if (normalizedPhone) {
        await supabase.from("assistant_settings").update({
          owner_forward_number: normalizedPhone,
        }).eq("tenant_id", tenant.id);
      }

      toast({ title: "Notification contacts saved" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [tenant?.id, phone, email, toast]);

  if (!loaded) return <Skeleton className="h-24 w-full" />;

  return (
    <SettingsCard
      title="Notification Contacts"
      description="Where you receive alerts for calls, callbacks, and transfers."
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Phone number</label>
          <p className="text-xs text-muted-foreground mb-1.5">Receives SMS alerts and call transfers</p>
          <Input
            placeholder="(555) 123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Email address</label>
          <p className="text-xs text-muted-foreground mb-1.5">Receives email notifications for callbacks and leads</p>
          <Input
            type="email"
            placeholder="you@yourbusiness.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? "Saving..." : "Save contacts"}
        </Button>
      </div>
    </SettingsCard>
  );
}

export function NotificationPreferencesPanel() {
  const { visibleEvents, isLoading, getPreference, togglePreference } = useNotificationPreferences();
  const { terminology } = useIndustryContext();
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const categoryLabels: Record<string, string> = {
    ...BASE_CATEGORY_LABELS,
    bookings: pluralizeNoun(cap(terminology.appointmentLabel)),
  };

  if (isLoading) {
    return (
      <SettingsCard
        title="Notification Preferences"
        description="Choose which events trigger alerts to you."
      >
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
          ))}
        </div>
      </SettingsCard>
    );
  }

  const grouped = groupByCategory(visibleEvents);

  return (
    <>
    <NotificationContactSection />
    <SettingsCard
      title="Notification Preferences"
      description="Choose which events trigger alerts to you."
    >
      <div className="space-y-6">
        {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length > 0).map((category) => (
          <div key={category}>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              {categoryLabels[category] || category}
            </h4>
            <div className="space-y-1">
              {grouped[category].map((event) => {
                const enabled = getPreference(event.eventType);
                const resolved = resolveEventLabel(event, terminology.appointmentLabel);
                return (
                  <div
                    key={event.eventType}
                    className="flex items-center justify-between py-2.5 px-1 rounded hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0 mr-4">
                      <p className="font-medium text-sm">{resolved.label}</p>
                      <p className="text-sm text-muted-foreground">{resolved.description}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) =>
                          togglePreference.mutate({ eventType: event.eventType, enabled: checked })
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      </div>
    </SettingsCard>
    </>
  );
}
