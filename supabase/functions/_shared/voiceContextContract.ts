/**
 * VOICE CONTEXT CONTRACT REGISTRY
 *
 * Defines the canonical contract for all dynamic variables passed to ElevenLabs.
 * This registry ensures:
 * - Deterministic output (no nulls, all strings)
 * - Speech-ready summaries
 * - Auditable manifest of what the AI knows
 *
 * Used by: buildDynamicVariables() in buildBusinessContext.ts
 */

import type { BusinessContext } from "./buildBusinessContext.ts";

// ============= TYPE DEFINITIONS =============

export type DynamicVarType = "string" | "boolean" | "number";

export interface DynamicVarSpec {
  /** The key name in dynamic_variables output */
  key: string;
  /** Human-readable description for documentation */
  description: string;
  /** Type for validation and coercion */
  type: DynamicVarType;
  /** Path in BusinessContext (dot notation) OR getter function */
  source: string | ((ctx: BusinessContext, callerPhone: string, customerId: string | null) => unknown);
  /** Default value if source returns null/undefined */
  defaultValue: string | number | boolean;
  /** Whether this field contains PHI and should be redacted in HIPAA mode */
  isPhi?: boolean;
  /** Whether to include in compact JSON (business_brain_json_compact) */
  includeInCompactJson?: boolean;
  /** Category for documentation grouping */
  category: "core" | "caller" | "hours" | "offerings" | "pricing" | "policies" | "ai_settings" | "intelligence" | "food" | "debug" | "meta";
  /** Whether this value is ready for TTS (no abbreviations, JSON, or URLs). Defaults to false. */
  speechReady?: boolean;
}

// ============= HELPER FUNCTIONS =============

/**
 * Safely get a nested value from an object using dot notation path
 * @example getByPath(ctx, "tenant.business_name") -> ctx.tenant.business_name
 */
export function getByPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;

  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Coerce any value to a string (never null/undefined)
 * - null/undefined -> ""
 * - boolean -> "true"/"false"
 * - number -> String(n)
 * - object/array -> JSON.stringify
 * - string -> as-is
 */
export function coerceToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(",");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return String(value);
}

/**
 * Coerce value to final output type based on spec
 */
export function coerceByType(value: unknown, type: DynamicVarType, defaultValue: string | number | boolean): string | number | boolean {
  if (value === null || value === undefined) return defaultValue;

  switch (type) {
    case "boolean":
      if (typeof value === "boolean") return value;
      if (typeof value === "string") return value === "true";
      return Boolean(value);
    case "number":
      if (typeof value === "number") return value;
      const num = Number(value);
      return isNaN(num) ? (typeof defaultValue === "number" ? defaultValue : 0) : num;
    case "string":
    default:
      return coerceToString(value);
  }
}

/**
 * Compute SHA-256 hash of a string using Web Crypto API
 * Falls back to a simple checksum if crypto is unavailable
 */
export async function sha256(input: string): Promise<string> {
  try {
    // Try Web Crypto API (available in Deno and modern browsers)
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // Fallback: Simple djb2 hash (deterministic but not cryptographic)
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) + hash) + input.charCodeAt(i);
    }
    return Math.abs(hash).toString(16).padStart(16, "0");
  }
}

/**
 * Synchronous hash fallback for when async isn't possible
 */
export function hashSync(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}

// ============= COMPACT JSON BUILDER =============

const MAX_COMPACT_JSON_SIZE = 12000; // ~12KB max to stay safe for ElevenLabs

export interface CompactJsonResult {
  json: string;
  hash: string;
  truncated: boolean;
  keys: string[];
}

/**
 * Build compact JSON with essential business truth for AI context verification.
 * Respects HIPAA mode by excluding PHI fields.
 */
export function buildCompactJson(
  vars: Record<string, string | number | boolean>,
  hipaaMode: boolean
): CompactJsonResult {
  // Keys to include in compact JSON (order matters for determinism)
  const compactKeys = [
    "tenant_id",
    "business_name",
    "business_mode",
    "timezone",
    "hours_today",
    "location_summary",
    "business_address",
    "service_area_summary",
    "out_of_area_message",
    // Include offerings based on mode
    "services_pricing",
    "menu_summary",
    // Pricing/ETA
    "pricing_rules_summary",
    "eta_rules_summary",
    // Policies
    "policies_summary",
    "faqs_summary",
    // Required questions
    "required_questions_summary",
  ];

  // PHI keys to exclude in HIPAA mode
  const phiKeys = ["caller_phone", "customer_id", "memory_hints_summary"];

  const compactObj: Record<string, string | number | boolean> = {};
  const includedKeys: string[] = [];

  for (const key of compactKeys) {
    // Skip PHI in HIPAA mode
    if (hipaaMode && phiKeys.includes(key)) continue;

    const value = vars[key];
    if (value !== undefined && value !== "") {
      compactObj[key] = value;
      includedKeys.push(key);
    }
  }

  let jsonStr = JSON.stringify(compactObj);
  let truncated = false;

  // Truncate if too large
  if (jsonStr.length > MAX_COMPACT_JSON_SIZE) {
    truncated = true;
    // Remove largest fields until under limit
    const fieldSizes = Object.entries(compactObj)
      .map(([k, v]) => ({ key: k, size: String(v).length }))
      .sort((a, b) => b.size - a.size);

    for (const field of fieldSizes) {
      if (jsonStr.length <= MAX_COMPACT_JSON_SIZE) break;

      // Truncate largest field
      const val = compactObj[field.key];
      if (typeof val === "string" && val.length > 200) {
        compactObj[field.key] = val.substring(0, 200) + "...[truncated]";
        jsonStr = JSON.stringify(compactObj);
      }
    }

    // Final safety truncation
    if (jsonStr.length > MAX_COMPACT_JSON_SIZE) {
      jsonStr = jsonStr.substring(0, MAX_COMPACT_JSON_SIZE - 20) + "...[truncated]}";
    }
  }

  const hash = hashSync(jsonStr);

  return {
    json: jsonStr,
    hash,
    truncated,
    keys: includedKeys,
  };
}

// ============= VARIABLE REGISTRY =============

/**
 * The canonical registry of all dynamic variables for ElevenLabs.
 * This is the single source of truth for what variables exist.
 */
export const DYNAMIC_VAR_REGISTRY: DynamicVarSpec[] = [
  // ===== CORE IDENTIFIERS =====
  {
    key: "tenant_id",
    description: "Unique tenant identifier",
    type: "string",
    source: "tenant.tenant_id",
    defaultValue: "",
    category: "core",
    includeInCompactJson: true,
  },
  {
    key: "location_id",
    description: "Location identifier (for multi-location tenants)",
    type: "string",
    source: "_meta.location_id",
    defaultValue: "",
    category: "core",
  },
  {
    key: "business_name",
    description: "Business display name",
    type: "string",
    source: "tenant.business_name",
    defaultValue: "Our Business",
    category: "core",
    includeInCompactJson: true,
  },
  {
    key: "businessname",
    description: "Business name alias for ElevenLabs compatibility",
    type: "string",
    source: "tenant.business_name",
    defaultValue: "Our Business",
    category: "core",
  },
  {
    key: "business_tagline",
    description: "Short tagline or slogan for the business",
    type: "string",
    source: "tenant.tagline",
    defaultValue: "",
    category: "core",
  },
  {
    key: "years_in_business",
    description: "How many years the business has been operating",
    type: "string",
    source: (ctx) => {
      const years = ctx.tenant.years_in_business;
      return years ? String(years) : "";
    },
    defaultValue: "",
    category: "core",
  },
  {
    key: "website_url",
    description: "Business website URL",
    type: "string",
    source: "tenant.website",
    defaultValue: "",
    category: "core",
  },
  {
    key: "business_mode",
    description: "Operating mode (service, food, dispatch, general)",
    type: "string",
    source: "tenant.business_mode",
    defaultValue: "general",
    category: "core",
    includeInCompactJson: true,
  },
  {
    key: "industry_type",
    description: "Specific industry/business type (e.g. car-dealership-used, solar-installer, locksmith)",
    type: "string",
    source: "tenant.industry_slug",
    defaultValue: "",
    category: "core",
    includeInCompactJson: true,
    speechReady: true,
  },
  {
    key: "enabled_modules",
    description: "Comma-separated list of enabled modules",
    type: "string",
    source: (ctx) => {
      const modules: string[] = [];
      if (ctx.operations.modules.booking_enabled) modules.push("booking");
      if (ctx.operations.modules.dispatch_enabled) modules.push("dispatch_queue");
      if (ctx.operations.modules.orders_enabled) modules.push("food_orders");
      if (ctx.operations.modules.reservations_enabled) modules.push("reservations");
      if (ctx.operations.modules.catering_enabled) modules.push("catering");
      if (ctx.operations.modules.voice_enabled) modules.push("ai_voice");
      if (ctx.operations.modules.sms_enabled) modules.push("instant_text_back");
      if (ctx.operations.modules.medical_intake_enabled) modules.push("medical_intake");
      return modules.join(",");
    },
    defaultValue: "",
    category: "core",
  },
  {
    key: "hipaa_mode",
    description: "Whether HIPAA mode is enabled",
    type: "boolean",
    source: "safety.hipaa_mode",
    defaultValue: false,
    category: "core",
  },

  // ===== CAPABILITY FLAGS =====
  {
    key: "has_booking",
    description: "Whether booking capability is enabled",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return caps.booking ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  {
    key: "has_dispatch",
    description: "Whether dispatch capability is enabled",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return caps.dispatch_queue ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  {
    key: "has_emergency_dispatch",
    description: "Whether emergency/same-day dispatch is enabled",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return caps.emergency_dispatch ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  {
    key: "has_fleet",
    description: "Whether fleet management is enabled",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return caps.fleet_management ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  {
    key: "has_impound",
    description: "Whether impound lot capability is enabled",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return caps.impound_lot ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  {
    key: "has_reservations",
    description: "Whether table reservations are enabled",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return caps.reservations ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  {
    key: "has_catering",
    description: "Whether catering requests are enabled",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return caps.catering ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  {
    key: "has_delivery",
    description: "Whether delivery service is enabled",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return caps.delivery ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  {
    key: "has_mobile_service",
    description: "Whether mobile/on-site service is enabled",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return caps.mobile_service ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  {
    key: "has_food_orders",
    description: "Whether food ordering is enabled",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return caps.food_orders ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  {
    key: "has_medical_intake",
    description: "Whether medical intake is enabled",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return caps.medical_intake ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  {
    key: "has_estimates",
    description: "Whether estimates capability is enabled",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return caps.estimates ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  {
    key: "has_eta_tracking",
    description: "Whether ETA tracking is enabled",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return caps.eta_tracking ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  {
    key: "has_calendar_sync",
    description: "Whether calendar sync is enabled",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return caps.calendar_sync ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  {
    key: "has_after_hours_handling",
    description: "Whether after-hours handling is enabled",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return caps.after_hours_handling ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  {
    key: "has_sms_campaigns",
    description: "Whether SMS campaigns are enabled",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return caps.sms_campaigns ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  {
    key: "has_knowledge_base",
    description: "Whether knowledge base is enabled",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return caps.knowledge_base ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  // Derived business type flags
  {
    key: "is_scheduling_business",
    description: "Whether this is primarily a scheduling/booking business",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return (caps.booking || caps.reservations) ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  {
    key: "is_dispatch_business",
    description: "Whether this is primarily a dispatch business",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return caps.dispatch_queue ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  {
    key: "is_food_business",
    description: "Whether this is primarily a food/restaurant business",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return (caps.food_orders || caps.menu_knowledge) ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  {
    key: "is_medical_business",
    description: "Whether this is primarily a medical business",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return caps.medical_intake ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  {
    key: "is_service_business",
    description: "Whether this is primarily a service/appointment business",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      const isFood = caps.food_orders || caps.menu_knowledge;
      const isDispatch = caps.dispatch_queue;
      const isMedical = caps.medical_intake;
      return (caps.booking && !isFood && !isDispatch && !isMedical) ? "true" : "false";
    },
    defaultValue: "false",
    category: "core",
  },
  {
    key: "capabilities_list",
    description: "Comma-separated list of enabled capabilities",
    type: "string",
    source: (ctx) => {
      const caps = (ctx._meta?.capabilities || {}) as Record<string, boolean>;
      return Object.keys(caps).filter(k => caps[k]).join(",");
    },
    defaultValue: "",
    category: "core",
  },

  {
    key: "timezone",
    description: "Business timezone",
    type: "string",
    source: "tenant.timezone",
    defaultValue: "America/New_York",
    category: "core",
    includeInCompactJson: true,
  },

  // ===== LOCATION (NEW) =====
  {
    key: "business_address",
    description: "Business street address",
    type: "string",
    source: "tenant.address",
    defaultValue: "",
    category: "core",
    includeInCompactJson: true,
  },
  {
    key: "location_summary",
    description: "Speech-ready location (e.g., 'We're based at 123 Main St, Chicago')",
    type: "string",
    source: "tenant.location_summary",
    defaultValue: "",
    category: "core",
    includeInCompactJson: true,
  },
  {
    key: "service_area_summary",
    description: "Speech-ready service area (e.g., 'We serve a 25-mile radius from downtown')",
    type: "string",
    source: "tenant.service_area_summary",
    defaultValue: "",
    category: "core",
    includeInCompactJson: true,
  },
  {
    key: "service_area_rules_json",
    description: "Raw service area config JSON",
    type: "string",
    source: (ctx) => {
      if (!ctx.tenant.service_area) return "";
      try {
        return JSON.stringify(ctx.tenant.service_area);
      } catch {
        return "";
      }
    },
    defaultValue: "",
    category: "core",
  },
  {
    key: "out_of_area_message",
    description: "Message to say when customer is outside service area",
    type: "string",
    source: "tenant.out_of_area_message",
    defaultValue: "",
    category: "core",
    includeInCompactJson: true,
  },

  // ===== CALLER INFO =====
  {
    key: "caller_phone",
    description: "Caller's phone number (E.164)",
    type: "string",
    source: (ctx, callerPhone) => callerPhone || "",
    defaultValue: "",
    category: "caller",
    isPhi: true,
  },
  {
    key: "caller_phone_last4",
    description: "Last 4 digits of caller phone for verification",
    type: "string",
    source: (ctx, callerPhone) => {
      if (!callerPhone || callerPhone.length < 4) return "";
      return callerPhone.slice(-4);
    },
    defaultValue: "",
    category: "caller",
    isPhi: true,
  },
  {
    key: "customer_id",
    description: "Matched customer ID if caller is recognized",
    type: "string",
    source: (ctx, _, customerId) => customerId || "",
    defaultValue: "",
    category: "caller",
  },
  {
    key: "customer_order_count",
    description: "Number of previous orders/jobs for this customer",
    type: "string",
    source: (ctx) => {
      const count = ctx.intelligence?.customer_order_count;
      return count ? String(count) : "";
    },
    defaultValue: "",
    category: "caller",
  },
  {
    key: "customer_name_from_lookup",
    description: "Customer name from caller ID lookup (for returning caller recognition)",
    type: "string",
    source: "intelligence.customer_name_from_lookup",
    defaultValue: "",
    category: "caller",
    isPhi: true,
  },
  {
    key: "active_job_summary",
    description: "Speech-ready summary of customer's active jobs (e.g., vehicle in shop status)",
    type: "string",
    source: "intelligence.active_job_summary",
    defaultValue: "",
    category: "caller",
    includeInCompactJson: true,
    speechReady: true,
  },
  {
    key: "twilio_call_sid",
    description: "Twilio Call SID for the active call (used by transfer_to_owner tool)",
    type: "string",
    source: () => "", // Set by twilio-inbound as a call-specific override
    defaultValue: "",
    category: "caller",
  },

  // ===== TEAM / STAFF =====
  {
    key: "team_size",
    description: "Number of active staff members (0 = solo operator)",
    type: "number",
    source: (ctx) => {
      const staff = (ctx as any)?.staff_members;
      if (!staff || !Array.isArray(staff)) return 0;
      return staff.filter((s: any) => s.is_active).length;
    },
    defaultValue: 0,
    category: "core",
    includeInCompactJson: true,
  },
  {
    key: "staff_names",
    description: "Comma-separated names of active staff members",
    type: "string",
    source: (ctx) => {
      const staff = (ctx as any)?.staff_members;
      if (!staff || !Array.isArray(staff)) return "";
      return staff
        .filter((s: any) => s.is_active)
        .map((s: any) => s.full_name)
        .join(", ");
    },
    defaultValue: "",
    category: "core",
  },

  // ===== HOURS & AVAILABILITY =====
  {
    key: "hours_today",
    description: "Today's business hours (e.g., '9:00 AM - 5:00 PM')",
    type: "string",
    source: "tenant.hours_today",
    defaultValue: "",
    category: "hours",
    includeInCompactJson: true,
  },
  {
    key: "weekly_hours_schedule",
    description: "Full weekly hours schedule for appointment day validation (e.g., 'Monday through Friday 8 AM to 4:30 PM, Saturday through Sunday closed')",
    type: "string",
    source: (ctx) => {
      // Import is not needed - buildWeeklyHoursSummary is re-exported from buildBusinessContext.ts
      const hours = ctx.tenant?.hours;
      if (!hours || Object.keys(hours).length === 0) return "";
      
      // Use the same logic as buildWeeklyHoursSummary inline
      const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      
      const formatTime = (time24: string): string => {
        if (!time24) return "";
        const [h, m] = time24.split(":").map(Number);
        const h12 = h % 12 || 12;
        const period = h >= 12 ? "PM" : "AM";
        if (m === 0) return `${h12} ${period}`;
        return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
      };
      
      interface DayGroup { startIdx: number; endIdx: number; open: string; close: string; isOpen: boolean; }
      const groups: DayGroup[] = [];
      
      for (let i = 0; i < dayOrder.length; i++) {
        const day = dayOrder[i];
        const h = (hours as Record<string, { open: string; close: string; is_open: boolean }>)[day];
        const isOpen = h?.is_open && !!h?.open && !!h?.close;
        const open = h?.open || "";
        const close = h?.close || "";
        
        const lastGroup = groups[groups.length - 1];
        if (lastGroup && lastGroup.isOpen === isOpen && lastGroup.open === open && lastGroup.close === close) {
          lastGroup.endIdx = i;
        } else {
          groups.push({ startIdx: i, endIdx: i, open, close, isOpen });
        }
      }
      
      const parts: string[] = [];
      for (const group of groups) {
        const startName = dayNames[group.startIdx];
        const endName = dayNames[group.endIdx];
        const range = group.startIdx === group.endIdx ? startName : `${startName} through ${endName}`;
        parts.push(group.isOpen ? `${range} ${formatTime(group.open)} to ${formatTime(group.close)}` : `${range} closed`);
      }
      
      return parts.join(", ");
    },
    defaultValue: "",
    category: "hours",
    includeInCompactJson: true,
    speechReady: true,
  },
  {
    key: "calendar_connected",
    description: "Whether calendar integration is connected",
    type: "boolean",
    source: "operations.availability.calendar_connected",
    defaultValue: false,
    category: "hours",
  },
  {
    key: "booking_link",
    description: "URL for online booking",
    type: "string",
    source: "operations.availability.booking_url",
    defaultValue: "",
    category: "hours",
  },

  // ===== OFFERINGS =====
  {
    key: "service_summary",
    description: "Brief summary of services",
    type: "string",
    source: "offerings.services_summary",
    defaultValue: "",
    category: "offerings",
  },
  {
    key: "services_pricing",
    description: "Detailed services with pricing for AI prompt",
    type: "string",
    source: "offerings.services_for_prompt",
    defaultValue: "",
    category: "offerings",
    includeInCompactJson: true,
  },
  {
    key: "secondary_services_summary",
    description: "Additional services offered (e.g., body work for a tow company). AI adapts based on detail level configured.",
    type: "string",
    source: "offerings.secondary_services_summary",
    defaultValue: "",
    category: "offerings",
    includeInCompactJson: true,
  },
  {
    key: "menu_summary",
    description: "Menu items summary for food mode",
    type: "string",
    source: "offerings.menu_summary",
    defaultValue: "",
    category: "offerings",
    includeInCompactJson: true,
  },
  {
    key: "menu_has_more",
    description: "Whether menu has more items than shown",
    type: "string",
    source: (ctx) => {
      const hasMore = ctx.offerings.menu.length > 30 ||
        new Set(ctx.offerings.menu.map(m => m.category)).size > 6;
      return hasMore ? "true" : "false";
    },
    defaultValue: "false",
    category: "offerings",
  },
  {
    key: "menu_top_categories",
    description: "Top menu categories",
    type: "string",
    source: (ctx) => {
      const cats: Record<string, number> = {};
      for (const item of ctx.offerings.menu) {
        if (item.is_available) {
          cats[item.category] = (cats[item.category] || 0) + 1;
        }
      }
      return Object.entries(cats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([cat]) => cat)
        .join(", ");
    },
    defaultValue: "",
    category: "offerings",
  },
  {
    key: "menu_summary_length",
    description: "Character count of menu summary",
    type: "string",
    source: (ctx) => String(ctx.offerings.menu_summary?.length || 0),
    defaultValue: "0",
    category: "offerings",
  },
  {
    key: "packages_summary",
    description: "Service packages, memberships, and bundles summary for upselling",
    type: "string",
    source: "offerings.packages_summary",
    defaultValue: "",
    category: "offerings",
    includeInCompactJson: true,
  },
  {
    key: "trip_fee_summary",
    description: "Summary of trip/service call fees across services",
    type: "string",
    source: (ctx: Record<string, unknown>) => {
      const offerings = ctx.offerings as Record<string, unknown> | undefined;
      const services = (offerings?.services || []) as Array<Record<string, unknown>>;
      const feeParts: string[] = [];
      for (const s of services) {
        const config = s.pricing_config as Record<string, unknown> | undefined;
        const tripFee = config?.trip_fee as { enabled?: boolean; amount?: number; label?: string } | undefined;
        if (tripFee?.enabled && tripFee?.amount) {
          feeParts.push(`${s.name}: $${tripFee.amount} ${tripFee.label || "trip fee"}`);
        }
      }
      return feeParts.length > 0 ? feeParts.join("; ") : "";
    },
    defaultValue: "",
    category: "offerings",
    includeInCompactJson: true,
  },
  {
    key: "active_promotions",
    description: "Currently active promotions and seasonal offers",
    type: "string",
    source: "offerings.active_promotions",
    defaultValue: "",
    category: "offerings",
    includeInCompactJson: true,
  },
  {
    key: "capacity_7day_overview",
    description: "7-day booking density overview (e.g., 'Mon: busy (8) | Tue: open | Wed: closed')",
    type: "string",
    source: "operations.capacity_7day_overview",
    defaultValue: "",
    category: "offerings",
    includeInCompactJson: false, // Keep compact JSON small
  },
  {
    key: "service_booking_rules_summary",
    description: "Per-service booking rules: booking type, required fields, payment timing (e.g., 'AC Repair: direct book, needs address + urgency, pay at service')",
    type: "string",
    source: (ctx) => {
      const services = ctx.offerings?.services || [];
      if (services.length === 0) return "";
      return services
        .filter((s: any) => s.booking_type || s.payment_timing || (s.required_booking_fields && s.required_booking_fields.length > 0))
        .slice(0, 10)
        .map((s: any) => {
          const parts = [s.name];
          if (s.booking_type && s.booking_type !== "direct_book") {
            const typeLabel: Record<string, string> = { estimate_first: "estimate visit first", consultation: "callback for consultation" };
            parts.push(typeLabel[s.booking_type] || s.booking_type);
          } else {
            parts.push("direct book");
          }
          if (s.required_booking_fields && s.required_booking_fields.length > 0) {
            parts.push("needs " + s.required_booking_fields.join(" + "));
          }
          if (s.payment_timing && s.payment_timing !== "at_service") {
            const timingLabel: Record<string, string> = { at_booking: "prepay", deposit_then_balance: "deposit required", quote_first: "quote first" };
            parts.push(timingLabel[s.payment_timing] || s.payment_timing);
          }
          return parts.join(", ");
        })
        .join(" | ");
    },
    defaultValue: "",
    category: "offerings",
    includeInCompactJson: true,
    speechReady: true,
  },

  // ===== SALES =====
  {
    key: "inventory_summary",
    description: "Compact overview of available inventory for sales businesses",
    type: "string",
    source: (ctx: Record<string, unknown>) => {
      const sales = ctx.sales as Record<string, unknown> | undefined;
      return sales?.inventory_summary || "";
    },
    defaultValue: "",
    category: "offerings",
    includeInCompactJson: true,
  },
  {
    key: "inventory_detail",
    description: "Per-vehicle listing grouped by make with year, model, trim, body style, mileage, price, and top features",
    type: "string",
    source: (ctx: Record<string, unknown>) => {
      const sales = ctx.sales as Record<string, unknown> | undefined;
      return sales?.inventory_detail || "";
    },
    defaultValue: "",
    category: "offerings",
    speechReady: true,
  },
  {
    key: "financing_available",
    description: "Whether financing options are available",
    type: "string",
    source: (ctx: Record<string, unknown>) => {
      const sales = ctx.sales as Record<string, unknown> | undefined;
      return sales?.financing_available ? "true" : "false";
    },
    defaultValue: "false",
    category: "offerings",
  },
  {
    key: "trade_in_accepted",
    description: "Whether trade-ins are accepted",
    type: "string",
    source: (ctx: Record<string, unknown>) => {
      const sales = ctx.sales as Record<string, unknown> | undefined;
      return sales?.trade_in_accepted ? "true" : "false";
    },
    defaultValue: "false",
    category: "offerings",
  },
  {
    key: "sales_rep_names",
    description: "Comma-separated list of sales rep names",
    type: "string",
    source: (ctx: Record<string, unknown>) => {
      const sales = ctx.sales as Record<string, unknown> | undefined;
      return (sales?.sales_rep_names as string) || "";
    },
    defaultValue: "",
    category: "offerings",
  },

  // ===== PRICING =====
  {
    key: "pricing_rules_summary",
    description: "Summary of pricing rules",
    type: "string",
    source: "pricing.rules_summary",
    defaultValue: "No pricing rules configured",
    category: "pricing",
    includeInCompactJson: true,
  },
  {
    key: "eta_rules_summary",
    description: "Summary of ETA/busyness rules",
    type: "string",
    source: "eta.rules_summary",
    defaultValue: "",
    category: "pricing",
    includeInCompactJson: true,
  },
  {
    key: "base_prep_minutes",
    description: "Base preparation time in minutes",
    type: "number",
    source: "pricing.busyness_config.base_prep_minutes",
    defaultValue: 0,
    category: "pricing",
  },
  {
    key: "busy_buffer_minutes",
    description: "Buffer time when busy",
    type: "number",
    source: "pricing.busyness_config.busy_buffer_minutes",
    defaultValue: 0,
    category: "pricing",
  },
  {
    key: "current_busyness_pct",
    description: "Current busyness percentage (0-100)",
    type: "number",
    source: "pricing.busyness_config.manual_busyness_pct",
    defaultValue: 0,
    category: "pricing",
  },

  // ===== ETA / RESPONSE TIME (NEW - for dispatch mode) =====
  {
    key: "response_time_spoken",
    description: "Spoken ETA for customer (e.g., '45 to 55 minutes')",
    type: "string",
    source: "eta.spoken",
    defaultValue: "30 to 45 minutes",
    category: "pricing",
    includeInCompactJson: true,
  },
  {
    key: "response_time_min",
    description: "Minimum ETA in minutes",
    type: "number",
    source: "eta.min_minutes",
    defaultValue: 30,
    category: "pricing",
  },
  {
    key: "response_time_max",
    description: "Maximum ETA in minutes",
    type: "number",
    source: "eta.max_minutes",
    defaultValue: 60,
    category: "pricing",
  },
  {
    key: "eta_source",
    description: "Source of ETA calculation (tenant_distance_settings, mode_default, etc.)",
    type: "string",
    source: "eta.source",
    defaultValue: "mode_default",
    category: "pricing",
  },
  {
    key: "eta_policy_summary",
    description: "Summary of ETA/response time configuration",
    type: "string",
    source: "eta.eta_policy_summary",
    defaultValue: "",
    category: "pricing",
  },
  {
    key: "distance_provider_enabled",
    description: "Whether Mapbox distance routing is enabled",
    type: "boolean",
    source: "eta.distance_provider_enabled",
    defaultValue: false,
    category: "pricing",
  },

  // ===== POLICIES =====
  {
    key: "policies_summary",
    description: "Combined policies summary",
    type: "string",
    source: (ctx) => {
      const parts = [
        ctx.policies.cancellation && `Cancellation: ${ctx.policies.cancellation}`,
        ctx.policies.deposit && `Deposit: ${ctx.policies.deposit}`,
        ctx.policies.payment_methods.length > 0 && `Payment: ${ctx.policies.payment_methods.join(", ")}`,
        ctx.policies.payment_timing && `Payment timing: ${ctx.policies.payment_timing}`,
      ].filter(Boolean);
      return parts.join(". ");
    },
    defaultValue: "",
    category: "policies",
    includeInCompactJson: true,
  },
  {
    key: "faqs_summary",
    description: "FAQ summary",
    type: "string",
    source: "knowledge.faqs_summary",
    defaultValue: "",
    category: "policies",
    includeInCompactJson: true,
  },
  {
    key: "objections_summary",
    description: "Trained objection responses for pricing/competitor pushback",
    type: "string",
    source: (ctx) => {
      const objections = ctx.knowledge.objections || [];
      if (objections.length === 0) return "";
      return objections
        .slice(0, 5)
        .map(o => `When customer says "${o.objection}": "${o.response.substring(0, 150)}"`)
        .join(" | ");
    },
    defaultValue: "",
    category: "policies",
    includeInCompactJson: true,
  },
  {
    key: "ai_never_promise",
    description: "Things the AI should never promise or guarantee",
    type: "string",
    source: (ctx) => {
      const neverPromise = ctx.policies.ai_never_promise || [];
      if (neverPromise.length === 0) return "";
      return neverPromise.join(", ");
    },
    defaultValue: "",
    category: "policies",
  },
  {
    key: "knowledge_summary",
    description: "Supplementary knowledge from uploaded docs",
    type: "string",
    source: (ctx) => {
      const knowledge = ctx.knowledge.supplementary || [];
      if (knowledge.length === 0) return "";
      return knowledge
        .slice(0, 5)
        .map(k => `[${k.type}] ${k.title}: ${k.content.substring(0, 100)}`)
        .join(" | ");
    },
    defaultValue: "",
    category: "policies",
  },
  {
    key: "ai_guidelines_summary",
    description: "Owner-defined AI behavior guidelines (upselling, pricing, capacity, escalation)",
    type: "string",
    source: "policies.ai_guidelines_summary",
    defaultValue: "",
    category: "policies",
    includeInCompactJson: true,
  },
  {
    key: "ai_upselling_guidance",
    description: "Guidance for when/how to suggest upsells",
    type: "string",
    source: "policies.ai_guidelines.upselling",
    defaultValue: "",
    category: "policies",
  },
  {
    key: "ai_pricing_negotiation",
    description: "Guidance for pricing flexibility and negotiation",
    type: "string",
    source: "policies.ai_guidelines.pricing_negotiation",
    defaultValue: "",
    category: "policies",
  },
  {
    key: "ai_capacity_guidance",
    description: "Guidance for handling capacity and availability",
    type: "string",
    source: "policies.ai_guidelines.capacity",
    defaultValue: "",
    category: "policies",
  },
  {
    key: "ai_escalation_guidance",
    description: "Guidance for when to escalate to human",
    type: "string",
    source: "policies.ai_guidelines.escalation",
    defaultValue: "",
    category: "policies",
  },
  {
    key: "ai_recognition_guidance",
    description: "Guidance for recognizing repeat customers",
    type: "string",
    source: "policies.ai_guidelines.recognition",
    defaultValue: "",
    category: "policies",
  },
  {
    key: "ai_max_discount_percent",
    description: "Maximum discount percentage AI can offer",
    type: "number",
    source: "policies.ai_guidelines.max_discount_percent",
    defaultValue: 0,
    category: "policies",
  },
  {
    key: "ai_loyalty_threshold_orders",
    description: "Number of orders before customer is considered loyal",
    type: "number",
    source: "policies.ai_guidelines.loyalty_threshold_orders",
    defaultValue: 5,
    category: "policies",
  },

  // ===== AI SETTINGS =====
  {
    key: "ai_behavior_mode",
    description: "AI call behavior mode: full_service, callback_only, suggest_callback, or book_pending",
    type: "string",
    source: "ai_settings.ai_behavior_mode",
    defaultValue: "full_service",
    category: "ai_settings",
    includeInCompactJson: true,
  },
  {
    key: "service_default_flow",
    description: "Service call flow: schedule_first, urgency_check, or dispatch_first",
    type: "string",
    source: "ai_settings.service_default_flow",
    defaultValue: "schedule_first",
    category: "ai_settings",
    includeInCompactJson: true,
  },
  {
    key: "greeting_script",
    description: "Custom greeting script",
    type: "string",
    source: "ai_settings.greeting_script",
    defaultValue: "",
    category: "ai_settings",
  },
  {
    key: "fallback_script",
    description: "Fallback script when AI can't help",
    type: "string",
    source: "ai_settings.fallback_script",
    defaultValue: "",
    category: "ai_settings",
  },
  {
    key: "tone",
    description: "AI voice tone/personality",
    type: "string",
    source: "ai_settings.tone",
    defaultValue: "friendly",
    category: "ai_settings",
  },
  {
    key: "ai_booking_mode",
    description: "Booking confirmation mode: pending (requires owner approval) or auto_confirm",
    type: "string",
    source: "ai_settings.ai_booking_mode",
    defaultValue: "pending",
    category: "ai_settings",
  },
  {
    key: "same_day_enabled",
    description: "Whether same-day appointments are offered",
    type: "boolean",
    source: "ai_settings.same_day_enabled",
    defaultValue: true,
    category: "ai_settings",
  },
  {
    key: "emergency_surcharge",
    description: "Additional fee for emergency/same-day service (e.g. '$50')",
    type: "string",
    source: "ai_settings.emergency_surcharge",
    defaultValue: "",
    category: "ai_settings",
  },
  {
    key: "cancellation_notice_hours",
    description: "Hours of notice required for cancellation",
    type: "number",
    source: "ai_settings.cancellation_notice_hours",
    defaultValue: 24,
    category: "ai_settings",
  },
  {
    key: "confirmation_method",
    description: "How to send booking confirmations: sms, email, or both",
    type: "string",
    source: "ai_settings.confirmation_method",
    defaultValue: "sms",
    category: "ai_settings",
  },
  {
    key: "waitlist_enabled",
    description: "Whether to offer waitlist when fully booked",
    type: "boolean",
    source: "ai_settings.waitlist_enabled",
    defaultValue: false,
    category: "ai_settings",
  },
  {
    key: "recurring_enabled",
    description: "Whether to offer recurring/repeat appointments",
    type: "boolean",
    source: "ai_settings.recurring_enabled",
    defaultValue: false,
    category: "ai_settings",
  },
  {
    key: "deposit_required",
    description: "Whether a deposit is required to hold appointments",
    type: "boolean",
    source: "ai_settings.deposit_required",
    defaultValue: false,
    category: "ai_settings",
  },
  {
    key: "deposit_amount",
    description: "Deposit amount (e.g. '$25' or '50%')",
    type: "string",
    source: "ai_settings.deposit_amount",
    defaultValue: "",
    category: "ai_settings",
  },
  {
    key: "ai_guardrails",
    description: "Things the AI should never promise or say (owner-defined guardrails)",
    type: "string",
    source: "ai_settings.ai_guardrails",
    defaultValue: "",
    category: "ai_settings",
    includeInCompactJson: true,
    speechReady: true,
  },
  {
    key: "required_intake_fields_summary",
    description: "Required info AI must collect before booking (e.g. name, phone, vehicle info)",
    type: "string",
    source: (ctx) => {
      const fields = (ctx as any)?.ai_settings?.required_intake_fields;
      if (!fields || !Array.isArray(fields) || fields.length === 0) return "customer name, phone number";
      const labelMap: Record<string, string> = {
        customer_name: "customer name",
        customer_phone: "phone number",
        customer_email: "email address",
        vehicle_info: "vehicle information",
        address: "service address",
        pickup_address: "pickup address",
        vehicle_description: "vehicle description",
        is_drivable: "whether vehicle is drivable",
        insurance_info: "insurance information",
        date_of_birth: "date of birth",
      };
      return fields.filter((f: unknown) => typeof f === "string" && f).map((f: string) => labelMap[f] || f.replace(/_/g, " ")).join(", ");
    },
    defaultValue: "customer name, phone number",
    category: "ai_settings",
    includeInCompactJson: true,
    speechReady: true,
  },
  {
    key: "escalation_rules_summary",
    description: "When the AI should transfer to a human (speech-ready summary)",
    type: "string",
    source: (ctx) => {
      const rules = (ctx as any)?.ai_settings?.escalation_rules;
      if (!rules) return "Transfer when caller requests it or when AI cannot answer.";
      const triggers: string[] = [];
      if (rules.transferOnRequest) triggers.push("caller asks to speak to someone");
      if (rules.transferOnAnger) triggers.push("caller sounds frustrated");
      if (rules.transferOnPriceObjection) triggers.push("caller objects to pricing");
      if (rules.transferOnComplexQuestion) triggers.push("you cannot answer the question");
      if (rules.transferOnComplaint) triggers.push("caller has a complaint");
      if (triggers.length === 0) return "Do not transfer calls unless absolutely necessary.";
      const fallbackMap: Record<string, string> = {
        callback: "promise a callback",
        voicemail: "take a voicemail",
        text_owner: "send an urgent text to the owner",
      };
      const fallback = fallbackMap[rules.fallbackAction] || "promise a callback";
      return `Transfer to a human when: ${triggers.join("; ")}. If no one is available, ${fallback}.`;
    },
    defaultValue: "Transfer when caller requests it or when AI cannot answer.",
    category: "ai_settings",
    includeInCompactJson: true,
    speechReady: true,
  },

  {
    key: "ai_booking_behavior_instructions",
    description: "Mode-specific booking behavior instructions for the AI (based on resolved ai_behavior_mode and business_mode)",
    type: "string",
    source: (ctx) => {
      const behaviorMode = (ctx as any)?.ai_settings?.ai_behavior_mode || "full_service";
      const businessMode = (ctx as any)?.tenant?.business_mode || "general";

      // Callback only applies universally — just capture info, no booking
      if (behaviorMode === "callback_only") {
        return "BOOKING MODE: Callback Only. Do NOT check availability or create bookings. When a caller asks to book, collect their name, phone number, and what they need. Then use create_callback to log the request. Tell them someone will call back to schedule. Be helpful about general questions (hours, services, pricing) but always direct booking requests to a callback.";
      }

      // For modes without booking capability, always default to callback behavior
      if (businessMode === "general") {
        return "Collect the caller's information and use create_callback so the team can follow up.";
      }

      // Dispatch mode has its own flow — booking modes map differently
      if (businessMode === "dispatch") {
        if (behaviorMode === "suggest_callback") {
          return "When a caller needs service: Collect their details (location, vehicle info, situation). Share estimated response times if available. Then use create_callback with the details so dispatch can assign a driver.";
        }
        if (behaviorMode === "book_pending") {
          return "When a caller needs service: Collect their details and create the dispatch job. Let the caller know the job is logged and dispatch will confirm assignment shortly. Do not say the job is confirmed — say 'We have your request and a driver will be assigned shortly.'";
        }
        return "When a caller needs service: Collect their details and create the dispatch job. Confirm the job directly with the caller.";
      }

      // Food mode — booking modes apply to reservations, not orders
      if (businessMode === "food") {
        if (behaviorMode === "suggest_callback") {
          return "For reservations: Check availability, share available times, then use create_callback with the preferred time so the restaurant can confirm. For orders: Take the order normally using the order flow.";
        }
        if (behaviorMode === "book_pending") {
          return "For reservations: Check availability and create the reservation, but tell the caller it is tentative and the restaurant will confirm. For orders: Take the order normally using the order flow.";
        }
        return "For reservations: Check availability and book directly. For orders: Take the order normally using the order flow.";
      }

      // Service, medical, and other booking-capable modes
      switch (behaviorMode) {
        case "suggest_callback":
          return "BOOKING MODE: Suggest and Callback. When a caller wants to book: Use suggest_availability to check times. Share the available times with the caller. Then use create_callback (NOT create_booking) and include the preferred time in the notes. Frame it as personal service: say something like 'Let me have the team confirm that for you' or 'I'll get that time held for you and someone will confirm shortly.' Never create a booking directly.";
        case "book_pending":
          return "BOOKING MODE: Book Pending Approval. When a caller wants to book: Check availability and create the booking normally. But tell the caller the appointment is TENTATIVE. Say it's 'penciled in' and 'you'll get a confirmation shortly.' Never say the word 'confirmed.' The business owner will review and confirm. If the caller asks if it's confirmed, say 'It's reserved for you and the team will send you a confirmation very soon.'";
        default:
          return "BOOKING MODE: Auto Book. When a caller wants to book: Check availability, find a time that works, and create the booking. Confirm the appointment directly with the caller. You have full authority to book appointments.";
      }
    },
    defaultValue: "Collect the caller's information and use create_callback so the team can follow up.",
    category: "ai_settings",
    includeInCompactJson: true,
    speechReady: true,
  },

  // ===== INTELLIGENCE =====
  {
    key: "intent_rules_summary",
    description: "Custom intent/behavior rules",
    type: "string",
    source: "intelligence.intent_rules_summary",
    defaultValue: "",
    category: "intelligence",
  },
  {
    key: "required_questions_summary",
    description: "Summary of required intake questions",
    type: "string",
    source: "intelligence.required_questions_summary",
    defaultValue: "No required questions configured",
    category: "intelligence",
    includeInCompactJson: true,
  },
  {
    key: "memory_hints_summary",
    description: "Customer memory hints (PHI in HIPAA mode)",
    type: "string",
    source: "intelligence.memory_hints_summary",
    defaultValue: "",
    category: "intelligence",
    isPhi: true,
  },
  {
    key: "memory_enabled",
    description: "Whether customer memory is enabled",
    type: "boolean",
    source: "intelligence.settings.memory_enabled",
    defaultValue: false,
    category: "intelligence",
  },

  // ===== DISPATCH / INTAKE FIELDS =====
  {
    key: "dispatch_intake_fields_summary",
    description: "Industry-specific intake fields the AI must collect for dispatch",
    type: "string",
    source: (ctx) => {
      const fields = (ctx as any).dispatch_intake_fields;
      if (!fields || !Array.isArray(fields) || fields.length === 0) return "";
      const required = fields.filter((f: any) => f.is_required);
      const optional = fields.filter((f: any) => !f.is_required);
      const parts: string[] = [];
      if (required.length > 0) {
        parts.push("MUST collect: " + required.map((f: any) => f.ai_prompt_hint || f.field_label).join("; "));
      }
      if (optional.length > 0) {
        parts.push("Ask if relevant: " + optional.map((f: any) => f.ai_prompt_hint || f.field_label).join("; "));
      }
      return parts.join(". ");
    },
    defaultValue: "",
    category: "intelligence",
    includeInCompactJson: true,
  },
  {
    key: "dispatch_default_flow",
    description: "Dispatch timing flow: immediate_first, scheduled_first, or hybrid",
    type: "string",
    source: (ctx) => {
      const slug = (ctx as any).tenant?.industry_slug || "";
      const flowMap: Record<string, string> = {
        towing: "immediate_first", locksmith: "immediate_first",
        courier: "hybrid", medical_transport: "scheduled_first",
        field_service: "hybrid", cleaning: "scheduled_first",
        landscaping: "scheduled_first", pest_control: "scheduled_first",
        junk_removal: "scheduled_first", mobile_detailing: "scheduled_first",
        mobile_mechanic: "hybrid", delivery: "hybrid", moving: "scheduled_first",
      };
      return flowMap[slug] || "immediate_first";
    },
    defaultValue: "immediate_first",
    category: "intelligence",
    includeInCompactJson: true,
  },

  // ===== FOOD SETTINGS =====
  {
    key: "estimated_prep_minutes",
    description: "Estimated food preparation time",
    type: "number",
    source: "food_settings.estimated_prep_minutes",
    defaultValue: 15,
    category: "food",
  },
  {
    key: "accepts_pickup",
    description: "Whether pickup orders are accepted",
    type: "string",
    source: (ctx) => ctx.food_settings?.accepts_pickup !== false ? "true" : "false",
    defaultValue: "true",
    category: "food",
  },
  {
    key: "accepts_delivery",
    description: "Whether delivery orders are accepted",
    type: "string",
    source: (ctx) => ctx.food_settings?.accepts_delivery === true ? "true" : "false",
    defaultValue: "false",
    category: "food",
  },
  {
    key: "accepts_dine_in",
    description: "Whether dine-in is accepted",
    type: "string",
    source: (ctx) => ctx.food_settings?.accepts_dine_in !== false ? "true" : "false",
    defaultValue: "true",
    category: "food",
  },
  {
    key: "delivery_radius_miles",
    description: "Delivery radius in miles",
    type: "string",
    source: (ctx) => String(ctx.food_settings?.delivery_radius_miles || ""),
    defaultValue: "",
    category: "food",
  },
  {
    key: "delivery_minimum_dollars",
    description: "Minimum order for delivery",
    type: "string",
    source: (ctx) => {
      if (!ctx.food_settings?.delivery_minimum_cents) return "";
      return (ctx.food_settings.delivery_minimum_cents / 100).toFixed(2);
    },
    defaultValue: "",
    category: "food",
  },
  {
    key: "accepts_catering",
    description: "Whether catering orders are accepted",
    type: "string",
    source: (ctx) => ctx.food_settings?.accepts_catering === true ? "true" : "false",
    defaultValue: "false",
    category: "food",
  },

  // ===== DISPATCH-SPECIFIC KNOWLEDGE =====
  {
    key: "vehicle_knowledge_summary",
    description: "Vehicle classification and towing requirements (AWD, electric, etc.)",
    type: "string",
    source: "knowledge.vehicle_knowledge_summary",
    defaultValue: "",
    category: "offerings",
  },
  {
    key: "roadside_safety_scripts",
    description: "Context-specific safety guidance (highway, night, accident)",
    type: "string",
    source: "knowledge.roadside_safety_scripts",
    defaultValue: "",
    category: "policies",
  },
  {
    key: "price_modifiers_summary",
    description: "Automatic surcharges explained (after-hours, vehicle-specific)",
    type: "string",
    source: "pricing.price_modifiers_summary",
    defaultValue: "",
    category: "pricing",
  },

  // ===== COMPETITOR & SEASONAL KNOWLEDGE =====
  {
    key: "competitor_positioning_summary",
    description: "How to handle competitor comparisons",
    type: "string",
    source: "knowledge.competitor_positioning_summary",
    defaultValue: "",
    category: "policies",
  },
  {
    key: "competitor_never_say",
    description: "Things to never say about competitors",
    type: "string",
    source: (ctx) => {
      const neverSay = ctx.knowledge.competitor_never_say || [];
      if (neverSay.length === 0) return "";
      return neverSay.join(", ");
    },
    defaultValue: "",
    category: "policies",
  },
  {
    key: "our_advantages_summary",
    description: "Our competitive advantages to mention",
    type: "string",
    source: (ctx) => {
      const advantages = ctx.knowledge.our_advantages || [];
      if (advantages.length === 0) return "";
      return advantages.join(", ");
    },
    defaultValue: "",
    category: "policies",
  },
  {
    key: "seasonal_events_summary",
    description: "Time-sensitive promotions or service announcements",
    type: "string",
    source: "knowledge.seasonal_events_summary",
    defaultValue: "",
    category: "offerings",
  },

  // ===== DEBUG FLAGS =====
  {
    key: "context_has_hours",
    description: "Debug: whether hours data exists",
    type: "string",
    source: (ctx) => {
      const hasHours = Object.keys(ctx.tenant.hours).length > 0 || Boolean(ctx.tenant.hours_today);
      return hasHours ? "true" : "false";
    },
    defaultValue: "false",
    category: "debug",
  },
  {
    key: "context_has_menu",
    description: "Debug: whether menu data exists",
    type: "string",
    source: (ctx) => ctx.offerings.menu.length > 0 ? "true" : "false",
    defaultValue: "false",
    category: "debug",
  },
  {
    key: "context_has_services",
    description: "Debug: whether services data exists",
    type: "string",
    source: (ctx) => ctx.offerings.services.length > 0 ? "true" : "false",
    defaultValue: "false",
    category: "debug",
  },
  {
    key: "context_menu_count",
    description: "Debug: number of menu items",
    type: "string",
    source: (ctx) => String(ctx.offerings.menu.length),
    defaultValue: "0",
    category: "debug",
  },
  {
    key: "context_services_count",
    description: "Debug: number of services",
    type: "string",
    source: (ctx) => String(ctx.offerings.services.length),
    defaultValue: "0",
    category: "debug",
  },
  {
    key: "context_missing_sections",
    description: "Debug: comma-separated missing sections",
    type: "string",
    source: (ctx) => ctx._meta.missing_sections.join(","),
    defaultValue: "",
    category: "debug",
  },

  // ===== IMPOUND LOT VARIABLES =====
  {
    key: "impound_lot_id",
    description: "Default impound lot UUID",
    type: "string",
    source: (ctx) => ctx.impound?.lot_id || "",
    defaultValue: "",
    category: "core",
  },
  {
    key: "impound_lot_name",
    description: "Impound lot name",
    type: "string",
    source: (ctx) => ctx.impound?.lot_name || "",
    defaultValue: "",
    category: "core",
  },
  {
    key: "impound_lot_address",
    description: "Full impound lot address",
    type: "string",
    source: (ctx) => ctx.impound?.lot_address || "",
    defaultValue: "",
    category: "core",
  },
  {
    key: "impound_lot_phone",
    description: "Impound lot phone number",
    type: "string",
    source: (ctx) => ctx.impound?.lot_phone || "",
    defaultValue: "",
    category: "core",
  },
  {
    key: "impound_lot_hours_today",
    description: "Today's hours for impound lot (e.g., '8 AM to 5 PM')",
    type: "string",
    source: (ctx) => ctx.impound?.lot_hours_today || "",
    defaultValue: "",
    category: "hours",
  },
  {
    key: "impound_lot_hours_summary",
    description: "Weekly hours summary for voice (e.g., 'Monday through Friday 8 to 5')",
    type: "string",
    source: (ctx) => ctx.impound?.lot_hours_summary || "",
    defaultValue: "",
    category: "hours",
  },
  {
    key: "impound_is_open_now",
    description: "Whether the impound lot is currently open",
    type: "boolean",
    source: (ctx) => ctx.impound?.is_open_now || false,
    defaultValue: false,
    category: "hours",
  },
  {
    key: "impound_next_open",
    description: "When the lot next opens (e.g., 'Tomorrow at 8 AM')",
    type: "string",
    source: (ctx) => ctx.impound?.next_open || "",
    defaultValue: "",
    category: "hours",
  },
  {
    key: "impound_base_tow_fee",
    description: "Base tow fee in dollars (e.g., '175')",
    type: "string",
    source: (ctx) => ctx.impound?.base_tow_fee_cents
      ? String(ctx.impound.base_tow_fee_cents / 100)
      : "",
    defaultValue: "",
    category: "pricing",
  },
  {
    key: "impound_daily_storage_fee",
    description: "Daily storage fee in dollars (e.g., '35')",
    type: "string",
    source: (ctx) => ctx.impound?.daily_storage_cents
      ? String(ctx.impound.daily_storage_cents / 100)
      : "",
    defaultValue: "",
    category: "pricing",
  },
  {
    key: "impound_admin_fee",
    description: "Admin fee in dollars",
    type: "string",
    source: (ctx) => ctx.impound?.admin_fee_cents
      ? String(ctx.impound.admin_fee_cents / 100)
      : "",
    defaultValue: "",
    category: "pricing",
  },
  {
    key: "impound_gate_fee",
    description: "Gate fee in dollars",
    type: "string",
    source: (ctx) => ctx.impound?.gate_fee_cents
      ? String(ctx.impound.gate_fee_cents / 100)
      : "",
    defaultValue: "",
    category: "pricing",
  },
  {
    key: "impound_fee_summary",
    description: "Speech-ready summary of all fees",
    type: "string",
    source: (ctx) => ctx.impound?.fee_summary || "",
    defaultValue: "",
    category: "pricing",
  },
  {
    key: "impound_release_requirements",
    description: "Comma-separated release requirements (raw keys)",
    type: "string",
    source: (ctx) => ctx.impound?.release_requirements?.join(", ") || "",
    defaultValue: "",
    category: "policies",
  },
  {
    key: "impound_release_requirements_summary",
    description: "Speech-ready release requirements",
    type: "string",
    source: (ctx) => ctx.impound?.release_requirements_summary || "",
    defaultValue: "",
    category: "policies",
  },
  {
    key: "impound_accepted_payment",
    description: "Accepted payment methods for release",
    type: "string",
    source: (ctx) => ctx.impound?.accepted_payment_summary || "",
    defaultValue: "",
    category: "policies",
  },

  // ===== REFERRAL NETWORK =====
  {
    key: "referral_network_enabled",
    description: "Whether the referral network is enabled for this tenant",
    type: "string",
    source: (ctx) => ctx.referral_network?.enabled ? "true" : "false",
    defaultValue: "false",
    category: "core",
  },
  {
    key: "referral_network_mode",
    description: "Referral mode: send_only, receive_only, both, or disabled",
    type: "string",
    source: (ctx) => {
      const rn = ctx.referral_network;
      if (!rn?.enabled) return "disabled";
      if (rn.send_referrals && rn.accept_referrals) return "both";
      if (rn.send_referrals) return "send_only";
      if (rn.accept_referrals) return "receive_only";
      return "disabled";
    },
    defaultValue: "disabled",
    category: "core",
  },
  {
    key: "referral_network_intro_style",
    description: "How the AI should introduce referral businesses: enthusiastic, neutral, or minimal",
    type: "string",
    source: (ctx) => ctx.referral_network?.intro_style || "enthusiastic",
    defaultValue: "enthusiastic",
    category: "core",
  },
  {
    key: "is_referral_transfer",
    description: "Whether this call was received via a referral transfer from another business",
    type: "string",
    source: "_meta.is_referral_transfer",
    defaultValue: "",
    category: "caller",
  },
  {
    key: "referral_context",
    description: "Speech-ready context about a referred caller (name, need, source business)",
    type: "string",
    source: "_meta.referral_context",
    defaultValue: "",
    category: "caller",
  },
  {
    key: "referral_caller_name",
    description: "Name of caller from referral transfer",
    type: "string",
    source: "_meta.referral_caller_name",
    defaultValue: "",
    category: "caller",
  },
  {
    key: "referral_caller_need",
    description: "Service the referred caller needs",
    type: "string",
    source: "_meta.referral_caller_need",
    defaultValue: "",
    category: "caller",
  },
  {
    key: "referral_caller_phone",
    description: "Phone of referred caller (HIPAA-redacted for medical)",
    type: "string",
    source: "_meta.referral_caller_phone",
    defaultValue: "",
    isPhi: true,
    category: "caller",
  },
  {
    key: "referral_source_business",
    description: "Name of business that referred this caller",
    type: "string",
    source: "_meta.referral_source_business",
    defaultValue: "",
    category: "caller",
  },

  // ===== BUSINESS BRAIN SNAPSHOT =====
  {
    key: "business_brain_summary",
    description: "AI-facing summary of Business Brain (business identity, service area, policies, counts)",
    type: "string",
    source: "business_brain_summary",
    defaultValue: "",
    category: "meta",
    includeInCompactJson: false, // Already summarizes the brain
  },
  {
    key: "business_brain_json",
    description: "Full Business Brain snapshot as JSON string",
    type: "string",
    source: "business_brain_json",
    defaultValue: "{}",
    category: "meta",
    includeInCompactJson: false, // Too large for compact
  },

  // ===== WORKFLOW CONFIGURATION - DISPATCH =====
  {
    key: "dispatch_vehicle_timing",
    description: "When to collect vehicle info: before_pricing, after_pricing, or optional",
    type: "string",
    source: (ctx) => ctx.workflow_config?.dispatch?.vehicle_info_timing || "after_pricing",
    defaultValue: "after_pricing",
    category: "ai_settings",
  },
  {
    key: "dispatch_vehicle_affects_pricing",
    description: "Whether vehicle type affects price quote",
    type: "string",
    source: (ctx) => ctx.workflow_config?.dispatch?.vehicle_affects_pricing === true ? "true" : "false",
    defaultValue: "true",
    category: "ai_settings",
  },
  {
    key: "dispatch_required_vehicle_fields",
    description: "Required vehicle fields to collect (comma-separated)",
    type: "string",
    source: (ctx) => (ctx.workflow_config?.dispatch?.required_vehicle_fields || []).join(", "),
    defaultValue: "color, make",
    category: "ai_settings",
  },
  {
    key: "dispatch_luxury_flatbed_enabled",
    description: "Whether to recommend flatbed for luxury vehicles",
    type: "string",
    source: (ctx) => ctx.workflow_config?.dispatch?.luxury_flatbed_recommendation !== false ? "true" : "false",
    defaultValue: "true",
    category: "ai_settings",
  },
  {
    key: "dispatch_luxury_brands",
    description: "Luxury vehicle brands that trigger flatbed recommendation (comma-separated)",
    type: "string",
    source: (ctx) => (ctx.workflow_config?.dispatch?.luxury_brands || []).join(", "),
    defaultValue: "BMW, Mercedes, Audi, Porsche, Tesla, Lexus",
    category: "ai_settings",
  },
  {
    key: "dispatch_awd_detection_enabled",
    description: "Whether to ask about all-wheel drive for luxury vehicles",
    type: "string",
    source: (ctx) => ctx.workflow_config?.dispatch?.awd_detection_enabled !== false ? "true" : "false",
    defaultValue: "true",
    category: "ai_settings",
  },
  {
    key: "dispatch_ask_payment_method",
    description: "Whether to ask about payment method",
    type: "string",
    source: (ctx) => ctx.workflow_config?.dispatch?.ask_payment_method === true ? "true" : "false",
    defaultValue: "true",
    category: "ai_settings",
  },
  {
    key: "dispatch_payment_timing",
    description: "When to collect payment: upfront, on_arrival, or invoiced",
    type: "string",
    source: (ctx) => ctx.workflow_config?.dispatch?.payment_timing || "on_arrival",
    defaultValue: "on_arrival",
    category: "ai_settings",
  },
  {
    key: "dispatch_payment_due_message",
    description: "Script for explaining when payment is due",
    type: "string",
    source: (ctx) => ctx.workflow_config?.dispatch?.payment_due_message || "Payment is due when the driver arrives. We accept cash and card.",
    defaultValue: "Payment is due when the driver arrives. We accept cash and card.",
    category: "ai_settings",
    speechReady: true,
  },
  {
    key: "dispatch_confirm_geocoded_address",
    description: "Whether to confirm geocoded address with caller",
    type: "string",
    source: (ctx) => ctx.workflow_config?.dispatch?.confirm_geocoded_address === true ? "true" : "false",
    defaultValue: "true",
    category: "ai_settings",
  },
  {
    key: "dispatch_address_confirmation_script",
    description: "Script for confirming address",
    type: "string",
    source: (ctx) => ctx.workflow_config?.dispatch?.address_confirmation_script || "",
    defaultValue: "Got it, is that correct?",
    category: "ai_settings",
    speechReady: true,
  },
  {
    key: "dispatch_driver_callback_script",
    description: "Script explaining when driver will call",
    type: "string",
    source: (ctx) => ctx.workflow_config?.dispatch?.driver_callback_script || "Your driver will give you a call when they're about 10 minutes away.",
    defaultValue: "Your driver will give you a call when they're about 10 minutes away.",
    category: "ai_settings",
    speechReady: true,
  },
  {
    key: "dispatch_include_direct_contact",
    description: "Whether to provide driver direct contact info",
    type: "string",
    source: (ctx) => ctx.workflow_config?.dispatch?.include_direct_contact_info === true ? "true" : "false",
    defaultValue: "false",
    category: "ai_settings",
  },

  // ===== WORKFLOW CONFIGURATION - SERVICE =====
  {
    key: "service_collect_duration",
    description: "Whether to collect service duration from customer",
    type: "string",
    source: (ctx) => ctx.workflow_config?.service?.collect_service_duration === true ? "true" : "false",
    defaultValue: "true",
    category: "ai_settings",
  },
  {
    key: "service_deposit_upfront",
    description: "Whether to collect deposit before booking",
    type: "string",
    source: (ctx) => ctx.workflow_config?.service?.collect_deposit_upfront === true ? "true" : "false",
    defaultValue: "false",
    category: "ai_settings",
  },
  {
    key: "service_deposit_timing",
    description: "When to collect deposit: before_booking, at_confirmation, or day_before",
    type: "string",
    source: (ctx) => ctx.workflow_config?.service?.deposit_timing || "at_confirmation",
    defaultValue: "at_confirmation",
    category: "ai_settings",
  },
  {
    key: "service_suggest_alternatives",
    description: "Whether to suggest alternative times when unavailable",
    type: "string",
    source: (ctx) => ctx.workflow_config?.service?.suggest_alternatives_when_unavailable === true ? "true" : "false",
    defaultValue: "true",
    category: "ai_settings",
  },
  {
    key: "service_max_alternatives",
    description: "Maximum number of alternative times to suggest",
    type: "string",
    source: (ctx) => String(ctx.workflow_config?.service?.max_alternatives_to_suggest || 3),
    defaultValue: "3",
    category: "ai_settings",
  },
  {
    key: "service_confirmation_script",
    description: "Script for confirming booking",
    type: "string",
    source: (ctx) => ctx.workflow_config?.service?.booking_confirmation_script || "",
    defaultValue: "Perfect! You're all set",
    category: "ai_settings",
    speechReady: true,
  },
  {
    key: "service_allow_rescheduling",
    description: "Whether AI can reschedule bookings",
    type: "string",
    source: (ctx) => ctx.workflow_config?.service?.allow_ai_rescheduling === true ? "true" : "false",
    defaultValue: "true",
    category: "ai_settings",
  },
  {
    key: "service_allow_cancellation",
    description: "Whether AI can cancel bookings",
    type: "string",
    source: (ctx) => ctx.workflow_config?.service?.allow_ai_cancellation === true ? "true" : "false",
    defaultValue: "false",
    category: "ai_settings",
  },

  // ===== WORKFLOW CONFIGURATION - FOOD =====
  {
    key: "food_ask_pickup_vs_delivery",
    description: "When to ask about order type: always, if_both_enabled, or never",
    type: "string",
    source: (ctx) => ctx.workflow_config?.food?.ask_pickup_vs_delivery || "if_both_enabled",
    defaultValue: "if_both_enabled",
    category: "ai_settings",
  },
  {
    key: "food_default_order_type",
    description: "Default order type if not asking: pickup, delivery, or ask",
    type: "string",
    source: (ctx) => ctx.workflow_config?.food?.default_order_type || "ask",
    defaultValue: "ask",
    category: "ai_settings",
  },
  {
    key: "food_allow_customizations",
    description: "Whether to allow menu item customizations",
    type: "string",
    source: (ctx) => ctx.workflow_config?.food?.allow_menu_customizations === true ? "true" : "false",
    defaultValue: "true",
    category: "ai_settings",
  },
  {
    key: "food_require_allergy_check",
    description: "Whether to ask about allergies",
    type: "string",
    source: (ctx) => ctx.workflow_config?.food?.require_allergy_check === true ? "true" : "false",
    defaultValue: "false",
    category: "ai_settings",
  },
  {
    key: "food_ask_asap_vs_scheduled",
    description: "Whether to ask if order is ASAP or scheduled for later",
    type: "string",
    source: (ctx) => ctx.workflow_config?.food?.ask_asap_vs_scheduled === true ? "true" : "false",
    defaultValue: "true",
    category: "ai_settings",
  },
  {
    key: "food_confirmation_script",
    description: "Script for confirming order",
    type: "string",
    source: (ctx) => ctx.workflow_config?.food?.order_confirmation_script || "",
    defaultValue: "Great! Your order will be ready soon",
    category: "ai_settings",
    speechReady: true,
  },
  {
    key: "food_repeat_order_back",
    description: "Whether to repeat order back to customer",
    type: "string",
    source: (ctx) => ctx.workflow_config?.food?.repeat_order_back === true ? "true" : "false",
    defaultValue: "true",
    category: "ai_settings",
  },
  {
    key: "food_confirm_total",
    description: "Whether to confirm total before submitting",
    type: "string",
    source: (ctx) => ctx.workflow_config?.food?.confirm_total_before_submit === true ? "true" : "false",
    defaultValue: "true",
    category: "ai_settings",
  },

  // ===== FOOD EXTENDED =====
  {
    key: "catering_min_guests",
    description: "Minimum guest count for catering orders",
    type: "string",
    source: (ctx) => ctx.food_settings?.catering_min_guests?.toString() || "",
    defaultValue: "",
    category: "ai_settings",
  },
  {
    key: "catering_lead_days",
    description: "Minimum lead time in days for catering orders",
    type: "string",
    source: (ctx) => ctx.food_settings?.catering_lead_days?.toString() || "",
    defaultValue: "",
    category: "ai_settings",
  },
  {
    key: "order_confirmation_mode",
    description: "How orders are confirmed: auto_confirm or pending_approval",
    type: "string",
    source: (ctx) => ctx.food_settings?.order_confirmation_mode || "auto_confirm",
    defaultValue: "auto_confirm",
    category: "ai_settings",
  },
  {
    key: "min_advance_order_minutes",
    description: "Minimum minutes in advance for scheduled orders",
    type: "string",
    source: (ctx) => ctx.workflow_config?.food?.min_advance_order_minutes?.toString() || "0",
    defaultValue: "0",
    category: "ai_settings",
  },
  {
    key: "default_prep_time_minutes",
    description: "Default food preparation time in minutes",
    type: "string",
    source: (ctx) => ctx.workflow_config?.food?.default_prep_time_minutes?.toString() || "15",
    defaultValue: "15",
    category: "ai_settings",
  },
  {
    key: "food_collect_delivery_instructions",
    description: "Whether to collect delivery instructions (gate code, leave at door, etc.)",
    type: "string",
    source: (ctx) => ctx.workflow_config?.food?.collect_delivery_instructions === true ? "true" : "false",
    defaultValue: "true",
    category: "ai_settings",
  },
  {
    key: "food_require_buzzer_code",
    description: "Whether to ask for buzzer/gate code on delivery orders",
    type: "string",
    source: (ctx) => ctx.workflow_config?.food?.require_buzzer_code === true ? "true" : "false",
    defaultValue: "false",
    category: "ai_settings",
  },
  {
    key: "food_service_types_summary",
    description: "Comma-separated list of enabled order types (Pickup, Delivery, Dine-in)",
    type: "string",
    source: (ctx) => ctx.food_settings?.food_service_types_summary || "",
    defaultValue: "",
    category: "ai_settings",
  },
  {
    key: "daily_specials_summary",
    description: "Formatted summary of active daily/weekly specials",
    type: "string",
    source: (ctx) => ctx.food_settings?.daily_specials_summary || "",
    defaultValue: "",
    category: "ai_settings",
  },
  {
    key: "delivery_fee_summary",
    description: "Formatted summary of delivery zones, fees, and minimums",
    type: "string",
    source: (ctx) => ctx.food_settings?.delivery_fee_summary || "",
    defaultValue: "",
    category: "ai_settings",
  },
  {
    key: "dietary_tags_available",
    description: "Comma-separated dietary tags available on menu (Gluten-free, Vegan, etc.)",
    type: "string",
    source: (ctx) => ctx.food_settings?.dietary_tags_available || "",
    defaultValue: "",
    category: "ai_settings",
  },
  {
    key: "food_policies_summary",
    description: "Formatted food policies: cancellation, allergy disclaimer, modification cutoff",
    type: "string",
    source: (ctx) => ctx.food_settings?.food_policies_summary || "",
    defaultValue: "",
    category: "ai_settings",
  },
  {
    key: "menu_categories_summary",
    description: "Comma-separated menu categories (Appetizers, Entrees, Desserts, Drinks)",
    type: "string",
    source: (ctx) => ctx.food_settings?.menu_categories_summary || "",
    defaultValue: "",
    category: "ai_settings",
  },
  {
    key: "has_food_orders",
    description: "Whether food orders module is enabled",
    type: "string",
    source: (ctx) => ctx.operations?.modules?.orders_enabled === true ? "true" : "false",
    defaultValue: "false",
    category: "ai_settings",
  },
  {
    key: "has_reservations",
    description: "Whether reservations module is enabled",
    type: "string",
    source: (ctx) => ctx.operations?.modules?.reservations_enabled === true ? "true" : "false",
    defaultValue: "false",
    category: "ai_settings",
  },
  {
    key: "has_catering",
    description: "Whether catering module is enabled",
    type: "string",
    source: (ctx) => ctx.operations?.modules?.catering_enabled === true ? "true" : "false",
    defaultValue: "false",
    category: "ai_settings",
  },

  // ===== WORKFLOW CONFIGURATION - MEDICAL =====
  {
    key: "medical_consent_timing",
    description: "When to collect HIPAA consent: before_intake, after_reason, or at_end",
    type: "string",
    source: (ctx) => ctx.workflow_config?.medical?.consent_timing || "before_intake",
    defaultValue: "before_intake",
    category: "ai_settings",
  },
  {
    key: "medical_consent_script",
    description: "Script for collecting HIPAA consent",
    type: "string",
    source: (ctx) => ctx.workflow_config?.medical?.consent_script || "",
    defaultValue: "I need your verbal consent to collect your health information. Do I have your permission?",
    category: "ai_settings",
    speechReady: true,
  },
  {
    key: "medical_collect_symptom_details",
    description: "Whether to collect detailed symptom information",
    type: "string",
    source: (ctx) => ctx.workflow_config?.medical?.collect_symptom_details === true ? "true" : "false",
    defaultValue: "true",
    category: "ai_settings",
  },
  {
    key: "medical_detect_emergency",
    description: "Whether to detect emergency keywords and escalate",
    type: "string",
    source: (ctx) => ctx.workflow_config?.medical?.detect_emergency_keywords === true ? "true" : "false",
    defaultValue: "true",
    category: "ai_settings",
  },
  {
    key: "medical_emergency_script",
    description: "Script for emergency escalation",
    type: "string",
    source: (ctx) => ctx.workflow_config?.medical?.emergency_escalation_script || "",
    defaultValue: "This may need immediate attention. I recommend calling 911 or going to the ER.",
    category: "ai_settings",
    speechReady: true,
  },

  // ===== MEDICAL EXTENDED (practice settings, coverage, policies) =====

  // --- Insurance & Billing ---
  {
    key: "accepts_insurance",
    description: "Whether the practice accepts insurance",
    type: "string",
    source: (ctx) => ctx.medical_settings?.practice?.accepts_insurance === true ? "true" : "false",
    defaultValue: "false",
    category: "ai_settings",
  },
  {
    key: "accepted_carriers_summary",
    description: "Comma-separated list of accepted insurance carriers",
    type: "string",
    source: (ctx) => ctx.medical_settings?.accepted_carriers_summary || "",
    defaultValue: "",
    category: "ai_settings",
    speechReady: true,
  },
  {
    key: "insurance_notes",
    description: "Additional insurance notes for the practice",
    type: "string",
    source: (ctx) => ctx.medical_settings?.practice?.insurance_notes || "",
    defaultValue: "",
    category: "ai_settings",
    speechReady: true,
  },
  {
    key: "insurance_verification_required",
    description: "Whether insurance verification is required before appointments",
    type: "string",
    source: (ctx) => ctx.medical_settings?.policies?.insurance_verification_required === false ? "false" : "true",
    defaultValue: "true",
    category: "ai_settings",
  },
  {
    key: "insurance_verification_days_before",
    description: "How many days before appointment to verify insurance",
    type: "string",
    source: (ctx) => String(ctx.medical_settings?.policies?.insurance_verification_days_before ?? 2),
    defaultValue: "2",
    category: "ai_settings",
  },
  {
    key: "out_of_network_disclosure",
    description: "Disclosure message for out-of-network patients",
    type: "string",
    source: (ctx) => ctx.medical_settings?.policies?.out_of_network_disclosure || "",
    defaultValue: "",
    category: "ai_settings",
    speechReady: true,
  },
  {
    key: "accepts_medicare",
    description: "Whether the practice accepts Medicare",
    type: "string",
    source: (ctx) => ctx.medical_settings?.coverage?.accepts_medicare === true ? "true" : "false",
    defaultValue: "false",
    category: "ai_settings",
  },
  {
    key: "accepts_medicaid",
    description: "Whether the practice accepts Medicaid",
    type: "string",
    source: (ctx) => ctx.medical_settings?.coverage?.accepts_medicaid === true ? "true" : "false",
    defaultValue: "false",
    category: "ai_settings",
  },
  {
    key: "in_network_insurers_summary",
    description: "Comma-separated list of in-network insurers",
    type: "string",
    source: (ctx) => ctx.medical_settings?.in_network_insurers_summary || "",
    defaultValue: "",
    category: "ai_settings",
    speechReady: true,
  },
  {
    key: "payment_plan_available",
    description: "Whether the practice offers payment plans",
    type: "string",
    source: (ctx) => ctx.medical_settings?.policies?.payment_plan_available === true ? "true" : "false",
    defaultValue: "false",
    category: "ai_settings",
  },

  // --- Fee Variables ---
  {
    key: "new_patient_fee_display",
    description: "Display-formatted new patient visit fee",
    type: "string",
    source: (ctx) => ctx.medical_settings?.new_patient_fee_display || "",
    defaultValue: "",
    category: "ai_settings",
    speechReady: true,
  },
  {
    key: "follow_up_fee_display",
    description: "Display-formatted follow-up visit fee",
    type: "string",
    source: (ctx) => ctx.medical_settings?.follow_up_fee_display || "",
    defaultValue: "",
    category: "ai_settings",
    speechReady: true,
  },
  {
    key: "no_show_fee_display",
    description: "Display-formatted no-show fee",
    type: "string",
    source: (ctx) => ctx.medical_settings?.no_show_fee_display || "",
    defaultValue: "",
    category: "ai_settings",
    speechReady: true,
  },
  {
    key: "cancellation_fee_display",
    description: "Display-formatted cancellation fee",
    type: "string",
    source: (ctx) => ctx.medical_settings?.cancellation_fee_display || "",
    defaultValue: "",
    category: "ai_settings",
    speechReady: true,
  },

  // --- Appointment & Policy Variables ---
  {
    key: "medical_cancellation_notice_hours",
    description: "Hours of notice required for cancellation",
    type: "string",
    source: (ctx) => String(ctx.medical_settings?.policies?.cancellation_notice_hours ?? 24),
    defaultValue: "24",
    category: "ai_settings",
  },
  {
    key: "new_patient_arrival_minutes",
    description: "How many minutes early new patients should arrive",
    type: "string",
    source: (ctx) => String(ctx.medical_settings?.policies?.new_patient_arrival_minutes ?? 15),
    defaultValue: "15",
    category: "ai_settings",
  },
  {
    key: "appointment_late_arrival_minutes",
    description: "Grace period in minutes for late arrivals",
    type: "string",
    source: (ctx) => String(ctx.medical_settings?.policies?.appointment_late_arrival_minutes ?? 15),
    defaultValue: "15",
    category: "ai_settings",
  },
  {
    key: "prescription_refill_notice_days",
    description: "Business days needed for prescription refills",
    type: "string",
    source: (ctx) => String(ctx.medical_settings?.policies?.prescription_refill_notice_days ?? 5),
    defaultValue: "5",
    category: "ai_settings",
  },

  // --- Coverage & Telehealth Variables ---
  {
    key: "offers_telehealth",
    description: "Whether the practice offers telehealth visits",
    type: "string",
    source: (ctx) => ctx.medical_settings?.coverage?.offers_telehealth === true ? "true" : "false",
    defaultValue: "false",
    category: "ai_settings",
  },
  {
    key: "offers_home_visits",
    description: "Whether the practice offers home visits",
    type: "string",
    source: (ctx) => ctx.medical_settings?.coverage?.offers_home_visits === true ? "true" : "false",
    defaultValue: "false",
    category: "ai_settings",
  },
  {
    key: "home_visit_radius_miles",
    description: "Radius in miles for home visits",
    type: "string",
    source: (ctx) => ctx.medical_settings?.coverage?.home_visit_radius_miles ? String(ctx.medical_settings.coverage.home_visit_radius_miles) : "",
    defaultValue: "",
    category: "ai_settings",
  },
  {
    key: "reserves_urgent_slots",
    description: "Whether the practice reserves same-day urgent slots",
    type: "string",
    source: (ctx) => ctx.medical_settings?.coverage?.reserves_urgent_slots === true ? "true" : "false",
    defaultValue: "false",
    category: "ai_settings",
  },
  {
    key: "urgent_slots_per_day",
    description: "Number of urgent same-day slots held each day",
    type: "string",
    source: (ctx) => String(ctx.medical_settings?.coverage?.urgent_slots_per_day ?? 2),
    defaultValue: "2",
    category: "ai_settings",
  },

  // --- After-Hours & Emergency Variables ---
  {
    key: "after_hours_contact_policy",
    description: "What to tell callers after hours",
    type: "string",
    source: (ctx) => ctx.medical_settings?.policies?.after_hours_contact_policy || "",
    defaultValue: "",
    category: "ai_settings",
    speechReady: true,
  },
  {
    key: "hospital_affiliation",
    description: "Affiliated hospital name for emergency referrals",
    type: "string",
    source: (ctx) => ctx.medical_settings?.policies?.hospital_affiliation || "",
    defaultValue: "",
    category: "ai_settings",
    speechReady: true,
  },

  // --- Computed Summary ---
  {
    key: "medical_policies_summary",
    description: "Formatted summary of medical practice policies",
    type: "string",
    source: (ctx) => ctx.medical_settings?.medical_policies_summary || "",
    defaultValue: "",
    category: "ai_settings",
    speechReady: true,
  },

  // ===== WORKFLOW CONFIGURATION - GENERAL =====
  {
    key: "general_ask_callback_time",
    description: "Whether to ask for best time to call back",
    type: "string",
    source: (ctx) => ctx.workflow_config?.general?.ask_best_time_to_call === true ? "true" : "false",
    defaultValue: "true",
    category: "ai_settings",
  },
  {
    key: "general_callback_script",
    description: "Script for confirming callback",
    type: "string",
    source: (ctx) => ctx.workflow_config?.general?.callback_confirmation_script || "",
    defaultValue: "I'll have someone call you back",
    category: "ai_settings",
    speechReady: true,
  },
  {
    key: "general_escalate_unknown",
    description: "Whether to escalate unknown questions",
    type: "string",
    source: (ctx) => ctx.workflow_config?.general?.escalate_unknown_questions === true ? "true" : "false",
    defaultValue: "true",
    category: "ai_settings",
  },
  {
    key: "general_unknown_question_script",
    description: "Script for handling unknown questions",
    type: "string",
    source: (ctx) => ctx.workflow_config?.general?.unknown_question_script || "",
    defaultValue: "That's a great question - let me have someone who can give you the details call you back",
    category: "ai_settings",
    speechReady: true,
  },
  // ===== WORKFLOW CONFIGURATION - SALES =====
  {
    key: "sales_pricing_strategy",
    description: "How to handle pricing questions: deflect_to_visit, give_range, or give_exact",
    type: "string",
    source: (ctx) => ctx.workflow_config?.sales?.sales_pricing_strategy || "deflect_to_visit",
    defaultValue: "deflect_to_visit",
    category: "ai_settings",
  },
  {
    key: "sales_ask_trade_in",
    description: "Whether to ask about trade-ins during qualification",
    type: "string",
    source: (ctx) => ctx.workflow_config?.sales?.sales_ask_trade_in !== false ? "true" : "false",
    defaultValue: "true",
    category: "ai_settings",
  },
  {
    key: "sales_ask_financing",
    description: "Whether to ask about financing during qualification",
    type: "string",
    source: (ctx) => ctx.workflow_config?.sales?.sales_ask_financing !== false ? "true" : "false",
    defaultValue: "true",
    category: "ai_settings",
  },
  {
    key: "sales_ask_timeline",
    description: "Whether to ask about purchase timeline during qualification",
    type: "string",
    source: (ctx) => ctx.workflow_config?.sales?.sales_ask_timeline !== false ? "true" : "false",
    defaultValue: "true",
    category: "ai_settings",
  },
  {
    key: "sales_ask_budget",
    description: "When to ask about budget: always, careful (only if natural), or never",
    type: "string",
    source: (ctx) => ctx.workflow_config?.sales?.sales_ask_budget || "careful",
    defaultValue: "careful",
    category: "ai_settings",
  },
  {
    key: "sales_max_vehicles_to_mention",
    description: "Maximum number of inventory items to describe in a single response",
    type: "string",
    source: (ctx) => String(ctx.workflow_config?.sales?.sales_max_vehicles_to_mention || 3),
    defaultValue: "3",
    category: "ai_settings",
  },
  {
    key: "sales_appointment_label",
    description: "What to call the in-person visit: test drive, showing, demo, consultation, site visit",
    type: "string",
    source: (ctx) => ctx.workflow_config?.sales?.sales_appointment_label || "test drive",
    defaultValue: "test drive",
    category: "ai_settings",
    speechReady: true,
  },
  {
    key: "sales_push_intensity",
    description: "How aggressively to push for an appointment: soft, medium, or assertive",
    type: "string",
    source: (ctx) => ctx.workflow_config?.sales?.sales_push_intensity || "medium",
    defaultValue: "medium",
    category: "ai_settings",
  },
  {
    key: "sales_follow_up_script",
    description: "Custom script for follow-up callbacks or closing the call",
    type: "string",
    source: (ctx) => ctx.workflow_config?.sales?.sales_follow_up_script || "",
    defaultValue: "",
    category: "ai_settings",
    speechReady: true,
  },
  {
    key: "sales_lead_capture_minimum",
    description: "Minimum info to capture before ending call: name_phone, name_phone_interest, or name_phone_interest_timeline",
    type: "string",
    source: (ctx) => ctx.workflow_config?.sales?.sales_lead_capture_minimum || "name_phone_interest",
    defaultValue: "name_phone_interest",
    category: "ai_settings",
  },
  {
    key: "sales_inventory_presentation",
    description: "How to present inventory: conversational, list_format, or highlight_best_match",
    type: "string",
    source: (ctx) => ctx.workflow_config?.sales?.sales_inventory_presentation || "conversational",
    defaultValue: "conversational",
    category: "ai_settings",
  },

  // ===== PHASE 2: PREDICTIVE CONTEXT VARIABLES =====
  {
    key: "caller_history_summary",
    description: "Summary of repeat caller's last 3 call sessions with dates and outcomes",
    type: "string",
    source: "intelligence.caller_history_summary",
    defaultValue: "",
    category: "intelligence",
    speechReady: true,
    isPhi: true,
  },
  {
    key: "predicted_intent_hint",
    description: "Time-based prediction of what this caller probably needs",
    type: "string",
    source: "intelligence.predicted_intent_hint",
    defaultValue: "",
    category: "intelligence",
    speechReady: true,
  },
  {
    key: "caller_priority_tier",
    description: "Caller priority tier: vip, regular, or new",
    type: "string",
    source: "intelligence.caller_priority_tier",
    defaultValue: "new",
    category: "intelligence",
  },
  {
    key: "caller_priority_instructions",
    description: "Behavioral instructions based on caller priority tier",
    type: "string",
    source: "intelligence.caller_priority_instructions",
    defaultValue: "",
    category: "intelligence",
    speechReady: true,
  },
  {
    key: "behavioral_hints_summary",
    description: "Behavioral hints from high-confidence business patterns for this week",
    type: "string",
    source: "intelligence.behavioral_hints_summary",
    defaultValue: "",
    category: "intelligence",
    speechReady: true,
  },
];

// ============= REGISTRY-DRIVEN BUILDER =============

/**
 * Build dynamic variables from the registry.
 * This is the canonical builder that ensures:
 * - All variables are included
 * - No nulls/undefined values
 * - PHI is redacted in HIPAA mode
 * - Compact JSON is generated
 */
export function buildDynamicVariablesFromRegistry(
  ctx: BusinessContext,
  callerPhone: string,
  customerId: string | null
): Record<string, string | number | boolean> {
  const hipaaMode = ctx.safety.hipaa_mode;
  const result: Record<string, string | number | boolean> = {};

  // Build variables from registry
  for (const spec of DYNAMIC_VAR_REGISTRY) {
    // Skip PHI fields in HIPAA mode
    if (hipaaMode && spec.isPhi) {
      result[spec.key] = "";
      continue;
    }

    // Get raw value
    let rawValue: unknown;
    if (typeof spec.source === "function") {
      rawValue = spec.source(ctx, callerPhone, customerId);
    } else {
      rawValue = getByPath(ctx, spec.source);
    }

    // Coerce to final type
    result[spec.key] = coerceByType(rawValue, spec.type, spec.defaultValue);
  }

  // Build compact JSON
  const compactResult = buildCompactJson(result, hipaaMode);
  result.business_brain_json_compact = compactResult.json;
  result.business_brain_json_hash = compactResult.hash;
  result.business_brain_json_truncated = compactResult.truncated ? "true" : "false";

  // Contract version stamp for deployment verification
  result.context_contract_version = "v1";

  result.dynamic_variables_keys = [...DYNAMIC_VAR_REGISTRY.map(s => s.key),
    "business_brain_json_compact", "business_brain_json_hash",
    "business_brain_json_truncated", "context_contract_version", "dynamic_variables_keys"].join(",");

  return result;
}

/**
 * Get all variable keys from the registry (for documentation/logging)
 */
export function getAllVariableKeys(): string[] {
  return [
    ...DYNAMIC_VAR_REGISTRY.map(s => s.key),
    "business_brain_json_compact",
    "business_brain_json_hash",
    "business_brain_json_truncated",
    "context_contract_version",
    "dynamic_variables_keys",
  ];
}

/**
 * Get registry documentation as a structured list
 */
export function getRegistryDocumentation(): Array<{
  key: string;
  description: string;
  type: string;
  category: string;
  isPhi: boolean;
  includeInCompact: boolean;
}> {
  return DYNAMIC_VAR_REGISTRY.map(spec => ({
    key: spec.key,
    description: spec.description,
    type: spec.type,
    category: spec.category,
    isPhi: spec.isPhi || false,
    includeInCompact: spec.includeInCompactJson || false,
  }));
}
