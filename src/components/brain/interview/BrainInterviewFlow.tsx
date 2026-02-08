/**
 * BrainInterviewFlow - Orchestrates the multi-step interview
 * 
 * The main interview experience that guides business owners through
 * setting up their Business Brain with scenario-based questions.
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  ArrowRight, 
  SkipForward, 
  Check, 
  Brain,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useInterviewState, type InterviewAnswers } from "@/hooks/useInterviewState";
import { InterviewStep } from "./InterviewStep";
import { estimateInterviewDuration } from "./interviewQuestions";
import type { BusinessMode } from "@/hooks/useTenantConfig";
import { getModeTheme, getModeDisplayName } from "../layout/ModeTheme";

interface BrainInterviewFlowProps {
  mode: BusinessMode;
  onComplete: (answers: InterviewAnswers) => void;
  onSkip?: () => void;
  initialAnswers?: InterviewAnswers;
}

export function BrainInterviewFlow({ 
  mode, 
  onComplete, 
  onSkip,
  initialAnswers,
}: BrainInterviewFlowProps) {
  const [showWelcome, setShowWelcome] = useState(true);

  const interview = useInterviewState({
    mode,
    initialAnswers,
    onComplete,
  });

  const theme = getModeTheme(mode);
  const estimatedMinutes = estimateInterviewDuration(mode);

  const handleStartInterview = useCallback(() => {
    setShowWelcome(false);
  }, []);

  if (showWelcome) {
    return (
      <WelcomeScreen
        mode={mode}
        estimatedMinutes={estimatedMinutes}
        totalSteps={interview.steps.length}
        onStart={handleStartInterview}
        onSkip={onSkip}
        theme={theme}
      />
    );
  }

  if (interview.isComplete) {
    return (
      <CompletionScreen
        mode={mode}
        skippedSteps={interview.skippedSteps}
        onContinue={() => onComplete(interview.answers)}
        theme={theme}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div 
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${theme.accent}20` }}
            >
              <Brain className="h-4 w-4" style={{ color: theme.accent }} />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              Step {interview.progress.current} of {interview.progress.total}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={interview.skipStep}
            className="text-muted-foreground hover:text-foreground"
          >
            <SkipForward className="h-4 w-4 mr-1" />
            Skip for now
          </Button>
        </div>
        <Progress 
          value={(interview.progress.current / interview.progress.total) * 100} 
          className="h-2"
        />
      </div>

      {/* Step Header */}
      <AnimatePresence mode="wait">
        <motion.div
          key={interview.currentStep?.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold mb-2">
            {interview.currentStep?.title}
          </h2>
          <p className="text-muted-foreground">
            {interview.currentStep?.description}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Questions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={interview.currentStep?.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <InterviewStep
            questions={interview.visibleQuestions}
            answers={interview.answers}
            onAnswer={interview.setAnswer}
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t">
        <Button
          variant="ghost"
          onClick={interview.previousStep}
          disabled={interview.isFirstStep}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Button
          onClick={interview.nextStep}
          disabled={!interview.isCurrentStepComplete()}
          style={{ 
            backgroundColor: interview.isCurrentStepComplete() ? theme.accent : undefined 
          }}
        >
          {interview.isLastStep ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Finish Setup
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Welcome Screen
// ============================================

interface WelcomeScreenProps {
  mode: BusinessMode;
  estimatedMinutes: number;
  totalSteps: number;
  onStart: () => void;
  onSkip?: () => void;
  theme: ReturnType<typeof getModeTheme>;
}

function WelcomeScreen({ 
  mode, 
  estimatedMinutes, 
  totalSteps, 
  onStart, 
  onSkip,
  theme,
}: WelcomeScreenProps) {
  return (
    <div className="max-w-xl mx-auto text-center py-12">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div 
          className="flex h-16 w-16 items-center justify-center rounded-2xl mx-auto mb-6"
          style={{ backgroundColor: `${theme.accent}20` }}
        >
          <Brain className="h-8 w-8" style={{ color: theme.accent }} />
        </div>

        <h1 className="text-3xl font-bold mb-3">
          Let's set up your AI
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Answer a few questions and your AI will be ready to handle calls 
          for your {getModeDisplayName(mode).toLowerCase()} business.
        </p>

        <div className="flex items-center justify-center gap-6 mb-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>~{estimatedMinutes} minutes</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>{totalSteps} sections</span>
          </div>
        </div>

        <div className="space-y-3">
          <Button 
            size="lg" 
            onClick={onStart}
            className="w-full max-w-xs"
            style={{ backgroundColor: theme.accent }}
          >
            Start Setup
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>

          {onSkip && (
            <Button 
              variant="ghost" 
              onClick={onSkip}
              className="w-full max-w-xs"
            >
              I'll do this later
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          You can skip any question and come back to it later.
        </p>
      </motion.div>
    </div>
  );
}

// ============================================
// Completion Screen
// ============================================

interface CompletionScreenProps {
  mode: BusinessMode;
  skippedSteps: string[];
  onContinue: () => void;
  theme: ReturnType<typeof getModeTheme>;
}

function CompletionScreen({ 
  mode, 
  skippedSteps, 
  onContinue,
  theme,
}: CompletionScreenProps) {
  const hasSkipped = skippedSteps.length > 0;

  return (
    <div className="max-w-xl mx-auto text-center py-12">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div 
          className="flex h-16 w-16 items-center justify-center rounded-2xl mx-auto mb-6"
          style={{ backgroundColor: `${theme.accent}20` }}
        >
          <Check className="h-8 w-8" style={{ color: theme.accent }} />
        </div>

        <h1 className="text-3xl font-bold mb-3">
          {hasSkipped ? "Almost there!" : "Your AI is ready!"}
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          {hasSkipped 
            ? `You skipped ${skippedSteps.length} section${skippedSteps.length > 1 ? "s" : ""}. You can complete these anytime in the Business Brain.`
            : "Your AI now knows how to handle calls for your business. Make a test call to see it in action!"}
        </p>

        <Button 
          size="lg" 
          onClick={onContinue}
          className="w-full max-w-xs"
          style={{ backgroundColor: theme.accent }}
        >
          Go to Business Brain
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}
