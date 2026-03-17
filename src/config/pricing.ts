/**
 * Centralized Pricing Configuration
 * Single source of truth for all pricing throughout the application
 *
 * PRICING MODEL (Updated Mar 2026):
 * - Starter: $49/mo (50 minutes)
 * - Growth: $99/mo (150 minutes) — default/main plan
 * - Pro: $199/mo (400 minutes)
 * - Multi-location Add-on: $49/mo per additional location
 */

// Plan type - voice only (SMS coming soon)
export type PlanTier = "voice";

// Plan SKU codes
export type PlanSku =
  | "starter-50"     // Starter plan: 50 minutes
  | "growth-150"     // Growth plan: 150 minutes (main plan)
  | "pro-400"        // Pro plan: 400 minutes
  | "enterprise"     // Enterprise: custom (contact sales)
  // Legacy SKUs kept for backward compatibility
  | "base-200"
  | "growth-2000"
  | "scale-5000"
  | "power-10000";

// Legacy plan codes (for backward compatibility during migration)
export type LegacyPlanCode = "text" | "voice" | "both" | "voice-200" | "voice-600" | "voice-1500";

export interface PlanLadderStep {
  sku: PlanSku;
  tier: PlanTier;
  name: string;
  shortName: string;
  price: number;
  includedMinutes: number | null;
  includedSmsSegments: number | null;
  overageMinuteRate: number | null; // dollars per minute
  overageSmsRate: number; // dollars per segment (SMS coming soon)
  stripePriceId: string | null; // Populated after Stripe setup
  isDefault?: boolean; // Default option
  isEnterprise?: boolean; // Requires contact sales
  description?: string; // Plan description
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
    startingPrice: 49,
    description: "AI answers calls 24/7, qualifies leads, books appointments, and handles customer inquiries",
    shortDescription: "AI-powered phone answering",
    features: [
      "AI answers inbound calls 24/7",
      "Dedicated business phone number",
      "Captures customer info automatically",
      "Handles objections naturally",
      "Pushes to booking links",
      "Smart call routing",
      "Business Brain knowledge editor",
    ],
    highlight: true,
    icon: "Phone",
  },
];

// Plan ladder - new tiered pricing
export const LADDER_STEPS: PlanLadderStep[] = [
  {
    sku: "starter-50",
    tier: "voice",
    name: "Starter",
    shortName: "50 minutes",
    description: "Perfect for getting started",
    price: 49,
    includedMinutes: 50,
    includedSmsSegments: null,
    overageMinuteRate: 0.65,
    overageSmsRate: 0,
    stripePriceId: 'price_1TBmpVDb4MCv003YkpwAkiJD',
  },
  {
    sku: "growth-150",
    tier: "voice",
    name: "Growth",
    shortName: "150 minutes",
    description: "For growing businesses",
    price: 99,
    includedMinutes: 150,
    includedSmsSegments: null,
    overageMinuteRate: 0.55,
    overageSmsRate: 0,
    stripePriceId: 'price_1TBmpWDb4MCv003YxgoCjbm4',
    isDefault: true,
  },
  {
    sku: "pro-400",
    tier: "voice",
    name: "Pro",
    shortName: "400 minutes",
    description: "For high-volume businesses",
    price: 199,
    includedMinutes: 400,
    includedSmsSegments: null,
    overageMinuteRate: 0.45,
    overageSmsRate: 0,
    stripePriceId: 'price_1TBmpWDb4MCv003YYlnB72Hb',
  },
  {
    sku: "enterprise",
    tier: "voice",
    name: "Enterprise",
    shortName: "Custom",
    description: "Custom solutions for large organizations",
    price: 0, // Contact sales
    includedMinutes: null,
    includedSmsSegments: null,
    overageMinuteRate: null,
    overageSmsRate: 0,
    stripePriceId: null,
    isEnterprise: true,
  },
];

// Location add-on pricing
export const LOCATION_ADD_ONS = {
  voice: 49, // per month - extra location with dedicated number
};

// What's included in all plans
export const INCLUDED_IN_ALL_PLANS = [
  "Business Brain (knowledge editing, FAQs, services, policies)",
  "Integration syncing (webhook delivery + Google Sheets export)",
  "Handoff delivery for bookings, dispatch, and orders",
  "Multi-tenant dashboard with module gating",
  "Unlimited simultaneous calls",
];

// Helper functions
export function getTierInfo(tier: PlanTier): TierInfo | undefined {
  return TIERS.find((t) => t.tier === tier);
}

export function getLadderStepsForTier(tier: PlanTier): PlanLadderStep[] {
  return LADDER_STEPS.filter((step) => step.tier === tier && !step.isEnterprise);
}

export function getAllLadderSteps(): PlanLadderStep[] {
  return LADDER_STEPS;
}

export function getDefaultStepForTier(tier: PlanTier): PlanLadderStep | undefined {
  return LADDER_STEPS.find((step) => step.tier === tier && step.isDefault);
}

export function getLadderStep(sku: PlanSku | string): PlanLadderStep | undefined {
  // Handle legacy SKUs by mapping to new ones
  const mappedSku = mapLegacyToNewSku(sku);
  return LADDER_STEPS.find((step) => step.sku === mappedSku);
}

export function getTierFromSku(sku: PlanSku | string): PlanTier {
  const step = getLadderStep(sku);
  return step?.tier || "voice";
}

export function getLocationAddOnPrice(_tier: PlanTier): number {
  return LOCATION_ADD_ONS.voice;
}

// Map legacy SKUs to new SKUs
export function mapLegacyToNewSku(sku: string): PlanSku {
  const legacyMap: Record<string, PlanSku> = {
    // Old pricing SKUs -> new equivalents
    "base-200": "growth-150",
    "growth-2000": "pro-400",
    "scale-5000": "pro-400",
    "power-10000": "enterprise",
    // Original legacy codes
    "voice-200": "growth-150",
    "voice-600": "pro-400",
    "voice-1500": "enterprise",
    "voice": "growth-150",
    "text": "starter-50",
    "both": "growth-150",
  };
  return legacyMap[sku] || (sku as PlanSku);
}

// Feature entitlement checks based on SKU - handles both new SKUs and legacy plan codes
export function hasVoiceFeature(sku: string | null | undefined): boolean {
  if (!sku) return false;
  return sku.startsWith("starter") || sku.startsWith("growth") || sku.startsWith("pro") ||
         sku.startsWith("base") || sku.startsWith("scale") ||
         sku.startsWith("power") || sku === "enterprise" ||
         sku.startsWith("voice") || sku.startsWith("both");
}

// SMS feature is enabled when A2P registration is approved for the tenant.
// This function checks the SKU — the actual A2P status check happens at query time
// via the a2p_registrations table (status = 'approved').
export function hasSmsFeature(sku: string | null | undefined): boolean {
  // SMS requires a voice plan (all plans include SMS capability once A2P is approved)
  return hasVoiceFeature(sku);
}

// Get plan family/tier from any SKU (new or legacy)
export function getPlanFamily(sku: string | null | undefined): PlanTier | "unknown" {
  if (!sku) return "unknown";
  if (hasVoiceFeature(sku)) return "voice";
  return "unknown";
}

// Alias for Twilio provisioning checks
export function isEligibleForTwilioProvision(sku: string | null | undefined): boolean {
  return hasVoiceFeature(sku);
}

// Legacy compatibility: map old plan codes to new SKUs
export function legacyPlanCodeToDefaultSku(_legacyCode: LegacyPlanCode): PlanSku {
  return "growth-150";
}

// Format helpers
export function formatPrice(price: number): string {
  if (price === 0) return "Custom";
  return price % 1 === 0 ? `$${price.toLocaleString()}` : `$${price.toFixed(2)}`;
}

export function formatUsageLimit(amount: number | null, type: "minutes" | "segments"): string {
  if (amount === null) return "—";
  return `${amount.toLocaleString()} ${type}`;
}

export function formatOverageRate(rate: number | null, type: "minute" | "segment"): string {
  if (rate === null) return "Contact sales";
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
export function getNextUpgrade(currentSku: PlanSku | string): PlanLadderStep | null {
  const mappedSku = mapLegacyToNewSku(currentSku);
  const currentStep = getLadderStep(mappedSku);
  if (!currentStep) return null;

  const tierSteps = getLadderStepsForTier(currentStep.tier);
  const currentIndex = tierSteps.findIndex((s) => s.sku === mappedSku);

  if (currentIndex < tierSteps.length - 1) {
    return tierSteps[currentIndex + 1];
  }

  return null;
}

// Calculate total monthly cost including locations
export function calculateMonthlyTotal(sku: PlanSku, additionalLocations: number = 0): number {
  const step = getLadderStep(sku);
  if (!step || step.isEnterprise) return 0;

  return step.price + (additionalLocations * LOCATION_ADD_ONS.voice);
}

// Check if a plan requires contacting sales
export function requiresSalesContact(sku: PlanSku): boolean {
  const step = getLadderStep(sku);
  return step?.isEnterprise || false;
}

// Trial configuration
export const TRIAL_CONFIG = {
  duration_days: 7,
  included_minutes: 50,
  card_required: false,
} as const;

// Export the complete pricing config object
export const PRICING_CONFIG = {
  tiers: TIERS,
  ladderSteps: LADDER_STEPS,
  locationAddOns: LOCATION_ADD_ONS,
  includedInAllPlans: INCLUDED_IN_ALL_PLANS,
};
// force rebuild 1773779323
