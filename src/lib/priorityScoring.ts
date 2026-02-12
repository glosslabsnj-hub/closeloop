/**
 * Client-side call priority scoring.
 *
 * Pure function — no DB queries. Uses existing fields on ai_call_sessions
 * plus configuration from industryBrainConfig.
 */

import type { PriorityConfig, PriorityLevel } from "@/config/industryBrainConfig";

export interface PriorityInput {
  /** Session outcome: booked, followup, lost, escalated, etc. */
  outcome: string | null;
  /** ISO timestamp when the call started */
  started_at: string | null;
  /** Whether a callback was requested (from extracted_payload) */
  callbackRequested: boolean;
}

export interface PriorityResult {
  /** Raw numeric score (0-100) */
  score: number;
  /** Bucketed level */
  level: PriorityLevel;
  /** Human-readable label from config */
  label: string;
  /** Color key from config (maps to Tailwind/shadcn variants) */
  color: string;
}

/**
 * Compute a priority score for a call based on outcome, recency, and callback status.
 */
export function computeCallPriority(
  input: PriorityInput,
  config: PriorityConfig,
): PriorityResult {
  const { weights } = config;
  let score = 0;

  // Outcome-based scoring
  switch (input.outcome) {
    case "escalated":
      score += weights.escalated;
      break;
    case "followup":
      score += weights.followup;
      break;
    case "lost":
      score += weights.lost;
      break;
    case "booked":
    case "order":
    case "dispatch":
      score += weights.booked;
      break;
    default:
      score += 20; // unknown/null outcomes get a modest baseline
  }

  // Recency boost
  if (input.started_at) {
    const minutesAgo = (Date.now() - new Date(input.started_at).getTime()) / 60_000;
    if (minutesAgo <= weights.recencyBoostMinutes) {
      score += weights.recencyBoostScore;
    }
  }

  // Callback boost
  if (input.callbackRequested) {
    score += weights.callbackBoost;
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  // Bucket into levels
  let level: PriorityLevel;
  if (score >= 70) {
    level = "high";
  } else if (score >= 40) {
    level = "medium";
  } else {
    level = "low";
  }

  return {
    score,
    level,
    label: config.labels[level],
    color: config.colors[level],
  };
}
