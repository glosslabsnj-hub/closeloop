/**
 * Industry-aware examples and placeholder text for Business Brain components
 * Centralizes all industry-specific UI content for consistency
 */

import type { BusinessMode } from "@/hooks/useTenantConfig";

/**
 * Service/Offering examples by business mode
 */
export interface ServiceExamples {
  serviceName: string;
  serviceNamePlaceholder: string;
  descriptionPlaceholder: string;
  durationHint: string;
  priceExamples: string;
}

export const SERVICE_EXAMPLES: Record<BusinessMode, ServiceExamples> = {
  service: {
    serviceName: "service",
    serviceNamePlaceholder: "Haircut, Oil Change, Deep Cleaning, etc.",
    descriptionPlaceholder: "What's included in this service...",
    durationHint: "Helps AI suggest realistic timeframes",
    priceExamples: "Example: Full Detail - $150, Starting at $99",
  },
  dispatch: {
    serviceName: "service",
    serviceNamePlaceholder: "Local Tow, Jump Start, Lockout, Tire Change, etc.",
    descriptionPlaceholder: "What's included and any special requirements...",
    durationHint: "Average time to complete this job",
    priceExamples: "Example: Local Tow - $85, Long Distance - $150 base + $3.50/mi",
  },
  food: {
    serviceName: "menu item",
    serviceNamePlaceholder: "Margherita Pizza, Chicken Alfredo, Caesar Salad, etc.",
    descriptionPlaceholder: "Ingredients, portion size, what it comes with...",
    durationHint: "Prep time for this item",
    priceExamples: "Example: Large Pizza - $18.99, Combo Meal - $12.99",
  },
  medical: {
    serviceName: "service",
    serviceNamePlaceholder: "Initial Consultation, Follow-Up, Botox, Chemical Peel, etc.",
    descriptionPlaceholder: "What's included in this procedure or visit...",
    durationHint: "Typical appointment length",
    priceExamples: "Example: Consultation - $150, Botox - Starting at $12/unit",
  },
  general: {
    serviceName: "offering",
    serviceNamePlaceholder: "Consultation, Basic Package, Premium Service, etc.",
    descriptionPlaceholder: "What's included in this offering...",
    durationHint: "How long this typically takes",
    priceExamples: "Example: Basic - $99, Premium - $199",
  },
  sales: {
    serviceName: "product",
    serviceNamePlaceholder: "New Sedan, Used SUV, Solar Panel Package, 3-Bed Home, etc.",
    descriptionPlaceholder: "Key features, specs, and selling points...",
    durationHint: "Average appointment or demo length",
    priceExamples: "Example: Starting at $25,000, From $199/mo with financing",
  },
};

/**
 * Objection handling examples by business mode
 */
export interface ObjectionExamples {
  objectionPlaceholder: string;
  responsePlaceholder: string;
  commonObjections: Array<{ objection: string; response: string }>;
}

export const OBJECTION_EXAMPLES: Record<BusinessMode, ObjectionExamples> = {
  service: {
    objectionPlaceholder: "e.g., That's too expensive",
    responsePlaceholder: "I understand. We use premium products and our work is guaranteed...",
    commonObjections: [
      { objection: "That's too expensive", response: "I understand budget is a concern. Our pricing reflects the quality of our work and materials. We also offer payment plans if that helps." },
      { objection: "I'll call you back", response: "No problem! Just so you know, our schedule fills up quickly. Would you like me to pencil in a time that works for you?" },
      { objection: "I need to think about it", response: "Of course, take your time. Is there anything specific I can help clarify to make your decision easier?" },
    ],
  },
  dispatch: {
    objectionPlaceholder: "e.g., That's more than the other company quoted",
    responsePlaceholder: "I understand. We're fully licensed and insured, and our drivers are background-checked...",
    commonObjections: [
      { objection: "That's more than the other company quoted", response: "I hear you. We're licensed, insured, and our drivers are background-checked. Our price is all-in with no surprise fees when we arrive." },
      { objection: "How long is the wait?", response: "I understand you need help fast. We're dispatching the closest available driver and I'll give you an exact ETA once they're assigned." },
      { objection: "Can you match AAA's rate?", response: "We work with most roadside programs. If you have AAA, we can try to bill them directly. What's your member number?" },
    ],
  },
  food: {
    objectionPlaceholder: "e.g., The delivery takes too long",
    responsePlaceholder: "I apologize for the wait. We're preparing everything fresh to order...",
    commonObjections: [
      { objection: "The delivery takes too long", response: "I understand, and I apologize. We make everything fresh to order. I can put a rush on it and have it to you as fast as possible." },
      { objection: "That's expensive for delivery", response: "Our delivery fee helps us pay our drivers fairly and keep food prices reasonable. We also have a pickup option with no fee." },
      { objection: "Do you have any specials?", response: "Great question! Let me tell you about today's specials..." },
    ],
  },
  medical: {
    objectionPlaceholder: "e.g., Do you take my insurance?",
    responsePlaceholder: "We work with most major insurance providers. Can you tell me your plan so I can verify coverage?",
    commonObjections: [
      { objection: "Do you take my insurance?", response: "We accept most major insurance plans. Can you give me your insurance info so I can verify your coverage before your appointment?" },
      { objection: "The wait time is too long", response: "I understand, and I apologize for the wait. Would you like me to check for an earlier cancellation or put you on our priority list?" },
      { objection: "That's expensive without insurance", response: "I understand. We do offer payment plans and can discuss self-pay options. Many patients find our care is worth the investment." },
    ],
  },
  general: {
    objectionPlaceholder: "e.g., That's too expensive",
    responsePlaceholder: "I understand. Let me explain what's included and why it's a good value...",
    commonObjections: [
      { objection: "That's too expensive", response: "I understand budget is a concern. Let me explain what's included and the value you're getting." },
      { objection: "I need to think about it", response: "Of course, take your time. Is there anything I can clarify that would help with your decision?" },
      { objection: "I'll call you back", response: "No problem! Is there a specific time I should expect your call, or would you like me to follow up with you?" },
    ],
  },
  sales: {
    objectionPlaceholder: "e.g., I'm just looking / I can get it cheaper elsewhere",
    responsePlaceholder: "I completely understand. Let me share what sets us apart and how we can work within your budget...",
    commonObjections: [
      { objection: "I'm just looking", response: "No pressure at all! Let me know what you're interested in and I can share some options. Would you like to come in for a closer look?" },
      { objection: "I can get it cheaper elsewhere", response: "I appreciate you doing your research. We're competitive on price, and we also include warranty coverage and financing options that add real value. Would you like me to put together a detailed comparison?" },
      { objection: "I need to talk to my spouse", response: "Absolutely, that's a big decision! Would it help to schedule a time when you can both come in together? I can have everything ready for you." },
    ],
  },
};

/**
 * Business profile placeholder examples by mode
 */
export interface ProfileExamples {
  businessNamePlaceholder: string;
  taglinePlaceholder: string;
  taglineHint: string;
}

export const PROFILE_EXAMPLES: Record<BusinessMode, ProfileExamples> = {
  service: {
    businessNamePlaceholder: "Acme Plumbing, Elite Detailing, Sunrise Cleaning",
    taglinePlaceholder: "Fast, reliable service since 2010",
    taglineHint: "Example: \"Licensed & insured pros\" or \"Same-day appointments available\"",
  },
  dispatch: {
    businessNamePlaceholder: "FastTow 24/7, Reliable Roadside, City Towing",
    taglinePlaceholder: "Fast response, fair prices, 24/7",
    taglineHint: "Example: \"Average 30 min response\" or \"Licensed, insured, background-checked\"",
  },
  food: {
    businessNamePlaceholder: "Bella's Pizza, Golden Dragon, Fresh Kitchen",
    taglinePlaceholder: "Fresh, made-to-order food",
    taglineHint: "Example: \"Family recipes since 1985\" or \"Fresh ingredients, fast delivery\"",
  },
  medical: {
    businessNamePlaceholder: "Greenview Family Practice, Radiance Med Spa",
    taglinePlaceholder: "Compassionate care you can trust",
    taglineHint: "Example: \"Board-certified specialists\" or \"Accepting new patients\"",
  },
  general: {
    businessNamePlaceholder: "Your Business Name",
    taglinePlaceholder: "What makes you unique",
    taglineHint: "Example: \"Trusted by 1000+ customers\" or \"Fast, friendly service\"",
  },
  sales: {
    businessNamePlaceholder: "Prestige Auto Group, Summit Realty, SolarEdge Installers",
    taglinePlaceholder: "Largest selection, best prices, trusted since 2005",
    taglineHint: "Example: \"Over 200 vehicles in stock\" or \"Your trusted local dealer\"",
  },
};

// ---------------------------------------------------------------------------
// Slug-specific overrides (highest priority)
// ---------------------------------------------------------------------------

const SLUG_SERVICE_OVERRIDES: Record<string, Partial<ServiceExamples>> = {
  "hair-salon": {
    serviceName: "service",
    serviceNamePlaceholder: "Women's Cut, Balayage, Keratin Treatment, Blowout",
    descriptionPlaceholder: "What's included — products used, estimated time, aftercare...",
    priceExamples: "Example: Women's Cut - $65, Balayage - Starting at $180",
  },
  "barbershop": {
    serviceNamePlaceholder: "Classic Cut, Beard Trim, Hot Towel Shave, Kids' Cut",
    priceExamples: "Example: Classic Cut - $30, Beard Trim - $15",
  },
  "auto-repair": {
    serviceName: "service",
    serviceNamePlaceholder: "Oil Change, Brake Job, Diagnostic, Tire Rotation",
    descriptionPlaceholder: "What's included, parts/labor notes, warranty info...",
    priceExamples: "Example: Oil Change - $49.99, Brake Job - Starting at $199",
  },
  "auto-detailing": {
    serviceName: "package",
    serviceNamePlaceholder: "Exterior Wash, Interior Detail, Full Detail, Ceramic Coating",
    priceExamples: "Example: Full Detail - $150, Ceramic Coating - Starting at $500",
  },
  "plumbing": {
    serviceNamePlaceholder: "Drain Cleaning, Water Heater Repair, Pipe Repair, Leak Detection",
    descriptionPlaceholder: "What's included, any diagnostic fees, warranty...",
    durationHint: "Average time on site",
    priceExamples: "Example: Drain Cleaning - $175, Water Heater - Starting at $350",
  },
  "hvac": {
    serviceNamePlaceholder: "AC Tune-Up, Furnace Repair, Duct Cleaning, System Install",
    priceExamples: "Example: AC Tune-Up - $89, Furnace Repair - Starting at $199",
  },
  "dental": {
    serviceName: "procedure",
    serviceNamePlaceholder: "Cleaning & Exam, Filling, Crown, Teeth Whitening",
    descriptionPlaceholder: "What's involved, prep requirements, insurance coverage notes...",
    durationHint: "Typical appointment length",
    priceExamples: "Example: Cleaning - $150, Crown - Starting at $800",
  },
  "towing": {
    serviceNamePlaceholder: "Local Tow (0-10 mi), Flatbed, Lockout, Jump Start",
    priceExamples: "Example: Local Tow - $85, Flatbed - $150 base + $3.50/mi",
  },
  "pizza": {
    serviceName: "menu item",
    serviceNamePlaceholder: "Build Your Own Pizza, Specialty Pizza, Wings, Salads",
    priceExamples: "Example: Large Pizza - $18.99, Wings (12pc) - $14.99",
  },
};

/**
 * Get examples for the current business mode with fallback
 */
export function getServiceExamples(mode: BusinessMode): ServiceExamples {
  return SERVICE_EXAMPLES[mode] || SERVICE_EXAMPLES.general;
}

/**
 * Get slug-aware service examples.
 * Merges slug overrides on top of mode defaults.
 */
export function getSlugServiceExamples(mode: BusinessMode, slug: string): ServiceExamples {
  const base = getServiceExamples(mode);
  const overrides = SLUG_SERVICE_OVERRIDES[slug];
  if (!overrides) return base;
  return { ...base, ...overrides };
}

export function getObjectionExamples(mode: BusinessMode): ObjectionExamples {
  return OBJECTION_EXAMPLES[mode] || OBJECTION_EXAMPLES.general;
}

export function getProfileExamples(mode: BusinessMode): ProfileExamples {
  return PROFILE_EXAMPLES[mode] || PROFILE_EXAMPLES.general;
}

/**
 * Complexity hints by business mode — helps owners understand the toggle
 */
export const COMPLEXITY_HINTS: Record<BusinessMode, { simple: string; complex: string }> = {
  service: { simple: "Oil change, tire rotation, basic wash", complex: "Engine diagnostic, electrical, transmission" },
  dispatch: { simple: "Lockout, jump start, tire change", complex: "Heavy-duty tow, accident recovery, winch-out" },
  food: { simple: "Standard menu items", complex: "Custom catering, special dietary prep" },
  medical: { simple: "Follow-up, routine checkup", complex: "Initial consultation, procedure, surgery" },
  general: { simple: "Standard service, quick task", complex: "Custom project, assessment needed" },
  sales: { simple: "Standard product inquiry", complex: "Custom configuration, financing discussion" },
};

/**
 * Price factor placeholder hints by business mode
 */
export const PRICE_FACTOR_HINTS: Record<BusinessMode, string> = {
  service: "e.g., Vehicle type, material grade, job scope",
  dispatch: "e.g., Vehicle weight, distance, time of day, road conditions",
  food: "e.g., Portion size, add-ons, dietary substitutions",
  medical: "e.g., Treatment area, number of units, insurance",
  general: "e.g., Project scope, materials, timeline",
  sales: "e.g., Configuration, financing terms, add-on packages",
};
