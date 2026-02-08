import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

export interface CommunicationPrefs {
  aiBookingMode: "auto_book" | "pending_approval" | "callback_only";
  missedCallBehavior: "text_only" | "ai_callback" | "both";
  unknownQuestionBehavior: "escalate" | "try_help" | "offer_callback";
}

/** Sensible defaults per mode */
export function getDefaultCommunicationPrefs(mode: BusinessMode): CommunicationPrefs {
  switch (mode) {
    case "medical":
      return {
        aiBookingMode: "pending_approval",
        missedCallBehavior: "text_only",
        unknownQuestionBehavior: "escalate",
      };
    case "dispatch":
      return {
        aiBookingMode: "callback_only",
        missedCallBehavior: "both",
        unknownQuestionBehavior: "offer_callback",
      };
    default:
      return {
        aiBookingMode: "auto_book",
        missedCallBehavior: "both",
        unknownQuestionBehavior: "try_help",
      };
  }
}

interface CommunicationPreferencesProps {
  businessMode: BusinessMode;
  value: CommunicationPrefs;
  onChange: (prefs: CommunicationPrefs) => void;
}

export function CommunicationPreferences({
  businessMode,
  value,
  onChange,
}: CommunicationPreferencesProps) {
  const showBookingMode = businessMode !== "dispatch";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          How should your AI communicate?
        </h2>
        <p className="mt-2 text-muted-foreground">
          Set your preferences for how the AI handles bookings, missed calls, and unknown questions.
        </p>
      </div>

      {/* AI Booking Mode — hidden for dispatch */}
      {showBookingMode && (
        <PreferenceSection
          title="When AI schedules an appointment:"
          value={value.aiBookingMode}
          onValueChange={(v) => onChange({ ...value, aiBookingMode: v as CommunicationPrefs["aiBookingMode"] })}
          options={[
            {
              value: "auto_book",
              label: "Auto-Book",
              description: "AI confirms appointments instantly based on your availability",
              recommended: true,
            },
            {
              value: "pending_approval",
              label: "Require Approval",
              description: "AI collects the request; you confirm each one manually",
            },
            {
              value: "callback_only",
              label: "Callback Only",
              description: "AI captures details and you call the customer back to book",
            },
          ]}
        />
      )}

      {/* Missed Call Behavior */}
      <PreferenceSection
        title="When a call is missed:"
        value={value.missedCallBehavior}
        onValueChange={(v) => onChange({ ...value, missedCallBehavior: v as CommunicationPrefs["missedCallBehavior"] })}
        options={[
          {
            value: "text_only",
            label: "Text Only",
            description: "Send an automatic follow-up text message",
          },
          {
            value: "ai_callback",
            label: "AI Callback",
            description: "AI calls the customer back automatically",
          },
          {
            value: "both",
            label: "Text + Callback",
            description: "Send a text immediately, then AI calls back if no response",
            recommended: true,
          },
        ]}
      />

      {/* Unknown Question Behavior */}
      <PreferenceSection
        title="When AI doesn't know the answer:"
        value={value.unknownQuestionBehavior}
        onValueChange={(v) => onChange({ ...value, unknownQuestionBehavior: v as CommunicationPrefs["unknownQuestionBehavior"] })}
        options={[
          {
            value: "escalate",
            label: "Escalate Immediately",
            description: "Transfer or take a message right away",
          },
          {
            value: "try_help",
            label: "Try to Help",
            description: "AI uses general knowledge to assist, then escalates if needed",
            recommended: true,
          },
          {
            value: "offer_callback",
            label: "Offer Callback",
            description: "AI lets the caller know someone will follow up",
          },
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable RadioGroup section
// ---------------------------------------------------------------------------

interface OptionDef {
  value: string;
  label: string;
  description: string;
  recommended?: boolean;
}

function PreferenceSection({
  title,
  value,
  onValueChange,
  options,
}: {
  title: string;
  value: string;
  onValueChange: (v: string) => void;
  options: OptionDef[];
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{title}</p>
      <RadioGroup value={value} onValueChange={onValueChange} className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all",
              value === opt.value
                ? "border-primary bg-primary/5"
                : "hover:bg-muted/50"
            )}
          >
            <RadioGroupItem value={opt.value} className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{opt.label}</span>
                {opt.recommended && (
                  <Badge variant="default" className="text-xs">Recommended</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {opt.description}
              </p>
            </div>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
