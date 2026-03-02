/**
 * Guided Setup Steps
 *
 * Maps P0 readiness flags → Brain editor items for the guided setup flow.
 * Each step wraps an existing Brain editor component in a guided container
 * with context explaining WHY it matters.
 *
 * Ordered by importance: business info → services → hours → FAQs → policies → mode-specific.
 * Uses item IDs from brainSectionRegistry.ts so BrainEditorRenderer can render the right editor.
 */

import {
  Building2, Clock, Tag, HelpCircle, FileText, MapPin,
  UtensilsCrossed, HeartPulse, Truck, Mic, DollarSign,
  type LucideIcon,
} from "lucide-react";
import type { BusinessMode } from "@/hooks/useTenantConfig";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GuidedSetupStep {
  /** Unique ID for this step */
  id: string;
  /** Brain editor item ID from brainSectionRegistry (rendered by BrainEditorRenderer) */
  editorItemId: string;
  /** Brain section this editor lives in (for URL context) */
  brainSection: string;
  /** User-facing title */
  title: string;
  /** One-line explanation of WHY this matters */
  why: string;
  /** Icon */
  icon: LucideIcon;
  /** P0 flag keys that this step resolves */
  resolvesFlagKeys: string[];
  /**
   * Subset of resolvesFlagKeys used for the completion counter.
   * If provided, the step is "complete" when ALL of these are absent — even if
   * other resolvesFlagKeys are still present (e.g. missing_pricing).
   * This prevents the counter from regressing when a user adds content that
   * introduces a secondary flag.
   * Defaults to resolvesFlagKeys when not specified.
   */
  completionFlagKeys?: string[];
  /** Priority order (lower = earlier in flow) */
  order: number;
  /** Which business modes this step applies to. Empty = all modes. */
  modes?: BusinessMode[];
  /** Can this step be skipped? (false = required, true = can skip) */
  skippable?: boolean;
}

// ─── Shared Steps (all modes) ───────────────────────────────────────────────

const SHARED_STEPS: GuidedSetupStep[] = [
  {
    id: "business-info",
    editorItemId: "business-info",
    brainSection: "about",
    title: "Tell us about your business",
    why: "Your AI introduces itself using your business name and details. Callers need to know they reached the right place.",
    icon: Building2,
    resolvesFlagKeys: ["missing_business_name", "missing_timezone"],
    order: 10,
    skippable: false,
  },
  {
    id: "business-hours",
    editorItemId: "business-hours",
    brainSection: "about",
    title: "When are you open?",
    why: "Your AI needs to know your hours so it can tell callers when you're available and schedule appointments correctly.",
    icon: Clock,
    resolvesFlagKeys: ["missing_hours"],
    order: 20,
    skippable: false,
  },
  {
    id: "greeting-scripts",
    editorItemId: "scripts",
    brainSection: "training",
    title: "How should your AI answer the phone?",
    why: "First impressions matter. Customize the greeting so your AI sounds like your business, not a generic robot.",
    icon: Mic,
    resolvesFlagKeys: [],
    order: 70,
    skippable: true,
  },
  {
    id: "faqs",
    editorItemId: "faqs",
    brainSection: "training",
    title: "Questions your customers ask",
    why: "The #1 reason AI gives bad answers is missing FAQs. Add your most common questions so your AI answers confidently instead of saying \"I don't know.\"",
    icon: HelpCircle,
    resolvesFlagKeys: ["missing_faqs", "few_faqs"],
    order: 50,
    skippable: false,
  },
  {
    id: "policies",
    editorItemId: "policies",
    brainSection: "operations",
    title: "Your payment & cancellation policies",
    why: "Callers always ask about payments, deposits, and cancellations. Your AI needs clear answers for these.",
    icon: FileText,
    resolvesFlagKeys: ["missing_policies"],
    order: 60,
    skippable: true,
  },
];

// ─── Service Mode Steps ────────────────────────────────────────────────────

const SERVICE_STEPS: GuidedSetupStep[] = [
  {
    id: "service-catalog",
    editorItemId: "catalog",
    brainSection: "services",
    title: "What services do you offer?",
    why: "Your AI recommends services and quotes prices based on this list. Without services, it can't help callers book.",
    icon: Tag,
    resolvesFlagKeys: ["no_services", "few_services", "missing_pricing"],
    completionFlagKeys: ["no_services", "few_services"],
    order: 30,
    modes: ["service"],
    skippable: false,
  },
  {
    id: "service-area",
    editorItemId: "coverage",
    brainSection: "operations",
    title: "Where do you serve?",
    why: "If you offer mobile or on-site services, your AI needs to know your coverage area to give accurate answers.",
    icon: MapPin,
    resolvesFlagKeys: ["missing_service_area"],
    order: 40,
    modes: ["service"],
    skippable: true,
  },
];

// ─── Dispatch Mode Steps ──────────────────────────────────────────────────

const DISPATCH_STEPS: GuidedSetupStep[] = [
  {
    id: "dispatch-services",
    editorItemId: "catalog",
    brainSection: "services",
    title: "What services do you dispatch?",
    why: "Your AI quotes prices and dispatches jobs based on this list. Include every service type you offer.",
    icon: Truck,
    resolvesFlagKeys: ["no_dispatch_services", "no_services", "few_services", "missing_pricing"],
    completionFlagKeys: ["no_dispatch_services", "no_services", "few_services"],
    order: 30,
    modes: ["dispatch"],
    skippable: false,
  },
  {
    id: "dispatch-coverage",
    editorItemId: "coverage",
    brainSection: "operations",
    title: "What area do you cover?",
    why: "Your AI needs your service area to tell callers whether you can reach them and how long it'll take.",
    icon: MapPin,
    resolvesFlagKeys: ["missing_service_area", "missing_pickup_intake"],
    order: 40,
    modes: ["dispatch"],
    skippable: false,
  },
];

// ─── Food Mode Steps ──────────────────────────────────────────────────────

const FOOD_STEPS: GuidedSetupStep[] = [
  {
    id: "menu-items",
    editorItemId: "catalog",
    brainSection: "services",
    title: "Add your menu items",
    why: "Your AI takes orders from this menu. Without items, it can't help callers place orders.",
    icon: UtensilsCrossed,
    resolvesFlagKeys: ["no_menu_items", "few_menu_items", "missing_menu_prices"],
    completionFlagKeys: ["no_menu_items", "few_menu_items"],
    order: 30,
    modes: ["food"],
    skippable: false,
  },
  {
    id: "food-service-types",
    editorItemId: "food-service-types",
    brainSection: "services",
    title: "How do customers order?",
    why: "Tell us if you offer pickup, delivery, dine-in, or catering so your AI knows what to offer callers.",
    icon: UtensilsCrossed,
    resolvesFlagKeys: ["ordering_disabled", "ordering_not_configured"],
    order: 25,
    modes: ["food"],
    skippable: false,
  },
];

// ─── Medical Mode Steps ──────────────────────────────────────────────────

const MEDICAL_STEPS: GuidedSetupStep[] = [
  {
    id: "medical-services",
    editorItemId: "catalog",
    brainSection: "services",
    title: "What appointment types do you offer?",
    why: "Your AI schedules appointments based on these types. List every visit type your practice offers.",
    icon: HeartPulse,
    resolvesFlagKeys: ["no_medical_services", "no_services", "few_services"],
    order: 30,
    modes: ["medical"],
    skippable: false,
  },
  {
    id: "hipaa-settings",
    editorItemId: "hipaa",
    brainSection: "operations",
    title: "HIPAA compliance settings",
    why: "Medical practices must have HIPAA mode enabled. This disables call recording and limits data retention.",
    icon: HeartPulse,
    resolvesFlagKeys: ["hipaa_disabled", "missing_data_retention", "hipaa_storage_warning"],
    order: 15,
    modes: ["medical"],
    skippable: false,
  },
];

// ─── General Mode Steps ──────────────────────────────────────────────────

const GENERAL_STEPS: GuidedSetupStep[] = [
  {
    id: "general-services",
    editorItemId: "catalog",
    brainSection: "services",
    title: "What do you offer?",
    why: "Your AI needs to know what you offer so it can help callers with the right information.",
    icon: Tag,
    resolvesFlagKeys: ["no_services", "few_services", "missing_pricing"],
    completionFlagKeys: ["no_services", "few_services"],
    order: 30,
    modes: ["general"],
    skippable: false,
  },
];

// ─── Sales Mode Steps ────────────────────────────────────────────────────

const SALES_STEPS: GuidedSetupStep[] = [
  {
    id: "sales-catalog",
    editorItemId: "catalog",
    brainSection: "services",
    title: "What do you sell?",
    why: "Your AI discusses your products and helps qualify leads. Add your key products or services.",
    icon: DollarSign,
    resolvesFlagKeys: ["no_services", "few_services", "missing_pricing"],
    completionFlagKeys: ["no_services", "few_services"],
    order: 30,
    modes: ["sales"],
    skippable: false,
  },
];

// ─── Mode → Steps map ─────────────────────────────────────────────────────

const MODE_STEPS: Record<BusinessMode, GuidedSetupStep[]> = {
  service: SERVICE_STEPS,
  dispatch: DISPATCH_STEPS,
  food: FOOD_STEPS,
  medical: MEDICAL_STEPS,
  general: GENERAL_STEPS,
  sales: SALES_STEPS,
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns the full ordered list of guided setup steps for a given business mode.
 * Combines shared steps + mode-specific steps, sorted by order.
 */
export function getGuidedSetupSteps(mode: BusinessMode): GuidedSetupStep[] {
  const modeSpecific = MODE_STEPS[mode] || [];
  const all = [...SHARED_STEPS, ...modeSpecific];
  return all.sort((a, b) => a.order - b.order);
}

/**
 * Returns only the incomplete steps based on current P0/P1 flags.
 * A step is "incomplete" if ANY of its resolvesFlagKeys are present in the active flags.
 * Steps with empty resolvesFlagKeys (like greeting scripts) are always shown as skippable.
 */
export function getIncompleteSteps(
  mode: BusinessMode,
  activeFlags: string[],
): GuidedSetupStep[] {
  const allSteps = getGuidedSetupSteps(mode);
  const flagSet = new Set(activeFlags);

  return allSteps.filter((step) => {
    // Steps with no flag keys are optional "enrichment" steps — include only if skippable
    if (step.resolvesFlagKeys.length === 0) return step.skippable;
    // Include if any of its flags are active
    return step.resolvesFlagKeys.some((fk) => flagSet.has(fk));
  });
}

/**
 * Computes step progress: total steps for the mode and how many are complete.
 */
export function computeStepProgress(
  mode: BusinessMode,
  activeFlags: string[],
): { totalSteps: number; completedSteps: number; nextStep: GuidedSetupStep | null } {
  const allSteps = getGuidedSetupSteps(mode);
  // Only count steps that have flag keys (required steps)
  const requiredSteps = allSteps.filter((s) => s.resolvesFlagKeys.length > 0);
  const flagSet = new Set(activeFlags);

  let completedCount = 0;
  let nextStep: GuidedSetupStep | null = null;

  for (const step of requiredSteps) {
    // Use completionFlagKeys (core requirements) for the counter if available,
    // falling back to resolvesFlagKeys. This prevents secondary flags (like
    // missing_pricing) from regressing the counter when the user adds content.
    const keysForCompletion = step.completionFlagKeys ?? step.resolvesFlagKeys;
    const isComplete = keysForCompletion.every((fk) => !flagSet.has(fk));
    if (isComplete) {
      completedCount++;
    } else if (!nextStep) {
      nextStep = step;
    }
  }

  return {
    totalSteps: requiredSteps.length,
    completedSteps: completedCount,
    nextStep,
  };
}
