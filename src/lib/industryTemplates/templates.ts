/**
 * Industry Templates Registry
 *
 * Pre-configured templates for different business types.
 * Each template includes services, required questions, policies,
 * service area defaults, and scheduling recommendations.
 *
 * Templates focus on the 4 core industries + a fallback:
 * - detailing (auto detailing)
 * - towing (roadside/towing)
 * - food (restaurant/food service)
 * - medical (medical intake/medspa)
 * - other (generic service business)
 */

import type {
  IndustryTemplate,
  ServiceTemplateItem,
  RequiredQuestionItem,
  PolicyItem,
  FAQItem,
  ObjectionItem,
  ServiceAreaDefaults,
  SchedulingDefaults,
} from "./types";

// ============================================================================
// COMMON ELEMENTS
// ============================================================================

const commonObjections: ObjectionItem[] = [
  {
    objection: "That's too expensive",
    response:
      "I understand price is important. We focus on quality and most customers find the value exceeds the cost. Would you like to hear about our most popular package?",
  },
  {
    objection: "I need to think about it",
    response:
      "Of course! Would it help if I answered any specific questions? I can also hold a spot for you for 24 hours.",
  },
  {
    objection: "I'll call back later",
    response:
      "No problem! Would you like me to send you a text with our info and a link to book when you're ready?",
  },
  {
    objection: "Can I get a discount?",
    response:
      "We offer our best pricing upfront, but we do have special packages. Let me tell you about those options.",
  },
];

const commonFAQs: FAQItem[] = [
  {
    question: "What are your hours?",
    answer: "Our hours vary - I can check availability for you right now!",
  },
  {
    question: "Do you require a deposit?",
    answer: "We'll discuss payment details when we schedule your appointment.",
  },
  {
    question: "What forms of payment do you accept?",
    answer: "We accept all major credit cards, cash, and digital payments.",
  },
  {
    question: "Are you licensed and insured?",
    answer: "Yes, we are fully licensed and insured for your protection.",
  },
];

// ============================================================================
// DETAILING TEMPLATE
// ============================================================================

const detailingServices: ServiceTemplateItem[] = [
  {
    name: "Basic Wash",
    description: "Exterior wash with hand dry",
    base_price_model: "fixed",
    fixed_price_cents: 5000,
    duration_minutes: 60,
    tags: ["exterior", "wash"],
  },
  {
    name: "Interior Detail",
    description: "Full interior cleaning including vacuuming, wipe-down, and conditioning",
    base_price_model: "starting_at",
    starting_price_cents: 15000,
    duration_minutes: 120,
    tags: ["interior", "detail"],
  },
  {
    name: "Exterior Detail",
    description: "Hand wash, clay bar, polish, and wax",
    base_price_model: "starting_at",
    starting_price_cents: 12500,
    duration_minutes: 120,
    tags: ["exterior", "detail"],
  },
  {
    name: "Full Detail",
    description: "Complete interior and exterior detailing",
    base_price_model: "starting_at",
    starting_price_cents: 25000,
    duration_minutes: 180,
    tags: ["interior", "exterior", "detail"],
  },
  {
    name: "Ceramic Coating",
    description: "Professional ceramic coating application for long-lasting protection",
    base_price_model: "starting_at",
    starting_price_cents: 80000,
    duration_minutes: 480,
    tags: ["protection", "ceramic"],
  },
  {
    name: "Paint Correction",
    description: "Multi-stage paint correction to remove swirls and scratches",
    base_price_model: "starting_at",
    starting_price_cents: 40000,
    duration_minutes: 240,
    tags: ["correction", "paint"],
  },
];

const detailingQuestions: RequiredQuestionItem[] = [
  {
    intent: "booking",
    key: "vehicle_type",
    label: "Vehicle Type",
    ask_prompt: "What type of vehicle do you have? Is it a sedan, SUV, truck, or something else?",
    why_needed: "Pricing varies by vehicle size",
    required: true,
  },
  {
    intent: "booking",
    key: "vehicle_condition",
    label: "Current Condition",
    ask_prompt: "How would you describe the current condition - is it lightly dirty, moderately dirty, or very dirty?",
    why_needed: "Helps determine service level needed",
    required: false,
  },
  {
    intent: "booking",
    key: "preferred_date",
    label: "Preferred Date",
    ask_prompt: "When would you like to schedule your detail? Do you have a specific date in mind?",
    why_needed: "Required to book appointment",
    required: true,
  },
  {
    intent: "booking",
    key: "service_location",
    label: "Service Location",
    ask_prompt: "Would you like to come to our shop, or do you prefer mobile service at your location?",
    why_needed: "Determines if mobile fee applies",
    required: true,
  },
];

const detailingPolicies: PolicyItem[] = [
  {
    type: "cancellation",
    text: "Free cancellation up to 24 hours before your appointment. Less than 24 hours notice may incur a 50% cancellation fee.",
  },
  {
    type: "deposit",
    text: "A deposit may be required for ceramic coating and paint correction services to secure your appointment.",
  },
  {
    type: "refund",
    text: "We stand behind our work. If you're not satisfied, please let us know within 24 hours and we'll make it right.",
  },
];

const detailingTemplate: IndustryTemplate = {
  industry_key: "detailing",
  name: "Auto Detailing",
  icon: "✨",
  business_mode: "service",
  defaults: {
    services: detailingServices,
    required_questions: detailingQuestions,
    policies: detailingPolicies,
    faqs: [
      ...commonFAQs,
      {
        question: "Do you come to me or do I bring my car?",
        answer: "We offer both mobile service and shop service. Mobile service is available within our service area.",
      },
      {
        question: "How long does a full detail take?",
        answer: "A full detail typically takes 3-4 hours depending on the size and condition of your vehicle.",
      },
      {
        question: "What's the difference between a wash and a detail?",
        answer:
          "A wash cleans the exterior surface, while a detail is a thorough cleaning inside and out, including protection treatments.",
      },
    ],
    objections: commonObjections,
    service_area_defaults: {
      mode: "radius",
      radius_miles: 25,
      restrictions: { no_cross_state_lines: false },
      notes: "Mobile detailing typically has a service radius. Shop visits don't require area check.",
    },
    scheduling_defaults: {
      lead_time_hours: 24,
      buffer_minutes: 30,
      default_slot_duration_minutes: 120,
    },
  },
};

// ============================================================================
// TOWING TEMPLATE
// ============================================================================

const towingServices: ServiceTemplateItem[] = [
  {
    name: "Local Tow (0-10 miles)",
    description: "Standard tow within 10 miles",
    base_price_model: "fixed",
    fixed_price_cents: 8500,
    duration_minutes: 60,
    tags: ["tow", "local"],
  },
  {
    name: "Long Distance Tow",
    description: "Towing beyond 10 miles - price varies by distance",
    base_price_model: "quote_only",
    duration_minutes: 120,
    tags: ["tow", "distance"],
  },
  {
    name: "Jump Start",
    description: "Battery jump start service",
    base_price_model: "fixed",
    fixed_price_cents: 5000,
    duration_minutes: 30,
    tags: ["roadside", "battery"],
  },
  {
    name: "Tire Change",
    description: "Flat tire change with your spare",
    base_price_model: "fixed",
    fixed_price_cents: 6000,
    duration_minutes: 30,
    tags: ["roadside", "tire"],
  },
  {
    name: "Fuel Delivery",
    description: "Emergency fuel delivery (up to 2 gallons)",
    base_price_model: "fixed",
    fixed_price_cents: 5500,
    duration_minutes: 30,
    tags: ["roadside", "fuel"],
  },
  {
    name: "Lockout Service",
    description: "Vehicle lockout assistance",
    base_price_model: "fixed",
    fixed_price_cents: 6500,
    duration_minutes: 30,
    tags: ["roadside", "lockout"],
  },
  {
    name: "Winch Out",
    description: "Recovery from ditch, mud, or snow",
    base_price_model: "starting_at",
    starting_price_cents: 10000,
    duration_minutes: 60,
    tags: ["recovery", "winch"],
  },
];

const towingQuestions: RequiredQuestionItem[] = [
  {
    intent: "dispatch",
    key: "pickup_address",
    label: "Pickup Address",
    ask_prompt: "Where are you located? I need the exact address or a nearby cross street.",
    why_needed: "Required to dispatch driver",
    required: true,
  },
  {
    intent: "dispatch",
    key: "dropoff_address",
    label: "Dropoff Address",
    ask_prompt: "Where would you like the vehicle towed to?",
    why_needed: "Required for towing destination",
    required: true,
  },
  {
    intent: "dispatch",
    key: "vehicle_type",
    label: "Vehicle Type",
    ask_prompt: "What type of vehicle is it - car, truck, SUV, or motorcycle?",
    why_needed: "Determines equipment needed",
    required: true,
  },
  {
    intent: "dispatch",
    key: "vehicle_condition",
    label: "Vehicle Condition",
    ask_prompt: "Is the vehicle drivable or does it need to be lifted onto the truck?",
    why_needed: "Determines service type and pricing",
    required: true,
  },
  {
    intent: "dispatch",
    key: "estimated_miles",
    label: "Estimated Miles",
    ask_prompt: "Do you know approximately how far you need to go?",
    why_needed: "Required for distance-based pricing",
    required: false,
  },
];

const towingPolicies: PolicyItem[] = [
  {
    type: "cancellation",
    text: "If you cancel after the driver has been dispatched, there may be a trip fee of $45.",
  },
  {
    type: "payment",
    text: "Payment is due upon completion of service. We accept cash, credit cards, and most insurance claims.",
  },
  {
    type: "refund",
    text: "Services rendered cannot be refunded, but we'll work to resolve any issues.",
  },
];

const towingTemplate: IndustryTemplate = {
  industry_key: "towing",
  name: "Towing & Roadside",
  icon: "🚛",
  business_mode: "dispatch",
  defaults: {
    services: towingServices,
    required_questions: towingQuestions,
    policies: towingPolicies,
    faqs: [
      ...commonFAQs,
      {
        question: "How fast can you get here?",
        answer: "Our average response time is 30-45 minutes, but it varies by location and demand.",
      },
      {
        question: "Do you tow motorcycles?",
        answer: "Yes, we have equipment to safely transport motorcycles.",
      },
      {
        question: "Do you work with insurance?",
        answer: "Yes, we work with most roadside assistance programs and insurance companies.",
      },
      {
        question: "What if my car won't go into neutral?",
        answer: "No problem - our flatbed trucks can safely load vehicles that aren't in neutral.",
      },
    ],
    objections: [
      ...commonObjections,
      {
        objection: "That's more than I expected",
        response:
          "I understand. Our pricing includes all equipment and labor, with no hidden fees. Would you like me to check if there's a closer destination that might cost less?",
      },
    ],
    service_area_defaults: {
      mode: "radius",
      radius_miles: 50,
      restrictions: { no_cross_state_lines: true },
      notes: "Towing services often have state-specific licensing requirements.",
    },
    scheduling_defaults: {
      lead_time_hours: 0, // Immediate dispatch
      buffer_minutes: 15,
      default_slot_duration_minutes: 60,
    },
  },
};

// ============================================================================
// FOOD/RESTAURANT TEMPLATE
// ============================================================================

const foodServices: ServiceTemplateItem[] = [
  {
    name: "Dine-In",
    description: "In-restaurant dining experience",
    base_price_model: "quote_only", // Menu prices vary
    duration_minutes: 60,
    tags: ["dine-in"],
  },
  {
    name: "Takeout",
    description: "Order ahead for pickup",
    base_price_model: "quote_only",
    duration_minutes: 30,
    tags: ["takeout", "pickup"],
  },
  {
    name: "Delivery",
    description: "Food delivered to your location",
    base_price_model: "quote_only",
    duration_minutes: 45,
    tags: ["delivery"],
  },
  {
    name: "Catering (Small)",
    description: "Catering for 10-25 people",
    base_price_model: "starting_at",
    starting_price_cents: 25000,
    duration_minutes: 120,
    tags: ["catering"],
  },
  {
    name: "Catering (Large)",
    description: "Catering for 25+ people",
    base_price_model: "quote_only",
    duration_minutes: 180,
    tags: ["catering", "large"],
  },
];

const foodQuestions: RequiredQuestionItem[] = [
  {
    intent: "order",
    key: "order_type",
    label: "Order Type",
    ask_prompt: "Would you like pickup, delivery, or dine-in?",
    why_needed: "Determines how to handle the order",
    required: true,
  },
  {
    intent: "order",
    key: "delivery_address",
    label: "Delivery Address",
    ask_prompt: "What's your delivery address?",
    why_needed: "Required for delivery orders",
    required: false, // Only for delivery
  },
  {
    intent: "reservation",
    key: "party_size",
    label: "Party Size",
    ask_prompt: "How many people will be dining?",
    why_needed: "Required to check table availability",
    required: true,
  },
  {
    intent: "reservation",
    key: "reservation_date",
    label: "Reservation Date",
    ask_prompt: "What date would you like to make the reservation for?",
    why_needed: "Required for booking",
    required: true,
  },
  {
    intent: "reservation",
    key: "reservation_time",
    label: "Reservation Time",
    ask_prompt: "What time would you like? We have availability at various times.",
    why_needed: "Required for booking",
    required: true,
  },
];

const foodPolicies: PolicyItem[] = [
  {
    type: "cancellation",
    text: "Please cancel reservations at least 2 hours in advance. No-shows may be charged a fee for large parties.",
  },
  {
    type: "deposit",
    text: "A deposit may be required for large party reservations or catering orders.",
  },
  {
    type: "refund",
    text: "Refunds for catering orders must be requested at least 48 hours before the event.",
  },
];

const foodTemplate: IndustryTemplate = {
  industry_key: "food",
  name: "Restaurant / Food Service",
  icon: "🍽️",
  business_mode: "food",
  defaults: {
    services: foodServices,
    required_questions: foodQuestions,
    policies: foodPolicies,
    faqs: [
      ...commonFAQs,
      {
        question: "Do you take reservations?",
        answer: "Yes! We accept reservations for parties of all sizes.",
      },
      {
        question: "What's your delivery radius?",
        answer: "We deliver within a certain distance of our location. Let me check if we deliver to your area.",
      },
      {
        question: "Do you have vegetarian/vegan options?",
        answer: "Yes, we have several vegetarian and vegan options on our menu.",
      },
      {
        question: "Do you accommodate allergies?",
        answer: "Absolutely. Please let us know about any allergies and we'll make sure your meal is safe.",
      },
    ],
    objections: [
      ...commonObjections,
      {
        objection: "The wait is too long",
        response:
          "I understand. Would you like to make a reservation for a specific time, or I can take your order for pickup so it's ready when you arrive?",
      },
    ],
    service_area_defaults: {
      mode: "radius",
      radius_miles: 5,
      restrictions: { no_cross_state_lines: false },
      notes: "Delivery radius is typically 3-5 miles from the restaurant location.",
    },
    scheduling_defaults: {
      lead_time_hours: 1,
      buffer_minutes: 15,
      default_slot_duration_minutes: 90,
      hours: {
        monday: { open: "11:00", close: "21:00" },
        tuesday: { open: "11:00", close: "21:00" },
        wednesday: { open: "11:00", close: "21:00" },
        thursday: { open: "11:00", close: "21:00" },
        friday: { open: "11:00", close: "22:00" },
        saturday: { open: "11:00", close: "22:00" },
        sunday: { open: "12:00", close: "20:00" },
      },
    },
  },
};

// ============================================================================
// MEDICAL INTAKE TEMPLATE
// ============================================================================

const medicalServices: ServiceTemplateItem[] = [
  {
    name: "Initial Consultation",
    description: "First visit consultation with provider",
    base_price_model: "fixed",
    fixed_price_cents: 0, // Often free or insurance-covered
    duration_minutes: 30,
    tags: ["consultation", "new-patient"],
  },
  {
    name: "Follow-Up Visit",
    description: "Standard follow-up appointment",
    base_price_model: "fixed",
    fixed_price_cents: 15000,
    duration_minutes: 30,
    tags: ["follow-up"],
  },
  {
    name: "Botox",
    description: "Botulinum toxin injection treatment",
    base_price_model: "starting_at",
    starting_price_cents: 35000,
    duration_minutes: 30,
    tags: ["injectable", "aesthetic"],
  },
  {
    name: "Dermal Fillers",
    description: "Hyaluronic acid filler treatment",
    base_price_model: "starting_at",
    starting_price_cents: 60000,
    duration_minutes: 45,
    tags: ["injectable", "aesthetic"],
  },
  {
    name: "Chemical Peel",
    description: "Medical-grade chemical peel treatment",
    base_price_model: "starting_at",
    starting_price_cents: 20000,
    duration_minutes: 45,
    tags: ["skin", "aesthetic"],
  },
  {
    name: "Laser Treatment",
    description: "Laser skin treatment session",
    base_price_model: "starting_at",
    starting_price_cents: 40000,
    duration_minutes: 45,
    tags: ["laser", "aesthetic"],
  },
];

const medicalQuestions: RequiredQuestionItem[] = [
  {
    intent: "booking",
    key: "is_new_patient",
    label: "New Patient",
    ask_prompt: "Are you a new patient or have you been here before?",
    why_needed: "New patients require additional intake time",
    required: true,
  },
  {
    intent: "booking",
    key: "treatment_interest",
    label: "Treatment Interest",
    ask_prompt: "What treatment or concern are you calling about?",
    why_needed: "Helps match with appropriate provider",
    required: true,
  },
  {
    intent: "booking",
    key: "insurance_info",
    label: "Insurance",
    ask_prompt: "Do you have insurance you'd like to use, or will this be self-pay?",
    why_needed: "Determines billing process",
    required: false,
  },
  {
    intent: "booking",
    key: "medical_history",
    label: "Relevant History",
    ask_prompt: "Do you have any relevant medical conditions or allergies we should know about?",
    why_needed: "Important for patient safety",
    required: true,
  },
  {
    intent: "callback",
    key: "callback_reason",
    label: "Callback Reason",
    ask_prompt: "What would you like to discuss when we call you back?",
    why_needed: "Helps prepare for the call",
    required: true,
  },
];

const medicalPolicies: PolicyItem[] = [
  {
    type: "cancellation",
    text: "We require 48 hours notice for cancellations. Late cancellations or no-shows may incur a fee.",
  },
  {
    type: "deposit",
    text: "A deposit may be required for certain procedures. This will be applied to your treatment cost.",
  },
  {
    type: "refund",
    text: "Refunds are evaluated on a case-by-case basis. Product purchases may be returned unopened within 14 days.",
  },
  {
    type: "payment",
    text: "We accept most major insurance plans, FSA/HSA, and offer financing options for qualifying patients.",
  },
];

const medicalTemplate: IndustryTemplate = {
  industry_key: "medical",
  name: "Medical / Med Spa",
  icon: "💉",
  business_mode: "medical",
  defaults: {
    services: medicalServices,
    required_questions: medicalQuestions,
    policies: medicalPolicies,
    faqs: [
      ...commonFAQs,
      {
        question: "Is the consultation free?",
        answer: "Yes, we offer complimentary consultations to discuss your goals and recommend the best treatment plan.",
      },
      {
        question: "How long do results last?",
        answer: "Results vary by treatment. Botox typically lasts 3-4 months, while fillers can last 6-18 months.",
      },
      {
        question: "Is there any downtime?",
        answer:
          "Most of our treatments have minimal to no downtime. We'll discuss specific recovery expectations during your consultation.",
      },
      {
        question: "Do you accept insurance?",
        answer: "We accept most major insurance plans. Let me know your provider and I can verify your coverage.",
      },
    ],
    objections: [
      ...commonObjections,
      {
        objection: "I'm worried it will look unnatural",
        response:
          "Our goal is always natural-looking results. We take a conservative approach and can always add more if needed.",
      },
      {
        objection: "I've heard it hurts",
        response:
          "We use various techniques to minimize discomfort, including topical numbing and gentle techniques. Most patients find it very tolerable.",
      },
    ],
    service_area_defaults: {
      mode: "radius",
      radius_miles: null, // Not applicable - patients come to office
      restrictions: { no_cross_state_lines: false },
      notes: "Medical practices typically don't have service area restrictions - patients come to the office.",
    },
    scheduling_defaults: {
      lead_time_hours: 48,
      buffer_minutes: 15,
      default_slot_duration_minutes: 45,
      hours: {
        monday: { open: "09:00", close: "17:00" },
        tuesday: { open: "09:00", close: "17:00" },
        wednesday: { open: "09:00", close: "17:00" },
        thursday: { open: "09:00", close: "17:00" },
        friday: { open: "09:00", close: "16:00" },
        saturday: null,
        sunday: null,
      },
    },
  },
};

// ============================================================================
// OTHER/GENERIC TEMPLATE
// ============================================================================

const otherTemplate: IndustryTemplate = {
  industry_key: "other",
  name: "Other Service Business",
  icon: "🏢",
  business_mode: "service",
  defaults: {
    services: [
      {
        name: "Standard Service",
        description: "Our standard service offering",
        base_price_model: "fixed",
        fixed_price_cents: 10000,
        duration_minutes: 60,
        tags: ["standard"],
      },
      {
        name: "Premium Service",
        description: "Enhanced service with additional features",
        base_price_model: "fixed",
        fixed_price_cents: 20000,
        duration_minutes: 120,
        tags: ["premium"],
      },
      {
        name: "Consultation",
        description: "Initial consultation to discuss your needs",
        base_price_model: "fixed",
        fixed_price_cents: 5000,
        duration_minutes: 30,
        tags: ["consultation"],
      },
      {
        name: "Custom Package",
        description: "Custom service tailored to your specific needs",
        base_price_model: "quote_only",
        duration_minutes: 180,
        tags: ["custom"],
      },
    ],
    required_questions: [
      {
        intent: "booking",
        key: "service_interest",
        label: "Service Interest",
        ask_prompt: "What service are you interested in?",
        why_needed: "To provide accurate information",
        required: true,
      },
      {
        intent: "booking",
        key: "preferred_date",
        label: "Preferred Date",
        ask_prompt: "When would you like to schedule?",
        why_needed: "Required for booking",
        required: true,
      },
    ],
    policies: [
      {
        type: "cancellation",
        text: "Free cancellation up to 24 hours before your appointment.",
      },
      {
        type: "deposit",
        text: "A deposit may be required to secure your appointment.",
      },
      {
        type: "refund",
        text: "We stand behind our work and will make it right if you're not satisfied.",
      },
    ],
    faqs: commonFAQs,
    objections: commonObjections,
    service_area_defaults: {
      mode: "radius",
      radius_miles: 25,
      restrictions: { no_cross_state_lines: false },
      notes: "Adjust service area based on your business model.",
    },
    scheduling_defaults: {
      lead_time_hours: 24,
      buffer_minutes: 15,
      default_slot_duration_minutes: 60,
    },
  },
};

// ============================================================================
// TEMPLATE REGISTRY
// ============================================================================

export const industryTemplates: Record<string, IndustryTemplate> = {
  detailing: detailingTemplate,
  towing: towingTemplate,
  food: foodTemplate,
  medical: medicalTemplate,
  medspa: medicalTemplate, // Alias
  other: otherTemplate,
};

/**
 * Get all available template keys
 */
export function getAvailableTemplateKeys(): string[] {
  return Object.keys(industryTemplates);
}

/**
 * Get template by industry key
 */
export function getTemplate(industryKey: string): IndustryTemplate | null {
  // Normalize the key
  const normalizedKey = industryKey.toLowerCase().replace(/[\s-_]/g, "");

  // Direct match
  if (industryTemplates[normalizedKey]) {
    return industryTemplates[normalizedKey];
  }

  // Try partial matches
  if (normalizedKey.includes("detail")) return industryTemplates.detailing;
  if (normalizedKey.includes("tow")) return industryTemplates.towing;
  if (normalizedKey.includes("food") || normalizedKey.includes("restaurant"))
    return industryTemplates.food;
  if (normalizedKey.includes("med") || normalizedKey.includes("spa"))
    return industryTemplates.medical;

  // Fallback to other
  return industryTemplates.other;
}

/**
 * Get template options for UI dropdown
 */
export function getTemplateOptions(): Array<{ value: string; label: string; icon: string }> {
  return Object.values(industryTemplates)
    .filter((t, i, arr) => arr.findIndex((x) => x.industry_key === t.industry_key) === i) // Dedupe aliases
    .map((t) => ({
      value: t.industry_key,
      label: t.name,
      icon: t.icon,
    }));
}
