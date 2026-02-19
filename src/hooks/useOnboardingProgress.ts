/**
 * useOnboardingProgress — tracks 7-phase onboarding state with localStorage persistence.
 */
import { useState, useEffect, useRef, useCallback } from "react";

export interface OnboardingPhase {
  id: string;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
}

export const ONBOARDING_PHASES: OnboardingPhase[] = [
  { id: "business", title: "Your Business", subtitle: "Name & industry", estimatedMinutes: 2 },
  { id: "how-you-work", title: "How You Work", subtitle: "Style & features", estimatedMinutes: 3 },
  { id: "offerings", title: "Your Offerings", subtitle: "Services & menu", estimatedMinutes: 5 },
  { id: "hours-area", title: "Hours & Area", subtitle: "Schedule & coverage", estimatedMinutes: 3 },
  { id: "ai-assistant", title: "Your AI", subtitle: "Tone & behavior", estimatedMinutes: 4 },
  { id: "connect", title: "Connect Tools", subtitle: "Calendar & phone", estimatedMinutes: 2 },
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
        return parsed.phase ?? 0;
      }
    } catch { /* ignore */ }
    return 0;
  });

  const hasSavedProgress = loaded.current && phase >= 1;

  // Phase 0 is the quick-start splash — progress starts counting from phase 1
  const progressPercent = phase <= 0 ? 0 : Math.round((phase / TOTAL_PHASES) * 100);
  const currentPhase = phase >= 1
    ? (ONBOARDING_PHASES[phase - 1] ?? ONBOARDING_PHASES[0])
    : ONBOARDING_PHASES[0];
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
      // Don't go back to phase 0 (quick start splash is one-time)
      const prev = Math.max(p - 1, 1);
      saveProgress(prev);
      return prev;
    });
  }, [saveProgress]);

  const goToPhase = useCallback((target: number) => {
    if (target >= 0 && target <= TOTAL_PHASES) {
      setPhase(target);
      if (target >= 1) saveProgress(target);
    }
  }, [saveProgress]);

  const resetProgress = useCallback(() => {
    setPhase(0);
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
