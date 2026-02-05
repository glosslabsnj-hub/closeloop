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
