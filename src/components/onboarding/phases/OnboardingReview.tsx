import React, { useMemo } from "react";
/**
 * Phase 5: GO LIVE — Review setup + connect tools + launch
 * Merged with former Phase 6 (Connect) for a streamlined 5-phase flow.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Check, Pencil, Sparkles, Rocket, AlertTriangle, X, Calendar, MessageSquare, ArrowRight, HelpCircle, Bot, Phone } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getIndustryBySlug } from "@/data/industryCatalog";
import { getIndustryTerminology, getBookingActionPhrase, getAutoBookSummary, getReadinessVerb } from "@/data/industryTerminology";
import { estimateOnboardingReadiness, type ReadinessFlag } from "@/lib/estimateOnboardingReadiness";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";
import type { EditableService } from "@/components/onboarding/ServicePreviewStep";
import type { EditableFAQ } from "@/components/onboarding/FAQPreviewStep";
import type { EditablePolicies } from "@/components/onboarding/PolicyPreviewStep";
import type { BusinessHours } from "@/components/onboarding/BusinessHoursEditor";
import type { AITone, AIBookingMode } from "@/components/onboarding/CommunicationPreferences";
import type { AfterHoursBehavior } from "./OnboardingAI";
import type { WorkStyle } from "./OnboardingIdentity";

const modeLabels: Record<BusinessMode, string> = {
  service: "Service Business",
  dispatch: "Dispatch / On-Demand",
  food: "Food & Hospitality",
  medical: "Medical / Healthcare",
  general: "General Business",
  sales: "Sales Business",
};

const toneLabels: Record<AITone, string> = {
  professional: "Professional",
  friendly: "Friendly",
  casual: "Casual",
};

function getBookingCheckLabel(mode: AIBookingMode, appointmentLabel: string): string {
  const label = appointmentLabel;
  const labelPlural = label.endsWith("s") ? label : label + "s";
  switch (mode) {
    case "auto_book": return `AI ${labelPlural} automatically`;
    case "pending_approval": return `AI books, you approve before confirming`;
    case "suggest_callback": return `AI suggests a time, you call back to confirm`;
    case "callback_only": return `AI collects info, you call back to book`;
  }
}

const afterHoursLabels: Record<AfterHoursBehavior, string> = {
  ai_24_7: "24/7 AI answering",
  voicemail: "Voicemail",
  text_back: "Text back with hours",
};

interface OnboardingReviewProps {
  businessName: string;
  businessAddress: string;
  businessMode: BusinessMode;
  industrySlug: string;
  services: EditableService[];
  templateFAQs: EditableFAQ[];
  templatePolicies: EditablePolicies;
  businessHours: BusinessHours;
  aiTone: AITone;
  bookingMode: AIBookingMode;
  afterHours: AfterHoursBehavior;
  is24x7: boolean;
  workStyle: WorkStyle;
  serviceAreaRadius?: number;
  scenarioAnswers: Record<string, boolean>;
  customGreeting: string;
  notificationPhone: string;
  onNotificationPhoneChange: (phone: string) => void;
  calendarConnected: boolean;
  onConnectCalendar: () => void;
  onEditPhase: (phase: number) => void;
  onGoLive: () => void;
  loading: boolean;
}

// ─── AI Knowledge Preview Component ────────────────────────────────────────

interface AIKnowledgePreviewProps {
  businessName: string;
  businessMode: BusinessMode;
  services: EditableService[];
  aiTone: AITone;
  afterHours: AfterHoursBehavior;
  is24x7: boolean;
  bookingMode: AIBookingMode;
  customGreeting: string;
  serviceAreaRadius?: number;
  workStyle: WorkStyle;
  industrySlug?: string;
}

const greetingByTone: Record<AITone, string> = {
  professional: "Thank you for calling {name}. How may I assist you today?",
  friendly: "Hi there! Thanks for calling {name}. How can I help you today?",
  casual: "Hey! You've reached {name}. What can I do for you?",
};

const afterHoursSummary: Record<AfterHoursBehavior, string> = {
  ai_24_7: "answer calls 24/7",
  voicemail: "take a voicemail and you'll follow up",
  text_back: "send callers your business hours by text",
};

function getBookingSummary(mode: AIBookingMode, appointmentLabel: string): string {
  switch (mode) {
    case "auto_book": return getAutoBookSummary(appointmentLabel);
    case "pending_approval": return "collect details and wait for your approval";
    case "suggest_callback": return "suggest a time and you'll confirm";
    case "callback_only": return "collect info and you'll call back to confirm";
  }
}

function AIKnowledgePreview({
  businessName,
  businessMode,
  services,
  aiTone,
  afterHours,
  is24x7,
  bookingMode,
  customGreeting,
  serviceAreaRadius,
  workStyle,
  industrySlug,
}: AIKnowledgePreviewProps) {
  const greeting = customGreeting || greetingByTone[aiTone].replace("{name}", businessName || "your business");
  const serviceNames = services.slice(0, 8).map(s => s.name).filter(Boolean);
  const moreServices = services.length > 8 ? ` +${services.length - 8} more` : "";
  const industryEntry = industrySlug ? getIndustryBySlug(industrySlug) : undefined;
  const terms = getIndustryTerminology(businessMode, industryEntry?.category, industrySlug);
  const appointmentLabel = terms.appointmentLabel;

  const knowledgeBits: { icon: React.ReactNode; text: string }[] = [
    {
      icon: <Phone className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />,
      text: `Greeting: "${greeting}"`,
    },
  ];

  if (serviceNames.length > 0) {
    knowledgeBits.push({
      icon: <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />,
      text: `Offers: ${serviceNames.join(", ")}${moreServices}`,
    });
  }

  if (businessMode !== "dispatch" && businessMode !== "food") {
    knowledgeBits.push({
      icon: <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />,
      text: `When someone wants to ${getBookingActionPhrase(appointmentLabel)}: will ${getBookingSummary(bookingMode, appointmentLabel)}`,
    });
  }

  if (!is24x7) {
    knowledgeBits.push({
      icon: <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />,
      text: `After hours: will ${afterHoursSummary[afterHours]}`,
    });
  } else {
    knowledgeBits.push({
      icon: <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />,
      text: "Available 24/7 — answers calls at any hour",
    });
  }

  if ((workStyle === "go_to_customer" || workStyle === "both") && serviceAreaRadius) {
    knowledgeBits.push({
      icon: <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />,
      text: `Covers a ${serviceAreaRadius}-mile service area`,
    });
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-primary">Here's what your AI already knows</p>
        </div>
        <div className="space-y-2">
          {knowledgeBits.map((bit, idx) => (
            <div key={idx} className="flex items-start gap-2">
              {bit.icon}
              <p className="text-sm text-foreground/80 leading-snug">{bit.text}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground pt-1">
          Fine-tune anything from your Business Brain after launch.
        </p>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────

export const OnboardingReview = React.memo(function OnboardingReview({
  businessName,
  businessAddress,
  businessMode,
  industrySlug,
  services,
  templateFAQs,
  templatePolicies,
  businessHours,
  aiTone,
  bookingMode,
  afterHours,
  is24x7,
  workStyle,
  serviceAreaRadius,
  scenarioAnswers,
  customGreeting,
  notificationPhone,
  onNotificationPhoneChange,
  calendarConnected,
  onConnectCalendar,
  onEditPhase,
  onGoLive,
  loading,
}: OnboardingReviewProps) {
  const industryEntry = getIndustryBySlug(industrySlug);
  const terms = getIndustryTerminology(businessMode, industryEntry?.category, industrySlug);
  const enabledServices = services.filter((s) => s.enabled);

  // Calculate real readiness score
  const readinessResult = useMemo(
    () =>
      estimateOnboardingReadiness({
        businessName,
        businessAddress,
        businessMode,
        services,
        templateFAQs,
        templatePolicies,
        businessHours,
        is24x7,
        scenarioAnswers,
        customGreeting,
        workStyle,
        serviceAreaRadius,
      }),
    [businessName, businessAddress, businessMode, services, templateFAQs, templatePolicies, businessHours, is24x7, scenarioAnswers, customGreeting, workStyle, serviceAreaRadius]
  );

  const { score: readiness, p0Flags, p1Flags } = readinessResult;

  // Summary items for the checklist
  const checks = [
    { label: `${enabledServices.length} services configured`, done: enabledServices.length > 0 },
    { label: is24x7 ? "24/7 answering" : "Business hours set", done: true },
    { label: `${toneLabels[aiTone]} AI tone`, done: true },
    { label: getBookingCheckLabel(bookingMode, terms.appointmentLabel), done: true },
    { label: afterHoursLabels[afterHours], done: true },
  ];

  if ((workStyle === "go_to_customer" || workStyle === "both") && serviceAreaRadius) {
    checks.push({ label: `${serviceAreaRadius} mile service area`, done: true });
  }

  // Score color
  const scoreColor = readiness >= 85 ? "text-emerald-600" : readiness >= 60 ? "text-amber-600" : "text-red-600";
  const progressColor = readiness >= 85 ? "[&>div]:bg-emerald-500" : readiness >= 60 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {readiness >= 85
            ? `${businessName} is ready to go live!`
            : `Almost there, ${businessName}!`}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {readiness >= 85
            ? "Review your setup below, then launch your AI receptionist."
            : "Review your setup and fix any remaining items before launching."}
        </p>
      </div>

      {/* Business Summary Card */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {industryEntry && <span className="text-2xl">{industryEntry.icon}</span>}
              <div>
                <p className="text-lg font-semibold">{businessName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary">{modeLabels[businessMode]}</Badge>
                  {industryEntry && (
                    <Badge variant="outline" className="text-xs">{industryEntry.name}</Badge>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onEditPhase(1)}
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Edit identity"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* AI Knowledge Preview — "Here's what your AI knows" */}
      <AIKnowledgePreview
        businessName={businessName}
        businessMode={businessMode}
        services={enabledServices}
        aiTone={aiTone}
        afterHours={afterHours}
        is24x7={is24x7}
        bookingMode={bookingMode}
        customGreeting={customGreeting}
        serviceAreaRadius={serviceAreaRadius}
        workStyle={workStyle}
        industrySlug={industrySlug}
      />

      {/* Setup Checklist */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Setup Summary</p>
            <button
              type="button"
              onClick={() => onEditPhase(2)}
              className="text-muted-foreground hover:text-primary transition-colors text-xs"
            >
              Edit
            </button>
          </div>
          <div className="space-y-2">
            {checks.map((check, idx) => (
              <div key={idx} className="flex items-center gap-2.5">
                <div className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full shrink-0",
                  check.done ? "bg-primary/10" : "bg-muted"
                )}>
                  <Check className={cn(
                    "h-3 w-3",
                    check.done ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <span className="text-sm">{check.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* P0 Flags — Fix before going live */}
      {p0Flags.length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Fix before going live</p>
            </div>
            <div className="space-y-2">
              {p0Flags.map((flag) => (
                <div key={flag.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <X className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-sm">{flag.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditPhase(flag.phase)}
                    className="text-xs text-primary hover:underline"
                  >
                    Fix
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* P1 Flags — Recommended */}
      {p1Flags.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Recommended</p>
            </div>
            <div className="space-y-2">
              {p1Flags.map((flag) => (
                <div key={flag.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-sm">{flag.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditPhase(flag.phase)}
                    className="text-xs text-primary hover:underline"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Readiness Score */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">AI Readiness</p>
            </div>
            <Badge variant={readiness >= 85 ? "default" : readiness >= 60 ? "secondary" : "destructive"} className="text-xs">
              {readiness >= 85 ? "Ready to launch" : readiness >= 60 ? "Almost ready" : "Needs setup"}
            </Badge>
          </div>
          <Progress value={readiness} className={cn("h-2", progressColor)} />
          <div className="text-xs text-muted-foreground space-y-1">
            {readiness >= 85 ? (
              <p>Your AI can answer calls, {getReadinessVerb(terms.appointmentLabel)}, quote prices, and handle common questions.</p>
            ) : readiness >= 60 ? (
              <>
                <p>Your AI can handle most calls. To make it even better:</p>
                {p1Flags.length > 0 && (
                  <p className="text-foreground/70">Add {p1Flags.map(f => f.label.toLowerCase().replace(/^add /, "").replace(/^customize /, "")).slice(0, 2).join(" and ")} from your Business Brain after launch.</p>
                )}
              </>
            ) : (
              <p>Your AI needs a bit more info to handle calls well. Fix the items above to improve.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Connect Tools (merged from former Phase 6) */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Optional — connect now or later</p>

        {/* Calendar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Google Calendar</p>
                  <p className="text-xs text-muted-foreground">For live availability checking</p>
                </div>
              </div>
              <Button
                variant={calendarConnected ? "secondary" : "outline"}
                size="sm"
                onClick={onConnectCalendar}
                disabled={calendarConnected}
                className="gap-1.5"
              >
                {calendarConnected ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Connected
                  </>
                ) : (
                  <>
                    Connect
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SMS Notifications */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium">SMS Alerts</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-[200px]">Get a text when your AI handles a call or captures a lead.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground">Get notified for new bookings</p>
              </div>
            </div>
            <Input
              placeholder="(555) 123-4567"
              value={notificationPhone}
              onChange={(e) => onNotificationPhoneChange(e.target.value)}
              className="h-9 text-sm"
            />
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 pt-2">
        <Button
          size="lg"
          onClick={onGoLive}
          disabled={loading || p0Flags.length > 0}
          className="w-full gap-2"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Setting up {businessName}...
            </>
          ) : p0Flags.length > 0 ? (
            <>
              <AlertTriangle className="h-4 w-4" />
              Fix {p0Flags.length} {p0Flags.length === 1 ? "issue" : "issues"} to go live
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4" />
              Launch {businessName}
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          You'll get a phone number and can make a test call right after launch. Everything can be fine-tuned later in your{" "}
          <span className="font-medium text-foreground">Business Brain</span>.
        </p>
      </div>
    </div>
  );
});
