/**
 * Client-side readiness estimator for onboarding Phase 5 review.
 *
 * Mirrors the server-side `get_ai_readiness` RPC logic but uses form data
 * instead of DB queries. Returns a score + p0/p1 flags matching
 * the format used by useAIReadinessV2.
 */

import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";
import type { EditableService } from "@/components/onboarding/ServicePreviewStep";
import type { EditableFAQ } from "@/components/onboarding/FAQPreviewStep";
import type { EditablePolicies } from "@/components/onboarding/PolicyPreviewStep";
import type { BusinessHours } from "@/components/onboarding/BusinessHoursEditor";

export interface ReadinessFlag {
  id: string;
  label: string;
  phase: number; // Which onboarding phase to edit
}

export interface ReadinessResult {
  score: number;
  p0Flags: ReadinessFlag[]; // Fix before going live
  p1Flags: ReadinessFlag[]; // Recommended
}

interface ReadinessInput {
  businessName: string;
  businessAddress: string;
  businessMode: BusinessMode;
  services: EditableService[];
  templateFAQs: EditableFAQ[];
  templatePolicies: EditablePolicies;
  businessHours: BusinessHours;
  is24x7: boolean;
  scenarioAnswers: Record<string, boolean>;
  customGreeting: string;
  workStyle: string;
  serviceAreaRadius?: number;
}

export function estimateOnboardingReadiness(input: ReadinessInput): ReadinessResult {
  const p0Flags: ReadinessFlag[] = [];
  const p1Flags: ReadinessFlag[] = [];

  const enabledServices = input.services.filter((s) => s.enabled && s.name.trim().length > 0);
  const enabledFAQs = input.templateFAQs.filter((f) => f.enabled && f.question.trim().length > 0);
  const hasPolicies =
    !!input.templatePolicies.cancellation || !!input.templatePolicies.deposit || !!input.templatePolicies.refund;

  // ====== GLOBAL CHECKS (40 pts) ======
  let globalScore = 0;
  const globalMax = 40;

  // Business name (10 pts)
  if (input.businessName.trim().length > 0) {
    globalScore += 10;
  } else {
    p0Flags.push({ id: "business_name", label: "Add your business name", phase: 1 });
  }

  // Timezone (auto-detected, 5 pts)
  globalScore += 5;

  // Hours (10 pts)
  const hasHours = input.is24x7 || hasConfiguredHours(input.businessHours);
  if (hasHours) {
    globalScore += 10;
  } else {
    p0Flags.push({ id: "hours", label: "Set your business hours", phase: 2 });
  }

  // Policies (5 pts)
  if (hasPolicies) {
    globalScore += 5;
  } else {
    p1Flags.push({ id: "policies", label: "Add cancellation or deposit policy", phase: 2 });
  }

  // FAQs (10 pts)
  if (enabledFAQs.length >= 3) {
    globalScore += 10;
  } else if (enabledFAQs.length > 0) {
    globalScore += 5;
    p1Flags.push({ id: "faqs", label: "Add more FAQs for better AI answers", phase: 2 });
  } else {
    p1Flags.push({ id: "faqs", label: "Add FAQs so your AI can answer common questions", phase: 2 });
  }

  // ====== MODE-SPECIFIC CHECKS (60 pts) ======
  let modeScore = 0;
  const modeMax = 60;

  // Services/menu count (20 pts)
  if (enabledServices.length >= 3) {
    modeScore += 20;
  } else if (enabledServices.length > 0) {
    modeScore += 10;
    p1Flags.push({ id: "services", label: "Add more services for accurate quoting", phase: 2 });
  } else {
    p0Flags.push({ id: "services", label: "Add at least one service or menu item", phase: 2 });
  }

  // Pricing (10 pts)
  const hasBasicPricing = enabledServices.some((s) => s.price > 0);
  if (hasBasicPricing) {
    modeScore += 10;
  } else {
    p1Flags.push({ id: "pricing", label: "Add prices to your services", phase: 2 });
  }

  // Mode-specific capability checks (30 pts)
  switch (input.businessMode) {
    case "food": {
      // Delivery/catering config
      if (input.scenarioAnswers.offersDelivery || input.scenarioAnswers.offersCatering) {
        modeScore += 10;
      }
      // Reservations
      if (input.scenarioAnswers.offersReservations) modeScore += 10;
      else modeScore += 5; // Not applicable = partial credit
      // Basic food setup
      modeScore += 10;
      break;
    }
    case "dispatch": {
      // Service area (critical for dispatch)
      const needsArea = input.workStyle === "go_to_customer" || input.workStyle === "both";
      if (needsArea && input.serviceAreaRadius && input.serviceAreaRadius > 0) {
        modeScore += 15;
      } else if (needsArea) {
        p0Flags.push({ id: "service_area", label: "Set your service area radius", phase: 2 });
      } else {
        modeScore += 15;
      }
      // Distance pricing
      if (input.scenarioAnswers.needsDistancePricing) {
        modeScore += 10;
      }
      modeScore += 5;
      break;
    }
    case "medical": {
      // HIPAA
      if (input.scenarioAnswers.requiresHIPAA !== false) {
        modeScore += 15;
      } else {
        p0Flags.push({ id: "hipaa", label: "Confirm HIPAA compliance settings", phase: 1 });
      }
      // Insurance
      if (input.scenarioAnswers.requiresInsurance) modeScore += 10;
      else modeScore += 5;
      modeScore += 5;
      break;
    }
    case "service": {
      // Service area for mobile
      const isMobile = input.workStyle === "go_to_customer" || input.workStyle === "both";
      if (isMobile && input.serviceAreaRadius && input.serviceAreaRadius > 0) {
        modeScore += 15;
      } else if (isMobile) {
        p1Flags.push({ id: "service_area", label: "Set your service area for mobile work", phase: 2 });
        modeScore += 5;
      } else {
        modeScore += 15;
      }
      // Calendar/booking
      modeScore += 10;
      modeScore += 5;
      break;
    }
    default: {
      // General/sales - basic checks
      modeScore += 20;
      if (input.customGreeting) modeScore += 10;
      else p1Flags.push({ id: "greeting", label: "Customize your AI greeting", phase: 3 });
      break;
    }
  }

  // Address (bonus, not scored but flagged)
  if (!input.businessAddress) {
    p1Flags.push({ id: "address", label: "Add your business address for directions", phase: 1 });
  }

  // Custom greeting (bonus) — skip if already flagged by mode-specific checks
  if (!input.customGreeting && !p1Flags.some((f) => f.id === "greeting")) {
    p1Flags.push({ id: "greeting", label: "Customize how your AI greets callers", phase: 3 });
  }

  const rawScore = globalScore + modeScore;
  const maxScore = globalMax + modeMax;
  const score = Math.min(100, Math.round((rawScore / maxScore) * 100));

  return { score, p0Flags, p1Flags };
}

function hasConfiguredHours(hours: BusinessHours): boolean {
  if (!hours || typeof hours !== "object") return false;
  return Object.values(hours).some((day: any) => {
    if (!day || day.closed) return false;
    if (Array.isArray(day.windows) && day.windows.length > 0) return true;
    if (day.open && day.close) return true;
    return false;
  });
}
