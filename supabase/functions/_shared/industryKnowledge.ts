/**
 * Industry Knowledge for Edge Functions (Deno runtime)
 *
 * Portable subset of src/data/industryCatalog.ts with deep industry knowledge
 * for the Brain Assistant to give industry-aware suggestions.
 *
 * Covers top 30 industries. Add more as needed.
 */

export interface IndustryKnowledgeEntry {
  slug: string;
  name: string;
  businessMode: string;
  category: string;
  /** Typical services for this industry */
  services: Array<{ name: string; duration?: number; priceType?: string }>;
  /** Common FAQs customers ask */
  faqs: Array<{ question: string; answer: string }>;
  /** Common objections and suggested responses */
  objections: Array<{ objection: string; response: string }>;
  /** Suggested policies */
  policies: { cancellation: string; deposit: string; refund: string };
  /** Industry-specific tips for the AI assistant */
  tips: string[];
}

const defaultPolicies = {
  cancellation: "Free cancellation up to 24 hours before your appointment. Less than 24 hours notice may incur a cancellation fee.",
  deposit: "We require a deposit to secure your appointment. The deposit is applied to your final bill.",
  refund: "We stand behind our work. If you're not satisfied, please let us know and we'll make it right.",
};

const commonObjections = [
  { objection: "That's too expensive", response: "I understand price is important. We focus on quality and most customers find the value exceeds the cost. Would you like to hear about our options?" },
  { objection: "I need to think about it", response: "Of course! Would it help if I answered any specific questions? I can also hold a spot for you for 24 hours." },
  { objection: "I'll call back later", response: "No problem! Would you like me to send you a text with our info and a link to book when you're ready?" },
  { objection: "Can I get a discount?", response: "We offer our best pricing upfront, but we do have special packages. Let me tell you about those options." },
];

export const INDUSTRY_KNOWLEDGE: Record<string, IndustryKnowledgeEntry> = {
  // ─── HOME SERVICES ───────────────────────────────────────────────
  "plumber": {
    slug: "plumber",
    name: "Plumbing",
    businessMode: "service",
    category: "home_services",
    services: [
      { name: "Drain Cleaning", duration: 60, priceType: "fixed" },
      { name: "Leak Repair", duration: 90, priceType: "starting_at" },
      { name: "Water Heater Installation", duration: 180, priceType: "starting_at" },
      { name: "Toilet Repair/Replace", duration: 60, priceType: "fixed" },
      { name: "Faucet Installation", duration: 45, priceType: "fixed" },
      { name: "Sewer Line Inspection", duration: 120, priceType: "fixed" },
    ],
    faqs: [
      { question: "Do you offer emergency service?", answer: "Yes, we offer 24/7 emergency plumbing. Emergency rates may apply for after-hours calls." },
      { question: "Do you provide free estimates?", answer: "We provide free estimates for most jobs. For diagnostic work, there may be a small fee that's waived if you proceed with the repair." },
      { question: "Are you licensed and insured?", answer: "Yes, we are fully licensed and insured for your protection." },
      { question: "What areas do you serve?", answer: "" },
      { question: "Do you offer financing?", answer: "We offer financing options for larger projects. Ask us for details." },
    ],
    objections: commonObjections,
    policies: defaultPolicies,
    tips: [
      "Plumbing customers often call with urgent issues — train the AI to ask about urgency level upfront",
      "Common upsell: water heater flush during any visit",
      "Always ask property type (house/apartment/commercial) as it affects pricing",
    ],
  },

  "electrician": {
    slug: "electrician",
    name: "Electrical Services",
    businessMode: "service",
    category: "home_services",
    services: [
      { name: "Electrical Inspection", duration: 60, priceType: "fixed" },
      { name: "Panel Upgrade", duration: 240, priceType: "starting_at" },
      { name: "Outlet/Switch Install", duration: 30, priceType: "fixed" },
      { name: "Lighting Installation", duration: 60, priceType: "starting_at" },
      { name: "EV Charger Installation", duration: 180, priceType: "fixed" },
      { name: "Whole-Home Surge Protection", duration: 90, priceType: "fixed" },
    ],
    faqs: [
      { question: "Are you licensed and insured?", answer: "Yes, we are fully licensed, bonded, and insured." },
      { question: "Do you handle permits?", answer: "Yes, we pull all required permits and schedule inspections." },
      { question: "Do you offer emergency service?", answer: "Yes, we offer emergency electrical service for safety hazards." },
    ],
    objections: commonObjections,
    policies: defaultPolicies,
    tips: [
      "Safety is paramount — AI should never advise DIY electrical work",
      "EV charger installation is a growing revenue stream",
      "Always confirm if the home has an older electrical panel (may need upgrade)",
    ],
  },

  "hvac": {
    slug: "hvac",
    name: "HVAC",
    businessMode: "service",
    category: "home_services",
    services: [
      { name: "AC Tune-Up", duration: 60, priceType: "fixed" },
      { name: "Furnace Repair", duration: 90, priceType: "starting_at" },
      { name: "AC Installation", duration: 480, priceType: "quote_only" },
      { name: "Duct Cleaning", duration: 180, priceType: "fixed" },
      { name: "Thermostat Installation", duration: 30, priceType: "fixed" },
    ],
    faqs: [
      { question: "How often should I service my AC?", answer: "We recommend annual tune-ups in spring for AC and fall for heating." },
      { question: "Do you offer maintenance plans?", answer: "Yes! Our maintenance plans include priority service, discounts, and annual tune-ups." },
      { question: "What brands do you work on?", answer: "We service all major brands." },
    ],
    objections: [
      ...commonObjections,
      { objection: "I'll wait until it breaks", response: "Preventive maintenance can save you up to 40% on repair costs and extend your system's life by years. A small investment now prevents a big bill later." },
    ],
    policies: defaultPolicies,
    tips: [
      "Seasonal demand — busy in summer (AC) and winter (heating)",
      "Maintenance plans are the #1 upsell opportunity",
      "Always ask about home age and system age for better quoting",
    ],
  },

  "general-contractor": {
    slug: "general-contractor",
    name: "General Contractor",
    businessMode: "service",
    category: "home_services",
    services: [
      { name: "Kitchen Remodel", duration: 0, priceType: "quote_only" },
      { name: "Bathroom Remodel", duration: 0, priceType: "quote_only" },
      { name: "Room Addition", duration: 0, priceType: "quote_only" },
      { name: "Deck/Patio Build", duration: 0, priceType: "quote_only" },
      { name: "Handyman Service", duration: 120, priceType: "starting_at" },
    ],
    faqs: [
      { question: "Do you provide free estimates?", answer: "Yes, we offer free on-site estimates for all projects." },
      { question: "Are you licensed and insured?", answer: "Yes, fully licensed, bonded, and insured." },
      { question: "How long does a kitchen remodel take?", answer: "Typically 4-8 weeks depending on scope." },
    ],
    objections: commonObjections,
    policies: {
      cancellation: "Cancellation terms are outlined in your project contract.",
      deposit: "A deposit is required to begin work. Amount varies by project size.",
      refund: "Work completed is non-refundable. Unused materials may be returned.",
    },
    tips: [
      "Most calls are for quotes — AI should gather project details thoroughly",
      "Always ask about timeline expectations",
      "Photos of the project area help with quoting — offer to accept via text",
    ],
  },

  "cleaning-service": {
    slug: "cleaning-service",
    name: "Cleaning Service",
    businessMode: "service",
    category: "home_services",
    services: [
      { name: "Standard Cleaning", duration: 120, priceType: "starting_at" },
      { name: "Deep Cleaning", duration: 240, priceType: "starting_at" },
      { name: "Move-In/Move-Out Cleaning", duration: 300, priceType: "starting_at" },
      { name: "Office Cleaning", duration: 120, priceType: "quote_only" },
    ],
    faqs: [
      { question: "Do you bring your own supplies?", answer: "Yes, we bring all cleaning supplies and equipment." },
      { question: "Do I need to be home?", answer: "It's up to you! Many clients provide a key or code." },
      { question: "How many cleaners come?", answer: "Typically a team of 2, but it depends on the size of the home." },
    ],
    objections: commonObjections,
    policies: defaultPolicies,
    tips: [
      "Recurring bookings are the business lifeline — AI should suggest recurring plans",
      "Square footage and number of bedrooms/bathrooms drive pricing",
      "First clean is always more expensive (deep clean), then recurring is less",
    ],
  },

  "landscaping": {
    slug: "landscaping",
    name: "Landscaping",
    businessMode: "service",
    category: "home_services",
    services: [
      { name: "Lawn Mowing", duration: 60, priceType: "fixed" },
      { name: "Landscape Design", duration: 0, priceType: "quote_only" },
      { name: "Tree Trimming", duration: 120, priceType: "starting_at" },
      { name: "Irrigation Install", duration: 240, priceType: "quote_only" },
      { name: "Spring/Fall Cleanup", duration: 180, priceType: "starting_at" },
    ],
    faqs: [
      { question: "Do you offer weekly service?", answer: "Yes, we offer weekly, bi-weekly, and monthly maintenance plans." },
      { question: "What areas do you serve?", answer: "" },
    ],
    objections: commonObjections,
    policies: defaultPolicies,
    tips: [
      "Seasonal business — heavy spring through fall",
      "Weekly recurring mowing contracts are the bread and butter",
      "Always ask about lot size for accurate quoting",
    ],
  },

  // ─── AUTO SERVICES ──────────────────────────────────────────────
  "auto-repair": {
    slug: "auto-repair",
    name: "Auto Repair",
    businessMode: "service",
    category: "auto_services",
    services: [
      { name: "Oil Change", duration: 30, priceType: "fixed" },
      { name: "Brake Service", duration: 120, priceType: "starting_at" },
      { name: "Engine Diagnostics", duration: 60, priceType: "fixed" },
      { name: "Tire Service", duration: 45, priceType: "fixed" },
      { name: "Transmission Service", duration: 180, priceType: "starting_at" },
      { name: "AC Repair", duration: 120, priceType: "starting_at" },
    ],
    faqs: [
      { question: "Do you provide free estimates?", answer: "We offer free visual estimates. Diagnostic testing has a fee that's waived if you have the repair done with us." },
      { question: "How long will my repair take?", answer: "Most common repairs are same-day. We'll give you a timeline when we inspect your vehicle." },
      { question: "Do you offer a warranty?", answer: "Yes, we warranty our work for 12 months or 12,000 miles." },
      { question: "Do you work on all makes and models?", answer: "Yes, we service all makes and models, both domestic and import." },
      { question: "Can I drop off my car?", answer: "Absolutely! Early drop-off and after-hours pickup are available." },
    ],
    objections: [
      ...commonObjections,
      { objection: "The dealership quoted me less", response: "We match or beat most dealership quotes, and our technicians are factory-trained. Plus, you don't have to deal with dealership upsells." },
    ],
    policies: {
      ...defaultPolicies,
      cancellation: "Please give us at least 2 hours notice if you need to cancel or reschedule your appointment.",
    },
    tips: [
      "Vehicle year/make/model is essential for every call — AI must collect this",
      "Symptom-based questions help techs prepare (e.g., 'What noise is it making?')",
      "Upsell seasonal services: AC check in spring, winterization in fall",
    ],
  },

  "auto-body": {
    slug: "auto-body",
    name: "Auto Body Shop",
    businessMode: "service",
    category: "auto_services",
    services: [
      { name: "Collision Repair", duration: 0, priceType: "quote_only" },
      { name: "Paint Service", duration: 0, priceType: "quote_only" },
      { name: "Dent Removal", duration: 120, priceType: "starting_at" },
      { name: "Insurance Claim Repair", duration: 0, priceType: "quote_only" },
    ],
    faqs: [
      { question: "Do you work with insurance?", answer: "Yes, we work with all major insurance companies and handle the claims process for you." },
      { question: "Do you offer rental car assistance?", answer: "Yes, we can help arrange a rental car while your vehicle is being repaired." },
      { question: "How long does body work take?", answer: "It depends on the damage. Minor repairs can be 1-3 days, larger repairs may take 1-2 weeks." },
    ],
    objections: commonObjections,
    policies: defaultPolicies,
    tips: [
      "Many calls involve insurance claims — AI should ask if this is an insurance job",
      "Photos of damage are essential for quoting — offer to accept via text",
      "Rental car coordination is a major customer concern",
    ],
  },

  // ─── BEAUTY & WELLNESS ──────────────────────────────────────────
  "hair-salon": {
    slug: "hair-salon",
    name: "Hair Salon",
    businessMode: "service",
    category: "beauty_wellness",
    services: [
      { name: "Haircut", duration: 45, priceType: "fixed" },
      { name: "Color", duration: 120, priceType: "starting_at" },
      { name: "Highlights/Balayage", duration: 180, priceType: "starting_at" },
      { name: "Blowout", duration: 45, priceType: "fixed" },
      { name: "Treatment", duration: 30, priceType: "fixed" },
    ],
    faqs: [
      { question: "Do I need an appointment?", answer: "Appointments are recommended, but we do accept walk-ins when available." },
      { question: "How do I choose the right stylist?", answer: "We can match you with a stylist based on your style goals and hair type." },
      { question: "Can I see photos of your work?", answer: "Yes! Check our social media for portfolio photos." },
    ],
    objections: commonObjections,
    policies: {
      cancellation: "Please cancel or reschedule at least 24 hours in advance. Late cancellations may be charged 50% of the service price.",
      deposit: "A deposit may be required for color services and new clients.",
      refund: "If you're not happy with your service, please let us know within 7 days and we'll make adjustments.",
    },
    tips: [
      "New client consultations are key — AI should ask about hair type and goals",
      "Color services require longer blocks — AI should mention timing expectations",
      "Rebooking is critical — AI should suggest scheduling the next appointment",
    ],
  },

  "barbershop": {
    slug: "barbershop",
    name: "Barbershop",
    businessMode: "service",
    category: "beauty_wellness",
    services: [
      { name: "Haircut", duration: 30, priceType: "fixed" },
      { name: "Beard Trim", duration: 15, priceType: "fixed" },
      { name: "Haircut + Beard", duration: 45, priceType: "fixed" },
      { name: "Hot Towel Shave", duration: 30, priceType: "fixed" },
      { name: "Kid's Cut", duration: 20, priceType: "fixed" },
    ],
    faqs: [
      { question: "Do you take walk-ins?", answer: "Yes! Walk-ins are welcome. Appointments are also available to skip the wait." },
      { question: "What are your hours?", answer: "" },
    ],
    objections: commonObjections,
    policies: defaultPolicies,
    tips: [
      "Walk-ins are common — AI should mention current wait time if possible",
      "Upsell beard services to haircut customers",
      "Loyalty programs drive repeat visits",
    ],
  },

  "spa": {
    slug: "spa",
    name: "Spa & Wellness",
    businessMode: "service",
    category: "beauty_wellness",
    services: [
      { name: "Swedish Massage", duration: 60, priceType: "fixed" },
      { name: "Deep Tissue Massage", duration: 60, priceType: "fixed" },
      { name: "Facial", duration: 60, priceType: "fixed" },
      { name: "Body Wrap", duration: 90, priceType: "fixed" },
      { name: "Couples Massage", duration: 60, priceType: "fixed" },
    ],
    faqs: [
      { question: "What should I wear?", answer: "We provide robes and slippers. You'll be properly draped during your treatment." },
      { question: "Should I arrive early?", answer: "Yes, please arrive 15 minutes early to check in and relax before your service." },
      { question: "Can I request a specific therapist?", answer: "Absolutely! We recommend booking in advance if you have a preference." },
    ],
    objections: commonObjections,
    policies: {
      cancellation: "24-hour cancellation policy. Late cancellations are charged the full service amount.",
      deposit: "Credit card required to hold your reservation.",
      refund: "Gift cards are non-refundable. Service adjustments available within 48 hours.",
    },
    tips: [
      "Gift certificates are a major revenue stream — AI should mention them",
      "Package deals encourage repeat visits",
      "First-time client specials are common in this industry",
    ],
  },

  "nail-salon": {
    slug: "nail-salon",
    name: "Nail Salon",
    businessMode: "service",
    category: "beauty_wellness",
    services: [
      { name: "Manicure", duration: 30, priceType: "fixed" },
      { name: "Pedicure", duration: 45, priceType: "fixed" },
      { name: "Gel Nails", duration: 45, priceType: "fixed" },
      { name: "Acrylic Set", duration: 60, priceType: "fixed" },
      { name: "Nail Art", duration: 30, priceType: "starting_at" },
    ],
    faqs: [
      { question: "Do you take walk-ins?", answer: "Yes, walk-ins welcome! Appointments recommended for weekends." },
      { question: "How long do gel nails last?", answer: "Gel nails typically last 2-3 weeks." },
    ],
    objections: commonObjections,
    policies: defaultPolicies,
    tips: [
      "Group bookings for events (bridal, birthday) are high-value",
      "Upsell gel over regular polish for better retention",
      "Rebooking every 2-3 weeks is the target cadence",
    ],
  },

  // ─── DISPATCH & LOGISTICS ───────────────────────────────────────
  "towing": {
    slug: "towing",
    name: "Towing Service",
    businessMode: "dispatch",
    category: "dispatch_logistics",
    services: [
      { name: "Local Tow", priceType: "starting_at" },
      { name: "Long Distance Tow", priceType: "quote_only" },
      { name: "Flatbed Tow", priceType: "starting_at" },
      { name: "Motorcycle Tow", priceType: "fixed" },
      { name: "Roadside Assistance", priceType: "fixed" },
      { name: "Lockout Service", priceType: "fixed" },
      { name: "Jump Start", priceType: "fixed" },
      { name: "Tire Change", priceType: "fixed" },
    ],
    faqs: [
      { question: "How quickly can you get here?", answer: "Our average response time is 30-45 minutes depending on your location." },
      { question: "How much does a tow cost?", answer: "Pricing depends on distance and vehicle type. We can give you a quote right now." },
      { question: "Do you accept insurance/roadside assistance?", answer: "Yes, we work with most insurance and roadside assistance programs." },
      { question: "Can you tow an all-wheel drive vehicle?", answer: "Yes, we have flatbed trucks that can safely transport AWD vehicles." },
    ],
    objections: [
      ...commonObjections,
      { objection: "Another company quoted me less", response: "We compete on reliability and speed, not just price. We'll be there when we say and treat your vehicle with care." },
    ],
    policies: {
      cancellation: "No charge if cancelled before truck is dispatched.",
      deposit: "Payment is due upon completion of service.",
      refund: "Contact us within 48 hours for any billing concerns.",
    },
    tips: [
      "Location is critical — AI must get exact pickup address immediately",
      "Vehicle info (year/make/model, drivable?) affects which truck to send",
      "Urgency is assumed high — keep the conversation efficient",
    ],
  },

  "courier-delivery": {
    slug: "courier-delivery",
    name: "Courier & Delivery",
    businessMode: "dispatch",
    category: "dispatch_logistics",
    services: [
      { name: "Standard Delivery", priceType: "starting_at" },
      { name: "Rush Delivery", priceType: "starting_at" },
      { name: "Same-Day Delivery", priceType: "starting_at" },
      { name: "Scheduled Pickup", priceType: "fixed" },
    ],
    faqs: [
      { question: "How fast can you deliver?", answer: "Rush delivery is available within 1-2 hours in our service area." },
      { question: "Do you deliver outside the city?", answer: "" },
      { question: "Can I track my delivery?", answer: "Yes, you'll receive real-time tracking updates." },
    ],
    objections: commonObjections,
    policies: defaultPolicies,
    tips: [
      "Pickup and dropoff addresses are essential — collect both immediately",
      "Package size/weight affects pricing",
      "Time sensitivity drives urgency — ask about deadline",
    ],
  },

  // ─── FOOD & HOSPITALITY ─────────────────────────────────────────
  "restaurant": {
    slug: "restaurant",
    name: "Restaurant",
    businessMode: "food",
    category: "food_hospitality",
    services: [
      { name: "Dine-In", priceType: "fixed" },
      { name: "Takeout Order", priceType: "fixed" },
      { name: "Delivery Order", priceType: "fixed" },
      { name: "Catering", priceType: "quote_only" },
    ],
    faqs: [
      { question: "Do you take reservations?", answer: "Yes! We accept reservations for parties of any size." },
      { question: "Do you deliver?", answer: "" },
      { question: "Do you accommodate dietary restrictions?", answer: "Yes, we have vegetarian, vegan, and gluten-free options. Let your server know about any allergies." },
      { question: "Do you cater events?", answer: "Yes! We offer catering for events of all sizes." },
      { question: "What are your hours?", answer: "" },
    ],
    objections: commonObjections,
    policies: {
      cancellation: "Catering cancellations require 48 hours notice for full refund.",
      deposit: "Catering orders over $500 require a 50% deposit.",
      refund: "If there's an issue with your order, please let us know and we'll make it right.",
    },
    tips: [
      "Menu items should be in the menu_items table, not services",
      "Reservation party size and date/time are essential info",
      "Dietary restrictions are increasingly important — AI should ask",
    ],
  },

  "pizza": {
    slug: "pizza",
    name: "Pizza Shop",
    businessMode: "food",
    category: "food_hospitality",
    services: [
      { name: "Delivery Order", priceType: "fixed" },
      { name: "Pickup Order", priceType: "fixed" },
      { name: "Catering/Party Order", priceType: "quote_only" },
    ],
    faqs: [
      { question: "How long for delivery?", answer: "Delivery usually takes 30-45 minutes depending on how busy we are." },
      { question: "What's your delivery radius?", answer: "" },
      { question: "Do you have gluten-free options?", answer: "" },
      { question: "What's your minimum for delivery?", answer: "" },
    ],
    objections: commonObjections,
    policies: defaultPolicies,
    tips: [
      "Delivery address and order details are the two key pieces of info",
      "Upsell sides, drinks, and desserts on every order",
      "Party/catering orders should be booked in advance",
    ],
  },

  "bakery": {
    slug: "bakery",
    name: "Bakery",
    businessMode: "food",
    category: "food_hospitality",
    services: [
      { name: "Pickup Order", priceType: "fixed" },
      { name: "Custom Cake Order", priceType: "quote_only" },
      { name: "Catering/Event Order", priceType: "quote_only" },
    ],
    faqs: [
      { question: "How far in advance should I order a custom cake?", answer: "We recommend at least 1 week for custom cakes, 2 weeks for wedding cakes." },
      { question: "Do you accommodate food allergies?", answer: "We can accommodate many dietary needs. Please let us know about any allergies." },
    ],
    objections: commonObjections,
    policies: {
      cancellation: "Custom orders require 48 hours notice for cancellation.",
      deposit: "Custom cakes require a 50% deposit at time of order.",
      refund: "Standard items are non-refundable. Custom order deposits are non-refundable within 48 hours of event.",
    },
    tips: [
      "Custom cake orders need event date, flavor, size, and design details",
      "Lead time is important — AI should ask when the order is needed",
      "Dietary restrictions (gluten-free, nut-free) are common requests",
    ],
  },

  // ─── HEALTH & MEDICAL ──────────────────────────────────────────
  "dentist": {
    slug: "dentist",
    name: "Dental Practice",
    businessMode: "medical",
    category: "health_medical",
    services: [
      { name: "Cleaning & Exam", duration: 60, priceType: "fixed" },
      { name: "Emergency Visit", duration: 30, priceType: "starting_at" },
      { name: "Crown", duration: 90, priceType: "fixed" },
      { name: "Filling", duration: 45, priceType: "fixed" },
      { name: "Teeth Whitening", duration: 60, priceType: "fixed" },
      { name: "Consultation", duration: 30, priceType: "fixed" },
    ],
    faqs: [
      { question: "Do you accept my insurance?", answer: "We accept most major dental insurance plans. Call us to verify your specific plan." },
      { question: "Do you see new patients?", answer: "Yes! We welcome new patients." },
      { question: "Is it going to hurt?", answer: "We prioritize patient comfort and offer sedation options for anxious patients." },
      { question: "What if I have a dental emergency?", answer: "We reserve time for emergencies. Call us right away and we'll get you in as soon as possible." },
    ],
    objections: commonObjections,
    policies: {
      cancellation: "Please provide 24-48 hours notice for cancellations. Missed appointments without notice may incur a fee.",
      deposit: "Co-pays and deductibles are due at time of service.",
      refund: "Billing inquiries can be directed to our billing department.",
    },
    tips: [
      "HIPAA mode applies — never store PHI in conversations",
      "Insurance verification is the #1 question — AI should ask for insurance info",
      "New patient vs. existing patient changes the flow significantly",
      "Emergency dental calls have high conversion — prioritize them",
    ],
  },

  "chiropractor": {
    slug: "chiropractor",
    name: "Chiropractic",
    businessMode: "medical",
    category: "health_medical",
    services: [
      { name: "Initial Consultation", duration: 60, priceType: "fixed" },
      { name: "Adjustment", duration: 30, priceType: "fixed" },
      { name: "X-Ray", duration: 15, priceType: "fixed" },
      { name: "Massage Therapy", duration: 60, priceType: "fixed" },
      { name: "Decompression Therapy", duration: 30, priceType: "fixed" },
    ],
    faqs: [
      { question: "Do you accept insurance?", answer: "We accept most major insurance plans including auto injury and workers' comp." },
      { question: "Do I need a referral?", answer: "No referral needed. You can book directly with us." },
      { question: "How many visits will I need?", answer: "That depends on your condition. We'll create a treatment plan after your initial evaluation." },
    ],
    objections: commonObjections,
    policies: {
      cancellation: "24-hour cancellation policy.",
      deposit: "Co-pay due at time of service.",
      refund: "Please contact our office for billing questions.",
    },
    tips: [
      "HIPAA mode applies",
      "Auto accident and workers' comp cases have different billing — AI should ask cause",
      "Treatment packages drive recurring revenue",
    ],
  },

  "veterinarian": {
    slug: "veterinarian",
    name: "Veterinary Clinic",
    businessMode: "service",
    category: "pet_services",
    services: [
      { name: "Wellness Exam", duration: 30, priceType: "fixed" },
      { name: "Vaccination", duration: 15, priceType: "fixed" },
      { name: "Sick Visit", duration: 30, priceType: "starting_at" },
      { name: "Surgery", duration: 0, priceType: "quote_only" },
      { name: "Dental Cleaning", duration: 120, priceType: "starting_at" },
      { name: "Emergency Visit", duration: 0, priceType: "starting_at" },
    ],
    faqs: [
      { question: "Do you see emergencies?", answer: "Yes, we handle emergencies during business hours. After hours, we can refer you to the nearest emergency vet." },
      { question: "What animals do you treat?", answer: "We treat dogs and cats. Contact us about other pets." },
      { question: "Do you offer payment plans?", answer: "We accept CareCredit and other pet financing options." },
    ],
    objections: commonObjections,
    policies: defaultPolicies,
    tips: [
      "Pet name, species, and age are essential — AI should always ask",
      "Urgency assessment is critical for sick/emergency visits",
      "Preventive care packages are great for recurring revenue",
    ],
  },

  "dog-grooming": {
    slug: "dog-grooming",
    name: "Dog Grooming",
    businessMode: "service",
    category: "pet_services",
    services: [
      { name: "Bath & Brush", duration: 60, priceType: "starting_at" },
      { name: "Full Groom", duration: 120, priceType: "starting_at" },
      { name: "Puppy First Groom", duration: 45, priceType: "fixed" },
      { name: "Nail Trim", duration: 15, priceType: "fixed" },
      { name: "De-Shedding Treatment", duration: 90, priceType: "starting_at" },
    ],
    faqs: [
      { question: "How often should I groom my dog?", answer: "Most dogs benefit from grooming every 4-6 weeks." },
      { question: "What if my dog is aggressive?", answer: "We have experience with anxious dogs. Let us know in advance and we'll take extra care." },
    ],
    objections: commonObjections,
    policies: defaultPolicies,
    tips: [
      "Breed and size determine pricing — AI should always ask",
      "Recurring 4-6 week bookings are the goal",
      "Behavioral notes (anxious, aggressive) are important for the groomer",
    ],
  },

  // ─── PROFESSIONAL SERVICES ──────────────────────────────────────
  "law-firm": {
    slug: "law-firm",
    name: "Law Firm",
    businessMode: "service",
    category: "professional_services",
    services: [
      { name: "Free Consultation", duration: 30, priceType: "fixed" },
      { name: "Case Review", duration: 60, priceType: "fixed" },
      { name: "Legal Representation", duration: 0, priceType: "quote_only" },
    ],
    faqs: [
      { question: "Do you offer free consultations?", answer: "Yes, we offer a free initial consultation." },
      { question: "What areas of law do you practice?", answer: "" },
      { question: "How much do you charge?", answer: "Fees vary by case type. We discuss fees during your free consultation." },
    ],
    objections: commonObjections,
    policies: {
      cancellation: "24-hour notice required for cancellations.",
      deposit: "Retainer may be required depending on case type.",
      refund: "Retainer terms outlined in engagement agreement.",
    },
    tips: [
      "Case type and urgency are the first things to determine",
      "Free consultation is the conversion mechanism — AI should push for it",
      "Confidentiality is paramount — AI should not discuss specifics over the phone",
    ],
  },

  "accounting": {
    slug: "accounting",
    name: "Accounting Firm",
    businessMode: "service",
    category: "professional_services",
    services: [
      { name: "Tax Preparation (Individual)", duration: 60, priceType: "starting_at" },
      { name: "Tax Preparation (Business)", duration: 120, priceType: "starting_at" },
      { name: "Bookkeeping", duration: 0, priceType: "quote_only" },
      { name: "Consultation", duration: 30, priceType: "fixed" },
    ],
    faqs: [
      { question: "What documents do I need for my taxes?", answer: "We'll provide a checklist after booking. Generally: W-2s, 1099s, and major expense receipts." },
      { question: "Can you help with back taxes?", answer: "Yes, we handle back taxes and IRS issues." },
    ],
    objections: commonObjections,
    policies: defaultPolicies,
    tips: [
      "Seasonal peak: January - April for tax season",
      "AI should distinguish between personal and business tax needs",
      "Monthly bookkeeping packages are recurring revenue",
    ],
  },

  // ─── FITNESS & RECREATION ───────────────────────────────────────
  "personal-trainer": {
    slug: "personal-trainer",
    name: "Personal Training",
    businessMode: "service",
    category: "fitness_recreation",
    services: [
      { name: "1-on-1 Training Session", duration: 60, priceType: "fixed" },
      { name: "Group Training", duration: 60, priceType: "fixed" },
      { name: "Fitness Assessment", duration: 45, priceType: "fixed" },
      { name: "Nutrition Consultation", duration: 30, priceType: "fixed" },
    ],
    faqs: [
      { question: "What should I bring to my first session?", answer: "Comfortable workout clothes, water, and a towel." },
      { question: "Do you offer packages?", answer: "Yes! We offer 5, 10, and 20 session packages at discounted rates." },
    ],
    objections: commonObjections,
    policies: {
      cancellation: "24-hour cancellation policy. Late cancellations are charged the full session rate.",
      deposit: "Package payment due upfront.",
      refund: "Unused sessions in packages are refundable within 90 days.",
    },
    tips: [
      "Package sales are the revenue driver — AI should always mention packages",
      "Fitness goals help match the right program",
      "Availability is key — AI should find overlapping times",
    ],
  },

  "yoga-studio": {
    slug: "yoga-studio",
    name: "Yoga Studio",
    businessMode: "service",
    category: "fitness_recreation",
    services: [
      { name: "Drop-In Class", duration: 60, priceType: "fixed" },
      { name: "Private Session", duration: 60, priceType: "fixed" },
      { name: "New Student Special", duration: 60, priceType: "fixed" },
      { name: "Workshop", duration: 120, priceType: "fixed" },
    ],
    faqs: [
      { question: "I've never done yoga before. Is that okay?", answer: "Absolutely! We welcome all levels and have beginner-friendly classes." },
      { question: "Do you provide mats?", answer: "Yes, we have mats available. Feel free to bring your own if you prefer." },
    ],
    objections: commonObjections,
    policies: defaultPolicies,
    tips: [
      "New student specials are the hook — always mention them",
      "Class schedule visibility is important for booking",
      "Monthly memberships are the recurring revenue target",
    ],
  },

  // ─── PROPERTY ───────────────────────────────────────────────────
  "property-management": {
    slug: "property-management",
    name: "Property Management",
    businessMode: "service",
    category: "property_real_estate",
    services: [
      { name: "Maintenance Request", duration: 0, priceType: "quote_only" },
      { name: "Showing/Tour", duration: 30, priceType: "fixed" },
      { name: "Lease Inquiry", duration: 15, priceType: "fixed" },
    ],
    faqs: [
      { question: "How do I submit a maintenance request?", answer: "You can call us, submit online, or use our tenant portal." },
      { question: "What's the application process?", answer: "Apply online. We run credit and background checks. Processing takes 1-3 business days." },
      { question: "Is there a pet policy?", answer: "" },
    ],
    objections: commonObjections,
    policies: {
      cancellation: "N/A for maintenance. Showing appointments require 2-hour notice.",
      deposit: "Security deposit equal to one month's rent.",
      refund: "Security deposit refunded within 30 days of lease end, less any damages.",
    },
    tips: [
      "Maintenance urgency matters: water leak vs. light bulb replacement",
      "Prospective tenants want availability, pricing, and pet policy",
      "Current tenants want maintenance speed and lease questions",
    ],
  },

  // ─── EVENTS ─────────────────────────────────────────────────────
  "photographer": {
    slug: "photographer",
    name: "Photography",
    businessMode: "service",
    category: "events_entertainment",
    services: [
      { name: "Portrait Session", duration: 60, priceType: "starting_at" },
      { name: "Wedding Photography", duration: 480, priceType: "starting_at" },
      { name: "Event Photography", duration: 240, priceType: "starting_at" },
      { name: "Headshots", duration: 30, priceType: "fixed" },
      { name: "Family Session", duration: 60, priceType: "fixed" },
    ],
    faqs: [
      { question: "How far in advance should I book?", answer: "We recommend booking 2-3 months ahead for events, 2-4 weeks for portraits." },
      { question: "Do you travel?", answer: "Yes, we travel within our service area. Travel fees may apply for distant locations." },
      { question: "When will I get my photos?", answer: "Typical turnaround is 2-4 weeks." },
    ],
    objections: commonObjections,
    policies: {
      cancellation: "Cancellations more than 14 days before: full refund minus deposit. Less than 14 days: deposit non-refundable.",
      deposit: "50% deposit required to secure your date.",
      refund: "Deposits are non-refundable within 14 days of the event.",
    },
    tips: [
      "Event date is the most important piece of info — check availability immediately",
      "Package tiers drive revenue — always present options",
      "Wedding inquiries have highest lifetime value",
    ],
  },

  "dj": {
    slug: "dj",
    name: "DJ Service",
    businessMode: "service",
    category: "events_entertainment",
    services: [
      { name: "Wedding DJ", duration: 300, priceType: "starting_at" },
      { name: "Party/Event DJ", duration: 240, priceType: "starting_at" },
      { name: "Corporate Event", duration: 240, priceType: "starting_at" },
    ],
    faqs: [
      { question: "Do you take requests?", answer: "Yes! We work with you to create the perfect playlist." },
      { question: "Do you provide equipment?", answer: "Yes, full sound and lighting setup is included." },
    ],
    objections: commonObjections,
    policies: {
      cancellation: "Cancellations more than 30 days before: full refund minus deposit. Less than 30 days: deposit non-refundable.",
      deposit: "50% deposit required to secure your date.",
      refund: "Deposits are non-refundable within 30 days of the event.",
    },
    tips: [
      "Event date, venue, and expected guest count are essential",
      "Weddings are the highest-value bookings",
      "Packages with lighting upsells are common",
    ],
  },
};

/**
 * Look up industry knowledge by slug.
 * Returns null if not found.
 */
export function getIndustryKnowledge(slug: string): IndustryKnowledgeEntry | null {
  return INDUSTRY_KNOWLEDGE[slug] ?? null;
}

/**
 * Get all available industry slugs.
 */
export function getAvailableIndustrySlugs(): string[] {
  return Object.keys(INDUSTRY_KNOWLEDGE);
}
