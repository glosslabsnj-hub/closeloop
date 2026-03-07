/**
 * Industry Brain Configuration
 *
 * Provides per-industry configuration for Brain sections, pricing editors,
 * inbox field display, priority scoring, and dashboard labels.
 *
 * Uses the same 3-tier resolution as industryTerminology.ts:
 *   mode defaults → category overrides → slug-specific overrides
 */

import type { BusinessMode } from "@/hooks/useTenantConfig";
import type { IndustryCategory } from "@/data/industryCatalog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PricingModel = "catalog" | "menu" | "fee_schedule" | "distance" | "custom";
export type PriorityLevel = "high" | "medium" | "low";

export interface PricingConfig {
  /** Show the full PricingRulesEditor (dispatch only) */
  showPricingRulesEditor: boolean;
  /** Show the distance/ETA pricing guidance panel */
  showPricingEtaGuidance: boolean;
  /** Show quoting-behavior guidance for non-dispatch modes */
  showQuotingBehaviorGuidance: boolean;
  /** Label for the PriceModifiers card header */
  priceModifiersLabel: string;
  /** How this industry prices things — drives guidance copy */
  pricingModel: PricingModel;
}

export interface InboxFieldLabels {
  /** Maps canonical payload paths to human-readable labels */
  [path: string]: string;
}

export interface InboxConfig {
  /** Display labels for extracted payload fields */
  fieldLabels: InboxFieldLabels;
  /** Fields to show prominently at top of detail panel */
  primaryFields: string[];
  /** Fields to show in card preview */
  previewFields: string[];
}

export interface PriorityWeights {
  /** Score added for followup outcome */
  followup: number;
  /** Score added for escalated outcome */
  escalated: number;
  /** Score added for lost outcome */
  lost: number;
  /** Score added for booked outcome */
  booked: number;
  /** Bonus points for calls within the last hour */
  recencyBoostMinutes: number;
  recencyBoostScore: number;
  /** Extra points when callback was requested */
  callbackBoost: number;
}

export interface PriorityConfig {
  weights: PriorityWeights;
  labels: Record<PriorityLevel, string>;
  colors: Record<PriorityLevel, string>;
}

export interface DashboardConfig {
  /** Override for the primary metric card label */
  primaryMetricLabel: string;
  /** Quick action button labels */
  quickActionLabel: string;
  quickActionDescription: string;
}

export interface BrainSectionConfig {
  /** Override labels for specific Brain sections by ID */
  sectionLabelOverrides: Record<string, string>;
  /** Section IDs to hide entirely */
  hiddenSections: string[];
  /** Empty-state suggestions per section */
  emptyStateSuggestions: Record<string, string>;
}

export interface IndustryBrainConfig {
  pricing: PricingConfig;
  inbox: InboxConfig;
  priority: PriorityConfig;
  dashboard: DashboardConfig;
  brain: BrainSectionConfig;
}

// ---------------------------------------------------------------------------
// Shared field labels (reused across modes)
// ---------------------------------------------------------------------------

const COMMON_CUSTOMER_LABELS: InboxFieldLabels = {
  "customer.name": "Name",
  "customer.phone_e164": "Phone",
  "customer.email": "Email",
};

const COMMON_CALLBACK_LABELS: InboxFieldLabels = {
  "callback.requested": "Callback Requested",
  "callback.best_time": "Best Time to Call",
  "callback.message": "Message",
};

// ---------------------------------------------------------------------------
// Default priority config (shared across all modes)
// ---------------------------------------------------------------------------

const DEFAULT_PRIORITY: PriorityConfig = {
  weights: {
    followup: 80,
    escalated: 90,
    lost: 30,
    booked: 10,
    recencyBoostMinutes: 60,
    recencyBoostScore: 15,
    callbackBoost: 20,
  },
  labels: {
    high: "High Priority",
    medium: "Follow Up",
    low: "Normal",
  },
  colors: {
    high: "destructive",
    medium: "warning",
    low: "default",
  },
};

// ---------------------------------------------------------------------------
// Mode defaults
// ---------------------------------------------------------------------------

const SERVICE_DEFAULT: IndustryBrainConfig = {
  pricing: {
    showPricingRulesEditor: false,
    showPricingEtaGuidance: false,
    showQuotingBehaviorGuidance: true,
    priceModifiersLabel: "Extra Fees & Surcharges",
    pricingModel: "catalog",
  },
  inbox: {
    fieldLabels: {
      ...COMMON_CUSTOMER_LABELS,
      "booking.service_requested": "Service Requested",
      "booking.preferred_date": "Preferred Date",
      "booking.preferred_time": "Preferred Time",
      "booking.confirmed": "Confirmed",
      ...COMMON_CALLBACK_LABELS,
    },
    primaryFields: ["booking.service_requested", "booking.preferred_date", "booking.preferred_time"],
    previewFields: ["booking.service_requested"],
  },
  priority: DEFAULT_PRIORITY,
  dashboard: {
    primaryMetricLabel: "Bookings This Week",
    quickActionLabel: "New Booking",
    quickActionDescription: "Schedule a new appointment",
  },
  brain: {
    sectionLabelOverrides: {},
    hiddenSections: [],
    emptyStateSuggestions: {
      "service-catalog": "Add the services you offer so your AI knows what to book.",
      "business-faqs": "Add common customer questions to help your AI answer confidently.",
    },
  },
};

const DISPATCH_DEFAULT: IndustryBrainConfig = {
  pricing: {
    showPricingRulesEditor: true,
    showPricingEtaGuidance: true,
    showQuotingBehaviorGuidance: false,
    priceModifiersLabel: "Extra Charges",
    pricingModel: "distance",
  },
  inbox: {
    fieldLabels: {
      ...COMMON_CUSTOMER_LABELS,
      "dispatch.pickup_address": "Pickup Location",
      "dispatch.dropoff_address": "Dropoff Location",
      "dispatch.vehicle_type": "Vehicle Type",
      "dispatch.drivable": "Drivable",
      "dispatch.urgency": "Urgency",
      "dispatch.job_type": "Job Type",
      ...COMMON_CALLBACK_LABELS,
    },
    primaryFields: ["dispatch.pickup_address", "dispatch.dropoff_address", "dispatch.urgency"],
    previewFields: ["dispatch.pickup_address", "dispatch.job_type"],
  },
  priority: {
    ...DEFAULT_PRIORITY,
    weights: {
      ...DEFAULT_PRIORITY.weights,
      escalated: 95,
    },
  },
  dashboard: {
    primaryMetricLabel: "Active Jobs",
    quickActionLabel: "Quick Dispatch",
    quickActionDescription: "Create a new dispatch job",
  },
  brain: {
    sectionLabelOverrides: {},
    hiddenSections: [],
    emptyStateSuggestions: {
      "service-catalog": "Add the tow/dispatch services you handle so your AI can quote accurately.",
      "business-faqs": "Add common caller questions to help your AI answer confidently.",
    },
  },
};

const FOOD_DEFAULT: IndustryBrainConfig = {
  pricing: {
    showPricingRulesEditor: false,
    showPricingEtaGuidance: false,
    showQuotingBehaviorGuidance: true,
    priceModifiersLabel: "Delivery & Extra Fees",
    pricingModel: "menu",
  },
  inbox: {
    fieldLabels: {
      ...COMMON_CUSTOMER_LABELS,
      "order.type": "Order Type",
      "order.items": "Items Ordered",
      "order.special_instructions": "Special Instructions",
      "order.delivery_address": "Delivery Address",
      "order.total_cents": "Order Total",
      "reservation.date": "Reservation Date",
      "reservation.time": "Reservation Time",
      "reservation.party_size": "Party Size",
      "reservation.notes": "Special Requests",
      ...COMMON_CALLBACK_LABELS,
    },
    primaryFields: ["order.type", "order.items", "order.total_cents"],
    previewFields: ["order.type", "order.items"],
  },
  priority: DEFAULT_PRIORITY,
  dashboard: {
    primaryMetricLabel: "Orders Today",
    quickActionLabel: "New Order",
    quickActionDescription: "Enter a new order",
  },
  brain: {
    sectionLabelOverrides: {},
    hiddenSections: [],
    emptyStateSuggestions: {
      "service-catalog": "Add your menu items so your AI knows what you serve.",
      "business-faqs": "Add common guest questions about your menu and policies.",
    },
  },
};

const MEDICAL_DEFAULT: IndustryBrainConfig = {
  pricing: {
    showPricingRulesEditor: false,
    showPricingEtaGuidance: false,
    showQuotingBehaviorGuidance: true,
    priceModifiersLabel: "Additional Fees",
    pricingModel: "fee_schedule",
  },
  inbox: {
    fieldLabels: {
      ...COMMON_CUSTOMER_LABELS,
      "booking.service_requested": "Reason for Visit",
      "booking.preferred_date": "Preferred Date",
      "booking.preferred_time": "Preferred Time",
      "booking.confirmed": "Confirmed",
      ...COMMON_CALLBACK_LABELS,
    },
    primaryFields: ["booking.service_requested", "booking.preferred_date", "booking.preferred_time"],
    previewFields: ["booking.service_requested"],
  },
  priority: DEFAULT_PRIORITY,
  dashboard: {
    primaryMetricLabel: "Appointments Today",
    quickActionLabel: "New Appointment",
    quickActionDescription: "Schedule a patient appointment",
  },
  brain: {
    sectionLabelOverrides: {
      "service-catalog": "Procedures & Visit Types",
    },
    hiddenSections: [],
    emptyStateSuggestions: {
      "service-catalog": "Add the procedures and visit types your practice offers.",
      "business-faqs": "Add common patient questions about insurance, forms, and scheduling.",
    },
  },
};

const GENERAL_DEFAULT: IndustryBrainConfig = {
  pricing: {
    showPricingRulesEditor: false,
    showPricingEtaGuidance: false,
    showQuotingBehaviorGuidance: true,
    priceModifiersLabel: "Extra Fees & Surcharges",
    pricingModel: "catalog",
  },
  inbox: {
    fieldLabels: {
      ...COMMON_CUSTOMER_LABELS,
      "booking.service_requested": "Service Requested",
      "booking.preferred_date": "Preferred Date",
      "booking.preferred_time": "Preferred Time",
      ...COMMON_CALLBACK_LABELS,
    },
    primaryFields: ["booking.service_requested", "booking.preferred_date"],
    previewFields: ["booking.service_requested"],
  },
  priority: DEFAULT_PRIORITY,
  dashboard: {
    primaryMetricLabel: "Bookings This Week",
    quickActionLabel: "New Booking",
    quickActionDescription: "Create a new booking",
  },
  brain: {
    sectionLabelOverrides: {},
    hiddenSections: [],
    emptyStateSuggestions: {
      "service-catalog": "Add your offerings so your AI knows what to present to callers.",
      "business-faqs": "Add frequently asked questions to help your AI answer callers confidently.",
    },
  },
};

const SALES_DEFAULT: IndustryBrainConfig = {
  pricing: {
    showPricingRulesEditor: false,
    showPricingEtaGuidance: false,
    showQuotingBehaviorGuidance: true,
    priceModifiersLabel: "Fees & Add-Ons",
    pricingModel: "catalog",
  },
  inbox: {
    fieldLabels: {
      ...COMMON_CUSTOMER_LABELS,
      "booking.service_requested": "Interest",
      "booking.preferred_date": "Preferred Date",
      "booking.preferred_time": "Preferred Time",
      ...COMMON_CALLBACK_LABELS,
    },
    primaryFields: ["booking.service_requested", "booking.preferred_date"],
    previewFields: ["booking.service_requested"],
  },
  priority: DEFAULT_PRIORITY,
  dashboard: {
    primaryMetricLabel: "Appointments This Week",
    quickActionLabel: "New Appointment",
    quickActionDescription: "Schedule a showroom appointment",
  },
  brain: {
    sectionLabelOverrides: {},
    hiddenSections: [],
    emptyStateSuggestions: {
      "service-catalog": "Add your products so your AI can discuss inventory with callers.",
      "business-faqs": "Add common prospect questions about financing, trade-ins, and availability.",
    },
  },
};

const MODE_DEFAULTS: Record<BusinessMode, IndustryBrainConfig> = {
  service: SERVICE_DEFAULT,
  dispatch: DISPATCH_DEFAULT,
  food: FOOD_DEFAULT,
  medical: MEDICAL_DEFAULT,
  general: GENERAL_DEFAULT,
  sales: SALES_DEFAULT,
};

// ---------------------------------------------------------------------------
// Category overrides (merged on top of mode defaults)
// ---------------------------------------------------------------------------

const CATEGORY_OVERRIDES: Partial<Record<IndustryCategory, DeepPartial<IndustryBrainConfig>>> = {
  beauty_wellness: {
    dashboard: {
      primaryMetricLabel: "Appointments This Week",
      quickActionLabel: "New Appointment",
      quickActionDescription: "Book a new client appointment",
    },
    brain: {
      emptyStateSuggestions: {
        "service-catalog": "Add your salon/spa services with durations and pricing.",
      },
    },
  },
  auto_services: {
    inbox: {
      fieldLabels: {
        "booking.service_requested": "Service Needed",
      },
    },
    dashboard: {
      quickActionDescription: "Schedule a new service appointment",
    },
    brain: {
      emptyStateSuggestions: {
        "service-catalog": "Add your shop services (oil changes, brakes, detailing, etc.).",
      },
    },
  },
  home_services: {
    inbox: {
      fieldLabels: {
        "booking.service_requested": "Service Needed",
      },
    },
    brain: {
      emptyStateSuggestions: {
        "service-catalog": "Add your service types (diagnostic, repair, installation, etc.).",
      },
    },
  },
  dispatch_logistics: {
    dashboard: {
      primaryMetricLabel: "Active Jobs",
      quickActionLabel: "Quick Dispatch",
    },
  },
  food_hospitality: {
    dashboard: {
      primaryMetricLabel: "Orders Today",
    },
  },
  health_medical: {
    dashboard: {
      primaryMetricLabel: "Appointments Today",
      quickActionLabel: "New Appointment",
    },
  },
  pet_services: {
    inbox: {
      fieldLabels: {
        "customer.name": "Pet Parent",
      },
    },
    dashboard: {
      primaryMetricLabel: "Appointments This Week",
      quickActionDescription: "Book a new grooming appointment",
    },
  },
};

// ---------------------------------------------------------------------------
// Slug-specific overrides (highest priority)
// ---------------------------------------------------------------------------

const SLUG_OVERRIDES: Record<string, DeepPartial<IndustryBrainConfig>> = {
  "auto-repair": {
    pricing: {
      priceModifiersLabel: "Shop Fees & Surcharges",
    },
    inbox: {
      fieldLabels: {
        "booking.service_requested": "Repair Needed",
      },
      previewFields: ["booking.service_requested"],
    },
    dashboard: {
      primaryMetricLabel: "Jobs This Week",
      quickActionLabel: "New Repair",
      quickActionDescription: "Schedule a repair appointment",
    },
    brain: {
      emptyStateSuggestions: {
        "service-catalog": "Add your shop services — oil changes, brake jobs, diagnostics, etc.",
      },
    },
  },
  "hair-salon": {
    pricing: {
      priceModifiersLabel: "Add-On Fees",
    },
    dashboard: {
      primaryMetricLabel: "Appointments This Week",
      quickActionLabel: "New Appointment",
      quickActionDescription: "Book a new client",
    },
    brain: {
      emptyStateSuggestions: {
        "service-catalog": "Add salon services — cuts, color, treatments, blowouts.",
      },
    },
  },
  "plumbing": {
    pricing: {
      priceModifiersLabel: "Trip Fees & Surcharges",
    },
    inbox: {
      fieldLabels: {
        "booking.service_requested": "Issue Reported",
      },
    },
    dashboard: {
      primaryMetricLabel: "Jobs This Week",
      quickActionLabel: "New Service Call",
      quickActionDescription: "Schedule a plumbing service call",
    },
    brain: {
      emptyStateSuggestions: {
        "service-catalog": "Add your services — drain cleaning, water heater repair, leak detection.",
      },
    },
  },
  "hvac": {
    pricing: {
      priceModifiersLabel: "Trip Fees & Surcharges",
    },
    inbox: {
      fieldLabels: {
        "booking.service_requested": "Issue Reported",
      },
    },
    dashboard: {
      primaryMetricLabel: "Service Calls This Week",
      quickActionLabel: "New Service Call",
    },
    brain: {
      emptyStateSuggestions: {
        "service-catalog": "Add services — AC tune-up, furnace repair, duct cleaning, installs.",
      },
    },
  },
  "towing": {
    pricing: {
      priceModifiersLabel: "Extra Charges",
    },
    inbox: {
      fieldLabels: {
        "dispatch.pickup_address": "Pickup Location",
        "dispatch.dropoff_address": "Drop Location",
        "dispatch.vehicle_type": "Vehicle",
        "dispatch.drivable": "Drivable?",
      },
      previewFields: ["dispatch.pickup_address", "dispatch.vehicle_type"],
    },
    dashboard: {
      primaryMetricLabel: "Active Tows",
      quickActionLabel: "Quick Dispatch",
      quickActionDescription: "Dispatch a tow truck",
    },
    brain: {
      emptyStateSuggestions: {
        "service-catalog": "Add your tow services — local tow, flatbed, lockout, jump start.",
      },
    },
  },
  "pizza": {
    pricing: {
      priceModifiersLabel: "Delivery & Extra Fees",
    },
    inbox: {
      previewFields: ["order.type", "order.items"],
    },
    dashboard: {
      primaryMetricLabel: "Orders Today",
      quickActionLabel: "New Order",
      quickActionDescription: "Enter a phone order",
    },
    brain: {
      emptyStateSuggestions: {
        "service-catalog": "Set up your menu — pizzas, sides, drinks, specials.",
      },
    },
  },
  "dental": {
    pricing: {
      priceModifiersLabel: "Additional Fees",
      pricingModel: "fee_schedule",
    },
    inbox: {
      fieldLabels: {
        "booking.service_requested": "Reason for Visit",
        "customer.name": "Patient",
      },
    },
    dashboard: {
      primaryMetricLabel: "Appointments Today",
      quickActionLabel: "New Appointment",
      quickActionDescription: "Schedule a patient appointment",
    },
    brain: {
      emptyStateSuggestions: {
        "service-catalog": "Add procedures — cleaning, filling, crown, whitening.",
      },
    },
  },
  "auto-detailing": {
    pricing: {
      priceModifiersLabel: "Vehicle Size Surcharges",
    },
    dashboard: {
      primaryMetricLabel: "Appointments This Week",
      quickActionLabel: "New Detail",
      quickActionDescription: "Book a detailing appointment",
    },
  },
  "general_contractor": {
    pricing: {
      priceModifiersLabel: "Project Fees & Surcharges",
    },
    inbox: {
      fieldLabels: {
        "booking.service_requested": "Project Type",
      },
    },
    dashboard: {
      primaryMetricLabel: "Estimates This Week",
      quickActionLabel: "Schedule Estimate",
      quickActionDescription: "Schedule a free on-site estimate",
    },
    brain: {
      emptyStateSuggestions: {
        "service-catalog": "Add your services — kitchen remodel, bathroom remodel, additions, handyman.",
      },
    },
  },
  "roofing": {
    pricing: {
      priceModifiersLabel: "Project Fees & Surcharges",
    },
    inbox: {
      fieldLabels: {
        "booking.service_requested": "Roofing Issue",
      },
    },
    dashboard: {
      primaryMetricLabel: "Inspections This Week",
      quickActionLabel: "Schedule Inspection",
      quickActionDescription: "Schedule a free roof inspection",
    },
    brain: {
      emptyStateSuggestions: {
        "service-catalog": "Add your services — roof inspection, leak repair, shingle replacement, full replacement.",
      },
    },
  },
  "electrical": {
    pricing: {
      priceModifiersLabel: "Trip Fees & Surcharges",
    },
    inbox: {
      fieldLabels: {
        "booking.service_requested": "Electrical Issue",
      },
    },
    dashboard: {
      primaryMetricLabel: "Jobs This Week",
      quickActionLabel: "New Service Call",
      quickActionDescription: "Schedule an electrical service call",
    },
    brain: {
      emptyStateSuggestions: {
        "service-catalog": "Add your services — panel upgrades, outlet installs, lighting, troubleshooting.",
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Deep merge helper
// ---------------------------------------------------------------------------

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

function deepMerge<T extends object>(base: T, override: DeepPartial<T>): T {
  const result = { ...base };
  for (const key of Object.keys(override) as Array<keyof T>) {
    const overrideVal = override[key];
    if (overrideVal === undefined) continue;
    const baseVal = base[key];
    if (
      baseVal &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal) &&
      overrideVal &&
      typeof overrideVal === "object" &&
      !Array.isArray(overrideVal)
    ) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        overrideVal as DeepPartial<Record<string, unknown>>,
      ) as T[keyof T];
    } else {
      result[key] = overrideVal as T[keyof T];
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get industry-specific Brain + UI configuration.
 * Resolves mode defaults → category overrides → slug-specific overrides.
 */
export function getIndustryBrainConfig(
  mode: BusinessMode,
  category?: IndustryCategory,
  slug?: string,
): IndustryBrainConfig {
  let config = structuredClone(MODE_DEFAULTS[mode] ?? MODE_DEFAULTS.service);

  if (category && CATEGORY_OVERRIDES[category]) {
    config = deepMerge(config, CATEGORY_OVERRIDES[category]!);
  }

  if (slug && SLUG_OVERRIDES[slug]) {
    config = deepMerge(config, SLUG_OVERRIDES[slug]);
  }

  return config;
}
