/**
 * GuidedSetupFlow - Step-by-step guided setup inside Business Brain
 *
 * Replaces the overwhelming 95+ editor Brain dashboard with a linear,
 * one-section-at-a-time wizard for new users. Driven by P0/P1 flags
 * from useAIReadinessV2. Each step renders an EXISTING editor component
 * via BrainEditorRenderer, wrapped in guided context.
 *
 * "Switch to full Brain" link always available for power users.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, SkipForward,
  LayoutGrid, PartyPopper, Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useFoodMode } from "@/hooks/useFoodMode";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import { BrainEditorRenderer } from "@/components/brain/layout/BrainEditorRenderer";
import {
  getGuidedSetupSteps,
  computeStepProgress,
  type GuidedSetupStep,
} from "@/config/guidedSetupSteps";

interface GuidedSetupFlowProps {
  onSwitchToFullBrain: () => void;
}

export function GuidedSetupFlow({ onSwitchToFullBrain }: GuidedSetupFlowProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { businessMode } = useTenantConfig();
  const caps = useCapabilities();
  const { isFoodMode } = useFoodMode();
  const isDispatchMode = caps.isDispatchBusiness;
  const { score, p0Flags, p1Flags, canGoLive, loading: readinessLoading, refetch } = useAIReadinessV2();

  // Get all steps for this mode
  const allSteps = useMemo(
    () => getGuidedSetupSteps(businessMode),
    [businessMode],
  );

  // Compute which steps are complete based on active flags
  const allFlags = useMemo(() => [...p0Flags, ...p1Flags], [p0Flags, p1Flags]);
  const flagSet = useMemo(() => new Set(allFlags), [allFlags]);

  const stepsWithStatus = useMemo(() => {
    return allSteps.map((step) => {
      const isComplete = step.resolvesFlagKeys.length === 0
        ? false // Optional steps with no flags default to "not complete" (skippable)
        : step.resolvesFlagKeys.every((fk) => !flagSet.has(fk));
      return { ...step, isComplete };
    });
  }, [allSteps, flagSet]);

  const progress = useMemo(
    () => computeStepProgress(businessMode, allFlags),
    [businessMode, allFlags],
  );

  // Current step index
  const stepParam = searchParams.get("step");
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(() => {
    if (stepParam) {
      const idx = stepsWithStatus.findIndex((s) => s.id === stepParam);
      if (idx >= 0) return idx;
    }
    // Default to first incomplete step
    const firstIncomplete = stepsWithStatus.findIndex((s) => !s.isComplete);
    return firstIncomplete >= 0 ? firstIncomplete : 0;
  });

  // Update URL when step changes
  useEffect(() => {
    const step = stepsWithStatus[currentStepIndex];
    if (step) {
      setSearchParams({ mode: "setup", step: step.id }, { replace: true });
    }
  }, [currentStepIndex, stepsWithStatus, setSearchParams]);

  const currentStep = stepsWithStatus[currentStepIndex];
  const isLastStep = currentStepIndex === stepsWithStatus.length - 1;
  const isFirstStep = currentStepIndex === 0;

  // Navigation
  const goNext = useCallback(() => {
    // Refetch readiness after moving forward (user likely saved something)
    refetch();
    if (isLastStep) return;
    setCurrentStepIndex((i) => Math.min(i + 1, stepsWithStatus.length - 1));
  }, [isLastStep, stepsWithStatus.length, refetch]);

  const goPrev = useCallback(() => {
    if (isFirstStep) return;
    setCurrentStepIndex((i) => Math.max(i - 1, 0));
  }, [isFirstStep]);

  const goToStep = useCallback((index: number) => {
    setCurrentStepIndex(index);
  }, []);

  // Check if setup is complete — only trust flags when readiness data is loaded.
  // While loading, p0Flags/p1Flags are empty which makes all steps appear "complete".
  const allRequiredDone = !readinessLoading && canGoLive;

  if (readinessLoading || !currentStep) return null;

  // ─── Celebration view ────────────────────────────────────────────────────
  if (allRequiredDone) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-6"
        >
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mx-auto">
            <PartyPopper className="h-10 w-10 text-emerald-600" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold">You're ready to go live!</h1>
            <p className="text-muted-foreground text-lg">
              Your AI has everything it needs to start answering calls. You can always come back to fine-tune things later.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-muted-foreground">
              AI Readiness: <strong className="text-foreground">{score}%</strong>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button
              size="lg"
              className="gap-2"
              onClick={() => navigate("/app/dashboard")}
            >
              <Rocket className="h-5 w-5" />
              Go to Dashboard
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={onSwitchToFullBrain}
            >
              <LayoutGrid className="h-5 w-5" />
              Fine-tune in Full Brain
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Guided flow view ────────────────────────────────────────────────────

  const progressPercent = progress.totalSteps > 0
    ? Math.round((progress.completedSteps / progress.totalSteps) * 100)
    : 0;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* ── Header with progress ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Set Up Your AI</h1>
            <p className="text-sm text-muted-foreground">
              Step {currentStepIndex + 1} of {stepsWithStatus.length}
              {" "}— {progress.completedSteps} of {progress.totalSteps} items complete
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={onSwitchToFullBrain}
          >
            <LayoutGrid className="h-4 w-4" />
            Full Brain
          </Button>
        </div>

        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* ── Step pills ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {stepsWithStatus.map((step, index) => {
          const Icon = step.icon;
          const isCurrent = index === currentStepIndex;

          return (
            <button
              key={step.id}
              onClick={() => goToStep(index)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                step.isComplete
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : isCurrent
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {step.isComplete ? (
                <Check className="h-3 w-3" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">{step.title.split(" ").slice(0, 3).join(" ")}</span>
              <span className="sm:hidden">{index + 1}</span>
            </button>
          );
        })}
      </div>

      {/* ── Current step content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Context card */}
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
                  currentStep.isComplete
                    ? "bg-emerald-100 dark:bg-emerald-900/30"
                    : "bg-primary/10",
                )}>
                  {currentStep.isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <currentStep.icon className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{currentStep.title}</h2>
                    {currentStep.isComplete && (
                      <Badge variant="default" className="bg-emerald-600 text-xs">
                        Complete
                      </Badge>
                    )}
                    {currentStep.skippable && !currentStep.isComplete && (
                      <Badge variant="outline" className="text-xs">
                        Optional
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{currentStep.why}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Editor component (reused from Brain) */}
          <div className="min-h-[400px]">
            <BrainEditorRenderer
              itemId={currentStep.editorItemId}
              businessMode={businessMode}
              caps={caps}
              isFoodMode={isFoodMode}
              isDispatchMode={isDispatchMode}
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Navigation buttons ── */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={isFirstStep}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {currentStep.skippable && !currentStep.isComplete && (
            <Button
              variant="ghost"
              onClick={goNext}
              className="gap-1 text-muted-foreground"
            >
              <SkipForward className="h-4 w-4" />
              Skip for now
            </Button>
          )}

          <Button
            onClick={goNext}
            disabled={isLastStep && !currentStep.isComplete}
            className="gap-2"
          >
            {isLastStep ? (
              <>
                Finish Setup
                <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
