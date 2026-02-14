/**
 * Lead Temperature Scoring — Shared backend scoring with 8 weighted factors.
 *
 * Returns a temperature (hot/warm/cool), numeric score (0-100), and signal list.
 * Used by elevenlabs-webhook after each call to score leads.
 */

export type LeadTemperature = "hot" | "warm" | "cool";

export interface TemperatureResult {
  temperature: LeadTemperature;
  score: number;
  signals: string[];
}

export interface TemperatureInput {
  intent: string;
  outcome: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  serviceRequested: string | null;
  servicePrice: number | null;
  callbackRequested: boolean;
  callDurationSecs: number;
  isRepeatCustomer: boolean;
  urgency: string | null;
  dispatchJobType: string | null;
  pricingInquiry: boolean;
  transcriptText: string;
}

const URGENCY_KEYWORDS = [
  "asap", "emergency", "urgent", "broken down", "stranded",
  "right away", "immediately", "today", "right now", "as soon as possible",
];

const HIGH_VALUE_KEYWORDS = [
  "engine", "transmission", "rebuild", "replace", "overhaul", "turbo",
  "full service", "renovation", "remodel", "commercial", "fleet",
];

const PRICING_KEYWORDS = [
  "how much", "price", "cost", "quote", "estimate", "rate", "charge", "fee",
];

/**
 * Compute lead temperature from 8 weighted factors (0-100).
 *
 * Factors:
 *  1. Intent strength    (0-25)  — booking/dispatch/order score highest
 *  2. Customer completeness (0-15) — name + phone + email
 *  3. Service value      (0-15)  — requested a specific service / high-value keywords
 *  4. Urgency signals    (0-15)  — urgency keywords, dispatch priority
 *  5. Engagement depth   (0-10)  — call duration as proxy for engagement
 *  6. Pricing inquiry    (0-10)  — asked about cost = strong intent
 *  7. Repeat customer    (0-5)   — returning callers are higher value
 *  8. Callback requested (0-5)   — explicit follow-up request
 */
export function computeLeadTemperature(input: TemperatureInput): TemperatureResult {
  let score = 0;
  const signals: string[] = [];

  // --- Factor 1: Intent strength (0-25) ---
  switch (input.intent) {
    case "booking":
    case "dispatch":
    case "order":
      score += 25;
      signals.push(`intent:${input.intent}`);
      break;
    case "reservation":
      score += 22;
      signals.push("intent:reservation");
      break;
    case "callback":
      score += 15;
      signals.push("intent:callback");
      break;
    case "faq":
      score += 5;
      signals.push("intent:faq");
      break;
    default:
      score += 0;
      signals.push(`intent:${input.intent}`);
  }

  // Boost for completed transactions
  if (input.outcome === "booked" || input.outcome === "order" || input.outcome === "dispatch") {
    score += 10;
    signals.push(`outcome:${input.outcome}`);
  }

  // --- Factor 2: Customer completeness (0-15) ---
  const hasName = !!input.customerName && input.customerName !== "Unknown";
  const hasPhone = !!input.customerPhone;
  const hasEmail = !!input.customerEmail;
  let completeness = 0;
  if (hasName) completeness += 5;
  if (hasPhone) completeness += 5;
  if (hasEmail) completeness += 5;
  score += completeness;
  if (completeness >= 10) signals.push("customer:identified");

  // --- Factor 3: Service value (0-15) ---
  if (input.serviceRequested) {
    score += 8;
    signals.push(`service:${input.serviceRequested.substring(0, 30)}`);
  }
  if (input.servicePrice && input.servicePrice > 0) {
    // Higher-value services get more points (capped at 7)
    const priceBoost = Math.min(7, Math.round(input.servicePrice / 5000));
    score += priceBoost;
    if (priceBoost >= 4) signals.push("high-value-service");
  }

  const lowerTranscript = input.transcriptText.toLowerCase();
  if (HIGH_VALUE_KEYWORDS.some(k => lowerTranscript.includes(k))) {
    score += 5;
    signals.push("high-value-keywords");
  }

  // --- Factor 4: Urgency signals (0-15) ---
  const hasUrgencyKeywords = URGENCY_KEYWORDS.some(k => lowerTranscript.includes(k));
  const dispatchUrgent = input.urgency === "urgent" || input.urgency === "high";
  if (hasUrgencyKeywords) {
    score += 10;
    signals.push("urgency:keywords");
  }
  if (dispatchUrgent) {
    score += 10;
    signals.push("urgency:dispatch-priority");
  }

  // --- Factor 5: Engagement depth (0-10) ---
  // Longer calls indicate stronger engagement
  if (input.callDurationSecs >= 180) {
    score += 10;
    signals.push("engagement:deep");
  } else if (input.callDurationSecs >= 90) {
    score += 7;
    signals.push("engagement:moderate");
  } else if (input.callDurationSecs >= 30) {
    score += 3;
    signals.push("engagement:brief");
  }

  // --- Factor 6: Pricing inquiry (0-10) ---
  if (input.pricingInquiry || PRICING_KEYWORDS.some(k => lowerTranscript.includes(k))) {
    score += 10;
    signals.push("pricing-inquiry");
  }

  // --- Factor 7: Repeat customer (0-5) ---
  if (input.isRepeatCustomer) {
    score += 5;
    signals.push("repeat-customer");
  }

  // --- Factor 8: Callback requested (0-5) ---
  if (input.callbackRequested) {
    score += 5;
    signals.push("callback-requested");
  }

  // Penalty for lost/abandoned
  if (input.outcome === "lost" || input.outcome === "abandoned") {
    score = Math.max(0, score - 15);
    signals.push("outcome:lost");
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  // Threshold: >= 60 hot, >= 30 warm, < 30 cool
  let temperature: LeadTemperature;
  if (score >= 60) {
    temperature = "hot";
  } else if (score >= 30) {
    temperature = "warm";
  } else {
    temperature = "cool";
  }

  return { temperature, score, signals };
}
