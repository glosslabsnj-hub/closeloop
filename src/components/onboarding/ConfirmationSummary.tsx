import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Brain, Pencil, Users } from "lucide-react";
import { getIndustryBySlug } from "@/data/industryCatalog";
import { getQuestionsForMode } from "@/lib/scenarioQuestions";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";
import type { CommunicationPrefs } from "./CommunicationPreferences";
import type { SchedulingPrefs } from "./SchedulingSetup";
import type { EditableService } from "./ServicePreviewStep";
import type { TeamMember } from "./TeamSetupStep";

const modeLabels: Record<BusinessMode, string> = {
  service: "Service Business",
  dispatch: "Dispatch / On-Demand",
  food: "Food & Hospitality",
  medical: "Medical / Healthcare",
  general: "General Business",
  sales: "Sales Business",
};

const bookingModeLabels: Record<string, string> = {
  auto_book: "Auto-Book",
  pending_approval: "Book + Require Approval",
  suggest_callback: "Suggest + Callback",
  callback_only: "Callback Only",
};

const missedCallLabels: Record<string, string> = {
  text_only: "Text Only",
  ai_callback: "AI Callback",
  both: "Text + Callback",
};

const toneLabels: Record<string, string> = {
  professional: "Professional",
  friendly: "Friendly",
  casual: "Casual",
};

interface ConfirmationSummaryProps {
  businessName: string;
  businessMode: BusinessMode;
  industrySlug: string;
  scenarioAnswers: Record<string, boolean>;
  communicationPrefs: CommunicationPrefs;
  schedulingPrefs?: SchedulingPrefs;
  templateServices?: EditableService[];
  teamMembers?: TeamMember[];
  isSoloOperator?: boolean;
  onEditStep: (stepIndex: number) => void;
}

export function ConfirmationSummary({
  businessName,
  businessMode,
  industrySlug,
  scenarioAnswers,
  communicationPrefs,
  schedulingPrefs,
  templateServices,
  teamMembers = [],
  isSoloOperator = true,
  onEditStep,
}: ConfirmationSummaryProps) {
  const industryEntry = getIndustryBySlug(industrySlug);
  const industryCtx = industryEntry
    ? { slug: industrySlug, category: industryEntry.category }
    : undefined;
  const questions = getQuestionsForMode(businessMode, industryCtx);

  // Collect "yes" answers with their labels
  const enabledCapabilities = questions.filter(
    (q) => scenarioAnswers[q.capabilityKey]
  );

  const enabledServiceCount = templateServices?.filter(s => s.enabled).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Ready to launch
        </h2>
        <p className="mt-2 text-muted-foreground">
          Review your setup before we create your AI receptionist.
        </p>
      </div>

      {/* Card 1: Your Business */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Your Business</p>
            <button
              type="button"
              onClick={() => onEditStep(1)}
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Edit business info"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-lg font-semibold">{businessName}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{modeLabels[businessMode]}</Badge>
            {industryEntry && (
              <Badge variant="outline">
                {industryEntry.icon} {industryEntry.name}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Capabilities */}
      {enabledCapabilities.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Capabilities</p>
              <button
                type="button"
                onClick={() => onEditStep(2)}
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Edit capabilities"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {enabledCapabilities.map((q) => (
                <Badge key={q.id} variant="default" className="gap-1">
                  <Check className="h-3 w-3" />
                  {q.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card 3: Your Offerings & Schedule */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Offerings & Schedule</p>
            <button
              type="button"
              onClick={() => onEditStep(3)}
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Edit offerings and schedule"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1 text-sm">
            {enabledServiceCount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Services</span>
                <span className="font-medium">{enabledServiceCount} configured</span>
              </div>
            )}
            {schedulingPrefs && (
              <>
                {schedulingPrefs.is24x7 ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hours</span>
                    <span className="font-medium">24/7</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Same-day booking</span>
                    <span className="font-medium">{schedulingPrefs.sameDayBooking ? "Yes" : "No"}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Team */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Your Team</p>
            <button
              type="button"
              onClick={() => onEditStep(5)}
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Edit team"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {isSoloOperator
                ? "Solo operator"
                : teamMembers.filter((m) => m.name.trim()).length > 0
                  ? `${teamMembers.filter((m) => m.name.trim()).length} team member${teamMembers.filter((m) => m.name.trim()).length !== 1 ? "s" : ""}`
                  : "Has a team · add members in Business Brain"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Card 5: AI Behavior */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">AI Behavior</p>
            <button
              type="button"
              onClick={() => onEditStep(6)}
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Edit AI behavior"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1 text-sm">
            {businessMode !== "dispatch" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Booking mode</span>
                <span className="font-medium">{bookingModeLabels[communicationPrefs.aiBookingMode]}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Missed calls</span>
              <span className="font-medium">{missedCallLabels[communicationPrefs.missedCallBehavior]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">AI tone</span>
              <span className="font-medium">{toneLabels[communicationPrefs.aiTone]}</span>
            </div>
            {communicationPrefs.customGreeting && (
              <div className="col-span-1 mt-2 p-2 bg-muted/50 rounded text-xs">
                <span className="text-muted-foreground block mb-0.5">Custom greeting:</span>
                <span className="italic">"{communicationPrefs.customGreeting}"</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Next steps */}
      <div className="p-4 rounded-lg border bg-primary/5">
        <div className="flex items-start gap-3">
          <Brain className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">What's next?</p>
            <p className="text-[13px] text-muted-foreground mt-1">
              Everything here can be fine-tuned later in your <strong>Business Brain</strong>.
              Head there to add your phone number and make adjustments anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
