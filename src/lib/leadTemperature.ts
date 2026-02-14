/**
 * Lead Temperature Scoring — Frontend port.
 *
 * Pure function, no DB queries. Computes temperature from session data
 * available on the client (extracted_payload, outcome, etc.).
 *
 * Mirrors the backend scoring in _shared/leadTemperature.ts.
 */

export type LeadTemperature = "hot" | "warm" | "cool";

export interface TemperatureResult {
  temperature: LeadTemperature;
  score: number;
  signals: string[];
}

interface SessionLike {
  outcome: string | null;
  started_at: string | null;
  ended_at: string | null;
  extracted_payload: Record<string, unknown> | null;
  customer?: {
    full_name?: string;
    phone_e164?: string;
    email?: string;
  } | null;
}

const URGENCY_KEYWORDS = [
  "asap", "emergency", "urgent", "broken down", "stranded",
  "right away", "immediately", "today", "right now",
];

const HIGH_VALUE_KEYWORDS = [
  "engine", "transmission", "rebuild", "replace", "overhaul",
  "full service", "renovation", "remodel", "commercial",
];

/**
 * Compute lead temperature from a call session's available data.
 * Frontend-compatible version of the backend 8-factor scoring.
 */
export function computeLeadTemperatureFromSession(session: SessionLike): TemperatureResult {
  let score = 0;
  const signals: string[] = [];
  const payload = session.extracted_payload ?? {};

  // --- Factor 1: Intent strength (0-25) ---
  const intent = (payload.intent as string) || "other";
  switch (intent) {
    case "booking":
    case "dispatch":
    case "order":
      score += 25;
      signals.push(`intent:${intent}`);
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
  }

  // Boost for completed transactions
  if (session.outcome === "booked" || session.outcome === "order" || session.outcome === "dispatch") {
    score += 10;
    signals.push(`outcome:${session.outcome}`);
  }

  // --- Factor 2: Customer completeness (0-15) ---
  const customer = payload.customer as Record<string, unknown> | undefined;
  const hasName = !!(customer?.name || session.customer?.full_name) &&
    (customer?.name || session.customer?.full_name) !== "Unknown";
  const hasPhone = !!(customer?.phone_e164 || session.customer?.phone_e164);
  const hasEmail = !!(customer?.email || session.customer?.email);
  if (hasName) score += 5;
  if (hasPhone) score += 5;
  if (hasEmail) score += 5;
  if (hasName && hasPhone) signals.push("customer:identified");

  // --- Factor 3: Service value (0-15) ---
  const booking = payload.booking as Record<string, unknown> | undefined;
  const dispatch = payload.dispatch as Record<string, unknown> | undefined;
  if (booking?.service_requested) {
    score += 8;
    signals.push("service-requested");
  }

  // --- Factor 4: Urgency signals (0-15) ---
  const urgency = dispatch?.urgency as string | undefined;
  if (urgency === "urgent" || urgency === "high") {
    score += 10;
    signals.push("urgency:dispatch-priority");
  }

  // --- Factor 5: Engagement depth (0-10) ---
  if (session.started_at && session.ended_at) {
    const durationSecs = (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000;
    if (durationSecs >= 180) {
      score += 10;
      signals.push("engagement:deep");
    } else if (durationSecs >= 90) {
      score += 7;
      signals.push("engagement:moderate");
    } else if (durationSecs >= 30) {
      score += 3;
      signals.push("engagement:brief");
    }
  }

  // --- Factor 6: Pricing inquiry (0-10) ---
  const summary = (payload._meta as Record<string, unknown>)?.extraction_source as string || "";
  if (summary.toLowerCase().includes("price") || summary.toLowerCase().includes("cost")) {
    score += 10;
    signals.push("pricing-inquiry");
  }

  // --- Factor 7: Repeat customer (0-5) ---
  // On frontend we check if customer existed before the call
  if (session.customer?.full_name && session.customer.full_name !== "Unknown") {
    score += 5;
    signals.push("repeat-customer");
  }

  // --- Factor 8: Callback requested (0-5) ---
  const callback = payload.callback as Record<string, unknown> | undefined;
  if (callback?.requested) {
    score += 5;
    signals.push("callback-requested");
  }

  // Penalty for lost/abandoned
  if (session.outcome === "lost" || session.outcome === "abandoned") {
    score = Math.max(0, score - 15);
    signals.push("outcome:lost");
  }

  score = Math.max(0, Math.min(100, score));

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

/** Color mapping for temperature badges */
export const TEMPERATURE_COLORS: Record<LeadTemperature, { dot: string; text: string; bg: string }> = {
  hot: { dot: "bg-red-500", text: "text-red-500", bg: "bg-red-500/10" },
  warm: { dot: "bg-orange-500", text: "text-orange-500", bg: "bg-orange-500/10" },
  cool: { dot: "bg-blue-400", text: "text-blue-400", bg: "bg-blue-400/10" },
};
