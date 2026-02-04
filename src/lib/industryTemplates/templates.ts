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
// TEMPLATE REGISTRY
// ============================================================================

export const industryTemplates: Record<string, IndustryTemplate> = {
  // Service templates
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
  // Dispatch templates
  towing: towingTemplate,
  // Food templates
  food: foodTemplate,
  pizza: pizzaTemplate,
  bakery: bakeryTemplate,
  food_truck: foodTruckTemplate,
  bar: barTemplate,
  catering: cateringTemplate,
  // Medical templates
  medical: medicalTemplate,
  medspa: medicalTemplate, // Alias
  dental: dentalTemplate,
  chiropractic: chiropracticTemplate,
  // General
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

/**
 * Get template options filtered by business mode
 * Only shows templates relevant to the user's business type
 */
export function getTemplateOptionsForMode(
  businessMode: string
): Array<{ value: string; label: string; icon: string }> {
  const modeTemplateMap: Record<string, string[]> = {
    food: ["food", "pizza", "bakery", "food_truck", "bar", "catering"],
    medical: ["medical", "dental", "chiropractic"],
    dispatch: ["towing"],
    service: ["detailing", "plumbing", "hvac", "electrical", "cleaning", "landscaping", "pest_control", "roofing", "pool_service", "salon"],
    general: [
      // Service
      "detailing", "plumbing", "hvac", "electrical", "cleaning", "landscaping", "pest_control", "roofing", "pool_service", "salon",
      // Dispatch
      "towing",
      // Food
      "food", "pizza", "bakery", "food_truck", "bar", "catering",
      // Medical
      "medical", "dental", "chiropractic",
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
