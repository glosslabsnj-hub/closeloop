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
    setupChecklist: [
      { label: "Add your electrical services and rates", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services", "missing_pricing"] },
      { label: "Set your business hours", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add common customer questions (permits, panel upgrades, EV chargers)", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
      { label: "Connect your calendar", fixPath: "/app/business-brain?section=availability", icon: "calendar" },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" },
      { label: "Connect your calendar for live booking", icon: "calendar" },
      { label: "Add FAQs about permits, panel upgrades, and EV chargers", icon: "book" },
      { label: "Customize your AI's greeting and scripts", icon: "sparkles" },
    ],
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
  // alias: industryCatalog uses "salon" slug
  salon: {
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

  restaurant: {
    preAnswers: {
      offersReservations: true,
    },
    setupChecklist: [
      { label: "Set up your menu", fixPath: "/app/business-brain?section=services", icon: "menu" as const, flagKeys: ["no_menu_items", "few_menu_items", "missing_menu_prices"] },
      { label: "Set your hours", fixPath: "/app/business-brain?section=hours", icon: "hours" as const, flagKeys: ["missing_hours"] },
      { label: "Configure delivery (if offered)", fixPath: "/app/business-brain?section=service-area", icon: "coverage" as const },
      { label: "Add common guest questions", fixPath: "/app/business-brain?section=knowledge", icon: "faqs" as const, flagKeys: ["missing_faqs", "few_faqs"] },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" as const },
      { label: "Add your menu items and prices", icon: "book" as const },
      { label: "Set up delivery zones (if applicable)", icon: "map" as const },
      { label: "Customize your AI's greeting", icon: "sparkles" as const },
    ],
    setupTitle: "your restaurant",
  },

  bakery: {
    preAnswers: {
      offersCatering: true,
    },
    setupChecklist: [
      { label: "Add your bakery items and prices", fixPath: "/app/business-brain?section=services", icon: "menu" as const, flagKeys: ["no_menu_items", "few_menu_items", "missing_menu_prices"] },
      { label: "Set your hours", fixPath: "/app/business-brain?section=hours", icon: "hours" as const, flagKeys: ["missing_hours"] },
      { label: "Add common questions", fixPath: "/app/business-brain?section=knowledge", icon: "faqs" as const, flagKeys: ["missing_faqs", "few_faqs"] },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" as const },
      { label: "Add your baked goods and prices", icon: "book" as const },
      { label: "Add FAQs about custom orders and lead times", icon: "book" as const },
      { label: "Customize your AI's greeting", icon: "sparkles" as const },
    ],
    setupTitle: "your bakery",
  },

  coffee_shop: {
    preAnswers: {},
    setupChecklist: [
      { label: "Set up your menu", fixPath: "/app/business-brain?section=services", icon: "menu" as const, flagKeys: ["no_menu_items", "few_menu_items", "missing_menu_prices"] },
      { label: "Set your hours", fixPath: "/app/business-brain?section=hours", icon: "hours" as const, flagKeys: ["missing_hours"] },
      { label: "Add common questions", fixPath: "/app/business-brain?section=knowledge", icon: "faqs" as const, flagKeys: ["missing_faqs", "few_faqs"] },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" as const },
      { label: "Add your drinks and food items", icon: "book" as const },
      { label: "Customize your AI's greeting", icon: "sparkles" as const },
    ],
    setupTitle: "your coffee shop",
  },

  food_truck: {
    preAnswers: {},
    setupChecklist: [
      { label: "Set up your menu", fixPath: "/app/business-brain?section=services", icon: "menu" as const, flagKeys: ["no_menu_items", "few_menu_items", "missing_menu_prices"] },
      { label: "Set your hours and location schedule", fixPath: "/app/business-brain?section=hours", icon: "hours" as const, flagKeys: ["missing_hours"] },
      { label: "Add common questions", fixPath: "/app/business-brain?section=knowledge", icon: "faqs" as const, flagKeys: ["missing_faqs", "few_faqs"] },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" as const },
      { label: "Add your menu items and prices", icon: "book" as const },
      { label: "Customize your AI's greeting", icon: "sparkles" as const },
    ],
    setupTitle: "your food truck",
  },

  catering_service: {
    preAnswers: {
      offersCatering: true,
    },
    setupChecklist: [
      { label: "Set up your catering packages", fixPath: "/app/business-brain?section=services", icon: "menu" as const, flagKeys: ["no_menu_items", "few_menu_items", "missing_menu_prices"] },
      { label: "Set your availability", fixPath: "/app/business-brain?section=hours", icon: "hours" as const, flagKeys: ["missing_hours"] },
      { label: "Define your service area", fixPath: "/app/business-brain?section=service-area", icon: "coverage" as const },
      { label: "Add common questions", fixPath: "/app/business-brain?section=knowledge", icon: "faqs" as const, flagKeys: ["missing_faqs", "few_faqs"] },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" as const },
      { label: "Add your catering packages and prices", icon: "book" as const },
      { label: "Set your delivery/service area", icon: "map" as const },
      { label: "Customize your AI's greeting", icon: "sparkles" as const },
    ],
    setupTitle: "your catering business",
  },

  bar: {
    preAnswers: {
      offersReservations: true,
      servesAlcohol: true,
    },
    setupTitle: "your bar",
  },

  pest_control: {
    preAnswers: {
      offersMobileService: true,
      offersSameDayEmergency: true,
      offersRecurringService: true,
      chargesTripFee: false,
    },
    setupChecklist: [
      { label: "Add your treatments and service plans", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services", "missing_pricing"] },
      { label: "Set your service area", fixPath: "/app/business-brain?section=service-area", icon: "coverage", flagKeys: ["missing_service_area"] },
      { label: "Set your business hours", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add FAQs about safety, pets, and treatment effectiveness", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI schedule a treatment", icon: "phone" },
      { label: "Set your service area and response zone", icon: "map" },
      { label: "Add FAQs about pet safety, guarantees, and pricing", icon: "book" },
      { label: "Customize your AI's greeting", icon: "sparkles" },
    ],
    setupTitle: "your pest control business",
  },

  cleaning: {
    preAnswers: {
      offersMobileService: true,
      offersRecurringService: true,
      requiresDeposits: false,
    },
    setupChecklist: [
      { label: "Add your cleaning services and pricing", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services", "missing_pricing"] },
      { label: "Set your service area", fixPath: "/app/business-brain?section=service-area", icon: "coverage", flagKeys: ["missing_service_area"] },
      { label: "Set your hours of availability", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add FAQs about supplies, pets, and recurring discounts", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI book a cleaning", icon: "phone" },
      { label: "Set your service area and coverage zone", icon: "map" },
      { label: "Add FAQs about what's included, pets, and pricing", icon: "book" },
      { label: "Customize your AI's greeting and scripts", icon: "sparkles" },
    ],
    setupTitle: "your cleaning business",
  },

  locksmith: {
    preAnswers: {
      offersMobileService: true,
      offersSameDayEmergency: true,
      chargesTripFee: true,
    },
    setupChecklist: [
      { label: "Add your locksmith services and pricing", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services", "missing_pricing"] },
      { label: "Set your service area and response radius", fixPath: "/app/business-brain?section=service-area", icon: "coverage", flagKeys: ["missing_service_area"] },
      { label: "Set your business hours (including 24/7 availability)", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add FAQs about response time, trip fees, and key types", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI handle a lockout", icon: "phone" },
      { label: "Confirm your 24/7 emergency availability settings", icon: "clock" },
      { label: "Add your service area and typical response time", icon: "map" },
      { label: "Add FAQs about car keys, smart locks, and pricing", icon: "book" },
    ],
    setupTitle: "your locksmith business",
  },

  roofing: {
    preAnswers: {
      offersMobileService: true,
      chargesTripFee: false,
      offersFreeEstimates: true,
    },
    setupChecklist: [
      { label: "Add your roofing services and pricing", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services", "missing_pricing"] },
      { label: "Set your service area", fixPath: "/app/business-brain?section=service-area", icon: "coverage", flagKeys: ["missing_service_area"] },
      { label: "Set your business hours", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add common questions (insurance claims, warranties, timeline)", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" },
      { label: "Set your service area and coverage zone", icon: "map" },
      { label: "Add FAQs about insurance claims and warranties", icon: "book" },
      { label: "Customize your AI's greeting and scripts", icon: "sparkles" },
    ],
    setupTitle: "your roofing company",
  },

  handyman: {
    preAnswers: {
      offersMobileService: true,
      chargesTripFee: false,
      offersFreeEstimates: true,
      requiresDeposits: false,
      offersSameDay: true,
    },
    setupChecklist: [
      { label: "Add your services and pricing", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services"] },
      { label: "Set your service area", fixPath: "/app/business-brain?section=service-area", icon: "coverage", flagKeys: ["missing_service_area"] },
      { label: "Set your hours (can you do same-day?)", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add FAQs about what you can and can't do", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" },
      { label: "Set your service area radius", icon: "map" },
      { label: "Add FAQs about minor plumbing, electrical, and pricing", icon: "book" },
      { label: "Customize your AI's greeting", icon: "sparkles" },
    ],
    setupTitle: "your handyman business",
  },

  pool_service: {
    preAnswers: {
      offersMobileService: true,
      chargesTripFee: false,
      offersRecurringService: true,
      requiresDeposits: false,
    },
    setupChecklist: [
      { label: "Add your pool services and maintenance plans", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services", "missing_pricing"] },
      { label: "Set your service area", fixPath: "/app/business-brain?section=service-area", icon: "coverage", flagKeys: ["missing_service_area"] },
      { label: "Set your business hours (Mon–Sat for most pool companies)", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add FAQs about chemicals, contracts, and service frequency", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
    ],
    nextSteps: [
      { label: "Make a test call — try 'My pool is turning green'", icon: "phone" },
      { label: "Set your service area and coverage radius", icon: "map" },
      { label: "Add FAQs about chemicals, saltwater pools, and heater repairs", icon: "book" },
      { label: "Customize your AI's greeting", icon: "sparkles" },
    ],
    setupTitle: "your pool service company",
  },

  general_contractor: {
    preAnswers: {
      offersMobileService: true,
      chargesTripFee: false,
      offersFreeEstimates: true,
      requiresDeposits: true,
    },
    setupChecklist: [
      { label: "Add your services and estimate types", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services"] },
      { label: "Set your service area", fixPath: "/app/business-brain?section=service-area", icon: "coverage", flagKeys: ["missing_service_area"] },
      { label: "Set your business hours", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add common questions (permits, timeline, subcontractors, financing)", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
    ],
    nextSteps: [
      { label: "Make a test call to hear your AI", icon: "phone" },
      { label: "Set your service area so the AI knows where you work", icon: "map" },
      { label: "Add FAQs about permits, timeline, and warranty", icon: "book" },
      { label: "Customize your AI's greeting and scripts", icon: "sparkles" },
    ],
    setupTitle: "your contracting business",
  },

  // ── Sales industries ──

  "car-dealership-new": {
    preAnswers: {
      offersFinancing: true,
      offersTradeIn: true,
    },
    setupChecklist: [
      { label: "Add your vehicle models and pricing ranges", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services"] },
      { label: "Set your showroom hours (Mon–Sat for most dealers)", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add FAQs about financing, trade-ins, and warranties", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
      { label: "Connect your calendar for test drive appointments", fixPath: "/app/business-brain?section=availability", icon: "calendar" },
    ],
    nextSteps: [
      { label: "Make a test call — try 'I'm looking for a new SUV under $40K'", icon: "phone" },
      { label: "Add your vehicle lineup so your AI knows what you carry", icon: "services" },
      { label: "Set your showroom hours — most dealers work Saturdays", icon: "calendar" },
      { label: "Add FAQs about financing options and trade-in process", icon: "book" },
    ],
    setupTitle: "your dealership",
  },

  "car-dealership-used": {
    preAnswers: {
      offersFinancing: true,
      offersTradeIn: true,
    },
    setupChecklist: [
      { label: "Add your vehicle inventory categories and pricing ranges", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services"] },
      { label: "Set your lot hours (Mon–Sat for most used car lots)", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add FAQs about financing, certified pre-owned, and inspections", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
      { label: "Connect your calendar for test drives", fixPath: "/app/business-brain?section=availability", icon: "calendar" },
    ],
    nextSteps: [
      { label: "Make a test call — try 'I'm looking for a used pickup truck under $25K'", icon: "phone" },
      { label: "Add your vehicle categories so your AI can match customers", icon: "services" },
      { label: "Add FAQs about financing and warranty options", icon: "book" },
      { label: "Customize your AI's greeting script", icon: "sparkles" },
    ],
    setupTitle: "your used car lot",
  },

  "car-dealership-full": {
    preAnswers: {
      offersFinancing: true,
      offersTradeIn: true,
    },
    setupChecklist: [
      { label: "Add your new and used vehicle categories", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services"] },
      { label: "Set your dealership hours", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add FAQs about new vs. CPO, financing, and service department", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
      { label: "Connect your calendar for sales and service appointments", fixPath: "/app/business-brain?section=availability", icon: "calendar" },
    ],
    nextSteps: [
      { label: "Make a test call — try 'What SUVs do you have available?'", icon: "phone" },
      { label: "Add vehicle categories (new, certified pre-owned, used)", icon: "services" },
      { label: "Add FAQs about financing, trade-ins, and your service department", icon: "book" },
      { label: "Customize your AI's sales approach and greeting", icon: "sparkles" },
    ],
    setupTitle: "your dealership",
  },

  real_estate: {
    preAnswers: {
      offersShowings: true,
    },
    setupChecklist: [
      { label: "Add your listing types and price ranges", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services"] },
      { label: "Set your availability for showings", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add FAQs about your process, buyer consultation, and market areas", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
      { label: "Connect your calendar for showing appointments", fixPath: "/app/business-brain?section=availability", icon: "calendar" },
    ],
    nextSteps: [
      { label: "Make a test call — try 'I'm looking for a 3-bedroom home near good schools'", icon: "phone" },
      { label: "Add your coverage areas and listing types", icon: "services" },
      { label: "Add FAQs about your buyer consultation and the home buying process", icon: "book" },
      { label: "Customize your AI's greeting to match your brand", icon: "sparkles" },
    ],
    setupTitle: "your real estate business",
  },

  // alias: industryCatalog uses "real-estate-agency" slug for sales mode real estate
  "real-estate-agency": {
    preAnswers: {
      offersShowings: true,
    },
    setupChecklist: [
      { label: "Add your listing types and price ranges", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services"] },
      { label: "Set your availability for showings", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add FAQs about your process, buyer consultation, and market areas", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
      { label: "Connect your calendar for showing appointments", fixPath: "/app/business-brain?section=availability", icon: "calendar" },
    ],
    nextSteps: [
      { label: "Make a test call — try 'I'm looking for a 3-bedroom home near good schools'", icon: "phone" },
      { label: "Add your coverage areas and listing types", icon: "services" },
      { label: "Add FAQs about your buyer consultation and the home buying process", icon: "book" },
      { label: "Customize your AI's greeting to match your brand", icon: "sparkles" },
    ],
    setupTitle: "your real estate agency",
  },

  "solar-installer": {
    preAnswers: {
      offersFreeEstimates: true,
    },
    setupChecklist: [
      { label: "Add your solar system types and pricing tiers", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services"] },
      { label: "Set your service area", fixPath: "/app/business-brain?section=service-area", icon: "coverage", flagKeys: ["missing_service_area"] },
      { label: "Set your business hours", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add FAQs about savings, rebates, tax credits, and timeline", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
    ],
    nextSteps: [
      { label: "Make a test call — try 'How much would solar cost for my house?'", icon: "phone" },
      { label: "Add your solar products and installation packages", icon: "services" },
      { label: "Add FAQs about the federal tax credit, payback period, and warranties", icon: "book" },
      { label: "Set your service area so the AI knows where you install", icon: "map" },
    ],
    setupTitle: "your solar company",
  },

  "insurance-agency": {
    preAnswers: {},
    setupChecklist: [
      { label: "Add your insurance products (auto, home, life, commercial)", fixPath: "/app/business-brain?section=services", icon: "services", flagKeys: ["no_services", "few_services"] },
      { label: "Set your office hours", fixPath: "/app/business-brain?section=hours", icon: "hours", flagKeys: ["missing_hours"] },
      { label: "Add FAQs about your products and quoting process", fixPath: "/app/business-brain?section=knowledge", icon: "faqs", flagKeys: ["missing_faqs", "few_faqs"] },
      { label: "Connect your calendar for consultation appointments", fixPath: "/app/business-brain?section=availability", icon: "calendar" },
    ],
    nextSteps: [
      { label: "Make a test call — try 'I need a quote for my business'", icon: "phone" },
      { label: "Add your insurance lines so your AI knows what you offer", icon: "services" },
      { label: "Add FAQs about your quoting process and turnaround time", icon: "book" },
      { label: "Customize your AI's greeting for your agency", icon: "sparkles" },
    ],
    setupTitle: "your insurance agency",
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
  food_hospitality: {
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
