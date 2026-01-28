/**
 * Centralized Pricing Configuration
 * Single source of truth for all pricing throughout the application
 */

// Tier types
export type PlanTier = "sms" | "voice" | "both";

// Ladder SKU codes - each tier has multiple usage levels
export type PlanSku =
  // SMS tier
  | "sms-500" | "sms-1500" | "sms-3500"
  // Voice tier
  | "voice-200" | "voice-600" | "voice-1500"
  // Both tier
  | "both-200-500" | "both-600-1500" | "both-1500-3500";

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

// Tier definitions
export const TIERS: TierInfo[] = [
  {
    tier: "sms",
    displayName: "SMS Instant Respond",
    startingPrice: 129,
    description: "Automated SMS follow-ups for missed calls and new leads",
    shortDescription: "Text-back automation",
    features: [
      "Instant missed call text-back",
      "New lead auto-SMS",
      "Follow-up sequences",
      "Booking link delivery",
      "Smart conversation tracking",
    ],
    icon: "MessageSquare",
  },
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
      "SMS follow-up messages",
      "Multiple routing modes",
    ],
    highlight: true,
    icon: "Phone",
  },
  {
    tier: "both",
    displayName: "Voice + SMS",
    startingPrice: 299,
    description: "Full AI voice + instant text-back for maximum conversion",
    shortDescription: "Complete package",
    features: [
      "Everything in SMS Instant Respond",
      "Everything in AI Voice Receptionist",
      "Combined automation power",
      "Priority support",
      "Advanced analytics",
    ],
    icon: "Sparkles",
  },
];

// Ladder steps for each tier
export const LADDER_STEPS: PlanLadderStep[] = [
  // SMS Tier
  {
    sku: "sms-500",
    tier: "sms",
    name: "SMS 500",
    shortName: "500 segments",
    price: 129,
    includedMinutes: null,
    includedSmsSegments: 500,
    overageMinuteRate: null,
    overageSmsRate: 0.03,
    stripePriceId: null,
    isDefault: true,
  },
  {
    sku: "sms-1500",
    tier: "sms",
    name: "SMS 1500",
    shortName: "1,500 segments",
    price: 149,
    includedMinutes: null,
    includedSmsSegments: 1500,
    overageMinuteRate: null,
    overageSmsRate: 0.03,
    stripePriceId: null,
  },
  {
    sku: "sms-3500",
    tier: "sms",
    name: "SMS 3500",
    shortName: "3,500 segments",
    price: 199,
    includedMinutes: null,
    includedSmsSegments: 3500,
    overageMinuteRate: null,
    overageSmsRate: 0.03,
    stripePriceId: null,
  },

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

  // Both Tier
  {
    sku: "both-200-500",
    tier: "both",
    name: "Voice + SMS Starter",
    shortName: "200 min + 500 SMS",
    price: 299,
    includedMinutes: 200,
    includedSmsSegments: 500,
    overageMinuteRate: 0.35,
    overageSmsRate: 0.03,
    stripePriceId: null,
    isDefault: true,
  },
  {
    sku: "both-600-1500",
    tier: "both",
    name: "Voice + SMS Growth",
    shortName: "600 min + 1,500 SMS",
    price: 399,
    includedMinutes: 600,
    includedSmsSegments: 1500,
    overageMinuteRate: 0.35,
    overageSmsRate: 0.03,
    stripePriceId: null,
  },
  {
    sku: "both-1500-3500",
    tier: "both",
    name: "Voice + SMS Pro",
    shortName: "1,500 min + 3,500 SMS",
    price: 649,
    includedMinutes: 1500,
    includedSmsSegments: 3500,
    overageMinuteRate: 0.35,
    overageSmsRate: 0.03,
    stripePriceId: null,
  },
];

// Location add-ons
export const LOCATION_ADD_ONS = {
  smsOnly: 49, // per month
  voiceOrBoth: 99, // per month
};

// Trial configuration
export const TRIAL_CONFIG = {
  trialDays: 7,
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
  return step?.tier || "sms";
}

export function getLocationAddOnPrice(tier: PlanTier): number {
  return tier === "sms" ? LOCATION_ADD_ONS.smsOnly : LOCATION_ADD_ONS.voiceOrBoth;
}

// Feature entitlement checks based on SKU
export function hasVoiceFeature(sku: PlanSku | null | undefined): boolean {
  if (!sku) return false;
  return sku.startsWith("voice") || sku.startsWith("both");
}

export function hasSmsFeature(sku: PlanSku | null | undefined): boolean {
  if (!sku) return false;
  return sku.startsWith("sms") || sku.startsWith("both");
}

// Legacy compatibility: map old plan codes to new SKUs
export function legacyPlanCodeToDefaultSku(legacyCode: LegacyPlanCode): PlanSku {
  switch (legacyCode) {
    case "text":
      return "sms-500";
    case "voice":
      return "voice-200";
    case "both":
      return "both-200-500";
  }
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
  trialDays: TRIAL_CONFIG.trialDays,
  includedInAllPlans: INCLUDED_IN_ALL_PLANS,
};
