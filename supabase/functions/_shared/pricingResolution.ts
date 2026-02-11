/**
 * Pricing Resolution Contract
 *
 * Deterministic pricing lookup for dispatch (and other intents).
 * Follows a clear waterfall: pricing rules → service price → unknown (collect inputs)
 */

import { validateRequiredInput } from "./inputValidators.ts";

export interface PricingRule {
  id: string;
  type: "flat" | "per-unit" | "tiered" | "distance-based" | "range-only" | "quote-only" | "package";
  service_id: string | null; // null = applies to all services
  service_name: string;
  required_inputs: string[]; // e.g., ["vehicle_type", "miles"]
  config: {
    flat_price?: number;
    per_unit_price?: number;
    unit_label?: string;       // "hour", "room", "load", etc.
    min_units?: number;
    base_price?: number;
    price_per_mile?: number;
    min_price?: number;
    max_price?: number;
    tiers?: Array<{ min: number; max: number; price: number }>;
    range_min?: number;
    range_max?: number;
    packages?: Array<{ name: string; price: number; description?: string }>;
    trip_fee?: number;         // Flat dollar amount added before service charge
    trip_fee_label?: string;   // "Service Call Fee", "Diagnostic Fee", etc.
  };
}

export interface Service {
  id: string;
  name: string;
  price?: number;
  pricing_type?: "fixed" | "starting_at" | "quote_only";
}

export interface PricingResolutionResult {
  success: boolean;
  price?: number;
  priceRange?: { min: number; max: number };
  priceType: "exact" | "estimate" | "range" | "quote_only" | "unknown";
  reason?: string;
  missingInputs?: Array<{ key: string; label: string; why: string }>;
  deepLink?: string;
  logData?: Record<string, any>;
}

/**
 * Resolve pricing for a dispatch/service request
 *
 * Waterfall logic:
 * 1. Try pricing rules (if inputs valid)
 * 2. Try fixed service price
 * 3. Return unknown + ask for missing inputs
 *
 * @param serviceName - The requested service (e.g., "Towing")
 * @param extractedData - Data extracted from conversation
 * @param pricingRules - Configured pricing rules from pricing_rules_jsonb
 * @param services - Available services from services table
 * @param tenantId - For deep link generation
 * @returns Pricing resolution result with price or missing inputs
 */
export function resolvePricing(
  serviceName: string | null,
  extractedData: Record<string, any>,
  pricingRules: PricingRule[],
  services: Service[],
  tenantId: string
): PricingResolutionResult {
  const logData: Record<string, any> = {
    serviceName,
    extractedData,
    pricingRulesCount: pricingRules.length,
    servicesCount: services.length,
    timestamp: new Date().toISOString()
  };

  // Step 1: Try pricing rules
  const ruleResult = tryPricingRules(serviceName, extractedData, pricingRules);
  if (ruleResult.success) {
    return {
      ...ruleResult,
      logData: { ...logData, method: "pricing_rule", ruleUsed: ruleResult.logData }
    };
  }

  // If pricing rule failed due to missing/invalid inputs, track it
  if (ruleResult.missingInputs && ruleResult.missingInputs.length > 0) {
    logData.missingInputsForPricingRule = ruleResult.missingInputs;
  }

  // Step 2: Try fixed service price
  const serviceResult = tryServicePrice(serviceName, services);
  if (serviceResult.success) {
    return {
      ...serviceResult,
      logData: { ...logData, method: "service_price", serviceUsed: serviceResult.logData }
    };
  }

  // Step 3: Unknown - need more inputs or service configuration
  const missingInputs = ruleResult.missingInputs || [];
  const reason = determineUnknownReason(serviceName, missingInputs, pricingRules, services);
  const deepLink = generateDeepLink(reason, tenantId);

  return {
    success: false,
    priceType: "unknown",
    reason,
    missingInputs,
    deepLink,
    logData: { ...logData, method: "unknown", reason }
  };
}

/**
 * Try to match pricing rules and calculate price
 */
function tryPricingRules(
  serviceName: string | null,
  extractedData: Record<string, any>,
  pricingRules: PricingRule[]
): PricingResolutionResult {
  // Find matching rules (service-specific or global)
  const matchingRules = pricingRules.filter(rule => {
    if (rule.service_id === null) return true; // Global rule
    if (!serviceName) return false;
    return rule.service_name.toLowerCase() === serviceName.toLowerCase();
  });

  if (matchingRules.length === 0) {
    return {
      success: false,
      priceType: "unknown",
      reason: "No pricing rules configured"
    };
  }

  // Try each matching rule
  for (const rule of matchingRules) {
    const ruleResult = evaluatePricingRule(rule, extractedData);
    if (ruleResult.success) {
      return ruleResult;
    }

    // If this rule had missing inputs, track them
    if (ruleResult.missingInputs && ruleResult.missingInputs.length > 0) {
      return ruleResult; // Return with missing inputs info
    }
  }

  return {
    success: false,
    priceType: "unknown",
    reason: "No pricing rules matched"
  };
}

/**
 * Evaluate a single pricing rule
 */
function evaluatePricingRule(
  rule: PricingRule,
  extractedData: Record<string, any>
): PricingResolutionResult {
  // Check if all required inputs are present and valid
  const missingInputs: Array<{ key: string; label: string; why: string }> = [];

  for (const inputKey of rule.required_inputs) {
    const value = extractedData[inputKey];

    if (value === undefined || value === null || value === '') {
      missingInputs.push({
        key: inputKey,
        label: formatLabel(inputKey),
        why: "Required for pricing calculation"
      });
      continue;
    }

    // Validate the input
    const validation = validateRequiredInput(inputKey, String(value));
    if (!validation.valid) {
      missingInputs.push({
        key: inputKey,
        label: formatLabel(inputKey),
        why: validation.reason || "Invalid format"
      });
    }
  }

  // If any inputs are missing or invalid, return early
  if (missingInputs.length > 0) {
    return {
      success: false,
      priceType: "unknown",
      reason: "Missing or invalid required inputs for pricing",
      missingInputs
    };
  }

  // All inputs valid - calculate price based on rule type
  switch (rule.type) {
    case "flat":
      return {
        success: true,
        price: rule.config.flat_price!,
        priceType: "exact",
        logData: { ruleType: "flat", ruleId: rule.id }
      };

    case "per-unit": {
      const rawQty = extractedData.quantity || extractedData.units || extractedData.hours || extractedData.rooms;
      const quantity = parseFloat(String(rawQty) || "1");
      const minUnits = rule.config.min_units || 0;
      const effectiveQty = Math.max(quantity, minUnits);
      const unitPrice = rule.config.per_unit_price!;
      let perUnitTotal = unitPrice * effectiveQty;
      // Enforce min_price
      if (rule.config.min_price && perUnitTotal < rule.config.min_price) {
        perUnitTotal = rule.config.min_price;
      }
      // Add trip fee if configured
      const tripFee = rule.config.trip_fee || 0;
      perUnitTotal += tripFee;
      return {
        success: true,
        price: perUnitTotal,
        priceType: "exact",
        logData: {
          ruleType: "per-unit",
          ruleId: rule.id,
          quantity: effectiveQty,
          unitPrice,
          unitLabel: rule.config.unit_label || "unit",
          tripFee,
        }
      };
    }

    case "distance-based":
      const miles = parseFloat(extractedData.miles || extractedData.estimated_miles || "0");
      if (miles === 0) {
        return {
          success: false,
          priceType: "unknown",
          reason: "Distance required for pricing",
          missingInputs: [{
            key: "miles",
            label: "Distance (Miles)",
            why: "Required to calculate distance-based pricing"
          }]
        };
      }

      const basePrice = rule.config.base_price || 0;
      const pricePerMile = rule.config.price_per_mile || 0;
      const calculatedPrice = basePrice + (miles * pricePerMile);
      const minPrice = rule.config.min_price || 0;
      const maxPrice = rule.config.max_price || Infinity;
      const finalPrice = Math.min(Math.max(calculatedPrice, minPrice), maxPrice);

      return {
        success: true,
        price: finalPrice,
        priceType: "exact",
        logData: {
          ruleType: "distance-based",
          ruleId: rule.id,
          miles,
          basePrice,
          pricePerMile,
          calculatedPrice,
          finalPrice
        }
      };

    case "tiered":
      const tierValue = parseFloat(extractedData.tier_value || extractedData.miles || "0");
      const tiers = rule.config.tiers || [];
      const matchingTier = tiers.find(t => tierValue >= t.min && tierValue <= t.max);

      if (!matchingTier) {
        return {
          success: false,
          priceType: "unknown",
          reason: "Value outside configured tiers"
        };
      }

      return {
        success: true,
        price: matchingTier.price,
        priceType: "exact",
        logData: { ruleType: "tiered", ruleId: rule.id, tierValue, tier: matchingTier }
      };

    case "range-only":
      return {
        success: true,
        priceRange: {
          min: rule.config.range_min!,
          max: rule.config.range_max!
        },
        priceType: "range",
        logData: { ruleType: "range-only", ruleId: rule.id }
      };

    case "quote-only":
      return {
        success: true,
        priceType: "quote_only",
        logData: { ruleType: "quote-only", ruleId: rule.id }
      };

    case "package": {
      const packages = rule.config.packages || [];
      if (packages.length === 0) {
        return {
          success: false,
          priceType: "unknown",
          reason: "No packages configured"
        };
      }
      // If caller specified a package, match it; otherwise return range
      const selectedPackageName = extractedData.package || extractedData.package_name;
      if (selectedPackageName) {
        const matched = packages.find(
          p => p.name.toLowerCase() === String(selectedPackageName).toLowerCase()
        );
        if (matched) {
          const tripFee = rule.config.trip_fee || 0;
          return {
            success: true,
            price: matched.price + tripFee,
            priceType: "exact",
            logData: { ruleType: "package", ruleId: rule.id, packageName: matched.name, tripFee }
          };
        }
      }
      // No specific package selected — return range
      const prices = packages.map(p => p.price);
      const tripFee = rule.config.trip_fee || 0;
      return {
        success: true,
        priceRange: { min: Math.min(...prices) + tripFee, max: Math.max(...prices) + tripFee },
        priceType: "range",
        logData: { ruleType: "package", ruleId: rule.id, packageCount: packages.length, tripFee }
      };
    }

    default:
      return {
        success: false,
        priceType: "unknown",
        reason: "Unknown pricing rule type"
      };
  }
}

/**
 * Try to use fixed service price
 */
function tryServicePrice(
  serviceName: string | null,
  services: Service[]
): PricingResolutionResult {
  if (!serviceName) {
    return {
      success: false,
      priceType: "unknown",
      reason: "No service specified"
    };
  }

  // Find matching service
  const service = services.find(s =>
    s.name.toLowerCase() === serviceName.toLowerCase()
  );

  if (!service) {
    return {
      success: false,
      priceType: "unknown",
      reason: "Service not found"
    };
  }

  if (!service.price) {
    return {
      success: false,
      priceType: "unknown",
      reason: "Service has no price configured"
    };
  }

  // Check pricing type
  if (service.pricing_type === "quote_only") {
    return {
      success: true,
      priceType: "quote_only",
      logData: { method: "service_price", serviceId: service.id, pricingType: "quote_only" }
    };
  }

  if (service.pricing_type === "starting_at") {
    return {
      success: true,
      price: service.price,
      priceType: "estimate",
      logData: { method: "service_price", serviceId: service.id, pricingType: "starting_at" }
    };
  }

  // Default: fixed price
  return {
    success: true,
    price: service.price,
    priceType: "exact",
    logData: { method: "service_price", serviceId: service.id, pricingType: "fixed" }
  };
}

/**
 * Determine why pricing is unknown
 */
function determineUnknownReason(
  serviceName: string | null,
  missingInputs: Array<{ key: string; label: string; why: string }>,
  pricingRules: PricingRule[],
  services: Service[]
): string {
  if (missingInputs.length > 0) {
    const fieldNames = missingInputs.map(mi => mi.label).join(", ");
    return `Missing required information: ${fieldNames}`;
  }

  if (!serviceName) {
    return "Service not specified";
  }

  if (pricingRules.length === 0) {
    return "No pricing rules configured";
  }

  const service = services.find(s => s.name.toLowerCase() === serviceName.toLowerCase());
  if (!service) {
    return `Service "${serviceName}" not found`;
  }

  if (!service.price) {
    return `Service "${serviceName}" has no price configured`;
  }

  return "Unable to determine pricing";
}

/**
 * Generate deep link for pricing configuration
 */
function generateDeepLink(reason: string, tenantId: string): string {
  if (reason.includes("No pricing rules configured")) {
    return `/app/settings?section=pricing-estimates&tab=pricing-rules`;
  }

  if (reason.includes("Service") && reason.includes("not found")) {
    return `/app/services`;
  }

  if (reason.includes("Service") && reason.includes("no price")) {
    return `/app/services`;
  }

  if (reason.includes("Missing required information")) {
    return `/app/settings?section=ai-rules`;
  }

  return `/app/settings?section=pricing-estimates`;
}

/**
 * Format field key as readable label
 */
function formatLabel(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format pricing result for AI voice response
 *
 * Converts PricingResolutionResult into natural language for AI
 */
export function formatPricingForVoice(result: PricingResolutionResult): string {
  if (!result.success) {
    if (result.missingInputs && result.missingInputs.length > 0) {
      const firstMissing = result.missingInputs[0];
      return `I need to collect ${firstMissing.label.toLowerCase()} before I can provide pricing. ${firstMissing.why}`;
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

/**
 * Log pricing resolution failure
 *
 * Logs to console with structured data for debugging
 */
export function logPricingFailure(
  result: PricingResolutionResult,
  context: {
    tenantId: string;
    sessionId?: string;
    intent: string;
  }
): void {
  if (result.success) return; // Don't log successes

  const logEntry = {
    level: "warn",
    message: "Pricing resolution failed",
    reason: result.reason,
    missingInputs: result.missingInputs?.map(mi => mi.key),
    deepLink: result.deepLink,
    context,
    logData: result.logData,
    timestamp: new Date().toISOString()
  };

  console.warn("[PRICING_FAILURE]", JSON.stringify(logEntry, null, 2));
}
