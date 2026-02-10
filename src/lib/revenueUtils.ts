/**
 * Revenue formatting and calculation utilities
 */

/**
 * Format cents to display currency string.
 * Examples: 425000 → "$4,250", 99 → "$0.99", 0 → "$0"
 */
export function formatRevenue(cents: number): string {
  if (cents === 0) return "$0";
  const dollars = cents / 100;
  if (dollars >= 1000) {
    return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  if (Number.isInteger(dollars)) {
    return `$${dollars.toLocaleString("en-US")}`;
  }
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format cents to compact display for large numbers.
 * Examples: 425000 → "$4.3k", 1250000 → "$12.5k", 50 → "$0.50"
 */
export function formatRevenueCompact(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000000) {
    return `$${(dollars / 1000000).toFixed(1)}M`;
  }
  if (dollars >= 10000) {
    return `$${(dollars / 1000).toFixed(0)}k`;
  }
  if (dollars >= 1000) {
    return `$${(dollars / 1000).toFixed(1)}k`;
  }
  return formatRevenue(cents);
}

/**
 * Format a percentage trend with direction indicator.
 */
export function formatTrend(percent: number): {
  value: string;
  direction: "up" | "down" | "flat";
  label: string;
} {
  if (Math.abs(percent) < 0.5) {
    return { value: "0%", direction: "flat", label: "No change" };
  }
  const direction = percent > 0 ? "up" : "down";
  const prefix = percent > 0 ? "+" : "";
  return {
    value: `${prefix}${Math.round(percent)}%`,
    direction,
    label: `${prefix}${Math.round(percent)}% vs last month`,
  };
}

/**
 * Format a number with a change indicator for entity counts.
 * Examples: 3 → "+3 more", -2 → "2 fewer", 0 → "Same as last month"
 */
export function formatCountChange(change: number, entityName: string): string {
  if (change === 0) return "Same as last month";
  if (change > 0) return `+${change} more`;
  return `${Math.abs(change)} fewer`;
}

/**
 * Calculate ROI multiplier.
 * Returns how many dollars returned per dollar spent.
 */
export function calculateROI(revenueCents: number, costCents: number): number {
  if (costCents <= 0) return 0;
  return Math.round((revenueCents / costCents) * 10) / 10;
}

/**
 * Format ROI multiplier for display.
 * Examples: 17.2 → "17x", 0.5 → "0.5x", 0 → "—"
 */
export function formatROI(multiplier: number): string {
  if (multiplier <= 0) return "—";
  if (multiplier >= 10) return `${Math.round(multiplier)}x`;
  return `${multiplier.toFixed(1)}x`;
}

/**
 * Get plain-English ROI explanation.
 */
export function getROIExplanation(multiplier: number): string {
  if (multiplier <= 0) return "Not enough data to calculate ROI yet.";
  if (multiplier < 1) return `Your AI is generating $${multiplier.toFixed(2)} for every $1 spent. Give it time to ramp up.`;
  return `For every $1 you spend, you get $${Math.round(multiplier)} back.`;
}

/**
 * Calculate percentage change between two values.
 */
export function percentChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * Interpolate a template string with values.
 * Example: interpolate("Your AI {verb} {count} {entity}", { verb: "dispatched", count: "17", entity: "jobs" })
 */
export function interpolateTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

// --- Story-driven ROI utilities ---

/**
 * Build a story headline from a template and data.
 * "Your AI dispatched 17 jobs worth $4,250 this month"
 */
export function buildStoryHeadline(
  template: string,
  values: { verb: string; count: number; entity: string; value: string }
): string {
  return interpolateTemplate(template, values);
}

/**
 * Get an ROI badge label and variant based on multiplier.
 * Medical mode uses neutral language (no "Exceptional").
 */
export function getROIBadge(
  multiplier: number,
  celebratoryTone: boolean
): { label: string; variant: "default" | "secondary" | "outline" } | null {
  if (multiplier < 2) return null;
  if (multiplier >= 10) {
    return {
      label: celebratoryTone ? "Exceptional ROI" : "High ROI",
      variant: "default",
    };
  }
  if (multiplier >= 5) {
    return {
      label: celebratoryTone ? "Strong ROI" : "Positive ROI",
      variant: "secondary",
    };
  }
  if (multiplier >= 2) {
    return {
      label: "Positive ROI",
      variant: "outline",
    };
  }
  return null;
}

/**
 * Get a contextual win message based on milestones and trends.
 */
export function getWinMessage(
  data: {
    entitiesCreated: number;
    aiRevenueCents: number;
    trends: { calls: number };
  },
  celebratoryTone: boolean
): string | null {
  const suffix = celebratoryTone ? "!" : ".";

  // First entity milestone
  if (data.entitiesCreated === 1) {
    return `Your first AI-generated booking${suffix} The journey begins`;
  }

  // Revenue milestones
  const dollars = data.aiRevenueCents / 100;
  if (dollars >= 50000) {
    return celebratoryTone
      ? "Over $50k in AI-generated revenue — outstanding!"
      : "Over $50k in AI-generated revenue.";
  }
  if (dollars >= 10000) {
    return celebratoryTone
      ? "Over $10k in AI-generated revenue — impressive!"
      : "Over $10k in AI-generated revenue.";
  }
  if (dollars >= 5000) {
    return `Over $5k in AI-generated revenue${suffix}`;
  }
  if (dollars >= 1000) {
    return `Over $1k in AI-generated revenue${suffix}`;
  }

  // Trending up
  if (data.trends.calls >= 20) {
    return `Your AI is getting busier — ${Math.round(data.trends.calls)}% more calls than last month${celebratoryTone ? "!" : "."}`;
  }

  return null;
}

/**
 * "That's roughly 3 weeks of a part-time receptionist"
 * Based on $18/hr x 20hrs/wk = $360/week
 */
export function getReceptionistComparison(cents: number): string | null {
  const dollars = cents / 100;
  if (dollars < 360) return null;
  const weeks = Math.round(dollars / 360);
  if (weeks <= 1) return "That's roughly a week of a part-time receptionist";
  return `That's roughly ${weeks} weeks of a part-time receptionist`;
}

/**
 * "That's like getting 17 months of Voxly for the price of 1"
 */
export function getMonthsFreeComparison(multiplier: number): string | null {
  if (multiplier < 2) return null;
  const months = Math.round(multiplier);
  return `That's like getting ${months} months of Voxly for the price of 1`;
}

/**
 * "That's about 4 hours of phone time your AI handled"
 * Assumes average 3 minutes per call.
 */
export function getHoursSavedEstimate(callCount: number): string | null {
  if (callCount < 5) return null;
  const totalMinutes = callCount * 3;
  const hours = Math.round(totalMinutes / 60);
  if (hours < 1) {
    return `That's about ${totalMinutes} minutes of phone time your AI handled`;
  }
  return `That's about ${hours} ${hours === 1 ? "hour" : "hours"} of phone time your AI handled`;
}
