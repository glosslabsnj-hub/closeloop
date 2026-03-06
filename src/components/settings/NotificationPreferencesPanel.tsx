import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsCard } from "@/components/settings/SettingsSection";
import {
  useNotificationPreferences,
  type NotificationEvent,
} from "@/hooks/useNotificationPreferences";
import { useIndustryContext } from "@/hooks/useIndustryContext";

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

        {/* SMS/Push coming soon note */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="text-xs">Coming soon</Badge>
            SMS and push notification channels
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}
