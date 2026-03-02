/**
 * Test Tenant Matrix
 *
 * 21 pre-defined tenant configurations spanning all 5 business modes.
 * Used by the TestTenantManager to seed test tenants with realistic data.
 * Each config references an industry slug from industryCatalog.ts.
 *
 * Custom seed data: Tenants may provide customServices, customFaqs, and
 * customObjections arrays to seed real business data instead of generic placeholders.
 */

import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

export interface CustomService {
  name: string;
  description?: string;
  duration_minutes: number;
  price_amount: number;
  price_type?: "fixed" | "quote_only" | "deposit_based";
  service_category?: string;
  display_order?: number;
}

export interface CustomFaq {
  question: string;
  answer: string;
  priority_weight?: number;
}

export interface CustomObjection {
  objection: string;
  response: string;
  priority_weight?: number;
}

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
  // Optional standalone login credentials (creates a real auth user for the tenant)
  owner_email?: string;
  owner_password?: string;
  // Optional business details
  hours_json?: Record<string, unknown>;
  phone_public?: string;
  website_url?: string;
  tagline?: string;
  cancellation_policy?: string;
  service_area_json?: Record<string, unknown>;
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
    customServices?: CustomService[];
    customFaqs?: CustomFaq[];
    customObjections?: CustomObjection[];
  };
}

// ---------------------------------------------------------------------------
// SERVICE MODE (7 tenants)
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
    tagline: "Fast, reliable HVAC service for Dallas–Fort Worth homes and businesses",
    cancellation_policy: "Please cancel at least 24 hours in advance. Emergency calls are exempt. Same-day cancellation may incur a $49 trip fee.",
    service_area_json: {
      type: "radius",
      center_address: "456 Industrial Blvd, Dallas, TX 75201",
      radius_miles: 30,
      cities: ["Dallas", "Fort Worth", "Arlington", "Plano", "Irving", "Garland", "Frisco", "McKinney"],
    },
    seedData: {
      callCount: 10,
      faqCount: 7,
      serviceCount: 6,
      bookingCount: 4,
      customServices: [
        { name: "AC Tune-Up", description: "Complete AC system inspection, filter replacement, refrigerant check, and performance tune-up", duration_minutes: 60, price_amount: 99, price_type: "fixed", service_category: "maintenance", display_order: 1 },
        { name: "Furnace Inspection", description: "Full furnace safety inspection, filter change, and efficiency check", duration_minutes: 60, price_amount: 89, price_type: "fixed", service_category: "maintenance", display_order: 2 },
        { name: "Full System Service", description: "Complete HVAC system service — AC and heating inspection, cleaning, and calibration", duration_minutes: 120, price_amount: 199, price_type: "fixed", service_category: "maintenance", display_order: 3 },
        { name: "Duct Cleaning", description: "Professional air duct cleaning to improve air quality and system efficiency", duration_minutes: 180, price_amount: 399, price_type: "quote_only", service_category: "cleaning", display_order: 4 },
        { name: "Thermostat Installation", description: "Installation of smart or standard thermostat with full system calibration", duration_minutes: 60, price_amount: 149, price_type: "fixed", service_category: "installation", display_order: 5 },
        { name: "Emergency Repair", description: "Same-day emergency HVAC repair for AC or heating failures", duration_minutes: 120, price_amount: 199, price_type: "quote_only", service_category: "repair", display_order: 6 },
      ],
      customFaqs: [
        { question: "What areas do you service?", answer: "We serve a 30-mile radius from Dallas, covering Fort Worth, Arlington, Plano, Irving, Garland, Frisco, and McKinney.", priority_weight: 10 },
        { question: "Do you offer emergency service?", answer: "Yes! We offer same-day emergency repair for AC and heating failures. Call us anytime and we'll dispatch a technician as soon as possible.", priority_weight: 9 },
        { question: "How much does an AC tune-up cost?", answer: "Our standard AC tune-up is $99 and includes a complete system inspection, filter replacement, and refrigerant check.", priority_weight: 8 },
        { question: "Are you licensed and insured?", answer: "Yes, Cool Comfort HVAC is fully licensed, bonded, and insured in the state of Texas.", priority_weight: 7 },
        { question: "Do you offer financing?", answer: "Yes, we offer flexible financing options for major repairs and new system installations. Ask about our 0% interest plans.", priority_weight: 6 },
        { question: "How often should I service my HVAC system?", answer: "We recommend twice a year — an AC tune-up in spring and a furnace inspection in fall. This prevents breakdowns and keeps your system running efficiently.", priority_weight: 5 },
        { question: "What brands do you work on?", answer: "We service all major brands including Carrier, Trane, Lennox, Rheem, Goodman, and more. Our technicians are factory-trained.", priority_weight: 4 },
      ],
      customObjections: [
        { objection: "That's too expensive", response: "I understand price is important. Our $99 tune-up actually saves most homeowners hundreds by catching problems early. We also offer financing for larger jobs. Would you like a free estimate?", priority_weight: 3 },
        { objection: "I need to think about it", response: "Of course! I can send you a detailed quote to review. Just keep in mind that small HVAC issues can become expensive if left unaddressed. We're here when you're ready.", priority_weight: 2 },
        { objection: "I already have an HVAC company", response: "That's great you're staying on top of maintenance. Many of our customers switched to us because of our same-day emergency response and upfront pricing with no hidden fees. Would you be open to a free second opinion?", priority_weight: 1 },
      ],
    },
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
  {
    slug: "test-lawncare-yurgins",
    name: "Yurgin's Lawn Care LLC",
    address: "449 Bridgeton Pike, Monroeville, NJ 08343",
    timezone: "America/New_York",
    business_mode: "service",
    industry: "landscaping",
    enabled_modules: ["ai_voice", "instant_text_back", "booking", "estimates", "lead_follow_up"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      booking: true,
      estimates: true,
      lead_follow_up: true,
      offersMobileService: true,
      offersSameDayEmergency: false,
      requiresDeposits: false,
      offersWalkIns: false,
      offersPackages: true,
      hasMultipleStaff: false,
    },
    hipaa_mode: false,
    scenario: "Lawn care & landscaping, residential + commercial, seasonal services",
    scenarioTags: ["lawn-care", "landscaping", "seasonal", "estimates", "residential", "commercial"],
    owner_email: "brett@test.com",
    owner_password: "test1234",
    phone_public: "+18565381755",
    website_url: "https://www.yurginslawncare.com/",
    tagline: "Reliable, personalized lawn care for South Jersey homeowners and businesses",
    cancellation_policy: "Please cancel or reschedule at least 24 hours in advance. Same-day cancellations may be subject to a trip fee.",
    hours_json: {
      monday: { closed: false, windows: [{ open: "08:30", close: "17:00" }] },
      tuesday: { closed: false, windows: [{ open: "08:30", close: "17:00" }] },
      wednesday: { closed: false, windows: [{ open: "08:30", close: "17:00" }] },
      thursday: { closed: false, windows: [{ open: "08:30", close: "17:00" }] },
      friday: { closed: false, windows: [{ open: "08:30", close: "17:00" }] },
      saturday: { closed: false, windows: [{ open: "08:30", close: "14:00" }] },
      sunday: { closed: true, windows: [] },
    },
    service_area_json: {
      type: "radius",
      center_address: "449 Bridgeton Pike, Monroeville, NJ 08343",
      radius_miles: 20,
      counties: ["Salem County", "Gloucester County"],
      cities: ["Monroeville", "Clayton", "Pilesgrove", "Woodstown", "Pittsgrove", "Franklinville", "Elmer", "Glassboro", "Swedesboro", "Mullica Hill"],
    },
    communicationPrefs: {
      aiBookingMode: "auto_book",
      missedCallBehavior: "both",
      unknownQuestionBehavior: "offer_callback",
    },
    seedData: {
      callCount: 8,
      faqCount: 10,
      serviceCount: 7,
      bookingCount: 5,
      customServices: [
        { name: "Residential Lawn Mowing", description: "Weekly or bi-weekly mowing for residential properties including edging and blowing", duration_minutes: 45, price_amount: 45, price_type: "fixed", service_category: "lawn_maintenance", display_order: 1 },
        { name: "Commercial Property Mowing", description: "Professional mowing for commercial lots, office parks, and HOA common areas", duration_minutes: 120, price_amount: 150, price_type: "quote_only", service_category: "lawn_maintenance", display_order: 2 },
        { name: "Hedge & Shrub Trimming", description: "Shaping and trimming of hedges, shrubs, and ornamental bushes", duration_minutes: 60, price_amount: 75, price_type: "fixed", service_category: "landscaping", display_order: 3 },
        { name: "Mulch Installation", description: "Delivery and installation of premium mulch for beds and landscaped areas", duration_minutes: 90, price_amount: 85, price_type: "quote_only", service_category: "landscaping", display_order: 4 },
        { name: "Spring Cleanup", description: "Comprehensive spring yard cleanup: debris removal, bed edging, and first mow", duration_minutes: 120, price_amount: 175, price_type: "fixed", service_category: "seasonal", display_order: 5 },
        { name: "Fall Cleanup & Leaf Removal", description: "Full leaf removal, gutter clearing, and winterization prep for your yard", duration_minutes: 120, price_amount: 200, price_type: "fixed", service_category: "seasonal", display_order: 6 },
        { name: "Lawn Fertilization", description: "Professional-grade fertilizer application to promote healthy, green growth", duration_minutes: 30, price_amount: 55, price_type: "fixed", service_category: "lawn_maintenance", display_order: 7 },
      ],
      customFaqs: [
        { question: "What areas do you service?", answer: "We serve a 20-mile radius from Monroeville, NJ, covering Salem County and Gloucester County — including Clayton, Pilesgrove, Woodstown, Pittsgrove, Franklinville, Elmer, Glassboro, Swedesboro, and Mullica Hill.", priority_weight: 10 },
        { question: "What are your hours?", answer: "We're available Monday through Friday from 8:30 AM to 5:00 PM and Saturdays from 8:30 AM to 2:00 PM. We're closed on Sundays.", priority_weight: 9 },
        { question: "Do you offer free estimates?", answer: "Yes! We offer free on-site estimates for all of our services. Just give us a call or book online and we'll come out to assess your property.", priority_weight: 8 },
        { question: "Do you service both residential and commercial properties?", answer: "Absolutely. We handle residential lawns of all sizes as well as commercial properties, office parks, and HOA common areas.", priority_weight: 7 },
        { question: "How often should I have my lawn mowed?", answer: "During the growing season, we recommend weekly mowing. We also offer bi-weekly plans for customers who prefer less frequent service.", priority_weight: 6 },
        { question: "What forms of payment do you accept?", answer: "We accept cash, checks, and all major credit cards. We can also set up recurring billing for regular service customers.", priority_weight: 5 },
        { question: "Are you licensed and insured?", answer: "Yes, Yurgin's Lawn Care is fully licensed and insured for your peace of mind.", priority_weight: 4 },
        { question: "What happens if it rains on my scheduled day?", answer: "If rain prevents us from completing your service, we'll reschedule for the next available day at no extra charge.", priority_weight: 3 },
        { question: "Do you offer seasonal packages?", answer: "Yes! We offer spring cleanup, fall cleanup, and recurring maintenance packages. Ask us about bundling services for a discount.", priority_weight: 2 },
        { question: "What is your cancellation policy?", answer: "Please cancel or reschedule at least 24 hours in advance. Same-day cancellations may be subject to a trip fee.", priority_weight: 1 },
      ],
      customObjections: [
        { objection: "That's too expensive", response: "I understand budget is important. Our pricing reflects the quality of work and reliability we bring. We also offer package deals — for example, bundling mowing with seasonal cleanups saves most customers 10-15%. Can I put together a custom quote for your property?", priority_weight: 5 },
        { objection: "I need to think about it", response: "Of course, take your time. I can send you a written estimate so you have all the details. Our schedule does fill up, especially heading into spring, so I'd recommend locking in a spot soon to get your preferred day.", priority_weight: 4 },
        { objection: "I already have a lawn care company", response: "That's great that you're already keeping up with your property. A lot of our customers switched to us because we show up on time, every time, and we're a local South Jersey company — not a big franchise. Would you be open to a free estimate just to compare?", priority_weight: 3 },
        { objection: "I can just do it myself", response: "Totally understand — and some folks enjoy yard work. But between the time, equipment costs, and the summer heat, a lot of homeowners find it's worth having us handle it so they can enjoy their weekends. We can start with just mowing and see how it goes.", priority_weight: 2 },
        { objection: "Can you give me a discount?", response: "We keep our prices fair for the quality we deliver, but we do offer multi-service discounts. If you bundle regular mowing with seasonal cleanups, I can usually save you 10-15%. Want me to put together a package price?", priority_weight: 1 },
      ],
    },
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
// SALES MODE (2 tenants)
// ---------------------------------------------------------------------------

const salesTenants: TestTenantConfig[] = [
  {
    slug: "test-car-dealership",
    name: "Prestige Auto Group",
    address: "1500 Auto Mall Dr, Plano, TX 75093",
    timezone: "America/Chicago",
    business_mode: "sales",
    industry: "car-dealership-full",
    enabled_modules: ["ai_voice", "instant_text_back", "sales_leads", "test_drives", "booking", "sales_inventory"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      sales_leads: true,
      test_drives: true,
      booking: true,
      sales_inventory: true,
      offersFinancing: true,
      acceptsTradeIns: true,
      hasSalesTeam: true,
      hasCRMIntegration: false,
    },
    hipaa_mode: false,
    scenario: "Full-service car dealership, new + used, financing, trade-ins, inventory",
    scenarioTags: ["dealership", "test-drives", "financing", "trade-in", "inventory"],
    communicationPrefs: {
      aiBookingMode: "auto_book",
      missedCallBehavior: "both",
      unknownQuestionBehavior: "try_help",
    },
    seedData: { callCount: 10, faqCount: 6, serviceCount: 5, bookingCount: 4 },
  },
  {
    slug: "test-real-estate",
    name: "Summit Realty Partners",
    address: "800 Realtor Ave, Scottsdale, AZ 85251",
    timezone: "America/Phoenix",
    business_mode: "sales",
    industry: "real-estate-agency",
    enabled_modules: ["ai_voice", "instant_text_back", "sales_leads", "booking"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      sales_leads: true,
      booking: true,
      offersFinancing: false,
      acceptsTradeIns: false,
      hasSalesTeam: true,
      hasCRMIntegration: false,
    },
    hipaa_mode: false,
    scenario: "Real estate agency, showings as bookings, lead qualification",
    scenarioTags: ["real-estate", "showings", "leads"],
    communicationPrefs: {
      aiBookingMode: "auto_book",
      missedCallBehavior: "both",
      unknownQuestionBehavior: "offer_callback",
    },
    seedData: { callCount: 8, faqCount: 5, serviceCount: 4, bookingCount: 3 },
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
  ...salesTenants,
];

/** Group tenants by mode for display */
export function getTestTenantsByMode(): Record<BusinessMode, TestTenantConfig[]> {
  return {
    service: serviceTenants,
    dispatch: dispatchTenants,
    food: foodTenants,
    medical: medicalTenants,
    general: generalTenants,
    sales: salesTenants,
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
