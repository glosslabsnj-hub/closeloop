/**
 * useInterviewState - Manages interview progress and answers
 * 
 * Handles:
 * - Current step tracking
 * - Answer storage
 * - Progress calculation
 * - Step navigation
 * - Conditional question visibility
 */

import { useState, useCallback, useMemo } from "react";
import type { BusinessMode } from "@/hooks/useTenantConfig";
import { 
  getStepsForMode, 
  type InterviewStep, 
  type InterviewQuestion,
} from "@/components/brain/interview/interviewQuestions";

export type InterviewAnswers = Record<string, string | boolean | number | string[]>;

export interface InterviewState {
  currentStepIndex: number;
  answers: InterviewAnswers;
  isComplete: boolean;
  skippedSteps: string[];
}

interface UseInterviewStateOptions {
  mode: BusinessMode;
  initialAnswers?: InterviewAnswers;
  onComplete?: (answers: InterviewAnswers) => void;
}

export function useInterviewState(options: UseInterviewStateOptions) {
  const { mode, initialAnswers = {}, onComplete } = options;

  const [state, setState] = useState<InterviewState>({
    currentStepIndex: 0,
    answers: initialAnswers,
    isComplete: false,
    skippedSteps: [],
  });

  // Get steps for this mode
  const steps = useMemo(() => getStepsForMode(mode), [mode]);

  // Current step
  const currentStep = steps[state.currentStepIndex] || null;

  // Filter questions based on showIf conditions
  const getVisibleQuestions = useCallback((step: InterviewStep): InterviewQuestion[] => {
    return step.questions.filter(question => {
      if (!question.showIf) return true;

      const { questionId, value } = question.showIf;
      const answer = state.answers[questionId];

      // Handle array values (multi-select)
      if (Array.isArray(value)) {
        if (Array.isArray(answer)) {
          return value.some(v => answer.includes(v));
        }
        return value.includes(answer as string);
      }

      // Handle boolean
      if (typeof value === "boolean") {
        return answer === value;
      }

      // Handle string
      return answer === value;
    });
  }, [state.answers]);

  // Visible questions for current step
  const visibleQuestions = currentStep ? getVisibleQuestions(currentStep) : [];

  // Progress calculation
  const progress = useMemo(() => {
    const totalSteps = steps.length;
    const completedSteps = state.currentStepIndex + (state.isComplete ? 0 : 0);
    return {
      current: state.currentStepIndex + 1,
      total: totalSteps,
      percentage: Math.round((completedSteps / totalSteps) * 100),
    };
  }, [steps.length, state.currentStepIndex, state.isComplete]);

  // Check if current step has all required answers
  const isCurrentStepComplete = useCallback((): boolean => {
    if (!currentStep) return false;

    const questions = getVisibleQuestions(currentStep);
    return questions.every(q => {
      if (!q.required) return true;
      const answer = state.answers[q.id];
      if (answer === undefined || answer === null || answer === "") return false;
      if (Array.isArray(answer) && answer.length === 0) return false;
      return true;
    });
  }, [currentStep, getVisibleQuestions, state.answers]);

  // Set answer for a question
  const setAnswer = useCallback((questionId: string, value: string | boolean | number | string[]) => {
    setState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: value,
      },
    }));
  }, []);

  // Navigate to next step
  const nextStep = useCallback(() => {
    setState(prev => {
      const nextIndex = prev.currentStepIndex + 1;
      
      if (nextIndex >= steps.length) {
        // Interview complete
        onComplete?.(prev.answers);
        return {
          ...prev,
          isComplete: true,
        };
      }

      return {
        ...prev,
        currentStepIndex: nextIndex,
      };
    });
  }, [steps.length, onComplete]);

  // Navigate to previous step
  const previousStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStepIndex: Math.max(0, prev.currentStepIndex - 1),
    }));
  }, []);

  // Skip current step
  const skipStep = useCallback(() => {
    setState(prev => {
      const nextIndex = prev.currentStepIndex + 1;
      
      if (nextIndex >= steps.length) {
        onComplete?.(prev.answers);
        return {
          ...prev,
          isComplete: true,
          skippedSteps: [...prev.skippedSteps, currentStep?.id || ""],
        };
      }

      return {
        ...prev,
        currentStepIndex: nextIndex,
        skippedSteps: [...prev.skippedSteps, currentStep?.id || ""],
      };
    });
  }, [steps.length, currentStep?.id, onComplete]);

  // Jump to specific step
  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setState(prev => ({
        ...prev,
        currentStepIndex: stepIndex,
      }));
    }
  }, [steps.length]);

  // Reset interview
  const resetInterview = useCallback(() => {
    setState({
      currentStepIndex: 0,
      answers: initialAnswers,
      isComplete: false,
      skippedSteps: [],
    });
  }, [initialAnswers]);

  // Get answer for a specific question
  const getAnswer = useCallback(<T extends string | boolean | number | string[]>(
    questionId: string,
    defaultValue?: T
  ): T | undefined => {
    const answer = state.answers[questionId];
    return (answer as T) ?? defaultValue;
  }, [state.answers]);

  return {
    // State
    currentStep,
    currentStepIndex: state.currentStepIndex,
    steps,
    answers: state.answers,
    isComplete: state.isComplete,
    skippedSteps: state.skippedSteps,
    visibleQuestions,
    progress,

    // Checks
    isCurrentStepComplete,
    isFirstStep: state.currentStepIndex === 0,
    isLastStep: state.currentStepIndex === steps.length - 1,

    // Actions
    setAnswer,
    getAnswer,
    nextStep,
    previousStep,
    skipStep,
    goToStep,
    resetInterview,
  };
}
