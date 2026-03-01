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
  { id: "business", title: "Your Business", subtitle: "Industry, name & style", estimatedMinutes: 1 },
  { id: "offerings", title: "Your Services", subtitle: "What you offer", estimatedMinutes: 1 },
  { id: "hours-area", title: "Hours & Area", subtitle: "Schedule & coverage", estimatedMinutes: 1 },
  { id: "ai-assistant", title: "Your AI", subtitle: "Tone & behavior", estimatedMinutes: 1 },
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
        // Auto-advance past phase 0 (website splash) — now inline in phase 1
        const saved = parsed.phase ?? 1;
        return saved < 1 ? 1 : saved;
      }
    } catch { /* ignore */ }
    return 1; // Start directly at Phase 1 (industry selection)
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
