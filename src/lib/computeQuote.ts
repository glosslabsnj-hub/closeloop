/**
 * PURE PRICING + ETA DECISION ENGINE
 *
 * Zero runtime dependencies. Deterministic. Unit-testable.
 * Used by AI to decide: EXACT vs ESTIMATE vs UNKNOWN pricing/ETA.
 */

// ============= TYPES =============

export type QuoteType = "EXACT" | "ESTIMATE" | "UNKNOWN";

export interface RequiredInput {
  field: string;
  label: string;
  type: "number" | "text" | "select";
  options?: string[];
  reason: string;
}

export interface QuoteResult {
  type: QuoteType;
  value?: number; // in cents for price, in minutes for ETA
  rangeMin?: number;
  rangeMax?: number;
  confidence: number; // 0.0 - 1.0
  explanation: string;
  missingInputs: RequiredInput[];
  drivers?: string[]; // factors affecting the estimate
}

export interface PricingRule {
  id: string;
  name: string;
  ruleType: "fixed" | "range" | "formula" | "conditional";
  conditions?: Record<string, any>; // e.g., { serviceType: "drain_cleaning", urgency: "normal" }
  requiredInputs?: string[]; // fields needed to apply this rule
  fixedPrice?: number; // cents
  rangeMin?: number; // cents
  rangeMax?: number; // cents
  formula?: string; // for formula rules (not implemented in v1)
  priority: number; // higher = more specific, lower = fallback
}

export interface BusynessRule {
  busynessLevel: "low" | "medium" | "high";
  etaMultiplier?: number; // 1.0 = normal, 1.5 = 50% longer
  surchargePercent?: number; // 0-100
}

export interface OfferingContext {
  serviceId?: string;
  serviceName?: string;
  duration?: number; // minutes
  basePrice?: number; // cents
  priceType?: "fixed" | "starting_at" | "quote_only";
}

export interface QueueMetrics {
  busynessLevel: "low" | "medium" | "high";
  queueLength: number;
  avgCompletionMinutes?: number;
}

// ============= PRICING QUOTE COMPUTATION =============

/**
 * Compute a price quote based on rules, business mode, offering, and inputs.
 *
 * Decision tree:
 * 1. No matching rule => UNKNOWN (confidence 0.3)
 * 2. Missing required inputs => ask for inputs; if rule has range => ESTIMATE else UNKNOWN
 * 3. Deterministic rule (fixed) => EXACT (confidence 0.9)
 * 4. Range rule => ESTIMATE (confidence 0.6)
 */
export function computePriceQuote(params: {
  rules: PricingRule[];
  businessMode: string;
  offering: OfferingContext;
  inputs: Record<string, any>;
}): QuoteResult {
  const { rules, businessMode, offering, inputs } = params;

  // If offering has fixed base price and no rules, return EXACT
  if (offering.priceType === "fixed" && offering.basePrice && rules.length === 0) {
    return {
      type: "EXACT",
      value: offering.basePrice,
      confidence: 0.95,
      explanation: `Fixed price: $${(offering.basePrice / 100).toFixed(2)}`,
      missingInputs: [],
    };
  }

  // If offering requires quote and no rules, return UNKNOWN
  if (offering.priceType === "quote_only" && rules.length === 0) {
    return {
      type: "UNKNOWN",
      confidence: 0.3,
      explanation: "This service requires a custom quote. Please provide project details for an accurate estimate.",
      missingInputs: [],
    };
  }

  // Sort rules by priority (highest first)
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

  // Find first matching rule
  for (const rule of sortedRules) {
    const matches = checkRuleConditions(rule, inputs, offering);
    if (!matches) continue;

    // Check for missing required inputs
    const missing = getMissingInputs(rule, inputs);
    if (missing.length > 0) {
      // Has range? Return ESTIMATE with missing inputs
      if (rule.rangeMin !== undefined && rule.rangeMax !== undefined) {
        return {
          type: "ESTIMATE",
          rangeMin: rule.rangeMin,
          rangeMax: rule.rangeMax,
          confidence: 0.5,
          explanation: `Estimated range: $${(rule.rangeMin / 100).toFixed(2)} - $${(rule.rangeMax / 100).toFixed(2)}. Provide additional details for exact quote.`,
          missingInputs: missing,
          drivers: ["Missing details reduce accuracy"],
        };
      }

      // No range, return UNKNOWN
      return {
        type: "UNKNOWN",
        confidence: 0.4,
        explanation: "Additional information needed to provide an accurate quote.",
        missingInputs: missing,
      };
    }

    // All inputs provided, apply rule
    switch (rule.ruleType) {
      case "fixed":
        if (rule.fixedPrice !== undefined) {
          return {
            type: "EXACT",
            value: rule.fixedPrice,
            confidence: 0.9,
            explanation: `${rule.name}: $${(rule.fixedPrice / 100).toFixed(2)}`,
            missingInputs: [],
          };
        }
        break;

      case "range":
        if (rule.rangeMin !== undefined && rule.rangeMax !== undefined) {
          return {
            type: "ESTIMATE",
            rangeMin: rule.rangeMin,
            rangeMax: rule.rangeMax,
            confidence: 0.6,
            explanation: `${rule.name}: $${(rule.rangeMin / 100).toFixed(2)} - $${(rule.rangeMax / 100).toFixed(2)}`,
            missingInputs: [],
            drivers: ["Price varies based on project scope"],
          };
        }
        break;

      case "formula":
        // Not implemented in v1 - return UNKNOWN
        return {
          type: "UNKNOWN",
          confidence: 0.3,
          explanation: "Complex pricing formula requires manual quote.",
          missingInputs: [],
        };

      case "conditional":
        // Check conditions and return appropriate result
        if (rule.fixedPrice !== undefined) {
          return {
            type: "EXACT",
            value: rule.fixedPrice,
            confidence: 0.85,
            explanation: `${rule.name}: $${(rule.fixedPrice / 100).toFixed(2)}`,
            missingInputs: [],
          };
        }
        break;
    }
  }

  // No matching rules found
  // If offering has starting_at price, use it as ESTIMATE
  if (offering.priceType === "starting_at" && offering.basePrice) {
    return {
      type: "ESTIMATE",
      rangeMin: offering.basePrice,
      rangeMax: offering.basePrice * 2, // Assume up to 2x base
      confidence: 0.5,
      explanation: `Starting at $${(offering.basePrice / 100).toFixed(2)}. Final price depends on specific requirements.`,
      missingInputs: [],
      drivers: ["Base estimate without detailed scope"],
    };
  }

  // Default: UNKNOWN
  return {
    type: "UNKNOWN",
    confidence: 0.3,
    explanation: "Unable to determine pricing without additional context. Custom quote required.",
    missingInputs: [],
  };
}

// ============= ETA QUOTE COMPUTATION =============

/**
 * Compute an ETA quote based on busyness rules, mode, queue metrics, and inputs.
 *
 * Decision tree:
 * 1. No queue metrics => UNKNOWN
 * 2. Has duration + busyness => ESTIMATE with multiplier
 * 3. Missing duration => ask for it
 * 4. Deterministic (low busyness, known duration) => EXACT
 */
export function computeEtaQuote(params: {
  busynessRules: Record<string, BusynessRule>;
  mode: string;
  queueMetrics: QueueMetrics;
  inputs: Record<string, any>;
}): QuoteResult {
  const { busynessRules, mode, queueMetrics, inputs } = params;

  const baseDuration = inputs.duration || inputs.estimatedDuration;

  // No base duration provided
  if (!baseDuration) {
    return {
      type: "UNKNOWN",
      confidence: 0.3,
      explanation: "Service duration not specified. Unable to estimate completion time.",
      missingInputs: [
        {
          field: "duration",
          label: "Estimated Duration",
          type: "number",
          reason: "Required to calculate ETA",
        },
      ],
    };
  }

  // Get busyness rule
  const busynessRule = busynessRules[queueMetrics.busynessLevel];
  const multiplier = busynessRule?.etaMultiplier || 1.0;

  // Calculate ETA
  const queueDelay = queueMetrics.queueLength * (queueMetrics.avgCompletionMinutes || 30);
  const adjustedDuration = baseDuration * multiplier;
  const totalEta = queueDelay + adjustedDuration;

  // Determine confidence based on busyness
  let confidence = 0.7;
  let type: QuoteType = "ESTIMATE";
  const drivers: string[] = [];

  if (queueMetrics.busynessLevel === "low" && queueMetrics.queueLength === 0) {
    confidence = 0.85;
    type = "EXACT";
  } else if (queueMetrics.busynessLevel === "high") {
    confidence = 0.5;
    drivers.push("High demand may extend wait time");
  }

  if (queueMetrics.queueLength > 0) {
    drivers.push(`${queueMetrics.queueLength} customer(s) ahead in queue`);
  }

  if (multiplier > 1.0) {
    drivers.push(`${Math.round((multiplier - 1) * 100)}% longer due to ${queueMetrics.busynessLevel} demand`);
  }

  // Build explanation
  let explanation = "";
  if (type === "EXACT") {
    explanation = `Your service will be ready in approximately ${totalEta} minutes.`;
  } else {
    const rangeMin = Math.floor(totalEta * 0.9);
    const rangeMax = Math.ceil(totalEta * 1.1);
    explanation = `Estimated ${rangeMin}-${rangeMax} minutes based on current demand.`;
    return {
      type,
      rangeMin,
      rangeMax,
      confidence,
      explanation,
      missingInputs: [],
      drivers,
    };
  }

  return {
    type,
    value: totalEta,
    confidence,
    explanation,
    missingInputs: [],
    drivers: drivers.length > 0 ? drivers : undefined,
  };
}

// ============= HELPER FUNCTIONS =============

/**
 * Check if a rule's conditions match the current inputs and offering
 */
function checkRuleConditions(
  rule: PricingRule,
  inputs: Record<string, any>,
  offering: OfferingContext
): boolean {
  if (!rule.conditions) return true; // No conditions = always matches

  for (const [key, value] of Object.entries(rule.conditions)) {
    // Check inputs first
    if (inputs[key] !== undefined) {
      if (inputs[key] !== value) return false;
    }
    // Check offering context
    else if (key === "serviceId" && offering.serviceId !== value) {
      return false;
    } else if (key === "serviceName" && offering.serviceName !== value) {
      return false;
    } else if (key === "priceType" && offering.priceType !== value) {
      return false;
    }
  }

  return true;
}

/**
 * Get list of missing required inputs for a rule
 */
function getMissingInputs(
  rule: PricingRule,
  inputs: Record<string, any>
): RequiredInput[] {
  if (!rule.requiredInputs || rule.requiredInputs.length === 0) return [];

  const missing: RequiredInput[] = [];

  for (const field of rule.requiredInputs) {
    if (inputs[field] === undefined || inputs[field] === null || inputs[field] === "") {
      missing.push({
        field,
        label: formatFieldLabel(field),
        type: inferFieldType(field),
        reason: `Required to apply ${rule.name}`,
      });
    }
  }

  return missing;
}

/**
 * Format field name into human-readable label
 */
function formatFieldLabel(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Infer field type from field name (heuristic)
 */
function inferFieldType(field: string): "number" | "text" | "select" {
  const lowerField = field.toLowerCase();
  if (lowerField.includes("count") || lowerField.includes("quantity") || lowerField.includes("size")) {
    return "number";
  }
  if (lowerField.includes("type") || lowerField.includes("urgency") || lowerField.includes("level")) {
    return "select";
  }
  return "text";
}

// ============= DETECTION HELPERS =============

/**
 * Detect if message contains pricing-related question
 */
export function detectPricingQuestion(message: string): boolean {
  const lower = message.toLowerCase();
  const priceKeywords = [
    "how much",
    "what's the price",
    "what is the price",
    "cost",
    "pricing",
    "what do you charge",
    "how much do you charge",
    "what are your rates",
    "price for",
    "quote",
  ];
  return priceKeywords.some(keyword => lower.includes(keyword));
}

// ============= INLINE UNIT TEST EXAMPLES =============

/**
 * Exported test examples for quick verification.
 * Not a test runner - just example inputs/outputs.
 */
export const __examples = [
  // PRICING EXAMPLES
  {
    name: "Fixed price with no rules",
    test: () => {
      const result = computePriceQuote({
        rules: [],
        businessMode: "service",
        offering: {
          serviceName: "Drain Cleaning",
          basePrice: 14900, // $149
          priceType: "fixed",
        },
        inputs: {},
      });
      return result.type === "EXACT" && result.value === 14900 && result.confidence > 0.9;
    },
  },
  {
    name: "Quote-only with no rules",
    test: () => {
      const result = computePriceQuote({
        rules: [],
        businessMode: "service",
        offering: {
          serviceName: "Commercial Plumbing",
          priceType: "quote_only",
        },
        inputs: {},
      });
      return result.type === "UNKNOWN" && result.confidence < 0.5;
    },
  },
  {
    name: "Fixed rule match",
    test: () => {
      const result = computePriceQuote({
        rules: [
          {
            id: "r1",
            name: "Standard Drain Cleaning",
            ruleType: "fixed",
            fixedPrice: 14900,
            priority: 10,
          },
        ],
        businessMode: "service",
        offering: { serviceName: "Drain Cleaning" },
        inputs: {},
      });
      return result.type === "EXACT" && result.value === 14900 && result.confidence === 0.9;
    },
  },
  {
    name: "Range rule match",
    test: () => {
      const result = computePriceQuote({
        rules: [
          {
            id: "r2",
            name: "HVAC Repair",
            ruleType: "range",
            rangeMin: 20000,
            rangeMax: 50000,
            priority: 10,
          },
        ],
        businessMode: "service",
        offering: { serviceName: "HVAC Repair" },
        inputs: {},
      });
      return result.type === "ESTIMATE" && result.rangeMin === 20000 && result.rangeMax === 50000 && result.confidence === 0.6;
    },
  },
  {
    name: "Missing required inputs - has range",
    test: () => {
      const result = computePriceQuote({
        rules: [
          {
            id: "r3",
            name: "Custom Job",
            ruleType: "range",
            requiredInputs: ["jobSize", "urgency"],
            rangeMin: 10000,
            rangeMax: 30000,
            priority: 10,
          },
        ],
        businessMode: "service",
        offering: { serviceName: "Custom Job" },
        inputs: {},
      });
      return result.type === "ESTIMATE" && result.missingInputs.length === 2 && result.confidence === 0.5;
    },
  },
  {
    name: "Missing required inputs - no range",
    test: () => {
      const result = computePriceQuote({
        rules: [
          {
            id: "r4",
            name: "Complex Quote",
            ruleType: "fixed",
            requiredInputs: ["projectScope"],
            fixedPrice: 50000,
            priority: 10,
          },
        ],
        businessMode: "service",
        offering: { serviceName: "Complex Quote" },
        inputs: {},
      });
      return result.type === "UNKNOWN" && result.missingInputs.length === 1 && result.confidence === 0.4;
    },
  },
  {
    name: "Conditional rule with matching condition",
    test: () => {
      const result = computePriceQuote({
        rules: [
          {
            id: "r5",
            name: "Urgent Drain Cleaning",
            ruleType: "conditional",
            conditions: { urgency: "high" },
            fixedPrice: 19900, // $199 for urgent
            priority: 20,
          },
          {
            id: "r6",
            name: "Standard Drain Cleaning",
            ruleType: "fixed",
            fixedPrice: 14900,
            priority: 10,
          },
        ],
        businessMode: "service",
        offering: { serviceName: "Drain Cleaning" },
        inputs: { urgency: "high" },
      });
      return result.type === "EXACT" && result.value === 19900 && result.confidence === 0.85;
    },
  },
  {
    name: "Starting-at fallback",
    test: () => {
      const result = computePriceQuote({
        rules: [],
        businessMode: "service",
        offering: {
          serviceName: "HVAC Service",
          basePrice: 15000, // $150
          priceType: "starting_at",
        },
        inputs: {},
      });
      return result.type === "ESTIMATE" && result.rangeMin === 15000 && result.rangeMax === 30000 && result.confidence === 0.5;
    },
  },

  // ETA EXAMPLES
  {
    name: "ETA - Low busyness, no queue",
    test: () => {
      const result = computeEtaQuote({
        busynessRules: {
          low: { busynessLevel: "low", etaMultiplier: 1.0 },
        },
        mode: "service",
        queueMetrics: {
          busynessLevel: "low",
          queueLength: 0,
          avgCompletionMinutes: 30,
        },
        inputs: { duration: 60 },
      });
      return result.type === "EXACT" && result.value === 60 && result.confidence === 0.85;
    },
  },
  {
    name: "ETA - High busyness with queue",
    test: () => {
      const result = computeEtaQuote({
        busynessRules: {
          high: { busynessLevel: "high", etaMultiplier: 1.5 },
        },
        mode: "service",
        queueMetrics: {
          busynessLevel: "high",
          queueLength: 2,
          avgCompletionMinutes: 30,
        },
        inputs: { duration: 60 },
      });
      // queueDelay = 2 * 30 = 60
      // adjustedDuration = 60 * 1.5 = 90
      // total = 150
      return result.type === "ESTIMATE" && result.rangeMin && result.rangeMin >= 135 && result.confidence === 0.5;
    },
  },
  {
    name: "ETA - Missing duration",
    test: () => {
      const result = computeEtaQuote({
        busynessRules: {},
        mode: "service",
        queueMetrics: {
          busynessLevel: "medium",
          queueLength: 0,
        },
        inputs: {},
      });
      return result.type === "UNKNOWN" && result.missingInputs.length === 1 && result.missingInputs[0].field === "duration";
    },
  },
  {
    name: "ETA - Medium busyness",
    test: () => {
      const result = computeEtaQuote({
        busynessRules: {
          medium: { busynessLevel: "medium", etaMultiplier: 1.2 },
        },
        mode: "service",
        queueMetrics: {
          busynessLevel: "medium",
          queueLength: 1,
          avgCompletionMinutes: 45,
        },
        inputs: { duration: 90 },
      });
      // queueDelay = 1 * 45 = 45
      // adjustedDuration = 90 * 1.2 = 108
      // total = 153
      return result.type === "ESTIMATE" && result.drivers && result.drivers.length > 0;
    },
  },
];

/**
 * Quick test runner (not Jest - just console verification)
 */
export function runExampleTests(): void {
  console.log("Running computeQuote example tests...\n");

  let passed = 0;
  let failed = 0;

  for (const example of __examples) {
    try {
      const result = example.test();
      if (result) {
        console.log(`✅ ${example.name}`);
        passed++;
      } else {
        console.log(`❌ ${example.name}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${example.name} (threw error)`);
      console.error(error);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
}
