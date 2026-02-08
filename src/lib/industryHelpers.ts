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
      dispatch: "\"Hi, thanks for calling FastTow 24/7. Do you need a tow or roadside assistance?\"",
      food: "\"Thanks for calling Bella's Pizza, home of the best deep dish in Chicago!\"",
      medical: "\"Thank you for calling Greenview Family Practice, where your health comes first.\"",
      general: "\"Thanks for calling [Your Business], how can I help you today?\"",
    },
    tipsByMode: {
      service: "A strong tagline like 'Licensed & insured since 2010' builds instant trust with callers.",
      dispatch: "Keep your greeting short — callers in emergencies need fast help, not long introductions.",
      food: "Mention your specialty! 'Home of the famous...' makes you memorable.",
      medical: "Include credentials like 'Board-certified' to establish professionalism immediately.",
      general: "Your tagline is the first impression — make it count!",
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
      dispatch: "\"We're available 24/7 for emergencies. I can dispatch a driver right now.\"",
      food: "\"We're open until 10 PM tonight. Would you like to place an order?\"",
      medical: "\"Our office hours are 9 AM to 5 PM weekdays. I can check our next available.\"",
      general: "\"We're open until 5 PM today. What can I help you with?\"",
    },
    tipsByMode: {
      service: "Set your hours accurately — the AI won't offer appointments outside these times.",
      dispatch: "If you're 24/7, the AI will never say you're closed — it'll always offer to send help.",
      food: "Consider different hours for pickup vs. delivery if your kitchen closes earlier.",
      medical: "Include lunch breaks if your office is closed during certain hours.",
      general: "Holiday hours should be updated in advance so the AI knows when you're closed.",
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
      dispatch: "\"Local tow within 10 miles is $95. For a 15-mile tow, that's $120 — base plus $5 per mile over 10.\"",
      food: "\"Our large pepperoni is $18.99. Want me to add that to your order?\"",
      medical: "\"A new patient consultation is $150, and we accept most major insurance.\"",
      general: "\"We have several options available. Let me walk you through them.\"",
    },
    tipsByMode: {
      service: "Include duration estimates so the AI can schedule appointments correctly.",
      dispatch: "Set up distance tiers so the AI calculates accurate quotes automatically.",
      food: "Add modifiers like 'add cheese +$2' so the AI can customize orders.",
      medical: "List both self-pay rates and insurance options so the AI can answer cost questions.",
      general: "The more detail you add, the better the AI can match callers to what they need.",
    },
  },
  "service-area": {
    title: "Coverage & ETA",
    whatItControls: "Where you provide service, ETAs, and out-of-area handling",
    howAIUsesIt: [
      "Checks if the caller's location is within your service area",
      "Calculates realistic ETAs based on distance",
      "Politely declines or offers callbacks for out-of-area requests",
    ],
    examplesByMode: {
      service: "\"We serve a 25-mile radius from downtown. What's your ZIP code?\"",
      dispatch: "\"We cover all of Orange County. What's the exact pickup address?\"",
      food: "\"We deliver within 5 miles of the restaurant. What's your address?\"",
      medical: "\"We see patients from anywhere, but our office is located in...\"",
      general: "\"Let me confirm we can help in your area. What city are you in?\"",
    },
    tipsByMode: {
      service: "Set a smaller 'same-day' radius so urgent jobs are close enough to squeeze in.",
      dispatch: "Your base location (shop/lot) is used to calculate drive times — keep it accurate.",
      food: "Delivery radius affects whether the AI offers delivery or suggests pickup instead.",
      medical: "If you do telehealth, you can serve patients outside your physical location.",
      general: "Clear out-of-area messaging prevents frustration for callers you can't help.",
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
      dispatch: "\"For a scheduled pickup, I have tomorrow morning or afternoon available.\"",
      food: "\"We can have that ready for you in about 20 minutes.\"",
      medical: "\"Dr. Smith has an opening this Thursday at 2:30. Would that work?\"",
      general: "\"Let me check what's available... I can offer you Thursday or Friday.\"",
    },
    tipsByMode: {
      service: "Connect your Google or Outlook calendar for real-time availability.",
      dispatch: "Calendar sync is optional for dispatch — most calls are immediate, not scheduled.",
      food: "Prep time settings are more important than calendar for food businesses.",
      medical: "Block lunch hours and admin time so the AI doesn't book into them.",
      general: "The AI will only offer times that are actually available on your calendar.",
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
      dispatch: "\"Payment is due when the driver arrives. We accept cash, card, or Apple Pay.\"",
      food: "\"We accept all major credit cards. Will this be for pickup or delivery?\"",
      medical: "\"We'll verify your insurance before your visit. Copays are due at time of service.\"",
      general: "\"Let me explain our cancellation policy before we book...\"",
    },
    tipsByMode: {
      service: "Write policies as if speaking — the AI reads them naturally to callers.",
      dispatch: "Key policies: payment timing, cancellation fees, storage rates for impound.",
      food: "Clear delivery minimums and fees prevent confusion on the call.",
      medical: "HIPAA settings control what the AI can and cannot discuss about patient info.",
      general: "The 'Never Promise' section prevents the AI from over-committing.",
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
      dispatch: "\"We accept all major roadside assistance programs including AAA.\"",
      food: "\"Our gluten-free options include the cauliflower crust and all our salads.\"",
      medical: "\"We accept most major insurance plans. I can verify yours when you come in.\"",
      general: "\"That's a great question — let me explain how that works...\"",
    },
    tipsByMode: {
      service: "Add FAQs about licensing, insurance, and warranties — callers ask these often.",
      dispatch: "Include FAQs about AAA coverage, payment methods, and after-hours fees.",
      food: "Allergen info, dietary options, and ingredient questions are common.",
      medical: "Pre-visit instructions and insurance questions reduce confusion.",
      general: "The more FAQs you add, the fewer 'I don't know' responses from your AI.",
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
      dispatch: "\"Hi, thanks for calling QuickTow. Do you need a tow right now?\"",
      food: "\"Thanks for calling Mario's! Ready to take your order whenever you are.\"",
      medical: "\"Thank you for calling Oakwood Medical. How may I direct your call?\"",
      general: "\"Hi, thanks for calling! How can I help you today?\"",
    },
    tipsByMode: {
      service: "A friendly, professional tone works best. The AI should sound helpful, not robotic.",
      dispatch: "Dispatch greetings should be short and action-oriented — get to the point fast.",
      food: "Upbeat and casual works well for restaurants. Sound hungry!",
      medical: "Professional and calm. Patients may be worried — reassure them.",
      general: "Your greeting script is read word-for-word, so make it sound natural.",
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
      dispatch: "Hi, thanks for calling FastTow. Do you need a tow or roadside assistance?",
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
      dispatch: "Let me have dispatch call you right back with more info on that.",
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
      dispatch: "No fee if you cancel before we dispatch. $50 if driver is already en route.",
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
      dispatch: "No deposit required. Payment due when service is complete.",
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
      dispatch: "We cover all of Los Angeles County and parts of Orange County.",
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
      dispatch: "That's outside our coverage area. Let me get your number and I'll have someone call if we can help.",
      food: "We don't deliver to that address, but you're welcome to pick up!",
      medical: "We'd love to see you! Our office is about [X] miles from your location.",
    },
    aiUsage: "Read when the caller's location is outside your defined service area",
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
