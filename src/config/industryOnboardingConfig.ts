/**
 * Industry-Intelligent Onboarding Configuration
 *
 * Maps industry slugs/categories to onboarding behavior:
 * - Pre-answers for scenario questions (shown pre-checked based on industry)
 * - Post-onboarding checklist items (shown in ConfigureAIStep)
 * - Next steps for OnboardingComplete
 * - GuidedSetupOverlay title suffix
 */

import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SetupChecklistItem {
  label: string;
  fixPath: string;
  icon: "services" | "hours" | "faqs" | "calendar" | "coverage" | "menu" | "policies" | "team";
  /** Maps to a P0/P1 flag key from useAIReadinessV2 for completion state */
  flagKeys?: string[];
}

export interface NextStepItem {
  label: string;
  icon: "phone" | "calendar" | "book" | "sparkles" | "map" | "settings";
}

export interface IndustryOnboardingConfig {
  /** Capability keys pre-set to true for this industry (user can still override) */
  preAnswers: Record<string, boolean>;
  /** Post-onboarding checklist items (shown in ConfigureAIStep) */
  setupChecklist: SetupChecklistItem[];
  /** Industry-specific next steps text for OnboardingComplete */
  nextSteps: NextStepItem[];
  /** GuidedSetupOverlay title suffix (e.g. "your auto repair shop") */
  setupTitle: string;
}

// ---------------------------------------------------------------------------
// Slug-level configs
// ---------------------------------------------------------------------------

const slugConfigs: Record<string, Partial<IndustryOnboardingConfig>> = {
  plumbing: {
    preAnswers: {
      offersMobileService: true,
      offersSameDayEmergency: true,
      chargesTripFee: true,
      offersFreeEstimates: true,
    },
    setupChecklist: [
      { label: "Add your plumbing services and rates", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services", "missing_pricing"] },
      { label: "Set your business hours", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add common customer questions", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
      { label: "Connect your calendar", fixPath: "/app/business-brain?section=availability", icon: "calendar" },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" },
      { label: "Connect your calendar for live booking", icon: "calendar" },
      { label: "Add FAQs so your AI can answer plumbing questions", icon: "book" },
      { label: "Customize your AI's greeting and scripts", icon: "sparkles" },
    ],
    setupTitle: "your plumbing business",
  },

  hvac: {
    preAnswers: {
      offersMobileService: true,
      offersSameDayEmergency: true,
      chargesTripFee: true,
      offersFreeEstimates: true,
    },
    setupChecklist: [
      { label: "Add your HVAC services and rates", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services", "missing_pricing"] },
      { label: "Set your business hours", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add common customer questions", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
      { label: "Connect your calendar", fixPath: "/app/business-brain?section=availability", icon: "calendar" },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" },
      { label: "Connect your calendar for live booking", icon: "calendar" },
      { label: "Add FAQs about your HVAC services", icon: "book" },
      { label: "Customize your AI's greeting and scripts", icon: "sparkles" },
    ],
    setupTitle: "your HVAC business",
  },

  electrical: {
    preAnswers: {
      offersMobileService: true,
      offersSameDayEmergency: true,
      chargesTripFee: true,
      offersFreeEstimates: true,
    },
    setupTitle: "your electrical business",
  },

  towing: {
    preAnswers: {
      operates24Hours: true,
      offersLockoutJumpstart: true,
    },
    setupChecklist: [
      { label: "Set your tow rates and hookup fees", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_dispatch_services", "missing_pricing"] },
      { label: "Define your coverage zone", fixPath: "/app/business-brain?section=service-area", icon: "coverage", flagKeys: ["missing_service_area"] },
      { label: "Configure your fleet (if multiple trucks)", fixPath: "/app/business-brain?section=services", icon: "team" },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" },
      { label: "Set up your service area and coverage zones", icon: "map" },
      { label: "Add FAQs about your towing services", icon: "book" },
      { label: "Customize your AI's greeting and scripts", icon: "sparkles" },
    ],
    setupTitle: "your towing company",
  },

  "hair-salon": {
    preAnswers: {
      offersWalkIns: true,
      hasMultipleStaff: true,
      collectsStylistPreference: true,
    },
    setupChecklist: [
      { label: "Add your salon services and pricing", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services", "missing_pricing"] },
      { label: "Connect your calendar", fixPath: "/app/business-brain?section=availability", icon: "calendar" },
      { label: "Add stylist/team member info", fixPath: "/app/business-brain?section=services", icon: "team" },
      { label: "Add common client questions", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" },
      { label: "Connect your calendar for live booking", icon: "calendar" },
      { label: "Add FAQs about your salon services", icon: "book" },
      { label: "Customize your AI's greeting and scripts", icon: "sparkles" },
    ],
    setupTitle: "your salon",
  },

  auto_repair: {
    preAnswers: {
      offersSameDayEmergency: true,
      hasLongDurationJobs: true,
      acceptsVehicleDropOffs: true,
      requiresWarrantyCheck: true,
    },
    setupChecklist: [
      { label: "Add your shop's services and rates", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services", "missing_pricing"] },
      { label: "Set your shop hours", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add common customer questions", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
      { label: "Connect your calendar", fixPath: "/app/business-brain?section=availability", icon: "calendar" },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" },
      { label: "Connect your calendar for live booking", icon: "calendar" },
      { label: "Add FAQs so your AI can answer shop questions", icon: "book" },
      { label: "Customize your AI's greeting and scripts", icon: "sparkles" },
    ],
    setupTitle: "your auto repair shop",
  },

  dental: {
    preAnswers: {
      requiresInsurance: true,
      requiresNewPatientForms: true,
      offersSameDayAppointments: true,
    },
    setupChecklist: [
      { label: "Add your practice services", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services"] },
      { label: "Set office hours", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Upload patient intake forms", fixPath: "/app/business-brain?section=policies", icon: "policies", flagKeys: ["missing_policies"] },
      { label: "Connect your calendar", fixPath: "/app/business-brain?section=availability", icon: "calendar" },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" },
      { label: "Connect your calendar for live booking", icon: "calendar" },
      { label: "Add FAQs about your dental practice", icon: "book" },
      { label: "Customize your AI's greeting and scripts", icon: "sparkles" },
    ],
    setupTitle: "your dental practice",
  },

  pizza: {
    preAnswers: {
      offersDelivery: true,
      offersCurbside: true,
    },
    setupChecklist: [
      { label: "Set up your menu", fixPath: "/app/business-brain?section=services", icon: "menu", flagKeys: ["no_menu_items", "few_menu_items", "missing_menu_prices"] },
      { label: "Configure delivery settings", fixPath: "/app/business-brain?section=service-area", icon: "coverage", flagKeys: ["missing_service_area"] },
      { label: "Add common customer questions", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" },
      { label: "Set up your menu items and prices", icon: "book" },
      { label: "Configure delivery zones", icon: "map" },
      { label: "Customize your AI's greeting", icon: "sparkles" },
    ],
    setupTitle: "your pizza shop",
  },

  locksmith: {
    preAnswers: {
      offersMobileService: true,
      offersSameDayEmergency: true,
    },
    setupTitle: "your locksmith business",
  },

  // ── Dispatch industries ──

  courier: {
    preAnswers: {
      needsDistancePricing: true,
      offersPhoneQuotes: true,
    },
    setupChecklist: [
      { label: "Set your delivery rates", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_dispatch_services", "missing_pricing"] },
      { label: "Define your delivery area", fixPath: "/app/business-brain?section=service-area", icon: "coverage", flagKeys: ["missing_service_area"] },
      { label: "Set your hours of operation", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" },
      { label: "Set up your delivery zones", icon: "map" },
      { label: "Add FAQs about your delivery services", icon: "book" },
      { label: "Customize your AI's greeting", icon: "sparkles" },
    ],
    setupTitle: "your courier service",
  },

  roadside_assistance: {
    preAnswers: {
      operates24Hours: true,
      offersLockoutJumpstart: true,
      offersPhoneQuotes: true,
    },
    setupChecklist: [
      { label: "Set your service rates", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_dispatch_services", "missing_pricing"] },
      { label: "Define your coverage area", fixPath: "/app/business-brain?section=service-area", icon: "coverage", flagKeys: ["missing_service_area"] },
      { label: "Configure your fleet", fixPath: "/app/business-brain?section=services", icon: "team" },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" },
      { label: "Set up your coverage area", icon: "map" },
      { label: "Add FAQs about your roadside services", icon: "book" },
      { label: "Customize your AI's greeting", icon: "sparkles" },
    ],
    setupTitle: "your roadside assistance company",
  },

  medical_transport: {
    preAnswers: {
      needsDistancePricing: true,
      offersPhoneQuotes: true,
    },
    setupChecklist: [
      { label: "Set your transport rates", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_dispatch_services", "missing_pricing"] },
      { label: "Define your service area", fixPath: "/app/business-brain?section=service-area", icon: "coverage", flagKeys: ["missing_service_area"] },
      { label: "Set your hours of operation", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" },
      { label: "Set up your service area", icon: "map" },
      { label: "Add FAQs about your transport services", icon: "book" },
      { label: "Customize your AI's greeting", icon: "sparkles" },
    ],
    setupTitle: "your medical transport service",
  },

  mobile_mechanic: {
    preAnswers: {
      needsDistancePricing: true,
      offersPhoneQuotes: true,
      offersSameDayEmergency: true,
    },
    setupChecklist: [
      { label: "Set your service rates", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_dispatch_services", "missing_pricing"] },
      { label: "Define your service area", fixPath: "/app/business-brain?section=service-area", icon: "coverage", flagKeys: ["missing_service_area"] },
      { label: "Set your hours", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" },
      { label: "Set up your service area", icon: "map" },
      { label: "Add FAQs about your mobile repair services", icon: "book" },
      { label: "Customize your AI's greeting", icon: "sparkles" },
    ],
    setupTitle: "your mobile mechanic service",
  },
};

// ---------------------------------------------------------------------------
// Category-level fallbacks
// ---------------------------------------------------------------------------

const categoryConfigs: Record<string, Partial<IndustryOnboardingConfig>> = {
  home_services: {
    preAnswers: { offersMobileService: true },
    setupTitle: "your business",
  },
  beauty_wellness: {
    preAnswers: { offersWalkIns: true },
    setupTitle: "your business",
  },
  auto_services: {
    preAnswers: {},
    setupTitle: "your shop",
  },
  dispatch_logistics: {
    preAnswers: {
      needsDistancePricing: true,
      offersPhoneQuotes: true,
    },
    setupTitle: "your dispatch company",
  },
  food_beverage: {
    preAnswers: {},
    setupTitle: "your restaurant",
  },
  healthcare: {
    preAnswers: {},
    setupTitle: "your practice",
  },
};

// ---------------------------------------------------------------------------
// Mode-level fallbacks
// ---------------------------------------------------------------------------

const modeDefaults: Record<BusinessMode, IndustryOnboardingConfig> = {
  service: {
    preAnswers: {},
    setupChecklist: [
      { label: "Add your services and pricing", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services", "missing_pricing"] },
      { label: "Set your business hours", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add common customer questions", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
      { label: "Connect your calendar", fixPath: "/app/business-brain?section=availability", icon: "calendar" },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" },
      { label: "Connect your calendar for live booking", icon: "calendar" },
      { label: "Add FAQs so your AI can answer common questions", icon: "book" },
      { label: "Customize your AI's greeting and scripts", icon: "sparkles" },
    ],
    setupTitle: "your business",
  },
  dispatch: {
    preAnswers: {},
    setupChecklist: [
      { label: "Set your service rates", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_dispatch_services", "missing_pricing"] },
      { label: "Define your coverage zone", fixPath: "/app/business-brain?section=service-area", icon: "coverage", flagKeys: ["missing_service_area"] },
      { label: "Set your hours of operation", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add common customer questions", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" },
      { label: "Set up your coverage zone", icon: "map" },
      { label: "Add FAQs so your AI can answer common questions", icon: "book" },
      { label: "Customize your AI's greeting and scripts", icon: "sparkles" },
    ],
    setupTitle: "your business",
  },
  food: {
    preAnswers: {},
    setupChecklist: [
      { label: "Set up your menu", fixPath: "/app/business-brain?section=services", icon: "menu", flagKeys: ["no_menu_items", "few_menu_items", "missing_menu_prices"] },
      { label: "Set your hours", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add common customer questions", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" },
      { label: "Set up your menu items and prices", icon: "book" },
      { label: "Add FAQs so your AI can answer common questions", icon: "book" },
      { label: "Customize your AI's greeting", icon: "sparkles" },
    ],
    setupTitle: "your restaurant",
  },
  medical: {
    preAnswers: {},
    setupChecklist: [
      { label: "Add your practice services", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services"] },
      { label: "Set office hours", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Set up policies and intake forms", fixPath: "/app/business-brain?section=policies", icon: "policies", flagKeys: ["missing_policies"] },
      { label: "Connect your calendar", fixPath: "/app/business-brain?section=availability", icon: "calendar" },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" },
      { label: "Connect your calendar for live booking", icon: "calendar" },
      { label: "Add FAQs about your practice", icon: "book" },
      { label: "Customize your AI's greeting and scripts", icon: "sparkles" },
    ],
    setupTitle: "your practice",
  },
  general: {
    preAnswers: {},
    setupChecklist: [
      { label: "Add your services or offerings", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services"] },
      { label: "Set your business hours", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add common customer questions", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" },
      { label: "Add FAQs so your AI can answer common questions", icon: "book" },
      { label: "Customize your AI's greeting and scripts", icon: "sparkles" },
    ],
    setupTitle: "your business",
  },
  sales: {
    preAnswers: {},
    setupChecklist: [
      { label: "Add your products or offerings", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services"] },
      { label: "Set your business hours", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add common customer questions", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
      { label: "Connect your calendar", fixPath: "/app/business-brain?section=availability", icon: "calendar" },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" },
      { label: "Connect your calendar for appointment booking", icon: "calendar" },
      { label: "Add FAQs about your products", icon: "book" },
      { label: "Customize your AI's greeting and scripts", icon: "sparkles" },
    ],
    setupTitle: "your business",
  },
};

// ---------------------------------------------------------------------------
// Resolver (slug → category → mode fallback)
// ---------------------------------------------------------------------------

/**
 * Resolves the industry onboarding config using the 3-tier hierarchy:
 * slug-specific → category-level → mode-level defaults.
 */
export function getIndustryOnboardingConfig(
  mode: BusinessMode,
  category?: string,
  slug?: string
): IndustryOnboardingConfig {
  const modeDefault = modeDefaults[mode] ?? modeDefaults.general;

  // Start with mode-level defaults
  let merged: IndustryOnboardingConfig = { ...modeDefault };

  // Layer in category overrides
  if (category && categoryConfigs[category]) {
    const catCfg = categoryConfigs[category];
    merged = {
      preAnswers: { ...merged.preAnswers, ...catCfg.preAnswers },
      setupChecklist: catCfg.setupChecklist ?? merged.setupChecklist,
      nextSteps: catCfg.nextSteps ?? merged.nextSteps,
      setupTitle: catCfg.setupTitle ?? merged.setupTitle,
    };
  }

  // Layer in slug overrides (highest priority)
  if (slug && slugConfigs[slug]) {
    const slugCfg = slugConfigs[slug];
    merged = {
      preAnswers: { ...merged.preAnswers, ...slugCfg.preAnswers },
      setupChecklist: slugCfg.setupChecklist ?? merged.setupChecklist,
      nextSteps: slugCfg.nextSteps ?? merged.nextSteps,
      setupTitle: slugCfg.setupTitle ?? merged.setupTitle,
    };
  }

  return merged;
}
