/**
 * Centralized Pricing Configuration
 * Single source of truth for all pricing throughout the application
 * 
 * NEW PRICING MODEL:
 * - Base Plan: AI Voice Receptionist Platform ($249/mo, 200 pooled minutes, 1 location)
 * - Minute Bundles: Growth (2,000), Scale (5,000), Power (10,000), Enterprise (20,000+)
 * - Multi-location Add-on: $99/mo per additional location
 * - Top-ups: Optional minute purchases
 */

// Plan type - voice only (SMS coming soon)
export type PlanTier = "voice";

// Plan SKU codes - Base + Bundles
export type PlanSku =
  | "base-200"       // Base plan: 200 minutes
  | "growth-2000"    // Growth bundle: 2,000 minutes
  | "scale-5000"     // Scale bundle: 5,000 minutes  
  | "power-10000"    // Power bundle: 10,000 minutes
  | "enterprise";    // Enterprise: 20,000+ (contact sales)

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

export interface TopUpOption {
  id: string;
  minutes: number;
  price: number;
  savings?: string; // e.g., "Save 10%"
}

// Tier definitions - Only Voice tier available (SMS coming soon)
export const TIERS: TierInfo[] = [
  {
    tier: "voice",
    displayName: "AI Voice Receptionist Platform",
    startingPrice: 249,
    description: "AI answers calls 24/7, qualifies leads, books appointments, and handles customer inquiries",
    shortDescription: "AI-powered phone answering",
    features: [
      "AI answers inbound calls 24/7",
      "200 pooled minutes included",
      "1 location with dedicated number",
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

// Minute bundle plans - pooled across all locations
export const LADDER_STEPS: PlanLadderStep[] = [
  {
    sku: "base-200",
    tier: "voice",
    name: "Platform Base",
    shortName: "200 minutes",
    description: "Perfect for getting started",
    price: 249,
    includedMinutes: 200,
    includedSmsSegments: null,
    overageMinuteRate: 0.55,
    overageSmsRate: 0,
    stripePriceId: null,
    isDefault: true,
  },
  {
    sku: "growth-2000",
    tier: "voice",
    name: "Growth Minutes",
    shortName: "2,000 minutes",
    description: "For growing businesses",
    price: 799,
    includedMinutes: 2000,
    includedSmsSegments: null,
    overageMinuteRate: 0.45,
    overageSmsRate: 0,
    stripePriceId: null,
  },
  {
    sku: "scale-5000",
    tier: "voice",
    name: "Scale Minutes",
    shortName: "5,000 minutes",
    description: "For high-volume operations",
    price: 1699,
    includedMinutes: 5000,
    includedSmsSegments: null,
    overageMinuteRate: 0.35,
    overageSmsRate: 0,
    stripePriceId: null,
  },
  {
    sku: "power-10000",
    tier: "voice",
    name: "Power Minutes",
    shortName: "10,000 minutes",
    description: "For enterprise-level needs",
    price: 2999,
    includedMinutes: 10000,
    includedSmsSegments: null,
    overageMinuteRate: 0.29,
    overageSmsRate: 0,
    stripePriceId: null,
  },
  {
    sku: "enterprise",
    tier: "voice",
    name: "Enterprise",
    shortName: "20,000+ minutes",
    description: "Custom solutions for large organizations",
    price: 0, // Contact sales
    includedMinutes: 20000,
    includedSmsSegments: null,
    overageMinuteRate: null,
    overageSmsRate: 0,
    stripePriceId: null,
    isEnterprise: true,
  },
];

// Location add-on pricing
export const LOCATION_ADD_ONS = {
  voice: 99, // per month - extra location with dedicated number
};

// Top-up options for purchasing additional minutes
export const TOP_UP_OPTIONS: TopUpOption[] = [
  { id: "topup-500", minutes: 500, price: 249 },
  { id: "topup-2000", minutes: 2000, price: 799, savings: "Save 20%" },
  { id: "topup-5000", minutes: 5000, price: 1699, savings: "Save 32%" },
];

// Auto top-up threshold (triggers when below this many minutes)
export const AUTO_TOPUP_THRESHOLD = 200;
export const AUTO_TOPUP_AMOUNT = 2000; // Minutes added when auto top-up triggers

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
    "voice-200": "base-200",
    "voice-600": "growth-2000",
    "voice-1500": "scale-5000",
    "voice": "base-200",
    "text": "base-200",
    "both": "base-200",
  };
  return legacyMap[sku] || (sku as PlanSku);
}

// Feature entitlement checks based on SKU - handles both new SKUs and legacy plan codes
export function hasVoiceFeature(sku: string | null | undefined): boolean {
  if (!sku) return false;
  return sku.startsWith("base") || sku.startsWith("growth") || sku.startsWith("scale") || 
         sku.startsWith("power") || sku === "enterprise" ||
         sku.startsWith("voice") || sku.startsWith("both");
}

// SMS feature is disabled / coming soon - always returns false
export function hasSmsFeature(_sku: string | null | undefined): boolean {
  return false;
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

// Legacy compatibility: map old plan codes to new SKUs - all map to base now
export function legacyPlanCodeToDefaultSku(_legacyCode: LegacyPlanCode): PlanSku {
  return "base-200";
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

// Get top-up option by ID
export function getTopUpOption(id: string): TopUpOption | undefined {
  return TOP_UP_OPTIONS.find((t) => t.id === id);
}

// Check if a plan requires contacting sales
export function requiresSalesContact(sku: PlanSku): boolean {
  const step = getLadderStep(sku);
  return step?.isEnterprise || false;
}

// Export the complete pricing config object
export const PRICING_CONFIG = {
  tiers: TIERS,
  ladderSteps: LADDER_STEPS,
  locationAddOns: LOCATION_ADD_ONS,
  topUpOptions: TOP_UP_OPTIONS,
  includedInAllPlans: INCLUDED_IN_ALL_PLANS,
  autoTopUpThreshold: AUTO_TOPUP_THRESHOLD,
  autoTopUpAmount: AUTO_TOPUP_AMOUNT,
};
