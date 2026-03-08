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

// ---------------------------------------------------------------------------
// Slug-specific objection overrides (highest priority)
// ---------------------------------------------------------------------------

const SLUG_OBJECTION_OVERRIDES: Record<string, Array<{ objection: string; response: string }>> = {
  "handyman": [
    { objection: "I can probably just do it myself", response: "Totally fair — a lot of homeowners feel that way. But if it's been on your to-do list, we can take care of it today so you can focus on other things." },
    { objection: "I need to get a few quotes", response: "We understand. We're upfront about pricing and happy to give you a phone estimate right now so you can compare." },
    { objection: "That's too expensive for a small job", response: "I hear you. Our minimum is kept low on purpose. For small jobs, you're paying for a skilled pro who shows up same-day and gets it done right." },
  ],
  "plumbing": [
    { objection: "Can you just give me a ballpark?", response: "For most plumbing jobs, the range is wide because we can't see what's behind the wall until we're there. A quick visit is free and gets you an accurate number." },
    { objection: "My regular plumber said it was cheaper", response: "That's worth comparing! Just make sure the quote covers everything — labor, parts, and cleanup. Our price is all-in, no surprise charges." },
    { objection: "It's just a small drip, I'll wait", response: "Small drips often mean bigger problems underneath. Catching it now usually costs far less than water damage repair later." },
  ],
  "hvac": [
    { objection: "My warranty should cover this", response: "Great — if it does, we'll work with the warranty provider. Let me get your unit details and we can confirm what's covered before we start." },
    { objection: "I'll just wait until it breaks completely", response: "We hear that a lot, but emergency repairs in summer or winter cost 2-3x more than a scheduled service. A quick tune-up now could save you a lot." },
    { objection: "Another company quoted me less", response: "Make sure you compare what's included — sometimes a low quote doesn't cover the refrigerant, parts, or labor. Our price is all-in with no surprises." },
  ],
  "electrical": [
    { objection: "Can't I just watch a YouTube video and do it?", response: "For minor things like swapping a fixture, maybe. But anything involving your panel, new circuits, or outlets really does need a licensed electrician — it's a safety and insurance issue." },
    { objection: "Do I really need a permit for this?", response: "For most electrical work, yes — it protects you when you sell the house and makes sure the work is inspected. We handle all permit pulling, so it's one less thing for you." },
    { objection: "That's more than I expected", response: "Electrical work needs to be done right the first time. We use licensed, bonded electricians and our work is fully warranted. I can walk you through exactly what the price covers." },
  ],
  "roofing": [
    { objection: "Just give me a ballpark price", response: "Every roof is different based on pitch, square footage, and material. Our free inspection gives you an accurate number — usually takes under 30 minutes." },
    { objection: "I already have other quotes", response: "Smart move to compare. We'd love to give you ours too. Many clients choose us for our warranty and workmanship even if we're not the absolute cheapest." },
    { objection: "Can't I just patch it?", response: "Sometimes, yes. We'll tell you honestly whether a patch makes sense or if it would just delay a bigger expense. That's what the free inspection is for." },
  ],
  "general_contractor": [
    { objection: "Just give me a ballpark price", response: "For a project like that, the range is wide depending on materials, scope, and site conditions. A free on-site estimate gives you an accurate number with no obligation." },
    { objection: "I already have other quotes", response: "That's smart to compare. We'd love to give you our quote too. Many clients choose us for communication and quality even if we're not the lowest bid." },
    { objection: "That timeline seems too long", response: "I understand you want to move quickly. Let me get you scheduled for an estimate so we can talk timeline options and what might speed things up." },
  ],
  "landscaping": [
    { objection: "I was just going to do it myself", response: "Makes sense for some things! For jobs like mulching, grading, or regular mowing, most customers find it's worth hiring out when they see how fast we get it done." },
    { objection: "Can't I just wait until spring?", response: "For lawn care, timing matters. Fall prep actually sets you up for a much better lawn in spring. I can explain exactly what we'd do and why it helps." },
    { objection: "That seems like a lot for just mowing", response: "Our service includes edging, cleanup, and blowing — not just a cut. Plus you get a reliable schedule every week so your lawn always looks its best." },
  ],
  "painting": [
    { objection: "My brother-in-law can do it cheaper", response: "Family can definitely help on some jobs! Professional painters typically go faster, provide better prep, and warranty their work. It comes down to what matters most to you." },
    { objection: "Why does the prep take so long?", response: "Prep is 80% of a great paint job — filling holes, sanding, caulking, taping. Skipping it means the paint looks bad in a year. We do it right so you don't repaint in two years." },
    { objection: "I was just going to DIY this", response: "DIY can work for small areas! For larger projects, most customers find professional results are worth it — and we clean up everything when we're done." },
  ],
  "cleaning": [
    { objection: "My last cleaner was cheaper", response: "We hear that. Our pricing includes background-checked, insured cleaners, consistent quality, and a satisfaction guarantee. The difference usually shows up right away." },
    { objection: "I can just clean it myself", response: "Of course! We're for homeowners who want that time back. Most clients say the first clean is what converts them — they didn't realize how deep we go." },
    { objection: "Do you bring your own supplies?", response: "Yes, we bring everything — commercial-grade products and equipment. You don't need to provide anything." },
  ],
  "pest_control": [
    { objection: "I tried sprays from the hardware store", response: "Store sprays treat what you see, but not the nest or entry points. Professional treatment gets to the source so it doesn't come back in two weeks." },
    { objection: "Is it safe for my kids and pets?", response: "Absolutely — we use EPA-registered products and our technicians are trained in targeted application. We'll tell you exactly when it's safe to re-enter." },
    { objection: "I'll wait and see if they go away on their own", response: "Most infestations get larger if untreated. Catching it early is always cheaper and less disruptive than dealing with a serious infestation later." },
  ],
  "locksmith": [
    { objection: "I'll just call AAA", response: "AAA is great for roadside assistance, but they typically sub out locksmith calls to local services — sometimes with a 2-3 hour wait. We can usually be there faster, and we handle home and car lockouts directly." },
    { objection: "My landlord should pay for this", response: "That's fair for some situations — if it's a lock malfunction, your landlord may be responsible. We can help you get in now and provide documentation you can use for reimbursement." },
    { objection: "Can you come right now?", response: "We treat lockouts as emergencies. Let me check our nearest technician's location — in most cases we can have someone there within 30-45 minutes." },
    { objection: "I'll just break a window", response: "That'll cost you a lot more than a lockout service, plus the security risk. We can get you in cleanly without any damage to your door or lock." },
  ],
  "pool_service": [
    { objection: "I can maintain my own pool", response: "A lot of pool owners start that way! But consistent chemical balance is trickier than it looks — one off week can turn into a green pool that costs hundreds to fix. We save you time and prevent those surprises." },
    { objection: "I already have a pool service", response: "That's great! If you're ever looking to switch or want a second opinion on a repair quote, we'd love to do a free inspection — no pressure at all." },
    { objection: "Pool maintenance is too expensive", response: "We hear that! But a green pool or damaged pump can run $500–$2,000+ to fix. Our maintenance plans start at $125/week with chemicals included — no surprise bills at the end of the month." },
    { objection: "It's only seasonal, I don't need regular service", response: "Exactly why we offer seasonal packages — spring opening, summer maintenance, and winterization bundled at a discount. Most clients get more swim time because their pool is always ready to go." },
  ],

  // ── Sales mode objection overrides ──

  "car-dealership-new": [
    { objection: "I'm just browsing, not ready to buy", response: "That's totally fine — most people start that way! Coming in for a test drive is zero pressure and a great way to know if the vehicle actually fits your lifestyle. When would work for you?" },
    { objection: "I can get it cheaper online", response: "Online pricing often doesn't include local incentives, dealer cash, or loyalty bonuses that we can apply. Let's put together a real out-the-door number — you might be surprised." },
    { objection: "I want to think about it", response: "Of course! While you're thinking, the vehicle might sell — popular models move fast. How about coming in to hold it with a test drive, and if it's not right, you walk away with zero obligation?" },
    { objection: "I already have a good offer from another dealer", response: "Bring it in! We'll do our best to match or beat it, and we'd love a chance to show you what makes us different. Test drive first and let the numbers speak for themselves." },
  ],

  "car-dealership-used": [
    { objection: "How do I know it hasn't been in an accident?", response: "We run a Carfax and full inspection on every vehicle. I can pull the report right now — it shows full history including accidents, ownership, and service records." },
    { objection: "Used cars are risky", response: "That's why we inspect every vehicle before it hits the lot, and most of our inventory comes with warranty options. You get a like-new vehicle at a fraction of the cost." },
    { objection: "I can find it cheaper on Facebook Marketplace", response: "You might! The difference is you have zero recourse if something goes wrong with a private sale. We stand behind every vehicle we sell with inspections, titles, and warranty options." },
    { objection: "I need to talk to my spouse first", response: "Absolutely, bring them in! We'd love to do a test drive together — makes the decision a lot easier when you both feel the vehicle. What day works?" },
  ],

  real_estate: [
    { objection: "I'm just exploring, not ready to buy yet", response: "Perfectly fine — most buyers take 3-6 months from first look to closing. Talking to an agent now actually saves time later because you'll know exactly what to look for." },
    { objection: "I'll just use Zillow / search myself", response: "Zillow is great for browsing! What it can't do is get you into homes before they hit the market, negotiate on your behalf, or guide you through the paperwork. That's where we come in — and it's free for buyers." },
    { objection: "I need to get pre-approved first", response: "Smart thinking! I can connect you with a lender right now who can give you a pre-approval in 24 hours. Once that's done, we're ready to start touring — want me to make that introduction?" },
    { objection: "I'm already working with an agent", response: "No problem at all. If that relationship ever changes or you want a second opinion on a specific property, feel free to reach out — we're always here." },
  ],

  "solar-installer": [
    { objection: "I'm not sure solar makes sense for my area", response: "That's the most common question we get! Your roof's orientation, local utility rates, and sun exposure all matter. Our free assessment tells you exactly what to expect — and if it doesn't pencil out, we'll tell you honestly." },
    { objection: "I heard it takes years to pay off", response: "It depends on your usage and the incentives you qualify for. Most of our customers see payback in 5-8 years, and after that it's basically free electricity. With net metering, you can even earn credits." },
    { objection: "I'll wait until prices come down more", response: "Solar prices have dropped 70% in the last decade and have leveled off. But the 30% federal tax credit won't last forever. Waiting typically costs more than acting now." },
    { objection: "My roof might need replacement first", response: "Good thinking — we always inspect the roof before installation. If it needs work, we can coordinate it or advise you on timing. Better to know now." },
  ],

  "insurance-agency": [
    { objection: "I already have insurance through my bank / employer", response: "That's great! Many people don't realize they might be overpaying or under-covered. A quick review is free and takes 10 minutes — you might find gaps you didn't know you had." },
    { objection: "Can you just give me a quote over the phone?", response: "Absolutely. I just need a few details — takes about 5 minutes and I can have a number for you right away. What type of coverage are you looking for?" },
    { objection: "I shop online, it's usually cheaper", response: "Online quotes are great for comparison! What they can't do is customize your coverage or be there when you file a claim. Our clients typically end up with better coverage for the same price." },
    { objection: "I want to think about it", response: "Of course. While you're thinking, your current policy is still in place. Whenever you're ready to compare, we're here — and the quote is always free." },
  ],
};

/**
 * Get slug-aware objection examples.
 * Returns slug-specific suggestions if available, falls back to mode defaults.
 */
export function getSlugObjectionExamples(mode: BusinessMode, slug?: string | null): ObjectionExamples {
  const base = getObjectionExamples(mode);
  if (!slug) return base;
  const slugOverrides = SLUG_OBJECTION_OVERRIDES[slug];
  if (!slugOverrides || slugOverrides.length === 0) return base;
  return {
    ...base,
    commonObjections: slugOverrides,
  };
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
