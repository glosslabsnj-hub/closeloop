/**
 * ETA Estimator - Step 1
 *
 * Deterministic ETA estimation using safe ranges (no maps provider).
 * Computes ETA based on business mode, job type, busyness, and holiday buffers.
 */

// ============================================================================
// Types
// ============================================================================

export interface EtaRange {
  min: number; // minutes
  max: number; // minutes
}

export interface EtaPolicy {
  /** Default ETA range when no overrides match */
  default_range_minutes: EtaRange;

  /** Override ranges by business_mode (service, dispatch, food, medical, general) */
  mode_overrides?: {
    [mode: string]: {
      range_minutes: EtaRange;
    };
  };

  /** Override ranges by job_type (e.g., "battery_jump", "lockout", "pizza_delivery") */
  job_type_overrides?: {
    [jobType: string]: {
      range_minutes: EtaRange;
    };
  };

  /** Busyness buffer percentage 0-50, applied as multiplier based on busyness_pct */
  busyness_buffer_pct?: number;

  /** Holiday buffer percentage 0-50, added when is_holiday is true */
  holiday_buffer_pct?: number;
}

export interface EtaInput {
  /** Current business mode */
  business_mode: "service" | "dispatch" | "food" | "medical" | "general";

  /** Specific job type, if known (e.g., "battery_jump", "tow", "pizza_delivery") */
  job_type?: string;

  /** Current busyness percentage 0-100 */
  manual_busyness_pct?: number;

  /** Whether today is a holiday */
  is_holiday?: boolean;
}

export interface EtaResult {
  /** Human-friendly spoken ETA (e.g., "30 to 45 minutes") */
  spoken: string;

  /** Minimum ETA in minutes */
  min: number;

  /** Maximum ETA in minutes */
  max: number;

  /** Source of the range: "job_type" | "mode" | "default" */
  source: "job_type" | "mode" | "default";

  /** Debug notes explaining how the ETA was computed */
  notes: string[];
}

// ============================================================================
// Default Policy
// ============================================================================

export const DEFAULT_ETA_POLICY: EtaPolicy = {
  default_range_minutes: { min: 30, max: 60 },
  busyness_buffer_pct: 15,
  holiday_buffer_pct: 10,
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Formats an ETA range as a spoken string.
 * Examples:
 *   - { min: 30, max: 45 } -> "30 to 45 minutes"
 *   - { min: 60, max: 90 } -> "1 to 1 and a half hours"
 *   - { min: 60, max: 120 } -> "1 to 2 hours"
 */
export function formatSpokenEta(min: number, max: number): string {
  // For under 60 minutes, just say minutes
  if (max < 60) {
    return `${Math.round(min)} to ${Math.round(max)} minutes`;
  }

  // For ranges that span into hours
  const formatTime = (mins: number): string => {
    if (mins < 60) {
      return `${Math.round(mins)} minutes`;
    }
    const hours = Math.floor(mins / 60);
    const remainder = mins % 60;

    if (remainder === 0) {
      return hours === 1 ? "1 hour" : `${hours} hours`;
    } else if (remainder === 30) {
      return hours === 1 ? "1 and a half hours" : `${hours} and a half hours`;
    } else if (remainder <= 15) {
      return hours === 1 ? "about 1 hour" : `about ${hours} hours`;
    } else if (remainder >= 45) {
      const nextHour = hours + 1;
      return nextHour === 1 ? "about 1 hour" : `about ${nextHour} hours`;
    } else {
      // Generic: just round to nearest 15
      const roundedMins = Math.round(mins / 15) * 15;
      return formatTime(roundedMins);
    }
  };

  // If min and max are close, simplify
  if (max - min <= 15 && min >= 60) {
    return `about ${formatTime((min + max) / 2)}`;
  }

  return `${formatTime(min)} to ${formatTime(max)}`;
}

/**
 * Normalizes a job type string for matching.
 * Converts to lowercase and replaces spaces/special chars with underscores.
 */
export function normalizeJobType(jobType: string): string {
  return jobType
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

// ============================================================================
// Main Estimator
// ============================================================================

/**
 * Estimates ETA based on policy and input context.
 *
 * Deterministic rules (in order):
 * 1. Check job_type_overrides if job_type is provided
 * 2. Check mode_overrides for business_mode
 * 3. Fall back to default_range_minutes
 * 4. Apply busyness buffer: multiply range by (1 + busyness_buffer_pct * busyness_pct / 10000)
 * 5. Apply holiday buffer if is_holiday is true: multiply by (1 + holiday_buffer_pct / 100)
 *
 * @param policy - The tenant's ETA policy configuration
 * @param input - Current context (business_mode, job_type, busyness, holiday)
 * @returns Computed ETA result with spoken text, range, source, and notes
 */
export function estimateEta(policy: EtaPolicy, input: EtaInput): EtaResult {
  const notes: string[] = [];
  let range: EtaRange | undefined;
  let source: "job_type" | "mode" | "default" = "default";

  // Merge with defaults
  const effectivePolicy: EtaPolicy = {
    ...DEFAULT_ETA_POLICY,
    ...policy,
    default_range_minutes: policy.default_range_minutes ?? DEFAULT_ETA_POLICY.default_range_minutes,
  };

  // Step 1: Determine base range
  const normalizedJobType = input.job_type ? normalizeJobType(input.job_type) : null;

  if (normalizedJobType && effectivePolicy.job_type_overrides) {
    // Try exact match first
    let jobTypeOverride = effectivePolicy.job_type_overrides[normalizedJobType];

    // Try original job_type as fallback (for case-sensitive matches)
    if (!jobTypeOverride && input.job_type) {
      jobTypeOverride = effectivePolicy.job_type_overrides[input.job_type];
    }

    if (jobTypeOverride) {
      range = { ...jobTypeOverride.range_minutes };
      source = "job_type";
      notes.push(`Using job_type override for "${input.job_type}": ${range.min}-${range.max} min`);
    }
  }

  if (!range && effectivePolicy.mode_overrides) {
    const modeOverride = effectivePolicy.mode_overrides[input.business_mode];
    if (modeOverride) {
      range = { ...modeOverride.range_minutes };
      source = "mode";
      notes.push(`Using mode override for "${input.business_mode}": ${range.min}-${range.max} min`);
    }
  }

  if (!range) {
    range = { ...effectivePolicy.default_range_minutes };
    source = "default";
    notes.push(`Using default range: ${range.min}-${range.max} min`);
  }

  // Step 2: Apply busyness buffer
  const busynessPct = Math.min(100, Math.max(0, input.manual_busyness_pct ?? 0));
  const busynessBufferPct = Math.min(50, Math.max(0, effectivePolicy.busyness_buffer_pct ?? 0));

  if (busynessPct > 0 && busynessBufferPct > 0) {
    // Formula: multiply by (1 + busyness_buffer_pct * busyness_pct / 10000)
    // At 100% busyness with 15% buffer: multiplier = 1 + (15 * 100 / 10000) = 1.15
    const busynessMultiplier = 1 + (busynessBufferPct * busynessPct) / 10000;
    range.min = Math.round(range.min * busynessMultiplier);
    range.max = Math.round(range.max * busynessMultiplier);
    notes.push(`Applied busyness buffer: ${busynessPct}% busy × ${busynessBufferPct}% buffer = ${((busynessMultiplier - 1) * 100).toFixed(1)}% increase`);
  }

  // Step 3: Apply holiday buffer
  if (input.is_holiday) {
    const holidayBufferPct = Math.min(50, Math.max(0, effectivePolicy.holiday_buffer_pct ?? 0));
    if (holidayBufferPct > 0) {
      const holidayMultiplier = 1 + holidayBufferPct / 100;
      range.min = Math.round(range.min * holidayMultiplier);
      range.max = Math.round(range.max * holidayMultiplier);
      notes.push(`Applied holiday buffer: +${holidayBufferPct}%`);
    }
  }

  // Generate spoken text
  const spoken = formatSpokenEta(range.min, range.max);
  notes.push(`Final ETA: "${spoken}"`);

  return {
    spoken,
    min: range.min,
    max: range.max,
    source,
    notes,
  };
}
