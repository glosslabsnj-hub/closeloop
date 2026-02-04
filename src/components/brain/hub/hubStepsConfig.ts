/**
 * Hub Steps Configuration
 * 
 * Defines the 8 setup steps for the Business Brain Hub.
 * Maps to existing sections and provides mode-aware emphasis.
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
  /** Modes where this step is de-emphasized (less important) */
  deEmphasis?: BusinessMode[];
}

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
    deEmphasis: ["food", "medical"],
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
    deEmphasis: ["dispatch", "food"],
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
 * Get steps ordered by relevance for a given mode
 */
export function getOrderedSteps(mode: BusinessMode): HubStep[] {
  const steps = [...HUB_STEPS];
  
  return steps.sort((a, b) => {
    const aEmphasis = a.emphasis?.includes(mode) ? 2 : a.deEmphasis?.includes(mode) ? 0 : 1;
    const bEmphasis = b.emphasis?.includes(mode) ? 2 : b.deEmphasis?.includes(mode) ? 0 : 1;
    return bEmphasis - aEmphasis;
  });
}

/**
 * Check if a step is emphasized for a given mode
 */
export function isStepEmphasized(step: HubStep, mode: BusinessMode): boolean {
  return step.emphasis?.includes(mode) ?? false;
}

/**
 * Get dynamic title for offerings step based on mode
 */
export function getOfferingsTitle(mode: BusinessMode): string {
  switch (mode) {
    case "food":
      return "Menu & Pricing";
    case "dispatch":
      return "Services & Rates";
    default:
      return "Services & Pricing";
  }
}
