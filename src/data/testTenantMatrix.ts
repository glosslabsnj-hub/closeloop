/**
 * Test Tenant Matrix
 *
 * 19 pre-defined tenant configurations spanning all 5 business modes.
 * Used by the TestTenantManager to seed test tenants with realistic data.
 * Each config references an industry slug from industryCatalog.ts.
 */

import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

export interface TestTenantConfig {
  slug: string;
  name: string;
  address: string;
  timezone: string;
  business_mode: BusinessMode;
  industry: string; // industry catalog slug
  enabled_modules: string[];
  capabilities_json: Record<string, boolean>;
  hipaa_mode: boolean;
  scenario: string;
  scenarioTags: string[];
  communicationPrefs: {
    aiBookingMode: string;
    missedCallBehavior: string;
    unknownQuestionBehavior: string;
  };
  seedData: {
    callCount: number;
    faqCount: number;
    serviceCount: number;
    bookingCount?: number;
    orderCount?: number;
    dispatchJobCount?: number;
    intakeCount?: number;
  };
}

// ---------------------------------------------------------------------------
// SERVICE MODE (6 tenants)
// ---------------------------------------------------------------------------

const serviceTenants: TestTenantConfig[] = [
  {
    slug: "test-salon-basic",
    name: "Luxe Hair Studio",
    address: "123 Main St, Beverly Hills, CA 90210",
    timezone: "America/Los_Angeles",
    business_mode: "service",
    industry: "salon",
    enabled_modules: ["ai_voice", "instant_text_back", "booking", "review_requests"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      booking: true,
      review_requests: true,
      offersWalkIns: true,
      offersMobileService: false,
      offersSameDayEmergency: false,
      requiresDeposits: false,
      collectsStylistPreference: true,
      hasMultipleStaff: true,
    },
    hipaa_mode: false,
    scenario: "Hair salon, walk-ins + appointments, stylist preference",
    scenarioTags: ["appointments", "walk-ins", "stylist-pref"],
    communicationPrefs: {
      aiBookingMode: "auto_book",
      missedCallBehavior: "text_only",
      unknownQuestionBehavior: "try_help",
    },
    seedData: { callCount: 8, faqCount: 6, serviceCount: 8, bookingCount: 5 },
  },
  {
    slug: "test-hvac-emergency",
    name: "Cool Comfort HVAC",
    address: "456 Industrial Blvd, Dallas, TX 75201",
    timezone: "America/Chicago",
    business_mode: "service",
    industry: "hvac",
    enabled_modules: ["ai_voice", "instant_text_back", "booking", "estimates", "lead_follow_up"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      booking: true,
      estimates: true,
      lead_follow_up: true,
      offersMobileService: true,
      offersSameDayEmergency: true,
      requiresDeposits: false,
      offersWalkIns: false,
      requiresWarrantyCheck: true,
    },
    hipaa_mode: false,
    scenario: "HVAC, same-day emergency, 30mi service area, warranty checks",
    scenarioTags: ["emergency", "mobile", "estimates", "warranty"],
    communicationPrefs: {
      aiBookingMode: "auto_book",
      missedCallBehavior: "both",
      unknownQuestionBehavior: "offer_callback",
    },
    seedData: { callCount: 10, faqCount: 7, serviceCount: 6, bookingCount: 4 },
  },
  {
    slug: "test-plumber-mobile",
    name: "Mobile Pro Plumbing",
    address: "789 Service Rd, Phoenix, AZ 85001",
    timezone: "America/Phoenix",
    business_mode: "service",
    industry: "plumbing",
    enabled_modules: ["ai_voice", "instant_text_back", "booking", "estimates"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      booking: true,
      estimates: true,
      offersMobileService: true,
      offersSameDayEmergency: true,
      requiresDeposits: false,
      offersWalkIns: false,
    },
    hipaa_mode: false,
    scenario: "Mobile-only plumber, zip code service area",
    scenarioTags: ["mobile-only", "emergency", "estimates"],
    communicationPrefs: {
      aiBookingMode: "auto_book",
      missedCallBehavior: "both",
      unknownQuestionBehavior: "offer_callback",
    },
    seedData: { callCount: 7, faqCount: 5, serviceCount: 5, bookingCount: 3 },
  },
  {
    slug: "test-detailing-deposits",
    name: "Elite Shine Detailing",
    address: "321 Auto Row, Miami, FL 33101",
    timezone: "America/New_York",
    business_mode: "service",
    industry: "auto_detailing",
    enabled_modules: ["ai_voice", "instant_text_back", "booking", "payment_processing"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      booking: true,
      payment_processing: true,
      requiresDeposits: true,
      offersMobileService: true,
      offersSameDayEmergency: false,
      offersWalkIns: false,
      offersPackages: true,
    },
    hipaa_mode: false,
    scenario: "Auto detailing, deposits required on all services, packages",
    scenarioTags: ["deposits", "mobile", "packages"],
    communicationPrefs: {
      aiBookingMode: "pending_approval",
      missedCallBehavior: "text_only",
      unknownQuestionBehavior: "try_help",
    },
    seedData: { callCount: 6, faqCount: 5, serviceCount: 7, bookingCount: 3 },
  },
  {
    slug: "test-cleaning-recurring",
    name: "Pristine Cleaning Co",
    address: "555 Clean Ave, Chicago, IL 60601",
    timezone: "America/Chicago",
    business_mode: "service",
    industry: "cleaning",
    enabled_modules: ["ai_voice", "instant_text_back", "booking", "estimates", "packages"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      booking: true,
      estimates: true,
      packages: true,
      offersMobileService: true,
      offersSameDayEmergency: false,
      requiresDeposits: false,
      offersWalkIns: false,
      offersPackages: true,
      hasMultipleStaff: true,
    },
    hipaa_mode: false,
    scenario: "Cleaning company, recurring service packages, multiple staff",
    scenarioTags: ["recurring", "packages", "teams"],
    communicationPrefs: {
      aiBookingMode: "auto_book",
      missedCallBehavior: "text_only",
      unknownQuestionBehavior: "try_help",
    },
    seedData: { callCount: 5, faqCount: 6, serviceCount: 6, bookingCount: 4 },
  },
  {
    slug: "test-consultant-callback",
    name: "Apex Consulting Group",
    address: "100 Business Center Dr, New York, NY 10001",
    timezone: "America/New_York",
    business_mode: "service",
    industry: "accounting",
    enabled_modules: ["ai_voice", "instant_text_back", "booking", "lead_follow_up"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      booking: true,
      lead_follow_up: true,
      offersMobileService: false,
      offersSameDayEmergency: false,
      requiresDeposits: false,
      offersWalkIns: false,
    },
    hipaa_mode: false,
    scenario: "Consulting firm, callback-first, no instant booking",
    scenarioTags: ["callback-first", "professional"],
    communicationPrefs: {
      aiBookingMode: "callback_only",
      missedCallBehavior: "ai_callback",
      unknownQuestionBehavior: "offer_callback",
    },
    seedData: { callCount: 5, faqCount: 8, serviceCount: 4, bookingCount: 2 },
  },
];

// ---------------------------------------------------------------------------
// DISPATCH MODE (4 tenants)
// ---------------------------------------------------------------------------

const dispatchTenants: TestTenantConfig[] = [
  {
    slug: "test-towing-basic",
    name: "Metro Tow & Recovery",
    address: "200 Tow Yard Ln, Houston, TX 77001",
    timezone: "America/Chicago",
    business_mode: "dispatch",
    industry: "towing",
    enabled_modules: ["ai_voice", "instant_text_back", "dispatch_queue", "pricing_rules", "eta_tracking"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      dispatch_queue: true,
      pricing_rules: true,
      eta_tracking: true,
      hasImpoundLot: false,
      offersMotorClub: true,
      hasFleet: true,
      needsDistancePricing: true,
      offersRecovery: true,
      offersPhoneQuotes: true,
    },
    hipaa_mode: false,
    scenario: "Standard towing + recovery, no impound lot, fleet managed",
    scenarioTags: ["towing", "recovery", "fleet", "no-impound"],
    communicationPrefs: {
      aiBookingMode: "auto_book",
      missedCallBehavior: "both",
      unknownQuestionBehavior: "try_help",
    },
    seedData: { callCount: 10, faqCount: 5, serviceCount: 5, dispatchJobCount: 6 },
  },
  {
    slug: "test-towing-impound",
    name: "City Impound Services",
    address: "900 Storage Blvd, Atlanta, GA 30301",
    timezone: "America/New_York",
    business_mode: "dispatch",
    industry: "towing",
    enabled_modules: ["ai_voice", "instant_text_back", "dispatch_queue", "impound_lot", "police_impound", "ppi_towing", "pricing_rules"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      dispatch_queue: true,
      impound_lot: true,
      police_impound: true,
      ppi_towing: true,
      pricing_rules: true,
      hasImpoundLot: true,
      handlesPoliceImpound: true,
      handlesPPITowing: true,
      offersMotorClub: false,
      hasFleet: true,
      needsDistancePricing: true,
      offersPhoneQuotes: true,
    },
    hipaa_mode: false,
    scenario: "Impound lot + police holds + PPI towing, full fleet",
    scenarioTags: ["impound", "police", "ppi", "fleet"],
    communicationPrefs: {
      aiBookingMode: "auto_book",
      missedCallBehavior: "both",
      unknownQuestionBehavior: "try_help",
    },
    seedData: { callCount: 8, faqCount: 6, serviceCount: 6, dispatchJobCount: 8 },
  },
  {
    slug: "test-roadside-only",
    name: "Quick Roadside Assist",
    address: "444 Highway Ln, Denver, CO 80201",
    timezone: "America/Denver",
    business_mode: "dispatch",
    industry: "roadside_assistance",
    enabled_modules: ["ai_voice", "instant_text_back", "dispatch_queue", "eta_tracking"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      dispatch_queue: true,
      eta_tracking: true,
      hasImpoundLot: false,
      offersMotorClub: true,
      hasFleet: false,
      needsDistancePricing: false,
      offersRecovery: false,
      offersPhoneQuotes: true,
    },
    hipaa_mode: false,
    scenario: "Roadside only, no towing, motor club partner",
    scenarioTags: ["roadside-only", "motor-club"],
    communicationPrefs: {
      aiBookingMode: "auto_book",
      missedCallBehavior: "text_only",
      unknownQuestionBehavior: "try_help",
    },
    seedData: { callCount: 7, faqCount: 5, serviceCount: 4, dispatchJobCount: 5 },
  },
  {
    slug: "test-courier-delivery",
    name: "Swift City Courier",
    address: "111 Express Way, San Francisco, CA 94101",
    timezone: "America/Los_Angeles",
    business_mode: "dispatch",
    industry: "courier",
    enabled_modules: ["ai_voice", "instant_text_back", "dispatch_queue", "eta_tracking", "pricing_rules"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      dispatch_queue: true,
      eta_tracking: true,
      pricing_rules: true,
      hasImpoundLot: false,
      offersMotorClub: false,
      hasFleet: true,
      needsDistancePricing: true,
      offersPhoneQuotes: true,
    },
    hipaa_mode: false,
    scenario: "Delivery/pickup courier model, distance pricing",
    scenarioTags: ["courier", "delivery", "fleet"],
    communicationPrefs: {
      aiBookingMode: "auto_book",
      missedCallBehavior: "text_only",
      unknownQuestionBehavior: "try_help",
    },
    seedData: { callCount: 6, faqCount: 5, serviceCount: 4, dispatchJobCount: 5 },
  },
];

// ---------------------------------------------------------------------------
// FOOD MODE (4 tenants)
// ---------------------------------------------------------------------------

const foodTenants: TestTenantConfig[] = [
  {
    slug: "test-restaurant-dinein",
    name: "The Golden Plate",
    address: "50 Restaurant Row, New York, NY 10012",
    timezone: "America/New_York",
    business_mode: "food",
    industry: "restaurant",
    enabled_modules: ["ai_voice", "instant_text_back", "food_orders", "menu_knowledge", "reservations"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      food_orders: true,
      menu_knowledge: true,
      reservations: true,
      offersDelivery: false,
      offersCatering: false,
      offersReservations: true,
      collectsDietaryRestrictions: true,
    },
    hipaa_mode: false,
    scenario: "Dine-in restaurant + reservations, no delivery",
    scenarioTags: ["dine-in", "reservations", "dietary"],
    communicationPrefs: {
      aiBookingMode: "auto_book",
      missedCallBehavior: "text_only",
      unknownQuestionBehavior: "try_help",
    },
    seedData: { callCount: 8, faqCount: 5, serviceCount: 3, orderCount: 6 },
  },
  {
    slug: "test-restaurant-full",
    name: "Mama Rosa's Kitchen",
    address: "75 Italian Way, Boston, MA 02101",
    timezone: "America/New_York",
    business_mode: "food",
    industry: "restaurant",
    enabled_modules: ["ai_voice", "instant_text_back", "food_orders", "menu_knowledge", "reservations", "catering"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      food_orders: true,
      menu_knowledge: true,
      reservations: true,
      catering: true,
      offersDelivery: true,
      offersCatering: true,
      offersReservations: true,
      offersCurbside: true,
      collectsDietaryRestrictions: true,
    },
    hipaa_mode: false,
    scenario: "Full-service: delivery + pickup + catering + curbside",
    scenarioTags: ["delivery", "pickup", "catering", "curbside", "full-service"],
    communicationPrefs: {
      aiBookingMode: "auto_book",
      missedCallBehavior: "text_only",
      unknownQuestionBehavior: "try_help",
    },
    seedData: { callCount: 10, faqCount: 6, serviceCount: 4, orderCount: 10 },
  },
  {
    slug: "test-pizzeria-quick",
    name: "Slice House Pizza",
    address: "222 Pizza Pl, Philadelphia, PA 19101",
    timezone: "America/New_York",
    business_mode: "food",
    industry: "pizzeria",
    enabled_modules: ["ai_voice", "instant_text_back", "food_orders", "menu_knowledge"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      food_orders: true,
      menu_knowledge: true,
      offersDelivery: true,
      offersCatering: false,
      offersReservations: false,
      offersCurbside: false,
    },
    hipaa_mode: false,
    scenario: "Quick service pizzeria, pickup + delivery only",
    scenarioTags: ["quick-service", "delivery", "pickup"],
    communicationPrefs: {
      aiBookingMode: "auto_book",
      missedCallBehavior: "text_only",
      unknownQuestionBehavior: "try_help",
    },
    seedData: { callCount: 8, faqCount: 4, serviceCount: 3, orderCount: 8 },
  },
  {
    slug: "test-catering-company",
    name: "Grand Events Catering",
    address: "500 Event Center Dr, Las Vegas, NV 89101",
    timezone: "America/Los_Angeles",
    business_mode: "food",
    industry: "catering_service",
    enabled_modules: ["ai_voice", "instant_text_back", "food_orders", "menu_knowledge", "catering"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      food_orders: true,
      menu_knowledge: true,
      catering: true,
      offersDelivery: true,
      offersCatering: true,
      offersReservations: false,
      collectsDietaryRestrictions: true,
    },
    hipaa_mode: false,
    scenario: "Catering-focused, no dine-in, event packages",
    scenarioTags: ["catering-focused", "events", "dietary"],
    communicationPrefs: {
      aiBookingMode: "pending_approval",
      missedCallBehavior: "ai_callback",
      unknownQuestionBehavior: "offer_callback",
    },
    seedData: { callCount: 5, faqCount: 6, serviceCount: 4, orderCount: 4 },
  },
];

// ---------------------------------------------------------------------------
// MEDICAL MODE (3 tenants)
// ---------------------------------------------------------------------------

const medicalTenants: TestTenantConfig[] = [
  {
    slug: "test-medspa",
    name: "Radiance MedSpa",
    address: "800 Beauty Blvd, Scottsdale, AZ 85251",
    timezone: "America/Phoenix",
    business_mode: "medical",
    industry: "medspa",
    enabled_modules: ["ai_voice", "instant_text_back", "booking", "medical_intake", "payment_processing"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      booking: true,
      medical_intake: true,
      payment_processing: true,
      requiresHIPAA: true,
      hasTelehealth: false,
      requiresInsurance: false,
      requiresDeposits: true,
      requiresNewPatientForms: true,
      needsSymptomTriage: false,
    },
    hipaa_mode: true,
    scenario: "Cosmetic medspa, deposits required, no insurance",
    scenarioTags: ["cosmetic", "deposits", "no-insurance"],
    communicationPrefs: {
      aiBookingMode: "pending_approval",
      missedCallBehavior: "text_only",
      unknownQuestionBehavior: "try_help",
    },
    seedData: { callCount: 6, faqCount: 6, serviceCount: 8, bookingCount: 4, intakeCount: 3 },
  },
  {
    slug: "test-clinic",
    name: "Sunrise Family Care",
    address: "300 Health Park Dr, Orlando, FL 32801",
    timezone: "America/New_York",
    business_mode: "medical",
    industry: "primary_care",
    enabled_modules: ["ai_voice", "instant_text_back", "booking", "medical_intake", "new_patient_forms", "referrals"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      booking: true,
      medical_intake: true,
      new_patient_forms: true,
      referrals: true,
      requiresHIPAA: true,
      hasTelehealth: true,
      requiresInsurance: true,
      requiresNewPatientForms: true,
      collectsReferralInfo: true,
      collectsMedications: true,
      needsSymptomTriage: true,
    },
    hipaa_mode: true,
    scenario: "Primary care, insurance verification, new patient intake, referrals",
    scenarioTags: ["insurance", "new-patient", "referrals", "telehealth"],
    communicationPrefs: {
      aiBookingMode: "auto_book",
      missedCallBehavior: "both",
      unknownQuestionBehavior: "offer_callback",
    },
    seedData: { callCount: 10, faqCount: 8, serviceCount: 6, bookingCount: 6, intakeCount: 5 },
  },
  {
    slug: "test-therapy",
    name: "Mindful Wellness Center",
    address: "150 Serenity Ln, Portland, OR 97201",
    timezone: "America/Los_Angeles",
    business_mode: "medical",
    industry: "mental_health",
    enabled_modules: ["ai_voice", "instant_text_back", "booking", "medical_intake", "new_patient_forms"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      booking: true,
      medical_intake: true,
      new_patient_forms: true,
      requiresHIPAA: true,
      hasTelehealth: true,
      requiresInsurance: true,
      requiresNewPatientForms: true,
      collectsMedications: true,
      needsSymptomTriage: false,
    },
    hipaa_mode: true,
    scenario: "Mental health practice, telehealth-first, HIPAA",
    scenarioTags: ["telehealth-first", "mental-health", "hipaa"],
    communicationPrefs: {
      aiBookingMode: "auto_book",
      missedCallBehavior: "text_only",
      unknownQuestionBehavior: "offer_callback",
    },
    seedData: { callCount: 7, faqCount: 7, serviceCount: 5, bookingCount: 5, intakeCount: 4 },
  },
];

// ---------------------------------------------------------------------------
// GENERAL MODE (2 tenants)
// ---------------------------------------------------------------------------

const generalTenants: TestTenantConfig[] = [
  {
    slug: "test-consulting",
    name: "Summit Advisory Group",
    address: "1000 Corporate Park, Seattle, WA 98101",
    timezone: "America/Los_Angeles",
    business_mode: "general",
    industry: "other",
    enabled_modules: ["ai_voice", "instant_text_back", "lead_follow_up", "knowledge_base"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      lead_follow_up: true,
      knowledge_base: true,
      offersAppointments: false,
      offersCallbacks: true,
      handlesFAQs: true,
    },
    hipaa_mode: false,
    scenario: "Consulting firm, callback-first, no booking",
    scenarioTags: ["callback-first", "no-booking", "faq"],
    communicationPrefs: {
      aiBookingMode: "callback_only",
      missedCallBehavior: "ai_callback",
      unknownQuestionBehavior: "offer_callback",
    },
    seedData: { callCount: 5, faqCount: 8, serviceCount: 3 },
  },
  {
    slug: "test-general-booking",
    name: "ProServe Solutions",
    address: "250 Business Way, Austin, TX 78701",
    timezone: "America/Chicago",
    business_mode: "general",
    industry: "other",
    enabled_modules: ["ai_voice", "instant_text_back", "booking", "knowledge_base", "lead_follow_up"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      booking: true,
      knowledge_base: true,
      lead_follow_up: true,
      offersAppointments: true,
      offersCallbacks: true,
      handlesFAQs: true,
    },
    hipaa_mode: false,
    scenario: "General business with booking enabled + FAQ",
    scenarioTags: ["booking", "faq", "leads"],
    communicationPrefs: {
      aiBookingMode: "auto_book",
      missedCallBehavior: "text_only",
      unknownQuestionBehavior: "try_help",
    },
    seedData: { callCount: 6, faqCount: 6, serviceCount: 4, bookingCount: 3 },
  },
];

// ---------------------------------------------------------------------------
// Full matrix
// ---------------------------------------------------------------------------

export const TEST_TENANT_MATRIX: TestTenantConfig[] = [
  ...serviceTenants,
  ...dispatchTenants,
  ...foodTenants,
  ...medicalTenants,
  ...generalTenants,
];

/** Group tenants by mode for display */
export function getTestTenantsByMode(): Record<BusinessMode, TestTenantConfig[]> {
  return {
    service: serviceTenants,
    dispatch: dispatchTenants,
    food: foodTenants,
    medical: medicalTenants,
    general: generalTenants,
  };
}

/** Find a test tenant config by slug */
export function getTestTenantBySlug(slug: string): TestTenantConfig | undefined {
  return TEST_TENANT_MATRIX.find((t) => t.slug === slug);
}

/** Check if a tenant name matches a known test tenant */
export function isTestTenantName(name: string): boolean {
  return TEST_TENANT_MATRIX.some((t) => t.name === name);
}

/** Get the test tenant config for a given tenant name */
export function getTestTenantByName(name: string): TestTenantConfig | undefined {
  return TEST_TENANT_MATRIX.find((t) => t.name === name);
}
