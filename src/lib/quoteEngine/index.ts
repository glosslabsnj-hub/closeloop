/**
 * Quote Engine Module
 *
 * Deterministic quoting for Flux Receptionist. Provides runtime pricing
 * calculation with safe fallbacks and clear data requirements.
 *
 * @example
 * ```typescript
 * import { getQuote, checkQuoteReadiness } from "@/lib/quoteEngine";
 *
 * const result = getQuote(
 *   {
 *     tenantId: "...",
 *     serviceId: "...",
 *     serviceName: "Towing",
 *     customerLocation: { zip: "90210", state: "CA" },
 *     answers: { miles: 15 },
 *   },
 *   {
 *     serviceArea,
 *     advancedRules,
 *     simpleRules,
 *     services,
 *   }
 * );
 *
 * console.log(result.voiceScript);
 * // "That will be $150.00."
 * ```
 *
 * @see docs/refactors/REFACTOR_STEP4_QUOTE_ENGINE.md
 */

// Main entry point
export {
  getQuote,
  hasUsablePrice,
  needsMoreInfo,
  formatQuoteForLogging,
  checkQuoteReadiness,
  type QuoteInput,
  type QuoteContext,
  type QuoteResult,
  type QuoteType,
  type QuoteReadinessResult,
  type QuoteReadinessIssue,
} from "./quoteEngine";

// Area checking
export {
  checkArea,
  formatAreaCheckForVoice,
  type CustomerLocation,
  type AreaCheckResult,
} from "./areaCheck";

// Pricing rules
export {
  applyRules,
  formatPricingForVoice,
  type AdvancedPricingRule,
  type Service,
  type ExtractedAnswers,
  type RulesApplyResult,
  type AdvancedRuleType,
} from "./rulesApply";
