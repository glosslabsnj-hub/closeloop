/**
 * Interview Question Bank
 * 
 * Mode-specific questions for the guided Business Brain setup interview.
 * Questions are scenario-based and map directly to database fields.
 */

import type { BusinessMode } from "@/hooks/useTenantConfig";

export type QuestionType = 
  | "text" 
  | "textarea" 
  | "select" 
  | "multi-select" 
  | "boolean" 
  | "number" 
  | "time-range"
  | "hours-grid"
  | "scenario";

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface FieldMapping {
  table: string;
  column: string;
  /** Transform function name to apply before saving */
  transform?: string;
}

export interface InterviewQuestion {
  id: string;
  /** The scenario or question text */
  question: string;
  /** Helper text shown below the question */
  helpText?: string;
  type: QuestionType;
  options?: QuestionOption[];
  /** Placeholder for text inputs */
  placeholder?: string;
  /** Where this answer maps in the database */
  fieldMapping: FieldMapping[];
  /** Only show if these conditions are met */
  showIf?: {
    questionId: string;
    value: string | boolean | string[];
  };
  /** Is this question required? */
  required?: boolean;
  /** Default value */
  defaultValue?: string | boolean | number;
  /** AI preview template - shows how AI will use this */
  aiPreviewTemplate?: string;
}

export interface InterviewStep {
  id: string;
  title: string;
  description: string;
  /** Which modes this step applies to */
  modes: BusinessMode[] | "all";
  questions: InterviewQuestion[];
  /** Summary template shown after completion */
  summaryTemplate?: string;
}

// ============================================
// STEP 1: BUSINESS IDENTITY (All Modes)
// ============================================

const identityQuestions: InterviewQuestion[] = [
  {
    id: "business_name",
    question: "What's your business name?",
    helpText: "This is how your AI will introduce itself to callers.",
    type: "text",
    placeholder: "e.g., Mike's Towing, Bella's Salon",
    fieldMapping: [{ table: "tenants", column: "name" }],
    required: true,
    aiPreviewTemplate: "Thank you for calling {value}. How can I help you today?",
  },
  {
    id: "business_tagline",
    question: "In one sentence, what makes your business special?",
    helpText: "Your AI will mention this to build trust with callers.",
    type: "textarea",
    placeholder: "e.g., Family-owned since 1985, fastest response in the city",
    fieldMapping: [{ table: "tenants", column: "tagline" }],
    aiPreviewTemplate: "We're {value}.",
  },
  {
    id: "business_address",
    question: "What's your business address?",
    helpText: "Used for service area calculations and directions.",
    type: "text",
    placeholder: "123 Main St, City, State 12345",
    fieldMapping: [{ table: "tenants", column: "address" }],
  },
  {
    id: "timezone",
    question: "What timezone are you in?",
    type: "select",
    options: [
      { value: "America/New_York", label: "Eastern Time" },
      { value: "America/Chicago", label: "Central Time" },
      { value: "America/Denver", label: "Mountain Time" },
      { value: "America/Los_Angeles", label: "Pacific Time" },
      { value: "America/Phoenix", label: "Arizona Time" },
      { value: "America/Anchorage", label: "Alaska Time" },
      { value: "Pacific/Honolulu", label: "Hawaii Time" },
    ],
    fieldMapping: [{ table: "tenants", column: "timezone" }],
    required: true,
    defaultValue: "America/New_York",
  },
];

// ============================================
// STEP 2: OPERATING HOURS (All Modes)
// ============================================

const hoursQuestions: InterviewQuestion[] = [
  {
    id: "same_hours_daily",
    question: "Do you have the same hours every day?",
    type: "boolean",
    fieldMapping: [], // Just controls flow
    defaultValue: false,
  },
  {
    id: "hours_grid",
    question: "Set your operating hours for each day",
    helpText: "Your AI will know when you're open and can take calls.",
    type: "hours-grid",
    fieldMapping: [{ table: "availability_slots", column: "bulk", transform: "parseHoursGrid" }],
    required: true,
  },
  {
    id: "after_hours_behavior",
    question: "What should happen when someone calls after hours?",
    type: "select",
    options: [
      { value: "voicemail", label: "Take a message", description: "AI takes their info and you call back" },
      { value: "answer_anyway", label: "AI still answers", description: "For 24/7 businesses or emergencies" },
      { value: "forward", label: "Forward to a number", description: "Ring your personal phone" },
    ],
    fieldMapping: [{ table: "assistant_settings", column: "off_behavior" }],
    defaultValue: "voicemail",
    aiPreviewTemplate: "We're currently closed. {value === 'voicemail' ? 'I can take a message and have someone call you back.' : value === 'forward' ? 'Let me connect you with someone.' : 'How can I help you?'}",
  },
];

// ============================================
// STEP 3: WHAT YOU OFFER (Mode-Specific)
// ============================================

const dispatchOfferingsQuestions: InterviewQuestion[] = [
  {
    id: "dispatch_services",
    question: "What services do you offer?",
    helpText: "Select all that apply. Your AI will know how to handle each type.",
    type: "multi-select",
    options: [
      { value: "towing", label: "Towing", description: "Local and long-distance tows" },
      { value: "roadside", label: "Roadside Assistance", description: "Jump starts, tire changes, lockouts" },
      { value: "impound", label: "Impound Lot", description: "Vehicle storage and releases" },
      { value: "recovery", label: "Vehicle Recovery", description: "Winch-outs, off-road recovery" },
    ],
    fieldMapping: [{ table: "tenants", column: "context_fields_json", transform: "mergeDispatchServices" }],
    required: true,
  },
  {
    id: "towing_base_rate",
    question: "What's your base rate for a local tow?",
    helpText: "The AI will quote this or say 'starting at' if it varies.",
    type: "number",
    placeholder: "e.g., 85",
    fieldMapping: [{ table: "services", column: "price_amount", transform: "createTowingService" }],
    showIf: { questionId: "dispatch_services", value: ["towing"] },
    aiPreviewTemplate: "Our base rate for a local tow starts at ${value}.",
  },
  {
    id: "quote_style",
    question: "A customer asks 'How much for a tow?' How should your AI respond?",
    type: "scenario",
    options: [
      { value: "exact", label: "Give exact quotes", description: "You have fixed pricing" },
      { value: "starting_at", label: "Say 'starting at'", description: "Final price depends on details" },
      { value: "need_info", label: "Ask for details first", description: "Quote varies by distance/vehicle" },
    ],
    fieldMapping: [{ table: "tenants", column: "context_fields_json", transform: "setQuoteStyle" }],
    aiPreviewTemplate: "{value === 'exact' ? 'A local tow is $85.' : value === 'starting_at' ? 'Local tows start at $85, depending on the distance.' : 'I can give you a quote - where are you located and what type of vehicle is it?'}",
  },
  {
    id: "after_hours_surcharge",
    question: "A customer calls at 2 AM needing a tow. Do you charge extra for after-hours?",
    type: "scenario",
    options: [
      { value: "no", label: "No, same rate 24/7" },
      { value: "1.25", label: "Yes, 25% extra" },
      { value: "1.5", label: "Yes, 50% extra" },
      { value: "custom", label: "Custom amount" },
    ],
    fieldMapping: [{ table: "dispatch_policies", column: "after_hours_multiplier" }],
    showIf: { questionId: "dispatch_services", value: ["towing", "roadside", "recovery"] },
    aiPreviewTemplate: "{value === 'no' ? 'Our rates are the same 24/7.' : 'There is a surcharge for after-hours calls.'}",
  },
  {
    id: "operates_impound",
    question: "Do you operate an impound lot?",
    type: "boolean",
    fieldMapping: [{ table: "tenants", column: "context_fields_json", transform: "setImpoundEnabled" }],
  },
  {
    id: "impound_daily_rate",
    question: "What's your daily storage rate?",
    type: "number",
    placeholder: "e.g., 45",
    fieldMapping: [{ table: "impound_settings", column: "daily_storage_rate" }],
    showIf: { questionId: "operates_impound", value: true },
    aiPreviewTemplate: "Storage is ${value} per day.",
  },
];

const serviceOfferingsQuestions: InterviewQuestion[] = [
  {
    id: "service_location",
    question: "Where do you provide your services?",
    type: "select",
    options: [
      { value: "shop", label: "At my location", description: "Customers come to you" },
      { value: "mobile", label: "I travel to customers", description: "Mobile/on-site service" },
      { value: "both", label: "Both", description: "Some services on-site, some mobile" },
    ],
    fieldMapping: [{ table: "tenants", column: "context_fields_json", transform: "setServiceLocation" }],
    required: true,
  },
  {
    id: "requires_deposits",
    question: "Do you require deposits for appointments?",
    type: "scenario",
    options: [
      { value: "no", label: "No deposits required" },
      { value: "some", label: "For some services", description: "Large jobs or new customers" },
      { value: "all", label: "Yes, for all appointments" },
    ],
    fieldMapping: [{ table: "assistant_settings", column: "deposit_required" }],
    aiPreviewTemplate: "{value === 'no' ? 'No deposit is required.' : 'We do require a deposit to book.'}",
  },
  {
    id: "deposit_amount",
    question: "How much is the deposit?",
    type: "text",
    placeholder: "e.g., $50 or 50%",
    fieldMapping: [{ table: "assistant_settings", column: "deposit_amount" }],
    showIf: { questionId: "requires_deposits", value: ["some", "all"] },
    aiPreviewTemplate: "The deposit is {value}.",
  },
  {
    id: "buffer_time",
    question: "How much time do you need between appointments?",
    type: "select",
    options: [
      { value: "0", label: "No buffer needed" },
      { value: "15", label: "15 minutes" },
      { value: "30", label: "30 minutes" },
      { value: "60", label: "1 hour" },
    ],
    fieldMapping: [{ table: "tenants", column: "appointment_buffer_minutes" }],
    defaultValue: "15",
  },
];

const foodOfferingsQuestions: InterviewQuestion[] = [
  {
    id: "food_service_types",
    question: "How can customers get food from you?",
    type: "multi-select",
    options: [
      { value: "pickup", label: "Pickup", description: "Customers order and pick up" },
      { value: "delivery", label: "Delivery", description: "You deliver to customers" },
      { value: "dine_in", label: "Dine-in", description: "Eat at your location" },
      { value: "catering", label: "Catering", description: "Large orders for events" },
    ],
    fieldMapping: [{ table: "food_order_settings", column: "order_types" }],
    required: true,
  },
  {
    id: "takes_reservations",
    question: "Do you take reservations?",
    type: "boolean",
    fieldMapping: [{ table: "tenants", column: "enabled_modules", transform: "toggleReservations" }],
    showIf: { questionId: "food_service_types", value: ["dine_in"] },
  },
  {
    id: "reservation_advance_days",
    question: "How far in advance can customers book a reservation?",
    type: "select",
    options: [
      { value: "7", label: "Up to 1 week" },
      { value: "14", label: "Up to 2 weeks" },
      { value: "30", label: "Up to 1 month" },
      { value: "90", label: "Up to 3 months" },
    ],
    fieldMapping: [{ table: "food_order_settings", column: "reservation_advance_days" }],
    showIf: { questionId: "takes_reservations", value: true },
  },
  {
    id: "prep_time_normal",
    question: "What's your typical food prep time?",
    type: "select",
    options: [
      { value: "10", label: "10 minutes" },
      { value: "15", label: "15 minutes" },
      { value: "20", label: "20 minutes" },
      { value: "30", label: "30 minutes" },
      { value: "45", label: "45 minutes" },
    ],
    fieldMapping: [{ table: "food_order_settings", column: "prep_time_minutes" }],
    defaultValue: "20",
    aiPreviewTemplate: "Your order will be ready in about {value} minutes.",
  },
  {
    id: "delivery_radius",
    question: "How far do you deliver?",
    type: "select",
    options: [
      { value: "3", label: "3 miles" },
      { value: "5", label: "5 miles" },
      { value: "10", label: "10 miles" },
      { value: "15", label: "15+ miles" },
    ],
    fieldMapping: [{ table: "food_order_settings", column: "delivery_radius_miles" }],
    showIf: { questionId: "food_service_types", value: ["delivery"] },
  },
  {
    id: "catering_minimum",
    question: "What's your minimum order for catering?",
    type: "number",
    placeholder: "e.g., 100",
    fieldMapping: [{ table: "catering_knowledge", column: "min_order_amount" }],
    showIf: { questionId: "food_service_types", value: ["catering"] },
    aiPreviewTemplate: "Our minimum catering order is ${value}.",
  },
];

const medicalOfferingsQuestions: InterviewQuestion[] = [
  {
    id: "appointment_types",
    question: "What types of appointments do you offer?",
    type: "multi-select",
    options: [
      { value: "in_person", label: "In-person visits" },
      { value: "telehealth", label: "Telehealth/Video calls" },
      { value: "phone", label: "Phone consultations" },
      { value: "home_visit", label: "Home visits" },
    ],
    fieldMapping: [{ table: "medical_practice_settings", column: "appointment_types" }],
    required: true,
  },
  {
    id: "accepts_insurance",
    question: "Do you accept insurance?",
    type: "boolean",
    fieldMapping: [{ table: "medical_practice_settings", column: "accepts_insurance" }],
  },
  {
    id: "hipaa_covered",
    question: "Is your practice a HIPAA-covered entity?",
    helpText: "This affects how your AI handles patient information.",
    type: "boolean",
    fieldMapping: [{ table: "tenants", column: "hipaa_mode" }],
    defaultValue: true,
    aiPreviewTemplate: "Your information is kept confidential in accordance with HIPAA regulations.",
  },
  {
    id: "triage_needed",
    question: "Should your AI ask symptom-related questions before booking?",
    type: "boolean",
    fieldMapping: [{ table: "medical_practice_settings", column: "triage_enabled" }],
    aiPreviewTemplate: "Before I book your appointment, can you tell me briefly what you'd like to be seen for?",
  },
];

const generalOfferingsQuestions: InterviewQuestion[] = [
  {
    id: "service_description",
    question: "Briefly describe what your business does",
    helpText: "This helps your AI understand and explain your services.",
    type: "textarea",
    placeholder: "e.g., We're a consulting firm specializing in...",
    fieldMapping: [{ table: "tenants", column: "tagline" }],
    required: true,
  },
  {
    id: "primary_action",
    question: "What's the main thing callers want to do?",
    type: "select",
    options: [
      { value: "book", label: "Book an appointment" },
      { value: "callback", label: "Request a callback" },
      { value: "info", label: "Get information" },
      { value: "quote", label: "Get a quote" },
    ],
    fieldMapping: [{ table: "tenants", column: "context_fields_json", transform: "setPrimaryAction" }],
  },
];

// ============================================
// STEP 4: WHERE YOU SERVE (Conditional)
// ============================================

const coverageQuestions: InterviewQuestion[] = [
  {
    id: "service_radius",
    question: "How far do you travel for service calls?",
    type: "select",
    options: [
      { value: "10", label: "Up to 10 miles" },
      { value: "25", label: "Up to 25 miles" },
      { value: "50", label: "Up to 50 miles" },
      { value: "100", label: "50+ miles" },
    ],
    fieldMapping: [{ table: "tenants", column: "service_radius_miles" }],
  },
  {
    id: "travel_fee",
    question: "Do you charge a travel fee for mobile services?",
    type: "scenario",
    options: [
      { value: "no", label: "No travel fee" },
      { value: "flat", label: "Flat fee", description: "Same fee regardless of distance" },
      { value: "per_mile", label: "Per mile", description: "Charge based on distance" },
    ],
    fieldMapping: [{ table: "tenants", column: "context_fields_json", transform: "setTravelFeeType" }],
  },
  {
    id: "typical_eta",
    question: "How long does it typically take you to arrive within your service area?",
    type: "select",
    options: [
      { value: "15-30", label: "15-30 minutes" },
      { value: "30-45", label: "30-45 minutes" },
      { value: "45-60", label: "45-60 minutes" },
      { value: "varies", label: "Varies - let me check" },
    ],
    fieldMapping: [{ table: "tenants", column: "context_fields_json", transform: "setTypicalETA" }],
    aiPreviewTemplate: "We can typically be there in {value}.",
  },
];

// ============================================
// STEP 5: POLICIES (Mode-Specific)
// ============================================

const policiesQuestions: InterviewQuestion[] = [
  {
    id: "cancellation_notice",
    question: "How much notice do you require for cancellations?",
    type: "select",
    options: [
      { value: "0", label: "No notice required" },
      { value: "2", label: "2 hours" },
      { value: "24", label: "24 hours" },
      { value: "48", label: "48 hours" },
    ],
    fieldMapping: [{ table: "assistant_settings", column: "cancellation_notice_hours" }],
    defaultValue: "24",
    aiPreviewTemplate: "We do require {value} hours notice for cancellations.",
  },
  {
    id: "cancellation_fee",
    question: "Do you charge a fee for late cancellations or no-shows?",
    type: "scenario",
    options: [
      { value: "no", label: "No fee" },
      { value: "deposit", label: "Forfeit the deposit" },
      { value: "partial", label: "Partial charge" },
      { value: "full", label: "Full charge" },
    ],
    fieldMapping: [{ table: "service_policies", column: "cancellation_fee_type" }],
  },
  {
    id: "ai_never_promise",
    question: "What should your AI NEVER promise or guarantee?",
    helpText: "For example: exact arrival times, specific results, price matches",
    type: "textarea",
    placeholder: "e.g., Exact arrival times (traffic varies), same-day appointments, discounts",
    fieldMapping: [{ table: "tenants", column: "context_fields_json", transform: "setNeverPromise" }],
  },
];

// ============================================
// STEP 6: AI PERSONALITY
// ============================================

const aiPersonalityQuestions: InterviewQuestion[] = [
  {
    id: "ai_tone",
    question: "What tone should your AI use?",
    type: "select",
    options: [
      { value: "friendly", label: "Friendly & Casual", description: "Warm and conversational" },
      { value: "professional", label: "Professional", description: "Polished and businesslike" },
      { value: "formal", label: "Formal", description: "Serious and respectful" },
    ],
    fieldMapping: [{ table: "ai_assistants", column: "tone" }],
    defaultValue: "friendly",
  },
  {
    id: "greeting_style",
    question: "How should your AI greet callers?",
    type: "scenario",
    options: [
      { value: "simple", label: "Simple", description: "Thank you for calling [Business]. How can I help?" },
      { value: "warm", label: "Warm", description: "Hi there! Thanks for calling [Business]. What can I do for you today?" },
      { value: "custom", label: "Custom", description: "I'll write my own greeting" },
    ],
    fieldMapping: [{ table: "ai_assistants", column: "greeting_script", transform: "generateGreeting" }],
  },
  {
    id: "custom_greeting",
    question: "Write your custom greeting",
    type: "textarea",
    placeholder: "e.g., Thanks for calling Mike's Towing, your 24/7 roadside partner. How can I help you today?",
    fieldMapping: [{ table: "ai_assistants", column: "greeting_script" }],
    showIf: { questionId: "greeting_style", value: "custom" },
  },
  {
    id: "always_mention",
    question: "Is there anything your AI should always mention?",
    helpText: "For example: current promotions, your website, that you're family-owned",
    type: "textarea",
    placeholder: "e.g., We're running a 10% discount this month, mention our 5-star reviews",
    fieldMapping: [{ table: "tenants", column: "context_fields_json", transform: "setAlwaysMention" }],
  },
];

// ============================================
// ASSEMBLE STEPS
// ============================================

export const INTERVIEW_STEPS: InterviewStep[] = [
  {
    id: "identity",
    title: "Business Identity",
    description: "Let's start with the basics about your business.",
    modes: "all",
    questions: identityQuestions,
    summaryTemplate: "{business_name} - {business_tagline}",
  },
  {
    id: "hours",
    title: "Operating Hours",
    description: "When is your business open?",
    modes: "all",
    questions: hoursQuestions,
    summaryTemplate: "{hours_summary}",
  },
  {
    id: "offerings-dispatch",
    title: "Services & Rates",
    description: "Tell us about the services you provide.",
    modes: ["dispatch"],
    questions: dispatchOfferingsQuestions,
    summaryTemplate: "{services_count} services configured",
  },
  {
    id: "offerings-service",
    title: "Services & Pricing",
    description: "Tell us about your services and how you operate.",
    modes: ["service"],
    questions: serviceOfferingsQuestions,
    summaryTemplate: "{services_count} services configured",
  },
  {
    id: "offerings-food",
    title: "Menu & Orders",
    description: "Tell us about your food service.",
    modes: ["food"],
    questions: foodOfferingsQuestions,
    summaryTemplate: "{order_types_summary}",
  },
  {
    id: "offerings-medical",
    title: "Appointments & Insurance",
    description: "Tell us about your practice.",
    modes: ["medical"],
    questions: medicalOfferingsQuestions,
    summaryTemplate: "{appointment_types_summary}",
  },
  {
    id: "offerings-general",
    title: "About Your Business",
    description: "Help your AI understand what you do.",
    modes: ["general"],
    questions: generalOfferingsQuestions,
    summaryTemplate: "{service_description}",
  },
  {
    id: "coverage",
    title: "Service Area",
    description: "Where do you provide your services?",
    modes: ["dispatch", "service"],
    questions: coverageQuestions,
    summaryTemplate: "Up to {service_radius} miles",
  },
  {
    id: "policies",
    title: "Policies & Rules",
    description: "Set expectations for your customers.",
    modes: "all",
    questions: policiesQuestions,
    summaryTemplate: "{cancellation_notice}h cancellation notice",
  },
  {
    id: "ai-personality",
    title: "AI Personality",
    description: "Customize how your AI sounds.",
    modes: "all",
    questions: aiPersonalityQuestions,
    summaryTemplate: "{ai_tone} tone",
  },
];

/**
 * Get steps applicable to a given business mode
 */
export function getStepsForMode(mode: BusinessMode): InterviewStep[] {
  return INTERVIEW_STEPS.filter(step => 
    step.modes === "all" || step.modes.includes(mode)
  );
}

/**
 * Get total question count for a mode
 */
export function getQuestionCountForMode(mode: BusinessMode): number {
  const steps = getStepsForMode(mode);
  return steps.reduce((sum, step) => sum + step.questions.length, 0);
}

/**
 * Estimate interview duration in minutes
 */
export function estimateInterviewDuration(mode: BusinessMode): number {
  const questionCount = getQuestionCountForMode(mode);
  // Assume ~30 seconds per question on average
  return Math.ceil(questionCount * 0.5);
}
