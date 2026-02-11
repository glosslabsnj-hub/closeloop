/**
 * Industry-Aware Helper Content for Business Brain
 * 
 * Provides contextual explanations, examples, and tips based on business mode.
 * Ensures business owners understand exactly how each feature affects their AI.
 */

import type { BusinessMode } from "@/hooks/useTenantConfig";

/**
 * Mode-specific icon and label mapping
 */
export const MODE_LABELS: Record<BusinessMode, { label: string; icon: string; color: string }> = {
  service: { label: "Service Business", icon: "Wrench", color: "text-blue-500" },
  dispatch: { label: "Dispatch / Roadside", icon: "Truck", color: "text-amber-500" },
  food: { label: "Restaurant / Food", icon: "UtensilsCrossed", color: "text-orange-500" },
  medical: { label: "Medical Practice", icon: "HeartPulse", color: "text-rose-500" },
  general: { label: "General Business", icon: "Building2", color: "text-slate-500" },
  sales: { label: "Sales Business", icon: "DollarSign", color: "text-indigo-500" },
};

/**
 * Section-level helper content with mode-specific tips
 */
export interface SectionHelperContent {
  title: string;
  whatItControls: string;
  howAIUsesIt: string[];
  examplesByMode: Partial<Record<BusinessMode, string>>;
  tipsByMode: Partial<Record<BusinessMode, string>>;
  defaultTip?: string;
}

export const SECTION_HELPERS: Record<string, SectionHelperContent> = {
  profile: {
    title: "Business Identity",
    whatItControls: "Your business name, tagline, location, and contact information",
    howAIUsesIt: [
      "Introduces your business by name on every call",
      "Mentions years in business to build trust",
      "Answers 'Where are you located?' questions",
    ],
    examplesByMode: {
      service: "\"Thanks for calling Mike's Plumbing, where we've been fixing leaks for 15 years.\"",
      dispatch: "\"Thanks for calling FastTow 24/7. Are you safe? Do you need a tow or roadside assistance?\"",
      food: "\"Thanks for calling Bella's Pizza, home of the best deep dish in Chicago!\"",
      medical: "\"Thank you for calling Greenview Family Practice, where your health comes first.\"",
      general: "\"Thanks for calling [Your Business], how can I help you today?\"",
      sales: "\"Thanks for calling Prestige Auto Group! Whether you're looking for a new ride or want to trade in your current vehicle, we'd love to help.\"",
    },
    tipsByMode: {
      service: "A strong tagline like 'Licensed & insured since 2010' builds instant trust with callers.",
      dispatch: "Your AI asks 'Are you safe?' first for stranded callers. Keep your intro short — every second counts in emergencies.",
      food: "Mention your specialty! 'Home of the famous...' makes you memorable.",
      medical: "Include credentials like 'Board-certified' to establish professionalism immediately.",
      general: "Your tagline is the first impression — make it count!",
      sales: "Lead with what makes you different — 'Largest selection in the county' or 'Family-owned since 1985' builds trust with buyers.",
    },
  },
  hours: {
    title: "Operating Hours",
    whatItControls: "When your business is open for calls, bookings, and appointments",
    howAIUsesIt: [
      "Tells callers if you're currently open or closed",
      "Suggests available booking times",
      "Explains when you'll be available next",
    ],
    examplesByMode: {
      service: "\"We're open Monday through Saturday, 8 AM to 6 PM. Would tomorrow morning work?\"",
      dispatch: "\"We're available 24/7 for roadside emergencies. I can dispatch a driver right now.\"",
      food: "\"We're open until 10 PM tonight. Would you like to place an order?\"",
      medical: "\"Our office hours are 9 AM to 5 PM weekdays. I can check our next available.\"",
      general: "\"We're open until 5 PM today. What can I help you with?\"",
      sales: "\"We're open Monday through Saturday, 9 AM to 7 PM, and Sundays noon to 5. Would you like to schedule a visit?\"",
    },
    tipsByMode: {
      service: "Set your hours accurately — the AI won't offer appointments outside these times.",
      dispatch: "Most towing businesses run 24/7. If you're not, set your after-hours behavior to take callbacks or forward to another driver.",
      food: "Consider different hours for pickup vs. delivery if your kitchen closes earlier.",
      medical: "Include lunch breaks if your office is closed during certain hours.",
      general: "Holiday hours should be updated in advance so the AI knows when you're closed.",
      sales: "Set your showroom hours accurately. Your AI will suggest appointment times within these hours.",
    },
  },
  services: {
    title: "Your Offerings",
    whatItControls: "Your services or menu items, pricing, and descriptions",
    howAIUsesIt: [
      "Matches what callers need to the right service",
      "Quotes accurate prices based on your settings",
      "Recommends add-ons and upsells when appropriate",
    ],
    examplesByMode: {
      service: "\"Our drain cleaning starts at $149. Would you like me to schedule that?\"",
      dispatch: "\"For a local tow within 10 miles, that's $95. If you're 15 miles out, it's $120 — that's our base plus $5 per mile over 10. Does that work for you?\"",
      food: "\"Our large pepperoni is $18.99. Want me to add that to your order?\"",
      medical: "\"A new patient consultation is $150, and we accept most major insurance.\"",
      general: "\"We have several options available. Let me walk you through them.\"",
      sales: "\"We have a great selection of certified pre-owned vehicles starting around $18,000. What type of vehicle are you looking for?\"",
    },
    tipsByMode: {
      service: "Include duration estimates so the AI can schedule appointments correctly.",
      dispatch: "Set up distance tiers for different mileage ranges. The AI calculates quotes automatically using your base location. Add services for towing, jump starts, lockouts, fuel delivery, and tire changes.",
      food: "Add modifiers like 'add cheese +$2' so the AI can customize orders.",
      medical: "List both self-pay rates and insurance options so the AI can answer cost questions.",
      general: "The more detail you add, the better the AI can match callers to what they need.",
      sales: "Add your main product categories with price ranges so the AI can match callers to the right inventory.",
    },
  },
  "service-area": {
    title: "Coverage & ETA",
    whatItControls: "Where you provide service, ETAs, and out-of-area handling",
    howAIUsesIt: [
      "Checks if the caller's location is within your service area",
      "Calculates realistic ETAs based on distance and current busyness",
      "Politely declines or offers callbacks for out-of-area requests",
    ],
    examplesByMode: {
      service: "\"We serve a 25-mile radius from downtown. What's your ZIP code?\"",
      dispatch: "\"We cover all of Orange County and parts of LA. What's the exact pickup address so I can give you an accurate ETA?\"",
      food: "\"We deliver within 5 miles of the restaurant. What's your address?\"",
      medical: "\"We see patients from anywhere, but our office is located in...\"",
      general: "\"Let me confirm we can help in your area. What city are you in?\"",
      sales: "\"We serve customers across the entire metro area. We can also arrange delivery within 100 miles of our location.\"",
    },
    tipsByMode: {
      service: "Set a smaller 'same-day' radius so urgent jobs are close enough to squeeze in.",
      dispatch: "Your base address (shop/lot) is used to calculate drive-out times and ETAs. Set your busy buffer to add time when you're slammed. Define coverage zones for highways vs. remote areas if they have different pricing.",
      food: "Delivery radius affects whether the AI offers delivery or suggests pickup instead.",
      medical: "If you do telehealth, you can serve patients outside your physical location.",
      general: "Clear out-of-area messaging prevents frustration for callers you can't help.",
      sales: "If you offer delivery or home showings, set your travel radius here so the AI knows what to offer.",
    },
  },
  availability: {
    title: "Calendar & Scheduling",
    whatItControls: "Calendar sync and real-time availability for appointments",
    howAIUsesIt: [
      "Checks your calendar before offering appointment times",
      "Avoids double-booking automatically",
      "Respects blocked times and buffer settings",
    ],
    examplesByMode: {
      service: "\"I see we have openings tomorrow at 10 AM and 2 PM. Which works better?\"",
      dispatch: "\"For scheduled tows, I have tomorrow morning or afternoon available. For right now, I can get someone to you in about 30 to 45 minutes.\"",
      food: "\"We can have that ready for you in about 20 minutes.\"",
      medical: "\"Dr. Smith has an opening this Thursday at 2:30. Would that work?\"",
      general: "\"Let me check what's available... I can offer you Thursday or Friday.\"",
      sales: "\"I can schedule a private showing for you. We have openings tomorrow afternoon or Saturday morning.\"",
    },
    tipsByMode: {
      service: "Connect your Google or Outlook calendar for real-time availability.",
      dispatch: "Calendar is optional for dispatch — most calls are immediate. Your busyness slider on the dashboard affects how the AI quotes ETAs for on-demand jobs.",
      food: "Prep time settings are more important than calendar for food businesses.",
      medical: "Block lunch hours and admin time so the AI doesn't book into them.",
      general: "The AI will only offer times that are actually available on your calendar.",
      sales: "Connect your calendar so the AI can book showroom appointments and showings without double-booking your team.",
    },
  },
  policies: {
    title: "Business Rules & Policies",
    whatItControls: "Cancellations, deposits, payments, and what your AI should never promise",
    howAIUsesIt: [
      "Explains policies before they become objections",
      "Collects required information from callers",
      "Avoids making commitments you can't keep",
    ],
    examplesByMode: {
      service: "\"We do require a $50 deposit to hold your spot, refundable if you cancel 24 hours ahead.\"",
      dispatch: "\"Payment is due when the driver arrives. We accept cash, card, Apple Pay, and Zelle. If you cancel after we dispatch, there's a $50 cancellation fee.\"",
      food: "\"We accept all major credit cards. Will this be for pickup or delivery?\"",
      medical: "\"We'll verify your insurance before your visit. Copays are due at time of service.\"",
      general: "\"Let me explain our cancellation policy before we book...\"",
      sales: "\"We offer a 5-day return policy on all vehicles, and our financing department can get you pre-approved in minutes.\"",
    },
    tipsByMode: {
      service: "Write policies as if speaking — the AI reads them naturally to callers.",
      dispatch: "Key dispatch policies: payment timing (on-scene vs. prepay), cancellation fees by stage (after dispatch, en route, on scene), storage rates, release requirements (ID, registration, lien sale days), and impound lot hours.",
      food: "Clear delivery minimums and fees prevent confusion on the call.",
      medical: "HIPAA settings control what the AI can and cannot discuss about patient info.",
      general: "The 'Never Promise' section prevents the AI from over-committing.",
      sales: "Include your return policy, warranty info, financing terms, and trade-in process so the AI can answer confidently.",
    },
  },
  knowledge: {
    title: "FAQs & Knowledge Base",
    whatItControls: "Frequently asked questions, objection handling, and custom knowledge",
    howAIUsesIt: [
      "Answers common questions instantly without guessing",
      "Handles price objections and competitor comparisons",
      "References uploaded documents for detailed info",
    ],
    examplesByMode: {
      service: "\"Yes, we're fully licensed and insured. We've been in business since 2008.\"",
      dispatch: "\"We accept AAA, your insurance roadside assistance, and all motor clubs. Just let your provider know you're using FastTow and give them our number.\"",
      food: "\"Our gluten-free options include the cauliflower crust and all our salads.\"",
      medical: "\"We accept most major insurance plans. I can verify yours when you come in.\"",
      general: "\"That's a great question — let me explain how that works...\"",
      sales: "\"Yes, we offer financing with rates as low as 2.9% APR for qualified buyers. Would you like to get pre-approved?\"",
    },
    tipsByMode: {
      service: "Add FAQs about licensing, insurance, and warranties — callers ask these often.",
      dispatch: "Top dispatch FAQs: AAA/motor club acceptance, payment methods, ETA accuracy, what happens if I'm not with my car, can someone else pick up my vehicle, storage fees, and how long until lien sale.",
      food: "Allergen info, dietary options, and ingredient questions are common.",
      medical: "Pre-visit instructions and insurance questions reduce confusion.",
      general: "The more FAQs you add, the fewer 'I don't know' responses from your AI.",
      sales: "Add FAQs about financing, warranties, trade-ins, and delivery — these are the questions sales prospects ask most.",
    },
  },
  "ai-behavior": {
    title: "AI Voice & Behavior",
    whatItControls: "How your AI greets callers, handles uncertainty, and communicates",
    howAIUsesIt: [
      "Delivers your custom greeting on every call",
      "Uses your fallback script when unsure how to proceed",
      "Follows your tone and personality preferences",
    ],
    examplesByMode: {
      service: "\"Hi! Thanks for calling ABC Plumbing, this is your AI assistant. How can I help?\"",
      dispatch: "\"Thanks for calling QuickTow. Are you safe? Do you need a tow or roadside assistance right now?\"",
      food: "\"Thanks for calling Mario's! Ready to take your order whenever you are.\"",
      medical: "\"Thank you for calling Oakwood Medical. How may I direct your call?\"",
      general: "\"Hi, thanks for calling! How can I help you today?\"",
      sales: "\"Hi, thanks for calling Prestige Auto! I can help you find the right vehicle, check availability, or schedule a visit. What are you looking for?\"",
    },
    tipsByMode: {
      service: "A friendly, professional tone works best. The AI should sound helpful, not robotic.",
      dispatch: "Dispatch greetings should be short and action-oriented. Ask if they're safe first, then get straight to 'tow or roadside?' — every second counts when someone is stranded.",
      food: "Upbeat and casual works well for restaurants. Sound hungry!",
      medical: "Professional and calm. Patients may be worried — reassure them.",
      general: "Your greeting script is read word-for-word, so make it sound natural.",
      sales: "Sales greetings should be warm and action-oriented. Guide callers toward scheduling an appointment or test drive.",
    },
  },
  fleet: {
    title: "Fleet & Crew",
    whatItControls: "Your drivers, vehicles, and dispatch assignments",
    howAIUsesIt: [
      "Knows which drivers are available for assignment",
      "Matches vehicle type to job requirements (flatbed vs. wheel-lift)",
      "Helps dispatchers assign jobs efficiently",
    ],
    examplesByMode: {
      dispatch: "\"I'll get a driver heading your way. They'll call you when they're close.\"",
    },
    tipsByMode: {
      dispatch: "Add your drivers and vehicles so dispatchers can assign jobs quickly. Each driver can have a default vehicle. The AI doesn't mention specific driver names to callers — it just says 'a driver.'",
    },
  },
  impound: {
    title: "Impound Lot",
    whatItControls: "Impound lot details, storage fees, and release requirements",
    howAIUsesIt: [
      "Answers 'How do I get my car out?' questions",
      "Calculates storage fees based on days stored",
      "Explains what documents are needed for release",
    ],
    examplesByMode: {
      dispatch: "\"Your vehicle has been here for 3 days. That's your tow fee of $150 plus 3 days of storage at $50 per day, so $300 total. You'll need a valid ID and current registration to pick it up.\"",
    },
    tipsByMode: {
      dispatch: "Set your impound lot hours, daily storage rates, grace period, and release requirements (ID, registration, title, insurance). The AI uses these to answer callers looking for their impounded vehicles.",
    },
  },
};

/**
 * Get section helper content with appropriate mode fallbacks
 */
export function getSectionHelper(sectionId: string, mode: BusinessMode): SectionHelperContent | null {
  const content = SECTION_HELPERS[sectionId];
  if (!content) return null;
  return content;
}

/**
 * Get the example for a specific mode, with fallback to general
 */
export function getSectionExample(sectionId: string, mode: BusinessMode): string {
  const content = SECTION_HELPERS[sectionId];
  if (!content) return "";
  return content.examplesByMode[mode] || content.examplesByMode.general || "";
}

/**
 * Get the tip for a specific mode, with fallback to default
 */
export function getSectionTip(sectionId: string, mode: BusinessMode): string {
  const content = SECTION_HELPERS[sectionId];
  if (!content) return "";
  return content.tipsByMode[mode] || content.defaultTip || "";
}

/**
 * Field-level contextual help for form fields
 */
export interface FieldHelpContent {
  label: string;
  description: string;
  examplesByMode?: Partial<Record<BusinessMode, string>>;
  aiUsage: string;
}

export const FIELD_HELP: Record<string, FieldHelpContent> = {
  greeting_script: {
    label: "Greeting Script",
    description: "Exactly what your AI says when answering the phone. Keep it short and natural.",
    examplesByMode: {
      service: "Hi, thanks for calling Mike's Plumbing! How can I help you today?",
      dispatch: "Thanks for calling FastTow. Are you safe? Do you need a tow or roadside assistance?",
      food: "Thanks for calling Bella's Pizza! Ready to take your order.",
      medical: "Thank you for calling Greenview Family Practice. How may I help you?",
    },
    aiUsage: "Read word-for-word at the start of every call",
  },
  fallback_script: {
    label: "Fallback Script",
    description: "What your AI says when it's unsure how to help. Offers to have someone call back.",
    examplesByMode: {
      service: "I want to make sure we get this right. Let me have someone call you back in just a few minutes.",
      dispatch: "Let me have dispatch call you right back to get that sorted out.",
      food: "Let me check with the kitchen and have someone call you right back.",
      medical: "I'll have someone from our office call you back shortly to discuss that.",
    },
    aiUsage: "Used when the AI doesn't have enough information to answer",
  },
  cancellation_policy: {
    label: "Cancellation Policy",
    description: "How much notice you require and any fees for cancellations.",
    examplesByMode: {
      service: "Free cancellation up to 24 hours before your appointment. Late cancellations incur a $50 fee.",
      dispatch: "No fee if you cancel before we dispatch. $50 if driver is assigned, $75 if en route, full service fee if on scene.",
      food: "Orders can be cancelled within 5 minutes of placing. No cancellations after food is prepared.",
      medical: "Please give us 24 hours notice to reschedule. No-shows may be charged $50.",
    },
    aiUsage: "Explained when customers ask about changing or cancelling",
  },
  deposit_policy: {
    label: "Deposit Policy",
    description: "Whether you require deposits and how they work.",
    examplesByMode: {
      service: "We require a $100 deposit to hold your appointment. Applied to your final bill.",
      dispatch: "No deposit required for standard tows. Payment due when service is complete.",
      food: "Catering orders require 50% deposit. Regular orders have no deposit.",
      medical: "Self-pay patients may be asked for a deposit at time of booking.",
    },
    aiUsage: "Mentioned when booking to set expectations about payment",
  },
  service_area_description: {
    label: "Service Area Description",
    description: "Where you provide service, in plain language.",
    examplesByMode: {
      service: "We serve the greater Austin area, including Round Rock, Cedar Park, and Pflugerville.",
      dispatch: "We cover all of Los Angeles County, parts of Orange County, and respond to I-5, I-10, and I-405.",
      food: "We deliver within 5 miles of our restaurant in downtown Chicago.",
      medical: "We see patients from anywhere. Our office is conveniently located off Highway 101.",
    },
    aiUsage: "Used to answer 'Do you serve my area?' questions",
  },
  out_of_area_message: {
    label: "Out of Area Message",
    description: "What to say when a caller is outside your service area.",
    examplesByMode: {
      service: "Unfortunately, we don't serve that area yet. Can I recommend a colleague who does?",
      dispatch: "That's outside our coverage area. Let me get your number and I'll have someone call if we can help, or I can try to find a company that covers that area.",
      food: "We don't deliver to that address, but you're welcome to pick up!",
      medical: "We'd love to see you! Our office is about [X] miles from your location.",
    },
    aiUsage: "Read when the caller's location is outside your defined service area",
  },
  pickup_address: {
    label: "Pickup Address",
    description: "The exact location where the vehicle or caller is stranded.",
    examplesByMode: {
      dispatch: "I need the exact address or cross streets where you're at. If you're on a highway, what mile marker or nearest exit?",
    },
    aiUsage: "Required for dispatch — AI will keep asking until it has a valid address",
  },
  dropoff_address: {
    label: "Dropoff / Destination",
    description: "Where the vehicle needs to be towed to.",
    examplesByMode: {
      dispatch: "Where would you like us to take the vehicle? Your home, a shop, or our lot?",
    },
    aiUsage: "Used to calculate tow distance and final price",
  },
  vehicle_info: {
    label: "Vehicle Information",
    description: "Year, make, model, and color of the vehicle.",
    examplesByMode: {
      dispatch: "What's the year, make, and model of the vehicle? And what color is it so our driver can find you?",
    },
    aiUsage: "Helps dispatch the right equipment and identify the vehicle on scene",
  },
  urgency: {
    label: "Urgency Level",
    description: "How quickly the customer needs service.",
    examplesByMode: {
      dispatch: "Do you need someone right now, or can this be scheduled for later today or tomorrow?",
    },
    aiUsage: "Determines priority in dispatch queue and affects pricing for emergency surcharges",
  },
};

/**
 * Get field help content
 */
export function getFieldHelp(fieldId: string): FieldHelpContent | null {
  return FIELD_HELP[fieldId] || null;
}

/**
 * Get field example for a specific mode
 */
export function getFieldExample(fieldId: string, mode: BusinessMode): string {
  const help = FIELD_HELP[fieldId];
  if (!help?.examplesByMode) return "";
  return help.examplesByMode[mode] || help.examplesByMode.general || Object.values(help.examplesByMode)[0] || "";
}
