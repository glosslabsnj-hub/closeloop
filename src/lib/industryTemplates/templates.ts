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
// PLUMBING TEMPLATE
// ============================================================================

const plumbingTemplate: IndustryTemplate = {
  industry_key: "plumbing",
  name: "Plumbing",
  icon: "🔧",
  business_mode: "service",
  defaults: {
    services: [
      { name: "Drain Cleaning", description: "Clear clogged drains and pipes", base_price_model: "fixed", fixed_price_cents: 15000, duration_minutes: 60, tags: ["drain", "cleaning"] },
      { name: "Leak Repair", description: "Locate and repair water leaks", base_price_model: "starting_at", starting_price_cents: 12500, duration_minutes: 45, tags: ["leak", "repair"] },
      { name: "Water Heater Repair", description: "Diagnose and repair water heater issues", base_price_model: "starting_at", starting_price_cents: 20000, duration_minutes: 90, tags: ["water heater"] },
      { name: "Toilet Repair", description: "Fix running, clogged, or leaking toilets", base_price_model: "fixed", fixed_price_cents: 10000, duration_minutes: 45, tags: ["toilet", "repair"] },
      { name: "Faucet Installation", description: "Install new faucets in kitchen or bathroom", base_price_model: "fixed", fixed_price_cents: 15000, duration_minutes: 60, tags: ["faucet", "installation"] },
      { name: "Pipe Repair", description: "Repair damaged or burst pipes", base_price_model: "starting_at", starting_price_cents: 17500, duration_minutes: 60, tags: ["pipe", "repair"] },
      { name: "Garbage Disposal Install", description: "Install or replace garbage disposal", base_price_model: "fixed", fixed_price_cents: 25000, duration_minutes: 90, tags: ["garbage disposal"] },
    ],
    required_questions: [
      { intent: "booking", key: "issue_type", label: "Issue Type", ask_prompt: "What plumbing issue are you experiencing?", why_needed: "Determines service needed", required: true },
      { intent: "booking", key: "location", label: "Problem Location", ask_prompt: "Where is the problem located - kitchen, bathroom, basement, or somewhere else?", why_needed: "Helps prepare for the job", required: true },
      { intent: "booking", key: "urgency", label: "Urgency", ask_prompt: "Is this an emergency or can it wait for a scheduled appointment?", why_needed: "Prioritizes urgent calls", required: true },
      { intent: "booking", key: "preferred_date", label: "Preferred Date", ask_prompt: "When would you like us to come out?", why_needed: "Required to schedule", required: true },
    ],
    policies: [
      { type: "cancellation", text: "Free cancellation with 24 hours notice. Emergency calls may have different policies." },
      { type: "deposit", text: "No deposit required for standard service calls. Large jobs may require a deposit." },
      { type: "refund", text: "We guarantee our work. If there's an issue, we'll come back and fix it at no additional charge." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do you offer emergency service?", answer: "Yes, we offer 24/7 emergency plumbing service for urgent issues like burst pipes or major leaks." },
      { question: "Do you provide free estimates?", answer: "We provide free estimates for most jobs. For complex issues, we may charge a diagnostic fee that's applied to the repair." },
      { question: "Are your plumbers licensed?", answer: "Yes, all our plumbers are fully licensed, bonded, and insured." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "radius", radius_miles: 30, restrictions: { no_cross_state_lines: false }, notes: "We service the greater metro area." },
    scheduling_defaults: { lead_time_hours: 4, buffer_minutes: 30, default_slot_duration_minutes: 60 },
  },
};

// ============================================================================
// HVAC TEMPLATE
// ============================================================================

const hvacTemplate: IndustryTemplate = {
  industry_key: "hvac",
  name: "HVAC",
  icon: "❄️",
  business_mode: "service",
  defaults: {
    services: [
      { name: "AC Tune-Up", description: "Annual maintenance and inspection", base_price_model: "fixed", fixed_price_cents: 9900, duration_minutes: 60, tags: ["ac", "maintenance"] },
      { name: "Furnace Inspection", description: "Pre-season furnace check and cleaning", base_price_model: "fixed", fixed_price_cents: 8900, duration_minutes: 60, tags: ["furnace", "inspection"] },
      { name: "AC Repair", description: "Diagnose and repair AC issues", base_price_model: "starting_at", starting_price_cents: 15000, duration_minutes: 90, tags: ["ac", "repair"] },
      { name: "Furnace Repair", description: "Diagnose and repair heating issues", base_price_model: "starting_at", starting_price_cents: 15000, duration_minutes: 90, tags: ["furnace", "repair"] },
      { name: "Duct Cleaning", description: "Complete duct system cleaning", base_price_model: "starting_at", starting_price_cents: 39900, duration_minutes: 180, tags: ["duct", "cleaning"] },
      { name: "Thermostat Installation", description: "Install new or smart thermostat", base_price_model: "fixed", fixed_price_cents: 15000, duration_minutes: 60, tags: ["thermostat"] },
      { name: "Filter Replacement", description: "Replace air filters throughout home", base_price_model: "fixed", fixed_price_cents: 5000, duration_minutes: 30, tags: ["filter"] },
    ],
    required_questions: [
      { intent: "booking", key: "system_type", label: "System Type", ask_prompt: "Is this for your AC, heating, or both?", why_needed: "Determines technician and parts needed", required: true },
      { intent: "booking", key: "issue_description", label: "Issue", ask_prompt: "Can you describe what's happening with your system?", why_needed: "Helps diagnose the problem", required: true },
      { intent: "booking", key: "home_size", label: "Home Size", ask_prompt: "Approximately how many square feet is your home?", why_needed: "Helps with system sizing", required: false },
      { intent: "booking", key: "preferred_date", label: "Preferred Date", ask_prompt: "When would you like us to come out?", why_needed: "Required to schedule", required: true },
    ],
    policies: [
      { type: "cancellation", text: "Free cancellation with 24 hours notice." },
      { type: "deposit", text: "No deposit required for service calls. Equipment installations may require a deposit." },
      { type: "refund", text: "We stand behind our work with a satisfaction guarantee." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "How often should I service my HVAC?", answer: "We recommend servicing your AC in spring and your furnace in fall for optimal performance." },
      { question: "Do you offer maintenance plans?", answer: "Yes! Our maintenance plans include annual tune-ups and priority scheduling." },
      { question: "How long does an AC last?", answer: "A well-maintained AC system typically lasts 15-20 years." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "radius", radius_miles: 35, restrictions: { no_cross_state_lines: false }, notes: "We serve the greater metro area." },
    scheduling_defaults: { lead_time_hours: 24, buffer_minutes: 30, default_slot_duration_minutes: 90 },
  },
};

// ============================================================================
// ELECTRICAL TEMPLATE
// ============================================================================

const electricalTemplate: IndustryTemplate = {
  industry_key: "electrical",
  name: "Electrical",
  icon: "⚡",
  business_mode: "service",
  defaults: {
    services: [
      { name: "Outlet Installation", description: "Install new electrical outlets", base_price_model: "fixed", fixed_price_cents: 15000, duration_minutes: 60, tags: ["outlet", "installation"] },
      { name: "Light Fixture Install", description: "Install ceiling lights, fans, or fixtures", base_price_model: "fixed", fixed_price_cents: 12500, duration_minutes: 45, tags: ["lighting"] },
      { name: "Panel Upgrade", description: "Upgrade electrical panel capacity", base_price_model: "starting_at", starting_price_cents: 150000, duration_minutes: 240, tags: ["panel", "upgrade"] },
      { name: "Circuit Breaker Repair", description: "Repair or replace circuit breakers", base_price_model: "starting_at", starting_price_cents: 15000, duration_minutes: 60, tags: ["breaker", "repair"] },
      { name: "Whole House Surge Protector", description: "Install surge protection for your home", base_price_model: "fixed", fixed_price_cents: 35000, duration_minutes: 120, tags: ["surge", "protection"] },
      { name: "Electrical Inspection", description: "Complete home electrical safety inspection", base_price_model: "fixed", fixed_price_cents: 15000, duration_minutes: 90, tags: ["inspection"] },
      { name: "EV Charger Installation", description: "Install electric vehicle charging station", base_price_model: "starting_at", starting_price_cents: 75000, duration_minutes: 180, tags: ["ev", "charger"] },
    ],
    required_questions: [
      { intent: "booking", key: "service_type", label: "Service Type", ask_prompt: "What electrical work do you need done?", why_needed: "Determines job scope", required: true },
      { intent: "booking", key: "home_age", label: "Home Age", ask_prompt: "Approximately how old is your home?", why_needed: "Older homes may have different wiring", required: false },
      { intent: "booking", key: "urgency", label: "Urgency", ask_prompt: "Is this an emergency or can it be scheduled?", why_needed: "Prioritizes urgent calls", required: true },
      { intent: "booking", key: "preferred_date", label: "Preferred Date", ask_prompt: "When would you like us to come out?", why_needed: "Required to schedule", required: true },
    ],
    policies: [
      { type: "cancellation", text: "Free cancellation with 24 hours notice." },
      { type: "deposit", text: "Large projects may require a deposit. Service calls have no deposit." },
      { type: "refund", text: "All work is guaranteed. We'll fix any issues at no additional cost." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Are your electricians licensed?", answer: "Yes, all our electricians are fully licensed, bonded, and insured." },
      { question: "Do you pull permits?", answer: "Yes, we handle all necessary permits for work that requires them." },
      { question: "Can you add more outlets to a room?", answer: "Absolutely! We can add outlets anywhere you need them." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "radius", radius_miles: 30, restrictions: { no_cross_state_lines: false }, notes: "We serve the greater metro area." },
    scheduling_defaults: { lead_time_hours: 24, buffer_minutes: 30, default_slot_duration_minutes: 60 },
  },
};

// ============================================================================
// CLEANING TEMPLATE
// ============================================================================

const cleaningTemplate: IndustryTemplate = {
  industry_key: "cleaning",
  name: "Cleaning Services",
  icon: "🧹",
  business_mode: "service",
  defaults: {
    services: [
      { name: "Standard Cleaning", description: "Regular house cleaning service", base_price_model: "starting_at", starting_price_cents: 12000, duration_minutes: 120, tags: ["standard", "recurring"] },
      { name: "Deep Cleaning", description: "Thorough top-to-bottom cleaning", base_price_model: "starting_at", starting_price_cents: 25000, duration_minutes: 240, tags: ["deep", "thorough"] },
      { name: "Move-In/Move-Out", description: "Complete cleaning for moving", base_price_model: "starting_at", starting_price_cents: 30000, duration_minutes: 300, tags: ["move", "empty"] },
      { name: "Post-Construction", description: "Clean up after renovation work", base_price_model: "quote_only", duration_minutes: 480, tags: ["construction", "renovation"] },
      { name: "Office Cleaning", description: "Commercial office cleaning", base_price_model: "quote_only", duration_minutes: 120, tags: ["office", "commercial"] },
      { name: "Window Cleaning", description: "Interior and exterior window cleaning", base_price_model: "starting_at", starting_price_cents: 15000, duration_minutes: 120, tags: ["windows"] },
    ],
    required_questions: [
      { intent: "booking", key: "home_size", label: "Home Size", ask_prompt: "How many bedrooms and bathrooms does your home have?", why_needed: "Determines pricing and time", required: true },
      { intent: "booking", key: "cleaning_type", label: "Cleaning Type", ask_prompt: "Are you looking for a one-time cleaning or recurring service?", why_needed: "Determines service plan", required: true },
      { intent: "booking", key: "special_requests", label: "Special Requests", ask_prompt: "Are there any areas you'd like us to focus on or avoid?", why_needed: "Customizes the service", required: false },
      { intent: "booking", key: "preferred_date", label: "Preferred Date", ask_prompt: "When would you like us to come?", why_needed: "Required to schedule", required: true },
    ],
    policies: [
      { type: "cancellation", text: "Free cancellation with 48 hours notice. Less notice may incur a fee." },
      { type: "deposit", text: "First-time customers may be asked for a deposit for large jobs." },
      { type: "refund", text: "If you're not satisfied, let us know within 24 hours and we'll re-clean for free." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do I need to be home?", answer: "It's up to you! Many clients give us a key or code. We're fully bonded and insured." },
      { question: "Do you bring your own supplies?", answer: "Yes, we bring all cleaning supplies and equipment. Let us know if you prefer eco-friendly products." },
      { question: "How long does a cleaning take?", answer: "A standard cleaning typically takes 2-3 hours depending on home size." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "radius", radius_miles: 20, restrictions: { no_cross_state_lines: false }, notes: "We serve the local area." },
    scheduling_defaults: { lead_time_hours: 48, buffer_minutes: 30, default_slot_duration_minutes: 120 },
  },
};

// ============================================================================
// LANDSCAPING TEMPLATE
// ============================================================================

const landscapingTemplate: IndustryTemplate = {
  industry_key: "landscaping",
  name: "Landscaping",
  icon: "🌿",
  business_mode: "service",
  defaults: {
    services: [
      { name: "Lawn Mowing", description: "Weekly or bi-weekly lawn mowing", base_price_model: "starting_at", starting_price_cents: 4500, duration_minutes: 45, tags: ["lawn", "mowing", "recurring"] },
      { name: "Spring/Fall Cleanup", description: "Seasonal yard cleanup and debris removal", base_price_model: "starting_at", starting_price_cents: 20000, duration_minutes: 180, tags: ["cleanup", "seasonal"] },
      { name: "Mulching", description: "Mulch installation for beds and trees", base_price_model: "starting_at", starting_price_cents: 25000, duration_minutes: 180, tags: ["mulch"] },
      { name: "Hedge Trimming", description: "Trim and shape hedges and shrubs", base_price_model: "starting_at", starting_price_cents: 10000, duration_minutes: 60, tags: ["hedge", "trimming"] },
      { name: "Tree Trimming", description: "Trim branches and shape trees", base_price_model: "quote_only", duration_minutes: 120, tags: ["tree", "trimming"] },
      { name: "Landscape Design", description: "Custom landscape design consultation", base_price_model: "starting_at", starting_price_cents: 50000, duration_minutes: 120, tags: ["design", "consultation"] },
      { name: "Irrigation Install", description: "Sprinkler system installation", base_price_model: "quote_only", duration_minutes: 480, tags: ["irrigation", "sprinkler"] },
    ],
    required_questions: [
      { intent: "booking", key: "property_size", label: "Property Size", ask_prompt: "Approximately how large is your yard or the area you need serviced?", why_needed: "Determines pricing", required: true },
      { intent: "booking", key: "service_type", label: "Service Type", ask_prompt: "What landscaping service are you looking for?", why_needed: "Determines job scope", required: true },
      { intent: "booking", key: "recurring", label: "Recurring Service", ask_prompt: "Is this a one-time service or would you like recurring maintenance?", why_needed: "Sets up schedule", required: true },
      { intent: "booking", key: "preferred_date", label: "Preferred Date", ask_prompt: "When would you like us to start?", why_needed: "Required to schedule", required: true },
    ],
    policies: [
      { type: "cancellation", text: "Free cancellation with 24 hours notice. Weather cancellations are always free." },
      { type: "deposit", text: "Large landscaping projects may require a deposit." },
      { type: "refund", text: "We guarantee our work. If something doesn't look right, we'll fix it." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do you haul away debris?", answer: "Yes, all debris and clippings are removed as part of our service." },
      { question: "What if it rains?", answer: "We'll reschedule for the next available dry day at no extra charge." },
      { question: "Do you offer weekly service?", answer: "Yes, we offer weekly, bi-weekly, and monthly maintenance plans." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "radius", radius_miles: 25, restrictions: { no_cross_state_lines: false }, notes: "We serve the greater metro area." },
    scheduling_defaults: { lead_time_hours: 48, buffer_minutes: 15, default_slot_duration_minutes: 60 },
  },
};

// ============================================================================
// PEST CONTROL TEMPLATE
// ============================================================================

const pestControlTemplate: IndustryTemplate = {
  industry_key: "pest_control",
  name: "Pest Control",
  icon: "🐜",
  business_mode: "service",
  defaults: {
    services: [
      { name: "General Pest Treatment", description: "Treatment for common household pests", base_price_model: "fixed", fixed_price_cents: 12500, duration_minutes: 45, tags: ["general", "treatment"] },
      { name: "Rodent Control", description: "Mouse and rat elimination", base_price_model: "starting_at", starting_price_cents: 20000, duration_minutes: 60, tags: ["rodent", "mouse", "rat"] },
      { name: "Termite Inspection", description: "Complete termite inspection", base_price_model: "fixed", fixed_price_cents: 10000, duration_minutes: 60, tags: ["termite", "inspection"] },
      { name: "Termite Treatment", description: "Termite elimination treatment", base_price_model: "quote_only", duration_minutes: 240, tags: ["termite", "treatment"] },
      { name: "Bed Bug Treatment", description: "Complete bed bug elimination", base_price_model: "starting_at", starting_price_cents: 50000, duration_minutes: 180, tags: ["bed bug"] },
      { name: "Mosquito Treatment", description: "Yard treatment for mosquitoes", base_price_model: "fixed", fixed_price_cents: 8500, duration_minutes: 30, tags: ["mosquito", "outdoor"] },
      { name: "Quarterly Maintenance", description: "Preventive quarterly pest control", base_price_model: "fixed", fixed_price_cents: 10000, duration_minutes: 30, tags: ["maintenance", "recurring"] },
    ],
    required_questions: [
      { intent: "booking", key: "pest_type", label: "Pest Type", ask_prompt: "What type of pest are you dealing with?", why_needed: "Determines treatment needed", required: true },
      { intent: "booking", key: "severity", label: "Severity", ask_prompt: "How severe is the infestation - just started or ongoing?", why_needed: "Helps plan treatment", required: true },
      { intent: "booking", key: "home_type", label: "Home Type", ask_prompt: "Is this a house, apartment, or business?", why_needed: "Determines treatment approach", required: true },
      { intent: "booking", key: "preferred_date", label: "Preferred Date", ask_prompt: "When would you like us to come out?", why_needed: "Required to schedule", required: true },
    ],
    policies: [
      { type: "cancellation", text: "Free cancellation with 24 hours notice." },
      { type: "deposit", text: "No deposit required for standard services." },
      { type: "refund", text: "We guarantee our treatments. If pests return within 30 days, we'll re-treat for free." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Is the treatment safe for pets?", answer: "Yes, we use pet-safe products. We'll let you know when it's safe to let pets back in the treated area." },
      { question: "Do I need to leave during treatment?", answer: "For most treatments, you can stay home. We'll advise if you need to leave." },
      { question: "How quickly will I see results?", answer: "Most treatments show results within 24-48 hours." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "radius", radius_miles: 30, restrictions: { no_cross_state_lines: false }, notes: "We serve the greater metro area." },
    scheduling_defaults: { lead_time_hours: 24, buffer_minutes: 15, default_slot_duration_minutes: 45 },
  },
};

// ============================================================================
// ROOFING TEMPLATE
// ============================================================================

const roofingTemplate: IndustryTemplate = {
  industry_key: "roofing",
  name: "Roofing",
  icon: "🏠",
  business_mode: "service",
  defaults: {
    services: [
      { name: "Roof Inspection", description: "Complete roof inspection and report", base_price_model: "fixed", fixed_price_cents: 15000, duration_minutes: 60, tags: ["inspection"] },
      { name: "Leak Repair", description: "Locate and repair roof leaks", base_price_model: "starting_at", starting_price_cents: 35000, duration_minutes: 120, tags: ["leak", "repair"] },
      { name: "Shingle Repair", description: "Replace damaged or missing shingles", base_price_model: "starting_at", starting_price_cents: 25000, duration_minutes: 120, tags: ["shingle", "repair"] },
      { name: "Gutter Cleaning", description: "Clean gutters and downspouts", base_price_model: "starting_at", starting_price_cents: 15000, duration_minutes: 90, tags: ["gutter", "cleaning"] },
      { name: "Gutter Installation", description: "Install new gutters", base_price_model: "quote_only", duration_minutes: 240, tags: ["gutter", "installation"] },
      { name: "Full Roof Replacement", description: "Complete roof replacement", base_price_model: "quote_only", duration_minutes: 960, tags: ["replacement", "full"] },
      { name: "Storm Damage Assessment", description: "Insurance claim inspection", base_price_model: "fixed", fixed_price_cents: 0, duration_minutes: 60, tags: ["storm", "insurance"] },
    ],
    required_questions: [
      { intent: "booking", key: "issue_type", label: "Issue Type", ask_prompt: "What roofing issue are you experiencing?", why_needed: "Determines service needed", required: true },
      { intent: "booking", key: "roof_age", label: "Roof Age", ask_prompt: "Approximately how old is your roof?", why_needed: "Helps assess condition", required: false },
      { intent: "booking", key: "roof_type", label: "Roof Type", ask_prompt: "What type of roofing do you have - shingle, metal, tile, or flat?", why_needed: "Determines materials needed", required: true },
      { intent: "booking", key: "preferred_date", label: "Preferred Date", ask_prompt: "When would you like us to come for an inspection?", why_needed: "Required to schedule", required: true },
    ],
    policies: [
      { type: "cancellation", text: "Free cancellation with 24 hours notice. Weather-related reschedules are always free." },
      { type: "deposit", text: "Large projects require a deposit. Inspections and small repairs have no deposit." },
      { type: "refund", text: "We warranty our work. If issues arise, we'll address them promptly." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do you work with insurance?", answer: "Yes, we work with all insurance companies and can help with the claims process." },
      { question: "How long does a roof last?", answer: "A typical asphalt shingle roof lasts 20-25 years with proper maintenance." },
      { question: "Can you do emergency repairs?", answer: "Yes, we offer emergency tarping and repairs for storm damage." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "radius", radius_miles: 40, restrictions: { no_cross_state_lines: false }, notes: "We serve the greater metro area." },
    scheduling_defaults: { lead_time_hours: 24, buffer_minutes: 30, default_slot_duration_minutes: 60 },
  },
};

// ============================================================================
// POOL SERVICE TEMPLATE
// ============================================================================

const poolServiceTemplate: IndustryTemplate = {
  industry_key: "pool_service",
  name: "Pool Service",
  icon: "🏊",
  business_mode: "service",
  defaults: {
    services: [
      { name: "Weekly Pool Cleaning", description: "Regular weekly pool maintenance", base_price_model: "starting_at", starting_price_cents: 12500, duration_minutes: 45, tags: ["cleaning", "weekly", "recurring"] },
      { name: "Pool Opening", description: "Seasonal pool opening service", base_price_model: "starting_at", starting_price_cents: 25000, duration_minutes: 120, tags: ["opening", "seasonal"] },
      { name: "Pool Closing", description: "Winterize and close pool for season", base_price_model: "starting_at", starting_price_cents: 30000, duration_minutes: 120, tags: ["closing", "seasonal"] },
      { name: "Green Pool Cleanup", description: "Restore green or algae-filled pool", base_price_model: "starting_at", starting_price_cents: 40000, duration_minutes: 180, tags: ["green", "cleanup"] },
      { name: "Equipment Repair", description: "Repair pumps, filters, and equipment", base_price_model: "starting_at", starting_price_cents: 15000, duration_minutes: 60, tags: ["equipment", "repair"] },
      { name: "Liner Replacement", description: "Replace pool liner", base_price_model: "quote_only", duration_minutes: 480, tags: ["liner", "replacement"] },
      { name: "One-Time Cleaning", description: "Single visit pool cleaning", base_price_model: "fixed", fixed_price_cents: 17500, duration_minutes: 60, tags: ["cleaning", "one-time"] },
    ],
    required_questions: [
      { intent: "booking", key: "pool_type", label: "Pool Type", ask_prompt: "What type of pool do you have - inground or above ground?", why_needed: "Determines service approach", required: true },
      { intent: "booking", key: "pool_size", label: "Pool Size", ask_prompt: "Approximately how many gallons is your pool?", why_needed: "Affects chemical and time needs", required: false },
      { intent: "booking", key: "service_type", label: "Service Type", ask_prompt: "Are you looking for ongoing maintenance or a one-time service?", why_needed: "Determines service plan", required: true },
      { intent: "booking", key: "preferred_date", label: "Preferred Date", ask_prompt: "When would you like us to come out?", why_needed: "Required to schedule", required: true },
    ],
    policies: [
      { type: "cancellation", text: "Free cancellation with 24 hours notice. Weather delays don't affect your schedule." },
      { type: "deposit", text: "No deposit for weekly service. Seasonal services may require a deposit." },
      { type: "refund", text: "We guarantee crystal clear water or we'll re-service for free." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "How often should I have my pool cleaned?", answer: "We recommend weekly service for optimal water quality and equipment life." },
      { question: "Do you provide chemicals?", answer: "Yes, chemicals are included in our weekly service. We use only high-quality products." },
      { question: "Can you open/close my pool for the season?", answer: "Absolutely! We offer complete seasonal opening and closing services." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "radius", radius_miles: 25, restrictions: { no_cross_state_lines: false }, notes: "We serve the local area." },
    scheduling_defaults: { lead_time_hours: 48, buffer_minutes: 15, default_slot_duration_minutes: 45 },
  },
};

// ============================================================================
// SALON TEMPLATE
// ============================================================================

const salonTemplate: IndustryTemplate = {
  industry_key: "salon",
  name: "Salon & Barbershop",
  icon: "💇",
  business_mode: "service",
  defaults: {
    services: [
      { name: "Haircut", description: "Professional haircut and style", base_price_model: "starting_at", starting_price_cents: 3500, duration_minutes: 30, tags: ["haircut"] },
      { name: "Hair Color", description: "Full hair color service", base_price_model: "starting_at", starting_price_cents: 8500, duration_minutes: 90, tags: ["color"] },
      { name: "Highlights", description: "Partial or full highlights", base_price_model: "starting_at", starting_price_cents: 12000, duration_minutes: 120, tags: ["highlights", "color"] },
      { name: "Blowout", description: "Wash and blowout styling", base_price_model: "fixed", fixed_price_cents: 4500, duration_minutes: 45, tags: ["blowout", "styling"] },
      { name: "Deep Conditioning", description: "Intensive hair treatment", base_price_model: "fixed", fixed_price_cents: 3500, duration_minutes: 30, tags: ["treatment", "conditioning"] },
      { name: "Beard Trim", description: "Professional beard shaping", base_price_model: "fixed", fixed_price_cents: 2000, duration_minutes: 15, tags: ["beard", "grooming"] },
      { name: "Bridal/Event Styling", description: "Special occasion hair styling", base_price_model: "starting_at", starting_price_cents: 15000, duration_minutes: 90, tags: ["bridal", "event", "styling"] },
    ],
    required_questions: [
      { intent: "booking", key: "service_type", label: "Service Type", ask_prompt: "What service are you looking for today?", why_needed: "Determines stylist and time", required: true },
      { intent: "booking", key: "stylist_preference", label: "Stylist Preference", ask_prompt: "Do you have a preferred stylist, or would you like the next available?", why_needed: "Books correct stylist", required: false },
      { intent: "booking", key: "hair_length", label: "Hair Length", ask_prompt: "Is your hair short, medium, or long?", why_needed: "Affects time and pricing", required: true },
      { intent: "booking", key: "preferred_time", label: "Preferred Time", ask_prompt: "When would you like to come in?", why_needed: "Required to schedule", required: true },
    ],
    policies: [
      { type: "cancellation", text: "Please cancel at least 24 hours in advance. Late cancellations may be charged a fee." },
      { type: "deposit", text: "A deposit may be required for bridal or large services." },
      { type: "refund", text: "Not happy with your service? Let us know within 7 days and we'll fix it." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do you take walk-ins?", answer: "Yes, we accept walk-ins when available, but appointments are recommended." },
      { question: "How early should I arrive?", answer: "Please arrive 5-10 minutes early for your appointment." },
      { question: "Do you do kids' haircuts?", answer: "Absolutely! We welcome clients of all ages." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "zips", radius_miles: null, restrictions: { no_cross_state_lines: false }, notes: "Visit us at our salon location." },
    scheduling_defaults: { lead_time_hours: 4, buffer_minutes: 10, default_slot_duration_minutes: 30 },
  },
};

// ============================================================================
// PIZZA SHOP TEMPLATE
// ============================================================================

const pizzaTemplate: IndustryTemplate = {
  industry_key: "pizza",
  name: "Pizza Shop",
  icon: "🍕",
  business_mode: "food",
  defaults: {
    services: [
      { name: "Small Pizza", description: "10-inch pizza, feeds 1-2", base_price_model: "starting_at", starting_price_cents: 1200, duration_minutes: 20, tags: ["pizza", "small"] },
      { name: "Medium Pizza", description: "14-inch pizza, feeds 2-3", base_price_model: "starting_at", starting_price_cents: 1600, duration_minutes: 25, tags: ["pizza", "medium"] },
      { name: "Large Pizza", description: "18-inch pizza, feeds 3-4", base_price_model: "starting_at", starting_price_cents: 2000, duration_minutes: 30, tags: ["pizza", "large"] },
      { name: "Wings (10 pc)", description: "10 wings with choice of sauce", base_price_model: "fixed", fixed_price_cents: 1400, duration_minutes: 15, tags: ["wings", "appetizer"] },
      { name: "Garlic Bread", description: "Fresh baked garlic bread", base_price_model: "fixed", fixed_price_cents: 600, duration_minutes: 10, tags: ["bread", "side"] },
      { name: "Caesar Salad", description: "Fresh Caesar salad", base_price_model: "fixed", fixed_price_cents: 900, duration_minutes: 10, tags: ["salad"] },
      { name: "2-Liter Soda", description: "Choice of soda", base_price_model: "fixed", fixed_price_cents: 400, duration_minutes: 5, tags: ["drink", "soda"] },
    ],
    required_questions: [
      { intent: "order", key: "order_type", label: "Order Type", ask_prompt: "Is this for pickup or delivery?", why_needed: "Determines fulfillment", required: true },
      { intent: "order", key: "delivery_address", label: "Delivery Address", ask_prompt: "What's your delivery address?", why_needed: "Required for delivery", required: false },
      { intent: "order", key: "order_items", label: "Order Items", ask_prompt: "What would you like to order?", why_needed: "Takes the order", required: true },
      { intent: "order", key: "special_instructions", label: "Special Instructions", ask_prompt: "Any special requests or dietary restrictions?", why_needed: "Ensures order is correct", required: false },
    ],
    policies: [
      { type: "cancellation", text: "Orders can be cancelled within 5 minutes of placing. After that, we've already started making it!" },
      { type: "deposit", text: "Payment is due at time of order for delivery. Pickup can be paid at pickup." },
      { type: "refund", text: "Not satisfied? Let us know and we'll make it right or refund your order." },
    ],
    faqs: [
      { question: "Do you deliver?", answer: "Yes! We deliver within a 5-mile radius. There may be a small delivery fee." },
      { question: "What's the delivery minimum?", answer: "Our delivery minimum is $15." },
      { question: "How long does delivery take?", answer: "Delivery typically takes 30-45 minutes depending on how busy we are." },
      { question: "Do you have gluten-free options?", answer: "Yes, we offer gluten-free crust for an additional charge." },
      { question: "Can I customize my pizza?", answer: "Absolutely! You can add or remove any toppings you'd like." },
    ],
    objections: [
      { objection: "That's too expensive", response: "We use premium ingredients and make everything fresh. Would you like to try one of our specials?" },
      { objection: "Delivery takes too long", response: "I apologize for any wait. We're making your food fresh! Would you prefer pickup instead?" },
      { objection: "I'm not that hungry", response: "We have personal-size pizzas and individual items that might be perfect!" },
      ...commonObjections.slice(1),
    ],
    service_area_defaults: { mode: "radius", radius_miles: 5, restrictions: { no_cross_state_lines: false }, notes: "Delivery within 5 miles." },
    scheduling_defaults: { lead_time_hours: 0, buffer_minutes: 5, default_slot_duration_minutes: 30 },
  },
};

// ============================================================================
// BAKERY TEMPLATE
// ============================================================================

const bakeryTemplate: IndustryTemplate = {
  industry_key: "bakery",
  name: "Bakery & Cafe",
  icon: "🥐",
  business_mode: "food",
  defaults: {
    services: [
      { name: "Coffee", description: "Freshly brewed coffee", base_price_model: "starting_at", starting_price_cents: 300, duration_minutes: 5, tags: ["coffee", "drink"] },
      { name: "Latte", description: "Espresso with steamed milk", base_price_model: "fixed", fixed_price_cents: 500, duration_minutes: 5, tags: ["coffee", "espresso"] },
      { name: "Croissant", description: "Fresh baked butter croissant", base_price_model: "fixed", fixed_price_cents: 400, duration_minutes: 5, tags: ["pastry"] },
      { name: "Muffin", description: "Assorted fresh muffins", base_price_model: "fixed", fixed_price_cents: 350, duration_minutes: 5, tags: ["pastry", "muffin"] },
      { name: "Custom Cake", description: "Custom decorated cake", base_price_model: "starting_at", starting_price_cents: 4500, duration_minutes: 1440, tags: ["cake", "custom"] },
      { name: "Cupcakes (Dozen)", description: "12 decorated cupcakes", base_price_model: "starting_at", starting_price_cents: 3600, duration_minutes: 1440, tags: ["cupcakes", "dozen"] },
      { name: "Breakfast Sandwich", description: "Egg, cheese, and choice of meat", base_price_model: "fixed", fixed_price_cents: 700, duration_minutes: 10, tags: ["breakfast", "sandwich"] },
    ],
    required_questions: [
      { intent: "order", key: "order_type", label: "Order Type", ask_prompt: "Is this for here, to-go, or a custom order?", why_needed: "Determines service", required: true },
      { intent: "order", key: "order_items", label: "Order Items", ask_prompt: "What can I get for you today?", why_needed: "Takes the order", required: true },
      { intent: "order", key: "custom_details", label: "Custom Order Details", ask_prompt: "For custom cakes - what's the occasion, size, and flavors you'd like?", why_needed: "Creates custom orders", required: false },
      { intent: "order", key: "pickup_date", label: "Pickup Date", ask_prompt: "When do you need this by?", why_needed: "Schedules custom orders", required: false },
    ],
    policies: [
      { type: "cancellation", text: "Custom orders must be cancelled 48 hours in advance for a refund." },
      { type: "deposit", text: "Custom cakes require a 50% deposit at time of order." },
      { type: "refund", text: "We want you to love your order! If there's an issue, please let us know right away." },
    ],
    faqs: [
      { question: "How far in advance do I need to order a custom cake?", answer: "We recommend at least 3-5 days notice for custom cakes." },
      { question: "Do you have vegan options?", answer: "Yes! We have several vegan pastries and can make vegan cakes." },
      { question: "Can I see your cake designs?", answer: "Absolutely! Check out our Instagram or ask us for our portfolio." },
      { question: "Do you deliver cakes?", answer: "Yes, we offer delivery for custom cake orders within 10 miles for a fee." },
      { question: "What's your most popular item?", answer: "Our butter croissants are a customer favorite!" },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "zips", radius_miles: null, restrictions: { no_cross_state_lines: false }, notes: "Visit us at our bakery!" },
    scheduling_defaults: { lead_time_hours: 72, buffer_minutes: 0, default_slot_duration_minutes: 30 },
  },
};

// ============================================================================
// FOOD TRUCK TEMPLATE
// ============================================================================

const foodTruckTemplate: IndustryTemplate = {
  industry_key: "food_truck",
  name: "Food Truck",
  icon: "🚚",
  business_mode: "food",
  defaults: {
    services: [
      { name: "Main Entree", description: "Our signature dish", base_price_model: "starting_at", starting_price_cents: 1200, duration_minutes: 10, tags: ["main", "entree"] },
      { name: "Side Item", description: "Sides and extras", base_price_model: "starting_at", starting_price_cents: 500, duration_minutes: 5, tags: ["side"] },
      { name: "Combo Meal", description: "Entree with side and drink", base_price_model: "starting_at", starting_price_cents: 1500, duration_minutes: 10, tags: ["combo", "meal"] },
      { name: "Kids Meal", description: "Smaller portion with side", base_price_model: "fixed", fixed_price_cents: 800, duration_minutes: 10, tags: ["kids"] },
      { name: "Drink", description: "Bottled water or soda", base_price_model: "fixed", fixed_price_cents: 250, duration_minutes: 2, tags: ["drink"] },
      { name: "Catering Package", description: "Event catering per person", base_price_model: "starting_at", starting_price_cents: 1500, duration_minutes: 240, tags: ["catering", "event"] },
    ],
    required_questions: [
      { intent: "order", key: "order_items", label: "Order Items", ask_prompt: "What would you like to order?", why_needed: "Takes the order", required: true },
      { intent: "order", key: "special_instructions", label: "Special Instructions", ask_prompt: "Any modifications or allergies I should know about?", why_needed: "Ensures correct order", required: false },
      { intent: "booking", key: "event_date", label: "Event Date", ask_prompt: "When is your event?", why_needed: "For catering bookings", required: false },
      { intent: "booking", key: "guest_count", label: "Guest Count", ask_prompt: "How many guests are you expecting?", why_needed: "Plans catering amount", required: false },
    ],
    policies: [
      { type: "cancellation", text: "Catering events must be cancelled 1 week in advance for a full refund." },
      { type: "deposit", text: "Catering requires a 50% deposit to book." },
      { type: "refund", text: "Not satisfied? Let us know right away and we'll make it right." },
    ],
    faqs: [
      { question: "Where are you located today?", answer: "Check our social media for today's location! We update it daily." },
      { question: "Do you do private events?", answer: "Yes! We're available for weddings, parties, and corporate events." },
      { question: "How do I book you for an event?", answer: "Just give us a call or text with your date and guest count, and we'll send you a quote." },
      { question: "Do you have vegetarian options?", answer: "Yes, we have several vegetarian items on our menu!" },
      { question: "Can I place a large order?", answer: "Absolutely! For orders over 10 items, please give us 30 minutes notice." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "radius", radius_miles: 30, restrictions: { no_cross_state_lines: false }, notes: "We travel for events!" },
    scheduling_defaults: { lead_time_hours: 168, buffer_minutes: 0, default_slot_duration_minutes: 240 },
  },
};

// ============================================================================
// BAR/PUB TEMPLATE
// ============================================================================

const barTemplate: IndustryTemplate = {
  industry_key: "bar",
  name: "Bar & Pub",
  icon: "🍺",
  business_mode: "food",
  defaults: {
    services: [
      { name: "Draft Beer", description: "Pint of draft beer", base_price_model: "starting_at", starting_price_cents: 600, duration_minutes: 5, tags: ["beer", "drink"] },
      { name: "Cocktail", description: "Handcrafted cocktail", base_price_model: "starting_at", starting_price_cents: 1200, duration_minutes: 5, tags: ["cocktail", "drink"] },
      { name: "Wine Glass", description: "Glass of house wine", base_price_model: "starting_at", starting_price_cents: 900, duration_minutes: 5, tags: ["wine", "drink"] },
      { name: "Appetizer", description: "Shareable starters", base_price_model: "starting_at", starting_price_cents: 1000, duration_minutes: 15, tags: ["appetizer", "food"] },
      { name: "Burger", description: "House burger with fries", base_price_model: "fixed", fixed_price_cents: 1600, duration_minutes: 20, tags: ["burger", "entree"] },
      { name: "Private Event", description: "Venue rental per hour", base_price_model: "starting_at", starting_price_cents: 50000, duration_minutes: 60, tags: ["event", "private"] },
    ],
    required_questions: [
      { intent: "reservation", key: "party_size", label: "Party Size", ask_prompt: "How many people will be in your party?", why_needed: "Books correct table", required: true },
      { intent: "reservation", key: "reservation_date", label: "Date", ask_prompt: "What date would you like to come in?", why_needed: "Checks availability", required: true },
      { intent: "reservation", key: "reservation_time", label: "Time", ask_prompt: "What time works best?", why_needed: "Books time slot", required: true },
      { intent: "reservation", key: "special_occasion", label: "Special Occasion", ask_prompt: "Is this for a special occasion?", why_needed: "Helps prepare", required: false },
    ],
    policies: [
      { type: "cancellation", text: "Please cancel reservations at least 2 hours in advance." },
      { type: "deposit", text: "Large parties and private events require a deposit or credit card hold." },
      { type: "refund", text: "Event deposits are non-refundable within 48 hours of the event." },
    ],
    faqs: [
      { question: "Do you take reservations?", answer: "Yes! We recommend reservations for groups of 6 or more." },
      { question: "Is there a dress code?", answer: "We're casual! Just no swimwear or overly revealing clothing." },
      { question: "Do you have happy hour?", answer: "Yes! Happy hour is Monday-Friday from 4-7pm." },
      { question: "Can I host a private event?", answer: "Absolutely! We have space for private parties and events." },
      { question: "Do you have food?", answer: "Yes, we have a full kitchen with appetizers, burgers, and more." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "zips", radius_miles: null, restrictions: { no_cross_state_lines: false }, notes: "Visit us at our location!" },
    scheduling_defaults: { lead_time_hours: 2, buffer_minutes: 0, default_slot_duration_minutes: 120 },
  },
};

// ============================================================================
// CATERING TEMPLATE
// ============================================================================

const cateringTemplate: IndustryTemplate = {
  industry_key: "catering",
  name: "Catering",
  icon: "🍽️",
  business_mode: "food",
  defaults: {
    services: [
      { name: "Basic Package", description: "Appetizers and entrees, per person", base_price_model: "starting_at", starting_price_cents: 2500, duration_minutes: 240, tags: ["basic", "package"] },
      { name: "Premium Package", description: "Full service with appetizers, entrees, dessert", base_price_model: "starting_at", starting_price_cents: 4500, duration_minutes: 300, tags: ["premium", "package"] },
      { name: "Appetizer Tray", description: "Serves 10-15 guests", base_price_model: "starting_at", starting_price_cents: 7500, duration_minutes: 60, tags: ["appetizer", "tray"] },
      { name: "Entree Tray", description: "Serves 10-15 guests", base_price_model: "starting_at", starting_price_cents: 12500, duration_minutes: 60, tags: ["entree", "tray"] },
      { name: "Dessert Tray", description: "Serves 15-20 guests", base_price_model: "starting_at", starting_price_cents: 6500, duration_minutes: 60, tags: ["dessert", "tray"] },
      { name: "Staffed Event", description: "Full service with servers, per hour", base_price_model: "starting_at", starting_price_cents: 15000, duration_minutes: 60, tags: ["staffed", "service"] },
    ],
    required_questions: [
      { intent: "booking", key: "event_date", label: "Event Date", ask_prompt: "When is your event?", why_needed: "Checks availability", required: true },
      { intent: "booking", key: "guest_count", label: "Guest Count", ask_prompt: "How many guests are you expecting?", why_needed: "Determines quantity", required: true },
      { intent: "booking", key: "event_type", label: "Event Type", ask_prompt: "What type of event is this - wedding, corporate, birthday, etc.?", why_needed: "Helps plan menu", required: true },
      { intent: "booking", key: "dietary_needs", label: "Dietary Needs", ask_prompt: "Are there any dietary restrictions we should know about?", why_needed: "Plans appropriate menu", required: false },
      { intent: "booking", key: "budget", label: "Budget", ask_prompt: "What's your approximate budget per person?", why_needed: "Recommends packages", required: false },
    ],
    policies: [
      { type: "cancellation", text: "Cancellations more than 2 weeks out receive full deposit refund. Within 2 weeks, deposit is forfeited." },
      { type: "deposit", text: "50% deposit required to book your date. Balance due 1 week before event." },
      { type: "refund", text: "We guarantee your satisfaction. If there's an issue, we'll make it right." },
    ],
    faqs: [
      { question: "How far in advance should I book?", answer: "We recommend booking 2-4 weeks in advance, earlier for peak season." },
      { question: "Do you provide plates and utensils?", answer: "Yes! Our packages include all serving ware. Upgraded options available." },
      { question: "Can you accommodate allergies?", answer: "Absolutely. Please let us know about any allergies and we'll plan accordingly." },
      { question: "Do you offer tastings?", answer: "Yes, we offer tastings for events over 50 guests." },
      { question: "What's your service area?", answer: "We serve events within 30 miles of our location." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "radius", radius_miles: 30, restrictions: { no_cross_state_lines: false }, notes: "We travel for events!" },
    scheduling_defaults: { lead_time_hours: 336, buffer_minutes: 60, default_slot_duration_minutes: 240 },
  },
};

// ============================================================================
// DENTAL TEMPLATE
// ============================================================================

const dentalTemplate: IndustryTemplate = {
  industry_key: "dental",
  name: "Dental",
  icon: "🦷",
  business_mode: "medical",
  defaults: {
    services: [
      { name: "Cleaning & Exam", description: "Routine cleaning and checkup", base_price_model: "fixed", fixed_price_cents: 15000, duration_minutes: 60, tags: ["cleaning", "exam", "preventive"] },
      { name: "Deep Cleaning", description: "Periodontal scaling and root planing", base_price_model: "starting_at", starting_price_cents: 25000, duration_minutes: 90, tags: ["deep cleaning", "periodontal"] },
      { name: "Filling", description: "Cavity filling", base_price_model: "starting_at", starting_price_cents: 20000, duration_minutes: 45, tags: ["filling", "restorative"] },
      { name: "Crown", description: "Dental crown placement", base_price_model: "starting_at", starting_price_cents: 120000, duration_minutes: 90, tags: ["crown", "restorative"] },
      { name: "Whitening", description: "Professional teeth whitening", base_price_model: "fixed", fixed_price_cents: 40000, duration_minutes: 60, tags: ["whitening", "cosmetic"] },
      { name: "Root Canal", description: "Endodontic treatment", base_price_model: "starting_at", starting_price_cents: 80000, duration_minutes: 90, tags: ["root canal", "endodontic"] },
      { name: "Extraction", description: "Tooth extraction", base_price_model: "starting_at", starting_price_cents: 25000, duration_minutes: 30, tags: ["extraction"] },
    ],
    required_questions: [
      { intent: "booking", key: "reason_for_visit", label: "Reason for Visit", ask_prompt: "What brings you in today - routine checkup, pain, or something specific?", why_needed: "Schedules appropriate appointment", required: true },
      { intent: "booking", key: "last_visit", label: "Last Dental Visit", ask_prompt: "When was your last dental visit?", why_needed: "Plans treatment", required: false },
      { intent: "booking", key: "insurance", label: "Insurance", ask_prompt: "Do you have dental insurance?", why_needed: "Verifies coverage", required: true },
      { intent: "booking", key: "preferred_date", label: "Preferred Date", ask_prompt: "When would you like to come in?", why_needed: "Schedules appointment", required: true },
    ],
    policies: [
      { type: "cancellation", text: "Please provide 24 hours notice for cancellations to avoid a fee." },
      { type: "deposit", text: "Insurance patients: copay due at time of service. Non-insurance: full payment required." },
      { type: "refund", text: "We stand behind our work. Please contact us with any concerns." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do you accept my insurance?", answer: "We accept most major dental insurance plans. Please call to verify your specific plan." },
      { question: "Do you offer payment plans?", answer: "Yes! We offer financing options through CareCredit and in-house payment plans." },
      { question: "Does it hurt?", answer: "We prioritize patient comfort. We offer various sedation options to ensure you're comfortable." },
      { question: "How often should I come in?", answer: "We recommend a cleaning and exam every 6 months for optimal oral health." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "zips", radius_miles: null, restrictions: { no_cross_state_lines: false }, notes: "Visit our dental office." },
    scheduling_defaults: { lead_time_hours: 24, buffer_minutes: 15, default_slot_duration_minutes: 60 },
  },
};

// ============================================================================
// CHIROPRACTIC TEMPLATE
// ============================================================================

const chiropracticTemplate: IndustryTemplate = {
  industry_key: "chiropractic",
  name: "Chiropractic",
  icon: "🦴",
  business_mode: "medical",
  defaults: {
    services: [
      { name: "Initial Consultation", description: "New patient exam and consultation", base_price_model: "fixed", fixed_price_cents: 15000, duration_minutes: 60, tags: ["consultation", "new patient"] },
      { name: "Adjustment", description: "Chiropractic spinal adjustment", base_price_model: "fixed", fixed_price_cents: 6500, duration_minutes: 15, tags: ["adjustment"] },
      { name: "X-Ray", description: "Diagnostic x-ray imaging", base_price_model: "starting_at", starting_price_cents: 10000, duration_minutes: 30, tags: ["x-ray", "diagnostic"] },
      { name: "Massage Therapy", description: "Therapeutic massage", base_price_model: "starting_at", starting_price_cents: 8000, duration_minutes: 30, tags: ["massage", "therapy"] },
      { name: "Physical Therapy", description: "Rehabilitation exercises", base_price_model: "fixed", fixed_price_cents: 7500, duration_minutes: 30, tags: ["physical therapy", "rehab"] },
      { name: "Wellness Package", description: "Monthly adjustment package", base_price_model: "fixed", fixed_price_cents: 20000, duration_minutes: 60, tags: ["package", "wellness"] },
    ],
    required_questions: [
      { intent: "booking", key: "main_concern", label: "Main Concern", ask_prompt: "What's your main concern - back pain, neck pain, headaches, or something else?", why_needed: "Plans treatment", required: true },
      { intent: "booking", key: "pain_duration", label: "Duration", ask_prompt: "How long have you been experiencing this issue?", why_needed: "Assesses severity", required: true },
      { intent: "booking", key: "new_patient", label: "New Patient", ask_prompt: "Have you been to our office before?", why_needed: "Determines appointment type", required: true },
      { intent: "booking", key: "preferred_date", label: "Preferred Date", ask_prompt: "When would you like to come in?", why_needed: "Schedules appointment", required: true },
    ],
    policies: [
      { type: "cancellation", text: "Please provide 24 hours notice for cancellations." },
      { type: "deposit", text: "Payment is due at time of service unless we're billing your insurance." },
      { type: "refund", text: "We want you to feel better! Talk to us about your treatment plan if you have concerns." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do you accept insurance?", answer: "Yes, we accept most major insurance plans including auto accident and workers' comp." },
      { question: "How many visits will I need?", answer: "It depends on your condition. We'll create a personalized treatment plan after your exam." },
      { question: "Is chiropractic care safe?", answer: "Yes, chiropractic care is very safe. Our doctors are highly trained professionals." },
      { question: "Will the adjustment hurt?", answer: "Most patients feel relief after an adjustment. Some mild soreness is normal initially." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "zips", radius_miles: null, restrictions: { no_cross_state_lines: false }, notes: "Visit our chiropractic office." },
    scheduling_defaults: { lead_time_hours: 4, buffer_minutes: 10, default_slot_duration_minutes: 30 },
  },
};

// ============================================================================
// ADDITIONAL DISPATCH TEMPLATES
// ============================================================================

const locksmithTemplate: IndustryTemplate = {
  industry_key: "locksmith",
  name: "Locksmith",
  icon: "🔐",
  business_mode: "dispatch",
  defaults: {
    services: [
      { name: "Car Lockout", description: "Unlock vehicle when keys are locked inside", base_price_model: "fixed", fixed_price_cents: 7500, duration_minutes: 30, tags: ["automotive", "lockout"] },
      { name: "House Lockout", description: "Unlock residential door", base_price_model: "fixed", fixed_price_cents: 8500, duration_minutes: 30, tags: ["residential", "lockout"] },
      { name: "Lock Rekey", description: "Change lock pins to work with new key", base_price_model: "starting_at", starting_price_cents: 6500, duration_minutes: 30, tags: ["rekey", "residential"] },
      { name: "Lock Change", description: "Replace existing lock with new hardware", base_price_model: "starting_at", starting_price_cents: 12000, duration_minutes: 45, tags: ["installation", "residential"] },
      { name: "Key Duplication", description: "Make copy of existing key", base_price_model: "fixed", fixed_price_cents: 2500, duration_minutes: 15, tags: ["key", "duplication"] },
      { name: "Broken Key Extraction", description: "Remove broken key from lock", base_price_model: "fixed", fixed_price_cents: 8500, duration_minutes: 30, tags: ["extraction", "repair"] },
      { name: "Commercial Lockout", description: "Unlock business or office door", base_price_model: "starting_at", starting_price_cents: 9500, duration_minutes: 45, tags: ["commercial", "lockout"] },
      { name: "Safe Lockout", description: "Open locked safe", base_price_model: "starting_at", starting_price_cents: 15000, duration_minutes: 60, tags: ["safe", "lockout"] },
    ],
    required_questions: [
      { intent: "dispatch", key: "service_type", label: "Service Type", ask_prompt: "What do you need help with - car lockout, house lockout, or something else?", why_needed: "Determines service and pricing", required: true },
      { intent: "dispatch", key: "location", label: "Location", ask_prompt: "What's the address where you need service?", why_needed: "Dispatch location", required: true },
      { intent: "dispatch", key: "lock_type", label: "Lock Type", ask_prompt: "Do you know what type of lock it is - standard deadbolt, smart lock, or something else?", why_needed: "Determines tools needed", required: false },
      { intent: "dispatch", key: "urgency", label: "Urgency", ask_prompt: "Is this an emergency or can it wait?", why_needed: "Prioritizes dispatch", required: true },
    ],
    policies: [
      { type: "cancellation", text: "If you cancel after our technician has been dispatched, there's a $35 trip fee." },
      { type: "payment", text: "Payment is due upon completion. We accept cash, credit cards, and mobile payments." },
      { type: "refund", text: "We guarantee our workmanship. If there's an issue, we'll make it right." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "How fast can you get here?", answer: "Our average response time is 15-30 minutes for emergencies." },
      { question: "Will you damage my lock?", answer: "We use professional techniques that don't damage your lock in most cases." },
      { question: "Do I need to show ID?", answer: "Yes, we require proof of residency or vehicle ownership for security." },
      { question: "Are you available 24/7?", answer: "Yes, we offer 24-hour emergency locksmith services." },
    ],
    objections: [
      ...commonObjections,
      { objection: "Can't I just call a tow truck?", response: "A locksmith is usually faster and cheaper for lockouts. We specialize in getting you into your vehicle quickly without damage." },
    ],
    service_area_defaults: { mode: "radius", radius_miles: 25, restrictions: { no_cross_state_lines: false }, notes: "24/7 mobile locksmith service." },
    scheduling_defaults: { lead_time_hours: 0, buffer_minutes: 10, default_slot_duration_minutes: 30 },
  },
};

const courierTemplate: IndustryTemplate = {
  industry_key: "courier",
  name: "Courier & Delivery",
  icon: "📦",
  business_mode: "dispatch",
  defaults: {
    services: [
      { name: "Same-Day Local Delivery", description: "Delivery within city limits same day", base_price_model: "starting_at", starting_price_cents: 2500, duration_minutes: 60, tags: ["local", "same-day"] },
      { name: "Rush Delivery (2 Hour)", description: "Priority delivery within 2 hours", base_price_model: "starting_at", starting_price_cents: 4500, duration_minutes: 120, tags: ["rush", "priority"] },
      { name: "Scheduled Delivery", description: "Delivery at a specific date and time", base_price_model: "starting_at", starting_price_cents: 2000, duration_minutes: 60, tags: ["scheduled"] },
      { name: "Medical/Lab Specimen", description: "Temperature-controlled medical delivery", base_price_model: "starting_at", starting_price_cents: 5000, duration_minutes: 60, tags: ["medical", "specimen"] },
      { name: "Legal Document Delivery", description: "Secure legal document courier", base_price_model: "fixed", fixed_price_cents: 3500, duration_minutes: 60, tags: ["legal", "documents"] },
      { name: "Fragile Item Delivery", description: "Special handling for delicate items", base_price_model: "starting_at", starting_price_cents: 3500, duration_minutes: 60, tags: ["fragile", "special"] },
    ],
    required_questions: [
      { intent: "dispatch", key: "pickup_address", label: "Pickup Address", ask_prompt: "What's the pickup address?", why_needed: "Dispatch location", required: true },
      { intent: "dispatch", key: "delivery_address", label: "Delivery Address", ask_prompt: "What's the delivery address?", why_needed: "Calculates route and pricing", required: true },
      { intent: "dispatch", key: "package_size", label: "Package Size", ask_prompt: "How big is the package - envelope, small box, or larger?", why_needed: "Determines vehicle needed", required: true },
      { intent: "dispatch", key: "delivery_timeframe", label: "Timeframe", ask_prompt: "When does this need to be delivered by?", why_needed: "Determines service level", required: true },
    ],
    policies: [
      { type: "cancellation", text: "Cancellations made after pickup will be charged the full delivery fee." },
      { type: "payment", text: "Payment is due at time of booking. Business accounts can be invoiced monthly." },
      { type: "refund", text: "If we miss the delivery window, we'll refund the rush fee." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do you deliver outside the city?", answer: "Yes, we offer regional delivery. Pricing varies by distance." },
      { question: "Can I track my delivery?", answer: "Yes, you'll receive real-time tracking updates via text." },
      { question: "What if no one's there to receive it?", answer: "We'll contact you for instructions - we can leave it in a safe place or attempt redelivery." },
      { question: "Do you deliver on weekends?", answer: "Yes, we offer 7-day delivery service with slightly higher weekend rates." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "radius", radius_miles: 50, restrictions: { no_cross_state_lines: false }, notes: "Same-day and scheduled delivery services." },
    scheduling_defaults: { lead_time_hours: 1, buffer_minutes: 15, default_slot_duration_minutes: 60 },
  },
};

const mobileMechanicTemplate: IndustryTemplate = {
  industry_key: "mobile_mechanic",
  name: "Mobile Mechanic",
  icon: "🔧",
  business_mode: "dispatch",
  defaults: {
    services: [
      { name: "Battery Jump/Replacement", description: "Jump start or replace dead battery", base_price_model: "starting_at", starting_price_cents: 5000, duration_minutes: 30, tags: ["battery", "electrical"] },
      { name: "Flat Tire Change", description: "Replace flat with spare tire", base_price_model: "fixed", fixed_price_cents: 6500, duration_minutes: 30, tags: ["tire", "emergency"] },
      { name: "Oil Change", description: "Full synthetic or conventional oil change", base_price_model: "starting_at", starting_price_cents: 6500, duration_minutes: 45, tags: ["oil", "maintenance"] },
      { name: "Brake Pad Replacement", description: "Replace front or rear brake pads", base_price_model: "starting_at", starting_price_cents: 15000, duration_minutes: 90, tags: ["brakes", "safety"] },
      { name: "Diagnostic Scan", description: "Computer diagnostic to identify issues", base_price_model: "fixed", fixed_price_cents: 7500, duration_minutes: 30, tags: ["diagnostic", "electrical"] },
      { name: "Alternator Replacement", description: "Replace faulty alternator", base_price_model: "starting_at", starting_price_cents: 35000, duration_minutes: 120, tags: ["alternator", "electrical"] },
      { name: "Starter Replacement", description: "Replace faulty starter motor", base_price_model: "starting_at", starting_price_cents: 30000, duration_minutes: 90, tags: ["starter", "electrical"] },
      { name: "Belt Replacement", description: "Replace serpentine or timing belt", base_price_model: "starting_at", starting_price_cents: 15000, duration_minutes: 60, tags: ["belt", "engine"] },
    ],
    required_questions: [
      { intent: "dispatch", key: "vehicle_info", label: "Vehicle", ask_prompt: "What's the year, make, and model of your vehicle?", why_needed: "Determines parts needed", required: true },
      { intent: "dispatch", key: "issue_description", label: "Issue", ask_prompt: "What's going on with your vehicle?", why_needed: "Diagnoses problem", required: true },
      { intent: "dispatch", key: "location", label: "Location", ask_prompt: "Where is your vehicle located?", why_needed: "Dispatch location", required: true },
      { intent: "dispatch", key: "vehicle_condition", label: "Drivable", ask_prompt: "Is your vehicle currently running or stranded?", why_needed: "Determines urgency", required: true },
    ],
    policies: [
      { type: "cancellation", text: "Please provide at least 2 hours notice for cancellations to avoid a trip fee." },
      { type: "payment", text: "Payment is due upon completion. Parts are charged at cost plus labor." },
      { type: "refund", text: "We warranty our labor for 30 days and parts per manufacturer warranty." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do you bring the parts?", answer: "For common repairs, yes. For specific parts, we may need to order or you can provide them." },
      { question: "How fast can you get here?", answer: "Usually within 1-2 hours depending on location and availability." },
      { question: "Do you work on all vehicles?", answer: "We work on most domestic and foreign vehicles. Some specialty vehicles may require a shop." },
      { question: "Is mobile repair as good as shop repair?", answer: "For many repairs, yes! We have professional tools and parts. Complex repairs may need a shop." },
    ],
    objections: [
      ...commonObjections,
      { objection: "I should just go to a shop", response: "Mobile service saves you time and towing costs. We come to you at your convenience - at home, work, or wherever you are." },
    ],
    service_area_defaults: { mode: "radius", radius_miles: 30, restrictions: { no_cross_state_lines: false }, notes: "Mobile automotive repair service." },
    scheduling_defaults: { lead_time_hours: 2, buffer_minutes: 30, default_slot_duration_minutes: 90 },
  },
};

const limoTemplate: IndustryTemplate = {
  industry_key: "limo",
  name: "Limo & Black Car",
  icon: "🚘",
  business_mode: "dispatch",
  defaults: {
    services: [
      { name: "Airport Transfer", description: "One-way airport pickup or drop-off", base_price_model: "starting_at", starting_price_cents: 7500, duration_minutes: 60, tags: ["airport", "transfer"] },
      { name: "Hourly Charter", description: "Vehicle and driver for hourly use", base_price_model: "starting_at", starting_price_cents: 9500, duration_minutes: 60, tags: ["hourly", "charter"] },
      { name: "Point-to-Point", description: "Direct transportation between two locations", base_price_model: "starting_at", starting_price_cents: 6500, duration_minutes: 45, tags: ["transfer", "direct"] },
      { name: "Wedding Package", description: "Luxury transportation for your wedding day", base_price_model: "starting_at", starting_price_cents: 50000, duration_minutes: 480, tags: ["wedding", "special event"] },
      { name: "Prom/Special Event", description: "Transportation for special occasions", base_price_model: "starting_at", starting_price_cents: 35000, duration_minutes: 300, tags: ["prom", "special event"] },
      { name: "Corporate Account", description: "Business travel and executive transportation", base_price_model: "quote_only", duration_minutes: 60, tags: ["corporate", "business"] },
      { name: "Wine Tour", description: "Chauffeured wine country tour", base_price_model: "starting_at", starting_price_cents: 45000, duration_minutes: 360, tags: ["tour", "wine"] },
    ],
    required_questions: [
      { intent: "dispatch", key: "service_type", label: "Service Type", ask_prompt: "What type of service do you need - airport transfer, hourly, or a special event?", why_needed: "Determines service and pricing", required: true },
      { intent: "dispatch", key: "pickup_location", label: "Pickup Location", ask_prompt: "Where would you like to be picked up?", why_needed: "Route planning", required: true },
      { intent: "dispatch", key: "destination", label: "Destination", ask_prompt: "Where are you heading?", why_needed: "Route and pricing", required: true },
      { intent: "dispatch", key: "date_time", label: "Date & Time", ask_prompt: "When do you need the pickup?", why_needed: "Scheduling", required: true },
      { intent: "dispatch", key: "passengers", label: "Passengers", ask_prompt: "How many passengers will there be?", why_needed: "Vehicle selection", required: true },
    ],
    policies: [
      { type: "cancellation", text: "Cancellations within 24 hours of pickup are charged 50%. No-shows are charged in full." },
      { type: "deposit", text: "Special events require a 50% deposit at booking." },
      { type: "payment", text: "We accept all major credit cards. Corporate accounts can be invoiced." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "What vehicles do you have?", answer: "We have sedans, SUVs, stretch limos, and party buses. We'll recommend based on your group size." },
      { question: "Do you track flights?", answer: "Yes, we monitor flight arrivals and adjust pickup time if your flight is delayed." },
      { question: "Is gratuity included?", answer: "A 20% gratuity is standard but not included in quotes. It can be added at booking." },
      { question: "Can we make stops?", answer: "Hourly charters include stops. Point-to-point can include stops for an additional fee." },
    ],
    objections: [
      ...commonObjections,
      { objection: "Uber is cheaper", response: "For premium events like weddings or executive travel, you get a professional chauffeur, guaranteed vehicle, and no surge pricing. Peace of mind is worth it." },
    ],
    service_area_defaults: { mode: "radius", radius_miles: 100, restrictions: { no_cross_state_lines: false }, notes: "Luxury transportation services." },
    scheduling_defaults: { lead_time_hours: 24, buffer_minutes: 15, default_slot_duration_minutes: 60 },
  },
};

const medicalTransportTemplate: IndustryTemplate = {
  industry_key: "medical_transport",
  name: "Medical Transport",
  icon: "🚑",
  business_mode: "dispatch",
  defaults: {
    services: [
      { name: "Wheelchair Transport", description: "Non-emergency wheelchair-accessible transport", base_price_model: "starting_at", starting_price_cents: 7500, duration_minutes: 60, tags: ["wheelchair", "non-emergency"] },
      { name: "Stretcher Transport", description: "Non-emergency stretcher/gurney transport", base_price_model: "starting_at", starting_price_cents: 15000, duration_minutes: 90, tags: ["stretcher", "non-emergency"] },
      { name: "Ambulatory Transport", description: "Transport for patients who can walk with assistance", base_price_model: "starting_at", starting_price_cents: 5000, duration_minutes: 45, tags: ["ambulatory", "basic"] },
      { name: "Dialysis Transport", description: "Regular transport to/from dialysis appointments", base_price_model: "fixed", fixed_price_cents: 6500, duration_minutes: 60, tags: ["dialysis", "recurring"] },
      { name: "Hospital Discharge", description: "Safe transport home after hospital stay", base_price_model: "starting_at", starting_price_cents: 8500, duration_minutes: 60, tags: ["discharge", "hospital"] },
      { name: "Long Distance Medical", description: "Medical transport over 50 miles", base_price_model: "quote_only", duration_minutes: 180, tags: ["long-distance", "medical"] },
    ],
    required_questions: [
      { intent: "dispatch", key: "patient_mobility", label: "Mobility", ask_prompt: "Can the patient walk, or do they need a wheelchair or stretcher?", why_needed: "Determines vehicle type", required: true },
      { intent: "dispatch", key: "pickup_location", label: "Pickup Location", ask_prompt: "What's the pickup address?", why_needed: "Dispatch planning", required: true },
      { intent: "dispatch", key: "destination", label: "Destination", ask_prompt: "Where does the patient need to go?", why_needed: "Route planning", required: true },
      { intent: "dispatch", key: "appointment_time", label: "Appointment Time", ask_prompt: "What time is the appointment?", why_needed: "Scheduling pickup", required: true },
      { intent: "dispatch", key: "special_needs", label: "Special Needs", ask_prompt: "Does the patient have any special needs - oxygen, bariatric equipment, etc.?", why_needed: "Equipment preparation", required: false },
    ],
    policies: [
      { type: "cancellation", text: "Please provide 24 hours notice for cancellations. Same-day cancellations may incur a fee." },
      { type: "payment", text: "We work with Medicare, Medicaid, and most insurance. Private pay is also accepted." },
      { type: "refund", text: "Billing disputes can be resolved through our patient services department." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do you accept insurance?", answer: "Yes, we work with Medicare, Medicaid, and many private insurance plans." },
      { question: "Is this an ambulance?", answer: "We provide non-emergency medical transport. For emergencies, please call 911." },
      { question: "Can a family member ride along?", answer: "Yes, one family member or caregiver can ride along at no extra charge." },
      { question: "How far in advance should I book?", answer: "We recommend booking 48-72 hours in advance, but we can often accommodate same-day requests." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "radius", radius_miles: 75, restrictions: { no_cross_state_lines: true }, notes: "Non-emergency medical transportation." },
    scheduling_defaults: { lead_time_hours: 24, buffer_minutes: 30, default_slot_duration_minutes: 90 },
  },
};

// ============================================================================
// NEW DISPATCH TEMPLATES - Universal Dispatch Support
// ============================================================================

const junkRemovalTemplate: IndustryTemplate = {
  industry_key: "junk_removal",
  name: "Junk Removal",
  icon: "🗑️",
  business_mode: "dispatch",
  defaults: {
    services: [
      { name: "Single Item Pickup", description: "Remove one large item (couch, mattress, appliance)", base_price_model: "fixed", fixed_price_cents: 7500, duration_minutes: 30, tags: ["single", "pickup"] },
      { name: "1/4 Truck Load", description: "Small load - a few items", base_price_model: "fixed", fixed_price_cents: 15000, duration_minutes: 45, tags: ["small", "load"] },
      { name: "1/2 Truck Load", description: "Medium load - partial room cleanout", base_price_model: "fixed", fixed_price_cents: 25000, duration_minutes: 60, tags: ["medium", "load"] },
      { name: "Full Truck Load", description: "Large load - full room or garage cleanout", base_price_model: "fixed", fixed_price_cents: 40000, duration_minutes: 90, tags: ["full", "load"] },
      { name: "Estate Cleanout", description: "Complete property cleanout", base_price_model: "quote_only", duration_minutes: 480, tags: ["estate", "cleanout"] },
      { name: "Construction Debris", description: "Removal of construction waste", base_price_model: "starting_at", starting_price_cents: 30000, duration_minutes: 120, tags: ["construction", "debris"] },
      { name: "Appliance Removal", description: "Safe disposal of appliances (fridge, washer, etc.)", base_price_model: "fixed", fixed_price_cents: 8500, duration_minutes: 30, tags: ["appliance", "disposal"] },
      { name: "Hot Tub Removal", description: "Disassemble and remove hot tub", base_price_model: "starting_at", starting_price_cents: 45000, duration_minutes: 180, tags: ["hot tub", "removal"] },
    ],
    required_questions: [
      { intent: "dispatch", key: "items_description", label: "Items", ask_prompt: "What items do you need removed?", why_needed: "Determines truck size and pricing", required: true },
      { intent: "dispatch", key: "volume_estimate", label: "Volume", ask_prompt: "About how much stuff is there - a few items, a partial truck, or a full truck load?", why_needed: "Pricing and scheduling", required: true },
      { intent: "dispatch", key: "location", label: "Location", ask_prompt: "What's the address for pickup?", why_needed: "Dispatch location", required: true },
      { intent: "dispatch", key: "item_location", label: "Item Location", ask_prompt: "Where are the items - curbside, garage, inside the house, upstairs?", why_needed: "Labor estimate", required: true },
      { intent: "dispatch", key: "stairs", label: "Stairs Involved", ask_prompt: "Are there any stairs to navigate?", why_needed: "Additional labor fee", required: false },
    ],
    policies: [
      { type: "cancellation", text: "Free cancellation with 24 hours notice. Same-day cancellations may incur a $50 trip fee." },
      { type: "payment", text: "Payment is due upon completion. We accept cash, credit cards, and digital payments." },
      { type: "refund", text: "If you're not satisfied with our service, please contact us within 24 hours." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do you recycle?", answer: "Yes! We donate and recycle as much as possible. Typically 60-80% stays out of landfills." },
      { question: "Can you remove hazardous materials?", answer: "We cannot remove hazardous materials, chemicals, or asbestos. We can refer you to specialists." },
      { question: "Do you clean up after?", answer: "Yes, we do a clean sweep of the area after removing items." },
      { question: "Can you help with hoarding situations?", answer: "Yes, we handle estate cleanouts and hoarding situations with sensitivity and discretion." },
    ],
    objections: [
      ...commonObjections,
      { objection: "I can take it to the dump myself", response: "By the time you rent a truck, pay dump fees, and spend your day - we're often the same price or less. Plus, we do all the heavy lifting!" },
    ],
    service_area_defaults: { mode: "radius", radius_miles: 30, restrictions: { no_cross_state_lines: false }, notes: "Junk removal and cleanout services." },
    scheduling_defaults: { lead_time_hours: 2, buffer_minutes: 30, default_slot_duration_minutes: 60 },
  },
};

const movingTemplate: IndustryTemplate = {
  industry_key: "moving",
  name: "Moving Services",
  icon: "📦",
  business_mode: "dispatch",
  defaults: {
    services: [
      { name: "Studio/Small Move", description: "Studio or small 1-bedroom", base_price_model: "starting_at", starting_price_cents: 35000, duration_minutes: 180, tags: ["studio", "small"] },
      { name: "1-2 Bedroom Move", description: "Standard apartment or small house", base_price_model: "starting_at", starting_price_cents: 50000, duration_minutes: 240, tags: ["apartment", "medium"] },
      { name: "3+ Bedroom Move", description: "Large home or multi-level", base_price_model: "starting_at", starting_price_cents: 80000, duration_minutes: 360, tags: ["house", "large"] },
      { name: "Labor Only", description: "Load or unload your truck/pod", base_price_model: "starting_at", starting_price_cents: 20000, duration_minutes: 120, tags: ["labor", "load"] },
      { name: "Packing Services", description: "Professional packing of your belongings", base_price_model: "starting_at", starting_price_cents: 30000, duration_minutes: 180, tags: ["packing", "prep"] },
      { name: "Single Item Move", description: "Move one large or heavy item", base_price_model: "starting_at", starting_price_cents: 15000, duration_minutes: 60, tags: ["single", "item"] },
      { name: "Long Distance Move", description: "Interstate or long-distance relocation", base_price_model: "quote_only", duration_minutes: 480, tags: ["long-distance", "interstate"] },
    ],
    required_questions: [
      { intent: "dispatch", key: "move_size", label: "Move Size", ask_prompt: "Is this a studio, 1-bedroom, 2-bedroom, or larger?", why_needed: "Determines crew and truck size", required: true },
      { intent: "dispatch", key: "origin_address", label: "Origin Address", ask_prompt: "What's the pickup address?", why_needed: "Route planning", required: true },
      { intent: "dispatch", key: "destination_address", label: "Destination", ask_prompt: "What's the destination address?", why_needed: "Route and pricing", required: true },
      { intent: "dispatch", key: "move_date", label: "Move Date", ask_prompt: "When do you need to move?", why_needed: "Scheduling", required: true },
      { intent: "dispatch", key: "origin_floor", label: "Origin Floor", ask_prompt: "What floor are you moving from? Is there an elevator?", why_needed: "Labor estimate", required: true },
      { intent: "dispatch", key: "large_items", label: "Large Items", ask_prompt: "Any large items like a piano, safe, or pool table?", why_needed: "Special equipment", required: false },
    ],
    policies: [
      { type: "cancellation", text: "Free cancellation up to 48 hours before move. Less notice may incur a fee." },
      { type: "deposit", text: "A $100 deposit is required to reserve your move date." },
      { type: "refund", text: "Deposits are refundable with 48 hours notice." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do you provide packing materials?", answer: "Yes, we can provide boxes, tape, and packing materials at an additional cost." },
      { question: "Are you insured?", answer: "Yes, we carry liability and cargo insurance. Additional coverage is available." },
      { question: "How do you charge?", answer: "We charge by the hour with a minimum, plus any packing materials or specialty item fees." },
      { question: "Can you store my stuff?", answer: "We can arrange short-term storage if there's a gap between your move-out and move-in dates." },
    ],
    objections: [
      ...commonObjections,
      { objection: "I'll just rent a truck", response: "Consider the cost of the truck, insurance, fuel, equipment, and the risk of injury. Our all-inclusive pricing often makes more sense!" },
    ],
    service_area_defaults: { mode: "radius", radius_miles: 50, restrictions: { no_cross_state_lines: false }, notes: "Local and regional moving services." },
    scheduling_defaults: { lead_time_hours: 48, buffer_minutes: 30, default_slot_duration_minutes: 240 },
  },
};

const petGroomingMobileTemplate: IndustryTemplate = {
  industry_key: "pet_grooming",
  name: "Mobile Pet Grooming",
  icon: "🐕",
  business_mode: "dispatch",
  defaults: {
    services: [
      { name: "Full Groom - Small Dog", description: "Bath, haircut, nails, ears for dogs under 25 lbs", base_price_model: "fixed", fixed_price_cents: 6500, duration_minutes: 60, tags: ["small", "full groom"] },
      { name: "Full Groom - Medium Dog", description: "Bath, haircut, nails, ears for dogs 25-50 lbs", base_price_model: "fixed", fixed_price_cents: 8500, duration_minutes: 75, tags: ["medium", "full groom"] },
      { name: "Full Groom - Large Dog", description: "Bath, haircut, nails, ears for dogs 50-80 lbs", base_price_model: "fixed", fixed_price_cents: 10500, duration_minutes: 90, tags: ["large", "full groom"] },
      { name: "Full Groom - Extra Large", description: "Bath, haircut, nails, ears for dogs over 80 lbs", base_price_model: "fixed", fixed_price_cents: 13500, duration_minutes: 120, tags: ["xl", "full groom"] },
      { name: "Bath & Brush Only", description: "Bath, brush out, nails, no haircut", base_price_model: "starting_at", starting_price_cents: 4500, duration_minutes: 45, tags: ["bath", "basic"] },
      { name: "Nail Trim Only", description: "Quick nail trim service", base_price_model: "fixed", fixed_price_cents: 2000, duration_minutes: 15, tags: ["nails", "quick"] },
      { name: "De-matting Service", description: "Remove severe matting (charged in addition)", base_price_model: "starting_at", starting_price_cents: 2500, duration_minutes: 30, tags: ["dematting", "addon"] },
      { name: "Cat Grooming", description: "Full groom for cats", base_price_model: "starting_at", starting_price_cents: 7500, duration_minutes: 60, tags: ["cat", "feline"] },
    ],
    required_questions: [
      { intent: "dispatch", key: "pet_type", label: "Pet Type", ask_prompt: "Is this for a dog, cat, or another pet?", why_needed: "Service type", required: true },
      { intent: "dispatch", key: "pet_breed", label: "Breed", ask_prompt: "What breed is your pet?", why_needed: "Determines grooming style", required: true },
      { intent: "dispatch", key: "pet_size", label: "Size", ask_prompt: "How much does your pet weigh - under 25 lbs, 25-50, 50-80, or over 80 lbs?", why_needed: "Pricing and timing", required: true },
      { intent: "dispatch", key: "service_type", label: "Service", ask_prompt: "What service do you need - full groom, bath only, or just nails?", why_needed: "Service selection", required: true },
      { intent: "dispatch", key: "location", label: "Location", ask_prompt: "What's your address?", why_needed: "Dispatch location", required: true },
      { intent: "dispatch", key: "pet_temperament", label: "Temperament", ask_prompt: "How does your pet do with grooming - calm, nervous, or needs extra patience?", why_needed: "Groomer preparation", required: false },
    ],
    policies: [
      { type: "cancellation", text: "Please provide 24 hours notice. Late cancellations or no-shows may incur a $35 fee." },
      { type: "payment", text: "Payment is due at the time of service." },
      { type: "refund", text: "If you're not happy with the groom, contact us within 48 hours and we'll make it right." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Where does grooming happen?", answer: "Right in our mobile grooming van parked in your driveway - complete with water and power!" },
      { question: "How long does grooming take?", answer: "Typically 1-2 hours depending on size, coat condition, and services requested." },
      { question: "Do you sedate dogs?", answer: "No, we never sedate. We use patience, treats, and calming techniques for nervous pets." },
      { question: "What if my pet is matted?", answer: "Severe matting may require additional time and de-matting fees. In some cases, a shave-down is the humane option." },
    ],
    objections: [
      ...commonObjections,
      { objection: "It's cheaper at the pet store", response: "With mobile grooming, your pet gets one-on-one attention in a calm environment, with no cage time. Many pets are much less stressed!" },
    ],
    service_area_defaults: { mode: "radius", radius_miles: 20, restrictions: { no_cross_state_lines: false }, notes: "Mobile pet grooming comes to you!" },
    scheduling_defaults: { lead_time_hours: 24, buffer_minutes: 15, default_slot_duration_minutes: 90 },
  },
};

const restorationTemplate: IndustryTemplate = {
  industry_key: "restoration",
  name: "Water & Fire Restoration",
  icon: "💧",
  business_mode: "dispatch",
  defaults: {
    services: [
      { name: "Water Extraction", description: "Emergency water removal", base_price_model: "starting_at", starting_price_cents: 50000, duration_minutes: 180, tags: ["water", "emergency"] },
      { name: "Flood Damage Restoration", description: "Complete flood cleanup and restoration", base_price_model: "quote_only", duration_minutes: 480, tags: ["flood", "restoration"] },
      { name: "Fire Damage Restoration", description: "Fire and smoke damage cleanup", base_price_model: "quote_only", duration_minutes: 480, tags: ["fire", "smoke"] },
      { name: "Mold Remediation", description: "Professional mold removal and treatment", base_price_model: "quote_only", duration_minutes: 240, tags: ["mold", "remediation"] },
      { name: "Storm Damage Cleanup", description: "Wind, hail, and storm damage repair", base_price_model: "quote_only", duration_minutes: 240, tags: ["storm", "wind"] },
      { name: "Sewage Cleanup", description: "Biohazard sewage backup cleanup", base_price_model: "starting_at", starting_price_cents: 75000, duration_minutes: 240, tags: ["sewage", "biohazard"] },
      { name: "Content Restoration", description: "Cleaning and restoring belongings", base_price_model: "quote_only", duration_minutes: 480, tags: ["contents", "belongings"] },
    ],
    required_questions: [
      { intent: "dispatch", key: "damage_type", label: "Damage Type", ask_prompt: "What type of damage do you have - water, fire, mold, or storm?", why_needed: "Determines response team", required: true },
      { intent: "dispatch", key: "damage_source", label: "Source", ask_prompt: "What caused the damage - pipe burst, flood, fire, etc.?", why_needed: "Determines approach", required: true },
      { intent: "dispatch", key: "affected_area", label: "Affected Area", ask_prompt: "How large is the affected area - one room, multiple rooms, or the whole property?", why_needed: "Equipment and crew sizing", required: true },
      { intent: "dispatch", key: "location", label: "Location", ask_prompt: "What's the property address?", why_needed: "Dispatch location", required: true },
      { intent: "dispatch", key: "standing_water", label: "Standing Water", ask_prompt: "Is there standing water currently?", why_needed: "Emergency prioritization", required: true },
      { intent: "dispatch", key: "insurance_claim", label: "Insurance", ask_prompt: "Will this be an insurance claim?", why_needed: "Documentation requirements", required: false },
    ],
    policies: [
      { type: "cancellation", text: "Emergency services cannot be cancelled once teams are dispatched." },
      { type: "payment", text: "We work directly with insurance companies. Out-of-pocket payments may be arranged." },
      { type: "refund", text: "All work is documented and guaranteed. We work with your insurance adjuster." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do you work with insurance?", answer: "Yes, we work with all major insurance companies and can bill them directly." },
      { question: "How fast can you get here?", answer: "For emergencies, we typically respond within 1-2 hours, 24/7." },
      { question: "Will my belongings be saved?", answer: "We do everything possible to restore your belongings. Our content restoration team specializes in this." },
      { question: "How long does restoration take?", answer: "It depends on the damage extent. We'll give you a timeline after the initial assessment." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "radius", radius_miles: 50, restrictions: { no_cross_state_lines: false }, notes: "24/7 emergency restoration services." },
    scheduling_defaults: { lead_time_hours: 0, buffer_minutes: 0, default_slot_duration_minutes: 180 },
  },
};

const treeServiceTemplate: IndustryTemplate = {
  industry_key: "tree_service",
  name: "Tree Service",
  icon: "🌳",
  business_mode: "dispatch",
  defaults: {
    services: [
      { name: "Tree Trimming", description: "Professional pruning and shaping", base_price_model: "starting_at", starting_price_cents: 25000, duration_minutes: 120, tags: ["trimming", "pruning"] },
      { name: "Tree Removal - Small", description: "Remove tree under 20 feet", base_price_model: "starting_at", starting_price_cents: 40000, duration_minutes: 180, tags: ["removal", "small"] },
      { name: "Tree Removal - Medium", description: "Remove tree 20-40 feet", base_price_model: "starting_at", starting_price_cents: 75000, duration_minutes: 300, tags: ["removal", "medium"] },
      { name: "Tree Removal - Large", description: "Remove tree over 40 feet", base_price_model: "quote_only", duration_minutes: 480, tags: ["removal", "large"] },
      { name: "Stump Grinding", description: "Grind stump below ground level", base_price_model: "starting_at", starting_price_cents: 15000, duration_minutes: 60, tags: ["stump", "grinding"] },
      { name: "Emergency Storm Damage", description: "Fallen tree removal and cleanup", base_price_model: "starting_at", starting_price_cents: 50000, duration_minutes: 180, tags: ["emergency", "storm"] },
      { name: "Lot Clearing", description: "Clear trees from a property lot", base_price_model: "quote_only", duration_minutes: 480, tags: ["clearing", "lot"] },
    ],
    required_questions: [
      { intent: "dispatch", key: "service_type", label: "Service", ask_prompt: "Do you need tree removal, trimming, stump grinding, or emergency service?", why_needed: "Determines equipment", required: true },
      { intent: "dispatch", key: "tree_count", label: "Number of Trees", ask_prompt: "How many trees need service?", why_needed: "Pricing and scheduling", required: true },
      { intent: "dispatch", key: "tree_size", label: "Tree Size", ask_prompt: "Approximately how tall is the tree - under 20 feet, 20-40 feet, or over 40 feet?", why_needed: "Equipment and crew", required: true },
      { intent: "dispatch", key: "location", label: "Location", ask_prompt: "What's the property address?", why_needed: "Dispatch location", required: true },
      { intent: "dispatch", key: "near_structures", label: "Near Structures", ask_prompt: "Is the tree near any buildings, power lines, or fences?", why_needed: "Safety planning", required: true },
      { intent: "dispatch", key: "debris_removal", label: "Debris Removal", ask_prompt: "Do you need the debris hauled away or can we leave it for you?", why_needed: "Pricing", required: true },
    ],
    policies: [
      { type: "cancellation", text: "Please provide 48 hours notice. Weather cancellations are free." },
      { type: "deposit", text: "Large jobs may require a 50% deposit." },
      { type: "payment", text: "Payment due upon completion. Credit cards accepted." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Are you insured?", answer: "Yes, we carry full liability and workers' compensation insurance." },
      { question: "Do you need to see it first?", answer: "For larger jobs, yes, we provide free on-site estimates." },
      { question: "What happens to the wood?", answer: "We can chip it for mulch, cut it for firewood, or haul it away - your choice!" },
      { question: "Can you plant a new tree?", answer: "Yes, we offer tree planting services and can recommend suitable species." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "radius", radius_miles: 35, restrictions: { no_cross_state_lines: false }, notes: "Professional tree service." },
    scheduling_defaults: { lead_time_hours: 48, buffer_minutes: 30, default_slot_duration_minutes: 180 },
  },
};

const septicTemplate: IndustryTemplate = {
  industry_key: "septic",
  name: "Septic & Pumping",
  icon: "🚽",
  business_mode: "dispatch",
  defaults: {
    services: [
      { name: "Septic Tank Pumping", description: "Standard residential tank pumping", base_price_model: "starting_at", starting_price_cents: 35000, duration_minutes: 60, tags: ["pumping", "residential"] },
      { name: "Commercial Pumping", description: "Commercial or large tank pumping", base_price_model: "starting_at", starting_price_cents: 50000, duration_minutes: 90, tags: ["pumping", "commercial"] },
      { name: "Emergency Pumping", description: "Same-day emergency service", base_price_model: "starting_at", starting_price_cents: 50000, duration_minutes: 60, tags: ["emergency", "pumping"] },
      { name: "Septic Inspection", description: "Full system inspection", base_price_model: "fixed", fixed_price_cents: 40000, duration_minutes: 90, tags: ["inspection", "diagnostic"] },
      { name: "Grease Trap Cleaning", description: "Commercial grease trap service", base_price_model: "starting_at", starting_price_cents: 25000, duration_minutes: 45, tags: ["grease", "commercial"] },
      { name: "Holding Tank Pumping", description: "RV or holding tank pump out", base_price_model: "fixed", fixed_price_cents: 25000, duration_minutes: 30, tags: ["holding", "rv"] },
    ],
    required_questions: [
      { intent: "dispatch", key: "service_type", label: "Service", ask_prompt: "Do you need pumping, an inspection, or is this an emergency?", why_needed: "Service type", required: true },
      { intent: "dispatch", key: "tank_size", label: "Tank Size", ask_prompt: "Do you know your tank size - 500, 750, 1000, or 1500 gallons?", why_needed: "Pricing and equipment", required: false },
      { intent: "dispatch", key: "location", label: "Location", ask_prompt: "What's the property address?", why_needed: "Dispatch location", required: true },
      { intent: "dispatch", key: "access_clear", label: "Tank Access", ask_prompt: "Is the tank lid accessible and uncovered?", why_needed: "Preparation", required: true },
      { intent: "dispatch", key: "backup_present", label: "Backup Present", ask_prompt: "Are you experiencing any backups in the house right now?", why_needed: "Emergency prioritization", required: true },
    ],
    policies: [
      { type: "cancellation", text: "Please provide 24 hours notice for cancellations." },
      { type: "payment", text: "Payment is due upon completion of service." },
      { type: "refund", text: "We guarantee our work. If there are issues, contact us immediately." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "How often should I pump?", answer: "Most residential tanks should be pumped every 3-5 years, depending on usage." },
      { question: "Do I need to be home?", answer: "It's helpful but not required if we can access the tank." },
      { question: "What if I don't know where my tank is?", answer: "We can locate it for an additional fee." },
      { question: "Can you fix a failing system?", answer: "We diagnose issues and can recommend repairs or replacement options." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "radius", radius_miles: 40, restrictions: { no_cross_state_lines: false }, notes: "Septic pumping and maintenance services." },
    scheduling_defaults: { lead_time_hours: 24, buffer_minutes: 15, default_slot_duration_minutes: 60 },
  },
};

const notaryTemplate: IndustryTemplate = {
  industry_key: "notary",
  name: "Mobile Notary",
  icon: "📋",
  business_mode: "dispatch",
  defaults: {
    services: [
      { name: "General Notarization", description: "Standard document notarization", base_price_model: "fixed", fixed_price_cents: 5000, duration_minutes: 30, tags: ["general", "notary"] },
      { name: "Loan Signing", description: "Complete loan document signing package", base_price_model: "fixed", fixed_price_cents: 15000, duration_minutes: 60, tags: ["loan", "signing"] },
      { name: "Real Estate Documents", description: "Deeds, titles, and property documents", base_price_model: "fixed", fixed_price_cents: 7500, duration_minutes: 45, tags: ["real estate", "property"] },
      { name: "Power of Attorney", description: "POA document notarization", base_price_model: "fixed", fixed_price_cents: 6000, duration_minutes: 30, tags: ["poa", "legal"] },
      { name: "Affidavit/Oath", description: "Sworn statement notarization", base_price_model: "fixed", fixed_price_cents: 5000, duration_minutes: 20, tags: ["affidavit", "oath"] },
      { name: "Hospital/Facility Visit", description: "Notarization at hospital or care facility", base_price_model: "starting_at", starting_price_cents: 10000, duration_minutes: 60, tags: ["hospital", "facility"] },
      { name: "After Hours Service", description: "Evening or weekend notarization", base_price_model: "starting_at", starting_price_cents: 10000, duration_minutes: 45, tags: ["after hours", "weekend"] },
    ],
    required_questions: [
      { intent: "dispatch", key: "document_type", label: "Document Type", ask_prompt: "What type of document needs to be notarized - loan, power of attorney, real estate, or general?", why_needed: "Service type", required: true },
      { intent: "dispatch", key: "signer_count", label: "Signers", ask_prompt: "How many people need to sign?", why_needed: "Pricing and timing", required: true },
      { intent: "dispatch", key: "location", label: "Location", ask_prompt: "Where would you like the notarization to take place?", why_needed: "Travel to location", required: true },
      { intent: "dispatch", key: "appointment_time", label: "Time", ask_prompt: "When do you need this done?", why_needed: "Scheduling", required: true },
      { intent: "dispatch", key: "document_count", label: "Documents", ask_prompt: "Approximately how many documents or signatures?", why_needed: "Pricing", required: false },
    ],
    policies: [
      { type: "cancellation", text: "Please provide 2 hours notice for cancellations to avoid a trip fee." },
      { type: "payment", text: "Payment is due at the time of service." },
      { type: "refund", text: "Services completed cannot be refunded, but we'll address any concerns." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "What ID do I need?", answer: "A valid, unexpired government-issued photo ID such as a driver's license or passport." },
      { question: "Do you witness signatures?", answer: "Yes, we can serve as a signing witness when permitted by law." },
      { question: "Can you notarize for someone in the hospital?", answer: "Yes, we regularly visit hospitals, care facilities, and homes for those who cannot travel." },
      { question: "Do I need to have my own documents?", answer: "Yes, please have all documents ready. We notarize documents, we don't prepare them." },
    ],
    objections: [
      ...commonObjections,
      { objection: "I can go to the bank", response: "Banks have limited hours and you may wait in line. We come to you when it's convenient, even evenings and weekends." },
    ],
    service_area_defaults: { mode: "radius", radius_miles: 25, restrictions: { no_cross_state_lines: true }, notes: "Mobile notary services - we come to you!" },
    scheduling_defaults: { lead_time_hours: 2, buffer_minutes: 15, default_slot_duration_minutes: 45 },
  },
};

const securityPatrolTemplate: IndustryTemplate = {
  industry_key: "security",
  name: "Security Patrol",
  icon: "🔒",
  business_mode: "dispatch",
  defaults: {
    services: [
      { name: "One-Time Property Check", description: "Single patrol visit and inspection", base_price_model: "fixed", fixed_price_cents: 7500, duration_minutes: 30, tags: ["one-time", "check"] },
      { name: "Nightly Patrol Service", description: "Overnight patrol monitoring", base_price_model: "starting_at", starting_price_cents: 25000, duration_minutes: 480, tags: ["nightly", "ongoing"] },
      { name: "Event Security", description: "Security presence for events", base_price_model: "starting_at", starting_price_cents: 35000, duration_minutes: 240, tags: ["event", "special"] },
      { name: "Construction Site Patrol", description: "Patrol for active construction sites", base_price_model: "quote_only", duration_minutes: 480, tags: ["construction", "ongoing"] },
      { name: "Vacation Watch", description: "Regular checks while you're away", base_price_model: "starting_at", starting_price_cents: 10000, duration_minutes: 60, tags: ["vacation", "residential"] },
      { name: "Emergency Response", description: "Immediate dispatch for alarm or incident", base_price_model: "fixed", fixed_price_cents: 15000, duration_minutes: 60, tags: ["emergency", "response"] },
      { name: "Lockup/Unlock Service", description: "Secure or unlock property on schedule", base_price_model: "fixed", fixed_price_cents: 5000, duration_minutes: 15, tags: ["lockup", "service"] },
    ],
    required_questions: [
      { intent: "dispatch", key: "service_type", label: "Service", ask_prompt: "What type of service do you need - patrol, event security, or emergency response?", why_needed: "Service type", required: true },
      { intent: "dispatch", key: "property_type", label: "Property Type", ask_prompt: "Is this for a home, business, construction site, or event?", why_needed: "Patrol approach", required: true },
      { intent: "dispatch", key: "location", label: "Location", ask_prompt: "What's the property address?", why_needed: "Patrol location", required: true },
      { intent: "dispatch", key: "frequency", label: "Frequency", ask_prompt: "Is this a one-time need or ongoing service?", why_needed: "Service plan", required: true },
      { intent: "dispatch", key: "access_instructions", label: "Access", ask_prompt: "How should our officers access the property?", why_needed: "Patrol planning", required: false },
    ],
    policies: [
      { type: "cancellation", text: "Ongoing services require 30 days notice to cancel." },
      { type: "deposit", text: "Monthly patrol services require first month payment in advance." },
      { type: "payment", text: "Invoiced monthly for ongoing services. One-time services due upon completion." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Are your officers armed?", answer: "We offer both armed and unarmed patrol options based on your needs and location requirements." },
      { question: "Do you work with alarm companies?", answer: "Yes, we can respond to alarm activations and coordinate with your monitoring company." },
      { question: "What do you do if you find a problem?", answer: "We document everything, contact you immediately, and can coordinate with law enforcement if needed." },
      { question: "Do you provide reports?", answer: "Yes, you'll receive detailed patrol reports with timestamps and any observations." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "radius", radius_miles: 30, restrictions: { no_cross_state_lines: true }, notes: "Professional security patrol services." },
    scheduling_defaults: { lead_time_hours: 24, buffer_minutes: 15, default_slot_duration_minutes: 60 },
  },
};

// ============================================================================
// ADDITIONAL MEDICAL TEMPLATES
// ============================================================================

const optometryTemplate: IndustryTemplate = {
  industry_key: "optometry",
  name: "Optometry & Eye Care",
  icon: "👁️",
  business_mode: "medical",
  defaults: {
    services: [
      { name: "Comprehensive Eye Exam", description: "Full vision and eye health examination", base_price_model: "fixed", fixed_price_cents: 15000, duration_minutes: 60, tags: ["exam", "comprehensive"] },
      { name: "Contact Lens Fitting", description: "Exam and fitting for contact lenses", base_price_model: "fixed", fixed_price_cents: 12000, duration_minutes: 45, tags: ["contacts", "fitting"] },
      { name: "Glasses Prescription", description: "Vision test for glasses prescription", base_price_model: "fixed", fixed_price_cents: 10000, duration_minutes: 30, tags: ["glasses", "prescription"] },
      { name: "Pediatric Eye Exam", description: "Eye exam for children", base_price_model: "fixed", fixed_price_cents: 12500, duration_minutes: 45, tags: ["pediatric", "exam"] },
      { name: "Dry Eye Consultation", description: "Evaluation and treatment for dry eyes", base_price_model: "fixed", fixed_price_cents: 15000, duration_minutes: 45, tags: ["dry eye", "treatment"] },
      { name: "Emergency Eye Care", description: "Same-day care for eye emergencies", base_price_model: "starting_at", starting_price_cents: 17500, duration_minutes: 45, tags: ["emergency", "urgent"] },
      { name: "Glaucoma Screening", description: "Specialized testing for glaucoma", base_price_model: "fixed", fixed_price_cents: 7500, duration_minutes: 30, tags: ["glaucoma", "screening"] },
    ],
    required_questions: [
      { intent: "booking", key: "visit_reason", label: "Visit Reason", ask_prompt: "What brings you in - routine exam, new glasses, contacts, or an eye problem?", why_needed: "Determines appointment type", required: true },
      { intent: "booking", key: "current_prescription", label: "Current Glasses/Contacts", ask_prompt: "Do you currently wear glasses or contacts?", why_needed: "Prepares for exam", required: true },
      { intent: "booking", key: "new_patient", label: "New Patient", ask_prompt: "Have you been to our office before?", why_needed: "Determines appointment length", required: true },
      { intent: "booking", key: "insurance", label: "Insurance", ask_prompt: "Do you have vision insurance?", why_needed: "Billing preparation", required: false },
    ],
    policies: [
      { type: "cancellation", text: "Please provide 24 hours notice for cancellations." },
      { type: "deposit", text: "No deposit required. Payment is due at time of service." },
      { type: "refund", text: "Prescription adjustments within 60 days are included at no charge." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do you take vision insurance?", answer: "Yes, we accept most vision plans including VSP, EyeMed, and Davis Vision." },
      { question: "How often should I get an eye exam?", answer: "Adults should get a comprehensive exam every 1-2 years, more often if you have vision problems." },
      { question: "Do you sell glasses and contacts?", answer: "Yes, we have a full optical shop with frames, lenses, and contact lenses." },
      { question: "Can I use my HSA/FSA?", answer: "Yes, eye exams and eyewear are eligible HSA/FSA expenses." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "zips", radius_miles: null, restrictions: { no_cross_state_lines: false }, notes: "Visit our eye care center." },
    scheduling_defaults: { lead_time_hours: 24, buffer_minutes: 15, default_slot_duration_minutes: 60 },
  },
};

const physicalTherapyTemplate: IndustryTemplate = {
  industry_key: "physical_therapy",
  name: "Physical Therapy",
  icon: "🏃",
  business_mode: "medical",
  defaults: {
    services: [
      { name: "Initial Evaluation", description: "Comprehensive assessment and treatment plan", base_price_model: "fixed", fixed_price_cents: 17500, duration_minutes: 60, tags: ["evaluation", "new patient"] },
      { name: "Follow-Up Session", description: "Ongoing therapy session", base_price_model: "fixed", fixed_price_cents: 12500, duration_minutes: 45, tags: ["follow-up", "treatment"] },
      { name: "Post-Surgery Rehab", description: "Rehabilitation after surgical procedure", base_price_model: "starting_at", starting_price_cents: 15000, duration_minutes: 60, tags: ["post-op", "rehab"] },
      { name: "Sports Injury Treatment", description: "Treatment for athletic injuries", base_price_model: "fixed", fixed_price_cents: 12500, duration_minutes: 45, tags: ["sports", "injury"] },
      { name: "Back Pain Program", description: "Specialized program for back and spine issues", base_price_model: "fixed", fixed_price_cents: 12500, duration_minutes: 45, tags: ["back", "spine"] },
      { name: "Balance & Fall Prevention", description: "Training to improve balance and prevent falls", base_price_model: "fixed", fixed_price_cents: 12500, duration_minutes: 45, tags: ["balance", "geriatric"] },
      { name: "Manual Therapy", description: "Hands-on treatment techniques", base_price_model: "fixed", fixed_price_cents: 12500, duration_minutes: 45, tags: ["manual", "hands-on"] },
      { name: "Dry Needling", description: "Trigger point dry needling therapy", base_price_model: "fixed", fixed_price_cents: 7500, duration_minutes: 30, tags: ["dry needling", "trigger point"] },
    ],
    required_questions: [
      { intent: "booking", key: "condition", label: "Condition", ask_prompt: "What condition or injury are you seeking treatment for?", why_needed: "Prepares treatment plan", required: true },
      { intent: "booking", key: "referral", label: "Referral", ask_prompt: "Do you have a referral or prescription from a doctor?", why_needed: "Insurance requirement", required: true },
      { intent: "booking", key: "new_patient", label: "New Patient", ask_prompt: "Have you been to our clinic before?", why_needed: "Determines appointment type", required: true },
      { intent: "booking", key: "insurance", label: "Insurance", ask_prompt: "What insurance do you have?", why_needed: "Verifies coverage", required: true },
    ],
    policies: [
      { type: "cancellation", text: "Please provide 24 hours notice. Late cancellations may result in a $50 fee." },
      { type: "payment", text: "Co-pays are due at time of service. We verify insurance benefits before your first visit." },
      { type: "refund", text: "We work with you and your insurance to maximize your benefits." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do I need a referral?", answer: "In most states you can come directly to us, but some insurance plans require a referral." },
      { question: "How many sessions will I need?", answer: "It varies by condition. After your evaluation, we'll give you an estimated treatment timeline." },
      { question: "Does insurance cover physical therapy?", answer: "Most insurance plans cover PT. We verify your benefits before your first visit." },
      { question: "What should I wear?", answer: "Comfortable, loose-fitting clothes that allow you to move freely." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "zips", radius_miles: null, restrictions: { no_cross_state_lines: false }, notes: "Visit our physical therapy clinic." },
    scheduling_defaults: { lead_time_hours: 24, buffer_minutes: 15, default_slot_duration_minutes: 45 },
  },
};

const veterinaryTemplate: IndustryTemplate = {
  industry_key: "veterinary",
  name: "Veterinary Clinic",
  icon: "🐾",
  business_mode: "medical",
  defaults: {
    services: [
      { name: "Wellness Exam", description: "Annual checkup for your pet", base_price_model: "fixed", fixed_price_cents: 6500, duration_minutes: 30, tags: ["exam", "wellness"] },
      { name: "Vaccinations", description: "Core and lifestyle vaccines", base_price_model: "starting_at", starting_price_cents: 2500, duration_minutes: 15, tags: ["vaccines", "preventive"] },
      { name: "Sick Visit", description: "Exam for illness or injury", base_price_model: "starting_at", starting_price_cents: 7500, duration_minutes: 30, tags: ["sick", "illness"] },
      { name: "Dental Cleaning", description: "Professional teeth cleaning under anesthesia", base_price_model: "starting_at", starting_price_cents: 35000, duration_minutes: 120, tags: ["dental", "cleaning"] },
      { name: "Spay/Neuter", description: "Surgical sterilization procedure", base_price_model: "starting_at", starting_price_cents: 25000, duration_minutes: 60, tags: ["surgery", "spay", "neuter"] },
      { name: "X-Ray/Diagnostics", description: "Diagnostic imaging", base_price_model: "starting_at", starting_price_cents: 15000, duration_minutes: 30, tags: ["x-ray", "diagnostic"] },
      { name: "Emergency Visit", description: "Urgent care for pet emergencies", base_price_model: "starting_at", starting_price_cents: 12500, duration_minutes: 45, tags: ["emergency", "urgent"] },
      { name: "Microchipping", description: "Permanent ID microchip implant", base_price_model: "fixed", fixed_price_cents: 5000, duration_minutes: 15, tags: ["microchip", "id"] },
    ],
    required_questions: [
      { intent: "booking", key: "pet_type", label: "Pet Type", ask_prompt: "What kind of pet is this for - dog, cat, or other?", why_needed: "Prepares for visit", required: true },
      { intent: "booking", key: "pet_name", label: "Pet Name", ask_prompt: "What's your pet's name?", why_needed: "Patient identification", required: true },
      { intent: "booking", key: "visit_reason", label: "Visit Reason", ask_prompt: "What brings you in today - routine checkup, vaccinations, or is something wrong?", why_needed: "Determines appointment type", required: true },
      { intent: "booking", key: "new_patient", label: "New Patient", ask_prompt: "Have you been to our clinic before?", why_needed: "Prepares medical records", required: true },
    ],
    policies: [
      { type: "cancellation", text: "Please provide 24 hours notice for cancellations, especially for surgical appointments." },
      { type: "deposit", text: "Surgeries and dental procedures require a deposit at booking." },
      { type: "payment", text: "Payment is due at time of service. We accept CareCredit and Scratchpay financing." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do you see exotic pets?", answer: "We primarily see dogs and cats. For exotic pets, we can provide referrals." },
      { question: "Do you offer payment plans?", answer: "Yes, we accept CareCredit and Scratchpay for financing options." },
      { question: "What vaccines does my pet need?", answer: "Core vaccines are recommended for all pets. We'll discuss lifestyle vaccines based on your pet's activities." },
      { question: "Do you offer boarding?", answer: "We offer medical boarding for pets with health conditions. Ask about our partner facilities for regular boarding." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "zips", radius_miles: null, restrictions: { no_cross_state_lines: false }, notes: "Visit our veterinary clinic." },
    scheduling_defaults: { lead_time_hours: 4, buffer_minutes: 10, default_slot_duration_minutes: 30 },
  },
};

const mentalHealthTemplate: IndustryTemplate = {
  industry_key: "mental_health",
  name: "Mental Health & Counseling",
  icon: "🧠",
  business_mode: "medical",
  defaults: {
    services: [
      { name: "Initial Assessment", description: "Comprehensive intake and assessment session", base_price_model: "fixed", fixed_price_cents: 20000, duration_minutes: 60, tags: ["intake", "assessment"] },
      { name: "Individual Therapy", description: "One-on-one counseling session", base_price_model: "fixed", fixed_price_cents: 15000, duration_minutes: 50, tags: ["individual", "therapy"] },
      { name: "Couples Therapy", description: "Relationship counseling for couples", base_price_model: "fixed", fixed_price_cents: 17500, duration_minutes: 60, tags: ["couples", "relationship"] },
      { name: "Family Therapy", description: "Counseling for family issues", base_price_model: "fixed", fixed_price_cents: 17500, duration_minutes: 60, tags: ["family", "therapy"] },
      { name: "Teen/Adolescent Therapy", description: "Specialized therapy for teenagers", base_price_model: "fixed", fixed_price_cents: 15000, duration_minutes: 50, tags: ["teen", "adolescent"] },
      { name: "Medication Management", description: "Psychiatric medication consultation", base_price_model: "fixed", fixed_price_cents: 20000, duration_minutes: 30, tags: ["medication", "psychiatry"] },
      { name: "Telehealth Session", description: "Virtual therapy session", base_price_model: "fixed", fixed_price_cents: 15000, duration_minutes: 50, tags: ["telehealth", "virtual"] },
    ],
    required_questions: [
      { intent: "booking", key: "concern", label: "Main Concern", ask_prompt: "What would you like to address in therapy - anxiety, depression, relationships, or something else?", why_needed: "Matches with right therapist", required: true },
      { intent: "booking", key: "service_type", label: "Service Type", ask_prompt: "Are you looking for individual, couples, or family therapy?", why_needed: "Determines appointment type", required: true },
      { intent: "booking", key: "new_patient", label: "New Patient", ask_prompt: "Have you been to our practice before?", why_needed: "Determines appointment length", required: true },
      { intent: "booking", key: "insurance", label: "Insurance", ask_prompt: "Do you have insurance you'd like to use, or are you looking for private pay?", why_needed: "Billing preparation", required: true },
    ],
    policies: [
      { type: "cancellation", text: "Please provide 24 hours notice. Late cancellations are charged 50% of the session fee." },
      { type: "payment", text: "Payment is due at time of service. We accept insurance, HSA/FSA, and private pay." },
      { type: "refund", text: "We're committed to your care. If you're not satisfied with our services, please discuss with your therapist." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do you take insurance?", answer: "Yes, we're in-network with many insurance plans. We'll verify your benefits before your first session." },
      { question: "Is therapy confidential?", answer: "Absolutely. Everything discussed in therapy is confidential, with few legal exceptions we'll explain." },
      { question: "How often should I come?", answer: "Most clients start with weekly sessions. We can adjust frequency based on your needs and progress." },
      { question: "Do you offer telehealth?", answer: "Yes, we offer secure video sessions for clients who prefer remote therapy." },
    ],
    objections: [
      ...commonObjections,
      { objection: "I'm not sure therapy will help", response: "It's normal to feel uncertain. Research shows therapy is effective for most people. We can start with a few sessions to see if it's a good fit." },
    ],
    service_area_defaults: { mode: "zips", radius_miles: null, restrictions: { no_cross_state_lines: true }, notes: "Therapists are licensed by state." },
    scheduling_defaults: { lead_time_hours: 24, buffer_minutes: 10, default_slot_duration_minutes: 50 },
  },
};

const dermatologyTemplate: IndustryTemplate = {
  industry_key: "dermatology",
  name: "Dermatology",
  icon: "✨",
  business_mode: "medical",
  defaults: {
    services: [
      { name: "New Patient Consultation", description: "Comprehensive skin evaluation", base_price_model: "fixed", fixed_price_cents: 20000, duration_minutes: 45, tags: ["consultation", "new patient"] },
      { name: "Follow-Up Visit", description: "Follow-up skin check", base_price_model: "fixed", fixed_price_cents: 12500, duration_minutes: 20, tags: ["follow-up"] },
      { name: "Annual Skin Check", description: "Full-body skin cancer screening", base_price_model: "fixed", fixed_price_cents: 15000, duration_minutes: 30, tags: ["screening", "skin cancer"] },
      { name: "Acne Treatment", description: "Evaluation and treatment plan for acne", base_price_model: "fixed", fixed_price_cents: 15000, duration_minutes: 30, tags: ["acne", "treatment"] },
      { name: "Mole Removal", description: "Surgical removal of mole or lesion", base_price_model: "starting_at", starting_price_cents: 25000, duration_minutes: 30, tags: ["mole", "surgery"] },
      { name: "Eczema/Psoriasis Treatment", description: "Treatment for chronic skin conditions", base_price_model: "fixed", fixed_price_cents: 15000, duration_minutes: 30, tags: ["eczema", "psoriasis"] },
      { name: "Botox", description: "Cosmetic botox injections", base_price_model: "starting_at", starting_price_cents: 30000, duration_minutes: 30, tags: ["botox", "cosmetic"] },
      { name: "Chemical Peel", description: "Skin resurfacing treatment", base_price_model: "starting_at", starting_price_cents: 15000, duration_minutes: 45, tags: ["peel", "cosmetic"] },
    ],
    required_questions: [
      { intent: "booking", key: "concern", label: "Concern", ask_prompt: "What skin concern brings you in - acne, rash, moles, aging, or something else?", why_needed: "Prepares for visit", required: true },
      { intent: "booking", key: "new_patient", label: "New Patient", ask_prompt: "Have you been to our office before?", why_needed: "Determines appointment type", required: true },
      { intent: "booking", key: "medical_cosmetic", label: "Visit Type", ask_prompt: "Is this for a medical concern or cosmetic treatment?", why_needed: "Routes to correct provider", required: true },
      { intent: "booking", key: "insurance", label: "Insurance", ask_prompt: "Do you have health insurance? Note: cosmetic treatments aren't covered.", why_needed: "Billing preparation", required: false },
    ],
    policies: [
      { type: "cancellation", text: "Please provide 24 hours notice for cancellations." },
      { type: "deposit", text: "Cosmetic procedures may require a deposit." },
      { type: "payment", text: "Medical visits may be covered by insurance. Cosmetic services are due at time of service." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do you accept insurance?", answer: "Yes for medical dermatology. Cosmetic treatments like Botox are not covered by insurance." },
      { question: "How often should I get a skin check?", answer: "We recommend annual skin cancer screenings, more often if you have risk factors." },
      { question: "What's the difference between medical and cosmetic?", answer: "Medical treats skin conditions and diseases. Cosmetic focuses on appearance improvements." },
      { question: "Do you treat all ages?", answer: "Yes, we see patients of all ages for skin concerns." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "zips", radius_miles: null, restrictions: { no_cross_state_lines: false }, notes: "Visit our dermatology practice." },
    scheduling_defaults: { lead_time_hours: 24, buffer_minutes: 10, default_slot_duration_minutes: 30 },
  },
};

const massageTherapyTemplate: IndustryTemplate = {
  industry_key: "massage",
  name: "Massage Therapy",
  icon: "💆",
  business_mode: "medical",
  defaults: {
    services: [
      { name: "Swedish Massage (60 min)", description: "Relaxation massage with light to medium pressure", base_price_model: "fixed", fixed_price_cents: 9500, duration_minutes: 60, tags: ["swedish", "relaxation"] },
      { name: "Swedish Massage (90 min)", description: "Extended relaxation massage", base_price_model: "fixed", fixed_price_cents: 13000, duration_minutes: 90, tags: ["swedish", "relaxation"] },
      { name: "Deep Tissue (60 min)", description: "Therapeutic massage for muscle tension", base_price_model: "fixed", fixed_price_cents: 11000, duration_minutes: 60, tags: ["deep tissue", "therapeutic"] },
      { name: "Deep Tissue (90 min)", description: "Extended therapeutic massage", base_price_model: "fixed", fixed_price_cents: 15000, duration_minutes: 90, tags: ["deep tissue", "therapeutic"] },
      { name: "Sports Massage", description: "Focused on athletic performance and recovery", base_price_model: "fixed", fixed_price_cents: 11000, duration_minutes: 60, tags: ["sports", "athletic"] },
      { name: "Prenatal Massage", description: "Safe, gentle massage for expecting mothers", base_price_model: "fixed", fixed_price_cents: 10000, duration_minutes: 60, tags: ["prenatal", "pregnancy"] },
      { name: "Hot Stone Massage", description: "Heated stones for deep relaxation", base_price_model: "fixed", fixed_price_cents: 12500, duration_minutes: 75, tags: ["hot stone", "relaxation"] },
      { name: "Couples Massage", description: "Side-by-side massage for two", base_price_model: "fixed", fixed_price_cents: 19000, duration_minutes: 60, tags: ["couples"] },
    ],
    required_questions: [
      { intent: "booking", key: "massage_type", label: "Massage Type", ask_prompt: "What type of massage are you looking for - relaxation, deep tissue, or something specific?", why_needed: "Matches with right therapist", required: true },
      { intent: "booking", key: "duration", label: "Duration", ask_prompt: "Would you like a 60-minute or 90-minute session?", why_needed: "Scheduling", required: true },
      { intent: "booking", key: "pressure", label: "Pressure Preference", ask_prompt: "Do you prefer light, medium, or firm pressure?", why_needed: "Personalizes treatment", required: false },
      { intent: "booking", key: "focus_areas", label: "Focus Areas", ask_prompt: "Are there any areas you'd like us to focus on - neck, back, shoulders?", why_needed: "Treatment planning", required: false },
    ],
    policies: [
      { type: "cancellation", text: "Please provide 24 hours notice. Late cancellations are charged 50% of service." },
      { type: "deposit", text: "No deposit required for individual appointments." },
      { type: "payment", text: "Payment is due after your session. Gratuity is appreciated but not required." },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Should I undress completely?", answer: "Undress to your comfort level. You'll be draped throughout the massage for privacy." },
      { question: "Can I request a specific therapist?", answer: "Yes! Let us know your preference when booking." },
      { question: "How often should I get a massage?", answer: "For general wellness, monthly. For chronic pain or stress, every 2-3 weeks may help." },
      { question: "Do you accept insurance?", answer: "Some insurance plans cover massage with a prescription. We can provide receipts for reimbursement." },
    ],
    objections: commonObjections,
    service_area_defaults: { mode: "zips", radius_miles: null, restrictions: { no_cross_state_lines: false }, notes: "Visit our massage therapy studio." },
    scheduling_defaults: { lead_time_hours: 4, buffer_minutes: 15, default_slot_duration_minutes: 60 },
  },
};

// ============================================================================
// TEMPLATE REGISTRY
// ============================================================================

// ============================================================================
// SALES TEMPLATES
// ============================================================================

const carDealershipTemplate: IndustryTemplate = {
  industry_key: "car_dealership",
  name: "Car Dealership",
  icon: "🚗",
  business_mode: "sales",
  defaults: {
    services: [
      {
        name: "Test Drive",
        description: "Schedule a test drive with your preferred vehicle",
        base_price_model: "quote_only",
        duration_minutes: 45,
        tags: ["test_drive", "sales"],
      },
      {
        name: "Showroom Visit",
        description: "Browse inventory with a sales associate",
        base_price_model: "quote_only",
        duration_minutes: 60,
        tags: ["showroom", "sales"],
      },
      {
        name: "Finance Consultation",
        description: "Discuss financing, trade-in, and payment options",
        base_price_model: "quote_only",
        duration_minutes: 45,
        tags: ["finance", "consultation"],
      },
      {
        name: "Vehicle Appraisal",
        description: "Get your trade-in valued by our team",
        base_price_model: "quote_only",
        duration_minutes: 30,
        tags: ["trade_in", "appraisal"],
      },
    ],
    required_questions: [
      {
        intent: "booking",
        key: "vehicle_interest",
        label: "Vehicle Interest",
        ask_prompt: "What type of vehicle are you looking for?",
        why_needed: "So we can have the right vehicles ready for you",
        required: true,
      },
      {
        intent: "booking",
        key: "budget_range",
        label: "Budget Range",
        ask_prompt: "Do you have a budget range in mind?",
        why_needed: "To match you with the right options",
        required: false,
      },
      {
        intent: "booking",
        key: "trade_in",
        label: "Trade-In",
        ask_prompt: "Will you have a trade-in?",
        why_needed: "We can have appraisal ready when you arrive",
        required: false,
      },
    ],
    policies: [
      { type: "cancellation", text: "Appointments can be rescheduled at any time. We appreciate 2 hours notice." },
      { type: "deposit", text: "No deposit required for test drives or showroom visits." },
      { type: "payment", text: "We accept cash, financing, certified checks, and all major credit cards." },
    ],
    faqs: [
      { question: "Do you offer financing?", answer: "Yes! We work with multiple lenders to get you the best rate. Our finance team can walk you through all your options." },
      { question: "Can I trade in my car?", answer: "Absolutely! We accept trade-ins. Bring your vehicle and we'll give you a fair market appraisal." },
      { question: "Do you have certified pre-owned vehicles?", answer: "Yes, we carry certified pre-owned inventory that comes with extended warranties." },
      { question: "What do I need to bring for a test drive?", answer: "Just bring a valid driver's license. If you're thinking about financing, bring proof of income and insurance." },
      ...commonFAQs,
    ],
    objections: [
      { objection: "The price is too high", response: "I understand. We want to work with you on this. Our finance team has multiple options that can make this work within your budget — would you like to sit down with them?" },
      { objection: "I need to talk to my spouse", response: "Of course — that's a big decision. Would it help if we put together a quote you can take home and review together?" },
      { objection: "I'm just looking", response: "No pressure at all! Would you like me to take your info so we can let you know about any specials on the models you're interested in?" },
      ...commonObjections,
    ],
    service_area_defaults: {
      mode: "radius",
      radius_miles: 50,
      restrictions: { no_cross_state_lines: false },
      notes: "We deliver vehicles within 50 miles.",
    },
    scheduling_defaults: {
      lead_time_hours: 1,
      buffer_minutes: 15,
      default_slot_duration_minutes: 45,
      hours: {
        monday: { open: "09:00", close: "20:00" },
        tuesday: { open: "09:00", close: "20:00" },
        wednesday: { open: "09:00", close: "20:00" },
        thursday: { open: "09:00", close: "20:00" },
        friday: { open: "09:00", close: "20:00" },
        saturday: { open: "09:00", close: "18:00" },
        sunday: { open: "11:00", close: "17:00" },
      },
    },
  },
};

const realEstateTemplate: IndustryTemplate = {
  industry_key: "real_estate",
  name: "Real Estate Agency",
  icon: "🏠",
  business_mode: "sales",
  defaults: {
    services: [
      {
        name: "Property Showing",
        description: "Schedule a showing for a listed property",
        base_price_model: "quote_only",
        duration_minutes: 30,
        tags: ["showing", "sales"],
      },
      {
        name: "Buyer Consultation",
        description: "Meet with an agent to discuss your home search",
        base_price_model: "quote_only",
        duration_minutes: 60,
        tags: ["consultation", "buyer"],
      },
      {
        name: "Listing Consultation",
        description: "Free consultation to discuss selling your home",
        base_price_model: "quote_only",
        duration_minutes: 60,
        tags: ["consultation", "seller"],
      },
      {
        name: "Market Analysis",
        description: "Comparative market analysis of your property",
        base_price_model: "quote_only",
        duration_minutes: 45,
        tags: ["analysis", "seller"],
      },
    ],
    required_questions: [
      {
        intent: "booking",
        key: "interest_type",
        label: "Buying or Selling",
        ask_prompt: "Are you looking to buy, sell, or both?",
        why_needed: "To connect you with the right specialist",
        required: true,
      },
      {
        intent: "booking",
        key: "area_preference",
        label: "Area Preference",
        ask_prompt: "What area are you interested in?",
        why_needed: "To match you with an agent who knows the area",
        required: false,
      },
    ],
    policies: [
      { type: "cancellation", text: "Showings can be cancelled or rescheduled up to 2 hours before." },
      { type: "payment", text: "No upfront costs for buyers. Seller commissions discussed during listing consultation." },
    ],
    faqs: [
      { question: "How much do your services cost?", answer: "Our buyer services are completely free — we're paid by the seller at closing. For sellers, we'll discuss our competitive commission structure during your consultation." },
      { question: "How long does it take to sell a home?", answer: "It depends on the market, but most homes in our area sell within 30-60 days. We'll give you a realistic timeline during your consultation." },
      ...commonFAQs,
    ],
    objections: [
      { objection: "I already have an agent", response: "That's great! If you ever want a second opinion or aren't fully satisfied, we'd be happy to help." },
      { objection: "I want to sell by owner", response: "I completely respect that. If you ever decide you want professional help with marketing, negotiations, or paperwork, we're here." },
      ...commonObjections,
    ],
    service_area_defaults: {
      mode: "radius",
      radius_miles: 30,
      restrictions: { no_cross_state_lines: false },
      notes: "Service area covers local market.",
    },
    scheduling_defaults: {
      lead_time_hours: 2,
      buffer_minutes: 15,
      default_slot_duration_minutes: 30,
    },
  },
};

const insuranceAgencyTemplate: IndustryTemplate = {
  industry_key: "insurance",
  name: "Insurance Agency",
  icon: "🛡️",
  business_mode: "sales",
  defaults: {
    services: [
      {
        name: "Insurance Quote",
        description: "Get a free quote for auto, home, or life insurance",
        base_price_model: "quote_only",
        duration_minutes: 30,
        tags: ["quote", "consultation"],
      },
      {
        name: "Policy Review",
        description: "Review your current coverage with an agent",
        base_price_model: "quote_only",
        duration_minutes: 45,
        tags: ["review", "consultation"],
      },
      {
        name: "Claims Assistance",
        description: "Help filing or checking on an insurance claim",
        base_price_model: "quote_only",
        duration_minutes: 30,
        tags: ["claims", "service"],
      },
    ],
    required_questions: [
      {
        intent: "booking",
        key: "insurance_type",
        label: "Type of Insurance",
        ask_prompt: "What type of insurance are you looking for?",
        why_needed: "To connect you with the right specialist",
        required: true,
      },
    ],
    policies: [
      { type: "cancellation", text: "Appointments can be rescheduled anytime." },
    ],
    faqs: [
      { question: "Do you offer free quotes?", answer: "Absolutely! All our quotes are free with no obligation." },
      { question: "What insurance do you carry?", answer: "We offer auto, home, renters, life, commercial, and umbrella policies from multiple top carriers." },
      ...commonFAQs,
    ],
    objections: [
      { objection: "I already have insurance", response: "That's great! Many of our clients save significantly when we compare rates. A free quote takes just a few minutes." },
      ...commonObjections,
    ],
    service_area_defaults: {
      mode: "radius",
      radius_miles: 50,
      restrictions: { no_cross_state_lines: true },
      notes: "Licensed in state.",
    },
    scheduling_defaults: {
      lead_time_hours: 1,
      buffer_minutes: 10,
      default_slot_duration_minutes: 30,
    },
  },
};

// ============================================================================
// GENERAL TEMPLATES
// ============================================================================

const consultingTemplate: IndustryTemplate = {
  industry_key: "consulting",
  name: "Consulting Firm",
  icon: "💼",
  business_mode: "general",
  defaults: {
    services: [
      {
        name: "Discovery Call",
        description: "Free introductory call to discuss your needs",
        base_price_model: "quote_only",
        duration_minutes: 30,
        tags: ["consultation", "discovery"],
      },
      {
        name: "Strategy Session",
        description: "In-depth strategic planning session",
        base_price_model: "starting_at",
        starting_price_cents: 25000,
        duration_minutes: 90,
        tags: ["strategy", "planning"],
      },
      {
        name: "Retainer Engagement",
        description: "Ongoing consulting support",
        base_price_model: "quote_only",
        duration_minutes: 60,
        tags: ["retainer", "ongoing"],
      },
    ],
    required_questions: [
      {
        intent: "callback",
        key: "business_challenge",
        label: "Business Challenge",
        ask_prompt: "What's the main challenge you're looking to solve?",
        why_needed: "To prepare the right expertise for your call",
        required: true,
      },
    ],
    policies: [
      { type: "cancellation", text: "24-hour cancellation policy for scheduled sessions." },
      { type: "refund", text: "If you're not satisfied after the first session, we'll refund your investment." },
    ],
    faqs: [
      { question: "What industries do you work with?", answer: "We work across multiple industries. We'll match you with a consultant who has experience in your specific field." },
      { question: "How much does consulting cost?", answer: "Our discovery call is free. After that, we'll provide a custom proposal based on your specific needs." },
      ...commonFAQs,
    ],
    objections: commonObjections,
    service_area_defaults: {
      mode: "radius",
      radius_miles: 100,
      restrictions: { no_cross_state_lines: false },
      notes: "Remote consultations available nationwide.",
    },
    scheduling_defaults: {
      lead_time_hours: 4,
      buffer_minutes: 15,
      default_slot_duration_minutes: 30,
    },
  },
};

const coachingTemplate: IndustryTemplate = {
  industry_key: "coaching",
  name: "Coaching / Training",
  icon: "🎯",
  business_mode: "general",
  defaults: {
    services: [
      {
        name: "Free Consultation",
        description: "30-minute intro call to see if we're a good fit",
        base_price_model: "quote_only",
        duration_minutes: 30,
        tags: ["consultation", "free"],
      },
      {
        name: "1-on-1 Coaching Session",
        description: "Personal coaching session focused on your goals",
        base_price_model: "fixed",
        fixed_price_cents: 15000,
        duration_minutes: 60,
        tags: ["coaching", "individual"],
      },
      {
        name: "Group Workshop",
        description: "Small group workshop or training session",
        base_price_model: "starting_at",
        starting_price_cents: 5000,
        duration_minutes: 120,
        tags: ["workshop", "group"],
      },
    ],
    required_questions: [
      {
        intent: "callback",
        key: "goal",
        label: "Goal",
        ask_prompt: "What's the main goal you'd like to work on?",
        why_needed: "To prepare for your consultation",
        required: true,
      },
    ],
    policies: [
      { type: "cancellation", text: "24-hour cancellation policy. Rescheduling is always welcome." },
    ],
    faqs: [
      { question: "How does coaching work?", answer: "We start with a free consultation to understand your goals, then create a personalized plan. Sessions are typically weekly." },
      ...commonFAQs,
    ],
    objections: commonObjections,
    service_area_defaults: {
      mode: "radius",
      radius_miles: 100,
      restrictions: { no_cross_state_lines: false },
      notes: "Virtual sessions available.",
    },
    scheduling_defaults: {
      lead_time_hours: 4,
      buffer_minutes: 15,
      default_slot_duration_minutes: 30,
    },
  },
};

const genericSalesTemplate: IndustryTemplate = {
  industry_key: "generic_sales",
  name: "Sales Business",
  icon: "📊",
  business_mode: "sales",
  defaults: {
    services: [
      {
        name: "Sales Consultation",
        description: "Meet with our team to discuss your needs",
        base_price_model: "quote_only",
        duration_minutes: 45,
        tags: ["consultation", "sales"],
      },
      {
        name: "Product Demo",
        description: "See our products in person or virtually",
        base_price_model: "quote_only",
        duration_minutes: 30,
        tags: ["demo", "sales"],
      },
    ],
    required_questions: [
      {
        intent: "booking",
        key: "interest",
        label: "Interest",
        ask_prompt: "What are you interested in?",
        why_needed: "To prepare the right information for you",
        required: true,
      },
    ],
    policies: [
      { type: "cancellation", text: "Appointments can be rescheduled at any time." },
    ],
    faqs: commonFAQs,
    objections: commonObjections,
    service_area_defaults: {
      mode: "radius",
      radius_miles: 50,
      restrictions: { no_cross_state_lines: false },
      notes: "Adjust based on your service area.",
    },
    scheduling_defaults: {
      lead_time_hours: 1,
      buffer_minutes: 15,
      default_slot_duration_minutes: 45,
    },
  },
};

const genericGeneralTemplate: IndustryTemplate = {
  industry_key: "generic_general",
  name: "General Business",
  icon: "🏢",
  business_mode: "general",
  defaults: {
    services: [
      {
        name: "Initial Consultation",
        description: "Free introductory consultation",
        base_price_model: "quote_only",
        duration_minutes: 30,
        tags: ["consultation"],
      },
      {
        name: "Standard Service",
        description: "Our standard service offering",
        base_price_model: "quote_only",
        duration_minutes: 60,
        tags: ["standard"],
      },
    ],
    required_questions: [
      {
        intent: "callback",
        key: "reason_for_call",
        label: "Reason for Call",
        ask_prompt: "How can we help you today?",
        why_needed: "To connect you with the right person",
        required: true,
      },
    ],
    policies: [
      { type: "cancellation", text: "Please provide 24 hours notice for cancellations." },
    ],
    faqs: commonFAQs,
    objections: commonObjections,
    service_area_defaults: {
      mode: "radius",
      radius_miles: 25,
      restrictions: { no_cross_state_lines: false },
      notes: "Adjust based on your business.",
    },
    scheduling_defaults: {
      lead_time_hours: 2,
      buffer_minutes: 15,
      default_slot_duration_minutes: 30,
    },
  },
};

// ============================================================================
// REGISTRY
// ============================================================================

export const industryTemplates: Record<string, IndustryTemplate> = {
  // Service templates (10)
  detailing: detailingTemplate,
  plumbing: plumbingTemplate,
  hvac: hvacTemplate,
  electrical: electricalTemplate,
  cleaning: cleaningTemplate,
  landscaping: landscapingTemplate,
  pest_control: pestControlTemplate,
  roofing: roofingTemplate,
  pool_service: poolServiceTemplate,
  salon: salonTemplate,
  // Dispatch templates (14)
  towing: towingTemplate,
  locksmith: locksmithTemplate,
  courier: courierTemplate,
  mobile_mechanic: mobileMechanicTemplate,
  limo: limoTemplate,
  medical_transport: medicalTransportTemplate,
  junk_removal: junkRemovalTemplate,
  moving: movingTemplate,
  pet_grooming: petGroomingMobileTemplate,
  restoration: restorationTemplate,
  tree_service: treeServiceTemplate,
  septic: septicTemplate,
  notary: notaryTemplate,
  security: securityPatrolTemplate,
  // Food templates (6)
  food: foodTemplate,
  pizza: pizzaTemplate,
  bakery: bakeryTemplate,
  food_truck: foodTruckTemplate,
  bar: barTemplate,
  catering: cateringTemplate,
  // Medical templates (9)
  medical: medicalTemplate,
  medspa: medicalTemplate, // Alias
  dental: dentalTemplate,
  chiropractic: chiropracticTemplate,
  optometry: optometryTemplate,
  physical_therapy: physicalTherapyTemplate,
  veterinary: veterinaryTemplate,
  mental_health: mentalHealthTemplate,
  dermatology: dermatologyTemplate,
  massage: massageTherapyTemplate,
  // Sales templates (4)
  car_dealership: carDealershipTemplate,
  real_estate: realEstateTemplate,
  insurance: insuranceAgencyTemplate,
  generic_sales: genericSalesTemplate,
  // General templates (3)
  consulting: consultingTemplate,
  coaching: coachingTemplate,
  generic_general: genericGeneralTemplate,
  // Fallback
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
  if (normalizedKey.includes("dealer") || normalizedKey.includes("car"))
    return industryTemplates.car_dealership;
  if (normalizedKey.includes("realestate") || normalizedKey.includes("realtor"))
    return industryTemplates.real_estate;
  if (normalizedKey.includes("insurance"))
    return industryTemplates.insurance;
  if (normalizedKey.includes("consult"))
    return industryTemplates.consulting;
  if (normalizedKey.includes("coach"))
    return industryTemplates.coaching;

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

/**
 * Get template options filtered by business mode
 * Only shows templates relevant to the user's business type
 */
export function getTemplateOptionsForMode(
  businessMode: string
): Array<{ value: string; label: string; icon: string }> {
  const modeTemplateMap: Record<string, string[]> = {
    food: ["food", "pizza", "bakery", "food_truck", "bar", "catering"],
    medical: ["medical", "dental", "chiropractic", "optometry", "physical_therapy", "veterinary", "mental_health", "dermatology", "massage"],
    dispatch: ["towing", "locksmith", "courier", "mobile_mechanic", "limo", "medical_transport", "junk_removal", "moving", "pet_grooming", "restoration", "tree_service", "septic", "notary", "security"],
    service: ["detailing", "plumbing", "hvac", "electrical", "cleaning", "landscaping", "pest_control", "roofing", "pool_service", "salon"],
    sales: ["car_dealership", "real_estate", "insurance", "generic_sales"],
    general: [
      // Service (10)
      "detailing", "plumbing", "hvac", "electrical", "cleaning", "landscaping", "pest_control", "roofing", "pool_service", "salon",
      // Dispatch (14)
      "towing", "locksmith", "courier", "mobile_mechanic", "limo", "medical_transport", "junk_removal", "moving", "pet_grooming", "restoration", "tree_service", "septic", "notary", "security",
      // Food (6)
      "food", "pizza", "bakery", "food_truck", "bar", "catering",
      // Medical (9)
      "medical", "dental", "chiropractic", "optometry", "physical_therapy", "veterinary", "mental_health", "dermatology", "massage",
      // Sales (4)
      "car_dealership", "real_estate", "insurance", "generic_sales",
      // General (3)
      "consulting", "coaching", "generic_general",
      // Fallback
      "other",
    ],
  };

  const allowedKeys = modeTemplateMap[businessMode] || modeTemplateMap.general;

  return Object.values(industryTemplates)
    .filter((t) => allowedKeys.includes(t.industry_key))
    .filter((t, i, arr) => arr.findIndex((x) => x.industry_key === t.industry_key) === i) // Dedupe aliases
    .map((t) => ({
      value: t.industry_key,
      label: t.name,
      icon: t.icon,
    }));
}
