/**
 * Rules Apply Module for Quote Engine
 *
 * Applies pricing rules to calculate the final quote price.
 * Handles two types of rules:
 * 1. Simple modifiers (surcharge/discount/fee) from pricing_rules_json
 * 2. Advanced rules (flat/per-unit/tiered/distance-based) from pricing_rules_jsonb
 *
 * @see supabase/functions/_shared/pricingResolution.ts for server-side logic
 */

import type { PricingRule as SimpleRule } from "@/hooks/usePricingRules";

// Advanced pricing rule types (from pricing_rules_jsonb)
export type AdvancedRuleType =
  | "flat"
  | "per-unit"
  | "tiered"
  | "distance-based"
  | "range-only"
  | "quote-only";

export interface AdvancedPricingRule {
  id: string;
  type: AdvancedRuleType;
  service_id: string | null; // null = applies to all services
  service_name: string;
  required_inputs: string[]; // e.g., ["vehicle_type", "miles"]
  config: {
    flat_price?: number;
    per_unit_price?: number;
    base_price?: number;
    price_per_mile?: number;
    min_price?: number;
    max_price?: number;
    tiers?: Array<{ min: number; max: number; price: number }>;
    range_min?: number;
    range_max?: number;
  };
}

export interface Service {
  id: string;
  name: string;
  price_amount: number | null;
  price_type: "fixed" | "starting_at" | "quote_only";
  duration_minutes?: number;
}

export interface RulesApplyResult {
  success: boolean;
  price?: number;
  priceRange?: { min: number; max: number };
  priceType: "exact" | "estimate" | "range" | "quote_only" | "unknown";
  reason?: string;
  missingInputs?: Array<{ key: string; label: string; why: string }>;
  appliedModifiers?: {
    name: string;
    type: "surcharge" | "discount" | "fee";
    amount: number;
  }[];
  breakdown?: {
    basePrice: number;
    modifiersTotal: number;
    finalPrice: number;
  };
}

export interface ExtractedAnswers {
  miles?: number;
  estimated_miles?: number;
  quantity?: number;
  tier_value?: number;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Apply pricing rules to determine the quote price.
 *
 * Waterfall Logic:
 * 1. Try advanced pricing rules (if inputs are valid)
 * 2. Fall back to service base price
 * 3. Apply simple modifier rules (surcharge/discount/fee)
 * 4. Return unknown if no pricing can be determined
 *
 * @param serviceName - The requested service name
 * @param serviceId - The service ID (for scoped rules)
 * @param answers - Extracted data from conversation
 * @param advancedRules - Rules from pricing_rules_jsonb
 * @param simpleRules - Modifier rules from pricing_rules_json
 * @param services - Available services from services table
 */
export function applyRules(
  serviceName: string | null,
  serviceId: string | null,
  answers: ExtractedAnswers,
  advancedRules: AdvancedPricingRule[],
  simpleRules: SimpleRule[],
  services: Service[]
): RulesApplyResult {
  // Step 1: Try to get base price from advanced rules
  const advancedResult = tryAdvancedRules(serviceName, serviceId, answers, advancedRules);

  if (advancedResult.success && advancedResult.priceType !== "unknown") {
    // If we got a price from advanced rules, apply simple modifiers
    if (advancedResult.price !== undefined) {
      return applySimpleModifiers(advancedResult, serviceId, simpleRules);
    }
    // Range or quote_only - return as-is
    return advancedResult;
  }

  // Step 2: Fall back to service base price
  const serviceResult = tryServicePrice(serviceName, services);

  if (serviceResult.success) {
    // Apply simple modifiers to service base price
    if (serviceResult.price !== undefined) {
      return applySimpleModifiers(serviceResult, serviceId, simpleRules);
    }
    // Quote only - return as-is
    return serviceResult;
  }

  // Step 3: If we had missing inputs from advanced rules, return that
  if (advancedResult.missingInputs && advancedResult.missingInputs.length > 0) {
    return advancedResult;
  }

  // Step 4: Unknown - no pricing available
  return {
    success: false,
    priceType: "unknown",
    reason: determineUnknownReason(serviceName, advancedRules, services),
  };
}

/**
 * Try to calculate price from advanced rules
 */
function tryAdvancedRules(
  serviceName: string | null,
  serviceId: string | null,
  answers: ExtractedAnswers,
  rules: AdvancedPricingRule[]
): RulesApplyResult {
  // Find matching rules (service-specific first, then global)
  const matchingRules = rules.filter((rule) => {
    if (rule.service_id === null) return true; // Global rule
    if (serviceId && rule.service_id === serviceId) return true;
    if (!serviceName) return false;
    return rule.service_name.toLowerCase() === serviceName.toLowerCase();
  });

  // Sort so service-specific rules come first
  matchingRules.sort((a, b) => {
    if (a.service_id !== null && b.service_id === null) return -1;
    if (a.service_id === null && b.service_id !== null) return 1;
    return 0;
  });

  if (matchingRules.length === 0) {
    return {
      success: false,
      priceType: "unknown",
      reason: "No pricing rules configured",
    };
  }

  // Try each matching rule
  for (const rule of matchingRules) {
    const result = evaluateAdvancedRule(rule, answers);
    if (result.success) {
      return result;
    }
    // If this rule had missing inputs, return it (to ask for the data)
    if (result.missingInputs && result.missingInputs.length > 0) {
      return result;
    }
  }

  return {
    success: false,
    priceType: "unknown",
    reason: "No pricing rules matched",
  };
}

/**
 * Evaluate a single advanced pricing rule
 */
function evaluateAdvancedRule(
  rule: AdvancedPricingRule,
  answers: ExtractedAnswers
): RulesApplyResult {
  // Check required inputs
  const missingInputs: Array<{ key: string; label: string; why: string }> = [];

  for (const inputKey of rule.required_inputs) {
    const value = answers[inputKey];
    if (value === undefined || value === null || value === "") {
      missingInputs.push({
        key: inputKey,
        label: formatLabel(inputKey),
        why: "Required for pricing calculation",
      });
    }
  }

  if (missingInputs.length > 0) {
    return {
      success: false,
      priceType: "unknown",
      reason: "Missing required inputs for pricing",
      missingInputs,
    };
  }

  // Calculate price based on rule type
  switch (rule.type) {
    case "flat":
      return {
        success: true,
        price: rule.config.flat_price!,
        priceType: "exact",
      };

    case "per-unit": {
      const quantity = Number(answers.quantity || 1);
      return {
        success: true,
        price: rule.config.per_unit_price! * quantity,
        priceType: "exact",
      };
    }

    case "distance-based": {
      const miles = Number(answers.miles || answers.estimated_miles || 0);
      if (miles === 0) {
        return {
          success: false,
          priceType: "unknown",
          reason: "Distance required for pricing",
          missingInputs: [
            {
              key: "miles",
              label: "Distance (Miles)",
              why: "Required to calculate distance-based pricing",
            },
          ],
        };
      }

      const basePrice = rule.config.base_price || 0;
      const pricePerMile = rule.config.price_per_mile || 0;
      const calculatedPrice = basePrice + miles * pricePerMile;
      const minPrice = rule.config.min_price || 0;
      const maxPrice = rule.config.max_price || Infinity;
      const finalPrice = Math.min(Math.max(calculatedPrice, minPrice), maxPrice);

      return {
        success: true,
        price: finalPrice,
        priceType: "exact",
      };
    }

    case "tiered": {
      const tierValue = Number(answers.tier_value || answers.miles || 0);
      const tiers = rule.config.tiers || [];
      const matchingTier = tiers.find(
        (t) => tierValue >= t.min && tierValue <= t.max
      );

      if (!matchingTier) {
        return {
          success: false,
          priceType: "unknown",
          reason: "Value outside configured tiers",
        };
      }

      return {
        success: true,
        price: matchingTier.price,
        priceType: "exact",
      };
    }

    case "range-only":
      return {
        success: true,
        priceRange: {
          min: rule.config.range_min!,
          max: rule.config.range_max!,
        },
        priceType: "range",
      };

    case "quote-only":
      return {
        success: true,
        priceType: "quote_only",
      };

    default:
      return {
        success: false,
        priceType: "unknown",
        reason: "Unknown pricing rule type",
      };
  }
}

/**
 * Try to get price from service base price
 */
function tryServicePrice(
  serviceName: string | null,
  services: Service[]
): RulesApplyResult {
  if (!serviceName) {
    return {
      success: false,
      priceType: "unknown",
      reason: "No service specified",
    };
  }

  const service = services.find(
    (s) => s.name.toLowerCase() === serviceName.toLowerCase()
  );

  if (!service) {
    return {
      success: false,
      priceType: "unknown",
      reason: "Service not found",
    };
  }

  if (service.price_amount === null) {
    return {
      success: false,
      priceType: "unknown",
      reason: "Service has no price configured",
    };
  }

  if (service.price_type === "quote_only") {
    return {
      success: true,
      priceType: "quote_only",
    };
  }

  if (service.price_type === "starting_at") {
    return {
      success: true,
      price: service.price_amount,
      priceType: "estimate",
    };
  }

  // Default: fixed price
  return {
    success: true,
    price: service.price_amount,
    priceType: "exact",
  };
}

/**
 * Apply simple modifier rules (surcharge/discount/fee) to a base result
 */
function applySimpleModifiers(
  baseResult: RulesApplyResult,
  serviceId: string | null,
  simpleRules: SimpleRule[]
): RulesApplyResult {
  if (baseResult.price === undefined) {
    return baseResult;
  }

  // Get applicable rules (active, global or service-scoped)
  const applicableRules = simpleRules.filter((rule) => {
    if (!rule.is_active) return false;
    if (rule.service_id === null) return true; // Global
    if (serviceId && rule.service_id === serviceId) return true;
    return false;
  });

  if (applicableRules.length === 0) {
    return baseResult;
  }

  let adjustedPrice = baseResult.price;
  const appliedModifiers: RulesApplyResult["appliedModifiers"] = [];

  for (const rule of applicableRules) {
    let modifierAmount = 0;

    if (rule.amount_type === "percent") {
      modifierAmount = (adjustedPrice * rule.amount) / 100;
    } else {
      modifierAmount = rule.amount;
    }

    switch (rule.type) {
      case "surcharge":
        adjustedPrice += modifierAmount;
        break;
      case "discount":
        adjustedPrice -= modifierAmount;
        break;
      case "fee":
        adjustedPrice += modifierAmount;
        break;
    }

    appliedModifiers.push({
      name: rule.name,
      type: rule.type,
      amount: modifierAmount,
    });
  }

  // Ensure price doesn't go negative
  adjustedPrice = Math.max(0, adjustedPrice);

  return {
    ...baseResult,
    price: adjustedPrice,
    appliedModifiers,
    breakdown: {
      basePrice: baseResult.price,
      modifiersTotal: adjustedPrice - baseResult.price,
      finalPrice: adjustedPrice,
    },
  };
}

/**
 * Determine why pricing is unknown
 */
function determineUnknownReason(
  serviceName: string | null,
  advancedRules: AdvancedPricingRule[],
  services: Service[]
): string {
  if (!serviceName) {
    return "Service not specified";
  }

  if (advancedRules.length === 0) {
    const service = services.find(
      (s) => s.name.toLowerCase() === serviceName.toLowerCase()
    );
    if (!service) {
      return `Service "${serviceName}" not found`;
    }
    if (service.price_amount === null) {
      return `Service "${serviceName}" has no price configured`;
    }
  }

  return "Unable to determine pricing";
}

/**
 * Format field key as readable label
 */
function formatLabel(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Format pricing result for AI voice response
 */
export function formatPricingForVoice(result: RulesApplyResult): string {
  if (!result.success) {
    if (result.missingInputs && result.missingInputs.length > 0) {
      const firstMissing = result.missingInputs[0];
      return `I need to collect ${firstMissing.label.toLowerCase()} before I can provide pricing.`;
    }
    return `I'm unable to provide pricing at this time. ${result.reason || "Please contact us directly for a quote."}`;
  }

  switch (result.priceType) {
    case "exact":
      return `That will be $${result.price!.toFixed(2)}.`;
    case "estimate":
      return `That starts at $${result.price!.toFixed(2)}.`;
    case "range":
      return `That will be between $${result.priceRange!.min.toFixed(2)} and $${result.priceRange!.max.toFixed(2)}.`;
    case "quote_only":
      return "We'll need to provide a custom quote for that. Let me get your information and we'll follow up with pricing.";
    default:
      return "Let me get your information and we'll provide pricing.";
  }
}
