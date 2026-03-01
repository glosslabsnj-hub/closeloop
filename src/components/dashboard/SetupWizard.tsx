import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Phone, Brain, Power, Check, ChevronDown, ChevronRight, CheckCircle2, Zap, Globe, Search } from "lucide-react";
import { PhoneConnectionStep } from "./PhoneConnectionStep";
import { ConfigureAIStep } from "./ConfigureAIStep";
import { GoLiveStep } from "./GoLiveStep";
import { WelcomeBanner } from "./WelcomeBanner";
import { ReadinessRing } from "./ReadinessRing";
import { TestCallCard } from "./TestCallCard";
import { SmartChecklist } from "./SmartChecklist";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { type IndustryCatalogEntry } from "@/data/industryCatalog";
import { WebsiteImportWizard } from "@/components/brain/uploads/WebsiteImportWizard";

interface SetupWizardProps {
  onSetupComplete: () => void;
}

type SetupStep = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  isComplete: boolean;
};

export function SetupWizard({ onSetupComplete }: SetupWizardProps) {
  const { tenant, assistantSettings } = useAuth();
  const { score, p0Flags, canGoLive: _aiReady, stepProgress } = useAIReadinessV2();
  const { _businessMode } = useTenantConfig();
  const { terms } = useIndustryContext();
  const [quickStartQuery, setQuickStartQuery] = useState("");
  const [websiteImportOpen, setWebsiteImportOpen] = useState(false);
  const [quickStartDismissed, setQuickStartDismissed] = useState(false);

  // Determine completion status from assistant_settings.
  // A provisioned Twilio number (closeloop_number / forwarding_phone_e164) counts as connected —
  // onboarding provisions it in Step 15, so most users arrive here with a number already.
  const phoneComplete =
    assistantSettings?.setup_step_phone ||
    assistantSettings?.phone_connected ||
    !!(assistantSettings?.closeloop_number || assistantSettings?.forwarding_phone_e164) ||
    false;
  const aiKnowledgeComplete = score >= 85 && p0Flags.length === 0;
  const goLiveComplete = assistantSettings?.go_live_enabled || false;

  // Business info is auto-complete from onboarding
  const businessInfoComplete = !!(tenant?.name && tenant?.timezone);

  const steps: SetupStep[] = useMemo(() => [
    {
      id: "business-info",
      title: "Business Info",
      subtitle: businessInfoComplete ? `${tenant?.name}` : "Complete your profile",
      icon: CheckCircle2,
      isComplete: businessInfoComplete,
    },
    {
      id: "phone",
      title: "Connect Phone",
      subtitle: phoneComplete ? "Phone connected" : "Get your AI phone number",
      icon: Phone,
      isComplete: phoneComplete,
    },
    {
      id: "ai-knowledge",
      title: "Configure AI",
      subtitle: aiKnowledgeComplete
        ? "AI knowledge ready"
        : `${stepProgress.completedSteps} of ${stepProgress.totalSteps} items complete`,
      icon: Brain,
      isComplete: aiKnowledgeComplete,
    },
    {
      id: "golive",
      title: "Go Live",
      subtitle: goLiveComplete ? "Your AI is live!" : `Start handling ${terms.bookings}`,
      icon: Power,
      isComplete: goLiveComplete,
    },
  ], [businessInfoComplete, phoneComplete, aiKnowledgeComplete, goLiveComplete, tenant, stepProgress]);

  // Find first incomplete step (skip business-info since it's auto-done)
  const firstIncompleteIndex = useMemo(() => {
    const idx = steps.findIndex(s => !s.isComplete);
    return idx === -1 ? steps.length - 1 : idx;
  }, [steps]);

  // Track which step is expanded
  const [expandedStep, setExpandedStep] = useState<number>(firstIncompleteIndex);
  const [userSelected, setUserSelected] = useState(false);

  // Auto-advance when a step completes
  useEffect(() => {
    if (!userSelected) {
      setExpandedStep(firstIncompleteIndex);
    }
  }, [firstIncompleteIndex, userSelected]);

  const completedCount = steps.filter(s => s.isComplete).length;
  const progress = (completedCount / steps.length) * 100;

  const handleStepComplete = (stepIndex: number) => {
    setUserSelected(false);
    if (stepIndex < steps.length - 1) {
      setExpandedStep(stepIndex + 1);
    } else {
      onSetupComplete();
    }
  };

  const toggleStep = (index: number) => {
    setUserSelected(true);
    setExpandedStep(expandedStep === index ? -1 : index);
  };

  // For Go Live, need phone connected + AI knowledge ready
  const canActivateGoLive = phoneComplete && aiKnowledgeComplete;

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-6">
      {/* Welcome Banner — replaces generic header */}
      <WelcomeBanner />

      {/* Quick Start — shown when AI knowledge is low */}
      {score < 50 && !quickStartDismissed && (
        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Quick Start</h3>
              <p className="text-xs text-muted-foreground">Import your business data in seconds</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Website Import */}
            <button
              onClick={() => setWebsiteImportOpen(true)}
              className="flex items-center gap-3 rounded-lg border bg-card p-3 text-left hover:border-primary/40 transition-colors"
            >
              <Globe className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">Import from Website</p>
                <p className="text-xs text-muted-foreground">Scan your site for services & FAQs</p>
              </div>
            </button>

            {/* Industry Template */}
            <Link
              to="/app/business-brain?section=about"
              className="flex items-center gap-3 rounded-lg border bg-card p-3 text-left hover:border-primary/40 transition-colors"
            >
              <Search className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">Pick Your Industry</p>
                <p className="text-xs text-muted-foreground">Auto-fill from 100+ templates</p>
              </div>
            </Link>
          </div>

          <button
            onClick={() => setQuickStartDismissed(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip — I'll set up manually
          </button>
        </div>
      )}

      <WebsiteImportWizard open={websiteImportOpen} onOpenChange={setWebsiteImportOpen} />

      {/* Readiness Ring + Progress */}
      <div className="flex items-center gap-6 justify-center">
        <ReadinessRing score={score} size={100} strokeWidth={7} />
        <div className="space-y-2 text-left">
          <p className="text-sm font-medium">
            {completedCount === steps.length
              ? "You're all set!"
              : `${completedCount} of ${steps.length} steps complete`
            }
          </p>
          <Progress value={progress} className="h-2 w-40" />
          {score < 85 && (
            <p className="text-xs text-muted-foreground">
              Need 85% readiness to go live
            </p>
          )}
        </div>
      </div>

      {/* Test Call CTA — show after phone is connected */}
      {phoneComplete && <TestCallCard variant="full" />}

      {/* Accordion Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isExpanded = expandedStep === index;

          return (
            <div
              key={step.id}
              className={`rounded-lg border transition-all ${
                step.isComplete
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : isExpanded
                    ? "border-primary/30 bg-card shadow-sm"
                    : "border-border bg-card"
              }`}
            >
              {/* Step header - always visible */}
              <button
                onClick={() => toggleStep(index)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
                  step.isComplete
                    ? "bg-emerald-100 dark:bg-emerald-900/30"
                    : isExpanded
                      ? "bg-primary/10"
                      : "bg-muted"
                }`}>
                  {step.isComplete ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{step.title}</p>
                    {step.isComplete && (
                      <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600">
                        Done
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{step.subtitle}</p>
                </div>
                {!step.isComplete && (
                  isExpanded
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {/* Step content - expanded only */}
              {isExpanded && !step.isComplete && (
                <div className="px-4 pb-4">
                  {step.id === "business-info" && (
                    <p className="text-sm text-muted-foreground">
                      Business info was set up during onboarding. You can edit it in{" "}
                      <a href="/app/business-brain?section=about" className="text-primary underline">Business Brain</a>.
                    </p>
                  )}
                  {step.id === "phone" && (
                    <PhoneConnectionStep
                      onComplete={() => handleStepComplete(index)}
                      isComplete={phoneComplete}
                    />
                  )}
                  {step.id === "ai-knowledge" && (
                    <ConfigureAIStep
                      onComplete={() => handleStepComplete(index)}
                      isComplete={aiKnowledgeComplete}
                    />
                  )}
                  {step.id === "golive" && (
                    <GoLiveStep
                      onComplete={() => handleStepComplete(index)}
                      isComplete={goLiveComplete}
                      canActivate={canActivateGoLive}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Smart Checklist — contextual next steps */}
      <SmartChecklist />

      {/* Business Name footer */}
      <div className="text-center pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          Setting up AI for <span className="font-medium text-foreground">{tenant?.name || "your business"}</span>
        </p>
      </div>
    </div>
  );
}
