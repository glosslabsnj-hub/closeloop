/**
 * Scenario Discovery Questions
 *
 * Mode-specific yes/no questions used during onboarding Step 3 (Discovery).
 * Each question maps to an existing capability key from useBusinessCapabilities.ts
 * and optionally implies modules that should be auto-enabled when answered "yes".
 */

import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

export type QuestionGroup = "core" | "ai_behavior" | "advanced";

/** A follow-up field shown inline when a scenario question is answered "yes" */
export interface FollowUpField {
  key: string;                 // e.g. "depositAmount" — stored in scenarioDetails
  label: string;               // e.g. "Deposit amount"
  type: "number" | "text" | "select" | "currency" | "miles";
  placeholder?: string;
  options?: { value: string; label: string }[];  // for select type
  suffix?: string;             // e.g. "miles", "%"
  defaultValue?: string;
}

export interface FollowUpOption {
  value: string;
  label: string;
  description: string;
}

export interface ScenarioFollowUp {
  id: string;
  /** Key stored in the answers record */
  answerKey: string;
  label: string;
  description?: string;
  type: "radio" | "select";
  options: FollowUpOption[];
  defaultValue: string;
}

export interface ScenarioQuestion {
  id: string;
  capabilityKey: string;       // Key stored in context_fields_json.capabilities
  label: string;               // Short label
  question: string;            // Full question text
  description?: string;        // Helper text
  defaultValue: boolean;
  blocking?: boolean;          // Must be true to proceed (e.g. HIPAA)
  impliesModules?: string[];   // Auto-enable these modules when true
  overridesBase?: boolean;     // When true and answer is false, removes impliedModules even from base set
  showWhen?: { capabilityKey: string; value: boolean };  // conditional visibility
  industryFilter?: { categories?: string[]; slugs?: string[] };  // industry-gated (allowlist)
  /**
   * Industries for which this question is IRRELEVANT — it will be hidden AND
   * its answer will be silently set to the question's defaultValue.
   * Example: "Do customers leave items?" is suppressed for home_services (plumbers,
   * HVAC, electricians) because they never hold customer property.
   */
  suppressedFor?: { categories?: string[]; slugs?: string[] };
  group?: QuestionGroup;       // visual grouping
  requiredForAI?: boolean;     // shows "AI uses this" badge
  preAnsweredFor?: { slugs?: string[]; categories?: string[] };  // pre-checked for these industries
  /**
   * Whether this question appears during onboarding (true) or is deferred
   * to the Brain advanced settings (false/undefined = hidden during onboarding).
   * Questions hidden during onboarding still get their defaultValue applied silently.
   */
  onboardingVisible?: boolean;
  /** Follow-up fields shown inline when the user answers "yes" */
  followUp?: {
    fields: FollowUpField[];
  } | ScenarioFollowUp;
}

// ---------------------------------------------------------------------------
// Question sets by mode
// ---------------------------------------------------------------------------

const serviceQuestions: ScenarioQuestion[] = [
  {
    id: "ai-books-appointments",
    capabilityKey: "aiBooksDirect",
    label: "AI Books Appointments",
    question: "Should the AI book appointments directly into your calendar?",
    description: "If yes, choose how bookings are confirmed below",
    defaultValue: true,
    impliesModules: ["booking"],
    overridesBase: true,
    group: "core",
    requiredForAI: true,
    onboardingVisible: true,
    followUp: {
      id: "booking-mode",
      answerKey: "_aiBookingMode",
      label: "How should bookings be confirmed?",
      type: "radio",
      options: [
        { value: "auto_book", label: "Auto-book instantly", description: "AI confirms the appointment right away based on your availability" },
        { value: "pending_approval", label: "Require your approval", description: "AI finds a time but tells the caller you'll confirm — you approve or adjust" },
      ],
      defaultValue: "auto_book",
    },
  },
  {
    id: "mobile-service",
    capabilityKey: "offersMobileService",
    label: "Mobile / On-Site Service",
    question: "Do you offer mobile or on-site services?",
    description: "You travel to the customer's location to perform work",
    defaultValue: false,
    group: "core",
    preAnsweredFor: { categories: ["home_services", "dispatch_logistics"] },
    // Suppress for industries where the work style is obvious (known at industry-selection time)
    suppressedFor: {
      categories: [
        "home_services",        // plumbers, HVAC, electricians ALWAYS go on-site — no need to ask
        "dispatch_logistics",   // towing, delivery ALWAYS go to customer
        "beauty_wellness",      // salons, barbershops NEVER go to customer
        "health_medical",       // dentists, vets NEVER go to customer
        "food_hospitality",     // restaurants NEVER go to customer
        "sales_dealerships",    // car dealers NEVER go to customer
        "fitness_recreation",   // gyms NEVER go to customer
      ],
    },
    onboardingVisible: true,
    followUp: {
      fields: [
        { key: "serviceRadiusMiles", label: "Service radius", type: "miles", placeholder: "e.g. 25" },
        { key: "travelFee", label: "Travel/trip fee", type: "currency", placeholder: "e.g. 35" },
      ],
    },
  },
  {
    id: "same-day-emergency",
    capabilityKey: "offersSameDayEmergency",
    label: "Same-Day / Emergency",
    question: "Do you handle same-day or emergency requests?",
    description: "Customers can call for urgent, same-day service",
    defaultValue: false,
    group: "core",
    preAnsweredFor: { slugs: ["plumbing", "hvac", "electrical", "towing", "locksmith"] },
    onboardingVisible: true,
    followUp: {
      fields: [
        {
          key: "sameDayLeadTime",
          label: "Minimum lead time",
          type: "select",
          options: [
            { value: "1", label: "1 hour" },
            { value: "2", label: "2 hours" },
            { value: "4", label: "4 hours" },
            { value: "morning", label: "Same-day morning only" },
          ],
          defaultValue: "2",
        },
      ],
    },
  },
  {
    id: "deposits",
    capabilityKey: "requiresDeposits",
    label: "Deposits Required",
    question: "Do you require deposits to confirm bookings?",
    description: "Customers pay a deposit upfront before their appointment",
    defaultValue: false,
    group: "core",
    onboardingVisible: true,
    followUp: {
      fields: [
        {
          key: "depositType",
          label: "Deposit type",
          type: "select",
          options: [
            { value: "fixed", label: "Fixed dollar amount" },
            { value: "percentage", label: "Percentage of service" },
          ],
          defaultValue: "fixed",
        },
        { key: "depositAmount", label: "Amount", type: "number", placeholder: "e.g. 50" },
      ],
    },
  },
  {
    id: "walk-ins",
    capabilityKey: "offersWalkIns",
    label: "Walk-Ins Welcome",
    question: "Do you accept walk-in customers?",
    description: "Customers can show up without an appointment",
    defaultValue: true,
    group: "core",
    preAnsweredFor: { categories: ["beauty_wellness"] },
    // Suppress for industries where walk-ins is not a meaningful concept
    suppressedFor: {
      categories: [
        "home_services",      // plumbers/HVAC don't have walk-ins — they're called first
        "dispatch_logistics", // towing companies don't have walk-ins
        "food_hospitality",   // restaurants handle walk-ins differently (separate reservations system)
        "health_medical",     // medical offices handle walk-ins separately
      ],
    },
    onboardingVisible: true,
  },
  // New questions
  {
    id: "staff-scheduling",
    capabilityKey: "hasMultipleStaff",
    label: "Multiple Staff",
    question: "Do you have multiple technicians or staff?",
    description: "Assign jobs to specific team members",
    defaultValue: false,
    impliesModules: ["staff_scheduling"],
    group: "core",
    onboardingVisible: true,
    followUp: {
      id: "team-size",
      answerKey: "_teamSize",
      label: "How many crew members?",
      type: "radio",
      options: [
        { value: "small", label: "2–5 people", description: "Small team" },
        { value: "medium", label: "6–15 people", description: "Medium team" },
        { value: "large", label: "16+ people", description: "Large team" },
      ],
      defaultValue: "small",
    },
  },
  {
    id: "packages",
    capabilityKey: "offersPackages",
    label: "Packages / Memberships",
    question: "Do you offer service packages or memberships?",
    description: "Recurring packages or membership plans for customers",
    defaultValue: false,
    impliesModules: ["packages"],
    group: "advanced",
  },
  {
    id: "stylist-preference",
    capabilityKey: "collectsStylistPreference",
    label: "Stylist Preference",
    question: "Should the AI ask which stylist the client prefers?",
    description: "AI will ask callers for their preferred service provider",
    defaultValue: true,
    group: "ai_behavior",
    requiredForAI: true,
    industryFilter: { categories: ["beauty_wellness"] },
  },
  {
    id: "warranty-check",
    capabilityKey: "requiresWarrantyCheck",
    label: "Warranty Check",
    question: "Do you verify warranties or service contracts?",
    description: "AI will ask about warranty or contract status",
    defaultValue: false,
    group: "ai_behavior",
    industryFilter: { categories: ["home_services", "auto_services"] },
  },
  // --- Expanded questions ---
  {
    id: "free-estimates",
    capabilityKey: "offersFreeEstimates",
    label: "Free Estimates",
    question: "Do you offer free estimates or consultations?",
    description: "AI will let callers know estimates are free",
    defaultValue: false,
    group: "core",
  },
  {
    id: "trip-fee",
    capabilityKey: "chargesTripFee",
    label: "Trip / Travel Fee",
    question: "Do you charge a trip or travel fee?",
    description: "AI will mention the trip fee when quoting mobile services",
    defaultValue: false,
    group: "core",
    followUp: {
      fields: [
        { key: "tripFeeAmount", label: "Trip fee amount", type: "currency", placeholder: "e.g. 35" },
      ],
    },
  },
  {
    id: "reminders",
    capabilityKey: "sendsReminders",
    label: "Appointment Reminders",
    question: "Do you send appointment reminders?",
    description: "AI will tell callers they'll receive a reminder",
    defaultValue: true,
    group: "ai_behavior",
  },
  {
    id: "minimum-charge",
    capabilityKey: "hasMinimumCharge",
    label: "Minimum Charge",
    question: "Do you have a minimum service charge?",
    description: "AI will mention the minimum when quoting small jobs",
    defaultValue: false,
    group: "core",
    followUp: {
      fields: [
        { key: "minimumChargeAmount", label: "Minimum charge", type: "currency", placeholder: "e.g. 75" },
      ],
    },
  },
  {
    id: "cancellation-policy",
    capabilityKey: "hasCancellationPolicy",
    label: "Cancellation Policy",
    question: "Do you have a cancellation policy?",
    description: "AI will inform callers about your cancellation rules",
    defaultValue: true,
    group: "core",
    onboardingVisible: true,
    followUp: {
      fields: [
        {
          key: "cancellationNoticeHours",
          label: "Required notice",
          type: "select",
          options: [
            { value: "24", label: "24 hours" },
            { value: "48", label: "48 hours" },
            { value: "72", label: "72 hours" },
          ],
          defaultValue: "24",
        },
        { key: "cancellationFee", label: "Cancellation fee", type: "currency", placeholder: "e.g. 25 (or 0 for no fee)" },
      ],
    },
  },
  {
    id: "after-hours-service",
    capabilityKey: "offersAfterHours",
    label: "After-Hours Service",
    question: "Do you offer after-hours or weekend service?",
    description: "AI can book or dispatch outside normal business hours",
    defaultValue: false,
    impliesModules: ["after_hours_handling"],
    group: "core",
    followUp: {
      fields: [
        { key: "afterHoursSurcharge", label: "After-hours surcharge", type: "currency", placeholder: "e.g. 50 (or 0 for none)" },
      ],
    },
  },
  {
    id: "long-duration-jobs",
    capabilityKey: "hasLongDurationJobs",
    label: "Long-Duration Jobs",
    question: "Do jobs typically take multiple hours (3+ hours)?",
    description: "Repairs, treatments, or services that take half a day or longer",
    defaultValue: false,
    group: "core",
    industryFilter: { slugs: ["auto_repair", "body_shop", "auto_glass", "transmission_shop", "engine_repair", "hvac", "plumbing", "electrical", "general_contractor", "roofing", "painting"] },
  },
  {
    id: "job-tracking",
    capabilityKey: "hasJobTracking",
    label: "Work-In-Progress Tracking",
    question: "Do customers leave items with you for extended work?",
    description: "Track jobs as they move through multiple service steps. The AI can update customers on progress when they call.",
    defaultValue: false,
    impliesModules: ["job_tracking"],
    group: "core",
    preAnsweredFor: {
      slugs: ["auto-repair", "computer-repair", "appliance-repair", "jewelry-repair", "watch-repair", "dry-cleaning", "tailor"],
      categories: ["automotive_services", "repair_services"],
    },
    // Suppress for industries where customers NEVER leave items (on-site service businesses)
    suppressedFor: {
      categories: [
        "home_services",      // plumbers, HVAC, electricians — customers don't leave items
        "dispatch_logistics", // towing, delivery — no drop-off model
        "beauty_wellness",    // salons — customers sit in chair, don't leave items
        "food_hospitality",   // restaurants — no drop-off
        "fitness_recreation", // gyms — no drop-off
        "health_medical",     // medical — no item drop-off
      ],
    },
    onboardingVisible: true,
  },
];

const dispatchQuestions: ScenarioQuestion[] = [
  {
    id: "impound-lot",
    capabilityKey: "hasImpoundLot",
    label: "Impound Lot",
    question: "Do you operate an impound or storage lot?",
    description: "You store vehicles for police holds, private property tows, etc.",
    defaultValue: false,
    impliesModules: ["impound_lot"],
    group: "core",
    onboardingVisible: true,
  },
  {
    id: "motor-club",
    capabilityKey: "offersMotorClub",
    label: "Motor Club / Roadside",
    question: "Do you work with motor clubs or roadside programs?",
    description: "AAA, Agero, or other roadside assistance networks",
    defaultValue: false,
    group: "core",
  },
  {
    id: "fleet",
    capabilityKey: "hasFleet",
    label: "Fleet Management",
    question: "Do you manage a fleet of vehicles or drivers?",
    description: "Multiple trucks/drivers that need assignment and tracking",
    defaultValue: false,
    impliesModules: ["fleet_management"],
    group: "core",
  },
  {
    id: "distance-pricing",
    capabilityKey: "needsDistancePricing",
    label: "Distance-Based Pricing",
    question: "Do your prices depend on distance or mileage?",
    description: "Pricing varies based on how far the job is",
    defaultValue: true,
    group: "core",
    onboardingVisible: true,
    followUp: {
      fields: [
        { key: "baseRate", label: "Base/hookup rate", type: "currency", placeholder: "e.g. 75" },
        { key: "perMileRate", label: "Per-mile rate", type: "currency", placeholder: "e.g. 4" },
      ],
    },
  },
  // New questions
  {
    id: "police-impound",
    capabilityKey: "handlesPoliceImpound",
    label: "Police Impound",
    question: "Do you handle police or law enforcement impounds?",
    description: "Police-hold vehicles with specific release requirements",
    defaultValue: false,
    impliesModules: ["police_impound"],
    group: "core",
    showWhen: { capabilityKey: "hasImpoundLot", value: true },
  },
  {
    id: "ppi-towing",
    capabilityKey: "handlesPPITowing",
    label: "PPI Towing",
    question: "Do you do private property impound (PPI) towing?",
    description: "Towing from private lots, apartments, or businesses",
    defaultValue: false,
    impliesModules: ["ppi_towing"],
    group: "core",
  },
  {
    id: "recovery",
    capabilityKey: "offersRecovery",
    label: "Recovery Services",
    question: "Do you offer winch-out or vehicle recovery?",
    description: "Off-road recovery, ditch pull-outs, winch services",
    defaultValue: false,
    impliesModules: ["recovery_services"],
    group: "core",
  },
  {
    id: "phone-quotes",
    capabilityKey: "offersPhoneQuotes",
    label: "Phone Quotes",
    question: "Can your AI give price quotes over the phone?",
    description: "AI uses your pricing rules to quote callers",
    defaultValue: true,
    impliesModules: ["phone_quotes"],
    group: "ai_behavior",
    requiredForAI: true,
    onboardingVisible: true,
  },
  // --- Expanded questions ---
  {
    id: "operates-24h",
    capabilityKey: "operates24Hours",
    label: "24-Hour Operations",
    question: "Do you operate 24 hours?",
    description: "Available for dispatches around the clock",
    defaultValue: false,
    impliesModules: ["after_hours_handling"],
    group: "core",
    preAnsweredFor: { slugs: ["towing"] },
    onboardingVisible: true,
  },
  {
    id: "heavy-duty",
    capabilityKey: "handlesHeavyDuty",
    label: "Heavy-Duty Vehicles",
    question: "Do you handle heavy-duty or commercial vehicles?",
    description: "Semis, buses, RVs, and large commercial vehicles",
    defaultValue: false,
    group: "core",
  },
  {
    id: "insurance-billing",
    capabilityKey: "worksWithInsurance",
    label: "Insurance Billing",
    question: "Do you work with insurance companies for billing?",
    description: "Direct billing to insurance carriers",
    defaultValue: false,
    group: "core",
  },
  {
    id: "vehicle-storage",
    capabilityKey: "offersStorage",
    label: "Vehicle Storage",
    question: "Do you offer vehicle storage beyond impound?",
    description: "Short or long-term vehicle storage services",
    defaultValue: false,
    group: "core",
  },
  {
    id: "lockout-jumpstart",
    capabilityKey: "offersLockoutJumpstart",
    label: "Lockout / Jump Start",
    question: "Do you provide lockout and jump-start services?",
    description: "Roadside assistance for lockouts and dead batteries",
    defaultValue: true,
    group: "core",
    preAnsweredFor: { slugs: ["towing"] },
  },
  {
    id: "accident-towing",
    capabilityKey: "handlesAccidentTowing",
    label: "Accident Towing",
    question: "Do you handle accident or collision towing?",
    description: "Towing from accident scenes, often with police on scene",
    defaultValue: false,
    group: "core",
  },
];

const foodQuestions: ScenarioQuestion[] = [
  {
    id: "delivery",
    capabilityKey: "offersDelivery",
    label: "Delivery",
    question: "Do you offer delivery?",
    description: "Customers can order food delivered to their location",
    defaultValue: false,
    group: "core",
    preAnsweredFor: { slugs: ["pizza", "chinese_restaurant", "indian_restaurant"] },
    onboardingVisible: true,
    followUp: {
      fields: [
        { key: "deliveryRadiusMiles", label: "Delivery radius", type: "miles", placeholder: "e.g. 5" },
        { key: "deliveryFee", label: "Delivery fee", type: "currency", placeholder: "e.g. 5" },
        { key: "deliveryMinimumOrder", label: "Minimum order", type: "currency", placeholder: "e.g. 15" },
      ],
    },
  },
  {
    id: "catering",
    capabilityKey: "offersCatering",
    label: "Catering",
    question: "Do you offer catering services?",
    description: "Large orders for events, offices, or parties",
    defaultValue: false,
    impliesModules: ["catering"],
    group: "core",
    onboardingVisible: true,
  },
  {
    id: "reservations",
    capabilityKey: "offersReservations",
    label: "Reservations",
    question: "Do you accept table reservations?",
    description: "Customers can reserve a table in advance",
    defaultValue: false,
    impliesModules: ["reservations"],
    group: "core",
    onboardingVisible: true,
  },
  // New questions
  {
    id: "dietary",
    capabilityKey: "collectsDietaryRestrictions",
    label: "Dietary Restrictions",
    question: "Should the AI ask about dietary restrictions?",
    description: "AI will ask callers about allergies and dietary needs",
    defaultValue: false,
    impliesModules: ["dietary_intake"],
    group: "ai_behavior",
    requiredForAI: true,
    onboardingVisible: true,
  },
  {
    id: "curbside",
    capabilityKey: "offersCurbside",
    label: "Curbside Pickup",
    question: "Do you offer curbside pickup?",
    description: "Customers pick up orders from your curb without entering",
    defaultValue: false,
    impliesModules: ["curbside"],
    group: "core",
    onboardingVisible: true,
  },
  {
    id: "kds",
    capabilityKey: "hasKDSIntegration",
    label: "Kitchen Display",
    question: "Do you use a kitchen display system?",
    description: "Orders route to a kitchen display for prep tracking",
    defaultValue: false,
    impliesModules: ["kds_integration"],
    group: "advanced",
  },
  // --- Expanded questions ---
  {
    id: "serves-alcohol",
    capabilityKey: "servesAlcohol",
    label: "Serves Alcohol",
    question: "Do you serve alcohol?",
    description: "AI will mention beer/wine/cocktail options when asked",
    defaultValue: false,
    group: "core",
  },
  {
    id: "family-meals",
    capabilityKey: "offersFamilyMeals",
    label: "Family Meals",
    question: "Do you offer family meals or meal bundles?",
    description: "Multi-serving packages for families or groups",
    defaultValue: false,
    group: "core",
  },
  {
    id: "loyalty-program",
    capabilityKey: "hasLoyaltyProgram",
    label: "Loyalty Program",
    question: "Do you have a loyalty or rewards program?",
    description: "AI can mention your rewards program to callers",
    defaultValue: false,
    group: "core",
  },
  {
    id: "online-orders",
    capabilityKey: "acceptsOnlineOrders",
    label: "Online Orders",
    question: "Do you accept online orders from your website?",
    description: "AI can direct callers to your online ordering",
    defaultValue: false,
    group: "core",
    onboardingVisible: true,
  },
  {
    id: "meal-prep",
    capabilityKey: "offersMealPrep",
    label: "Meal Prep",
    question: "Do you offer meal prep or subscription services?",
    description: "Weekly meal plans or recurring order subscriptions",
    defaultValue: false,
    group: "advanced",
  },
  {
    id: "group-orders",
    capabilityKey: "handlesGroupOrders",
    label: "Large Group Orders",
    question: "Do you handle large group or party orders?",
    description: "Orders for 10+ people, office lunches, or events",
    defaultValue: false,
    group: "core",
    onboardingVisible: true,
  },
];

const medicalQuestions: ScenarioQuestion[] = [
  {
    id: "hipaa",
    capabilityKey: "requiresHIPAA",
    label: "HIPAA Compliance",
    question: "This practice handles protected health information (PHI)",
    description: "Required for all medical practices. Call recordings and full transcripts are disabled.",
    defaultValue: true,
    blocking: true,
    group: "core",
    onboardingVisible: true,
  },
  {
    id: "telehealth",
    capabilityKey: "hasTelehealth",
    label: "Telehealth",
    question: "Do you offer telehealth or virtual visits?",
    description: "Patients can have appointments via video or phone",
    defaultValue: false,
    group: "core",
    onboardingVisible: true,
  },
  {
    id: "insurance",
    capabilityKey: "requiresInsurance",
    label: "Insurance Verification",
    question: "Do you need to verify insurance before visits?",
    description: "AI will ask callers for insurance information",
    defaultValue: true,
    group: "core",
    onboardingVisible: true,
  },
  {
    id: "symptom-triage",
    capabilityKey: "needsSymptomTriage",
    label: "Symptom Triage",
    question: "Should the AI ask about symptoms to help route calls?",
    description: "AI collects basic symptoms to help prioritize appointments",
    defaultValue: false,
    group: "ai_behavior",
  },
  // New questions
  {
    id: "new-patient-forms",
    capabilityKey: "requiresNewPatientForms",
    label: "New Patient Forms",
    question: "Do new patients need paperwork before their first visit?",
    description: "AI will mention required forms to new callers",
    defaultValue: true,
    impliesModules: ["new_patient_forms"],
    group: "ai_behavior",
    requiredForAI: true,
  },
  {
    id: "referrals",
    capabilityKey: "collectsReferralInfo",
    label: "Referral Info",
    question: "Do you collect referring provider information?",
    description: "AI will ask who referred the patient",
    defaultValue: false,
    impliesModules: ["referrals"],
    group: "ai_behavior",
  },
  {
    id: "medications",
    capabilityKey: "collectsMedications",
    label: "Medications",
    question: "Should the AI ask about current medications?",
    description: "AI will collect a brief medication list from callers",
    defaultValue: false,
    impliesModules: ["medications_intake"],
    group: "ai_behavior",
  },
  // --- Expanded questions ---
  {
    id: "multiple-locations",
    capabilityKey: "hasMultipleLocations",
    label: "Multiple Locations",
    question: "Do you have multiple office locations?",
    description: "AI will ask which location the patient prefers",
    defaultValue: false,
    group: "core",
  },
  {
    id: "workers-comp",
    capabilityKey: "handlesWorkersComp",
    label: "Workers' Comp",
    question: "Do you handle workers' comp or auto injury cases?",
    description: "AI will ask about the type of injury and insurance",
    defaultValue: false,
    group: "core",
  },
  {
    id: "walk-in-patients",
    capabilityKey: "acceptsWalkIns",
    label: "Walk-In Patients",
    question: "Do you accept walk-in patients?",
    description: "Patients can visit without an appointment",
    defaultValue: false,
    group: "core",
  },
  {
    id: "same-day-appointments",
    capabilityKey: "offersSameDayAppointments",
    label: "Same-Day Appointments",
    question: "Do you offer same-day or urgent appointments?",
    description: "AI can offer same-day slots for urgent needs",
    defaultValue: false,
    group: "core",
  },
  {
    id: "on-site-lab",
    capabilityKey: "hasOnSiteLab",
    label: "On-Site Lab",
    question: "Do you have lab or imaging services on-site?",
    description: "AI can inform patients about on-site testing",
    defaultValue: false,
    group: "core",
  },
  {
    id: "payment-plans-medical",
    capabilityKey: "offersPaymentPlans",
    label: "Payment Plans",
    question: "Do you offer payment plans?",
    description: "AI can mention payment plan options for uninsured patients",
    defaultValue: false,
    group: "core",
  },
];

const generalQuestions: ScenarioQuestion[] = [
  {
    id: "appointments",
    capabilityKey: "offersAppointments",
    label: "Appointments",
    question: "Do you schedule appointments or consultations?",
    description: "AI can book appointments directly into your calendar",
    defaultValue: true,
    impliesModules: ["booking"],
    group: "core",
    onboardingVisible: true,
  },
  {
    id: "callbacks",
    capabilityKey: "offersCallbacks",
    label: "Callback Requests",
    question: "Should the AI offer to have someone call back?",
    description: "When AI can't resolve a question, offer a callback",
    defaultValue: true,
    group: "core",
    onboardingVisible: true,
  },
  // New question
  {
    id: "faq-handling",
    capabilityKey: "handlesFAQs",
    label: "FAQ Handling",
    question: "Should the AI answer common questions from your knowledge base?",
    description: "AI uses your FAQs and knowledge base to answer caller questions",
    defaultValue: true,
    impliesModules: ["knowledge_base"],
    group: "ai_behavior",
    requiredForAI: true,
  },
  // --- Expanded questions ---
  {
    id: "free-consultation",
    capabilityKey: "offersFreeConsultation",
    label: "Free Consultations",
    question: "Do you offer free initial consultations?",
    description: "AI will let callers know the first consultation is free",
    defaultValue: false,
    group: "core",
  },
  {
    id: "serves-residential-commercial",
    capabilityKey: "servesResidentialCommercial",
    label: "Residential & Commercial",
    question: "Do you serve residential, commercial, or both?",
    description: "AI will tailor questions based on customer type",
    defaultValue: true,
    group: "core",
  },
  {
    id: "after-hours-contact",
    capabilityKey: "needsAfterHoursContact",
    label: "After-Hours Contact",
    question: "Do you need emergency or after-hours contact?",
    description: "AI can take urgent messages outside business hours",
    defaultValue: false,
    impliesModules: ["after_hours_handling"],
    group: "core",
  },
  {
    id: "physical-office",
    capabilityKey: "hasPhysicalOffice",
    label: "Physical Office",
    question: "Do you have a physical office or are you remote?",
    description: "AI will provide directions or mention remote availability",
    defaultValue: true,
    group: "core",
  },
  {
    id: "written-quotes",
    capabilityKey: "providesWrittenQuotes",
    label: "Written Quotes",
    question: "Do you provide written quotes or proposals?",
    description: "AI will mention that a formal quote will be sent",
    defaultValue: false,
    group: "core",
  },
];

// ---------------------------------------------------------------------------
// Cross-mode questions (appear in multiple modes based on industry)
// ---------------------------------------------------------------------------

const crossModeQuestions: (ScenarioQuestion & { applicableModes: BusinessMode[] })[] = [
  {
    id: "walk-in-dropoffs",
    capabilityKey: "acceptsDropOffs",
    label: "Walk-In Drop-offs / Tow-Ins",
    question: "Do you accept walk-in drop-offs or tow-ins?",
    description: "Vehicles can be towed in or dropped off without a prior appointment",
    defaultValue: false,
    impliesModules: ["dispatch_queue"],
    group: "advanced",
    industryFilter: { slugs: ["body_shop", "auto_glass", "collision_center"] },
    applicableModes: ["service"],
  },
  {
    id: "vehicle-dropoffs",
    capabilityKey: "acceptsVehicleDropOffs",
    label: "Vehicle Drop-Offs",
    question: "Do you accept vehicle drop-offs?",
    description: "Customers can leave their vehicle and pick it up later when work is done",
    defaultValue: false,
    group: "core",
    industryFilter: { slugs: ["auto_repair", "auto_detailing", "tire_shop", "oil_change", "transmission_shop", "engine_repair", "brake_shop", "muffler_shop"] },
    applicableModes: ["service"],
  },
  {
    id: "collects-health-info",
    capabilityKey: "collectsHealthInfo",
    label: "Health/Medical Info",
    question: "Do you collect client health or medical information?",
    description: "Intake includes health history, allergies, or medical forms",
    defaultValue: false,
    impliesModules: ["medical_intake"],
    group: "advanced",
    industryFilter: { categories: ["beauty_wellness", "fitness", "pet_services"] },
    applicableModes: ["service"],
  },
  {
    id: "event-reservations",
    capabilityKey: "offersEventBooking",
    label: "Event Reservations",
    question: "Do you take reservations for private events?",
    description: "Private dining, parties, or event space booking",
    defaultValue: false,
    impliesModules: ["booking"],
    group: "advanced",
    applicableModes: ["food"],
  },
  {
    id: "local-delivery",
    capabilityKey: "offersLocalDelivery",
    label: "Local Delivery",
    question: "Do you deliver to customer locations?",
    description: "You deliver products or goods to customers directly",
    defaultValue: false,
    impliesModules: ["dispatch_queue"],
    group: "advanced",
    applicableModes: ["general"],
  },
  {
    id: "retail-products",
    capabilityKey: "sellsRetailProducts",
    label: "Retail Products",
    question: "Do you sell retail products?",
    description: "Supplements, skincare, or other products for purchase",
    defaultValue: false,
    group: "advanced",
    applicableModes: ["medical"],
  },
];

const salesQuestions: ScenarioQuestion[] = [
  {
    id: "showroom-appointments",
    capabilityKey: "offersShowroomAppointments",
    label: "Showroom Appointments",
    question: "Do you schedule showroom or office appointments?",
    description: "Beyond test drives — general visit scheduling",
    defaultValue: true,
    impliesModules: ["booking"],
    group: "core",
    onboardingVisible: true,
    followUp: {
      id: "booking-mode-sales",
      answerKey: "_aiBookingMode",
      label: "How should appointments be confirmed?",
      type: "radio",
      options: [
        { value: "auto_book", label: "Auto-book instantly", description: "AI confirms the appointment right away based on your availability" },
        { value: "pending_approval", label: "Require your approval", description: "AI finds a time but tells the caller you'll confirm — you approve or adjust" },
      ],
      defaultValue: "auto_book",
    },
  },
  {
    id: "test-drives",
    capabilityKey: "offersTestDrives",
    label: "Test Drives / Demos",
    question: "Do you offer test drives or product demos?",
    description: "Customers can schedule time to see/try your products",
    defaultValue: true,
    impliesModules: ["test_drives"],
    group: "core",
    onboardingVisible: true,
    industryFilter: { slugs: ["car-dealership-new", "car-dealership-used", "car-dealership-full", "rv-dealer", "boat-dealer", "motorcycle-dealer", "equipment-sales"] },
  },
  {
    id: "lead-tracking",
    capabilityKey: "tracksLeads",
    label: "Lead Tracking",
    question: "Do you track leads or sales opportunities?",
    description: "The AI will capture lead details and create follow-up tasks",
    defaultValue: true,
    impliesModules: ["sales_leads"],
    group: "core",
    onboardingVisible: true,
    requiredForAI: true,
  },
  {
    id: "follow-up-sequences",
    capabilityKey: "wantsFollowUpSequences",
    label: "Automated Follow-Ups",
    question: "Should the AI send follow-up texts to leads who don't book?",
    description: "Automatic text messages to re-engage interested callers",
    defaultValue: true,
    impliesModules: ["lead_recovery"],
    group: "core",
    onboardingVisible: true,
  },
  {
    id: "financing",
    capabilityKey: "offersFinancing",
    label: "Financing Options",
    question: "Do you offer financing options?",
    description: "In-house financing, bank partnerships, or loan referrals",
    defaultValue: true,
    group: "core",
    requiredForAI: true,
    onboardingVisible: true,
  },
  {
    id: "trade-ins",
    capabilityKey: "acceptsTradeIns",
    label: "Trade-Ins",
    question: "Do you accept trade-ins?",
    description: "Customers can trade in their current vehicle/product",
    defaultValue: true,
    group: "core",
    requiredForAI: true,
    onboardingVisible: true,
    industryFilter: { slugs: ["car-dealership-new", "car-dealership-used", "car-dealership-full", "rv-dealer", "boat-dealer", "motorcycle-dealer", "equipment-sales"] },
  },
  {
    id: "inventory-reference",
    capabilityKey: "hasInventoryReference",
    label: "Inventory Reference",
    question: "Do you have inventory the AI should reference?",
    description: "The AI can mention available vehicles/products during calls",
    defaultValue: false,
    impliesModules: ["sales_inventory"],
    group: "core",
    onboardingVisible: true,
  },
  {
    id: "crm-integration",
    capabilityKey: "hasCRMIntegration",
    label: "CRM / DMS",
    question: "Do you use a CRM or DMS system?",
    description: "DealerSocket, vAuto, CDK, Salesforce, HubSpot, etc.",
    defaultValue: false,
    group: "advanced",
    industryFilter: { slugs: ["car-dealership-new", "car-dealership-used", "car-dealership-full", "rv-dealer", "boat-dealer", "motorcycle-dealer"] },
  },
  {
    id: "sales-team",
    capabilityKey: "hasSalesTeam",
    label: "Sales Team Routing",
    question: "Should the AI route leads to specific sales reps?",
    description: "Leads are assigned to named team members",
    defaultValue: false,
    group: "ai_behavior",
    onboardingVisible: true,
  },
];

// ---------------------------------------------------------------------------
// Question map
// ---------------------------------------------------------------------------

const questionsByMode: Record<BusinessMode, ScenarioQuestion[]> = {
  service: serviceQuestions,
  dispatch: dispatchQuestions,
  food: foodQuestions,
  medical: medicalQuestions,
  general: generalQuestions,
  sales: salesQuestions,
};

// ---------------------------------------------------------------------------
// Group labels for visual grouping
// ---------------------------------------------------------------------------

export const groupLabels: Record<QuestionGroup, string> = {
  core: "Core Operations",
  ai_behavior: "AI Behavior",
  advanced: "Advanced",
};

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/** Returns the scenario question set for a given business mode, optionally filtered by industry */
export function getQuestionsForMode(
  mode: BusinessMode,
  industryContext?: { slug: string; category: string }
): ScenarioQuestion[] {
  const modeQuestions = questionsByMode[mode] ?? generalQuestions;

  // Append applicable cross-mode questions for this mode
  const applicableCrossMode: ScenarioQuestion[] = crossModeQuestions
    .filter((q) => q.applicableModes.includes(mode))
    .map(({ applicableModes: _, ...rest }) => rest);

  const all = [...modeQuestions, ...applicableCrossMode];

  if (!industryContext) return all;

  return all.filter((q) => {
    // industryFilter is an allowlist — only show for matching industries
    if (q.industryFilter) {
      const { categories, slugs } = q.industryFilter;
      if (categories && !categories.includes(industryContext.category)) return false;
      if (slugs && !slugs.includes(industryContext.slug)) return false;
    }

    // suppressedFor is a blocklist — hide for these industries (answer applied silently)
    if (q.suppressedFor) {
      const { categories, slugs } = q.suppressedFor;
      if (categories?.includes(industryContext.category)) return false;
      if (slugs?.includes(industryContext.slug)) return false;
    }

    return true;
  });
}

/**
 * Merges implied modules from scenario answers into the base module set.
 * When a scenario answer is `true` and has `impliesModules`, those modules
 * are added to the set. When `false`, they are removed (unless they came
 * from the industry template, which is the base set).
 */
export function deriveModulesFromScenario(
  baseModules: string[],
  answers: Record<string, boolean>,
  questions: ScenarioQuestion[]
): string[] {
  const moduleSet = new Set(baseModules);

  for (const q of questions) {
    if (!q.impliesModules) continue;

    const answered = answers[q.capabilityKey];
    for (const mod of q.impliesModules) {
      if (answered) {
        moduleSet.add(mod);
      } else if (answered === false) {
        // Remove if overridesBase is set OR if it wasn't in the original base set
        if (q.overridesBase || !baseModules.includes(mod)) {
          moduleSet.delete(mod);
        }
      }
    }
  }

  return Array.from(moduleSet);
}

/**
 * Builds the initial scenario answers from question defaults for a mode.
 * Respects `preAnsweredFor`: if an industry matches, the answer is set to `true`
 * instead of the question's base defaultValue.
 */
export function getDefaultAnswers(
  mode: BusinessMode,
  industryContext?: { slug: string; category: string }
): Record<string, boolean> {
  const questions = getQuestionsForMode(mode, industryContext);
  const answers: Record<string, boolean> = {};
  for (const q of questions) {
    // If this industry has a known answer for this question, apply it
    const preAnswered = industryContext ? isPreAnswered(q, industryContext) : false;
    answers[q.capabilityKey] = preAnswered ? true : q.defaultValue;
  }
  return answers;
}

/**
 * Checks if a question is pre-answered for a given industry context.
 * Pre-answered questions are shown pre-checked but can still be toggled off.
 */
export function isPreAnswered(
  q: ScenarioQuestion,
  ctx?: { slug: string; category: string }
): boolean {
  if (!ctx || !q.preAnsweredFor) return false;
  const { slugs, categories } = q.preAnsweredFor;
  if (slugs?.includes(ctx.slug)) return true;
  if (categories?.includes(ctx.category)) return true;
  return false;
}
