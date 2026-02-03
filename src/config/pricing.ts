/**
 * Centralized Pricing Configuration
 * Single source of truth for all pricing throughout the application
 */

// Tier types - SMS tier removed (coming soon)
export type PlanTier = "voice";

// Ladder SKU codes - Voice tier only (SMS coming soon)
export type PlanSku =
  // Voice tier
  | "voice-200" | "voice-600" | "voice-1500";

// Legacy plan codes (for backward compatibility during migration)
export type LegacyPlanCode = "text" | "voice" | "both";

export interface PlanLadderStep {
  sku: PlanSku;
  tier: PlanTier;
  name: string;
  shortName: string;
  price: number;
  includedMinutes: number | null;
  includedSmsSegments: number | null;
  overageMinuteRate: number | null; // dollars per minute
  overageSmsRate: number; // dollars per segment
  stripePriceId: string | null; // Populated after Stripe setup
  isDefault?: boolean; // Default option within tier
}

export interface TierInfo {
  tier: PlanTier;
  displayName: string;
  startingPrice: number;
  description: string;
  shortDescription: string;
  features: string[];
  highlight?: boolean;
  icon: "MessageSquare" | "Phone" | "Sparkles";
}

// Tier definitions - Only Voice tier available (SMS coming soon)
export const TIERS: TierInfo[] = [
  {
    tier: "voice",
    displayName: "AI Voice Receptionist",
    startingPrice: 249,
    description: "AI answers calls, qualifies leads, and books appointments",
    shortDescription: "AI answers your phone",
    features: [
      "AI answers inbound calls 24/7",
      "Captures customer info automatically",
      "Handles objections naturally",
      "Pushes to booking links",
      "Multiple routing modes",
      "Smart call routing",
    ],
    highlight: true,
    icon: "Phone",
  },
];

// Ladder steps - Voice tier only (SMS coming soon)
export const LADDER_STEPS: PlanLadderStep[] = [
  // Voice Tier
  {
    sku: "voice-200",
    tier: "voice",
    name: "Voice 200",
    shortName: "200 minutes",
    price: 249,
    includedMinutes: 200,
    includedSmsSegments: null,
    overageMinuteRate: 0.45,
    overageSmsRate: 0.03,
    stripePriceId: null,
    isDefault: true,
  },
  {
    sku: "voice-600",
    tier: "voice",
    name: "Voice 600",
    shortName: "600 minutes",
    price: 299,
    includedMinutes: 600,
    includedSmsSegments: null,
    overageMinuteRate: 0.45,
    overageSmsRate: 0.03,
    stripePriceId: null,
  },
  {
    sku: "voice-1500",
    tier: "voice",
    name: "Voice 1500",
    shortName: "1,500 minutes",
    price: 499,
    includedMinutes: 1500,
    includedSmsSegments: null,
    overageMinuteRate: 0.45,
    overageSmsRate: 0.03,
    stripePriceId: null,
  },
];

// Location add-ons
export const LOCATION_ADD_ONS = {
  voice: 99, // per month - extra location with dedicated number
};

// What's included in all plans
export const INCLUDED_IN_ALL_PLANS = [
  "Business Brain (knowledge editing, FAQs, services, menu, policies)",
  "Integration syncing (webhook delivery + Google Sheets export)",
  "Handoff delivery for bookings, dispatch, and orders",
  "Multi-tenant dashboard with module gating",
];

// Helper functions
export function getTierInfo(tier: PlanTier): TierInfo | undefined {
  return TIERS.find((t) => t.tier === tier);
}

export function getLadderStepsForTier(tier: PlanTier): PlanLadderStep[] {
  return LADDER_STEPS.filter((step) => step.tier === tier);
}

export function getDefaultStepForTier(tier: PlanTier): PlanLadderStep | undefined {
  return LADDER_STEPS.find((step) => step.tier === tier && step.isDefault);
}

export function getLadderStep(sku: PlanSku): PlanLadderStep | undefined {
  return LADDER_STEPS.find((step) => step.sku === sku);
}

export function getTierFromSku(sku: PlanSku): PlanTier {
  const step = getLadderStep(sku);
  return step?.tier || "voice";
}

export function getLocationAddOnPrice(_tier: PlanTier): number {
  return LOCATION_ADD_ONS.voice;
}

// Feature entitlement checks based on SKU - handles both new SKUs and legacy plan codes
export function hasVoiceFeature(sku: string | null | undefined): boolean {
  if (!sku) return false;
  return sku.startsWith("voice") || sku.startsWith("both");
}

// SMS feature is disabled / coming soon - always returns false
export function hasSmsFeature(_sku: string | null | undefined): boolean {
  return false;
}

// Get plan family/tier from any SKU (new or legacy)
export function getPlanFamily(sku: string | null | undefined): PlanTier | "unknown" {
  if (!sku) return "unknown";
  if (sku.startsWith("voice")) return "voice";
  // Legacy support - redirect to voice
  if (sku === "voice") return "voice";
  return "unknown";
}

// Alias for Twilio provisioning checks
export function isEligibleForTwilioProvision(sku: string | null | undefined): boolean {
  return hasVoiceFeature(sku);
}

// Legacy compatibility: map old plan codes to new SKUs - all map to voice now
export function legacyPlanCodeToDefaultSku(_legacyCode: LegacyPlanCode): PlanSku {
  return "voice-200";
}

// Format helpers
export function formatPrice(price: number): string {
  return price % 1 === 0 ? `$${price}` : `$${price.toFixed(2)}`;
}

export function formatUsageLimit(amount: number | null, type: "minutes" | "segments"): string {
  if (amount === null) return "—";
  return `${amount.toLocaleString()} ${type}`;
}

export function formatOverageRate(rate: number | null, type: "minute" | "segment"): string {
  if (rate === null) return "—";
  return `$${rate.toFixed(2)}/${type}`;
}

// Calculate projected overage cost
export function calculateOverageCost(
  used: number,
  included: number,
  rate: number
): number {
  const overage = Math.max(0, used - included);
  return overage * rate;
}

// Get next upgrade option within same tier
export function getNextUpgrade(currentSku: PlanSku): PlanLadderStep | null {
  const currentStep = getLadderStep(currentSku);
  if (!currentStep) return null;
  
  const tierSteps = getLadderStepsForTier(currentStep.tier);
  const currentIndex = tierSteps.findIndex((s) => s.sku === currentSku);
  
  if (currentIndex < tierSteps.length - 1) {
    return tierSteps[currentIndex + 1];
  }
  
  return null;
}

// Export the complete pricing config object
export const PRICING_CONFIG = {
  tiers: TIERS,
  ladderSteps: LADDER_STEPS,
  locationAddOns: LOCATION_ADD_ONS,
  includedInAllPlans: INCLUDED_IN_ALL_PLANS,
};
