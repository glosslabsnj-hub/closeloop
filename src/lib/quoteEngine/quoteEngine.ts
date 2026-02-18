/**
 * Quote Engine - Deterministic Quoting for Voxly
 *
 * This is the main entry point for the quote calculation system.
 * It orchestrates area checking, pricing rules, and provides safe fallbacks.
 *
 * USAGE:
 * ```typescript
 * const result = await getQuote({
 *   tenantId: "...",
 *   serviceId: "...",
 *   serviceName: "Towing",
 *   customerLocation: { zip: "90210", state: "CA" },
 *   answers: { miles: 15 }
 * });
 * ```
 *
 * OUTPUTS:
 * - quoteType: "exact" | "estimate" | "range" | "quote_only" | "out_of_area" | "unknown"
 * - price: number | undefined
 * - priceRange: { min, max } | undefined
 * - voiceScript: Human-readable text for AI
 * - nextQuestion: What to ask next (if incomplete)
 * - deepLink: Where owner can configure pricing
 *
 * @see docs/refactors/REFACTOR_STEP4_QUOTE_ENGINE.md for full spec
 */

import type { ServiceAreaConfig } from "@/hooks/useServiceArea";
import type { PricingRule as SimpleRule } from "@/hooks/usePricingRules";
import {
  checkArea,
  type CustomerLocation,
  type AreaCheckResult,
  formatAreaCheckForVoice,
} from "./areaCheck";
import {
  applyRules,
  formatPricingForVoice,
  type AdvancedPricingRule,
  type Service,
  type ExtractedAnswers,
  type RulesApplyResult,
} from "./rulesApply";

// ============================================================================
// TYPES
// ============================================================================

export type QuoteType =
  | "exact"
  | "estimate"
  | "range"
  | "quote_only"
  | "out_of_area"
  | "unknown";

export interface QuoteInput {
  /** The tenant ID */
  tenantId: string;
  /** The service ID (if known) */
  serviceId?: string | null;
  /** The service name (if known) */
  serviceName?: string | null;
  /** Customer location data (may be partial) */
  customerLocation: CustomerLocation;
  /** Extracted answers from conversation */
  answers: ExtractedAnswers;
}

export interface QuoteContext {
  /** Service area config from tenants.service_area_json */
  serviceArea: ServiceAreaConfig | null;
  /** Advanced pricing rules from tenants.pricing_rules_jsonb */
  advancedRules: AdvancedPricingRule[];
  /** Simple modifier rules from tenants.pricing_rules_json */
  simpleRules: SimpleRule[];
  /** Available services from services table */
  services: Service[];
}

export interface QuoteResult {
  /** The type of quote result */
  quoteType: QuoteType;
  /** Was the quote calculation successful? */
  success: boolean;
  /** The calculated price (for exact/estimate types) */
  price?: number;
  /** Price range (for range type) */
  priceRange?: { min: number; max: number };
  /** Human-readable text for AI voice response */
  voiceScript: string;
  /** What question to ask next (if inputs are missing) */
  nextQuestion?: {
    key: string;
    label: string;
    askPrompt: string;
  };
  /** Why the quote couldn't be calculated */
  reason?: string;
  /** Deep link for owner to configure pricing */
  deepLink?: string;
  /** Applied modifiers breakdown (if any) */
  appliedModifiers?: RulesApplyResult["appliedModifiers"];
  /** Price breakdown (if modifiers were applied) */
  breakdown?: RulesApplyResult["breakdown"];
  /** Area check result */
  areaCheck: AreaCheckResult;
  /** Pricing result (before combining with area check) */
  pricingResult: RulesApplyResult;
  /** Timestamp of calculation */
  calculatedAt: string;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Calculate a quote for a service request.
 *
 * This is the main entry point for deterministic quoting.
 *
 * WATERFALL LOGIC:
 * 1. Check if location is serviceable (area check)
 *    → If out of area → return "out_of_area"
 *    → If missing location info → add to nextQuestion
 * 2. Apply pricing rules (advanced rules → service price → modifiers)
 *    → If price calculated → return "exact" / "estimate" / "range"
 *    → If quote only → return "quote_only"
 *    → If missing inputs → add to nextQuestion
 * 3. If nothing works → return "unknown" with deep link
 *
 * @param input - Quote input (service, location, answers)
 * @param context - Pricing context (rules, services, area config)
 * @returns QuoteResult with price/script/next question
 */
export function getQuote(input: QuoteInput, context: QuoteContext): QuoteResult {
  const { serviceId, serviceName, customerLocation, answers, tenantId } = input;
  const { serviceArea, advancedRules, simpleRules, services } = context;

  // --------------------------------------------------------
  // Step 1: Area Check
  // --------------------------------------------------------
  const areaResult = checkArea(serviceArea, customerLocation);

  // If location is explicitly NOT serviceable, return out_of_area
  if (!areaResult.serviceable && !areaResult.missingInfo?.length) {
    return {
      quoteType: "out_of_area",
      success: false,
      voiceScript: formatAreaCheckForVoice(areaResult),
      reason: areaResult.reason,
      areaCheck: areaResult,
      pricingResult: {
        success: false,
        priceType: "unknown",
        reason: "Location out of service area",
      },
      deepLink: "/app/brain#service-area",
      calculatedAt: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------
  // Step 2: Apply Pricing Rules
  // --------------------------------------------------------
  const pricingResult = applyRules(
    serviceName || null,
    serviceId || null,
    answers,
    advancedRules,
    simpleRules,
    services
  );

  // --------------------------------------------------------
  // Step 3: Combine Results
  // --------------------------------------------------------

  // Determine what question to ask next (area info takes priority)
  let nextQuestion: QuoteResult["nextQuestion"] | undefined;

  // If area check needs info, ask for that first
  if (areaResult.missingInfo && areaResult.missingInfo.length > 0) {
    const first = areaResult.missingInfo[0];
    nextQuestion = {
      key: first.key,
      label: first.label,
      askPrompt: first.askPrompt,
    };
  }
  // Otherwise, if pricing needs inputs
  else if (pricingResult.missingInputs && pricingResult.missingInputs.length > 0) {
    const first = pricingResult.missingInputs[0];
    nextQuestion = {
      key: first.key,
      label: first.label,
      askPrompt: `What is the ${first.label.toLowerCase()}?`,
    };
  }

  // Build voice script
  let voiceScript: string;

  if (!pricingResult.success) {
    // Pricing failed
    if (nextQuestion) {
      voiceScript = nextQuestion.askPrompt;
    } else {
      voiceScript = formatPricingForVoice(pricingResult);
    }
  } else {
    // Pricing succeeded
    voiceScript = formatPricingForVoice(pricingResult);
  }

  // Map pricing result type to quote type
  let quoteType: QuoteType;
  switch (pricingResult.priceType) {
    case "exact":
      quoteType = "exact";
      break;
    case "estimate":
      quoteType = "estimate";
      break;
    case "range":
      quoteType = "range";
      break;
    case "quote_only":
      quoteType = "quote_only";
      break;
    default:
      quoteType = "unknown";
  }

  // Generate deep link based on what's missing
  const deepLink = generateDeepLink(pricingResult, serviceName, tenantId);

  return {
    quoteType,
    success: pricingResult.success,
    price: pricingResult.price,
    priceRange: pricingResult.priceRange,
    voiceScript,
    nextQuestion,
    reason: pricingResult.reason,
    deepLink,
    appliedModifiers: pricingResult.appliedModifiers,
    breakdown: pricingResult.breakdown,
    areaCheck: areaResult,
    pricingResult,
    calculatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate deep link for owner to configure pricing
 */
function generateDeepLink(
  result: RulesApplyResult,
  serviceName: string | null | undefined,
  _tenantId: string
): string {
  const reason = result.reason || "";

  if (reason.includes("No pricing rules configured")) {
    return "/app/brain#services";
  }

  if (reason.includes("not found") && serviceName) {
    return "/app/brain#services";
  }

  if (reason.includes("no price")) {
    return "/app/brain#services";
  }

  if (reason.includes("Missing required")) {
    return "/app/brain#policies";
  }

  return "/app/brain#services";
}

/**
 * Check if a quote result means we have a usable price
 */
export function hasUsablePrice(result: QuoteResult): boolean {
  return (
    result.success &&
    (result.quoteType === "exact" ||
      result.quoteType === "estimate" ||
      result.quoteType === "range")
  );
}

/**
 * Check if a quote result means we need more information
 */
export function needsMoreInfo(result: QuoteResult): boolean {
  return result.nextQuestion !== undefined;
}

/**
 * Format quote result as a detailed log entry
 */
export function formatQuoteForLogging(
  input: QuoteInput,
  result: QuoteResult
): Record<string, unknown> {
  return {
    timestamp: result.calculatedAt,
    tenantId: input.tenantId,
    serviceId: input.serviceId,
    serviceName: input.serviceName,
    location: input.customerLocation,
    answers: input.answers,
    result: {
      quoteType: result.quoteType,
      success: result.success,
      price: result.price,
      priceRange: result.priceRange,
      reason: result.reason,
      nextQuestion: result.nextQuestion?.key,
      areaServiceable: result.areaCheck.serviceable,
    },
  };
}

// ============================================================================
// QUOTE READINESS CHECK
// ============================================================================

export interface QuoteReadinessIssue {
  severity: "error" | "warning";
  message: string;
  deepLink: string;
}

export interface QuoteReadinessResult {
  ready: boolean;
  score: number; // 0-100
  issues: QuoteReadinessIssue[];
}

/**
 * Check if a tenant is ready to provide quotes.
 *
 * Returns a readiness score and list of issues to fix.
 */
export function checkQuoteReadiness(context: QuoteContext): QuoteReadinessResult {
  const issues: QuoteReadinessIssue[] = [];

  // Check 1: Has services
  if (context.services.length === 0) {
    issues.push({
      severity: "error",
      message: "No services configured",
      deepLink: "/app/brain#services",
    });
  }

  // Check 2: Services have pricing
  const servicesWithoutPrices = context.services.filter(
    (s) => s.price_amount === null && s.price_type !== "quote_only"
  );
  if (servicesWithoutPrices.length > 0) {
    issues.push({
      severity: "warning",
      message: `${servicesWithoutPrices.length} service(s) have no price configured`,
      deepLink: "/app/brain#services",
    });
  }

  // Check 3: Service area configured (optional but recommended)
  if (!context.serviceArea || context.serviceArea.mode === "radius" && !context.serviceArea.radius_miles) {
    // Only warn if not set up at all
    if (!context.serviceArea?.base_address.city) {
      issues.push({
        severity: "warning",
        message: "Service area not configured",
        deepLink: "/app/brain#service-area",
      });
    }
  }

  // Check 4: Has some pricing rules (advanced or simple)
  const hasAdvancedRules = context.advancedRules.length > 0;
  const hasSimpleRules = context.simpleRules.some((r) => r.is_active);

  // This is just informational - not having rules is fine if services have prices
  if (!hasAdvancedRules && !hasSimpleRules && context.services.length > 0) {
    // Check if all services have prices
    const allHavePrices = context.services.every(
      (s) => s.price_amount !== null || s.price_type === "quote_only"
    );
    if (!allHavePrices) {
      issues.push({
        severity: "warning",
        message: "Consider adding pricing rules for dynamic quoting",
        deepLink: "/app/brain#services",
      });
    }
  }

  // Calculate score
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  let score = 100;
  score -= errorCount * 40; // Each error is -40
  score -= warningCount * 10; // Each warning is -10
  score = Math.max(0, Math.min(100, score));

  return {
    ready: errorCount === 0,
    score,
    issues,
  };
}
