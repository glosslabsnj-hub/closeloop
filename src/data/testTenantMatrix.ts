/**
 * Test Tenant Matrix
 *
 * 22 pre-defined tenant configurations spanning all 5 business modes.
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
// SERVICE MODE (9 tenants)
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
    seedData: {
      callCount: 8,
      faqCount: 6,
      serviceCount: 8,
      bookingCount: 5,
      customServices: [
        { name: "Haircut", description: "Professional haircut tailored to your style and preferences", duration_minutes: 30, price_amount: 35, price_type: "fixed", service_category: "cuts", display_order: 1 },
        { name: "Hair Color", description: "Full color service including consultation, application, and styling", duration_minutes: 120, price_amount: 100, price_type: "fixed", service_category: "color", display_order: 2 },
        { name: "Highlights", description: "Partial or full highlights with foil or balayage technique", duration_minutes: 150, price_amount: 150, price_type: "fixed", service_category: "color", display_order: 3 },
        { name: "Blowout", description: "Shampoo and professional blowout styling", duration_minutes: 45, price_amount: 50, price_type: "fixed", service_category: "styling", display_order: 4 },
        { name: "Beard Trim", description: "Precision beard trim and shaping", duration_minutes: 15, price_amount: 15, price_type: "fixed", service_category: "grooming", display_order: 5 },
        { name: "Hair Treatment", description: "Deep conditioning or keratin treatment for healthier hair", duration_minutes: 60, price_amount: 75, price_type: "fixed", service_category: "treatments", display_order: 6 },
        { name: "Extensions", description: "Professional hair extension installation and blending", duration_minutes: 180, price_amount: 300, price_type: "quote_only", service_category: "extensions", display_order: 7 },
        { name: "Bridal Styling", description: "Trial run and day-of bridal hair styling", duration_minutes: 90, price_amount: 200, price_type: "fixed", service_category: "special", display_order: 8 },
      ],
      customFaqs: [
        { question: "Do I need an appointment?", answer: "Appointments are recommended but we do accept walk-ins based on availability. Booking ahead guarantees your spot with your preferred stylist.", priority_weight: 10 },
        { question: "Can I request a specific stylist?", answer: "Absolutely! When you book, just let us know which stylist you prefer and we'll schedule you with them.", priority_weight: 9 },
        { question: "What is your cancellation policy?", answer: "We ask for at least 24 hours notice for cancellations. Late cancellations or no-shows may be charged a fee.", priority_weight: 8 },
        { question: "Do you offer color corrections?", answer: "Yes, we offer color correction services. These require a consultation first so we can assess your hair and give you an accurate quote.", priority_weight: 7 },
        { question: "What forms of payment do you accept?", answer: "We accept all major credit cards, debit cards, Apple Pay, and cash.", priority_weight: 6 },
        { question: "Do you offer bridal or event styling?", answer: "Yes! We offer bridal and special event styling. We recommend booking a trial run at least a month before your event.", priority_weight: 5 },
      ],
    },
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
      faqCount: 8,
      serviceCount: 12,
      bookingCount: 4,
      customServices: [
        { name: "AC Repair", description: "Diagnose and repair AC issues — refrigerant leaks, compressor failure, fan motors, capacitors, and frozen coils", duration_minutes: 90, price_amount: 149, price_type: "quote_only", service_category: "repair", display_order: 1 },
        { name: "Furnace Repair", description: "Diagnose and repair furnace problems — ignitor, blower motor, heat exchanger, gas valve, and pilot light issues", duration_minutes: 90, price_amount: 149, price_type: "quote_only", service_category: "repair", display_order: 2 },
        { name: "AC Tune-Up", description: "Complete AC system inspection, filter replacement, refrigerant check, and performance tune-up", duration_minutes: 60, price_amount: 99, price_type: "fixed", service_category: "maintenance", display_order: 3 },
        { name: "Furnace Inspection", description: "Full furnace safety inspection, filter change, and efficiency check", duration_minutes: 60, price_amount: 89, price_type: "fixed", service_category: "maintenance", display_order: 4 },
        { name: "Full System Service", description: "Complete HVAC system service — AC and heating inspection, cleaning, and calibration", duration_minutes: 120, price_amount: 199, price_type: "fixed", service_category: "maintenance", display_order: 5 },
        { name: "AC Installation", description: "Full central air conditioning system installation — includes removal of old unit, new condenser and evaporator coil, refrigerant lines, and thermostat setup", duration_minutes: 480, price_amount: 3500, price_type: "quote_only", service_category: "installation", display_order: 6 },
        { name: "Furnace Installation", description: "Complete furnace replacement or new installation — gas or electric, includes ductwork connection, venting, and safety testing", duration_minutes: 480, price_amount: 3000, price_type: "quote_only", service_category: "installation", display_order: 7 },
        { name: "Mini-Split Installation", description: "Ductless mini-split heat pump installation — single or multi-zone, wall-mounted indoor units with outdoor condenser", duration_minutes: 360, price_amount: 2500, price_type: "quote_only", service_category: "installation", display_order: 8 },
        { name: "Heat Pump Service", description: "Heat pump inspection, cleaning, and performance check — covers both heating and cooling modes", duration_minutes: 90, price_amount: 129, price_type: "fixed", service_category: "maintenance", display_order: 9 },
        { name: "Duct Cleaning", description: "Professional air duct cleaning to improve air quality and system efficiency", duration_minutes: 180, price_amount: 399, price_type: "quote_only", service_category: "cleaning", display_order: 10 },
        { name: "Thermostat Installation", description: "Installation of smart or standard thermostat with full system calibration", duration_minutes: 60, price_amount: 149, price_type: "fixed", service_category: "installation", display_order: 11 },
        { name: "Emergency Repair", description: "Same-day emergency HVAC repair for AC or heating failures — available 7 days a week", duration_minutes: 120, price_amount: 199, price_type: "quote_only", service_category: "repair", display_order: 12 },
      ],
      customFaqs: [
        { question: "What areas do you service?", answer: "We serve a 30-mile radius from Dallas, covering Fort Worth, Arlington, Plano, Irving, Garland, Frisco, and McKinney.", priority_weight: 10 },
        { question: "Do you offer emergency service?", answer: "Yes! We offer same-day emergency repair for AC and heating failures. Call us anytime and we'll dispatch a technician as soon as possible.", priority_weight: 9 },
        { question: "How much does an AC tune-up cost?", answer: "Our standard AC tune-up is $99 and includes a complete system inspection, filter replacement, and refrigerant check.", priority_weight: 8 },
        { question: "Are you licensed and insured?", answer: "Yes, Cool Comfort HVAC is fully licensed, bonded, and insured in the state of Texas.", priority_weight: 7 },
        { question: "Do you offer financing for major jobs?", answer: "Yes, we offer flexible financing through GreenSky and Wells Fargo for system replacements and major repairs. Options include 0% interest for 12 months or low monthly payments up to 72 months. Ask for details when scheduling your free estimate.", priority_weight: 6 },
        { question: "Do you offer a maintenance plan?", answer: "Yes! Our Comfort Club plan is $14.99/month and includes two annual tune-ups (AC in spring, furnace in fall), priority scheduling, 15% off repairs, and no overtime charges. Members catch problems early and save an average of $300/year.", priority_weight: 5 },
        { question: "How often should I service my HVAC system?", answer: "We recommend twice a year — an AC tune-up in spring and a furnace inspection in fall. This prevents breakdowns and keeps your system running efficiently.", priority_weight: 4 },
        { question: "What brands do you work on?", answer: "We service all major brands including Carrier, Trane, Lennox, Rheem, Goodman, and more. Our technicians are factory-trained.", priority_weight: 3 },
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
    seedData: {
      callCount: 7,
      faqCount: 5,
      serviceCount: 5,
      bookingCount: 3,
      customServices: [
        { name: "Drain Cleaning", description: "Professional drain clearing for kitchen, bathroom, or main sewer line", duration_minutes: 60, price_amount: 149, price_type: "fixed", service_category: "drain", display_order: 1 },
        { name: "Leak Detection", description: "Non-invasive leak detection using electronic equipment", duration_minutes: 60, price_amount: 99, price_type: "fixed", service_category: "diagnostic", display_order: 2 },
        { name: "Water Heater Repair", description: "Diagnosis and repair of gas or electric water heaters", duration_minutes: 120, price_amount: 299, price_type: "quote_only", service_category: "repair", display_order: 3 },
        { name: "Faucet Installation", description: "Removal and installation of new faucets in kitchen or bathroom", duration_minutes: 60, price_amount: 149, price_type: "fixed", service_category: "installation", display_order: 4 },
        { name: "Emergency Service", description: "After-hours emergency plumbing repair for burst pipes, major leaks, or backups", duration_minutes: 60, price_amount: 199, price_type: "quote_only", service_category: "emergency", display_order: 5 },
      ],
      customFaqs: [
        { question: "What areas do you service?", answer: "We serve the greater Phoenix metro area within a 25-mile radius.", priority_weight: 10 },
        { question: "Do you offer emergency service?", answer: "Yes! We offer emergency plumbing service for burst pipes, major leaks, and sewer backups. Additional fees may apply for after-hours calls.", priority_weight: 9 },
        { question: "Do you provide free estimates?", answer: "We provide free estimates for most jobs. For diagnostic work, there may be a small fee that is waived if you proceed with the repair.", priority_weight: 8 },
        { question: "Are you licensed and insured?", answer: "Yes, Mobile Pro Plumbing is fully licensed, bonded, and insured in the state of Arizona.", priority_weight: 7 },
        { question: "What forms of payment do you accept?", answer: "We accept all major credit cards, debit cards, and cash. Payment is due upon completion of work.", priority_weight: 6 },
      ],
    },
  },
  {
    slug: "test-rob-electric",
    name: "Rob's Electric",
    address: "92 Industrial Dr, Cherry Hill, NJ 08003",
    timezone: "America/New_York",
    business_mode: "service",
    industry: "electrical",
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
    },
    hipaa_mode: false,
    scenario: "Residential electrician, same-day emergency, 25mi service area, NJ",
    scenarioTags: ["emergency", "mobile", "permits", "ev-charger"],
    communicationPrefs: {
      aiBookingMode: "auto_book",
      missedCallBehavior: "both",
      unknownQuestionBehavior: "offer_callback",
    },
    tagline: "Fast, licensed electrical service for South Jersey homes",
    cancellation_policy: "Please cancel at least 24 hours in advance. Same-day cancellations may incur a trip fee.",
    service_area_json: {
      type: "radius",
      center_address: "92 Industrial Dr, Cherry Hill, NJ 08003",
      radius_miles: 25,
      cities: ["Cherry Hill", "Voorhees", "Moorestown", "Mount Laurel", "Marlton", "Haddonfield", "Collingswood", "Haddon Township"],
    },
    hours_json: {
      monday: { closed: false, windows: [{ open: "08:00", close: "16:00" }] },
      tuesday: { closed: false, windows: [{ open: "08:00", close: "16:00" }] },
      wednesday: { closed: false, windows: [{ open: "08:00", close: "16:00" }] },
      thursday: { closed: false, windows: [{ open: "08:00", close: "16:00" }] },
      friday: { closed: false, windows: [{ open: "08:00", close: "16:00" }] },
      saturday: { closed: false, windows: [{ open: "08:00", close: "16:00" }] },
      sunday: { closed: true, windows: [] },
    },
    seedData: {
      callCount: 8,
      faqCount: 8,
      serviceCount: 7,
      bookingCount: 4,
      customServices: [
        { name: "Electrical Inspection", description: "Complete home electrical inspection including panel, wiring, outlets, and safety hazards", duration_minutes: 60, price_amount: 99, price_type: "fixed", service_category: "inspection", display_order: 1 },
        { name: "Outlet Installation", description: "New outlet installation or replacement — standard, GFCI, or USB outlets", duration_minutes: 60, price_amount: 150, price_type: "starting_at", service_category: "installation", display_order: 2 },
        { name: "Light Fixture Installation", description: "Install or replace ceiling lights, chandeliers, recessed lighting, or fans with lights", duration_minutes: 60, price_amount: 125, price_type: "starting_at", service_category: "installation", display_order: 3 },
        { name: "Panel Upgrade", description: "Electrical panel upgrade from 100A to 200A — includes permit and inspection", duration_minutes: 240, price_amount: 0, price_type: "quote_only", service_category: "panel", display_order: 4 },
        { name: "Ceiling Fan Installation", description: "Install ceiling fan with or without existing wiring — all brands", duration_minutes: 90, price_amount: 175, price_type: "starting_at", service_category: "installation", display_order: 5 },
        { name: "EV Charger Installation", description: "Level 2 EV charger (240V) installation for all major electric vehicles — includes permit", duration_minutes: 180, price_amount: 800, price_type: "starting_at", service_category: "ev", display_order: 6 },
        { name: "Emergency Service", description: "Same-day emergency electrical service — power outage, sparking outlets, burning smell, or tripped breakers", duration_minutes: 60, price_amount: 199, price_type: "starting_at", service_category: "emergency", display_order: 7 },
      ],
      customFaqs: [
        { question: "What areas do you service?", answer: "We serve a 25-mile radius from Cherry Hill, NJ covering Voorhees, Moorestown, Mount Laurel, Marlton, Haddonfield, Collingswood, and Haddon Township.", priority_weight: 10 },
        { question: "What are your hours?", answer: "We're available Monday through Saturday, 8:00 AM to 4:00 PM. We are closed on Sundays. Emergency service is available 24/7 — call us anytime for urgent electrical issues.", priority_weight: 9 },
        { question: "Do you offer emergency service?", answer: "Yes, we offer 24/7 emergency electrical service for power outages, sparking outlets, burning smells, or tripped breakers. Emergency rates apply after hours.", priority_weight: 8 },
        { question: "Are you a licensed electrician?", answer: "Yes, Rob's Electric is fully licensed, bonded, and insured in the state of New Jersey. We can provide our license number upon request.", priority_weight: 7 },
        { question: "Do I need a permit for electrical work?", answer: "Most electrical work requires a permit, including panel upgrades, new circuits, and EV charger installations. We handle the permit process for you — just let us know what you need.", priority_weight: 6 },
        { question: "How long does a panel upgrade take?", answer: "A panel upgrade typically takes 4–8 hours. Your power will be off during the work, so we recommend scheduling it on a day you can be home.", priority_weight: 5 },
        { question: "Do you install EV chargers?", answer: "Yes, we install Level 2 EV chargers (240V) for all major electric vehicle brands. We handle the permit and inspection. Typical installation takes 2–4 hours.", priority_weight: 4 },
        { question: "What forms of payment do you accept?", answer: "We accept all major credit cards, debit cards, checks, and cash. Payment is due upon completion of work.", priority_weight: 3 },
      ],
      customObjections: [
        { objection: "That's too expensive", response: "I understand price matters. Our rates reflect licensed, permitted work that protects your home. Unpermitted electrical work can void your homeowner's insurance and create safety hazards. Can I schedule a free estimate?", priority_weight: 3 },
        { objection: "I need to think about it", response: "Of course, take your time. I can email you a detailed quote. Just keep in mind that electrical issues can become safety hazards if left unaddressed. We're here when you're ready.", priority_weight: 2 },
        { objection: "I already have an electrician", response: "That's great you're staying on top of your home's electrical. Many of our customers call us for a second opinion or when they need someone quickly. Would you like a free estimate just to compare?", priority_weight: 1 },
      ],
    },
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
    seedData: {
      callCount: 6,
      faqCount: 5,
      serviceCount: 7,
      bookingCount: 3,
      customServices: [
        { name: "Basic Wash", description: "Exterior hand wash with tire shine and window cleaning", duration_minutes: 60, price_amount: 50, price_type: "fixed", service_category: "wash", display_order: 1 },
        { name: "Interior Detail", description: "Full interior deep clean: vacuum, shampoo, leather conditioning, and dashboard treatment", duration_minutes: 120, price_amount: 150, price_type: "fixed", service_category: "interior", display_order: 2 },
        { name: "Exterior Detail", description: "Clay bar treatment, polish, and hand wax for a showroom-quality finish", duration_minutes: 120, price_amount: 125, price_type: "fixed", service_category: "exterior", display_order: 3 },
        { name: "Full Detail", description: "Complete interior and exterior detail package", duration_minutes: 180, price_amount: 250, price_type: "fixed", service_category: "packages", display_order: 4 },
        { name: "Ceramic Coating", description: "Professional ceramic coating application for long-lasting paint protection", duration_minutes: 480, price_amount: 800, price_type: "quote_only", service_category: "protection", display_order: 5 },
        { name: "Paint Correction", description: "Multi-stage paint correction to remove swirls, scratches, and oxidation", duration_minutes: 240, price_amount: 400, price_type: "quote_only", service_category: "correction", display_order: 6 },
        { name: "Headlight Restoration", description: "UV-damaged headlight restoration for improved clarity and safety", duration_minutes: 45, price_amount: 75, price_type: "fixed", service_category: "restoration", display_order: 7 },
      ],
      customFaqs: [
        { question: "Do you come to me or do I drop off?", answer: "We offer both mobile service within Miami-Dade County and drop-off at our shop. Mobile service is available for most packages.", priority_weight: 10 },
        { question: "Do you require a deposit?", answer: "Yes, we require a 50% deposit at booking for all services over $200. The deposit is applied to your final bill.", priority_weight: 9 },
        { question: "How long does a full detail take?", answer: "A full detail typically takes 3-4 hours depending on the vehicle size and condition.", priority_weight: 8 },
        { question: "Do you offer package deals?", answer: "Yes! We offer multi-service packages and recurring maintenance plans. Ask about our monthly detail subscription.", priority_weight: 7 },
        { question: "What products do you use?", answer: "We use premium, pH-balanced, eco-friendly products that are safe for all paint finishes and clear coats.", priority_weight: 6 },
      ],
    },
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
    seedData: {
      callCount: 5,
      faqCount: 6,
      serviceCount: 6,
      bookingCount: 4,
      customServices: [
        { name: "Standard Cleaning", description: "Regular residential cleaning: kitchen, bathrooms, floors, dusting, and trash", duration_minutes: 120, price_amount: 150, price_type: "fixed", service_category: "residential", display_order: 1 },
        { name: "Deep Cleaning", description: "Thorough deep clean including baseboards, inside appliances, and detailed scrubbing", duration_minutes: 240, price_amount: 300, price_type: "quote_only", service_category: "residential", display_order: 2 },
        { name: "Move In/Out Cleaning", description: "Complete cleaning for moving transitions including all rooms, closets, and appliances", duration_minutes: 300, price_amount: 400, price_type: "quote_only", service_category: "residential", display_order: 3 },
        { name: "Office Cleaning", description: "Commercial office cleaning: desks, break rooms, restrooms, and common areas", duration_minutes: 120, price_amount: 175, price_type: "quote_only", service_category: "commercial", display_order: 4 },
        { name: "Carpet Cleaning", description: "Professional hot water extraction carpet cleaning", duration_minutes: 120, price_amount: 200, price_type: "quote_only", service_category: "specialty", display_order: 5 },
        { name: "Window Cleaning", description: "Interior and exterior window cleaning for homes and offices", duration_minutes: 90, price_amount: 100, price_type: "quote_only", service_category: "specialty", display_order: 6 },
      ],
      customFaqs: [
        { question: "What areas do you service?", answer: "We serve the greater Chicago metropolitan area including the suburbs.", priority_weight: 10 },
        { question: "Do you bring your own supplies?", answer: "Yes, we bring all cleaning supplies and equipment. If you prefer specific products, just let us know.", priority_weight: 9 },
        { question: "Are your cleaners background-checked?", answer: "Absolutely. All team members are background-checked, bonded, and insured.", priority_weight: 8 },
        { question: "Do you offer recurring service?", answer: "Yes! We offer weekly, bi-weekly, and monthly cleaning plans with discounted rates.", priority_weight: 7 },
        { question: "What is your cancellation policy?", answer: "We ask for at least 24 hours notice for cancellations. Late cancellations may incur a fee.", priority_weight: 6 },
        { question: "How do you handle pets?", answer: "We are pet-friendly! Just let us know about any pets so our team can plan accordingly.", priority_weight: 5 },
      ],
    },
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
    seedData: {
      callCount: 5,
      faqCount: 8,
      serviceCount: 4,
      bookingCount: 2,
      customServices: [
        { name: "Tax Preparation (Simple)", description: "Individual tax return preparation for W-2 income, standard deductions", duration_minutes: 60, price_amount: 150, price_type: "fixed", service_category: "tax", display_order: 1 },
        { name: "Tax Preparation (Complex)", description: "Complex tax returns with investments, rental income, self-employment, or itemized deductions", duration_minutes: 120, price_amount: 350, price_type: "fixed", service_category: "tax", display_order: 2 },
        { name: "Business Tax Return", description: "Corporate, partnership, or LLC tax return preparation", duration_minutes: 180, price_amount: 500, price_type: "quote_only", service_category: "business", display_order: 3 },
        { name: "Consultation", description: "One-hour consultation on tax planning, financial strategy, or business advisory", duration_minutes: 60, price_amount: 100, price_type: "fixed", service_category: "advisory", display_order: 4 },
      ],
      customFaqs: [
        { question: "Do you offer virtual consultations?", answer: "Yes, we offer both in-person and video consultations for your convenience.", priority_weight: 10 },
        { question: "What documents should I bring?", answer: "Please bring your W-2s, 1099s, prior year tax return, receipts for deductions, and a valid photo ID.", priority_weight: 9 },
        { question: "How long does tax preparation take?", answer: "Simple returns are usually completed within 1-2 business days. Complex returns may take 3-5 business days.", priority_weight: 8 },
        { question: "Do you handle IRS audits?", answer: "Yes, we provide audit representation and support. If you receive an IRS notice, contact us immediately.", priority_weight: 7 },
        { question: "What are your fees?", answer: "Our fees depend on the complexity of your return. Simple individual returns start at $150. We provide a quote upfront.", priority_weight: 6 },
        { question: "Do you offer bookkeeping services?", answer: "Yes, we offer monthly bookkeeping services for businesses of all sizes.", priority_weight: 5 },
        { question: "Are you a CPA firm?", answer: "Yes, Apex Consulting Group is a licensed CPA firm with over 15 years of experience.", priority_weight: 4 },
        { question: "Do you handle payroll?", answer: "Yes, we offer payroll processing services including tax withholding, direct deposits, and quarterly filings.", priority_weight: 3 },
      ],
    },
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
  {
    slug: "test-gc-joe",
    name: "Joe's Construction & Remodeling",
    address: "789 Builder Way, Cherry Hill, NJ 08003",
    timezone: "America/New_York",
    business_mode: "service",
    industry: "general_contractor",
    enabled_modules: ["ai_voice", "instant_text_back", "booking", "estimates", "lead_follow_up"],
    capabilities_json: {
      ai_voice: true,
      instant_text_back: true,
      booking: true,
      estimates: true,
      lead_follow_up: true,
      offersMobileService: true,
      offersSameDayEmergency: false,
      requiresDeposits: true,
      offersWalkIns: false,
      hasMultipleStaff: true,
    },
    hipaa_mode: false,
    scenario: "General contractor, kitchen/bath remodels, additions, subs managed, estimate-first",
    scenarioTags: ["remodeling", "estimates", "subcontractors", "permits", "deposits"],
    owner_email: "joe@test.com",
    owner_password: "test1234",
    phone_public: "+18005551234",
    website_url: "https://joesconstruction.example.com",
    tagline: "Quality remodeling and construction for South Jersey homeowners",
    cancellation_policy: "Please cancel or reschedule estimate appointments at least 24 hours in advance. Project deposits are non-refundable once materials are ordered.",
    hours_json: {
      monday: { closed: false, windows: [{ open: "07:00", close: "17:00" }] },
      tuesday: { closed: false, windows: [{ open: "07:00", close: "17:00" }] },
      wednesday: { closed: false, windows: [{ open: "07:00", close: "17:00" }] },
      thursday: { closed: false, windows: [{ open: "07:00", close: "17:00" }] },
      friday: { closed: false, windows: [{ open: "07:00", close: "17:00" }] },
      saturday: { closed: false, windows: [{ open: "08:00", close: "13:00" }] },
      sunday: { closed: true, windows: [] },
    },
    service_area_json: {
      type: "radius",
      center_address: "789 Builder Way, Cherry Hill, NJ 08003",
      radius_miles: 30,
      counties: ["Camden County", "Burlington County", "Gloucester County"],
      cities: ["Cherry Hill", "Haddonfield", "Voorhees", "Moorestown", "Marlton", "Mount Laurel", "Medford", "Collingswood"],
    },
    communicationPrefs: {
      aiBookingMode: "auto_book",
      missedCallBehavior: "both",
      unknownQuestionBehavior: "offer_callback",
    },
    seedData: {
      callCount: 8,
      faqCount: 8,
      serviceCount: 10,
      bookingCount: 3,
      customServices: [
        { name: "Kitchen Remodel", description: "Full kitchen renovation including cabinets, countertops, flooring, and fixtures", duration_minutes: 0, price_amount: 0, price_type: "quote_only", service_category: "remodeling", display_order: 1 },
        { name: "Bathroom Remodel", description: "Complete bathroom renovation including tile, vanity, shower/tub, and plumbing fixtures", duration_minutes: 0, price_amount: 0, price_type: "quote_only", service_category: "remodeling", display_order: 2 },
        { name: "Room Addition", description: "Build a new room addition to your home including foundation, framing, and finish work", duration_minutes: 0, price_amount: 0, price_type: "quote_only", service_category: "construction", display_order: 3 },
        { name: "Deck Building", description: "Custom deck construction in wood or composite materials with optional railings and stairs", duration_minutes: 0, price_amount: 0, price_type: "quote_only", service_category: "construction", display_order: 4 },
        { name: "Basement Finishing", description: "Turn your unfinished basement into living space with framing, drywall, flooring, and electrical", duration_minutes: 0, price_amount: 0, price_type: "quote_only", service_category: "remodeling", display_order: 5 },
        { name: "Whole-Home Renovation", description: "Complete home renovation spanning multiple rooms, systems, and finishes", duration_minutes: 0, price_amount: 0, price_type: "quote_only", service_category: "remodeling", display_order: 6 },
        { name: "Drywall & Framing", description: "Interior framing and drywall installation, taping, mudding, and finishing", duration_minutes: 0, price_amount: 0, price_type: "quote_only", service_category: "construction", display_order: 7 },
        { name: "Trim & Finish Carpentry", description: "Crown molding, baseboards, door casings, wainscoting, and built-in shelving", duration_minutes: 480, price_amount: 800, price_type: "quote_only", service_category: "carpentry", display_order: 8 },
        { name: "Handyman Service", description: "Small repairs and odd jobs: drywall patches, door adjustments, fixture swaps, and more", duration_minutes: 120, price_amount: 150, price_type: "fixed", service_category: "handyman", display_order: 9 },
        { name: "Free Estimate / Site Visit", description: "On-site consultation to assess your project, discuss options, and provide a detailed written estimate", duration_minutes: 60, price_amount: 0, price_type: "fixed", service_category: "consultation", display_order: 10 },
      ],
      customFaqs: [
        { question: "Are you licensed and insured?", answer: "Yes, we are fully licensed, bonded, and insured. We carry general liability and workers' compensation coverage and are happy to provide our license number and proof of insurance.", priority_weight: 10 },
        { question: "Do you handle permits?", answer: "Yes, we handle all necessary building permits for your project. Permit costs are included in your project estimate.", priority_weight: 9 },
        { question: "How long does a kitchen remodel take?", answer: "A typical kitchen remodel takes 6 to 12 weeks depending on the scope. We'll give you a detailed timeline during the estimate.", priority_weight: 8 },
        { question: "Do you use subcontractors?", answer: "We use trusted, vetted subcontractors for specialized work like electrical, plumbing, and HVAC. Our team manages all subs and ensures quality.", priority_weight: 7 },
        { question: "Can I get a ballpark estimate over the phone?", answer: "We prefer to see the space before quoting to give you an accurate number. We offer free on-site estimates and can usually schedule within a few days.", priority_weight: 6 },
        { question: "What does a bathroom remodel cost?", answer: "Bathroom remodels typically range from $8,000 to $25,000 depending on size and finishes. We'll provide a detailed breakdown after the site visit.", priority_weight: 5 },
        { question: "Do you offer financing?", answer: "Yes, we offer financing options for larger projects. Our team can walk you through the details during the estimate.", priority_weight: 4 },
        { question: "What's your warranty?", answer: "We provide a 1-year workmanship warranty on all projects. Manufacturer warranties on materials are passed through to you.", priority_weight: 3 },
      ],
      customObjections: [
        { objection: "Just give me a ballpark price", response: "I understand you want a rough idea. For a project like that, ranges vary a lot based on materials and scope. Our free on-site estimate will give you an accurate number with no obligation. Can I schedule that for you?", priority_weight: 5 },
        { objection: "I already have other quotes", response: "That's smart to compare. We'd love to give you our quote too. Many clients choose us for our quality and communication even when we're not the cheapest. Want me to set up a free estimate?", priority_weight: 4 },
        { objection: "That timeline is too long", response: "I understand you'd like to move faster. Let me get you scheduled for an estimate so we can discuss timeline options and see what we can do.", priority_weight: 3 },
        { objection: "That's too expensive", response: "I hear you. We use quality materials and stand behind our work with a warranty. We also offer financing options that make larger projects more manageable. Want me to go over those?", priority_weight: 2 },
        { objection: "I need to think about it", response: "Of course, take your time. I'll send you a written estimate with all the details. Just know our schedule fills up, especially in spring and summer, so locking in early gets you the best timeline.", priority_weight: 1 },
      ],
    },
  },
  {
    slug: "test-roofing-storm",
    name: "Tony's Roofing & Gutters",
    address: "1820 River Rd, Trenton, NJ 08618",
    timezone: "America/New_York",
    business_mode: "service",
    industry: "roofing",
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
      handlesInsuranceClaims: true,
    },
    hipaa_mode: false,
    scenario: "Roofing contractor, storm damage inspections, insurance claims, 25mi service area",
    scenarioTags: ["roofing", "storm-damage", "insurance", "emergency", "estimates", "gutters"],
    communicationPrefs: {
      aiBookingMode: "auto_book",
      missedCallBehavior: "both",
      unknownQuestionBehavior: "offer_callback",
    },
    tagline: "Central NJ's trusted roofer since 2008 — storm damage, repairs, and full replacements",
    cancellation_policy: "Please cancel at least 24 hours before your scheduled inspection. Storm damage inspections are always free.",
    service_area_json: {
      type: "radius",
      center_address: "1820 River Rd, Trenton, NJ 08618",
      radius_miles: 25,
      cities: ["Trenton", "Princeton", "Hamilton", "Ewing", "Lawrenceville", "Pennington", "Hopewell", "Bordentown"],
    },
    hours_json: {
      monday: { open: "07:00", close: "17:00" },
      tuesday: { open: "07:00", close: "17:00" },
      wednesday: { open: "07:00", close: "17:00" },
      thursday: { open: "07:00", close: "17:00" },
      friday: { open: "07:00", close: "17:00" },
      saturday: { open: "08:00", close: "14:00" },
      sunday: { open: "closed", close: "closed" },
    },
    seedData: {
      callCount: 8,
      faqCount: 8,
      serviceCount: 8,
      bookingCount: 3,
      customServices: [
        { name: "Roof Replacement", description: "Full tear-off and replacement of roof system including underlayment, shingles, flashing, and ridge vents", duration_minutes: 480, price_amount: 8500, price_type: "quote_only", service_category: "replacement", display_order: 1 },
        { name: "Roof Repair", description: "Fix leaks, damaged shingles, flashing issues, and minor storm damage", duration_minutes: 180, price_amount: 350, price_type: "quote_only", service_category: "repair", display_order: 2 },
        { name: "Storm Damage Inspection", description: "Free comprehensive roof inspection after storms — check for hail, wind, and debris damage with full photo report", duration_minutes: 60, price_amount: 0, price_type: "fixed", service_category: "inspection", display_order: 3 },
        { name: "Gutter Installation", description: "Seamless aluminum gutter installation with downspouts and leaf guards", duration_minutes: 360, price_amount: 1200, price_type: "quote_only", service_category: "gutters", display_order: 4 },
        { name: "Gutter Cleaning", description: "Full gutter and downspout cleaning with debris removal", duration_minutes: 90, price_amount: 175, price_type: "fixed", service_category: "gutters", display_order: 5 },
        { name: "Skylight Installation", description: "New skylight installation or replacement including flashing and sealing", duration_minutes: 300, price_amount: 800, price_type: "quote_only", service_category: "installation", display_order: 6 },
        { name: "Flat Roof Repair", description: "Repair or coat flat roof areas — TPO, EPDM, and modified bitumen", duration_minutes: 240, price_amount: 500, price_type: "quote_only", service_category: "repair", display_order: 7 },
        { name: "Emergency Tarp Service", description: "Emergency tarping to prevent further water damage after storms or leaks", duration_minutes: 120, price_amount: 250, price_type: "fixed", service_category: "emergency", display_order: 8 },
      ],
      customFaqs: [
        { question: "Do you handle insurance claims?", answer: "Yes, we work with all major insurance companies. We document the damage, provide a detailed estimate, and can meet with your adjuster on-site to make the process smooth.", priority_weight: 10 },
        { question: "Is the storm damage inspection really free?", answer: "Absolutely. We do free inspections after any major storm. We'll check your roof, gutters, and siding, take photos, and give you an honest assessment. No obligation.", priority_weight: 9 },
        { question: "How long does a roof replacement take?", answer: "Most residential roofs take 1 to 3 days depending on size and complexity. We'll give you a specific timeline after the estimate.", priority_weight: 8 },
        { question: "What kind of shingles do you use?", answer: "We install GAF and CertainTeed architectural shingles as standard. We also offer premium options like designer shingles and metal roofing. All come with manufacturer warranties.", priority_weight: 7 },
        { question: "Are you licensed and insured?", answer: "Yes. We are fully licensed, bonded, and insured in New Jersey. We carry both general liability and workers' comp for your protection.", priority_weight: 6 },
        { question: "Do you offer financing?", answer: "Yes, we offer financing through GreenSky for larger projects. Options include 0% interest for 12 months. We can go over the details during your estimate.", priority_weight: 5 },
        { question: "Can you fix a small leak without replacing the whole roof?", answer: "In many cases, yes. We always try to repair first when it makes sense. We'll be honest about whether a repair will hold or if replacement is the better long-term option.", priority_weight: 4 },
        { question: "What areas do you cover?", answer: "We serve a 25-mile radius from Trenton, including Princeton, Hamilton, Ewing, Lawrenceville, Pennington, Hopewell, and Bordentown.", priority_weight: 3 },
      ],
      customObjections: [
        { objection: "I want to wait and see if my insurance covers it", response: "That makes sense. We can actually help with that. We'll do a free inspection and provide the documentation your insurance company needs. Most homeowner policies cover storm damage. Want me to schedule the inspection?", priority_weight: 5 },
        { objection: "I already have another quote", response: "Good idea to compare. We'd love to give you ours too. A lot of our customers pick us because we handle the insurance paperwork and stand behind our work with a 10-year warranty. Can I set up a free estimate?", priority_weight: 4 },
        { objection: "That sounds expensive", response: "I understand. For storm damage, insurance often covers most or all of the cost. Even for out-of-pocket jobs, we offer financing with 0% interest for 12 months. Want me to schedule a free estimate so you know exactly what you're looking at?", priority_weight: 3 },
        { objection: "I need to talk to my spouse first", response: "Of course, no rush. The inspection is free and there's no obligation. Having the estimate in hand actually makes that conversation easier. Want me to schedule it?", priority_weight: 2 },
        { objection: "Can you just patch it for now?", response: "We can definitely look at a patch or temporary fix. Sometimes that's all you need. We'll be honest about whether a repair will last or if you're better off replacing. The inspection is free either way.", priority_weight: 1 },
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
    owner_email: "qa-towing@getfluxdata.com",
    owner_password: "test1234",
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
