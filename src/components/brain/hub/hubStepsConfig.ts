/**
 * Hub Steps Configuration
 *
 * Defines the 8 setup steps for the Business Brain Hub.
 * Maps to existing sections and provides mode-aware titles and emphasis.
 */

import {
  Building2,
  Clock,
  Package,
  MapPin,
  Calendar,
  Shield,
  Sparkles,
  BookOpen,
  type LucideIcon
} from "lucide-react";
import type { BusinessMode } from "@/hooks/useTenantConfig";

export interface HubStep {
  id: string;
  sectionId: string;
  title: string;
  purpose: string;
  icon: LucideIcon;
  usedByAI: string[];
  /** Modes where this step is emphasized (most important) */
  emphasis?: BusinessMode[];
  /** Modes where this step is hidden (not applicable) */
  hiddenModes?: BusinessMode[];
}

/** Mode-specific title overrides keyed by stepId then mode */
const MODE_TITLES: Record<string, Partial<Record<BusinessMode, string>>> = {
  offerings: {
    service: "Services & Pricing",
    dispatch: "Services & Rates",
    food: "Menu & Pricing",
    medical: "Services & Pricing",
    general: "Services & Pricing",
  },
  coverage: {
    service: "Service Area",
    dispatch: "Coverage & ETAs",
    food: "Delivery Zones",
    medical: "Service Area & ETA",
    general: "Service Area & ETA",
  },
  calendar: {
    service: "Calendar & Availability",
    medical: "Calendar & Availability",
  },
  policies: {
    service: "Booking Policies",
    dispatch: "Dispatch Policies",
    food: "Order Policies",
    medical: "Patient Intake & HIPAA",
    general: "Policies & Intake",
  },
  "ai-setup": {
    service: "AI Scripts",
    dispatch: "AI Scripts",
    food: "AI Scripts",
    medical: "AI Scripts",
    general: "AI Scripts",
  },
  knowledge: {
    service: "FAQs & Training",
    dispatch: "FAQs & Training",
    food: "FAQs & Training",
    medical: "Patient FAQs",
    general: "FAQs & Training",
  },
};

export const HUB_STEPS: HubStep[] = [
  {
    id: "identity",
    sectionId: "profile",
    title: "Business Identity",
    purpose: "Your business name, tagline, and location info",
    icon: Building2,
    usedByAI: [
      "Introduces your business by name on every call",
      "Builds trust by mentioning years in business",
      "Answers location and contact questions",
    ],
  },
  {
    id: "hours",
    sectionId: "hours",
    title: "Operating Hours",
    purpose: "When you're open for business",
    icon: Clock,
    usedByAI: [
      "Tells callers if you're open or closed right now",
      "Suggests available booking times",
      "Explains hours when asked",
    ],
  },
  {
    id: "offerings",
    sectionId: "services",
    title: "Services & Pricing",
    purpose: "What you offer and how much it costs",
    icon: Package,
    usedByAI: [
      "Tells callers what services you provide",
      "Quotes prices accurately when asked",
      "Matches caller needs to the right service",
    ],
    emphasis: ["service", "food", "dispatch"],
  },
  {
    id: "coverage",
    sectionId: "service-area",
    title: "Service Area & ETA",
    purpose: "Where you serve and how long it takes to get there",
    icon: MapPin,
    usedByAI: [
      "Checks if caller is in your service area",
      "Calculates arrival times based on distance",
      "Politely declines jobs outside coverage",
    ],
    emphasis: ["dispatch", "service"],
  },
  {
    id: "calendar",
    sectionId: "availability",
    title: "Calendar & Availability",
    purpose: "Connect calendars to prevent double-booking",
    icon: Calendar,
    usedByAI: [
      "Checks your calendar before offering times",
      "Avoids double-booking automatically",
      "Respects blocked times and buffers",
    ],
    emphasis: ["service", "medical"],
    hiddenModes: ["dispatch", "food"],
  },
  {
    id: "policies",
    sectionId: "policies",
    title: "Policies & Intake",
    purpose: "Cancellations, deposits, and required questions",
    icon: Shield,
    usedByAI: [
      "Explains policies before they become objections",
      "Collects required info from every caller",
      "Answers payment and cancellation questions",
    ],
  },
  {
    id: "ai-setup",
    sectionId: "ai-behavior",
    title: "AI Scripts & Behavior",
    purpose: "How your AI greets and handles calls",
    icon: Sparkles,
    usedByAI: [
      "Delivers your custom greeting on every call",
      "Uses your fallback script when uncertain",
      "Follows your rules about tone and approach",
    ],
  },
  {
    id: "knowledge",
    sectionId: "knowledge",
    title: "FAQs & Training",
    purpose: "Common questions and additional knowledge",
    icon: BookOpen,
    usedByAI: [
      "Answers FAQs instantly without guessing",
      "Handles objections and concerns smoothly",
      "References uploaded documents for details",
    ],
    emphasis: ["general"],
  },
];

/**
 * Get the mode-specific title for a step, falling back to the default title.
 */
export function getStepTitle(stepId: string, mode: BusinessMode): string {
  const modeOverride = MODE_TITLES[stepId]?.[mode];
  if (modeOverride) return modeOverride;
  const step = HUB_STEPS.find(s => s.id === stepId);
  return step?.title ?? "";
}

/**
 * Get steps ordered by relevance for a given mode, hiding inapplicable steps.
 */
export function getOrderedSteps(mode: BusinessMode): HubStep[] {
  return HUB_STEPS.filter(step => !step.hiddenModes?.includes(mode));
}

/**
 * Check if a step is emphasized for a given mode
 */
export function isStepEmphasized(step: HubStep, mode: BusinessMode): boolean {
  return step.emphasis?.includes(mode) ?? false;
}

/**
 * Get dynamic title for offerings step based on mode (legacy — prefer getStepTitle)
 */
export function getOfferingsTitle(mode: BusinessMode): string {
  return getStepTitle("offerings", mode);
}

/**
 * Get dynamic title for any brain step based on mode (legacy — prefer getStepTitle)
 */
export function getDynamicStepTitle(stepId: string, mode: BusinessMode): string {
  return getStepTitle(stepId, mode);
}
