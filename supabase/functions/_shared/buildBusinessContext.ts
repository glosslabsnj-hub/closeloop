/**
 * CANONICAL BUSINESS CONTEXT BUILDER
 * Single source of truth for all AI context (voice, SMS, browser test)
 *
 * This module is imported by: twilio-inbound, ai-text-reply, elevenlabs-conversation-token
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildDynamicVariablesFromRegistry,
  getAllVariableKeys,
} from "./voiceContextContract.ts";
import {
  getBusinessBrainSnapshot,
  buildBusinessBrainSummary,
  serializeBusinessBrainSnapshot,
  type BusinessBrainSnapshot,
} from "./getBusinessBrainSnapshot.ts";
import { getBasePromptForMode, buildPromptForCapabilities, getModePrompt } from "./agentBasePrompts.ts";
import type { BusinessMode } from "./agentResolver.ts";
import { resolveCapabilities } from "./resolveCapabilities.ts";

// ============= TYPE DEFINITIONS =============

export interface DistanceTier {
  min_miles: number;
  max_miles: number | null;
  base_price: number;
  per_mile_price?: number;
}

export interface VehicleTier {
  vehicle_type: string;
  price: number; // cents
  square_variation_id?: string;
  duration_minutes?: number;
  correction?: string; // for services with correction levels (e.g. "1-Step", "2-Step")
}

export interface PackageOption {
  name: string;
  price: number; // cents
  square_variation_id?: string;
  duration_minutes?: number;
  description?: string;
}

export interface PricingConfig {
  model: "flat" | "distance_tiered" | "variable" | "vehicle_tiered" | "package" | "per_unit";
  distance_tiers?: DistanceTier[];
  vehicle_tiers?: VehicleTier[];
  packages?: PackageOption[];
  included_miles?: number;
  overage_per_mile?: number;
  correction_levels?: boolean;
  per_unit_price?: number;
  unit_label?: string;
  min_units?: number;
  [key: string]: unknown;
}

export interface NormalizedService {
  id: string;
  name: string;
  description: string;
  price_type: "fixed" | "starting_at" | "quote_required";
  price_amount: number | null;
  duration_minutes: number;
  deposit_required: boolean;
  deposit_amount: number | null;
  prep_instructions: string;
  synonyms: string[];
  pricing_config: PricingConfig | null;
  /** Category for grouping (e.g., "Towing", "Body Work") */
  service_category: string;
  /** Type: "primary" (core business) or "secondary" (additional services) */
  service_type: string;
  /** Whether this service requires a dropoff/destination location */
  requires_dropoff: boolean;
  /** Simple = quick confirmation, Complex = ask detailed questions */
  complexity: "simple" | "complex";
  /** What makes the price vary (plain English for AI) */
  price_factors: string;
  /** Booking type: direct_book, estimate_first, or consultation */
  booking_type: "direct_book" | "estimate_first" | "consultation";
  /** Prerequisites the AI should mention (e.g., "Requires permit") */
  prerequisite_note: string;
  /** Minimum duration in minutes (for variable-duration services) */
  duration_min_minutes: number | null;
  /** Maximum duration in minutes (for variable-duration services) */
  duration_max_minutes: number | null;
  /** When payment is collected for this service */
  payment_timing: "at_booking" | "at_service" | "deposit_then_balance" | "quote_first";
  /** Required info fields before booking this service */
  required_booking_fields: string[];
}

export interface NormalizedMenuItem {
  id: string;
  name: string;
  category: string;
  price_cents: number | null;
  modifiers: string[];
  is_available: boolean;
}

export interface IntakeField {
  field_key: string;
  label: string;
  type: string;
  required: boolean;
  choices?: string[];
}

export interface IntentRule {
  id: string;
  name: string;
  rule_type: string;
  action: Record<string, unknown>;
  priority: number;
}

export interface RequiredQuestionField {
  key: string;
  label: string;
  ask_prompt: string;
  why_needed: string;
}

export interface RequiredQuestionsConfig {
  intent: string;
  required_inputs: RequiredQuestionField[];
  optional_inputs: RequiredQuestionField[];
}

export interface MemoryHint {
  type: string;
  summary: string;
  usage: string;
  confidence: number;
}

export interface EtaPolicyJson {
  default_range_minutes: { min: number; max: number };
  mode_overrides?: {
    [mode: string]: { range_minutes: { min: number; max: number } };
  };
  job_type_overrides?: {
    [jobType: string]: { range_minutes: { min: number; max: number } };
  };
  busyness_buffer_pct?: number;
  holiday_buffer_pct?: number;
  // Step 2: Provider settings
  provider_enabled?: boolean;
  max_service_radius_miles?: number;
  allow_vague_address_fallback?: boolean;
  food_prep_minutes?: number;
  dispatch_response_minutes?: number;
  traffic_buffer_pct?: number;
}

export interface BusinessContext {
  tenant: {
    tenant_id: string;
    business_name: string;
    tagline: string;
    business_mode: string;
    industry_slug: string;
    timezone: string;
    phone_e164: string;
    website: string;
    address: string;
    years_in_business: number | null;
    service_area: { type?: string; miles?: number; zip_codes?: string[]; mode?: string; radius_miles?: number; include?: { zips?: string[] } } | null;
    hours: Record<string, { open: string; close: string; is_open: boolean }>;
    hours_today: string;
    // Speech-ready summaries for voice AI
    location_summary: string;
    service_area_summary: string;
    out_of_area_message: string;
  };
  offerings: {
    services: NormalizedService[];
    services_summary: string;
    services_for_prompt: string;
    /** Secondary/additional services the business offers (e.g., body work for a tow company) */
    secondary_services: NormalizedService[];
    secondary_services_summary: string;
    menu: NormalizedMenuItem[];
    menu_summary: string;
    /** Service packages & memberships summary for AI */
    packages_summary: string;
    /** Currently active promotions for AI to mention */
    active_promotions: string;
  };
  pricing: {
    rules: any[]; // Array of PricingRule objects from computeQuote.ts
    rules_summary: string;
    /** Summary of price modifiers (after-hours, vehicle-specific, etc.) */
    price_modifiers_summary: string;
    busyness_config: {
      base_prep_minutes: number;
      busy_buffer_minutes: number;
      manual_busyness_pct: number;
    } | null;
  };
  eta: {
    busyness_rules: Record<string, any>; // BusynessRule map from computeQuote.ts
    rules_summary: string;
    /** Pre-computed ETA for AI to speak ("30 to 45 minutes") */
    spoken: string;
    /** Minimum ETA in minutes */
    min_minutes: number;
    /** Maximum ETA in minutes */
    max_minutes: number;
    /** Source of the range: "job_type" | "mode" | "default" */
    source: string;
    /** Policy loaded from tenant */
    policy: EtaPolicyJson | null;
    /** Whether distance provider (Mapbox) is enabled and configured */
    distance_provider_enabled: boolean;
    /** ETA policy summary for AI context */
    eta_policy_summary: string;
    /** ETA estimation rules for AI */
    eta_estimate_rules: {
      requires_exact_address: boolean;
      range_only: boolean;
      max_service_radius_miles: number | null;
    };
  };
  intake: {
    required_fields: IntakeField[];
  };
  policies: {
    cancellation: string;
    deposit: string;
    refund: string;
    payment_methods: string[];
    ai_never_promise: string[];
    ai_guidelines: {
      upselling: string;
      pricing_negotiation: string;
      capacity: string;
      escalation: string;
      recognition: string;
      max_discount_percent: number;
      loyalty_threshold_orders: number;
    };
    ai_guidelines_summary: string;
  };
  food_settings: {
    estimated_prep_minutes: number;
    accepts_pickup: boolean;
    accepts_delivery: boolean;
    accepts_dine_in: boolean;
    delivery_radius_miles: number | null;
    delivery_minimum_cents: number | null;
    accepts_catering: boolean;
    catering_min_guests: number | null;
    catering_lead_days: number | null;
    order_confirmation_mode: string;
  } | null;
  medical_settings: {
    practice: any | null;
    coverage: any | null;
    policies: any | null;
    accepted_carriers_summary: string;
    in_network_insurers_summary: string;
    medical_policies_summary: string;
    new_patient_fee_display: string;
    follow_up_fee_display: string;
    no_show_fee_display: string;
    cancellation_fee_display: string;
  } | null;
  knowledge: {
    faqs: Array<{ question: string; answer: string }>;
    faqs_summary: string;
    objections: Array<{ objection: string; response: string }>;
    supplementary: Array<{ type: string; title: string; content: string }>;
    // Dispatch-specific knowledge
    vehicle_knowledge_summary: string;
    roadside_safety_scripts: string;
    // Competitor knowledge
    competitor_positioning_summary: string;
    competitor_never_say: string[];
    our_advantages: string[];
    // Seasonal/promotional
    seasonal_events_summary: string;
  };
  operations: {
    modules: {
      booking_enabled: boolean;
      dispatch_enabled: boolean;
      orders_enabled: boolean;
      reservations_enabled: boolean;
      catering_enabled: boolean;
      voice_enabled: boolean;
      sms_enabled: boolean;
      medical_intake_enabled: boolean;
    };
    availability: {
      calendar_provider: string | null;
      calendar_connected: boolean;
      booking_url: string;
      booking_mode: string;
    };
    /** 7-day capacity overview for booking-enabled tenants (e.g., "Mon: busy (8) | Tue: open | Wed: closed") */
    capacity_7day_overview: string;
  };
  intelligence: {
    settings: {
      memory_enabled: boolean;
      min_confidence: number;
      share_across_locations: boolean;
    };
    intent_rules: IntentRule[];
    intent_rules_summary: string;
    required_questions: RequiredQuestionsConfig[];
    required_questions_summary: string;
    memory_hints: MemoryHint[];
    memory_hints_summary: string;
    // Customer context for repeat caller recognition
    customer_order_count: number | null;
    /** Customer name from caller ID lookup (for returning callers) */
    customer_name_from_lookup: string;
    /** Speech-ready summary of customer's active jobs (vehicles in shop, etc.) */
    active_job_summary: string;
    /** 2.1: Summary of repeat caller's last 3 call sessions */
    caller_history_summary: string;
    /** 2.2: Predicted intent based on time-of-day patterns */
    predicted_intent_hint: string;
    /** 2.3: Caller priority tier (vip/regular/new) + behavioral instructions */
    caller_priority_tier: string;
    caller_priority_instructions: string;
    /** 2.5: Behavioral hints from high-confidence business patterns */
    behavioral_hints_summary: string;
  };
  safety: {
    hipaa_mode: boolean;
    store_transcripts: boolean;
    store_recordings: boolean;
    store_caller_phone: boolean;
    phi_minimization: boolean;
    allow_customer_memory: boolean;
  };
  ai_settings: {
    tone: string;
    greeting_script: string;
    fallback_script: string;
    unknown_question_behavior: string;  // "escalate" | "try_help" | "offer_callback"
    followup_cadence: string;           // "aggressive" | "moderate" | "conservative"
    ai_behavior_mode: "full_service" | "callback_only";
    service_default_flow: "schedule_first" | "urgency_check" | "dispatch_first";
    ai_booking_mode: "pending" | "auto_confirm";
    same_day_enabled: boolean;
    emergency_surcharge: string;
    cancellation_notice_hours: number;
    confirmation_method: "sms" | "email" | "both";
    waitlist_enabled: boolean;
    recurring_enabled: boolean;
    deposit_required: boolean;
    deposit_amount: string;
    ai_guardrails: string;
    required_intake_fields: string[];
    escalation_rules: {
      transferOnRequest: boolean;
      transferOnAnger: boolean;
      transferOnPriceObjection: boolean;
      transferOnComplexQuestion: boolean;
      transferOnComplaint: boolean;
      fallbackAction: string;
    };
  };
  // Business Brain snapshot (full structured data)
  business_brain?: BusinessBrainSnapshot;
  // Business Brain summary (AI-facing text summary)
  business_brain_summary: string;
  // Serialized Business Brain JSON for dynamic variables
  business_brain_json: string;
  // Whether JSON was truncated due to size
  business_brain_json_truncated: boolean;
  // Staff members for multi-resource scheduling
  staff_members: Array<{ id: string; full_name: string; role: string; is_active: boolean; service_ids: string[] | null }>;
  // Impound lot data (null if capability not enabled)
  impound: {
    lot_id: string;
    lot_name: string;
    lot_address: string;
    lot_phone: string;
    lot_hours_today: string;
    lot_hours_summary: string;
    is_open_now: boolean;
    next_open: string;
    // Fee structure from impound_settings
    base_tow_fee_cents: number;
    daily_storage_cents: number;
    admin_fee_cents: number;
    gate_fee_cents: number;
    fee_summary: string;
    // Release requirements
    release_requirements: string[];
    release_requirements_summary: string;
    accepted_payment_methods: string[];
    accepted_payment_summary: string;
  } | null;
  // Referral Network settings (null if not enabled)
  referral_network: {
    enabled: boolean;
    send_referrals: boolean;
    accept_referrals: boolean;
    intro_style: string;
    network_services: string[];
    preferred_partners: string[];
  } | null;
  // Workflow configuration (mode-specific, fetched from workflow config tables)
  workflow_config?: {
    sales?: {
      sales_pricing_strategy: string;
      sales_ask_trade_in: boolean;
      sales_ask_financing: boolean;
      sales_ask_timeline: boolean;
      sales_ask_budget: string;
      sales_max_vehicles_to_mention: number;
      sales_appointment_label: string;
      sales_push_intensity: string;
      sales_follow_up_script: string;
      sales_lead_capture_minimum: string;
      sales_inventory_presentation: string;
    };
    dispatch?: Record<string, unknown>;
    service?: Record<string, unknown>;
    food?: Record<string, unknown>;
    medical?: Record<string, unknown>;
    general?: Record<string, unknown>;
  };
  // Metadata
  _meta: {
    channel: string;
    session_id: string;
    customer_id: string | null;
    location_id: string | null;
    built_at: string;
    missing_sections: string[];
    capabilities: Record<string, boolean>;
    is_referral_transfer?: string;
    referral_context?: string;
  };
}

// Re-export snapshot type for consumers
export type { BusinessBrainSnapshot } from "./getBusinessBrainSnapshot.ts";

// ============= CONSTANTS =============

const SERVICE_SYNONYMS: Record<string, string[]> = {
  "drain cleaning": ["clogged drain", "drain unclog", "drain clog", "slow drain", "blocked drain", "drain backup"],
  "leak detection": ["water leak", "leak repair", "leaking pipe", "pipe leak"],
  "water heater repair": ["hot water heater", "water heater issue", "no hot water"],
  "toilet repair": ["toilet fix", "running toilet", "clogged toilet", "toilet problem"],
  "faucet installation": ["faucet repair", "faucet replacement", "dripping faucet"],
  "ac tune-up": ["ac service", "air conditioning service", "ac maintenance"],
  "furnace inspection": ["heater inspection", "heating service", "furnace service"],
  "emergency repair": ["emergency service", "urgent repair", "same day service"],
  "oil change": ["oil service", "oil and filter"],
  "tire rotation": ["rotate tires", "tire service"],
  "wheel alignment": ["alignment", "car alignment"],
  "full detail": ["complete detail", "full service detail"],
  "interior detail": ["inside detail", "interior cleaning"],
  "exterior detail": ["outside detail", "exterior wash"],
};

// ============= HELPER FUNCTIONS =============

function getIndustryDefaultFlow(industry: string | undefined | null): "schedule_first" | "urgency_check" | "dispatch_first" {
  if (!industry) return "schedule_first";
  const lower = industry.toLowerCase();
  const dispatchIndustries = ["locksmith", "towing", "roadside"];
  if (dispatchIndustries.some(i => lower.includes(i))) return "dispatch_first";
  const urgencyIndustries = [
    "hvac", "heating", "cooling", "plumbing", "plumber", "electrical", "electrician",
    "appliance_repair", "garage_door", "water_damage", "restoration"
  ];
  if (urgencyIndustries.some(i => lower.includes(i))) return "urgency_check";
  return "schedule_first";
}

function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Formats service area config into a speakable description
 * Example outputs:
 * - "within 50 miles of our location"
 * - "the following ZIP codes: 08610, 08620, 08638"
 * - "nationwide"
 */
function formatServiceAreaForVoice(
  serviceArea: { type: string; miles?: number; zip_codes?: string[]; counties?: string[] } | null
): string {
  if (!serviceArea) return "";
  
  const mode = serviceArea.type || "";
  
  if ((mode === "radius" || mode === "miles") && serviceArea.miles) {
    return `within ${serviceArea.miles} miles of our location`;
  }
  
  if ((mode === "zips" || mode === "zip_codes") && serviceArea.zip_codes?.length) {
    const count = serviceArea.zip_codes.length;
    if (count <= 5) {
      return `the following ZIP codes: ${serviceArea.zip_codes.join(", ")}`;
    }
    return `${count} specific ZIP code areas`;
  }
  
  if (mode === "counties" && serviceArea.counties?.length) {
    const count = serviceArea.counties.length;
    if (count <= 3) {
      return `${serviceArea.counties.join(", ")}`;
    }
    return `${count} county areas`;
  }
  
  if (mode === "unlimited" || mode === "nationwide") {
    return "nationwide";
  }
  
  return "";
}

/**
 * Formats weekly hours into a speakable summary
 * Example: "Monday: 9:00 - 17:00, Tuesday: 9:00 - 17:00, ..."
 */
function formatWeeklyHoursForVoice(
  hours: Record<string, { open: string; close: string; is_open: boolean }>
): string {
  if (!hours || Object.keys(hours).length === 0) return "";
  
  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const parts: string[] = [];
  
  for (const day of dayOrder) {
    const h = hours[day];
    if (!h) continue;
    
    const dayName = day.charAt(0).toUpperCase() + day.slice(1);
    if (!h.is_open) {
      parts.push(`${dayName}: Closed`);
    } else if (h.open && h.close) {
      parts.push(`${dayName}: ${h.open} - ${h.close}`);
    }
  }
  
  return parts.join(", ");
}

/**
 * Formats objection responses for AI context
 * Example: "When customer says 'too expensive': 'We offer flexible payment plans...'"
 */
function formatObjectionsForVoice(
  objections: Array<{ objection: string; response: string }>
): string {
  if (!objections || objections.length === 0) return "";
  
  return objections
    .slice(0, 5) // Limit to 5 objections for voice context
    .map(o => `When customer says "${o.objection}": "${truncate(o.response, 150)}"`)
    .join(" | ");
}

/**
 * Formats intake fields for medical mode
 * Example: "Please collect: insurance provider, date of birth, current medications"
 */
function formatIntakeFieldsForVoice(fields: IntakeField[]): string {
  if (!fields || fields.length === 0) return "";
  
  const required = fields.filter(f => f.required);
  if (required.length === 0) return "";
  
  return `Please collect: ${required.map(f => f.label).join(", ")}`;
}

/**
 * Distance settings from tenant_distance_settings table
 */
// ============= IMPOUND LOT HELPER FUNCTIONS =============

interface ImpoundHoursEntry {
  open: string | null;
  close: string | null;
}

type DayOfWeek = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

const IMPOUND_DAY_ORDER: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

/**
 * Get impound lot hours for today and compute open/next status
 */
function getImpoundLotHoursContext(
  hoursJson: Record<string, ImpoundHoursEntry> | null,
  timezone: string = "America/New_York"
): {
  hours_today: string;
  is_open_now: boolean;
  next_open: string;
  hours_summary: string;
} {
  const defaultResult = {
    hours_today: "",
    is_open_now: false,
    next_open: "",
    hours_summary: "",
  };

  if (!hoursJson || Object.keys(hoursJson).length === 0) {
    return defaultResult;
  }

  // Get current day
  const now = new Date();
  const days: DayOfWeek[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const todayIndex = now.getDay();
  const todayName = days[todayIndex];
  const todayHours = hoursJson[todayName];

  // Format time from 24h to speech-friendly
  const formatTimeForSpeech = (time24: string): string => {
    if (!time24 || !/^\d{1,2}:\d{2}$/.test(time24)) return "";
    const [hours, minutes] = time24.split(":").map(Number);
    const hours12 = hours % 12 || 12;
    const period = hours >= 12 ? "PM" : "AM";
    if (minutes === 0) {
      return `${hours12} ${period}`;
    }
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  // Format hours for today
  let hours_today = "";
  if (todayHours?.open && todayHours?.close) {
    hours_today = `${formatTimeForSpeech(todayHours.open)} to ${formatTimeForSpeech(todayHours.close)}`;
  } else {
    hours_today = "Closed today";
  }

  // Check if currently open
  let is_open_now = false;
  if (todayHours?.open && todayHours?.close) {
    const [openHour, openMin] = todayHours.open.split(":").map(Number);
    const [closeHour, closeMin] = todayHours.close.split(":").map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;
    is_open_now = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }

  // Compute next open time
  let next_open = "";
  if (!is_open_now) {
    // Check if opens later today
    if (todayHours?.open) {
      const [openHour, openMin] = todayHours.open.split(":").map(Number);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const openMinutes = openHour * 60 + openMin;
      if (currentMinutes < openMinutes) {
        next_open = `Today at ${formatTimeForSpeech(todayHours.open)}`;
      }
    }

    // If not opening today, find next open day
    if (!next_open) {
      for (let i = 1; i <= 7; i++) {
        const checkDayIndex = (todayIndex + i) % 7;
        const checkDayName = days[checkDayIndex];
        const checkHours = hoursJson[checkDayName];
        if (checkHours?.open) {
          const dayLabel = i === 1 ? "Tomorrow" : checkDayName.charAt(0).toUpperCase() + checkDayName.slice(1);
          next_open = `${dayLabel} at ${formatTimeForSpeech(checkHours.open)}`;
          break;
        }
      }
    }
  }

  // Build weekly summary for speech
  const parts: string[] = [];
  const weekdays: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const weekdayHours = weekdays.map(d => hoursJson[d]);
  const allWeekdaysSame = weekdayHours.every(
    h => h?.open === weekdayHours[0]?.open && h?.close === weekdayHours[0]?.close
  );

  if (allWeekdaysSame && weekdayHours[0]?.open && weekdayHours[0]?.close) {
    const openTime = weekdayHours[0].open.split(":")[0];
    const closeTime = weekdayHours[0].close.split(":")[0];
    parts.push(`Monday through Friday ${openTime} to ${closeTime}`);
  } else {
    for (const day of weekdays) {
      const h = hoursJson[day];
      if (h?.open && h?.close) {
        parts.push(`${day.charAt(0).toUpperCase() + day.slice(1)} ${h.open.split(":")[0]} to ${h.close.split(":")[0]}`);
      }
    }
  }

  const satHours = hoursJson["saturday"];
  if (satHours?.open && satHours?.close) {
    parts.push(`Saturdays ${satHours.open.split(":")[0]} to ${satHours.close.split(":")[0]}`);
  } else {
    parts.push("closed Saturdays");
  }

  const sunHours = hoursJson["sunday"];
  if (sunHours?.open && sunHours?.close) {
    parts.push(`Sundays ${sunHours.open.split(":")[0]} to ${sunHours.close.split(":")[0]}`);
  } else {
    parts.push("closed Sundays");
  }

  return {
    hours_today,
    is_open_now,
    next_open,
    hours_summary: parts.join(", "),
  };
}

/**
 * Build impound fee summary for speech
 */
function buildImpoundFeeSummary(settings: {
  base_tow_fee_cents?: number;
  daily_storage_cents?: number;
  admin_fee_cents?: number;
  gate_fee_cents?: number;
} | null): string {
  if (!settings) return "";
  const parts: string[] = [];
  if (settings.base_tow_fee_cents) {
    parts.push(`$${(settings.base_tow_fee_cents / 100).toFixed(0)} base tow fee`);
  }
  if (settings.daily_storage_cents) {
    parts.push(`$${(settings.daily_storage_cents / 100).toFixed(0)} per day storage`);
  }
  if (settings.admin_fee_cents) {
    parts.push(`$${(settings.admin_fee_cents / 100).toFixed(0)} admin fee`);
  }
  if (settings.gate_fee_cents) {
    parts.push(`$${(settings.gate_fee_cents / 100).toFixed(0)} gate fee`);
  }
  return parts.join(", ");
}

/**
 * Format release requirements for speech
 */
function formatImpoundReleaseRequirements(reqs: string[] | null): string {
  if (!reqs || reqs.length === 0) return "";
  const REQUIREMENT_LABELS: Record<string, string> = {
    valid_id: "valid government-issued ID",
    registration: "vehicle registration or title",
    insurance: "proof of insurance",
    lien_release: "lien release from lienholder",
    police_release: "police release authorization",
    payment: "payment in full",
    notarized_authorization: "notarized authorization if picking up for someone else",
  };
  return reqs.map(r => REQUIREMENT_LABELS[r] || r).join(", ");
}

/**
 * Format payment methods for speech
 */
function formatImpoundPaymentMethods(methods: string[] | null): string {
  if (!methods || methods.length === 0) return "";
  const METHOD_LABELS: Record<string, string> = {
    cash: "cash",
    credit_card: "credit card",
    debit_card: "debit card",
    check: "check",
    money_order: "money order",
    certified_check: "certified check",
  };
  return methods.map(m => METHOD_LABELS[m] || m).join(", ");
}

/**
 * Build impound context from lot and settings data
 */
function buildImpoundContext(
  lot: any | null,
  settings: any | null,
  timezone: string
): BusinessContext["impound"] {
  if (!lot) return null;

  const hoursContext = getImpoundLotHoursContext(lot.hours_json, timezone);
  const addressParts = [lot.address, lot.city, lot.state, lot.zip].filter(Boolean);
  const fullAddress = addressParts.join(", ");

  return {
    lot_id: lot.id,
    lot_name: lot.name || "",
    lot_address: fullAddress,
    lot_phone: lot.phone || "",
    lot_hours_today: hoursContext.hours_today,
    lot_hours_summary: hoursContext.hours_summary,
    is_open_now: hoursContext.is_open_now,
    next_open: hoursContext.next_open,
    // Fee structure
    base_tow_fee_cents: settings?.base_tow_fee_cents || 0,
    daily_storage_cents: settings?.daily_storage_cents || 0,
    admin_fee_cents: settings?.admin_fee_cents || 0,
    gate_fee_cents: settings?.gate_fee_cents || 0,
    fee_summary: buildImpoundFeeSummary(settings),
    // Release requirements
    release_requirements: settings?.release_requirements || [],
    release_requirements_summary: formatImpoundReleaseRequirements(settings?.release_requirements),
    accepted_payment_methods: settings?.accepted_payment_methods || [],
    accepted_payment_summary: formatImpoundPaymentMethods(settings?.accepted_payment_methods),
  };
}

// ============= DISTANCE SETTINGS =============

interface TenantDistanceSettings {
  tenant_id: string;
  distance_provider_enabled: boolean;
  provider: string;
  base_lat: number | null;
  base_lng: number | null;
  base_place_name: string | null;
  mapbox_route_profile: string;
  eta_base_minutes: number;
  eta_per_mile_minutes: number | null;
  eta_min_minutes: number | null;
  eta_max_minutes: number | null;
  eta_rounding_minutes: number;
}

/**
 * Compute ETA from tenant_distance_settings (the canonical source)
 * Falls back to mode-appropriate defaults if no settings exist
 */
function computeEtaFromDistanceSettings(
  distanceSettings: TenantDistanceSettings | null,
  businessMode: string,
  busynessPct: number
): BusinessContext["eta"] {
  // Mode-appropriate defaults
  const modeDefaults: Record<string, { min: number; max: number }> = {
    dispatch: { min: 30, max: 60 },
    food: { min: 20, max: 40 },
    service: { min: 30, max: 60 },
    medical: { min: 15, max: 30 },
    general: { min: 30, max: 60 },
  };

  const defaultRange = modeDefaults[businessMode] || modeDefaults.general;

  // If no distance settings, use defaults
  if (!distanceSettings) {
    const spoken = `${defaultRange.min} to ${defaultRange.max} minutes`;
    return {
      busyness_rules: {},
      rules_summary: "",
      spoken,
      min_minutes: defaultRange.min,
      max_minutes: defaultRange.max,
      source: "mode_default",
      policy: null,
      distance_provider_enabled: false,
      eta_policy_summary: `Default ETA: ${defaultRange.min}-${defaultRange.max} minutes`,
      eta_estimate_rules: {
        requires_exact_address: false,
        range_only: true,
        max_service_radius_miles: null,
      },
    };
  }

  // Use configured values from tenant_distance_settings
  const baseMinutes = distanceSettings.eta_base_minutes || 30;
  let minEta = distanceSettings.eta_min_minutes ?? Math.max(15, baseMinutes - 15);
  let maxEta = distanceSettings.eta_max_minutes ?? baseMinutes + 30;

  // Apply busyness buffer (up to 25% increase at 100% busyness)
  const clampedBusyness = Math.min(100, Math.max(0, busynessPct));
  if (clampedBusyness > 0) {
    const multiplier = 1 + (0.25 * clampedBusyness) / 100;
    minEta = Math.round(minEta * multiplier);
    maxEta = Math.round(maxEta * multiplier);
  }

  // Round to configured rounding interval
  const roundTo = distanceSettings.eta_rounding_minutes || 5;
  minEta = Math.round(minEta / roundTo) * roundTo;
  maxEta = Math.round(maxEta / roundTo) * roundTo;

  // Format spoken ETA for natural speech
  let spoken: string;
  if (maxEta <= 60) {
    spoken = `${minEta} to ${maxEta} minutes`;
  } else {
    const formatTime = (mins: number): string => {
      if (mins < 60) return `${Math.round(mins)} minutes`;
      const hours = Math.floor(mins / 60);
      const remainder = mins % 60;
      if (remainder === 0) return hours === 1 ? "1 hour" : `${hours} hours`;
      if (remainder === 30) return hours === 1 ? "1 and a half hours" : `${hours} and a half hours`;
      return hours === 1 ? "about 1 hour" : `about ${hours} hours`;
    };
    spoken = `${formatTime(minEta)} to ${formatTime(maxEta)}`;
  }

  // Check if distance provider (Mapbox) is enabled and configured
  const providerEnabled = distanceSettings.distance_provider_enabled === true;
  const mapboxConfigured = !!Deno.env.get("MAPBOX_ACCESS_TOKEN");
  const distanceProviderEnabled = providerEnabled && mapboxConfigured;
  const hasBaseLocation = distanceSettings.base_lat != null && distanceSettings.base_lng != null;

  // Build policy summary
  let etaPolicySummary = `Response time: ${minEta}-${maxEta} minutes`;
  if (distanceProviderEnabled && hasBaseLocation) {
    etaPolicySummary += `. Distance-based ETA enabled (base: ${distanceSettings.base_place_name || 'configured'})`;
  }
  if (distanceSettings.eta_per_mile_minutes) {
    etaPolicySummary += `. Add ~${distanceSettings.eta_per_mile_minutes} min per mile`;
  }

  return {
    busyness_rules: {},
    rules_summary: "",
    spoken,
    min_minutes: minEta,
    max_minutes: maxEta,
    source: "tenant_distance_settings",
    policy: null, // Legacy field, not used with new settings
    distance_provider_enabled: distanceProviderEnabled,
    eta_policy_summary: etaPolicySummary,
    eta_estimate_rules: {
      requires_exact_address: distanceProviderEnabled && hasBaseLocation,
      range_only: !distanceProviderEnabled,
      max_service_radius_miles: null,
    },
  };
}

/**
 * Legacy compute ETA function for backward compatibility
 * Delegates to new function when possible
 */
function computeEtaForContext(
  policy: EtaPolicyJson | null,
  businessMode: string,
  busynessPct: number
): BusinessContext["eta"] {
  // If no legacy policy, return mode defaults
  if (!policy) {
    return computeEtaFromDistanceSettings(null, businessMode, busynessPct);
  }

  // Use legacy policy if it exists (backward compatibility)
  const defaultPolicy: EtaPolicyJson = {
    default_range_minutes: { min: 30, max: 60 },
    busyness_buffer_pct: 15,
    holiday_buffer_pct: 10,
  };

  const effectivePolicy = policy || defaultPolicy;
  let range = { ...effectivePolicy.default_range_minutes };
  let source = "default";

  // Check mode overrides
  if (effectivePolicy.mode_overrides?.[businessMode]) {
    range = { ...effectivePolicy.mode_overrides[businessMode].range_minutes };
    source = "mode";
  }

  // Apply busyness buffer
  const busynessBufferPct = Math.min(50, Math.max(0, effectivePolicy.busyness_buffer_pct ?? 0));
  const clampedBusyness = Math.min(100, Math.max(0, busynessPct));

  if (clampedBusyness > 0 && busynessBufferPct > 0) {
    const multiplier = 1 + (busynessBufferPct * clampedBusyness) / 10000;
    range.min = Math.round(range.min * multiplier);
    range.max = Math.round(range.max * multiplier);
  }

  // Format spoken ETA
  let spoken: string;
  if (range.max < 60) {
    spoken = `${range.min} to ${range.max} minutes`;
  } else {
    const formatTime = (mins: number): string => {
      if (mins < 60) return `${Math.round(mins)} minutes`;
      const hours = Math.floor(mins / 60);
      const remainder = mins % 60;
      if (remainder === 0) return hours === 1 ? "1 hour" : `${hours} hours`;
      if (remainder === 30) return hours === 1 ? "1 and a half hours" : `${hours} and a half hours`;
      return hours === 1 ? "about 1 hour" : `about ${hours} hours`;
    };
    spoken = `${formatTime(range.min)} to ${formatTime(range.max)}`;
  }

  const providerEnabled = effectivePolicy.provider_enabled === true;
  const mapboxConfigured = !!Deno.env.get("MAPBOX_ACCESS_TOKEN");
  const distanceProviderEnabled = providerEnabled && mapboxConfigured;

  let etaPolicySummary = `Default ETA: ${effectivePolicy.default_range_minutes.min}-${effectivePolicy.default_range_minutes.max} minutes`;
  if (distanceProviderEnabled) {
    etaPolicySummary += ". Mapbox routing enabled for exact ETAs.";
  }
  if (effectivePolicy.max_service_radius_miles) {
    etaPolicySummary += ` Max service radius: ${effectivePolicy.max_service_radius_miles} miles.`;
  }

  return {
    busyness_rules: {},
    rules_summary: "",
    spoken,
    min_minutes: range.min,
    max_minutes: range.max,
    source,
    policy: effectivePolicy,
    distance_provider_enabled: distanceProviderEnabled,
    eta_policy_summary: etaPolicySummary,
    eta_estimate_rules: {
      requires_exact_address: distanceProviderEnabled,
      range_only: true,
      max_service_radius_miles: effectivePolicy.max_service_radius_miles ?? null,
    },
  };
}

/**
 * Get today's hours with timezone-aware computation
 * Returns a human-readable string like "9:00 AM - 5:00 PM" or "Closed today"
 */
function getTodayHours(hoursJson: Record<string, unknown> | null, timezone?: string): string {
  if (!hoursJson) return "";
  
  // Get current day in the tenant's timezone
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  let todayIndex: number;
  
  try {
    // Use tenant timezone if provided
    const tz = timezone || "America/New_York";
    const now = new Date();
    // Get day name in the tenant's timezone
    const dayName = now.toLocaleDateString("en-US", { timeZone: tz, weekday: "long" }).toLowerCase();
    todayIndex = days.indexOf(dayName);
    if (todayIndex === -1) todayIndex = now.getDay();
  } catch {
    todayIndex = new Date().getDay();
  }
  
  const today = days[todayIndex];
  const todayHours = hoursJson[today] as { open?: string; close?: string; closed?: boolean; isOpen?: boolean; windows?: Array<{ open?: string; close?: string }> } | undefined;
  
  if (!todayHours) {
    // Try to find ANY hours data to provide a fallback
    for (const day of days) {
      const dayData = hoursJson[day] as { open?: string; close?: string; closed?: boolean; isOpen?: boolean; windows?: Array<{ open?: string; close?: string }> } | undefined;
      if (!dayData) continue;
      // Resolve open/close from windows format if needed
      const dOpen = dayData.open || (Array.isArray(dayData.windows) && dayData.windows.length > 0 ? dayData.windows[0].open : undefined);
      const dClose = dayData.close || (Array.isArray(dayData.windows) && dayData.windows.length > 0 ? dayData.windows[0].close : undefined);
      if (dOpen && dClose && dayData.closed !== true && dayData.isOpen !== false) {
        // Has hours data but not for today - business might be closed today
        return `Closed today (${today.charAt(0).toUpperCase() + today.slice(1)})`;
      }
    }
    return "";
  }
  
  if (todayHours.closed === true || todayHours.isOpen === false) {
    return `Closed today (${today.charAt(0).toUpperCase() + today.slice(1)})`;
  }
  
  // Resolve open/close from windows format if flat properties are missing
  // Reject non-time strings like "closed" — must be HH:MM format
  const isValidTime = (t: string | undefined | null): boolean => !!t && /^\d{1,2}:\d{2}$/.test(t);
  const winOpen = Array.isArray(todayHours.windows) && todayHours.windows.length > 0 ? todayHours.windows[0].open : undefined;
  const winClose = Array.isArray(todayHours.windows) && todayHours.windows.length > 0 ? todayHours.windows[0].close : undefined;
  const resolvedOpen = isValidTime(todayHours.open) ? todayHours.open : (isValidTime(winOpen) ? winOpen : undefined);
  const resolvedClose = isValidTime(todayHours.close) ? todayHours.close : (isValidTime(winClose) ? winClose : undefined);

  if (resolvedOpen && resolvedClose) {
    return `${resolvedOpen} - ${resolvedClose}`;
  }
  
  return "";
}

function normalizeHours(hoursJson: Record<string, unknown> | null): Record<string, { open: string; close: string; is_open: boolean }> {
  if (!hoursJson) return {};
  
  const result: Record<string, { open: string; close: string; is_open: boolean }> = {};
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  
  for (const day of days) {
    const dayData = hoursJson[day] as { open?: string; close?: string; closed?: boolean; isOpen?: boolean; windows?: Array<{ open?: string; close?: string }> } | undefined;
    if (dayData) {
      const isOpen = dayData.isOpen !== false && dayData.closed !== true;
      // Helper: reject non-time strings like "closed" — must match HH:MM format
      const isValidTime = (t: string | undefined | null): boolean => !!t && /^\d{1,2}:\d{2}$/.test(t);
      // Resolve open/close from windows format if flat properties are missing
      let open = isValidTime(dayData.open) ? (dayData.open || "") : "";
      let close = isValidTime(dayData.close) ? (dayData.close || "") : "";
      if (!open && !close && Array.isArray(dayData.windows) && dayData.windows.length > 0) {
        const w = dayData.windows[0];
        open = isValidTime(w.open) ? (w.open || "") : "";
        close = isValidTime(w.close) ? (w.close || "") : "";
      }
      result[day] = {
        open,
        close,
        is_open: isOpen && !!open && !!close,
      };
    }
  }
  
  return result;
}

/**
 * Build a speech-ready weekly hours summary from normalized hours.
 * Groups consecutive days with same hours (e.g., "Monday through Friday 8 AM to 4:30 PM")
 * and explicitly states closed days.
 */
export function buildWeeklyHoursSummary(hours: Record<string, { open: string; close: string; is_open: boolean }>): string {
  if (!hours || Object.keys(hours).length === 0) return "";
  
  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
  const formatTime = (time24: string): string => {
    if (!time24 || !/^\d{1,2}:\d{2}$/.test(time24)) return "";
    const [hours, minutes] = time24.split(":").map(Number);
    const hours12 = hours % 12 || 12;
    const period = hours >= 12 ? "PM" : "AM";
    if (minutes === 0) return `${hours12} ${period}`;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };
  
  // Build groups of consecutive days with same hours
  interface DayGroup {
    startIdx: number;
    endIdx: number;
    open: string;
    close: string;
    isOpen: boolean;
  }
  
  const groups: DayGroup[] = [];
  
  for (let i = 0; i < dayOrder.length; i++) {
    const day = dayOrder[i];
    const h = hours[day];
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
    const range = group.startIdx === group.endIdx
      ? startName
      : `${startName} through ${endName}`;
    
    if (group.isOpen) {
      parts.push(`${range} ${formatTime(group.open)} to ${formatTime(group.close)}`);
    } else {
      parts.push(`${range} closed`);
    }
  }
  
  return parts.join(", ");
}

function normalizeServices(services: Array<{
  id: string;
  name: string;
  description?: string | null;
  price_type?: string | null;
  price_amount?: number | null;
  duration_minutes: number;
  deposit_required?: boolean | null;
  deposit_amount?: number | null;
  preparation_instructions?: string | null;
  pricing_config_json?: Record<string, unknown> | null;
  requires_dropoff?: boolean | null;
  booking_type?: string | null;
  prerequisite_note?: string | null;
  duration_min_minutes?: number | null;
  duration_max_minutes?: number | null;
  payment_timing?: string | null;
  required_booking_fields?: string[] | null;
}> | null): NormalizedService[] {
  if (!services || services.length === 0) return [];
  
  return services.map(s => {
    const priceAmount = s.price_amount ?? null;
    const hasPrice = priceAmount !== null && priceAmount > 0;
    
    let priceType: "fixed" | "starting_at" | "quote_required" = "quote_required";
    if (s.price_type === "fixed" && hasPrice) {
      priceType = "fixed";
    } else if (s.price_type === "starting_at" && hasPrice) {
      priceType = "starting_at";
    } else if (s.price_type === "quote_only" || !hasPrice) {
      priceType = "quote_required";
    } else if (hasPrice) {
      priceType = "fixed";
    }
    
    const nameLower = s.name.toLowerCase();
    const synonyms: string[] = [];
    for (const [key, syns] of Object.entries(SERVICE_SYNONYMS)) {
      if (nameLower.includes(key) || key.includes(nameLower)) {
        synonyms.push(...syns);
      }
    }
    
    // Parse pricing_config_json for tiered/variable pricing
    // Note: DB stores "pricing_model" field, normalize to "model"
    let pricingConfig: PricingConfig | null = null;
    if (s.pricing_config_json) {
      const configJson = s.pricing_config_json;
      const model = (configJson.model || configJson.pricing_model) as string;
      
      if (model === "distance_tiered" && Array.isArray(configJson.distance_tiers)) {
        pricingConfig = {
          model: "distance_tiered",
          distance_tiers: (configJson.distance_tiers as Array<Record<string, unknown>>).map(tier => ({
            min_miles: Number(tier.min_miles) || 0,
            max_miles: tier.max_miles != null ? Number(tier.max_miles) : null,
            base_price: Number(tier.base_price) || 0,
            per_mile_price: tier.per_mile_price != null ? Number(tier.per_mile_price) : undefined,
          })),
        };
      } else if (model === "vehicle_tiered" && Array.isArray(configJson.tiers)) {
        pricingConfig = {
          model: "vehicle_tiered",
          vehicle_tiers: (configJson.tiers as Array<Record<string, unknown>>).map(t => ({
            vehicle_type: String(t.vehicle_type || ""),
            price: Number(t.price) || 0,
            square_variation_id: t.square_variation_id ? String(t.square_variation_id) : undefined,
            duration_minutes: t.duration_minutes ? Number(t.duration_minutes) : undefined,
            correction: t.correction ? String(t.correction) : undefined,
          })),
          correction_levels: configJson.correction_levels === true,
        };
      } else if (model === "package" && Array.isArray(configJson.packages)) {
        pricingConfig = {
          model: "package",
          packages: (configJson.packages as Array<Record<string, unknown>>).map(p => ({
            name: String(p.name || ""),
            price: Number(p.price) || 0,
            square_variation_id: p.square_variation_id ? String(p.square_variation_id) : undefined,
            duration_minutes: p.duration_minutes ? Number(p.duration_minutes) : undefined,
            description: p.description ? String(p.description) : undefined,
          })),
        };
      } else if (model === "variable") {
        pricingConfig = { model: "variable" };
      } else if (model === "flat") {
        pricingConfig = {
          model: "flat",
          included_miles: configJson.included_miles != null ? Number(configJson.included_miles) : undefined,
          overage_per_mile: configJson.overage_per_mile != null ? Number(configJson.overage_per_mile) : undefined,
        };
      }
    }
    
    return {
      id: s.id,
      name: s.name,
      description: s.description || "",
      price_type: priceType,
      price_amount: priceAmount,
      duration_minutes: s.duration_minutes,
      deposit_required: s.deposit_required === true,
      deposit_amount: s.deposit_amount ?? null,
      prep_instructions: s.preparation_instructions || "",
      synonyms,
      pricing_config: pricingConfig,
      service_category: "",
      service_type: "primary",
      requires_dropoff: s.requires_dropoff !== false,
      complexity: (s as any).complexity === "complex" ? "complex" : "simple",
      price_factors: (s as any).price_factors || "",
      booking_type: (["direct_book", "estimate_first", "consultation"].includes(s.booking_type || "")
        ? s.booking_type as "direct_book" | "estimate_first" | "consultation"
        : "direct_book"),
      prerequisite_note: s.prerequisite_note || "",
      duration_min_minutes: s.duration_min_minutes ?? null,
      duration_max_minutes: s.duration_max_minutes ?? null,
      payment_timing: (["at_booking", "at_service", "deposit_then_balance", "quote_first"].includes(s.payment_timing || "")
        ? s.payment_timing as "at_booking" | "at_service" | "deposit_then_balance" | "quote_first"
        : "at_service"),
      required_booking_fields: Array.isArray(s.required_booking_fields) ? s.required_booking_fields : [],
    };
  });
}

function buildServicesSummary(services: NormalizedService[]): string {
  if (services.length === 0) return "";
  
  const summaries = services.slice(0, 8).map(s => {
    let line = s.name;
    if (s.price_type === "fixed" && s.price_amount) {
      line += ` ($${s.price_amount})`;
    } else if (s.price_type === "starting_at" && s.price_amount) {
      line += ` (from $${s.price_amount})`;
    } else {
      line += ` (quote)`;
    }
    return line;
  });
  
  let result = summaries.join("; ");
  if (services.length > 8) result += `; +${services.length - 8} more`;
  
  return truncate(result, 800);
}

/**
 * Build a speech-ready summary for secondary/additional services.
 * These are services the business offers that aren't their primary focus.
 * The AI adapts its response based on the level of detail configured.
 */
function buildSecondaryServicesSummary(services: NormalizedService[]): string {
  if (services.length === 0) return "";
  
  // Group by category if categories exist
  const byCategory: Record<string, NormalizedService[]> = {};
  for (const s of services) {
    const cat = s.service_category || "Other Services";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(s);
  }
  
  const parts: string[] = [];
  
  for (const [category, catServices] of Object.entries(byCategory)) {
    // Build category summary
    const serviceList = catServices.map(s => {
      // Check if pricing info is available
      if (s.price_type === "fixed" && s.price_amount) {
        return `${s.name} ($${s.price_amount})`;
      } else if (s.price_type === "starting_at" && s.price_amount) {
        return `${s.name} (from $${s.price_amount})`;
      } else {
        return s.name;
      }
    });
    
    if (category !== "Other Services" && category) {
      parts.push(`${category}: ${serviceList.join(", ")}`);
    } else {
      parts.push(serviceList.join(", "));
    }
  }
  
  const result = parts.join(". ");
  
  // Add AI guidance suffix based on detail level
  const hasAnyPricing = services.some(s => s.price_amount != null);
  const hasDescriptions = services.some(s => s.description && s.description.length > 20);
  
  let suffix = "";
  if (hasAnyPricing && hasDescriptions) {
    // Full detail mode - AI can quote and explain
    suffix = "";
  } else if (hasAnyPricing) {
    // Pricing only - AI can quote but should offer callback for details
    suffix = " (offer callback for more details)";
  } else {
    // Minimal info - AI should mention and offer callback
    suffix = " (available - offer callback to discuss)";
  }
  
  return truncate(result + suffix, 1200);
}

function buildServicesForPrompt(services: NormalizedService[]): string {
  if (services.length === 0) return "No services configured yet.";

  return services.map(s => {
    let priceText = "";
    const model = s.pricing_config?.model || s.pricing_config?.pricing_model;

    // Trip fee prefix
    const tripFee = s.pricing_config?.trip_fee;
    const tripFeeText = tripFee?.enabled
      ? `$${Number(tripFee.amount).toFixed(2)} ${tripFee.label}${tripFee.waived_with_service ? " (waived if you book)" : ""} + `
      : "";

    // AI quote behavior
    const quoteBehavior = s.pricing_config?.ai_quote_behavior;

    if (quoteBehavior === "always_quote_required") {
      priceText = `${tripFeeText}Custom quote required`;
    } else if (model === "vehicle_tiered" && s.pricing_config?.vehicle_tiers?.length) {
      const tiers = s.pricing_config.vehicle_tiers;
      // Check if there are correction levels (e.g. Paint Correction with 1-Step/2-Step)
      const hasCorrectionLevels = tiers.some(t => t.correction);
      if (hasCorrectionLevels) {
        // Group by correction level
        const corrections = [...new Set(tiers.map(t => t.correction).filter(Boolean))];
        const tierLines: string[] = [];
        for (const corr of corrections) {
          const corrTiers = tiers.filter(t => t.correction === corr);
          const prices = corrTiers.map(t => `${t.vehicle_type}: $${(t.price / 100).toFixed(0)}`).join(", ");
          tierLines.push(`${corr}: ${prices}`);
        }
        priceText = `${tripFeeText}By vehicle size:\n    - ${tierLines.join("\n    - ")}`;
      } else {
        const tierDescriptions = tiers.map(t => `${t.vehicle_type}: $${(t.price / 100).toFixed(0)}`);
        priceText = `${tripFeeText}By vehicle size: ${tierDescriptions.join(", ")}`;
      }
    } else if (model === "distance_tiered" && s.pricing_config?.distance_tiers?.length) {
      const tiers = s.pricing_config.distance_tiers;
      const tierDescriptions = tiers.map(tier => {
        const rangeText = tier.max_miles != null
          ? `${tier.min_miles}-${tier.max_miles} miles`
          : `Over ${tier.min_miles} miles`;

        if (tier.per_mile_price) {
          return `${rangeText}: $${Number(tier.base_price).toFixed(2)} base + $${Number(tier.per_mile_price).toFixed(2)}/mile`;
        }
        return `${rangeText}: $${Number(tier.base_price).toFixed(2)}`;
      });
      priceText = `${tripFeeText}Distance-tiered:\n    - ${tierDescriptions.join("\n    - ")}`;
    } else if (model === "per_unit" && s.pricing_config?.per_unit_price) {
      const unitLabel = s.pricing_config.unit_label || "unit";
      const perUnit = s.pricing_config.per_unit_price;
      const minUnits = s.pricing_config.min_units;
      priceText = `${tripFeeText}$${Number(perUnit).toFixed(2)} per ${unitLabel}`;
      if (minUnits && minUnits > 1) {
        priceText += ` (${minUnits}-${unitLabel} minimum, starting at $${(perUnit * minUnits).toFixed(2)})`;
      }
      if (quoteBehavior === "quote_rate_only") {
        priceText += " [QUOTE RATE ONLY — do NOT compute total]";
      }
    } else if (model === "package" && s.pricing_config?.packages?.length) {
      const pkgs = s.pricing_config.packages;
      const pkgList = pkgs.map(p => {
        // Price stored in cents in vehicle_tiered/package configs, dollars in legacy
        const priceVal = Number(p.price);
        const displayPrice = priceVal > 1000 ? `$${(priceVal / 100).toFixed(0)}` : `$${priceVal.toFixed(2)}`;
        return `${p.name}: ${displayPrice}${p.description ? ` (${p.description})` : ""}`;
      });
      priceText = `${tripFeeText}Packages:\n    - ${pkgList.join("\n    - ")}`;
    } else if (model === "flat" && s.price_amount) {
      priceText = `${tripFeeText}$${Number(s.price_amount).toFixed(2)} flat rate`;
      if (s.pricing_config?.included_miles && s.pricing_config?.overage_per_mile) {
        priceText += ` (${s.pricing_config.included_miles} mi included, +$${Number(s.pricing_config.overage_per_mile).toFixed(2)}/mi beyond)`;
      }
    } else if (model === "variable") {
      priceText = s.price_amount ? `${tripFeeText}Starting at $${Number(s.price_amount).toFixed(2)} (varies by job)` : `${tripFeeText}Price varies by job`;
    } else if (s.price_type === "fixed" && s.price_amount) {
      priceText = `${tripFeeText}$${Number(s.price_amount).toFixed(2)} (exact price)`;
    } else if (s.price_type === "starting_at" && s.price_amount) {
      priceText = `${tripFeeText}Starting at $${Number(s.price_amount).toFixed(2)} (final price varies)`;
    } else {
      priceText = `${tripFeeText}Quote required`;
    }

    // Add dropoff requirement tag
    const dropoffTag = s.requires_dropoff ? "[REQUIRES DROPOFF]" : "[ON-SITE ONLY]";

    // Booking type tag — data-driven from DB (replaces old hardcoded complexity-only tag)
    let bookingTag: string;
    if (s.booking_type === "estimate_first") {
      bookingTag = "[ESTIMATE FIRST]";
    } else if (s.booking_type === "consultation") {
      bookingTag = "[CONSULTATION]";
    } else if (s.complexity === "complex") {
      bookingTag = "[NEEDS DETAILS - ask about symptoms/specifics before quoting]";
    } else {
      bookingTag = "[DIRECT BOOK]";
    }

    let line = `• ${s.name}: ${priceText} ${dropoffTag} ${bookingTag}`;
    if (s.price_factors) line += `\n  Price depends on: ${s.price_factors}`;
    if (s.prerequisite_note) line += `\n  Prerequisite: ${s.prerequisite_note}`;
    if (s.prep_instructions) line += `\n  Customer prep: ${s.prep_instructions}`;
    if (s.complexity === "complex" && s.description) line += `\n  Info: ${s.description}`;
    // Duration line — show range when min/max are set
    if (s.duration_min_minutes && s.duration_max_minutes && s.duration_minutes) {
      line += `\n  Duration: ${s.duration_min_minutes}-${s.duration_max_minutes} min (typical: ${s.duration_minutes})`;
    } else if (s.duration_minutes) {
      line += `\n  Duration: ${s.duration_minutes} min`;
    }
    if (s.synonyms.length > 0) line += ` [also: ${s.synonyms.slice(0, 3).join(", ")}]`;
    // Per-service required intake fields
    const reqFields = (s as any).required_intake_fields;
    if (Array.isArray(reqFields) && reqFields.length > 0) {
      line += `\n  Required info: ${reqFields.join(", ")}`;
    }
    return line;
  }).join("\n");
}

function normalizeMenuItems(items: Array<{
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  price_cents?: number | null;
  modifiers?: string[] | null;
  dietary_tags?: string[] | null;
  is_available?: boolean;
  prep_time_minutes?: number | null;
}> | null): NormalizedMenuItem[] {
  if (!items || items.length === 0) return [];
  
  return items.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category || "Menu",
    price_cents: item.price_cents ?? null,
    modifiers: item.modifiers || item.dietary_tags || [],
    is_available: item.is_available !== false,
  }));
}

// Maximum menu summary length for ElevenLabs dynamic variables
const MENU_SUMMARY_MAX_LENGTH = 1500;

/**
 * Build menu summary for AI context with strict size constraints
 * Creates a structured menu listing that allows the AI to take orders
 * Format: "Category: Item ($X.XX), Item ($X.XX). Category: Item..."
 * 
 * CRITICAL: Output must be <= 1500 chars to fit ElevenLabs context
 * For large menus, compression is applied: top categories + representative items
 */
function buildMenuSummary(items: NormalizedMenuItem[]): string {
  if (items.length === 0) return "";
  
  // Group items by category
  const byCategory: Record<string, Array<{ name: string; price: string; modifiers: string[] }>> = {};
  
  for (const item of items) {
    if (!item.is_available) continue;
    
    const cat = item.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    
    const priceStr = item.price_cents ? `$${(item.price_cents / 100).toFixed(2)}` : "market price";
    byCategory[cat].push({
      name: item.name,
      price: priceStr,
      modifiers: item.modifiers || [],
    });
  }
  
  const categoryNames = Object.keys(byCategory);
  const totalItems = Object.values(byCategory).reduce((sum, arr) => sum + arr.length, 0);
  
  if (totalItems === 0) return "";
  
  // Determine if compression is needed (estimate: ~40 chars per item)
  const estimatedSize = totalItems * 40;
  const needsCompression = estimatedSize > MENU_SUMMARY_MAX_LENGTH;
  
  // Build the summary - compress for large menus
  const itemsPerCategory = needsCompression ? 5 : 8;
  const categoriesToInclude = needsCompression ? Math.min(categoryNames.length, 6) : categoryNames.length;
  
  const parts: string[] = [];
  let usedCategories = 0;
  
  for (const [cat, categoryItems] of Object.entries(byCategory)) {
    if (usedCategories >= categoriesToInclude) break;
    
    const itemStrings = categoryItems.slice(0, itemsPerCategory).map(item => {
      let str = `${item.name} (${item.price})`;
      // Include modifiers hint if they exist (only if not compressing)
      if (!needsCompression && item.modifiers.length > 0) {
        const modHint = item.modifiers.slice(0, 2).join("/");
        str += ` [${modHint}]`;
      }
      return str;
    });
    const suffix = categoryItems.length > itemsPerCategory ? `, +${categoryItems.length - itemsPerCategory} more` : "";
    parts.push(`${cat}: ${itemStrings.join(", ")}${suffix}`);
    usedCategories++;
  }
  
  let result = parts.join(". ");
  
  // Add header with count and compression indicator
  if (needsCompression) {
    const remainingCategories = categoryNames.length - categoriesToInclude;
    result = `[${totalItems} items, ${categoryNames.length} categories${remainingCategories > 0 ? `, showing top ${categoriesToInclude}` : ""}] ` + result;
  } else {
    result = `[${totalItems} items available] ` + result;
  }
  
  // Final safety truncation to ensure we never exceed limit
  return truncate(result, MENU_SUMMARY_MAX_LENGTH);
}

/**
 * Extract menu metadata for dynamic variables
 */
function getMenuMetadata(items: NormalizedMenuItem[]): { hasMore: boolean; topCategories: string[] } {
  const byCategory: Record<string, number> = {};
  for (const item of items) {
    if (!item.is_available) continue;
    byCategory[item.category] = (byCategory[item.category] || 0) + 1;
  }
  
  const sortedCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);
  
  return {
    hasMore: Object.keys(byCategory).length > 6 || items.length > 30,
    topCategories: sortedCategories.slice(0, 6),
  };
}

// Optimized summaries for voice channel - shorter to reduce latency
function buildFaqsSummary(faqs: Array<{ question: string; answer: string }>, forVoice = false): string {
  if (faqs.length === 0) return "";
  const limit = forVoice ? 3 : 5;
  const qLen = forVoice ? 50 : 80;
  const aLen = forVoice ? 80 : 120;
  return faqs.slice(0, limit).map(f => `Q: ${truncate(f.question, qLen)} A: ${truncate(f.answer, aLen)}`).join(" | ");
}

function buildIntentRulesSummary(rules: IntentRule[], forVoice = false): string {
  if (rules.length === 0) return "";
  const limit = forVoice ? 3 : 5;
  return rules.slice(0, limit).map(r => {
    const action = r.action || {};
    if (action.guidance) return `${r.name}: ${truncate(String(action.guidance), forVoice ? 50 : 80)}`;
    if (action.max_discount_percent !== undefined) return `${r.name}: Max ${action.max_discount_percent}% discount`;
    return r.name;
  }).join("; ");
}

function buildMemoryHintsSummary(hints: MemoryHint[], forVoice = false): string {
  if (hints.length === 0) return "";
  const limit = forVoice ? 2 : 3;
  const len = forVoice ? 40 : 60;
  return hints.slice(0, limit).map(h => {
    if (h.usage === "personalize") return `Personalize: ${truncate(h.summary, len)}`;
    if (h.usage === "timing_preference") return `Timing: ${truncate(h.summary, len)}`;
    return truncate(h.summary, len);
  }).join("; ");
}

function buildRequiredQuestionsSummary(configs: RequiredQuestionsConfig[]): string {
  if (configs.length === 0) return "No required questions configured";

  const summaries: string[] = [];
  for (const config of configs) {
    const requiredCount = config.required_inputs.length;
    const optionalCount = config.optional_inputs.length;

    if (requiredCount > 0) {
      const fields = config.required_inputs.slice(0, 3).map(f => f.label).join(", ");
      summaries.push(`${config.intent}: ${requiredCount} required (${fields}${requiredCount > 3 ? '...' : ''})`);
    }
  }

  return summaries.length > 0 ? summaries.join("; ") : "No required questions configured";
}

function buildPricingRulesSummary(pricingRulesJsonb: any): string {
  if (!pricingRulesJsonb || !pricingRulesJsonb.rules || !Array.isArray(pricingRulesJsonb.rules)) {
    return "No pricing rules configured";
  }

  const rules = pricingRulesJsonb.rules;
  if (rules.length === 0) {
    return "No pricing rules configured";
  }

  const summaries: string[] = [];
  for (const rule of rules.slice(0, 5)) { // Show first 5 rules
    const serviceLabel = rule.service_name || "All services";
    const typeLabel = rule.type === "distance-based" ? "distance-based" :
                      rule.type === "flat" ? "flat rate" :
                      rule.type === "per-unit" ? "per-unit" :
                      rule.type === "tiered" ? "tiered" :
                      rule.type === "range-only" ? "price range" :
                      "quote only";

    const requiredInputs = rule.required_inputs || [];
    const inputsStr = requiredInputs.length > 0 ? ` (needs: ${requiredInputs.join(", ")})` : "";

    summaries.push(`${serviceLabel}: ${typeLabel}${inputsStr}`);
  }

  const remaining = rules.length - 5;
  if (remaining > 0) {
    summaries.push(`+${remaining} more`);
  }

  return summaries.join("; ");
}

function determineUsage(memoryType: string): string {
  switch (memoryType) {
    case "time_pattern": return "timing_preference";
    case "customer_preference": return "personalize";
    case "capacity_pattern": return "suggest_alternatives";
    default: return "context";
  }
}

// Removed duplicate buildPricingRulesSummary function - consolidated above at line 678

// ===== FOOD EXTENDED HELPERS =====

function buildFoodServiceTypesSummary(foodSettings: any): string {
  if (!foodSettings) return "";
  const types: string[] = [];
  if (foodSettings.accepts_pickup !== false) types.push("Pickup");
  if (foodSettings.accepts_delivery === true) types.push("Delivery");
  if (foodSettings.accepts_dine_in !== false) types.push("Dine-in");
  return types.join(", ");
}

function buildDailySpecialsSummary(specials: any[] | null): string {
  if (!specials || specials.length === 0) return "";
  return specials.slice(0, 8).map(s => {
    const parts: string[] = [s.name];
    if (s.active_days && Array.isArray(s.active_days) && s.active_days.length > 0) {
      parts.push(`(${s.active_days.join(", ")})`);
    }
    if (s.start_time && s.end_time) {
      parts.push(`${s.start_time}-${s.end_time}`);
    }
    return parts.join(" ");
  }).join("; ");
}

function buildDeliveryFeeSummary(zones: any[] | null): string {
  if (!zones || zones.length === 0) return "";
  return zones.slice(0, 5).map(z => {
    const parts: string[] = [];
    if (z.zone_name) parts.push(z.zone_name);
    if (z.delivery_fee_cents != null) parts.push(`$${(z.delivery_fee_cents / 100).toFixed(2)} fee`);
    if (z.minimum_order_cents != null) parts.push(`$${(z.minimum_order_cents / 100).toFixed(2)} min`);
    if (z.estimated_delivery_min_minutes && z.estimated_delivery_max_minutes) {
      parts.push(`${z.estimated_delivery_min_minutes}-${z.estimated_delivery_max_minutes} min`);
    }
    return parts.join(", ");
  }).join(" | ");
}

function buildDietaryTagsSummary(menuItems: any[] | null): string {
  if (!menuItems || menuItems.length === 0) return "";
  const tagSet = new Set<string>();
  for (const item of menuItems) {
    if (item.dietary_tags && Array.isArray(item.dietary_tags)) {
      for (const tag of item.dietary_tags) {
        if (typeof tag === "string" && tag.trim()) tagSet.add(tag.trim());
      }
    }
  }
  return Array.from(tagSet).sort().join(", ");
}

function buildFoodPoliciesSummary(policies: any | null): string {
  if (!policies) return "";
  const parts: string[] = [];
  if (policies.cancellation_policy) parts.push(`Cancellation: ${truncate(policies.cancellation_policy, 100)}`);
  if (policies.allergy_disclaimer) parts.push(`Allergy: ${truncate(policies.allergy_disclaimer, 100)}`);
  if (policies.modification_cutoff_minutes != null) parts.push(`Modifications: up to ${policies.modification_cutoff_minutes} min after order`);
  if (policies.refund_policy) parts.push(`Refunds: ${truncate(policies.refund_policy, 80)}`);
  return parts.join(" | ");
}

// ===== MEDICAL EXTENDED HELPERS =====

function formatCentsToDisplay(cents: number | null | undefined): string {
  if (cents == null || cents <= 0) return "";
  return `$${(cents / 100).toFixed(0)}`;
}

function buildAcceptedCarriersSummary(practiceSettings: any | null): string {
  if (!practiceSettings?.accepted_insurance_carriers) return "";
  const carriers = practiceSettings.accepted_insurance_carriers;
  if (!Array.isArray(carriers) || carriers.length === 0) return "";
  return carriers.filter((c: any) => typeof c === "string" && c.trim()).join(", ");
}

function buildInNetworkInsurersSummary(coverageSettings: any | null): string {
  if (!coverageSettings?.in_network_insurers) return "";
  const insurers = coverageSettings.in_network_insurers;
  if (!Array.isArray(insurers) || insurers.length === 0) return "";
  return insurers.filter((i: any) => typeof i === "string" && i.trim()).join(", ");
}

function buildMedicalPoliciesSummary(policies: any | null): string {
  if (!policies) return "";
  const parts: string[] = [];
  if (policies.cancellation_notice_hours != null) {
    parts.push(`${policies.cancellation_notice_hours}-hour cancellation notice required`);
  }
  if (policies.appointment_no_show_fee_cents != null && policies.appointment_no_show_fee_cents > 0) {
    parts.push(`$${(policies.appointment_no_show_fee_cents / 100).toFixed(0)} no-show fee`);
  }
  if (policies.new_patient_arrival_minutes != null) {
    parts.push(`New patients arrive ${policies.new_patient_arrival_minutes} minutes early`);
  }
  if (policies.prescription_refill_notice_days != null) {
    parts.push(`Prescription refills need ${policies.prescription_refill_notice_days} business days notice`);
  }
  if (policies.cancellation_fee_cents != null && policies.cancellation_fee_cents > 0) {
    parts.push(`$${(policies.cancellation_fee_cents / 100).toFixed(0)} late cancellation fee`);
  }
  return parts.join(". ") + (parts.length > 0 ? "." : "");
}

function buildMedicalFeeSummary(practiceSettings: any | null, policies: any | null): string {
  const parts: string[] = [];
  if (practiceSettings?.new_patient_fee_cents) {
    parts.push(`New patient visit: $${(practiceSettings.new_patient_fee_cents / 100).toFixed(0)}`);
  }
  if (practiceSettings?.follow_up_fee_cents) {
    parts.push(`Follow-up: $${(practiceSettings.follow_up_fee_cents / 100).toFixed(0)}`);
  }
  if (policies?.appointment_no_show_fee_cents) {
    parts.push(`No-show fee: $${(policies.appointment_no_show_fee_cents / 100).toFixed(0)}`);
  }
  return parts.join(". ") + (parts.length > 0 ? "." : "");
}

function buildMenuCategoriesSummary(menuItems: any[] | null): string {
  if (!menuItems || menuItems.length === 0) return "";
  const catSet = new Set<string>();
  for (const item of menuItems) {
    if (item.category && typeof item.category === "string" && item.category.trim()) {
      catSet.add(item.category.trim());
    }
  }
  return Array.from(catSet).sort().join(", ");
}

/**
 * Build 7-day capacity overview from upcoming bookings.
 * Output: "Mon: busy (8) | Tue: open | Wed: closed | Thu: light (2)"
 * Only for booking-enabled tenants. Wrapped in try/catch to never break context building.
 */
async function buildCapacity7DayOverview(
  supabase: SupabaseClient,
  tenantId: string,
  hoursJson: Record<string, any>,
  timezone: string,
  busyThreshold = 6,
): Promise<string> {
  try {
    // Compute 7-day window in tenant timezone
    const now = new Date();
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data: bookings } = await supabase
      .from("bookings")
      .select("scheduled_at")
      .eq("tenant_id", tenantId)
      .in("status", ["pending", "confirmed"])
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", endDate.toISOString())
      .limit(200);

    if (!bookings) return "";

    // Count bookings per actual calendar date (YYYY-MM-DD), not by day-of-week
    const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const countByDate: Record<string, number> = {};

    for (const b of bookings) {
      if (!b.scheduled_at) continue;
      const d = new Date(b.scheduled_at);
      const dateKey = d.toISOString().slice(0, 10); // YYYY-MM-DD
      countByDate[dateKey] = (countByDate[dateKey] || 0) + 1;
    }

    // Build output for next 7 days with actual dates
    const parts: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const dayIdx = date.getDay();
      const dayKey = dayOrder[dayIdx];
      const label = dayLabels[dayIdx];
      const dateStr = `${monthNames[date.getMonth()]} ${date.getDate()}`;
      const dateKey = date.toISOString().slice(0, 10);
      const hours = hoursJson?.[dayKey];
      const isClosed = !hours || hours.closed || hours.is_open === false || (!hours.open && !hours.close);

      if (isClosed) {
        parts.push(`${dateStr} (${label}): closed`);
      } else {
        const count = countByDate[dateKey] || 0;
        if (count === 0) {
          parts.push(`${dateStr} (${label}): open`);
        } else if (count >= busyThreshold) {
          parts.push(`${dateStr} (${label}): busy (${count})`);
        } else {
          parts.push(`${dateStr} (${label}): light (${count})`);
        }
      }
    }

    return parts.join(" | ");
  } catch (err) {
    console.warn("[buildCapacity7DayOverview] Error (non-fatal):", err);
    return "";
  }
}

function buildEtaRulesSummary(busynessRules: Record<string, any>): string {
  if (!busynessRules || Object.keys(busynessRules).length === 0) return "";

  const summaries: string[] = [];
  const levels = ["low", "medium", "high"];

  for (const level of levels) {
    const rule = busynessRules[level];
    if (rule && rule.eta_multiplier) {
      summaries.push(`${level}: ${rule.eta_multiplier}x ETA`);
    }
  }

  return summaries.join("; ");
}

function hasModule(modules: string[] | null, name: string): boolean {
  if (!modules) return false;
  return modules.includes(name);
}

function parseIntakeFields(contextFieldsJson: unknown): IntakeField[] {
  if (!contextFieldsJson || !Array.isArray(contextFieldsJson)) return [];

  return contextFieldsJson.map((field: Record<string, unknown>) => ({
    field_key: String(field.key || field.field_key || ""),
    label: String(field.label || ""),
    type: String(field.type || "text"),
    required: field.required === true,
    choices: Array.isArray(field.options) ? field.options.map(String) : undefined,
  })).filter(f => f.field_key && f.label);
}

// ============= LOCATION & SERVICE AREA SUMMARIES =============

/**
 * Build speech-ready location summary.
 * Used when callers ask "where are you located?"
 *
 * Rules:
 * - If address exists: "We're based at <address>."
 * - If no address: returns empty string (never invent)
 */
function buildLocationSummary(address: string | null | undefined): string {
  if (!address || address.trim() === "") return "";
  return `We're based at ${address.trim()}.`;
}

/**
 * Build speech-ready service area summary.
 * Used when callers ask "what areas do you serve?"
 *
 * Supports both formats:
 * - Legacy: { type: "radius", miles: 25 }
 * - New: { mode: "radius", radius_miles: 25 }
 *
 * Rules:
 * - If radius mode: "We serve a X-mile radius from our location."
 * - If zip codes: "We serve zip codes: X, Y, Z."
 * - If both: mentions radius first, then zips
 * - If empty: returns empty string (never invent)
 */
function buildServiceAreaSummary(
  serviceArea: { type?: string; miles?: number; zip_codes?: string[]; mode?: string; radius_miles?: number; include?: { zips?: string[] } } | null,
  businessMode: string
): string {
  if (!serviceArea) return "";

  const parts: string[] = [];

  // Check for radius (both formats)
  const radiusMiles = serviceArea.radius_miles || serviceArea.miles;
  const isRadiusMode = serviceArea.mode === "radius" || serviceArea.type === "radius";

  if (isRadiusMode && radiusMiles) {
    if (businessMode === "dispatch") {
      parts.push(`We dispatch within a ${radiusMiles}-mile radius from our location`);
    } else {
      parts.push(`We serve a ${radiusMiles}-mile radius from our location`);
    }
  }

  // Check for zip codes (both formats)
  const zipCodes = serviceArea.include?.zips || serviceArea.zip_codes;
  if (Array.isArray(zipCodes) && zipCodes.length > 0) {
    if (zipCodes.length <= 5) {
      parts.push(`We serve zip codes: ${zipCodes.join(", ")}`);
    } else {
      parts.push(`We serve ${zipCodes.length} zip codes in our area`);
    }
  }

  if (parts.length === 0) return "";

  return parts.join(". ") + ".";
}

/**
 * Build out-of-area message for when customer is outside service area.
 * Returns a default message if not configured.
 */
function buildOutOfAreaMessage(
  outOfAreaMessage: string | null | undefined,
  serviceArea: { type?: string; miles?: number; zip_codes?: string[]; mode?: string; radius_miles?: number; include?: { zips?: string[] } } | null
): string {
  // Use configured message if exists
  if (outOfAreaMessage && outOfAreaMessage.trim()) {
    return outOfAreaMessage.trim();
  }

  // Generate default based on service area
  if (!serviceArea) return "";

  const radiusMiles = serviceArea.radius_miles || serviceArea.miles;
  if (radiusMiles) {
    return `I'm sorry, that location appears to be outside our ${radiusMiles}-mile service area. Would you like me to take your information and have someone follow up about availability?`;
  }

  return "I'm sorry, that location may be outside our normal service area. Would you like me to take your information and have someone follow up?";
}

// ============= AI GUIDELINES HELPER FUNCTIONS =============

// New structure from AIBusinessPolicies component
interface PolicyConfig {
  enabled?: boolean;
  guidance?: string;
  thresholds?: Record<string, number | string>;
}

interface AiPoliciesJson {
  // New nested structure (from AIBusinessPolicies.tsx)
  upsell?: PolicyConfig;
  pricing?: PolicyConfig;
  capacity?: PolicyConfig;
  recognition?: PolicyConfig;
  escalation?: PolicyConfig;
  // Legacy flat structure (backwards compatibility)
  upselling?: string;
  pricing_negotiation?: string;
  [key: string]: PolicyConfig | string | undefined;
}

/**
 * Build a speech-ready summary of AI guidelines/policies.
 * These are high-level strategic instructions for the AI (upselling, pricing flexibility, etc.)
 */
/**
 * Extract guidance string from either new nested structure or legacy flat structure
 */
function extractPolicyGuidance(policy: PolicyConfig | string | undefined): string {
  if (!policy) return "";
  if (typeof policy === "string") return policy;
  // New nested structure - only return guidance if enabled
  if (policy.enabled === false) return "";
  return policy.guidance || "";
}

/**
 * Extract threshold value from new nested policy structure
 */
function extractPolicyThreshold(policy: PolicyConfig | string | undefined, key: string): number | string | undefined {
  if (!policy || typeof policy === "string") return undefined;
  return policy.thresholds?.[key];
}

/**
 * Build a speech-ready summary of AI guidelines/policies.
 * Handles both new nested structure and legacy flat structure.
 */
function buildAiGuidelinesSummary(aiPolicies: AiPoliciesJson | null | undefined): string {
  if (!aiPolicies) return "";

  const parts: string[] = [];

  // Handle upselling (new: upsell, legacy: upselling)
  const upsellGuidance = extractPolicyGuidance(aiPolicies.upsell) || extractPolicyGuidance(aiPolicies.upselling);
  if (upsellGuidance) {
    parts.push(`Upselling: ${upsellGuidance}`);
  }

  // Handle pricing/negotiation (new: pricing, legacy: pricing_negotiation)
  const pricingGuidance = extractPolicyGuidance(aiPolicies.pricing) || extractPolicyGuidance(aiPolicies.pricing_negotiation);
  if (pricingGuidance) {
    // Include threshold info if available
    const maxDiscount = extractPolicyThreshold(aiPolicies.pricing, "max_discount_percent");
    const loyaltyThreshold = extractPolicyThreshold(aiPolicies.pricing, "loyalty_threshold_orders");
    let pricingPart = `Pricing flexibility: ${pricingGuidance}`;
    if (maxDiscount !== undefined && Number(maxDiscount) > 0) {
      pricingPart += ` (Max discount: ${maxDiscount}%)`;
    }
    if (loyaltyThreshold !== undefined) {
      pricingPart += ` (Loyalty after ${loyaltyThreshold} orders)`;
    }
    parts.push(pricingPart);
  }

  // Handle capacity (both structures use same key)
  const capacityGuidance = extractPolicyGuidance(aiPolicies.capacity);
  if (capacityGuidance) {
    const busyThreshold = extractPolicyThreshold(aiPolicies.capacity, "busy_threshold_percent");
    let capacityPart = `Capacity/availability: ${capacityGuidance}`;
    if (busyThreshold !== undefined) {
      capacityPart += ` (Busy at ${busyThreshold}%)`;
    }
    parts.push(capacityPart);
  }

  // Handle recognition (new structure only)
  const recognitionGuidance = extractPolicyGuidance(aiPolicies.recognition);
  if (recognitionGuidance) {
    parts.push(`Customer recognition: ${recognitionGuidance}`);
  }

  // Handle escalation (both structures use same key)
  const escalationGuidance = extractPolicyGuidance(aiPolicies.escalation);
  if (escalationGuidance) {
    parts.push(`Escalation: ${escalationGuidance}`);
  }

  if (parts.length === 0) return "";

  return parts.join(". ") + ".";
}

/**
 * Extract individual policy guidances for dynamic variables
 */
function extractAiGuidelines(aiPolicies: AiPoliciesJson | null | undefined): {
  upselling: string;
  pricing_negotiation: string;
  capacity: string;
  escalation: string;
  recognition: string;
  max_discount_percent: number;
  loyalty_threshold_orders: number;
} {
  const defaults = {
    upselling: "",
    pricing_negotiation: "",
    capacity: "",
    escalation: "",
    recognition: "",
    max_discount_percent: 0,
    loyalty_threshold_orders: 5,
  };
  
  if (!aiPolicies) return defaults;

  return {
    upselling: extractPolicyGuidance(aiPolicies.upsell) || extractPolicyGuidance(aiPolicies.upselling) || "",
    pricing_negotiation: extractPolicyGuidance(aiPolicies.pricing) || extractPolicyGuidance(aiPolicies.pricing_negotiation) || "",
    capacity: extractPolicyGuidance(aiPolicies.capacity) || "",
    escalation: extractPolicyGuidance(aiPolicies.escalation) || "",
    recognition: extractPolicyGuidance(aiPolicies.recognition) || "",
    max_discount_percent: Number(extractPolicyThreshold(aiPolicies.pricing, "max_discount_percent")) || 0,
    loyalty_threshold_orders: Number(extractPolicyThreshold(aiPolicies.pricing, "loyalty_threshold_orders")) || 5,
  };
}

// ============= SERVICE PACKAGES & PROMOTIONS HELPER FUNCTIONS =============

interface ServicePackageRow {
  name: string;
  description: string | null;
  package_type: string;
  regular_price_cents: number | null;
  package_price_cents: number | null;
  billing_interval: string | null;
  member_discount_percent: number | null;
  is_featured: boolean;
}

interface SeasonalKnowledgeRow {
  event_name: string;
  ai_announcement: string | null;
  special_pricing_notes: string | null;
  start_date: string | null;
  end_date: string | null;
}

/**
 * Build speech-ready summary of service packages & memberships
 * Example: "Monthly membership ($99/month, 10% off all services). Treatment series: 5-pack Facial for $400 (saves $50)."
 */
function buildPackagesSummary(packages: ServicePackageRow[]): string {
  if (!packages || packages.length === 0) return "";
  
  const parts: string[] = [];
  
  for (const pkg of packages.slice(0, 5)) {
    const name = pkg.name;
    const savings = pkg.regular_price_cents && pkg.package_price_cents
      ? Math.round((pkg.regular_price_cents - pkg.package_price_cents) / 100)
      : null;
    
    if (pkg.package_type === "membership" && pkg.billing_interval) {
      const price = pkg.package_price_cents ? `$${Math.round(pkg.package_price_cents / 100)}` : "";
      const discount = pkg.member_discount_percent ? `${pkg.member_discount_percent}% off services` : "";
      parts.push(`${name} (${price}/${pkg.billing_interval}${discount ? ", " + discount : ""})`);
    } else if (pkg.package_type === "bundle" || pkg.package_type === "series") {
      const price = pkg.package_price_cents ? `$${Math.round(pkg.package_price_cents / 100)}` : "";
      const savingsText = savings && savings > 0 ? ` (saves $${savings})` : "";
      parts.push(`${name}: ${price}${savingsText}`);
    } else {
      // Generic package
      const price = pkg.package_price_cents ? `$${Math.round(pkg.package_price_cents / 100)}` : "";
      parts.push(`${name}: ${price}`);
    }
  }
  
  return parts.join(". ");
}

/**
 * Build active promotions summary from seasonal knowledge
 * Filters to only currently active promotions
 * Example: "Summer Sale: 15% off all services through August. Book 3 get 1 free on haircuts."
 */
function buildActivePromotions(seasonal: SeasonalKnowledgeRow[]): string {
  if (!seasonal || seasonal.length === 0) return "";
  
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const parts: string[] = [];
  
  for (const event of seasonal) {
    // Filter to only currently active events
    const isActive = (!event.start_date || event.start_date <= today) && 
                     (!event.end_date || event.end_date >= today);
    
    if (isActive) {
      // Prefer ai_announcement, fall back to event_name + special_pricing_notes
      if (event.ai_announcement) {
        parts.push(event.ai_announcement);
      } else if (event.special_pricing_notes) {
        parts.push(`${event.event_name}: ${event.special_pricing_notes}`);
      }
    }
  }
  
  return parts.slice(0, 3).join(". ");
}


/**
 * Format price from a service object
 * Returns human-readable price string for AI to use
 */
export function formatPriceFromService(service: NormalizedService): string {
  if (service.price_type === "fixed" && service.price_amount) {
    return `$${service.price_amount}`;
  } else if (service.price_type === "starting_at" && service.price_amount) {
    return `starting at $${service.price_amount}`;
  } else {
    return "quote required";
  }
}

/**
 * Format price from a menu item object
 * Returns human-readable price string for AI to use
 */
export function formatPriceFromMenuItem(item: NormalizedMenuItem): string {
  if (item.price_cents && item.price_cents > 0) {
    return `$${(item.price_cents / 100).toFixed(2)}`;
  } else {
    return "market price";
  }
}

/**
 * Find matching service or menu item by query string
 * Uses fuzzy matching on name and synonyms
 * Returns the best match with formatted price
 */
export function findMatchingServiceOrMenuItem(
  query: string,
  services: NormalizedService[],
  menuItems: NormalizedMenuItem[]
): { type: "service" | "menu" | null; name: string; price: string } | null {
  const queryLower = query.toLowerCase().trim();

  if (!queryLower) return null;

  // First try exact service match by name
  for (const service of services) {
    if (service.name.toLowerCase() === queryLower) {
      return {
        type: "service",
        name: service.name,
        price: formatPriceFromService(service),
      };
    }
  }

  // Try service name contains match
  for (const service of services) {
    if (service.name.toLowerCase().includes(queryLower) || queryLower.includes(service.name.toLowerCase())) {
      return {
        type: "service",
        name: service.name,
        price: formatPriceFromService(service),
      };
    }
  }

  // Try service synonyms
  for (const service of services) {
    for (const synonym of service.synonyms) {
      if (synonym.toLowerCase() === queryLower || synonym.toLowerCase().includes(queryLower)) {
        return {
          type: "service",
          name: service.name,
          price: formatPriceFromService(service),
        };
      }
    }
  }

  // Try menu item exact match
  for (const item of menuItems) {
    if (item.is_available && item.name.toLowerCase() === queryLower) {
      return {
        type: "menu",
        name: item.name,
        price: formatPriceFromMenuItem(item),
      };
    }
  }

  // Try menu item contains match
  for (const item of menuItems) {
    if (item.is_available && (item.name.toLowerCase().includes(queryLower) || queryLower.includes(item.name.toLowerCase()))) {
      return {
        type: "menu",
        name: item.name,
        price: formatPriceFromMenuItem(item),
      };
    }
  }

  return null;
}

// ============= MAIN BUILDER =============

export interface BuildContextOptions {
  tenantId: string;
  locationId?: string | null;
  customerId?: string | null;
  channel: "voice" | "sms" | "browser_test";
  sessionId: string;
  callerPhone?: string | null;
  includeIntelligence?: boolean;
}

export async function buildBusinessContext(
  supabase: SupabaseClient,
  options: BuildContextOptions
): Promise<{ context: BusinessContext; systemPrompt: string }> {
  const { tenantId, locationId, customerId, channel, sessionId, callerPhone, includeIntelligence = true } = options;
  
  const missingSections: string[] = [];
  
  // ===== FETCH ALL DATA IN PARALLEL =====
  const [
    tenantResult,
    servicesResult,
    menuItemsResult,
    faqsResult,
    objectionsResult,
    knowledgeBaseResult,
    assistantResult,
    assistantSettingsResult,
    intelligenceSettingsResult,
    retentionSettingsResult,
    foodSettingsResult,
    distanceSettingsResult,
    servicePackagesResult,
    seasonalKnowledgeResult,
    staffMembersResult,
    referralNetworkResult,
    deliveryZonesResult,
    foodPoliciesResult,
    menuSpecialsResult,
    medicalPracticeResult,
    medicalCoverageResult,
    medicalPoliciesResult,
  ] = await Promise.all([
    supabase.from("tenants").select("*, pricing_rules_jsonb, busyness_rules_jsonb").eq("id", tenantId).single(),
    supabase.from("services").select("*").eq("tenant_id", tenantId).eq("is_active", true).limit(50),
    supabase.from("menu_items").select("id, name, description, category, price_cents, modifiers, dietary_tags, is_available").eq("tenant_id", tenantId).eq("is_available", true).limit(50),
    supabase.from("business_faqs").select("question, answer").eq("tenant_id", tenantId).order("priority_weight", { ascending: false }).limit(30),
    supabase.from("objection_responses").select("objection, response").eq("tenant_id", tenantId).order("priority_weight", { ascending: false }).limit(10),
    supabase.from("ai_knowledge_base").select("type, title, content").eq("tenant_id", tenantId).order("priority_weight", { ascending: false }).limit(20),
    supabase.from("ai_assistants").select("tone, greeting_script, fallback_script").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("assistant_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("tenant_intelligence_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("data_retention_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("tenant_food_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
    // Fetch ETA/distance settings from the canonical table
    supabase.from("tenant_distance_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
    // Fetch service packages for memberships & bundles
    supabase.from("service_packages").select("name, description, package_type, regular_price_cents, package_price_cents, billing_interval, member_discount_percent, is_featured").eq("tenant_id", tenantId).eq("is_active", true).order("display_order").limit(10),
    // Fetch seasonal knowledge for active promotions (current date filter)
    supabase.from("seasonal_knowledge").select("event_name, ai_announcement, special_pricing_notes, start_date, end_date").eq("tenant_id", tenantId).limit(10),
    // Fetch staff members for multi-resource awareness
    supabase.from("staff_members").select("id, full_name, role, is_active, service_ids").eq("tenant_id", tenantId).eq("is_active", true).order("sort_order").limit(50),
    // Fetch referral network settings
    supabase.from("referral_network_settings").select("enabled, accept_referrals, send_referrals, intro_style, network_services, preferred_partners").eq("tenant_id", tenantId).maybeSingle(),
    // Fetch food extended data
    supabase.from("delivery_zones").select("zone_name, zone_type, min_miles, max_miles, delivery_fee_cents, minimum_order_cents, estimated_delivery_min_minutes, estimated_delivery_max_minutes").eq("tenant_id", tenantId).eq("is_active", true).limit(10),
    supabase.from("food_policies").select("*").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("menu_specials").select("name, description, schedule_type, active_days, start_time, end_time, is_active").eq("tenant_id", tenantId).eq("is_active", true).limit(10),
    // Fetch medical extended data
    supabase.from("medical_practice_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("medical_coverage_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("medical_policies").select("*").eq("tenant_id", tenantId).maybeSingle(),
  ]);
  
  // ===== CONDITIONAL FETCH: IMPOUND LOT DATA =====
  // Fetch impound data only after we know tenant capabilities
  let impoundLotData: {
    lot: any | null;
    settings: any | null;
  } = { lot: null, settings: null };
  
  // We need tenant data to check capabilities, so fetch impound data afterward
  if (tenantResult.data) {
    const tenantCaps = (tenantResult.data.capabilities_json as Record<string, boolean>) || {};
    const hasImpoundCap = tenantCaps.impound_lot === true;
    
    if (hasImpoundCap) {
      const [impoundLotResult, impoundSettingsResult] = await Promise.all([
        supabase.from("impound_lots")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .order("is_default", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("impound_settings")
          .select("*")
          .eq("tenant_id", tenantId)
          .maybeSingle(),
      ]);
      
      impoundLotData = {
        lot: impoundLotResult.data,
        settings: impoundSettingsResult.data,
      };
    }
  }
  
  if (tenantResult.error || !tenantResult.data) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }
  
  const tenant = tenantResult.data;
  const services = servicesResult.data || [];
  const menuItems = menuItemsResult.data || [];
  const rawFaqs = faqsResult.data || [];
  // Dynamically override the "hours" FAQ answer with live hours_json so it never
  // goes stale when the tenant updates their hours in Settings after onboarding.
  const liveHoursString = buildWeeklyHoursSummary(normalizeHours(tenant?.hours_json as Record<string, unknown> | null));
  const faqs = liveHoursString
    ? rawFaqs.map(f => f.question.toLowerCase().includes("hour") ? { ...f, answer: liveHoursString } : f)
    : rawFaqs;
  const objections = objectionsResult.data || [];
  const knowledgeBase = knowledgeBaseResult.data || [];
  const assistant = assistantResult.data;
  const assistantSettings = assistantSettingsResult.data;
  const intelligenceSettings = intelligenceSettingsResult.data;
  const retentionSettings = retentionSettingsResult.data;
  const foodSettings = foodSettingsResult.data;
  const distanceSettings = distanceSettingsResult.data as TenantDistanceSettings | null;
  const servicePackages = servicePackagesResult.data || [];
  const seasonalKnowledge = seasonalKnowledgeResult.data || [];
  const referralNetworkSettings = referralNetworkResult?.data || null;
  const deliveryZones = deliveryZonesResult?.data || [];
  const foodPolicies = foodPoliciesResult?.data || null;
  const menuSpecials = menuSpecialsResult?.data || [];
  const medicalPractice = medicalPracticeResult?.data || null;
  const medicalCoverage = medicalCoverageResult?.data || null;
  const medicalPolicies = medicalPoliciesResult?.data || null;

  // ===== DERIVE CAPABILITIES =====
  const caps = resolveCapabilities(
    tenant.business_mode,
    tenant.enabled_modules,
    tenant.capabilities_json
  );

  // Build a flat boolean map for _meta.capabilities and conditional checks
  const capabilities: Record<string, boolean> = {
    ai_voice: caps.hasAiVoice,
    instant_text_back: caps.hasInstantTextBack,
    booking: caps.hasBooking,
    dispatch_queue: caps.hasDispatchQueue,
    impound_lot: caps.hasImpoundLot,
    fleet_management: caps.hasFleetManagement,
    food_orders: caps.hasFoodOrders,
    menu_knowledge: caps.hasMenuKnowledge,
    reservations: caps.hasReservations,
    catering: caps.hasCatering,
    medical_intake: caps.hasMedicalIntake,
    estimates: caps.hasEstimates,
    eta_tracking: caps.hasEtaTracking,
    calendar_sync: caps.hasCalendarSync,
    payment_processing: caps.hasPaymentProcessing,
    after_hours_handling: caps.hasAfterHoursHandling,
    sms_campaigns: caps.hasSmsCampaigns,
    knowledge_base: caps.hasKnowledgeBase,
    sales_leads: caps.hasSalesLeads,
    test_drives: caps.hasTestDrives,
    sales_inventory: caps.hasSalesInventory,
    mobile_service: caps.hasDispatchQueue || caps.isDispatchBusiness,
    emergency_dispatch: caps.hasDispatchQueue,
    referral_network: caps.hasReferralNetwork,
  };
  
  // Track missing sections
  if (services.length === 0 && !caps.isFoodBusiness) missingSections.push("services");
  if (menuItems.length === 0 && caps.isFoodBusiness) missingSections.push("menu");
  if (faqs.length === 0) missingSections.push("faqs");
  if (objections.length === 0) missingSections.push("objections");
  if (!tenant.hours_json) missingSections.push("hours");
  if (!tenant.cancellation_policy && !tenant.deposit_policy) missingSections.push("policies");
  
  // ===== FETCH INTELLIGENCE LAYERS =====
  let intentRules: IntentRule[] = [];
  let requiredQuestions: RequiredQuestionsConfig[] = [];
  let memoryHints: MemoryHint[] = [];

  const hipaaMode = tenant.hipaa_mode === true;
  const memoryEnabled = intelligenceSettings?.memory_enabled === true && !hipaaMode;

  if (includeIntelligence) {
    const { data: rules } = await supabase
      .from("business_intent_rules")
      .select("id, name, rule_type, action_json, priority")
      .eq("tenant_id", tenantId)
      .eq("is_enabled", true)
      .eq("is_suggested", false)
      .order("priority", { ascending: false })
      .limit(10);

    if (rules && rules.length > 0) {
      intentRules = rules.filter(r => r.rule_type !== "required_inputs").map(r => ({
        id: r.id,
        name: r.name,
        rule_type: r.rule_type,
        action: r.action_json || {},
        priority: r.priority || 0,
      }));

      // Extract required questions rules
      requiredQuestions = rules
        .filter(r => r.rule_type === "required_inputs" && r.action_json)
        .map(r => r.action_json as unknown as RequiredQuestionsConfig)
        .filter(config => config.intent && Array.isArray(config.required_inputs));
    }
    
    if (memoryEnabled) {
      const minConfidence = intelligenceSettings?.min_confidence_threshold || 0.65;
      const minObservations = intelligenceSettings?.min_observation_threshold || 3;
      
      let memoryQuery = supabase
        .from("business_memory")
        .select("memory_type, summary, confidence_score, observation_count")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .gte("confidence_score", minConfidence)
        .gte("observation_count", minObservations)
        .order("confidence_score", { ascending: false })
        .limit(5);
      
      if (locationId && !intelligenceSettings?.share_memory_across_locations) {
        memoryQuery = memoryQuery.eq("location_id", locationId);
      }
      
      if (hipaaMode) {
        memoryQuery = memoryQuery.neq("memory_type", "customer_preference");
      }
      
      const { data: memories } = await memoryQuery;
      
      if (memories && memories.length > 0) {
        memoryHints = memories.map(m => ({
          type: m.memory_type,
          summary: m.summary,
          usage: determineUsage(m.memory_type),
          confidence: m.confidence_score,
        }));
      }
    }
  }
  
  // ===== NORMALIZE DATA =====
  const allNormalizedServices = normalizeServices(services);
  // Split primary vs secondary services
  const normalizedServices = allNormalizedServices.filter(s => s.service_type !== "secondary");
  const secondaryServices = allNormalizedServices.filter(s => s.service_type === "secondary");
  const normalizedMenu = normalizeMenuItems(menuItems);
  const enabledModules: string[] = Array.isArray(tenant.enabled_modules) ? tenant.enabled_modules as string[] : [];
  
  // Pre-compute business mode early (needed for dispatch intake fields and service area)
  const businessMode = tenant.business_mode || "general";

  // ===== FETCH DISPATCH INTAKE FIELDS (industry-specific) =====
  let dispatchIntakeFields: Array<{ field_key: string; field_label: string; ai_prompt_hint: string; is_required: boolean }> = [];
  if (businessMode === "dispatch" && tenant.industry) {
    try {
      const { data: intakeFields } = await supabase
        .from("intake_field_templates")
        .select("field_key, field_label, ai_prompt_hint, is_required, display_order")
        .eq("industry_key", tenant.industry)
        .order("display_order", { ascending: true });
      if (intakeFields && intakeFields.length > 0) {
        dispatchIntakeFields = intakeFields;
      }
    } catch {
      // Don't block context build if intake fields fail
    }
  }

  // ===== BUILD CONTEXT OBJECT =====
  const pricingRules = Array.isArray(tenant.pricing_rules_jsonb) ? tenant.pricing_rules_jsonb : [];
  const busynessRules = tenant.busyness_rules_jsonb && typeof tenant.busyness_rules_jsonb === 'object' ? tenant.busyness_rules_jsonb : {};

  // Pre-compute service area for summaries
  const serviceAreaData = tenant.service_area_json as BusinessContext["tenant"]["service_area"];

  // Compute 7-day capacity overview (booking-enabled tenants only)
  let capacity7DayOverview = "";
  if (capabilities.booking) {
    const busyThreshold = (tenant.busyness_rules_jsonb as any)?.busy_threshold ?? 6;
    capacity7DayOverview = await buildCapacity7DayOverview(
      supabase,
      tenantId,
      tenant.hours_json || {},
      tenant.timezone || "America/New_York",
      busyThreshold,
    );
  }

  const context: BusinessContext = {
    tenant: {
      tenant_id: tenantId,
      business_name: tenant.name || "",
      tagline: tenant.tagline || "",
      business_mode: businessMode,
      industry_slug: tenant.industry || "",
      timezone: tenant.timezone || "America/New_York",
      phone_e164: tenant.phone_public || "",
      website: tenant.website_url || "",
      address: tenant.address || "",
      years_in_business: tenant.years_in_business,
      service_area: serviceAreaData,
      hours: normalizeHours(tenant.hours_json as Record<string, unknown>),
      hours_today: getTodayHours(tenant.hours_json as Record<string, unknown>, tenant.timezone),
      // Speech-ready summaries
      location_summary: buildLocationSummary(tenant.address),
      service_area_summary: buildServiceAreaSummary(serviceAreaData, businessMode),
      out_of_area_message: buildOutOfAreaMessage(tenant.out_of_area_message, serviceAreaData),
    },
    offerings: {
      services: normalizedServices,
      services_summary: buildServicesSummary(normalizedServices),
      services_for_prompt: buildServicesForPrompt(normalizedServices),
      secondary_services: secondaryServices,
      secondary_services_summary: buildSecondaryServicesSummary(secondaryServices),
      menu: normalizedMenu,
      menu_summary: buildMenuSummary(normalizedMenu),
      packages_summary: buildPackagesSummary(servicePackages),
      active_promotions: buildActivePromotions(seasonalKnowledge),
    },
    pricing: {
      rules: tenant.pricing_rules_jsonb?.rules || pricingRules,
      rules_summary: buildPricingRulesSummary(tenant.pricing_rules_jsonb),
      price_modifiers_summary: (tenant.context_fields_json as any)?.price_modifiers_summary || "",
      busyness_config: tenant.busyness_rules_jsonb || null,
    },
    eta: (() => {
      // PRIORITY: Use tenant_distance_settings if available (canonical source)
      // Otherwise fall back to legacy eta_policy_jsonb
      const busynessPct = tenant.busyness_rules_jsonb?.manual_busyness_pct || 0;
      
      let baseEta: BusinessContext["eta"];
      if (distanceSettings && distanceSettings.eta_base_minutes > 0) {
        // Use new canonical source: tenant_distance_settings
        baseEta = computeEtaFromDistanceSettings(distanceSettings, businessMode, busynessPct);
      } else {
        // Fall back to legacy eta_policy_jsonb
        baseEta = computeEtaForContext(
          tenant.eta_policy_jsonb as EtaPolicyJson | null,
          businessMode,
          busynessPct
        );
      }
      
      return {
        ...baseEta,
        busyness_rules: tenant.busyness_rules_jsonb || busynessRules,
        rules_summary: buildEtaRulesSummary(tenant.busyness_rules_jsonb || busynessRules),
      };
    })(),
    intake: {
      required_fields: parseIntakeFields(tenant.context_fields_json),
    },
    policies: (() => {
      const aiGuidelines = extractAiGuidelines(tenant.ai_policies_json);
      return {
        cancellation: tenant.cancellation_policy || "",
        deposit: tenant.deposit_policy || "",
        refund: tenant.refund_policy || "",
        payment_methods: tenant.payment_methods || [],
        payment_timing: (tenant.context_fields_json as any)?.payment_timing || "",
        ai_never_promise: tenant.ai_never_promise || [],
        ai_guidelines: {
          upselling: aiGuidelines.upselling,
          pricing_negotiation: aiGuidelines.pricing_negotiation,
          capacity: aiGuidelines.capacity,
          escalation: aiGuidelines.escalation,
          recognition: aiGuidelines.recognition,
          max_discount_percent: aiGuidelines.max_discount_percent,
          loyalty_threshold_orders: aiGuidelines.loyalty_threshold_orders,
        },
        ai_guidelines_summary: buildAiGuidelinesSummary(tenant.ai_policies_json),
      };
    })(),
    // Dispatch industry-specific intake fields (for dynamic variable injection)
    dispatch_intake_fields: dispatchIntakeFields.length > 0 ? dispatchIntakeFields : undefined,
    // Dropoff coverage configuration (for dispatch businesses)
    dropoff_coverage: distanceSettings ? {
      mode: (distanceSettings as any).dropoff_coverage_mode || "none",
      max_miles: (distanceSettings as any).dropoff_max_miles || null,
    } : { mode: "none", max_miles: null },

    food_settings: foodSettings ? {
      estimated_prep_minutes: foodSettings.estimated_prep_minutes || 15,
      accepts_pickup: foodSettings.accepts_pickup !== false,
      accepts_delivery: foodSettings.accepts_delivery === true,
      accepts_dine_in: foodSettings.accepts_dine_in !== false,
      delivery_radius_miles: foodSettings.delivery_radius_miles || null,
      delivery_minimum_cents: foodSettings.delivery_minimum_cents || null,
      accepts_catering: foodSettings.accepts_catering === true,
      catering_min_guests: foodSettings.catering_min_guests || null,
      catering_lead_days: foodSettings.catering_lead_days || null,
      order_confirmation_mode: foodSettings.order_confirmation_mode || "auto_confirm",
      // Extended food data
      delivery_zones: deliveryZones,
      food_policies: foodPolicies,
      menu_specials: menuSpecials,
      // Computed summaries
      food_service_types_summary: buildFoodServiceTypesSummary(foodSettings),
      daily_specials_summary: buildDailySpecialsSummary(menuSpecials),
      delivery_fee_summary: buildDeliveryFeeSummary(deliveryZones),
      dietary_tags_available: buildDietaryTagsSummary(menuItems),
      food_policies_summary: buildFoodPoliciesSummary(foodPolicies),
      menu_categories_summary: buildMenuCategoriesSummary(menuItems),
    } : null,
    medical_settings: (medicalPractice || medicalCoverage || medicalPolicies) ? {
      practice: medicalPractice,
      coverage: medicalCoverage,
      policies: medicalPolicies,
      accepted_carriers_summary: buildAcceptedCarriersSummary(medicalPractice),
      in_network_insurers_summary: buildInNetworkInsurersSummary(medicalCoverage),
      medical_policies_summary: buildMedicalPoliciesSummary(medicalPolicies),
      new_patient_fee_display: formatCentsToDisplay(medicalPractice?.new_patient_fee_cents),
      follow_up_fee_display: formatCentsToDisplay(medicalPractice?.follow_up_fee_cents),
      no_show_fee_display: formatCentsToDisplay(medicalPolicies?.appointment_no_show_fee_cents),
      cancellation_fee_display: formatCentsToDisplay(medicalPolicies?.cancellation_fee_cents),
    } : null,
    knowledge: {
      faqs: faqs.map(f => ({ question: f.question, answer: f.answer })),
      faqs_summary: buildFaqsSummary(faqs),
      objections: objections.map(o => ({ objection: o.objection, response: o.response })),
      supplementary: knowledgeBase.map(k => ({ type: k.type, title: k.title, content: k.content })),
      // Dispatch-specific knowledge (populated from tenant context_fields_json if available)
      vehicle_knowledge_summary: (tenant.context_fields_json as any)?.vehicle_knowledge_summary || "",
      roadside_safety_scripts: (tenant.context_fields_json as any)?.roadside_safety_scripts || "",
      // Competitor knowledge
      competitor_positioning_summary: (tenant.context_fields_json as any)?.competitor_positioning_summary || "",
      competitor_never_say: (tenant.context_fields_json as any)?.competitor_never_say || [],
      our_advantages: (tenant.context_fields_json as any)?.our_advantages || [],
      // Seasonal/promotional
      seasonal_events_summary: (tenant.context_fields_json as any)?.seasonal_events_summary || "",
    },
    operations: {
      modules: {
        booking_enabled: hasModule(enabledModules, "booking"),
        dispatch_enabled: hasModule(enabledModules, "dispatch_queue"),
        orders_enabled: hasModule(enabledModules, "food_orders"),
        reservations_enabled: hasModule(enabledModules, "reservations"),
        catering_enabled: hasModule(enabledModules, "catering"),
        voice_enabled: hasModule(enabledModules, "ai_voice"),
        sms_enabled: hasModule(enabledModules, "instant_text_back"),
        medical_intake_enabled: hasModule(enabledModules, "medical_intake"),
      },
      availability: {
        calendar_provider: assistantSettings?.calendar_provider || null,
        calendar_connected: !!assistantSettings?.calendar_provider,
        booking_url: assistantSettings?.booking_url || tenant.website_url || "",
        booking_mode: assistantSettings?.ai_booking_mode || "pending_approval",
      },
      capacity_7day_overview: capacity7DayOverview,
    },
    intelligence: {
      settings: {
        memory_enabled: memoryEnabled,
        min_confidence: intelligenceSettings?.min_confidence_threshold || 0.65,
        share_across_locations: intelligenceSettings?.share_memory_across_locations || false,
      },
      intent_rules: intentRules,
      intent_rules_summary: buildIntentRulesSummary(intentRules),
      required_questions: requiredQuestions,
      required_questions_summary: buildRequiredQuestionsSummary(requiredQuestions),
      memory_hints: memoryHints,
      memory_hints_summary: buildMemoryHintsSummary(memoryHints),
      // Customer context (populated during call if customer is recognized)
      customer_order_count: null, // Set by caller resolution during inbound call
      customer_name_from_lookup: "", // Set by caller resolution during inbound call
      active_job_summary: "", // Set by active job lookup during inbound call
      // Phase 2: Predictive context (populated below)
      caller_history_summary: "",
      predicted_intent_hint: "",
      caller_priority_tier: "new",
      caller_priority_instructions: "This is a new caller. Introduce the business warmly, explain key services, and capture their name and contact info.",
      behavioral_hints_summary: "",
    },
    safety: {
      hipaa_mode: hipaaMode,
      store_transcripts: retentionSettings?.store_transcripts !== false && !hipaaMode,
      store_recordings: retentionSettings?.store_recordings !== false && !hipaaMode,
      store_caller_phone: retentionSettings?.store_caller_phone !== false && !hipaaMode,
      phi_minimization: retentionSettings?.phi_minimization_enabled === true || hipaaMode,
      allow_customer_memory: retentionSettings?.allow_customer_memory !== false && !hipaaMode,
    },
    ai_settings: {
      tone: assistant?.tone || "friendly",
      greeting_script: assistant?.greeting_script || "",
      fallback_script: assistant?.fallback_script || "",
      unknown_question_behavior: (assistantSettings?.settings_json as any)?.unknown_question_behavior
        || assistantSettings?.unknown_question_behavior || "try_help",
      followup_cadence: (assistantSettings?.settings_json as any)?.followup_cadence || "moderate",
      ai_behavior_mode: (assistantSettings?.ai_behavior_mode as "full_service" | "callback_only")
        || ((tenant?.capabilities_json as any)?.callbackOnly === true ? "callback_only" : "full_service"),
      service_default_flow: (assistantSettings?.service_default_flow as "schedule_first" | "urgency_check" | "dispatch_first") || getIndustryDefaultFlow(tenant?.industry),
      ai_booking_mode: (assistantSettings?.ai_booking_mode as "pending" | "auto_confirm") || "pending",
      same_day_enabled: assistantSettings?.same_day_enabled !== false,
      emergency_surcharge: assistantSettings?.emergency_surcharge || "",
      cancellation_notice_hours: assistantSettings?.cancellation_notice_hours || 24,
      confirmation_method: (assistantSettings?.confirmation_method as "sms" | "email" | "both") || "sms",
      waitlist_enabled: assistantSettings?.waitlist_enabled === true,
      recurring_enabled: assistantSettings?.recurring_enabled === true,
      deposit_required: assistantSettings?.deposit_required === true,
      deposit_amount: assistantSettings?.deposit_amount || "",
      dropoff_instructions: assistantSettings?.dropoff_instructions || "",
      ai_guardrails: (assistantSettings?.settings_json as any)?.ai_guardrails || "",
      required_intake_fields: Array.isArray((assistantSettings?.settings_json as any)?.required_intake_fields)
        ? (assistantSettings?.settings_json as any).required_intake_fields
        : ["customer_name", "customer_phone"],
      escalation_rules: {
        transferOnRequest: (assistantSettings?.settings_json as any)?.escalation_rules?.transferOnRequest ?? true,
        transferOnAnger: (assistantSettings?.settings_json as any)?.escalation_rules?.transferOnAnger ?? true,
        transferOnPriceObjection: (assistantSettings?.settings_json as any)?.escalation_rules?.transferOnPriceObjection ?? false,
        transferOnComplexQuestion: (assistantSettings?.settings_json as any)?.escalation_rules?.transferOnComplexQuestion ?? true,
        transferOnComplaint: (assistantSettings?.settings_json as any)?.escalation_rules?.transferOnComplaint ?? true,
        fallbackAction: (assistantSettings?.settings_json as any)?.escalation_rules?.fallbackAction || "callback",
      },
    },
    // Business Brain fields - initialized with defaults, populated below
    business_brain_summary: "",
    business_brain_json: "{}",
    business_brain_json_truncated: false,
    // Staff members
    staff_members: (staffMembersResult?.data ?? []).map((s: any) => ({
      id: s.id,
      full_name: s.full_name,
      role: s.role,
      is_active: s.is_active,
      service_ids: s.service_ids,
    })),
    // Impound lot data (built from fetched impound data)
    impound: buildImpoundContext(impoundLotData.lot, impoundLotData.settings, tenant.timezone || "America/New_York"),
    // Sales context (populated below for sales businesses)
    sales: {
      inventory_summary: "",
      inventory_detail: "",
      financing_available: false,
      trade_in_accepted: false,
      sales_rep_names: "",
    },
    referral_network: referralNetworkSettings?.enabled ? {
      enabled: true,
      send_referrals: referralNetworkSettings.send_referrals ?? true,
      accept_referrals: referralNetworkSettings.accept_referrals ?? true,
      intro_style: referralNetworkSettings.intro_style || "enthusiastic",
      network_services: referralNetworkSettings.network_services || [],
      preferred_partners: (referralNetworkSettings.preferred_partners || []).map(String),
    } : null,
    _meta: {
      channel,
      session_id: sessionId,
      customer_id: customerId || null,
      location_id: locationId || null,
      built_at: new Date().toISOString(),
      missing_sections: missingSections,
      capabilities,
    },
  };
  
  // ===== FETCH AND ATTACH BUSINESS BRAIN SNAPSHOT =====
  try {
    const businessBrainSnapshot = await getBusinessBrainSnapshot(supabase, {
      tenantId,
      locationId,
    });
    
    // Generate summary and serialized JSON
    const brainSummary = buildBusinessBrainSummary(businessBrainSnapshot);
    const { json: brainJson, truncated: brainTruncated } = serializeBusinessBrainSnapshot(businessBrainSnapshot);
    
    // Attach to context
    context.business_brain = businessBrainSnapshot;
    context.business_brain_summary = brainSummary;
    context.business_brain_json = brainJson;
    context.business_brain_json_truncated = brainTruncated;
    
    // Log snapshot stats
    console.log(`[buildBusinessContext] Business Brain attached:`, {
      tenant_id: tenantId,
      business_mode: businessBrainSnapshot._meta.business_mode,
      section_counts: businessBrainSnapshot._meta.section_counts,
      json_size: brainJson.length,
      truncated: brainTruncated,
    });
  } catch (brainError) {
    console.error(`[buildBusinessContext] Failed to fetch Business Brain:`, brainError);
    // Context still valid without snapshot - fields already have defaults
  }
  
  // ===== SALES CONTEXT (for sales businesses) =====
  if (caps.isSalesBusiness) {
    try {
      // Build inventory summary with price ranges and body styles
      const { data: inventoryStats } = await supabase
        .from("sales_inventory")
        .select("condition, make, model, body_style, asking_price_cents, year")
        .eq("tenant_id", tenantId)
        .eq("status", "available");

      if (inventoryStats && inventoryStats.length > 0) {
        const total = inventoryStats.length;
        const newCount = inventoryStats.filter((i: any) => i.condition === "new").length;
        const usedCount = inventoryStats.filter((i: any) => i.condition === "used").length;
        const certifiedCount = inventoryStats.filter((i: any) => i.condition === "certified").length;

        // Top makes
        const makeCounts: Record<string, number> = {};
        for (const item of inventoryStats) {
          if ((item as any).make) makeCounts[(item as any).make] = (makeCounts[(item as any).make] || 0) + 1;
        }
        const topMakes = Object.entries(makeCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([make, count]) => `${make} (${count})`);

        // Price range
        const prices = inventoryStats
          .map((i: any) => i.asking_price_cents)
          .filter((p: number | null) => p && p > 0) as number[];
        let priceRange = "";
        if (prices.length > 0) {
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          priceRange = `$${(minPrice / 100).toLocaleString()} to $${(maxPrice / 100).toLocaleString()}`;
        }

        // Body styles
        const styleCounts: Record<string, number> = {};
        for (const item of inventoryStats) {
          const style = (item as any).body_style;
          if (style && style !== "Unknown") styleCounts[style] = (styleCounts[style] || 0) + 1;
        }
        const topStyles = Object.entries(styleCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([style, count]) => `${count} ${style}${count > 1 ? "s" : ""}`);

        // Year range
        const years = inventoryStats.map((i: any) => parseInt(i.year)).filter((y: number) => !isNaN(y));
        let yearRange = "";
        if (years.length > 0) {
          const minYear = Math.min(...years);
          const maxYear = Math.max(...years);
          yearRange = minYear === maxYear ? `${minYear}` : `${minYear}-${maxYear}`;
        }

        const parts: string[] = [`${total} vehicles in stock`];
        const conditionParts: string[] = [];
        if (newCount) conditionParts.push(`${newCount} new`);
        if (usedCount) conditionParts.push(`${usedCount} used`);
        if (certifiedCount) conditionParts.push(`${certifiedCount} certified`);
        if (conditionParts.length) parts.push(conditionParts.join(", "));
        if (yearRange) parts.push(`Years: ${yearRange}`);
        if (priceRange) parts.push(`Priced from ${priceRange}`);
        if (topMakes.length) parts.push(`Makes: ${topMakes.join(", ")}`);
        if (topStyles.length) parts.push(`Types: ${topStyles.join(", ")}`);

        context.sales.inventory_summary = parts.join(". ");

        // Build per-vehicle detail string for AI to reference specific vehicles
        const { data: inventoryDetail } = await supabase
          .from("sales_inventory")
          .select("year, make, model, trim, body_style, mileage, asking_price_cents, features")
          .eq("tenant_id", tenantId)
          .eq("status", "available")
          .order("make", { ascending: true })
          .order("asking_price_cents", { ascending: true })
          .limit(50);

        if (inventoryDetail && inventoryDetail.length > 0) {
          // Group by make
          const byMake: Record<string, typeof inventoryDetail> = {};
          for (const v of inventoryDetail) {
            const make = ((v as any).make || "OTHER").toUpperCase();
            if (!byMake[make]) byMake[make] = [];
            byMake[make].push(v);
          }

          const lines: string[] = [];
          for (const [make, vehicles] of Object.entries(byMake).sort((a, b) => a[0].localeCompare(b[0]))) {
            lines.push(`${make}:`);
            for (const v of vehicles) {
              const yr = (v as any).year || "";
              const model = (v as any).model || "";
              const trim = (v as any).trim || "";
              const body = (v as any).body_style || "";
              const mi = (v as any).mileage;
              const miStr = mi ? `${Math.round(mi / 1000)}K mi` : "";
              const price = (v as any).asking_price_cents;
              const priceStr = price ? `$${Math.round(price / 100).toLocaleString()}` : "";
              const feats = ((v as any).features as string[] || []).slice(0, 4).join(", ");
              
              let line = `- ${yr} ${model}`;
              if (trim) line += ` ${trim}`;
              if (body) line += `, ${body}`;
              if (miStr) line += `, ${miStr}`;
              if (priceStr) line += `, ${priceStr}`;
              if (feats) line += ` - ${feats}`;
              lines.push(line);
            }
            lines.push(""); // blank line between makes
          }
          context.sales.inventory_detail = lines.join("\n").trim();
        }
      }

      // Read sales-specific context fields
      const ctxFields = (tenant as Record<string, unknown>).context_fields_json as Record<string, unknown> | undefined;
      if (ctxFields) {
        context.sales.financing_available = ctxFields.financing_available === true;
        context.sales.trade_in_accepted = ctxFields.trade_in_accepted === true;
        context.sales.sales_rep_names = (ctxFields.sales_rep_names as string) || "";
      }

      // Fetch sales workflow configuration
      const { data: salesWorkflow } = await supabase
        .from("general_workflow_config")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (salesWorkflow) {
        if (!context.workflow_config) context.workflow_config = {};
        context.workflow_config.sales = {
          sales_pricing_strategy: salesWorkflow.sales_pricing_strategy || "deflect_to_visit",
          sales_ask_trade_in: salesWorkflow.sales_ask_trade_in !== false,
          sales_ask_financing: salesWorkflow.sales_ask_financing !== false,
          sales_ask_timeline: salesWorkflow.sales_ask_timeline !== false,
          sales_ask_budget: salesWorkflow.sales_ask_budget || "careful",
          sales_max_vehicles_to_mention: salesWorkflow.sales_max_vehicles_to_mention || 3,
          sales_appointment_label: salesWorkflow.sales_appointment_label || "test drive",
          sales_push_intensity: salesWorkflow.sales_push_intensity || "medium",
          sales_follow_up_script: salesWorkflow.sales_follow_up_script || "",
          sales_lead_capture_minimum: salesWorkflow.sales_lead_capture_minimum || "name_phone_interest",
          sales_inventory_presentation: salesWorkflow.sales_inventory_presentation || "conversational",
        };
        console.log(`[buildBusinessContext] Sales workflow config loaded`);
      }
    } catch (salesError) {
      console.error(`[buildBusinessContext] Failed to build sales context:`, salesError);
    }
  }

  // ===== ACTIVE JOB LOOKUP (for WIP status over the phone) =====
  if (callerPhone && caps.hasJobTracking) {
    try {
      const { data: activeJobs } = await supabase
        .from("active_jobs")
        .select("id, job_number, title, status, priority, metadata_json, estimated_completion, job_service_items(id, title, status, sort_order)")
        .eq("tenant_id", tenantId)
        .eq("customer_phone", callerPhone)
        .eq("is_active", true)
        .in("status", ["intake", "in_progress", "on_hold"])
        .order("created_at", { ascending: false })
        .limit(3);

      if (activeJobs && activeJobs.length > 0) {
        const summaries: string[] = [];
        for (const job of activeJobs) {
          const items = (job.job_service_items || []).sort(
            (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
          );
          const completed = items.filter((i: { status: string }) => i.status === "completed");
          const remaining = items.filter((i: { status: string }) => i.status !== "completed" && i.status !== "skipped");

          let summary = `${job.title}`;
          if (items.length > 0) {
            summary += `. ${completed.length} of ${items.length} services complete`;
            if (completed.length > 0) {
              summary += `: ${completed.map((i: { title: string }) => i.title).join(", ")} done`;
            }
            if (remaining.length > 0) {
              summary += `. ${remaining.map((i: { title: string }) => i.title).join(", ")} remaining`;
            }
          }
          if (job.status === "on_hold") {
            summary += ". Currently on hold";
          }
          if (job.estimated_completion) {
            const est = new Date(job.estimated_completion);
            const now = new Date();
            const diffHours = Math.round((est.getTime() - now.getTime()) / (1000 * 60 * 60));
            if (diffHours > 0 && diffHours <= 48) {
              summary += diffHours <= 4
                ? `. Estimated ready in about ${diffHours} hours`
                : diffHours <= 24
                  ? `. Estimated ready later today`
                  : `. Estimated ready tomorrow`;
            }
          }
          summaries.push(summary);
        }
        context.intelligence.active_job_summary = activeJobs.length === 1
          ? `This customer has an active job: ${summaries[0]}`
          : `This customer has ${activeJobs.length} active jobs. ${summaries.map((s, i) => `Job ${i + 1}: ${s}`).join(". ")}`;
      }
    } catch (jobError) {
      console.error(`[buildBusinessContext] Failed to fetch active jobs:`, jobError);
      // Non-fatal: active_job_summary stays empty string
    }
  }

  // ===== PHASE 2: PREDICTIVE CONTEXT INJECTION =====
  // These enrich the AI's context with per-caller and per-business intelligence

  // 2.1: Repeat caller history (last 3 sessions)
  if (callerPhone && callerPhone.length >= 10) {
    try {
      const { data: callerCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("phone_e164", callerPhone)
        .maybeSingle();

      if (callerCustomer) {
        const { data: recentSessions } = await supabase
          .from("ai_call_sessions")
          .select("summary, outcome, started_at, extracted_payload")
          .eq("tenant_id", tenantId)
          .eq("customer_id", callerCustomer.id)
          .not("ended_at", "is", null)
          .order("started_at", { ascending: false })
          .limit(3);

        if (recentSessions && recentSessions.length > 0) {
          const historyParts: string[] = [];
          for (const sess of recentSessions) {
            const date = new Date(sess.started_at);
            const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const summary = sess.summary || sess.outcome || "called";
            historyParts.push(`${dateStr}: ${summary}`);
          }
          context.intelligence.caller_history_summary = historyParts.join(". ");
        }

        // 2.3: Caller priority scoring
        // Get interaction count and recent session IDs
        const { data: customerSessions, count: interactionCount } = await supabase
          .from("ai_call_sessions")
          .select("id", { count: "exact" })
          .eq("tenant_id", tenantId)
          .eq("customer_id", callerCustomer.id)
          .limit(50);

        // Get total revenue from sessions linked to this customer
        let totalRevenue = 0;
        if (customerSessions && customerSessions.length > 0) {
          const sessionIds = customerSessions.map((s: { id: string }) => s.id);
          const { data: revenueData } = await supabase
            .from("revenue_attributions")
            .select("revenue_cents")
            .eq("tenant_id", tenantId)
            .in("session_id", sessionIds);
          totalRevenue = revenueData?.reduce(
            (sum: number, r: { revenue_cents: number }) => sum + (r.revenue_cents || 0), 0
          ) || 0;
        }
        const interactions = interactionCount || 0;

        if (interactions >= 5 || totalRevenue >= 50000) {
          context.intelligence.caller_priority_tier = "vip";
          context.intelligence.caller_priority_instructions =
            "This is a valued repeat customer. Greet them warmly by name, acknowledge their loyalty, and proactively suggest services they might need based on their history.";
        } else if (interactions >= 2) {
          context.intelligence.caller_priority_tier = "regular";
          context.intelligence.caller_priority_instructions =
            "This is a returning customer. Greet them by name and reference their previous interactions if available.";
        }
        // "new" tier is the default set in initialization
      }
    } catch (e) {
      console.warn("[buildBusinessContext] Predictive caller context failed:", e);
    }
  }

  // 2.2: Time-based intent prediction
  try {
    const now = new Date();
    const tenantTz = context.tenant.timezone || "America/New_York";
    const currentHour = parseInt(now.toLocaleString("en-US", { timeZone: tenantTz, hour: "numeric", hour12: false }));

    const { data: timePatterns } = await supabase
      .from("business_patterns")
      .select("pattern_key, description, confidence_score, data_json")
      .eq("tenant_id", tenantId)
      .eq("pattern_type", "time_pattern")
      .gte("confidence_score", 0.7)
      .limit(5);

    if (timePatterns && timePatterns.length > 0) {
      // Check if we have hour-specific patterns
      for (const pattern of timePatterns) {
        const data = pattern.data_json as Record<string, unknown>;
        const peakHours = data?.peakHours as number[] | undefined;
        if (peakHours && peakHours.includes(currentHour)) {
          // We're in a peak hour — predict based on business mode
          const mode = context.tenant.business_mode;
          const hints: string[] = [];
          if (mode === "food" && currentHour >= 11 && currentHour <= 13) {
            hints.push("Most callers at this time are placing lunch orders. Lead with the menu.");
          } else if (mode === "food" && currentHour >= 17 && currentHour <= 20) {
            hints.push("Most callers at this time are placing dinner orders. Lead with specials.");
          } else if (mode === "dispatch" && (currentHour < 7 || currentHour > 20)) {
            hints.push("After-hours callers often have emergencies. Assess urgency quickly.");
          } else {
            hints.push("This is a peak call time. Callers are likely ready to book — be efficient.");
          }
          context.intelligence.predicted_intent_hint = hints.join(" ");
          break;
        }
      }
    }
  } catch (e) {
    console.warn("[buildBusinessContext] Time prediction failed:", e);
  }

  // 2.5: Feed business patterns into agent behavior
  try {
    const { data: actionablePatterns } = await supabase
      .from("business_patterns")
      .select("pattern_type, pattern_key, description, suggested_action, confidence_score, data_json")
      .eq("tenant_id", tenantId)
      .eq("is_actionable", true)
      .eq("is_dismissed", false)
      .gte("confidence_score", 0.7)
      .order("confidence_score", { ascending: false })
      .limit(5);

    if (actionablePatterns && actionablePatterns.length > 0) {
      const hints: string[] = [];
      for (const p of actionablePatterns) {
        if (p.pattern_key.startsWith("low_conv_")) {
          const svc = (p.data_json as Record<string, unknown>)?.service as string || "this service";
          hints.push(`When callers ask about ${svc}, emphasize value — it has lower-than-average booking rates.`);
        } else if (p.pattern_key === "high_hangup_rate") {
          hints.push("Hangup rate is high. Get to the point quickly and address the caller's need early in the conversation.");
        } else if (p.pattern_key === "high_escalation_rate") {
          hints.push("Many calls need human help. Try harder to resolve questions yourself using available knowledge.");
        } else if (p.suggested_action) {
          hints.push(p.suggested_action);
        }
      }
      if (hints.length > 0) {
        context.intelligence.behavioral_hints_summary = hints.join(" ");
      }
    }
  } catch (e) {
    console.warn("[buildBusinessContext] Behavioral hints failed:", e);
  }

  // ===== RESOLVE EFFECTIVE BOOKING BEHAVIOR =====
  // Must happen BEFORE buildDynamicVariables() so the resolved mode
  // is available via {{ai_behavior_mode}} dynamic variable.
  // The ElevenLabs agent prompt reads this to decide how to handle bookings.
  {
    const rawMode = context.ai_settings.ai_behavior_mode;
    let resolved = rawMode || "full_service";
    if (!rawMode || rawMode === "full_service") {
      const bookingMode = context.ai_settings.ai_booking_mode;
      if (bookingMode === "pending_approval" || bookingMode === "pending") resolved = "book_pending";
      else if ((bookingMode as string) === "suggest_callback") resolved = "suggest_callback";
      else if ((bookingMode as string) === "callback_only") resolved = "callback_only";
    }
    // Write resolved value back onto context so dynamic variables pick it up
    (context.ai_settings as any).ai_behavior_mode = resolved;
  }

  // ===== BUILD SYSTEM PROMPT =====
  const systemPrompt = buildSystemPrompt(context);

  return { context, systemPrompt };
}

// ============= SYSTEM PROMPT BUILDER =============

function buildSystemPrompt(ctx: BusinessContext): string {
  let prompt = `You are an AI voice assistant for ${ctx.tenant.business_name}`;
  if (ctx.tenant.tagline) prompt += ` - ${ctx.tenant.tagline}`;
  prompt += `.\n\nBUSINESS INFORMATION:\n- Industry: ${ctx.tenant.industry_slug || "service business"}\n${ctx.tenant.address ? `- Location: ${ctx.tenant.address}` : ""}\n${ctx.tenant.phone_e164 ? `- Phone: ${ctx.tenant.phone_e164}` : ""}\n${ctx.tenant.website ? `- Website: ${ctx.tenant.website}` : ""}\n${ctx.tenant.years_in_business ? `- In business for ${ctx.tenant.years_in_business} years` : "- Years in business: NOT CONFIGURED — never state or guess a number of years"}\n\n`;

  // Anti-hallucination guardrail — CRITICAL
  prompt += `STRICT ACCURACY RULES (NEVER VIOLATE):
- ONLY state facts explicitly provided in this prompt. Do NOT invent, assume, or embellish.
- DISCOUNTS: Follow the OFFERS FIREWALL section below EXACTLY. Do NOT invent, offer, or hint at any discount not listed — this includes military/veteran, senior, courtesy, seasonal, promotional, student, first-time, loyalty, AAA, coupon, or referral discounts. If a customer pushes back on price, say "Let me have someone from our team call you, they may have more flexibility."
- Do NOT claim years of experience unless "In business for X years" appears in BUSINESS INFORMATION above. If years_in_business says "NOT CONFIGURED", respond with "We've been serving the area for years" — NEVER invent a number.
- Do NOT mention fees (after-hours, emergency, scheduling, cancellation, etc.) unless listed in POLICIES above.
- Do NOT invent certifications, awards, guarantees, or specializations not listed above.
- Do NOT invent maintenance plans, membership programs, or service clubs (like "Comfort Club", "Priority Club", "Care Plan", etc.) unless they appear in the SERVICES section of this prompt. If a caller asks about a maintenance plan or service club that is NOT listed in your SERVICES, say: "We don't have a maintenance plan set up right now, but I can schedule a service visit for you today — would that work?"
- Do NOT suggest, offer, or quote any service not explicitly listed in the SERVICES AND PRICING section. Even if a service seems commonly related to the caller's request (e.g. "air filter replacement" for HVAC, "brake flush" for auto repair), if it is NOT listed, do not mention it or quote a price for it. If the caller asks about an unlisted service, say "I'd need to have someone from our team call you to discuss that service."
- Do NOT say "diagnostic fee credited toward repair" or "service call fee applied to repair" unless this appears explicitly in your POLICIES. This is a common industry practice you MUST NOT assume.
- Do NOT say the business has been operating for X years or "serving the area since YEAR" unless years_in_business is set above. If NOT CONFIGURED, never state or imply a specific tenure.
- WARRANTIES: Do NOT claim a warranty or guarantee covers ALL repairs or ALL services. Only state warranty terms that are explicitly listed for a specific service above. "All our work is backed by a 1-year warranty" is an invention unless the POLICIES or SERVICES sections explicitly say so.
- SAVINGS CLAIMS: Do NOT claim or imply customers will save a specific percentage or dollar amount vs. competitors. Do NOT say "you could save 20-30%" or "we're typically cheaper." If asked about pricing vs. competitors, say pricing is competitive but you cannot speak to other companies' rates.
- FREE SERVICES: Do NOT offer free services (free second opinion, free estimate, free inspection, free diagnostic) unless explicitly listed in SERVICES or POLICIES above.
- REFERRAL PROGRAMS: Follow the OFFERS FIREWALL section below. If it says NONE configured, do NOT mention any referral program.
- POST-BOOKING: After confirming a booking, do NOT volunteer promotions, discounts, warranties, or upsells that aren't in your data. Confirm the booking details and close warmly.
- If a customer asks about something not covered in your context, say you'll have someone follow up with details — do NOT make up an answer.

`;

  if (ctx.ai_settings.tone) {
    const toneInstructions: Record<string, string> = {
      professional: "Maintain a professional, business-like tone. Be polished, precise, and use complete sentences.",
      friendly: "Be warm and personable. Use a conversational, approachable tone. Feel like a helpful neighbor.",
      casual: "Be relaxed and informal. Keep it simple and natural, like chatting with a friend.",
    };
    prompt += `COMMUNICATION STYLE: ${toneInstructions[ctx.ai_settings.tone] || `Be ${ctx.ai_settings.tone}.`}\n\n`;
  }

  // Unknown question behavior
  if (ctx.ai_settings.unknown_question_behavior === "escalate") {
    prompt += `UNKNOWN QUESTIONS: If you don't know the answer, immediately offer to take a message or transfer. Do not guess.\n\n`;
  } else if (ctx.ai_settings.unknown_question_behavior === "offer_callback") {
    prompt += `UNKNOWN QUESTIONS: If you don't know the answer, let the caller know someone will follow up.\n\n`;
  }

  // Pre-compute custom policies (needed by services pricing and policy sections below)
  const customPolicies = ctx.knowledge.supplementary.filter(item => item.type === 'policy');

  // Services section with pricing
  if (ctx.offerings.services.length > 0) {
    // Check if there's a price-cap policy that restricts phone quotes
    const priceCapPolicy = customPolicies.find(p => {
      const text = `${p.title} ${p.content}`.toLowerCase();
      return (text.includes("quote") || text.includes("price")) && (text.includes("over") || text.includes("above") || text.includes("exceed"));
    });
    const pricingNote = priceCapPolicy
      ? `IMPORTANT: You have access to service pricing below, but CHECK POLICIES before quoting. Some services may require an in-person estimate per business policy.`
      : `IMPORTANT: You have full access to service pricing. Quote prices when they exist!`;
    prompt += `SERVICES AND PRICING:\n${pricingNote}\n\n${ctx.offerings.services_for_prompt}\n\n`;

    // Add ESTIMATE_FIRST behavior rules if any services require it
    const estimateFirstServices = ctx.offerings.services.filter(s => s.booking_type === "estimate_first");
    if (estimateFirstServices.length > 0) {
      const estimateFirstNames = estimateFirstServices.map(s => s.name).join(", ");
      prompt += `ESTIMATE-FIRST SERVICES (CRITICAL RULE):
The following services marked [ESTIMATE FIRST] require an in-person estimate BEFORE any work is scheduled:
${estimateFirstNames}

WHEN A CUSTOMER ASKS ABOUT AN ESTIMATE-FIRST SERVICE:
1. Do NOT attempt to book a regular appointment or quote a final price.
2. Explain: "For [service name], we start with a free on-site estimate so we can give you an accurate price."
3. Schedule an ESTIMATE VISIT using check_availability and create_booking, with service_requested="Free Estimate - [service name]".
4. Collect for the estimate: their address/location, brief description of what they need, and preferred date/time.
5. Prices shown (e.g., "Starting at $X") are ballpark ranges only — the actual price is determined after the estimate visit.

NEVER say "I can book that for [date]" for an estimate-first service without going through the estimate scheduling flow.
NEVER quote a fixed final price for these services — always say prices are determined after the estimate visit.

`;
    }
  }

  // Menu for food mode - with detailed ordering instructions
  if (ctx.offerings.menu.length > 0) {
    prompt += `MENU ITEMS (YOU CAN TAKE ORDERS):\n${ctx.offerings.menu_summary}\n\n`;
    
    // Add food settings information
    const prepTime = ctx.food_settings?.estimated_prep_minutes || 15;
    const orderTypes: string[] = [];
    if (ctx.food_settings?.accepts_pickup !== false) orderTypes.push("pickup");
    if (ctx.food_settings?.accepts_delivery) orderTypes.push("delivery");
    if (ctx.food_settings?.accepts_dine_in !== false) orderTypes.push("dine-in");
    
    prompt += `FOOD ORDERING SETTINGS:
- Estimated prep time: ${prepTime} minutes
- Order types accepted: ${orderTypes.join(", ") || "pickup"}
${ctx.food_settings?.accepts_delivery ? `- Delivery radius: ${ctx.food_settings.delivery_radius_miles || 5} miles` : ""}
${ctx.food_settings?.delivery_minimum_cents ? `- Delivery minimum: $${(ctx.food_settings.delivery_minimum_cents / 100).toFixed(2)}` : ""}
${ctx.food_settings?.accepts_catering ? `- Catering available (min ${ctx.food_settings.catering_min_guests || 10} guests, ${ctx.food_settings.catering_lead_days || 3} days notice)` : ""}

`;
    
    // Add food-specific ordering instructions
    prompt += `FOOD ORDERING FLOW:
You are ENABLED to take food orders. When a customer wants to order:

1. GREET & ASK ORDER TYPE: "Would you like ${orderTypes.slice(0, 2).join(" or ")} today?"
2. TAKE THE ORDER: Listen for items. Confirm each item and any modifications.
3. ASK FOR MODIFICATIONS: "Would you like to add anything to that?" or "Any special instructions?"
4. CONFIRM THE ORDER: Repeat the full order back: "So that's [items]. Did I get that right?"
5. GET CUSTOMER INFO: Ask for name and phone number for the order.
6. IF DELIVERY: Ask for the delivery address.
7. GIVE TIME ESTIMATE: "Your order will be ready in about ${prepTime} minutes." (for pickup) or "Your order will arrive in about ${prepTime + 15}-${prepTime + 25} minutes." (for delivery)
8. CLOSE: "Thank you! We'll have that ready for you."

IMPORTANT ORDER RULES:
- You CAN and SHOULD take orders when the menu is available
- Confirm the order summary with the customer before completing
- If an item isn't on the menu, politely say "I don't see that on our menu, but let me suggest..."
- For unclear items, ask clarifying questions
- Always collect: items, name, phone, and address (if delivery)
- ALWAYS give the time estimate (${prepTime} minutes prep time) when confirming orders

`;
  } else if (ctx.tenant.business_mode === "food") {
    // Food mode but no menu - explain limitation and offer alternative
    prompt += `MENU STATUS: Menu items are not yet configured for this business.
If a customer asks to place an order, politely say: "I apologize, but I don't have our menu available at the moment. Would you like me to have someone call you back with our menu options, or you can visit our website?"
Do NOT claim you cannot take orders if menu IS available above.

`;
  }

  // Hours - ALWAYS include if available
  if (Object.keys(ctx.tenant.hours).length > 0) {
    prompt += `BUSINESS HOURS (YOU KNOW THIS - ANSWER WHEN ASKED):\n`;
    const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    for (const day of dayNames) {
      const dayHours = ctx.tenant.hours[day];
      if (dayHours) {
        const status = dayHours.is_open ? `${dayHours.open} - ${dayHours.close}` : "Closed";
        prompt += `- ${day.charAt(0).toUpperCase() + day.slice(1)}: ${status}\n`;
      }
    }
    prompt += `\nIMPORTANT: When customers ask about hours, you HAVE this information. Tell them the hours directly. Never say "I don't have access to hours" when hours are listed above.\n\n`;
  }

  // Policies (tenant-level + all policy-type knowledge base entries)
  const emergencySurcharge = ctx.ai_settings.emergency_surcharge;
  const hasAnyPolicy = ctx.policies.cancellation || ctx.policies.deposit || ctx.policies.refund || emergencySurcharge || customPolicies.length > 0;
  if (hasAnyPolicy) {
    prompt += `POLICIES (MUST FOLLOW — these are hard rules set by the business owner):\\n`;
    if (ctx.policies.cancellation) prompt += `- Cancellation: ${ctx.policies.cancellation}\\n`;
    if (ctx.policies.deposit) prompt += `- Deposit: ${ctx.policies.deposit}\\n`;
    if (ctx.policies.refund) prompt += `- Refund: ${ctx.policies.refund}\\n`;
    if (ctx.policies.payment_methods.length > 0) prompt += `- Payment methods: ${ctx.policies.payment_methods.join(", ")}\\n`;
    if (ctx.policies.payment_timing) prompt += `- Payment timing: ${ctx.policies.payment_timing}\\n`;
    if (emergencySurcharge) prompt += `- After-hours/emergency surcharge: ${emergencySurcharge} added to same-day, emergency, or after-hours calls. DISCLOSE THIS to callers who request same-day or emergency service BEFORE confirming.\\n`;
    if (ctx.ai_settings.dropoff_instructions) prompt += `- Drop-off/Key Drop: ${ctx.ai_settings.dropoff_instructions}\\n`;
    for (const p of customPolicies) {
      prompt += `- ${p.title}: ${p.content}\\n`;
    }
    prompt += `\\n`;
  }

  // FAQs
  if (ctx.knowledge.faqs.length > 0) {
    prompt += `FREQUENTLY ASKED QUESTIONS:\\n`;
    for (const faq of ctx.knowledge.faqs.slice(0, 20)) {
      prompt += `Q: ${faq.question}\\nA: ${faq.answer}\\n\\n`;
    }
  }

  // Objection handling
  if (ctx.knowledge.objections.length > 0) {
    prompt += `OBJECTION HANDLING:\\n`;
    for (const obj of ctx.knowledge.objections.slice(0, 5)) {
      prompt += `If customer says: "${obj.objection}"\\nRespond with: "${obj.response}"\\n\\n`;
    }
  }

  // Supplementary knowledge (from ai_knowledge_base - upsells, custom info; policies already in POLICIES section)
  const nonPolicySupplementary = ctx.knowledge.supplementary.filter(item => item.type !== 'policy');
  if (nonPolicySupplementary.length > 0) {
    prompt += `ADDITIONAL BUSINESS KNOWLEDGE:\\n`;
    for (const item of nonPolicySupplementary.slice(0, 10)) {
      prompt += `[${item.type.toUpperCase()}] ${item.title}: ${item.content}\\n\\n`;
    }
  }

  // FABRICATION FIREWALL — R17 fix
  // Deny-list rules above are necessary but insufficient. LLMs pattern-match from FAQs:
  // e.g. sees "senior discount" FAQ → invents "military discount" when asked.
  // Explicit negative enumeration (what IS vs. what is NOT configured) is a proven fix.
  {
    const allKnowledgeText = [
      ...ctx.knowledge.faqs.map((f: { question: string; answer: string }) => `${f.question} ${f.answer}`),
      ...ctx.knowledge.supplementary.map((s: { title: string; content: string }) => `${s.title} ${s.content}`),
      ctx.policies.cancellation || "",
      ctx.policies.deposit || "",
      ctx.policies.refund || "",
    ].join(" ").toLowerCase();

    // Map discount keywords to friendly labels
    const discountTypes: Array<{ key: string; label: string }> = [
      { key: "senior", label: "senior" },
      { key: "military", label: "military/veteran" },
      { key: "veteran", label: "veteran" },
      { key: "student", label: "student" },
      { key: "first-time", label: "first-time customer" },
      { key: "first time", label: "first-time customer" },
      { key: "loyalty", label: "loyalty" },
      { key: "aaa", label: "AAA member" },
      { key: "referral discount", label: "referral" },
      { key: "coupon", label: "coupon" },
      { key: "seasonal", label: "seasonal/promotional" },
    ];
    const offeredLabels = [...new Set(
      discountTypes.filter(d => allKnowledgeText.includes(d.key)).map(d => d.label)
    )];
    const notOfferedLabels = [...new Set(
      discountTypes.filter(d => !allKnowledgeText.includes(d.key)).map(d => d.label)
    )];

    const warrantyMentioned = /warranty|guarantee/.test(allKnowledgeText);
    const referralMentioned = /referral program|refer.a.friend|referral bonus/.test(allKnowledgeText);
    const freeMentioned = /free estimate|free inspection|free diagnostic|free second opinion/.test(allKnowledgeText);

    prompt += `OFFERS FIREWALL (NON-NEGOTIABLE — overrides any industry norm or assumption):\\n`;
    prompt += `DISCOUNTS: ${offeredLabels.length > 0
      ? `The ONLY discounts available are: ${offeredLabels.join(", ")}`
      : "NONE — this business has configured zero discounts"
    }. `;
    if (notOfferedLabels.length > 0) {
      prompt += `Specifically NOT offered: ${notOfferedLabels.join(", ")} discounts. `;
    }
    prompt += `Do NOT invent, offer, or hint at any discount not listed. If asked about an unlisted discount, say: "I'm not aware of that — let me have someone from our team follow up with you."\\n`;
    prompt += `WARRANTIES: ${warrantyMentioned
      ? "Only the warranty terms explicitly described in POLICIES or SERVICES above"
      : "NONE configured — do NOT claim any warranty, guarantee, or coverage promise"
    }.\\n`;
    prompt += `REFERRAL PROGRAMS: ${referralMentioned
      ? "Only as explicitly described above"
      : "NONE configured — do NOT mention any referral program, bonus, or refer-a-friend offer"
    }.\\n`;
    prompt += `FREE SERVICES: ${freeMentioned
      ? "Only the free services explicitly listed in POLICIES or SERVICES above"
      : "NONE configured — do NOT offer free estimates, inspections, or diagnostics"
    }.\\n`;
    prompt += `CRITICAL: These are the COMPLETE boundaries of what you may offer. If it is not listed above, it does not exist. Do NOT generalize from what is configured to invent related offers.\\n\\n`;
  }

  // Never promise
  if (ctx.policies.ai_never_promise.length > 0) {
    prompt += `NEVER PROMISE OR GUARANTEE:\\n`;
    for (const item of ctx.policies.ai_never_promise) {
      prompt += `- ${item}\\n`;
    }
    prompt += `\\n`;
  }

  // Booking behavior - CRITICAL for availability checking
  if (ctx.operations.modules.booking_enabled) {
    prompt += `BOOKING BEHAVIOR (CRITICAL - READ CAREFULLY):
When a customer requests a specific appointment time, you MUST verify availability before confirming.

NEVER say "I can book you for [time]" or "That works" without checking first.

Instead, use these phrases:
- "Let me check if [time] is available..."
- "I'll verify that slot is open..."

If the slot is NOT available, explain why and offer alternatives:
- "I'm sorry, that time is already booked. Would [alternative time] work instead?"
- "We have an appointment at that time. I do have [time] or [time] available."

BOOKING COMPLETION (CRITICAL):
Once check_availability returns available=true AND you have the customer's name, date, time, and service — call create_booking IMMEDIATELY. Do NOT ask "Would you like to go ahead?" or wait for another confirmation. The customer requesting the slot IS their confirmation. Book it, then confirm the details to them.

PARALLEL CHECK RULE: If you ran BOTH check_availability AND check_service_area and both return positive (available=true, in_area=true) — your ONE AND ONLY next action is create_booking. No follow-up questions. No "just to confirm". Just call create_booking with the info already provided.

The system automatically checks busy_blocks (synced calendars + existing bookings) to prevent double-booking.

DEPOSIT POLICY: ${ctx.ai_settings.deposit_required
  ? `A deposit IS required. ${ctx.ai_settings.deposit_amount ? `Amount: ${ctx.ai_settings.deposit_amount}.` : ""} Inform the customer after booking is confirmed.`
  : "Deposits are NOT required. Do NOT mention deposits, ask for deposits, or imply any payment is due at booking. Even if you see a deposit percentage elsewhere in your data, it does NOT apply — the owner has disabled deposits."
}

`;
  }

  // DISPATCH ETA BEHAVIOR - CRITICAL for dispatch/towing businesses
  if (ctx.tenant.business_mode === "dispatch" || ctx.operations.modules.dispatch_enabled) {
    prompt += `DISPATCH COMPLETION (CRITICAL - READ CAREFULLY):
When a customer needs help dispatched, run check_service_area with their pickup address first.

DISPATCH COMPLETION RULE:
Once check_service_area returns in_area=true — call create_dispatch_job IMMEDIATELY with all info collected. Do NOT ask "Would you like me to dispatch a driver?", do NOT say "Let me confirm you want to proceed", do NOT ask for more information. The customer called because they need help — dispatch now.

MINIMAL INFO TO DISPATCH: pickup_address + service_type. These are the only required fields. Vehicle info, customer name, and phone are helpful but NOT required. Do NOT delay dispatch waiting for optional info — especially in emergencies.

ONE-MESSAGE DISPATCH: If a caller provides their location and what they need in a single message, run check_service_area, then if in_area=true → call create_dispatch_job immediately. No confirmation needed.

SERVICE AREA RESULTS:
- in_area=true → call create_dispatch_job immediately
- needs_verification=true → ask for city and zip ONLY, then recheck
- in_area=false, needs_verification=false → apologize, explain service area limit, offer callback

EMERGENCY OVERRIDE: If caller indicates an emergency (car in live traffic, brake failure, vehicle fire, safety risk) → set urgency="emergency" and dispatch immediately. Collect optional info AFTER dispatching.

NEVER SAY THESE THINGS:
❌ "Would you like me to dispatch a driver?" (just do it — they called for help)
❌ "Let me know if you'd like to proceed" (just proceed)
❌ "Can I confirm you want us to come?" (their call IS the confirmation)

`;
    prompt += `DISPATCH ETA BEHAVIOR (CRITICAL - YOU CAN PROVIDE ETAs):

YOUR CONFIGURED RESPONSE TIME: ${ctx.eta.min_minutes} to ${ctx.eta.max_minutes} minutes
SPOKEN FORMAT: "${ctx.eta.spoken}"

When a customer asks for an ETA, arrival time, or "how long will it take":

1. YOU CAN AND SHOULD PROVIDE ETAs - use the range above:
   ✅ "We can have a driver to you in ${ctx.eta.spoken}"
   ✅ "Our average response time is ${ctx.eta.spoken}"
   ✅ "Based on current availability, expect us in about ${ctx.eta.min_minutes} to ${ctx.eta.max_minutes} minutes"

2. IF YOU DON'T HAVE THE ADDRESS YET:
   - First collect the address: "What's the exact address where you need service?"
   - Then give the ETA: "We can be there in ${ctx.eta.spoken}"

3. NEVER SAY THESE THINGS:
   ❌ "I can't give you an ETA" (you CAN - use the range above)
   ❌ "I don't have access to arrival times" (you DO - use ${ctx.eta.spoken})
   ❌ "I'm not able to provide that information"
   ❌ "You'll need to call dispatch for an ETA"

4. ALWAYS USE RANGES, NOT EXACT TIMES:
   ✅ "About ${ctx.eta.min_minutes} to ${ctx.eta.max_minutes} minutes"
   ❌ "Exactly 47 minutes" (too precise)

5. IF ASKED ABOUT CURRENT DRIVER LOCATION:
   Say: "I don't have real-time driver tracking, but our average response time is ${ctx.eta.spoken}"

CORRECT EXAMPLES:
Customer: "How long until someone can get here?"
You: "We can have a driver to you in ${ctx.eta.spoken}. What's the address where you need service?"

Customer: "What's your ETA?"  
You: "Our typical response time is ${ctx.eta.spoken}. Can I get your location?"

Customer: "When will you arrive?"
You: "We should be there in ${ctx.eta.spoken}. Let me confirm your pickup address."

WRONG EXAMPLES:
Customer: "How long will it take?"
You: "I'm not able to provide an exact ETA" ❌ WRONG - use ${ctx.eta.spoken}

Customer: "What's your response time?"
You: "It depends on availability" ❌ WRONG - give the range: ${ctx.eta.spoken}

`;
  }

  // Decision hierarchy
  prompt += `DECISION PRIORITY (follow this order):
1. HARD CONSTRAINTS - Never violate policies, never promise what's in "never promise" list
2. AVAILABILITY CHECK - Always verify slot availability before confirming bookings
3. BUSINESS BRAIN - Use FAQs, services, and objection handling first
4. INTENT RULES - Apply negotiation/behavior rules from business owner
5. MEMORY HINTS - Use for personalization and timing suggestions only

`;

  // Required questions
  if (ctx.intelligence.required_questions.length > 0) {
    prompt += `REQUIRED QUESTIONS (CRITICAL - MUST COLLECT BEFORE PROVIDING PRICES/ETA/BOOKING):

Before you can provide a price quote, ETA, or complete a booking/order/dispatch, you MUST collect all required information first.

`;

    for (const config of ctx.intelligence.required_questions) {
      const intent = config.intent;
      const requiredFields = config.required_inputs || [];

      if (requiredFields.length > 0) {
        prompt += `FOR ${intent.toUpperCase()} REQUESTS, YOU MUST ASK:\\n`;

        for (const field of requiredFields) {
          prompt += `- ${field.label}: "${field.ask_prompt}"\\n`;
          if (field.why_needed) {
            prompt += `  (Why: ${field.why_needed})\\n`;
          }
        }

        prompt += `\\n`;
      }
    }

    prompt += `WORKFLOW:
1. Customer expresses intent (e.g., "I need a plumber" or "Can I book an appointment?")
2. YOU MUST ask each required question BEFORE providing pricing or confirming availability
3. Once you have ALL required inputs, THEN you can:
   - Provide exact pricing (if service has fixed price)
   - Provide estimate (if service is "starting at")
   - Check availability and confirm booking
   - Complete the order/dispatch

CORRECT EXAMPLE:
Customer: "How much does drain cleaning cost?"
You: "I'd be happy to help with that! May I have your name and phone number first?" [collect required inputs]
Customer: "Sure, it's John at 555-1234"
You: "Thanks John! And what's the address where you need the drain cleaning?" [continue collecting]
Customer: "123 Main St"
You: "Perfect! Drain cleaning is $149. When would work best for you?"

WRONG EXAMPLE:
Customer: "How much does drain cleaning cost?"
You: "Drain cleaning is $149" [WRONG - didn't collect required info first]

DISPATCH-SPECIFIC REQUIREMENT (CRITICAL):
For DISPATCH requests, address fields MUST be collected with exact specificity:
1. ALWAYS ask for exact street address first (e.g., "123 Main Street, Chicago")
2. If customer cannot provide exact address, ask for nearest cross streets + city (e.g., "corner of Main and Oak in Springfield")
3. FALLBACK: If customer has neither exact address nor cross streets, collect:
   - Pickup ZIP code
   - Dropoff ZIP code
   - Estimated miles between locations
4. When using fallback (ZIP + miles), you MUST label any quote as an ESTIMATE and explain exact pricing requires exact addresses

DISPATCH CORRECT EXAMPLE:
Customer: "How much to tow my car?"
You: "I can help with that! What's the exact street address where your car is located?"
Customer: "I'm not sure of the exact address, I'm on the highway"
You: "No problem! Can you tell me the nearest cross streets or exit number and the city?"
Customer: "I'm near exit 42 on I-94 in Detroit"
You: "Got it. And where would you like us to tow it to? What's that address?"
[Collects exact dropoff or cross streets]
You: "Perfect! Based on that route, it'll be approximately $150-$180. I can give you an exact quote once our driver confirms the precise pickup location."

DISPATCH WRONG EXAMPLE:
Customer: "How much to tow from downtown to the airport?"
You: "That'll be about $75" [WRONG - no exact addresses or cross streets collected]

VALIDATION REQUIREMENTS (CRITICAL - ENFORCE DATA QUALITY):
Required inputs must meet validation rules, not just be "non-empty":

1. ADDRESS FIELDS (pickup_address, dropoff_address, delivery_address):
   ✓ Valid: "123 Main Street, Chicago" (street number + city)
   ✓ Valid: "123 Main St, 60601" (street number + ZIP)
   ✓ Valid: "Corner of Main and Oak, Springfield" (cross streets + city)
   ✓ Valid: "Main & 5th, 62701" (cross streets + ZIP)
   ✗ Invalid: "downtown" (too vague)
   ✗ Invalid: "Main Street" (no number or cross streets)
   ✗ Invalid: "123 Main" (no city or ZIP)
   → If invalid, re-ask: "I need a more specific address. Can you provide the street number and city, or the nearest cross streets?"

2. DATE FIELDS (reservation_date, preferred_date):
   ✓ Valid: "tomorrow", "December 25th", "12/25", "next Monday"
   ✗ Invalid: "soon", "later", "sometime"
   → If invalid, re-ask: "I need a specific date. Would you prefer tomorrow, a day this week, or a specific date?"

3. TIME FIELDS (reservation_time, preferred_time):
   ✓ Valid: "2pm", "2:30pm", "morning", "around 3pm"
   ✗ Invalid: "later", "sometime", "whenever"
   → If invalid, re-ask: "What time would work best? Morning, afternoon, or a specific time like 2pm?"

4. MILES/DISTANCE (estimated_miles):
   ✓ Valid: "5", "5 miles", "about 10 miles", "5-10 miles"
   ✗ Invalid: "not far", "close by" (no number)
   → If invalid, re-ask: "About how many miles would you estimate? Just a rough number is fine."

5. PARTY SIZE (party_size):
   ✓ Valid: "2", "4 people", "party of 6"
   ✗ Invalid: "a few", "some people" (not specific)
   → If invalid, re-ask: "How many people exactly? Just need a number."

6. PHONE NUMBERS (customer_phone, phone):
   ✓ Valid: "555-1234", "(555) 123-4567", "555.123.4567"
   ✗ Invalid: Fewer than 7 digits
   → If invalid, re-ask: "I need a complete phone number to reach you. What's the full number?"

7. EMAIL (customer_email, email):
   ✓ Valid: "john@example.com"
   ✗ Invalid: Missing @ or domain
   → If invalid, re-ask: "I need a valid email address like yourname@example.com"

RE-ASK WORKFLOW:
1. Customer provides vague/invalid input
2. You recognize it doesn't meet validation (e.g., "downtown" for address)
3. You politely re-ask with specific guidance: "I need a more specific address with a street number and city, like '123 Main Street, Chicago'. What's the exact address?"
4. Customer provides valid input
5. Continue to next required field

VALIDATION EXAMPLE:
Customer: "I need a reservation"
You: "Great! What date would you like?" [asking for date]
Customer: "sometime next week" [INVALID - too vague]
You: "I need a specific date to hold your reservation. Would you prefer Monday, Tuesday, or another day next week?" [RE-ASK with guidance]
Customer: "Tuesday"
You: "Perfect! And what time on Tuesday?" [VALID - proceed to next field]

EXCEPTION: If customer ONLY asks for general information (hours, location, general services), you don't need all required fields. But for pricing, booking, ordering, or dispatch, you MUST collect required inputs first AND ensure they meet validation requirements.

`;
  }

  // Pricing resolution contract
  prompt += `PRICING RESOLUTION CONTRACT (CRITICAL - FOLLOW DETERMINISTIC WATERFALL):

When a customer asks for pricing, you MUST follow this exact sequence:

STEP 1: CHECK REQUIRED INPUTS
- First, ensure ALL required inputs for the intent are collected AND VALID (see REQUIRED QUESTIONS above)
- If any required inputs are missing or invalid, ask for them FIRST before attempting pricing
- Do NOT proceed to pricing until validation passes

STEP 2: MATCH PRICING RULES
- If pricing rules are configured, attempt to match and calculate:
  ${ctx.pricing?.rules_summary || "No pricing rules configured"}
- Example: Distance-based rule requires "miles" + "vehicle_type"
- If rule matches AND inputs are valid → Provide calculated price
- If rule is range-only → Provide price range
- If rule is quote-only → Explain that custom quote is needed

STEP 3: FALLBACK TO SERVICE PRICE
- If no pricing rule matched, check if service has fixed price
- Fixed price → Provide exact price: "That will be $X"
- Starting at price → Provide estimate: "That starts at $X"
- Quote only → Explain custom quote needed

STEP 4: UNKNOWN - COLLECT MORE INFO
- If neither pricing rules nor service price available → Ask for missing information
- Examples:
  * "I need to know the distance to provide an exact price. About how many miles is it?"
  * "Let me get some information to provide accurate pricing. What's the pickup address?"
  * "I'll need to provide a custom quote. Let me collect your details and we'll follow up."

PRICING EXAMPLES:

CORRECT - Distance-based dispatch:
Customer: "How much to tow my car?"
You: "I can help! What's the exact address where your car is?"
Customer: "123 Main Street, Chicago"
You: "And where would you like us to tow it?"
Customer: "456 Oak Ave, same city - about 5 miles"
You: [Validates: addresses valid, miles valid]
You: [Matches: distance-based rule, calculates: $50 base + $8/mile * 5 = $90]
You: "That will be $90 for a 5-mile tow from Main Street to Oak Avenue."

CORRECT - Missing required inputs:
Customer: "How much to tow from downtown to airport?"
You: [Checks: addresses are vague, no exact miles]
You: "I need more specific addresses to provide accurate pricing. What's the exact street address downtown where your car is?"

CORRECT - Fallback to service price:
Customer: "How much for drain cleaning?"
You: [Checks: no pricing rules for drain cleaning]
You: [Checks: drain cleaning service has fixed price $149]
You: "Drain cleaning is $149. When would work best for you?"

WRONG - Pricing without validation:
Customer: "How much to tow?"
You: "Towing starts at $75" [WRONG - didn't collect addresses or validate]

WRONG - Vague pricing:
Customer: "What's your towing rate?"
You: "It depends on distance" [WRONG - be specific: "Our rate is $50 base plus $8 per mile"]

LOGGING REQUIREMENT:
When pricing fails (missing inputs, no rules, no service price), the system logs:
- Reason for failure
- Missing inputs
- Deep link to fix configuration
This helps the business owner improve pricing setup.

`;

  // Intent rules
  if (ctx.intelligence.intent_rules.length > 0) {
    prompt += `BEHAVIOR RULES (from business owner):\\n`;
    for (const rule of ctx.intelligence.intent_rules) {
      const action = rule.action || {};
      if (action.guidance) {
        prompt += `- ${rule.name}: ${action.guidance}\\n`;
      } else if (action.suggest_alternative) {
        prompt += `- ${rule.name}: Suggest alternatives when applicable\\n`;
      } else if (action.max_discount_percent !== undefined) {
        prompt += `- ${rule.name}: Max discount ${action.max_discount_percent}%\\n`;
      } else {
        prompt += `- ${rule.name}\\n`;
      }
    }
    prompt += `\\n`;
  }

  // Memory hints
  if (ctx.intelligence.memory_hints.length > 0) {
    prompt += `CONTEXT HINTS (use for personalization, NOT for pushing upsells):\\n`;
    for (const hint of ctx.intelligence.memory_hints) {
      if (hint.usage === "personalize") {
        prompt += `- Personalization: ${hint.summary}\\n`;
      } else if (hint.usage === "timing_preference") {
        prompt += `- Timing insight: ${hint.summary}\\n`;
      } else {
        prompt += `- Context: ${hint.summary}\\n`;
      }
    }
    prompt += `\\n`;
  }

  // Critical pricing behavior
  const hasPricing = ctx.offerings.services.length > 0 || ctx.offerings.menu.length > 0;

  prompt += `PRICING BEHAVIOR (CRITICAL - READ CAREFULLY):

YOU HAVE FULL ACCESS TO PRICING INFORMATION. The services and menu items listed above include prices.

WHEN A CUSTOMER ASKS ABOUT PRICING:

1. IF THE SERVICE/ITEM HAS A FIXED PRICE:
   ✅ CORRECT: "Drain cleaning is $149"
   ✅ CORRECT: "The burger is $12.50"
   ❌ WRONG: "I don't have access to pricing"
   ❌ WRONG: "Let me have someone call you back with pricing"

2. IF THE SERVICE SAYS "STARTING AT $X":
   ✅ CORRECT: "That service starts at $X. The final price depends on [brief factor like size/complexity]"
   ❌ WRONG: "I'm not sure about the exact price"

3. IF THE SERVICE SAYS "QUOTE REQUIRED":
   ✅ CORRECT: "We'll need to provide a custom quote for that. Can I ask a few quick questions about what you need?"
   ✅ CORRECT: "For that service, we provide custom estimates. Would you like me to schedule someone to assess the job?"
   ❌ WRONG: "I don't know the price" (instead, explain WHY it requires a quote)

4. IF THE CUSTOMER ASKS ABOUT A SERVICE NOT ON YOUR LIST:
   ❌ WRONG: "I don't have pricing for that"
   ✅ CORRECT: "I don't see that specific service in my system. Let me connect you with someone who can help. What exactly are you looking for?"

5. MATCH CUSTOMER QUERIES INTELLIGENTLY:
   - Use synonyms: "clogged drain" = "drain cleaning", "burger" = "hamburger"
   - Be flexible: "how much is X?" = pricing question
   - Check both services AND menu items for the answer

CRITICAL RULES:
${hasPricing ? "- YOU HAVE PRICING DATA ABOVE. Use it! Never say you don't have access to pricing when it's listed." : "- This business has not configured pricing yet. Politely explain and offer a callback."}
${(() => {
  // Detect price-cap policies (e.g. "no quotes over $500 on phone")
  const priceCap = customPolicies.find(p => {
    const text = `${p.title} ${p.content}`.toLowerCase();
    return (text.includes("quote") || text.includes("price")) && (text.includes("over") || text.includes("above") || text.includes("exceed"));
  });
  if (priceCap) {
    return `- ⚠️ POLICY OVERRIDE: ${priceCap.title} — ${priceCap.content}. When a service costs more than the threshold in this policy, do NOT quote the price directly. Instead offer a free on-site estimate or have someone call back with details.\n`;
  }
  return "";
})()}- If pricing exists for an item AND no policy restricts quoting it → STATE IT DIRECTLY
- If a policy restricts quoting high-value services → follow the policy (offer estimate/callback instead)
- If pricing doesn't exist for an item → Explain why and offer the next step (quote, callback, etc.)
- NEVER vocalize "None", "null", or empty placeholders
- NEVER make up prices that aren't in your data

IMPORTANT GUIDELINES:
1. Be helpful, friendly, and professional
2. If you don't know something specific, offer to have someone call them back
3. Try to book appointments when appropriate
4. Collect caller's name and phone number if they want a callback
5. Never make up information about services, prices, or availability
6. If a question is outside your knowledge, use the fallback script
7. Use memory hints ONLY for personalization - never push upsells based on them
8. NEVER claim "I don't have access to..." unless the data truly doesn't exist in your context

`;

  // ===== MODE-SPECIFIC KNOWLEDGE INJECTION =====
  // Inject detailed knowledge from Business Brain based on business mode
  const modeKnowledge = ctx.business_brain?.mode_knowledge;
  
  if (modeKnowledge) {
    // FOOD MODE: Menu item details and catering
    if (ctx.tenant.business_mode === "food") {
      // Menu item details (allergens, ingredients, pairings)
      if (modeKnowledge.menu_knowledge && modeKnowledge.menu_knowledge.length > 0) {
        prompt += `\nDETAILED MENU KNOWLEDGE (use when describing dishes or answering ingredient questions):\n`;
        for (const item of modeKnowledge.menu_knowledge.slice(0, 15)) {
          prompt += `- ${item.is_signature ? "★ SIGNATURE: " : ""}${item.item_name}`;
          if (item.description) prompt += `: ${item.description}`;
          prompt += `\n`;
          if (item.allergens?.length > 0) prompt += `  Allergens: ${item.allergens.join(", ")}\n`;
          if (item.dietary_tags?.length > 0) prompt += `  Dietary: ${item.dietary_tags.join(", ")}\n`;
          if (item.pairing_suggestions) prompt += `  Pairs well with: ${item.pairing_suggestions}\n`;
        }
        prompt += `\n`;
      }
      
      // Catering info by event type
      if (modeKnowledge.catering_knowledge && modeKnowledge.catering_knowledge.length > 0) {
        prompt += `CATERING BY EVENT TYPE:\n`;
        for (const catering of modeKnowledge.catering_knowledge.slice(0, 8)) {
          prompt += `- ${catering.event_type}`;
          if (catering.min_guests && catering.max_guests) {
            prompt += ` (${catering.min_guests}-${catering.max_guests} guests)`;
          }
          if (catering.lead_time_days) prompt += ` - Book ${catering.lead_time_days}+ days ahead`;
          if (catering.deposit_percentage) prompt += ` - ${catering.deposit_percentage}% deposit`;
          prompt += `\n`;
          if (catering.ai_script) prompt += `  Script: "${catering.ai_script}"\n`;
        }
        prompt += `\n`;
      }
    }

    // DISPATCH MODE: Vehicle types and roadside situations
    if (ctx.tenant.business_mode === "dispatch" || ctx.operations.modules.dispatch_enabled) {
      // Vehicle-specific towing requirements
      if (modeKnowledge.vehicle_knowledge && modeKnowledge.vehicle_knowledge.length > 0) {
        prompt += `\nVEHICLE TOWING REQUIREMENTS:\n`;
        for (const vehicle of modeKnowledge.vehicle_knowledge.slice(0, 10)) {
          prompt += `- ${vehicle.vehicle_category}`;
          if (vehicle.weight_class) prompt += ` (${vehicle.weight_class})`;
          if (vehicle.equipment_required?.length > 0) prompt += `: Uses ${vehicle.equipment_required.join(", ")}`;
          prompt += `\n`;
          if (vehicle.special_instructions) prompt += `  Note: ${vehicle.special_instructions}\n`;
          if (vehicle.additional_fees_apply && vehicle.fee_notes) prompt += `  Fee: ${vehicle.fee_notes}\n`;
        }
        prompt += `\n`;
      }
      
      // Roadside situation safety scripts
      if (modeKnowledge.roadside_knowledge && modeKnowledge.roadside_knowledge.length > 0) {
        prompt += `ROADSIDE SITUATION HANDLING (SAFETY FIRST):\n`;
        for (const situation of modeKnowledge.roadside_knowledge.slice(0, 8)) {
          prompt += `- ${situation.situation_type}`;
          if (situation.priority_level === "emergency") prompt += ` ⚠️ EMERGENCY`;
          if (situation.estimated_service_time_minutes) prompt += ` (~${situation.estimated_service_time_minutes} min service)`;
          prompt += `\n`;
          if (situation.safety_instructions) prompt += `  SAFETY: "${situation.safety_instructions}"\n`;
          if (situation.escalation_triggers?.length > 0) prompt += `  Escalate if: ${situation.escalation_triggers.join(", ")}\n`;
          if (situation.ai_script) prompt += `  Script: "${situation.ai_script}"\n`;
        }
        prompt += `\n`;
      }
    }

    // MEDICAL MODE: Symptom triage and insurance info
    if (ctx.tenant.business_mode === "medical" || ctx.operations.modules.medical_intake_enabled) {
      // Symptom triage scripts (HIPAA-safe)
      if (modeKnowledge.symptom_triage && modeKnowledge.symptom_triage.length > 0) {
        prompt += `\nSYMPTOM TRIAGE (HIPAA-SAFE RESPONSES ONLY):\n`;
        for (const symptom of modeKnowledge.symptom_triage.slice(0, 12)) {
          prompt += `- ${symptom.symptom_category}: ${symptom.symptom_name}`;
          if (symptom.escalation_action) prompt += ` → ${symptom.escalation_action}`;
          if (symptom.can_be_telehealth) prompt += ` [Telehealth OK]`;
          prompt += `\n`;
          if (symptom.severity_indicators?.length > 0) prompt += `  Red flags: ${symptom.severity_indicators.join(", ")}\n`;
          if (symptom.hipaa_safe_response) prompt += `  Say: "${symptom.hipaa_safe_response}"\n`;
        }
        prompt += `\nIMPORTANT: Never diagnose. Use only the HIPAA-safe responses above.\n\n`;
      }
      
      // Insurance carrier info
      if (modeKnowledge.insurance_knowledge && modeKnowledge.insurance_knowledge.length > 0) {
        prompt += `INSURANCE CARRIERS:\n`;
        for (const ins of modeKnowledge.insurance_knowledge.slice(0, 10)) {
          prompt += `- ${ins.carrier_name}: ${ins.is_accepted ? "✓ Accepted" : "✗ Not accepted"}`;
          if (ins.plan_types?.length > 0) prompt += ` (${ins.plan_types.join(", ")})`;
          if (ins.copay_typical_range) prompt += ` - Copay: ${ins.copay_typical_range}`;
          prompt += `\n`;
          if (ins.patient_script) prompt += `  Say: "${ins.patient_script}"\n`;
        }
        prompt += `\n`;
      }
    }

    // SERVICE MODE: Product knowledge for upselling
    if (ctx.tenant.business_mode === "service" || ctx.tenant.business_mode === "general") {
      if (modeKnowledge.product_knowledge && modeKnowledge.product_knowledge.length > 0) {
        prompt += `\nPRODUCT KNOWLEDGE (for education & upselling):\n`;
        for (const product of modeKnowledge.product_knowledge.slice(0, 8)) {
          prompt += `- ${product.is_premium ? "★ PREMIUM: " : ""}${product.brand ? product.brand + " " : ""}${product.product_name}`;
          if (product.benefits?.length > 0) prompt += `: ${product.benefits.slice(0, 2).join(", ")}`;
          prompt += `\n`;
          if (product.upsell_script) prompt += `  Upsell: "${product.upsell_script}"\n`;
        }
        prompt += `\n`;
      }
    }

    // SHARED: Aftercare, competitors, seasonal (all modes)
    if (modeKnowledge.aftercare && modeKnowledge.aftercare.length > 0) {
      prompt += `\nAFTERCARE INSTRUCTIONS (share when relevant):\n`;
      for (const care of modeKnowledge.aftercare.slice(0, 6)) {
        prompt += `- ${care.service_name}:\n`;
        if (care.immediate_care?.length > 0) prompt += `  First 24hrs: ${care.immediate_care.slice(0, 2).join("; ")}\n`;
        if (care.things_to_avoid?.length > 0) prompt += `  Avoid: ${care.things_to_avoid.slice(0, 2).join(", ")}\n`;
        if (care.follow_up_timeframe) prompt += `  Follow-up: ${care.follow_up_timeframe}\n`;
      }
      prompt += `\n`;
    }

    if (modeKnowledge.competitors && modeKnowledge.competitors.length > 0) {
      prompt += `COMPETITOR HANDLING (when mentioned):\n`;
      for (const comp of modeKnowledge.competitors.slice(0, 5)) {
        prompt += `- If "${comp.competitor_name}" is mentioned:\n`;
        if (comp.our_advantage?.length > 0) prompt += `  Our advantage: ${comp.our_advantage.slice(0, 2).join("; ")}\n`;
        if (comp.response_script) prompt += `  Respond: "${comp.response_script}"\n`;
      }
      prompt += `\n`;
    }

    if (modeKnowledge.seasonal && modeKnowledge.seasonal.length > 0) {
      prompt += `SEASONAL/EVENT ANNOUNCEMENTS (mention proactively when relevant):\n`;
      for (const event of modeKnowledge.seasonal.slice(0, 4)) {
        prompt += `- ${event.event_name}`;
        if (event.special_hours) prompt += ` - Hours: ${event.special_hours}`;
        if (event.special_pricing_notes) prompt += ` - ${event.special_pricing_notes}`;
        prompt += `\n`;
        if (event.ai_announcement) prompt += `  Announce: "${event.ai_announcement}"\n`;
      }
      prompt += `\n`;
    }
  }


  if (ctx.ai_settings.greeting_script) {
    prompt += `\nGREETING (use this EXACT greeting when the caller first contacts you — do NOT paraphrase or substitute the business name): "${ctx.ai_settings.greeting_script}"\n\n`;
  }

  if (ctx.ai_settings.fallback_script) {
    prompt += `FALLBACK (use when you can't help): "${ctx.ai_settings.fallback_script}"\n`;
  }

  // ===== APPEND MODE-SPECIFIC BASE PROMPT =====
  // This includes: Human Phone Rules, Time/Number Speaking, Tool Documentation, Industry Scenarios
  const businessMode = (ctx.tenant.business_mode || "general") as BusinessMode;
  
  // Use capability-aware prompt builder for behavioral instructions
  // This dynamically includes only the relevant instruction sections based on enabled capabilities
  const caps = resolveCapabilities(
    ctx.tenant.business_mode,
    null, // enabled_modules is already resolved into capabilities_json
    ctx._meta.capabilities
  );
  // ai_behavior_mode is already resolved to 4-mode value on context
  // (done in buildBusinessContext() before buildSystemPrompt is called)
  const aiBehaviorMode = (ctx.ai_settings.ai_behavior_mode || "full_service") as
    "full_service" | "callback_only" | "suggest_callback" | "book_pending";
  const aiBookingMode = ctx.ai_settings.ai_booking_mode as string | undefined;
  const capabilityPrompt = buildPromptForCapabilities(caps, ctx.tenant.industry_slug, aiBehaviorMode, aiBookingMode);
  prompt += `\n\n${capabilityPrompt}`;
  
  // Append mode-specific base prompt WITHOUT shared-rule wrapper.
  // SERVICE_AGENT_BASE_PROMPT (and other mode prompts) already contain inline copies
  // of human phone rules, time/number rules, busyness, and debug override.
  // Using getModePrompt() instead of getBasePromptForMode() avoids duplicating
  // HUMAN_PHONE_RULES, TIME_NUMBER_SPEAKING_RULES, behavior overrides, GUARDRAILS,
  // TRANSFER, BUSYNESS, and DEBUG that buildPromptForCapabilities already includes.
  // This saves ~2,000 tokens per call — critical for ElevenLabs context retention.
  const modePrompt = getModePrompt(businessMode);
  prompt += `\n\n${modePrompt}`;

  return prompt;
}

// ============= DYNAMIC VARIABLES BUILDER (for ElevenLabs injection) =============

/**
 * Flattens BusinessContext into key-value pairs for ElevenLabs dynamic_variables
 * Used by both twilio-inbound (voice calls) and elevenlabs-conversation-token (browser tests)
 *
 * This function delegates to the Voice Context Contract Registry which ensures:
 * - All variables are deterministically generated
 * - No null/undefined values (strings only for output)
 * - PHI is redacted in HIPAA mode
 * - Includes business_brain_json_compact with hash for verification
 *
 * @see voiceContextContract.ts for the canonical registry
 */
export function buildDynamicVariables(
  ctx: BusinessContext,
  callerPhoneE164: string,
  customerId: string | null
): Record<string, string | number | boolean> {
  // Delegate to the registry-driven builder
  const vars = buildDynamicVariablesFromRegistry(ctx, callerPhoneE164, customerId);

  // Ensure greeting_script always has a sensible value (never empty)
  // When empty, ElevenLabs falls back to its dashboard first_message which may be generic
  if (!vars.greeting_script) {
    vars.greeting_script = `Thanks for calling ${vars.business_name || "us"}, how can I help you today?`;
  }

  // Log variable keys for debugging (one-time dev log)
  if (Deno.env.get("LOG_DYNAMIC_VAR_KEYS") === "true") {
    console.log("[buildDynamicVariables] Keys:", getAllVariableKeys().join(", "));
  }

  return vars;
}

/**
 * Get the list of all dynamic variable keys from the registry.
 * Useful for documentation and verification.
 */
export function getDynamicVariableKeys(): string[] {
  return getAllVariableKeys();
}

// ============= SNAPSHOT STORAGE =============

export async function storeContextSnapshot(
  supabase: SupabaseClient,
  context: BusinessContext
): Promise<void> {
  try {
    // Redact sensitive data for storage
    const redactedContext = {
      ...context,
      _meta: {
        ...context._meta,
        // Keep customer_id but redact actual caller phone from logs
      },
    };
    
    await supabase.from("ai_context_snapshots").insert({
      tenant_id: context.tenant.tenant_id,
      channel: context._meta.channel,
      session_id: context._meta.session_id,
      customer_id: context._meta.customer_id,
      location_id: context._meta.location_id,
      context_json: redactedContext,
      missing_sections: context._meta.missing_sections,
    });
  } catch (error) {
    console.error("Failed to store context snapshot:", error);
    // Non-blocking - don't fail the call
  }
}
