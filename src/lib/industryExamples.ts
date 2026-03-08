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
    serviceNamePlaceholder: "e.g., Standard Service, Repair, Consultation",
    descriptionPlaceholder: "What's included in this service...",
    durationHint: "Helps AI suggest realistic timeframes",
    priceExamples: "Example: Standard Service - $150, Starting at $99",
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
    serviceNamePlaceholder: "AC Repair, Furnace Repair, AC Tune-Up, System Installation",
    descriptionPlaceholder: "What's included, parts/labor, any warranty...",
    priceExamples: "Example: AC Tune-Up - $99, AC Repair - Starting at $149, AC Install - Quote",
  },
  "electrical": {
    serviceNamePlaceholder: "Outlet Installation, Panel Upgrade, EV Charger Install, Wiring",
    descriptionPlaceholder: "What's included, permit handling, any warranty on parts/labor...",
    durationHint: "Typical time on site",
    priceExamples: "Example: Outlet Install - $150, EV Charger - Starting at $800, Panel Upgrade - Quote",
  },
  "roofing": {
    serviceNamePlaceholder: "Roof Inspection, Leak Repair, Shingle Replacement, Full Replacement",
    descriptionPlaceholder: "What's covered, materials used, any warranty...",
    priceExamples: "Example: Leak Repair - Starting at $350, Shingle Repair - Starting at $500",
  },
  "landscaping": {
    serviceNamePlaceholder: "Lawn Mowing, Mulching, Hedge Trimming, Landscape Design",
    descriptionPlaceholder: "What's included, frequency options, any materials...",
    priceExamples: "Example: Weekly Mowing - $65, Mulching - Starting at $150",
  },
  "painting": {
    serviceNamePlaceholder: "Interior Room, Exterior Painting, Cabinet Painting, Deck Staining",
    descriptionPlaceholder: "Coats included, prep work, materials provided...",
    priceExamples: "Example: Small Room - Starting at $300, Exterior - Quote",
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
  // aliases: industryCatalog uses underscore/full slugs
  "auto_detailing": {
    serviceName: "package",
    serviceNamePlaceholder: "Exterior Wash, Interior Detail, Full Detail, Ceramic Coating",
    priceExamples: "Example: Full Detail - $150, Ceramic Coating - Starting at $500",
  },
  // alias: industryCatalog uses underscore
  "auto_repair": {
    serviceName: "service",
    serviceNamePlaceholder: "Oil Change, Brake Job, Diagnostic, Tire Rotation",
    descriptionPlaceholder: "What's included, parts/labor notes, warranty info...",
    priceExamples: "Example: Oil Change - $49.99, Brake Job - Starting at $199",
  },
  "salon": {
    serviceName: "service",
    serviceNamePlaceholder: "Women's Cut, Balayage, Keratin Treatment, Blowout",
    descriptionPlaceholder: "What's included — products used, estimated time, aftercare...",
    priceExamples: "Example: Women's Cut - $65, Balayage - Starting at $180",
  },
  "pizzeria": {
    serviceName: "menu item",
    serviceNamePlaceholder: "Build Your Own Pizza, Specialty Pizza, Wings, Salads",
    priceExamples: "Example: Large Pizza - $18.99, Wings (12pc) - $14.99",
  },
  "pest_control": {
    serviceNamePlaceholder: "General Pest Treatment, Termite Inspection, Rodent Control, Bed Bug Treatment",
    descriptionPlaceholder: "Treatment method, areas covered, safety info, any guarantee...",
    priceExamples: "Example: General Treatment - $150, Quarterly Plan - $100/quarter",
  },
  "locksmith": {
    serviceNamePlaceholder: "Lockout Service, Lock Rekey, Lock Installation, Car Key Programming",
    descriptionPlaceholder: "What's included, response time, any guarantees...",
    priceExamples: "Example: Lockout - $85, Rekey - $75/lock, Car Key - Starting at $150",
  },
  "moving": {
    serviceNamePlaceholder: "Local Move, Long-Distance Move, Packing Services, Storage",
    descriptionPlaceholder: "What's included, truck size, number of movers, insurance coverage...",
    priceExamples: "Example: Local Move (2 movers) - $120/hr, Long-Distance - Quote",
  },
  "carpet_cleaning": {
    serviceNamePlaceholder: "Carpet Cleaning, Upholstery Cleaning, Area Rug, Stain Treatment",
    descriptionPlaceholder: "Method (steam/dry), rooms included, drying time...",
    priceExamples: "Example: 3-Room Carpet - $120, Upholstery Cleaning - Starting at $85",
  },
  "pool_service": {
    serviceNamePlaceholder: "Weekly Cleaning, Pool Opening, Pool Closing, Equipment Repair",
    descriptionPlaceholder: "What's included in the service, chemical treatment, equipment check...",
    priceExamples: "Example: Weekly Service - $125/visit, Pool Opening - $250",
  },
  "pressure_washing": {
    serviceNamePlaceholder: "Driveway Cleaning, House Wash, Deck Cleaning, Fence Cleaning",
    descriptionPlaceholder: "Area covered, hot/cold water, any pre-treatment or sealing included...",
    priceExamples: "Example: Driveway - $150+, House Wash - Starting at $300",
  },
  "tree_service": {
    serviceNamePlaceholder: "Tree Removal, Tree Trimming, Stump Grinding, Emergency Removal",
    descriptionPlaceholder: "What's included, debris cleanup, stump handling, any permit requirements...",
    priceExamples: "Example: Tree Trimming - Starting at $200, Stump Grinding - $100-300",
  },
  "junk_removal": {
    serviceName: "load type",
    serviceNamePlaceholder: "Single Item, Half Truck Load, Full Truck Load, Estate Cleanout",
    descriptionPlaceholder: "What's included, any recycling/donation, items you don't take...",
    priceExamples: "Example: Single Item - $75, Full Load - Starting at $350",
  },
  "garage_door": {
    serviceNamePlaceholder: "Door Repair, Spring Replacement, Opener Installation, Tune-Up",
    descriptionPlaceholder: "What's included, parts/labor, warranty on parts...",
    priceExamples: "Example: Spring Replace - $250, Opener Install - $300",
  },
  "appliance_repair": {
    serviceNamePlaceholder: "Washer Repair, Dryer Repair, Refrigerator Repair, Diagnostic",
    descriptionPlaceholder: "What's included, parts warranty, trip fee info...",
    priceExamples: "Example: Diagnostic - $89, Washer Repair - Starting at $150",
  },
  "cleaning": {
    serviceNamePlaceholder: "Standard Cleaning, Deep Cleaning, Move In/Out Cleaning, Office Cleaning",
    descriptionPlaceholder: "What's included (rooms/areas), products used, frequency options...",
    priceExamples: "Example: Standard Clean - Starting at $150, Deep Clean - Starting at $300",
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
 * Slug-specific overrides for business profile examples.
 * Provides industry-native placeholder examples so an electrician doesn't
 * see "Acme Plumbing" and a salon doesn't see "FastTow 24/7".
 */
const SLUG_PROFILE_OVERRIDES: Record<string, Partial<ProfileExamples>> = {
  "electrical": {
    businessNamePlaceholder: "Bright Spark Electric, Reliable Wiring Co., Power Pro Electrical",
    taglinePlaceholder: "Licensed electricians, fast and reliable",
    taglineHint: "Example: \"Same-day electrical service\" or \"Licensed, bonded, and insured\"",
  },
  "plumbing": {
    businessNamePlaceholder: "Flow Right Plumbing, Clear Drains Pro, Reliable Plumbers",
    taglinePlaceholder: "Fast plumbing service, 24/7 emergency calls",
    taglineHint: "Example: \"Same-day repairs available\" or \"Licensed & insured plumbers\"",
  },
  "hvac": {
    businessNamePlaceholder: "Cool Comfort HVAC, AirPro Services, Reliable Heating & Cooling",
    taglinePlaceholder: "Fast HVAC service, same-day repairs available",
    taglineHint: "Example: \"NATE-certified technicians\" or \"All major brands serviced\"",
  },
  "roofing": {
    businessNamePlaceholder: "Top Notch Roofing, StormGuard Roof, Premier Roofing Co.",
    taglinePlaceholder: "Quality roofing, honest estimates",
    taglineHint: "Example: \"Free inspections\" or \"30-year workmanship warranty\"",
  },
  "landscaping": {
    businessNamePlaceholder: "GreenScape Pros, Curb Appeal Landscaping, All Seasons Lawn",
    taglinePlaceholder: "Professional lawn care and landscaping",
    taglineHint: "Example: \"Weekly or bi-weekly service\" or \"Licensed & insured\"",
  },
  "cleaning": {
    businessNamePlaceholder: "Spotless Clean, Fresh Start Cleaning, Pristine Home Services",
    taglinePlaceholder: "Reliable, thorough home and office cleaning",
    taglineHint: "Example: \"Eco-friendly products\" or \"Background-checked cleaners\"",
  },
  "hair-salon": {
    businessNamePlaceholder: "Luxe Salon, The Hair Studio, Bliss Beauty Bar",
    taglinePlaceholder: "Where great hair happens",
    taglineHint: "Example: \"Expert colorists on staff\" or \"Walk-ins welcome\"",
  },
  // alias: industryCatalog uses "salon" slug
  "salon": {
    businessNamePlaceholder: "Luxe Salon, The Hair Studio, Bliss Beauty Bar",
    taglinePlaceholder: "Where great hair happens",
    taglineHint: "Example: \"Expert colorists on staff\" or \"Walk-ins welcome\"",
  },
  "barbershop": {
    businessNamePlaceholder: "Classic Cuts Barber, The Fade Shop, Main Street Barbers",
    taglinePlaceholder: "Great cuts, old school service",
    taglineHint: "Example: \"Walk-ins welcome\" or \"Licensed master barbers\"",
  },
  "auto-repair": {
    businessNamePlaceholder: "Reliable Auto Repair, Main Street Garage, TrustMech Auto",
    taglinePlaceholder: "Honest auto repair you can count on",
    taglineHint: "Example: \"ASE-certified technicians\" or \"All makes and models\"",
  },
  "dental": {
    businessNamePlaceholder: "Bright Smiles Dental, Family Dental Care, Modern Dental",
    taglinePlaceholder: "Comfortable, gentle dental care",
    taglineHint: "Example: \"Accepting new patients\" or \"Same-day emergency appointments\"",
  },
  "towing": {
    businessNamePlaceholder: "Quick Tow, City Towing & Recovery, FastResponse Roadside",
    taglinePlaceholder: "Fast response, fair prices, 24/7",
    taglineHint: "Example: \"Average 30-min response\" or \"Licensed & fully insured\"",
  },
  // alias
  "auto_repair": {
    businessNamePlaceholder: "Reliable Auto Repair, Main Street Garage, TrustMech Auto",
    taglinePlaceholder: "Honest auto repair you can count on",
    taglineHint: "Example: \"ASE-certified technicians\" or \"All makes and models\"",
  },
  "pest_control": {
    businessNamePlaceholder: "BugOut Pest Control, Shield Pest Solutions, SafeHome Exterminators",
    taglinePlaceholder: "Safe, effective pest control for your home and business",
    taglineHint: "Example: \"Pet-safe treatments\" or \"Guaranteed results\"",
  },
  "locksmith": {
    businessNamePlaceholder: "Rapid Lock & Key, TrustLock Locksmith, Precision Lock Service",
    taglinePlaceholder: "Fast, reliable locksmith service 24/7",
    taglineHint: "Example: \"15-min response\" or \"Licensed & bonded\"",
  },
  "moving": {
    businessNamePlaceholder: "Easy Move Pros, Smooth Movers, Metro Moving & Storage",
    taglinePlaceholder: "Stress-free moving, handled with care",
    taglineHint: "Example: \"Licensed & fully insured\" or \"Local & long-distance moves\"",
  },
  "carpet_cleaning": {
    businessNamePlaceholder: "SpotFree Carpet Care, CleanStep Services, FreshHome Carpet",
    taglinePlaceholder: "Deep clean carpets, fast drying, guaranteed results",
    taglineHint: "Example: \"Same-day service\" or \"Pet-safe cleaning solutions\"",
  },
  "pool_service": {
    businessNamePlaceholder: "Blue Wave Pool Service, Crystal Clear Pools, AquaCare Pool",
    taglinePlaceholder: "Keep your pool crystal clear all season",
    taglineHint: "Example: \"Weekly service contracts\" or \"Equipment repair & maintenance\"",
  },
  "pressure_washing": {
    businessNamePlaceholder: "Blast Clean Pro, Power Wash Experts, ShineBrite Services",
    taglinePlaceholder: "Professional pressure washing, results you can see",
    taglineHint: "Example: \"Insured & professional\" or \"Residential & commercial\"",
  },
  "tree_service": {
    businessNamePlaceholder: "Pro Tree Service, Green Summit Arborists, SafeTree Removal",
    taglinePlaceholder: "Professional tree care, safe removal, fast response",
    taglineHint: "Example: \"ISA-certified arborists\" or \"Emergency storm service\"",
  },
  "junk_removal": {
    businessNamePlaceholder: "Haul It Away, ClearSpace Junk Removal, 1-Load Junk",
    taglinePlaceholder: "Fast, affordable junk removal — we do all the heavy lifting",
    taglineHint: "Example: \"Same-day pickups available\" or \"We donate & recycle\"",
  },
  "garage_door": {
    businessNamePlaceholder: "DoorMaster, Quick Garage Door, Reliable Door & Opener",
    taglinePlaceholder: "Fast garage door service, same-day repairs",
    taglineHint: "Example: \"All makes & models\" or \"Emergency service available\"",
  },
  "appliance_repair": {
    businessNamePlaceholder: "Fix-It Appliance Repair, ProTech Appliances, TrustFix Services",
    taglinePlaceholder: "Fast appliance repair, all major brands",
    taglineHint: "Example: \"Same-day service\" or \"90-day parts warranty\"",
  },
};

/**
 * Get slug-aware business profile examples.
 * Merges slug overrides on top of mode defaults.
 */
export function getSlugProfileExamples(mode: BusinessMode, slug?: string | null): ProfileExamples {
  const base = getProfileExamples(mode);
  if (!slug) return base;
  const overrides = SLUG_PROFILE_OVERRIDES[slug];
  if (!overrides) return base;
  return { ...base, ...overrides };
}

/**
 * Complexity hints by business mode — helps owners understand the toggle
 */
export const COMPLEXITY_HINTS: Record<BusinessMode, { simple: string; complex: string }> = {
  service: { simple: "Routine maintenance, standard appointment", complex: "Custom project, on-site assessment needed" },
  dispatch: { simple: "Lockout, jump start, tire change", complex: "Heavy-duty tow, accident recovery, winch-out" },
  food: { simple: "Standard menu items", complex: "Custom catering, special dietary prep" },
  medical: { simple: "Follow-up, routine checkup", complex: "Initial consultation, procedure, surgery" },
  general: { simple: "Standard service, quick task", complex: "Custom project, assessment needed" },
  sales: { simple: "Standard product inquiry", complex: "Custom configuration, financing discussion" },
};

/**
 * Slug-specific complexity hint overrides
 */
export const SLUG_COMPLEXITY_OVERRIDES: Record<string, { simple: string; complex: string }> = {
  "hvac": { simple: "AC tune-up, filter change, thermostat install", complex: "Full system install, duct work, diagnostic" },
  "plumbing": { simple: "Drain cleaning, faucet repair, toilet fix", complex: "Pipe replacement, water heater, sewer line" },
  "auto-repair": { simple: "Oil change, tire rotation, brake pads", complex: "Engine diagnostic, electrical, transmission" },
  "auto-detailing": { simple: "Basic wash, interior vacuum, wax", complex: "Full detail, ceramic coating, paint correction" },
  "auto_detailing": { simple: "Basic wash, interior vacuum, wax", complex: "Full detail, ceramic coating, paint correction" },
  "hair-salon": { simple: "Cut, blowout, basic color", complex: "Balayage, extensions, keratin treatment" },
  "salon": { simple: "Cut, blowout, basic color", complex: "Balayage, extensions, keratin treatment" },
  "dental": { simple: "Cleaning, filling, routine exam", complex: "Crown, root canal, cosmetic procedure" },
  "electrical": { simple: "Outlet install, light fixture, switch", complex: "Panel upgrade, rewiring, inspection" },
  "cleaning": { simple: "Standard cleaning, touch-up", complex: "Deep clean, move-out, post-construction" },
  "landscaping": { simple: "Mowing, trimming, leaf cleanup", complex: "Hardscaping, irrigation install, tree removal" },
  // alias: industryCatalog uses underscore
  "auto_repair": { simple: "Oil change, tire rotation, brake pads", complex: "Engine diagnostic, electrical, transmission" },
  "pest_control": { simple: "General spray, preventive treatment", complex: "Termite treatment, full fumigation, bed bug heat" },
  "locksmith": { simple: "Lockout, rekey, key copy", complex: "High-security locks, master key system, commercial" },
  "moving": { simple: "Small local move (studio/1BR)", complex: "Full home move, long-distance, packing services" },
  "carpet_cleaning": { simple: "1-2 room cleaning", complex: "Whole home, heavy stains, pet odor treatment" },
  "pool_service": { simple: "Weekly cleaning, chemical balance", complex: "Equipment repair, acid wash, replaster" },
  "pressure_washing": { simple: "Driveway or walkway", complex: "Full exterior house wash, commercial building" },
  "tree_service": { simple: "Light trimming, small tree removal", complex: "Large tree removal, emergency storm damage" },
  "junk_removal": { simple: "Single item or small load", complex: "Full estate cleanout, construction debris" },
  "garage_door": { simple: "Spring adjustment, basic repair", complex: "Full door replacement, opener install" },
  "appliance_repair": { simple: "Diagnostic, simple repair", complex: "Major component replacement, sealed system" },
  "cleaning": { simple: "Standard clean (1-2BR)", complex: "Deep clean, move-out, post-construction" },
};

/**
 * Price factor placeholder hints by business mode
 */
export const PRICE_FACTOR_HINTS: Record<BusinessMode, string> = {
  service: "e.g., Property size, material grade, job scope",
  dispatch: "e.g., Vehicle weight, distance, time of day, road conditions",
  food: "e.g., Portion size, add-ons, dietary substitutions",
  medical: "e.g., Treatment area, number of units, insurance",
  general: "e.g., Project scope, materials, timeline",
  sales: "e.g., Configuration, financing terms, add-on packages",
};

/**
 * Slug-specific price factor hint overrides.
 * Use these instead of PRICE_FACTOR_HINTS when a slug is available.
 */
export const SLUG_PRICE_FACTOR_OVERRIDES: Record<string, string> = {
  "electrical": "e.g., Commercial vs residential, panel size, number of circuits, permit needed",
  "plumbing": "e.g., Property type, accessibility, pipe material, urgency",
  "hvac": "e.g., System type, square footage, number of zones, age of unit",
  "roofing": "e.g., Roof pitch, square footage, material (shingle/metal/tile), layers to remove",
  "landscaping": "e.g., Property size, terrain, materials, frequency",
  "painting": "e.g., Square footage, surface condition, number of coats, indoor/outdoor",
  "cleaning": "e.g., Square footage, property type (home/commercial), frequency, deep clean",
  "auto-repair": "e.g., Vehicle make/model/year, part availability, labor complexity",
  "auto-detailing": "e.g., Vehicle size (car/SUV/truck), interior condition, package tier",
  "auto_detailing": "e.g., Vehicle size (car/SUV/truck), interior condition, package tier",
  "towing": "e.g., Vehicle weight, tow distance, time of day, road conditions",
  "hair-salon": "e.g., Hair length, color complexity, product used",
  "salon": "e.g., Hair length, color complexity, product used",
  "dental": "e.g., Number of teeth, complexity, insurance coverage",
  // alias
  "auto_repair": "e.g., Vehicle make/model/year, part availability, labor complexity",
  "pest_control": "e.g., Property size, pest type, infestation severity, number of visits",
  "locksmith": "e.g., Lock brand, commercial vs residential, emergency after-hours",
  "moving": "e.g., Number of rooms, distance, stairs, packing services, specialty items",
  "carpet_cleaning": "e.g., Room size, carpet condition, stain type, number of rooms",
  "pool_service": "e.g., Pool size (gallons), condition, equipment issues",
  "pressure_washing": "e.g., Surface type, square footage, condition, stories",
  "tree_service": "e.g., Tree size/height, proximity to structures, number of trees",
  "junk_removal": "e.g., Volume (cubic yards), item type, weight, location",
  "garage_door": "e.g., Door size, number of springs, opener brand",
  "appliance_repair": "e.g., Brand, appliance type, age, part availability",
  "cleaning": "e.g., Square footage, number of rooms, frequency, current condition",
};
