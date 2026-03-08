/**
 * Pricing Models
 *
 * Industry-appropriate pricing models that help business owners
 * set prices during onboarding in terms they understand.
 *
 * Each model describes how an industry typically prices,
 * provides sensible defaults, and maps to existing price types
 * in the services table (fixed | starting_at | quote_only).
 */

import type { BusinessMode } from "@/hooks/useTenantConfig";

export type PricingModelType =
  | "hourly_plus_parts"
  | "vehicle_size_tiers"
  | "fixed_menu"
  | "distance_based"
  | "fixed_service"
  | "consultation_first"
  | "per_unit";

export interface PricingModel {
  type: PricingModelType;
  /** User-facing label */
  label: string;
  /** One-line description */
  description: string;
  /** Typical price range for this model */
  typicalRange?: string;
  /** Does the user set a base hourly/unit rate? */
  hasBaseRate?: boolean;
  /** Label for the base rate input */
  baseRateLabel?: string;
  /** Placeholder for base rate input */
  baseRatePlaceholder?: string;
  /** Hint text shown below the rate input */
  baseRateHint?: string;
  /** The default priceType for new services in this model */
  defaultPriceType: "fixed" | "starting_at" | "quote_only";
}

// ─── Model Definitions ─────────────────────────────────────────────────────

const HOURLY_PLUS_PARTS: PricingModel = {
  type: "hourly_plus_parts",
  label: "Hourly labor + parts",
  description: "You charge a labor rate per hour, plus the cost of parts and materials",
  typicalRange: "$75 - $175/hr for labor",
  hasBaseRate: true,
  baseRateLabel: "Your hourly labor rate",
  baseRatePlaceholder: "95",
  baseRateHint: "Most shops in your industry charge $75-$175/hr",
  defaultPriceType: "starting_at",
};

const VEHICLE_SIZE_TIERS: PricingModel = {
  type: "vehicle_size_tiers",
  label: "Price by vehicle size",
  description: "Base price varies by vehicle type — sedan, SUV, truck, etc.",
  typicalRange: "Sedan $X, SUV $Y, Truck $Z",
  hasBaseRate: false,
  defaultPriceType: "starting_at",
};

const FIXED_MENU: PricingModel = {
  type: "fixed_menu",
  label: "Fixed menu prices",
  description: "Each item has a set price on the menu",
  hasBaseRate: false,
  defaultPriceType: "fixed",
};

const DISTANCE_BASED: PricingModel = {
  type: "distance_based",
  label: "Base fee + per-mile",
  description: "Flat hookup/base fee plus a per-mile charge for distance",
  typicalRange: "$75-$150 base + $3-$7/mile",
  hasBaseRate: true,
  baseRateLabel: "Base fee (hookup/dispatch)",
  baseRatePlaceholder: "95",
  baseRateHint: "This is the minimum charge before mileage",
  defaultPriceType: "starting_at",
};

const FIXED_SERVICE: PricingModel = {
  type: "fixed_service",
  label: "Fixed price per service",
  description: "Each service has a set price and duration",
  hasBaseRate: false,
  defaultPriceType: "fixed",
};

const CONSULTATION_FIRST: PricingModel = {
  type: "consultation_first",
  label: "Consultation, then quote",
  description: "Free or low-cost initial consultation, then provide a custom quote",
  hasBaseRate: false,
  defaultPriceType: "quote_only",
};

const PER_UNIT: PricingModel = {
  type: "per_unit",
  label: "Per-unit pricing",
  description: "Prices based on units like square footage, number of rooms, etc.",
  hasBaseRate: false,
  defaultPriceType: "starting_at",
};

// ─── Industry → Model Mapping ──────────────────────────────────────────────

/**
 * Maps industry slugs to their most natural pricing model.
 * Falls back to mode-based defaults.
 */
const INDUSTRY_PRICING_MODELS: Record<string, PricingModelType> = {
  // Auto services — hourly + parts
  "auto_repair": "hourly_plus_parts",
  "auto-repair": "hourly_plus_parts",
  "transmission_shop": "hourly_plus_parts",
  "engine_repair": "hourly_plus_parts",
  "brake_shop": "hourly_plus_parts",
  "muffler_shop": "hourly_plus_parts",
  "body_shop": "hourly_plus_parts",
  "auto_glass": "hourly_plus_parts",

  // Detailing — vehicle size tiers
  "auto_detailing": "vehicle_size_tiers",
  "auto-detailing": "vehicle_size_tiers",
  "car_wash": "vehicle_size_tiers",

  // Towing — distance-based
  "towing": "distance_based",
  "roadside_assistance": "distance_based",

  // Home services — hourly + parts or per-unit
  "plumbing": "hourly_plus_parts",
  "hvac": "hourly_plus_parts",
  "electrical": "hourly_plus_parts",
  "appliance_repair": "hourly_plus_parts",
  "general_contractor": "consultation_first",
  "roofing": "consultation_first",
  "painting": "per_unit",
  "landscaping": "per_unit",
  "cleaning": "per_unit",
  "pool_service": "fixed_service",
  "pest_control": "fixed_service",
  "moving": "hourly_plus_parts",

  // Beauty/wellness — fixed service
  "salon": "fixed_service",
  "barbershop": "fixed_service",
  "nail_salon": "fixed_service",
  "spa": "fixed_service",
  "medspa": "fixed_service",
  "massage": "fixed_service",
  "pet_grooming": "fixed_service",

  // Medical — fixed service
  "dental": "fixed_service",
  "chiropractic": "fixed_service",
  "optometry": "fixed_service",
  "physical_therapy": "fixed_service",
  "veterinary": "fixed_service",

  // Food — fixed menu
  "pizza": "fixed_menu",
  "pizzeria": "fixed_menu",
  "chinese_restaurant": "fixed_menu",
  "indian_restaurant": "fixed_menu",
  "mexican_restaurant": "fixed_menu",
  "italian_restaurant": "fixed_menu",
  "bakery": "fixed_menu",
  "cafe": "fixed_menu",
  "deli": "fixed_menu",
  "food_truck": "fixed_menu",

  // General / professional — consultation
  "law_firm": "consultation_first",
  "accounting": "consultation_first",
  "real_estate": "consultation_first",
  "insurance": "consultation_first",
  "consulting": "consultation_first",
};

/** Default pricing model per business mode when industry slug isn't matched */
const MODE_DEFAULT_MODELS: Record<BusinessMode, PricingModelType> = {
  service: "fixed_service",
  dispatch: "distance_based",
  food: "fixed_menu",
  medical: "fixed_service",
  general: "consultation_first",
  sales: "consultation_first",
};

// ─── Model Registry ────────────────────────────────────────────────────────

const ALL_MODELS: Record<PricingModelType, PricingModel> = {
  hourly_plus_parts: HOURLY_PLUS_PARTS,
  vehicle_size_tiers: VEHICLE_SIZE_TIERS,
  fixed_menu: FIXED_MENU,
  distance_based: DISTANCE_BASED,
  fixed_service: FIXED_SERVICE,
  consultation_first: CONSULTATION_FIRST,
  per_unit: PER_UNIT,
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get the recommended pricing model for an industry.
 * Falls back to mode-based default.
 */
export function getPricingModel(
  mode: BusinessMode,
  industrySlug?: string,
): PricingModel {
  const modelType = (industrySlug && INDUSTRY_PRICING_MODELS[industrySlug])
    || MODE_DEFAULT_MODELS[mode]
    || "fixed_service";

  return ALL_MODELS[modelType];
}

/**
 * Get all available pricing models (for a selector UI).
 */
export function getAllPricingModels(): PricingModel[] {
  return Object.values(ALL_MODELS);
}

/**
 * Get a pricing model by type.
 */
export function getPricingModelByType(type: PricingModelType): PricingModel {
  return ALL_MODELS[type] || ALL_MODELS.fixed_service;
}
