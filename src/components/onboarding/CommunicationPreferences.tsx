import { useState, useRef } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

export type AITone = "professional" | "friendly" | "casual";
export type FollowUpCadence = "aggressive" | "moderate" | "conservative";
export type AIBookingMode = "auto_book" | "pending_approval" | "suggest_callback" | "callback_only";

export interface EscalationRules {
  transferOnRequest: boolean;
  transferOnAnger: boolean;
  transferOnPriceObjection: boolean;
  transferOnComplexQuestion: boolean;
  transferOnComplaint: boolean;
  fallbackAction: "callback" | "voicemail" | "text_owner";
}

export interface CommunicationPrefs {
  aiBookingMode: AIBookingMode;
  missedCallBehavior: "text_only" | "ai_callback" | "both";
  unknownQuestionBehavior: "escalate" | "try_help" | "offer_callback";
  aiTone: AITone;
  followUpCadence: FollowUpCadence;
  customGreeting: string;
  /** Free-text: things the AI should never promise or say */
  aiGuardrails: string;
  /** Required info the AI must collect before booking */
  requiredIntakeFields: string[];
  /** Escalation rules controlling when AI transfers to a human */
  escalationRules: EscalationRules;
}

const DEFAULT_ESCALATION: EscalationRules = {
  transferOnRequest: true,
  transferOnAnger: true,
  transferOnPriceObjection: false,
  transferOnComplexQuestion: true,
  transferOnComplaint: true,
  fallbackAction: "callback",
};

/** Sensible defaults per mode */
export function getDefaultCommunicationPrefs(mode: BusinessMode): CommunicationPrefs {
  switch (mode) {
    case "medical":
      return {
        aiBookingMode: "pending_approval",
        missedCallBehavior: "text_only",
        unknownQuestionBehavior: "escalate",
        aiTone: "professional",
        followUpCadence: "conservative",
        customGreeting: "",
        aiGuardrails: "",
        requiredIntakeFields: ["customer_name", "customer_phone"],
        escalationRules: { ...DEFAULT_ESCALATION, transferOnPriceObjection: true },
      };
    case "dispatch":
      return {
        aiBookingMode: "callback_only",
        missedCallBehavior: "both",
        unknownQuestionBehavior: "offer_callback",
        aiTone: "friendly",
        followUpCadence: "aggressive",
        customGreeting: "",
        aiGuardrails: "",
        requiredIntakeFields: ["customer_name", "customer_phone"],
        escalationRules: DEFAULT_ESCALATION,
      };
    default:
      return {
        aiBookingMode: "auto_book",
        missedCallBehavior: "both",
        unknownQuestionBehavior: "try_help",
        aiTone: "friendly",
        followUpCadence: "moderate",
        customGreeting: "",
        aiGuardrails: "",
        requiredIntakeFields: ["customer_name", "customer_phone"],
        escalationRules: DEFAULT_ESCALATION,
      };
  }
}

interface CommunicationPreferencesProps {
  businessMode: BusinessMode;
  value: CommunicationPrefs;
  onChange: (prefs: CommunicationPrefs) => void;
  scenarioAnswers?: Record<string, boolean | string>;
}

/** Available intake field options per mode */
const intakeFieldOptions: Record<string, { key: string; label: string; modes: string[] }[]> = {
  all: [
    { key: "customer_name", label: "Customer name", modes: ["service", "dispatch", "food", "medical", "general", "sales"] },
    { key: "customer_phone", label: "Phone number", modes: ["service", "dispatch", "food", "medical", "general", "sales"] },
    { key: "customer_email", label: "Email address", modes: ["service", "dispatch", "food", "medical", "general", "sales"] },
  ],
  service: [
    { key: "vehicle_info", label: "Vehicle info", modes: ["service"] },
    { key: "address", label: "Service address", modes: ["service"] },
  ],
  dispatch: [
    { key: "pickup_address", label: "Pickup address", modes: ["dispatch"] },
    { key: "vehicle_description", label: "Vehicle description", modes: ["dispatch"] },
    { key: "is_drivable", label: "Is vehicle drivable?", modes: ["dispatch"] },
  ],
  medical: [
    { key: "insurance_info", label: "Insurance info", modes: ["medical"] },
    { key: "date_of_birth", label: "Date of birth", modes: ["medical"] },
  ],
};

function getIntakeFieldsForMode(mode: BusinessMode) {
  const fields = [...intakeFieldOptions.all];
  const modeFields = intakeFieldOptions[mode];
  if (modeFields) fields.push(...modeFields);
  return fields.filter((f) => f.modes.includes(mode));
}

export function CommunicationPreferences({
  businessMode,
  value,
  onChange,
  scenarioAnswers,
}: CommunicationPreferencesProps) {
  const showBookingMode = businessMode !== "dispatch";
  const [showAdvanced, setShowAdvanced] = useState(false);
  const availableIntakeFields = getIntakeFieldsForMode(businessMode);

  const toggleIntakeField = (key: string) => {
    const current = value.requiredIntakeFields || [];
    const updated = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key];
    onChange({ ...value, requiredIntakeFields: updated });
  };

  const updateEscalation = (updates: Partial<EscalationRules>) => {
    onChange({
      ...value,
      escalationRules: { ...value.escalationRules, ...updates },
    });
  };

  // Pre-select booking mode from discovery follow-up if answered there
  const discoveryBookingMode = scenarioAnswers?._aiBookingMode as string | undefined;
  const hasAppliedDiscovery = useRef(false);

  if (discoveryBookingMode && !hasAppliedDiscovery.current) {
    hasAppliedDiscovery.current = true;
    if (discoveryBookingMode !== value.aiBookingMode) {
      // Defer to avoid state update during render
      setTimeout(() => {
        onChange({ ...value, aiBookingMode: discoveryBookingMode as CommunicationPrefs["aiBookingMode"] });
      }, 0);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          How should your AI communicate?
        </h2>
        <p className="mt-2 text-muted-foreground">
          Choose how your AI handles bookings, missed calls, and escalations.
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
              label: "Book + Require Approval",
              description: "AI books a time slot but marks it as pending. You approve or adjust before it's final.",
            },
            {
              value: "suggest_callback",
              label: "Suggest + Callback",
              description: "AI checks availability and shares open times, then your team calls back to confirm the booking.",
            },
            {
              value: "callback_only",
              label: "Callback Only",
              description: "AI captures details only — no availability check. You call the customer back to book.",
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

      {/* AI Personality Tone */}
      <PreferenceSection
        title="AI personality tone:"
        value={value.aiTone}
        onValueChange={(v) => onChange({ ...value, aiTone: v as AITone })}
        options={[
          {
            value: "professional",
            label: "Professional",
            description: "Formal, polished, and business-like",
          },
          {
            value: "friendly",
            label: "Friendly",
            description: "Warm, approachable, and conversational",
            recommended: true,
          },
          {
            value: "casual",
            label: "Casual",
            description: "Relaxed and laid-back, like a neighbor helping out",
          },
        ]}
      />

      {/* Custom Greeting */}
      <div className="space-y-2">
        <Label htmlFor="custom-greeting">Custom greeting (optional)</Label>
        <Input
          id="custom-greeting"
          placeholder="e.g. Thanks for calling Mike's Auto! How can I help you today?"
          value={value.customGreeting}
          onChange={(e) => onChange({ ...value, customGreeting: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Leave blank to use the default greeting for your industry.
        </p>
      </div>

      {/* Advanced toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center"
      >
        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {showAdvanced ? "Hide advanced settings" : "Show advanced settings"}
      </button>

      {showAdvanced && (
        <div className="space-y-6 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {/* AI Guardrails */}
          <div className="space-y-2">
            <Label htmlFor="ai-guardrails">
              What should your AI never promise?
            </Label>
            <Textarea
              id="ai-guardrails"
              placeholder="e.g. Never guarantee same-day completion. Never quote prices under $50. Never promise warranty coverage."
              value={value.aiGuardrails || ""}
              onChange={(e) => onChange({ ...value, aiGuardrails: e.target.value })}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              These become hard rules in your AI's behavior.
            </p>
          </div>

          {/* Required intake fields */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Required info before booking</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI must collect this information before creating any booking or request.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableIntakeFields.map((field) => (
                <button
                  key={field.key}
                  type="button"
                  onClick={() => toggleIntakeField(field.key)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-colors",
                    (value.requiredIntakeFields || []).includes(field.key)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {field.label}
                </button>
              ))}
            </div>
          </div>

          {/* Escalation Rules */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">When should AI escalate to a human?</p>
            </div>
            <div className="space-y-2">
              {[
                { key: "transferOnRequest" as const, label: "Caller asks to speak to someone" },
                { key: "transferOnAnger" as const, label: "Caller sounds frustrated or angry" },
                { key: "transferOnPriceObjection" as const, label: "Caller objects to pricing" },
                { key: "transferOnComplexQuestion" as const, label: "AI can't answer the question" },
                { key: "transferOnComplaint" as const, label: "Caller has a complaint" },
              ].map(({ key, label }) => (
                <Card key={key}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm">{label}</p>
                      <Switch
                        checked={value.escalationRules?.[key] ?? DEFAULT_ESCALATION[key]}
                        onCheckedChange={(v) => updateEscalation({ [key]: v })}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <PreferenceSection
              title="If no one is available to take over:"
              value={value.escalationRules?.fallbackAction || "callback"}
              onValueChange={(v) => updateEscalation({ fallbackAction: v as EscalationRules["fallbackAction"] })}
              options={[
                { value: "callback", label: "Create Callback", description: "AI promises someone will call back" },
                { value: "voicemail", label: "Take Voicemail", description: "AI records a voicemail message" },
                { value: "text_owner", label: "Text Owner", description: "AI sends an urgent text to you" },
              ]}
            />
          </div>
        </div>
      )}
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
