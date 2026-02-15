/**
 * useOnboardingProgress — tracks 5-phase onboarding state with localStorage persistence.
 */
import { useState, useEffect, useRef, useCallback } from "react";

export interface OnboardingPhase {
  id: string;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
}

export const ONBOARDING_PHASES: OnboardingPhase[] = [
  { id: "who", title: "Who You Are", subtitle: "Business identity", estimatedMinutes: 3 },
  { id: "what", title: "What You Do", subtitle: "Services & schedule", estimatedMinutes: 8 },
  { id: "how", title: "How AI Works", subtitle: "AI behavior", estimatedMinutes: 5 },
  { id: "connect", title: "Connect Tools", subtitle: "Calendar & phone", estimatedMinutes: 3 },
  { id: "go-live", title: "Go Live", subtitle: "Review & launch", estimatedMinutes: 1 },
];

const TOTAL_PHASES = ONBOARDING_PHASES.length;

function getStorageKey(userId?: string) {
  return `voxly_onboarding_v2_${userId || "anon"}`;
}

export interface OnboardingProgressState {
  phase: number;
  savedAt?: string;
}

export function useOnboardingProgress(userId?: string) {
  const loaded = useRef(false);

  const [phase, setPhase] = useState(() => {
    try {
      const raw = localStorage.getItem(getStorageKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw) as OnboardingProgressState;
        loaded.current = !!parsed.savedAt;
        return parsed.phase ?? 1;
      }
    } catch { /* ignore */ }
    return 1;
  });

  const hasSavedProgress = loaded.current && phase > 1;

  const progressPercent = Math.round((phase / TOTAL_PHASES) * 100);
  const currentPhase = ONBOARDING_PHASES[phase - 1] ?? ONBOARDING_PHASES[0];
  const totalMinutes = ONBOARDING_PHASES.reduce((sum, p) => sum + p.estimatedMinutes, 0);

  const saveProgress = useCallback((currentPhase: number) => {
    try {
      localStorage.setItem(
        getStorageKey(userId),
        JSON.stringify({ phase: currentPhase, savedAt: new Date().toISOString() })
      );
    } catch { /* ignore */ }
  }, [userId]);

  const clearProgress = useCallback(() => {
    localStorage.removeItem(getStorageKey(userId));
  }, [userId]);

  const goNext = useCallback(() => {
    setPhase((p) => {
      const next = Math.min(p + 1, TOTAL_PHASES);
      saveProgress(next);
      return next;
    });
  }, [saveProgress]);

  const goBack = useCallback(() => {
    setPhase((p) => {
      const prev = Math.max(p - 1, 1);
      saveProgress(prev);
      return prev;
    });
  }, [saveProgress]);

  const goToPhase = useCallback((target: number) => {
    if (target >= 1 && target <= TOTAL_PHASES) {
      setPhase(target);
      saveProgress(target);
    }
  }, [saveProgress]);

  const resetProgress = useCallback(() => {
    setPhase(1);
    clearProgress();
    loaded.current = false;
  }, [clearProgress]);

  // Auto-save phase changes
  useEffect(() => {
    saveProgress(phase);
  }, [phase, saveProgress]);

  return {
    phase,
    setPhase,
    currentPhase,
    progressPercent,
    totalPhases: TOTAL_PHASES,
    totalMinutes,
    hasSavedProgress,
    goNext,
    goBack,
    goToPhase,
    resetProgress,
    clearProgress,
    phases: ONBOARDING_PHASES,
  };
}
