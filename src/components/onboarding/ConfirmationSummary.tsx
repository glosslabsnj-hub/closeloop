import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Brain } from "lucide-react";
import { getIndustryBySlug } from "@/data/industryCatalog";
import { resolveIndustryTemplate } from "@/lib/templateResolver";
import { getQuestionsForMode } from "@/lib/scenarioQuestions";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";
import type { CommunicationPrefs } from "./CommunicationPreferences";

const modeLabels: Record<BusinessMode, string> = {
  service: "Service Business",
  dispatch: "Dispatch / On-Demand",
  food: "Food & Hospitality",
  medical: "Medical / Healthcare",
  general: "General Business",
};

const bookingModeLabels: Record<string, string> = {
  auto_book: "Auto-Book",
  pending_approval: "Require Approval",
  callback_only: "Callback Only",
};

const missedCallLabels: Record<string, string> = {
  text_only: "Text Only",
  ai_callback: "AI Callback",
  both: "Text + Callback",
};

const unknownQuestionLabels: Record<string, string> = {
  escalate: "Escalate Immediately",
  try_help: "Try to Help",
  offer_callback: "Offer Callback",
};

interface ConfirmationSummaryProps {
  businessName: string;
  businessMode: BusinessMode;
  industrySlug: string;
  scenarioAnswers: Record<string, boolean>;
  communicationPrefs: CommunicationPrefs;
}

export function ConfirmationSummary({
  businessName,
  businessMode,
  industrySlug,
  scenarioAnswers,
  communicationPrefs,
}: ConfirmationSummaryProps) {
  const industryEntry = getIndustryBySlug(industrySlug);
  const template = resolveIndustryTemplate(industrySlug);
  const industryCtx = industryEntry
    ? { slug: industrySlug, category: industryEntry.category }
    : undefined;
  const questions = getQuestionsForMode(businessMode, industryCtx);

  // Collect "yes" answers with their labels
  const enabledCapabilities = questions.filter(
    (q) => scenarioAnswers[q.capabilityKey]
  );

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

      {/* Identity */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Business</p>
          <p className="text-lg font-semibold">{businessName}</p>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{modeLabels[businessMode]}</Badge>
            {industryEntry && (
              <Badge variant="outline">
                {industryEntry.icon} {industryEntry.name}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Capabilities */}
      {enabledCapabilities.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Capabilities</p>
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

      {/* Communication */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">AI Behavior</p>
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
              <span className="text-muted-foreground">Unknown questions</span>
              <span className="font-medium">{unknownQuestionLabels[communicationPrefs.unknownQuestionBehavior]}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template preview */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Template</p>
          <p className="text-sm">
            We'll pre-load <strong>{template.services.length} services</strong>,{" "}
            <strong>{template.faqs.length} FAQs</strong> from the{" "}
            <strong>{template.label}</strong> template.
          </p>
        </CardContent>
      </Card>

      {/* Next steps */}
      <div className="p-4 rounded-lg border bg-primary/5">
        <div className="flex items-start gap-3">
          <Brain className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">What's next?</p>
            <p className="text-[13px] text-muted-foreground mt-1">
              After setup, head to the <strong>Business Brain</strong> to add
              your hours, phone number, and customize your services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
