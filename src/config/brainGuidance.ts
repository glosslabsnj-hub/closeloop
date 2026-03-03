/**
 * Brain Section Guidance Configuration
 *
 * Maps each section ID to guidance content shown when the section is empty/incomplete.
 * Written in business-owner language — no technical jargon.
 */

import type { BusinessMode } from "@/hooks/useTenantConfig";

export interface SectionGuidance {
  /** One sentence explaining what this section does */
  what: string;
  /** One sentence explaining why it matters */
  why: string;
  /** Mode-specific tip (shown as a helpful callout) */
  tips: Partial<Record<BusinessMode, string>> & { default: string };
}

export const SECTION_GUIDANCE: Record<string, SectionGuidance> = {
  "business-info": {
    what: "Your business name, address, and basic details that your AI uses to introduce itself.",
    why: "Your AI says your business name on every call. Without it, callers hear a generic greeting.",
    tips: {
      default: "Make sure the name matches what you say on the phone, not just your legal entity name.",
    },
  },
  "business-hours": {
    what: "Set your operating hours so your AI knows when you're open.",
    why: "Your AI tells callers if you're currently open, and only offers appointment times during business hours.",
    tips: {
      default: "If your hours change seasonally, update them here when the season changes.",
      dispatch: "If you're 24/7, make sure all days show as open. Your AI will tell callers you're always available.",
    },
  },
  "calendar-sync": {
    what: "Connect your Google or Outlook calendar so your AI can see your real-time availability.",
    why: "Without this, your AI might offer times when you're already booked. Calendar sync prevents double-booking.",
    tips: {
      default: "Your AI checks your calendar before offering any appointment time.",
    },
  },
  "templates": {
    what: "Choose a template that matches your industry to pre-fill common settings.",
    why: "Templates give you a head start so you don't have to configure everything from scratch.",
    tips: {
      default: "Pick the closest match — you can always customize everything afterward.",
    },
  },
  "catalog": {
    what: "Add everything you offer — with descriptions and prices so your AI can quote accurately.",
    why: "Your AI uses this to answer 'What do you offer?' and 'How much does that cost?' Without it, your AI can't quote prices.",
    tips: {
      service: "Start with your 5 most popular services. You can always add more later.",
      food: "Add your full menu. Include descriptions, sizes, and prices.",
      dispatch: "Add your tow types (local, long-distance, flatbed) with base pricing.",
      medical: "Add your appointment types (new patient, follow-up, specific procedures) with durations.",
      sales: "Add your key products or categories with pricing. Include features, specs, and financing options.",
      default: "Start with your most popular offerings and add more over time.",
    },
  },
  "scripts": {
    what: "Write exactly how you want your AI to answer the phone.",
    why: "Without this, your AI uses a plain 'Thank you for calling.' Your greeting sets the tone for every conversation.",
    tips: {
      default: "Keep it under 15 seconds. Include your business name and a warm welcome.",
      service: "Example: 'Thanks for calling [Name]! How can we help you today?'",
      food: "Example: 'Thanks for calling [Name]! Would you like to place an order or make a reservation?'",
      dispatch: "Example: 'Thanks for calling [Name]. Do you need a tow, or are you calling about a vehicle in our lot?'",
      medical: "Example: 'Thank you for calling [Name]. Are you calling to schedule an appointment, or do you have a question for our staff?'",
      sales: "Example: 'Thanks for calling [Name]! Are you looking for something specific, or would you like to schedule a visit?'",
    },
  },
  "policies": {
    what: "Tell your AI about your cancellation policy, deposit requirements, and payment terms.",
    why: "When customers ask about policies, your AI can give a clear answer instead of guessing or saying 'let me have someone call you.'",
    tips: {
      default: "Start with your cancellation policy — it's the most commonly asked about.",
      dispatch: "Customers often ask about payment at the scene. Make sure your AI knows what you accept.",
      medical: "Include your no-show policy and any cancellation fees.",
      sales: "Include your deposit policy, return/exchange terms, and financing options.",
    },
  },
  "never-promise": {
    what: "Set hard limits on what your AI is allowed to promise or commit to.",
    why: "Prevents your AI from over-promising on pricing, timelines, or guarantees you can't keep.",
    tips: {
      default: "Common limits: exact completion times, price matches, same-day guarantees.",
      dispatch: "Important: Never promise exact ETAs or guarantee availability during peak hours.",
      medical: "Important: Never promise specific treatment outcomes or diagnose conditions.",
      sales: "Important: Never promise specific financing rates, trade-in values, or prices without manager approval.",
    },
  },
  "required-questions": {
    what: "List the information your AI must collect from every caller before ending the conversation.",
    why: "Ensures you always have what you need to follow up — name, phone number, and the reason for calling.",
    tips: {
      default: "At minimum: name, phone number, and what they need.",
      service: "Also collect: address (for mobile service), preferred date/time, and scope of work.",
      dispatch: "Also collect: exact location, vehicle make/model, and situation description.",
      food: "Also collect: order details, delivery address (if delivery), and desired pickup/delivery time.",
      medical: "Also collect: date of birth, insurance info, and reason for visit.",
      sales: "Also collect: what they're looking for, budget range, timeline, and trade-in info if applicable.",
    },
  },
  "faqs": {
    what: "Add the questions your customers ask most, with your approved answers.",
    why: "Without these, your AI says 'I'm not sure' to common questions. Most businesses start with 5-10.",
    tips: {
      default: "Think about the 5 questions your front desk answers every single day.",
      service: "Popular ones: pricing, scheduling, service area, guarantees, and payment options.",
      food: "Popular ones: hours, allergens, delivery area, reservations, and large party info.",
      dispatch: "Popular ones: ETA, pricing, payment methods, what to do at the scene, and coverage area.",
      medical: "Popular ones: insurance accepted, new patient process, wait times, and telehealth.",
      sales: "Popular ones: financing options, trade-in process, warranty, test drive availability, and delivery.",
    },
  },
  "objections": {
    what: "Tell your AI how to respond when customers say things like 'That's too expensive' or 'I'll call back later.'",
    why: "Without these, your AI accepts objections and lets the caller hang up. With them, your AI keeps pushing toward a booking.",
    tips: {
      default: "The top 3 objections for most businesses: 'too expensive,' 'need to think about it,' and 'can I get a discount?'",
    },
  },
  "coverage": {
    what: "Define where your business provides service — by radius, ZIP codes, or specific areas.",
    why: "Your AI uses this to tell callers whether you can serve their location, and politely declines jobs outside your area.",
    tips: {
      service: "Set your travel radius from your shop or home base.",
      dispatch: "Define your coverage zones with pricing that increases by distance.",
      food: "Set your delivery radius and any minimum order for delivery.",
      sales: "Define your showroom location and any delivery or installation service areas.",
      default: "Define the area you serve so your AI can qualify callers by location.",
    },
  },
  "custom": {
    what: "Add any extra facts, procedures, or details your AI should know that don't fit elsewhere.",
    why: "This is your catch-all. Anything you'd tell a new employee on their first day belongs here.",
    tips: {
      default: "Examples: parking instructions, specific brands you carry, warranty details, seasonal information.",
    },
  },
  "documents": {
    what: "Upload PDFs, menus, or reference materials for your AI to study.",
    why: "Your AI can reference these documents when answering detailed questions.",
    tips: {
      default: "Good uploads: price lists, product catalogs, warranty documents, training manuals.",
      food: "Upload your printed menu — your AI will learn every item from it.",
    },
  },
  "guidelines": {
    what: "Give your AI special instructions for how to handle specific situations.",
    why: "These are like notes you'd give a new employee: 'Always mention our warranty' or 'Don't discuss competitor pricing.'",
    tips: {
      default: "Keep each guideline short and specific. Think of them as sticky notes for your AI.",
    },
  },
  "intelligence": {
    what: "Control how your AI learns and adapts over time.",
    why: "Your AI can remember returning callers and learn from conversations to improve.",
    tips: {
      default: "Most businesses leave these at their defaults. Adjust only if you notice issues.",
    },
  },
  "custom-policies": {
    what: "Add any additional rules or policies your AI should follow beyond the standard ones.",
    why: "For anything that doesn't fit in cancellation, deposits, or payment policies.",
    tips: {
      default: "Examples: warranty terms, return policies, special conditions for certain services.",
    },
  },
  "booking-delivery": {
    what: "Choose where confirmed bookings get sent — email, calendar, or your booking system.",
    why: "Without this, your AI confirms bookings but you might not see them in time.",
    tips: {
      default: "Email is the quickest to set up. Connect your booking software later if you use one.",
    },
  },
  "ai-behavior-mode": {
    what: "Choose what your AI does on calls — take messages, book appointments, or handle the full conversation.",
    why: "This is the single most impactful setting. It determines whether your AI is a receptionist, a booking agent, or a full service rep.",
    tips: {
      default: "Start with 'Book appointments' if you're a service business. Switch to 'Full service' once you've trained your AI with FAQs and policies.",
      dispatch: "Most towing companies use 'Full service' so the AI can collect all job details and dispatch immediately.",
      food: "Use 'Full service' so your AI can take orders, answer menu questions, and handle reservations.",
    },
  },
  "call-flow": {
    what: "Set the order your AI follows on calls — schedule first, or check urgency first.",
    why: "Controls whether your AI leads with 'When would you like to come in?' or 'What's going on?' This affects conversion rates.",
    tips: {
      default: "Schedule-first works best for appointment-based businesses. Urgency-first is better if you need to triage before booking.",
      service: "If most callers already know what they need, use schedule-first. If they often need diagnosis, use urgency-first.",
    },
  },
  "booking-behavior": {
    what: "Choose whether your AI confirms bookings instantly or holds them for your review.",
    why: "Auto-confirm gives callers instant gratification. Pending mode gives you control but adds a delay before the customer hears back.",
    tips: {
      default: "Auto-confirm is recommended if your calendar is connected. Use pending mode if you need to manually approve appointments.",
      medical: "Many practices prefer pending mode so staff can verify insurance and prepare for the visit.",
    },
  },
  "team": {
    what: "Add your staff members so your AI knows who works at your business.",
    why: "When callers ask for a specific person, your AI can confirm they work there and route or schedule accordingly.",
    tips: {
      default: "Add names and roles so your AI can say 'Let me check Sarah's schedule' instead of 'Let me check if someone is available.'",
      medical: "Include each provider's specialties so your AI can match patients to the right doctor.",
    },
  },
  "additional-services": {
    what: "Add secondary services your business offers beyond your main offerings.",
    why: "Callers sometimes ask about things outside your core services. Having these listed means your AI can answer instead of saying 'I don't know.'",
    tips: {
      default: "Think about what customers ask for that isn't your main service — gift cards, maintenance plans, add-ons, etc.",
    },
  },
  "callback-delivery": {
    what: "Choose how you get notified when your AI takes a callback request.",
    why: "If a caller asks to be called back, you need to know about it quickly so you can follow up while the lead is still warm.",
    tips: {
      default: "Email notifications are on by default. Add SMS for faster alerts if callbacks are time-sensitive.",
    },
  },
  "review": {
    what: "Items your AI flagged for your review — new questions it couldn't answer, or suggestions for improvement.",
    why: "Your AI gets smarter over time. Reviewing these items helps fill gaps in its knowledge so it handles more calls perfectly.",
    tips: {
      default: "Check this weekly. Each item you address means fewer 'I'll have to check on that' moments on future calls.",
    },
  },
  "aftercare": {
    what: "Instructions your AI shares with customers after they book — how to prepare, what to bring, etc.",
    why: "Reduces no-shows and last-minute questions. Customers arrive prepared and your staff spends less time explaining basics.",
    tips: {
      default: "Common aftercare: confirmation details, preparation steps, what to bring, and how to reschedule.",
      medical: "Include pre-appointment instructions: fasting requirements, forms to fill out, what to bring.",
      service: "Include prep steps: clear the work area, secure pets, ensure someone is home.",
    },
  },
  "competitors": {
    what: "Tell your AI how to handle questions about your competitors.",
    why: "Callers sometimes mention competitors or ask 'Why should I choose you?' Your AI can highlight your advantages instead of going silent.",
    tips: {
      default: "Focus on what makes you better — don't bash competitors. Highlight your strengths, reviews, and guarantees.",
    },
  },
  "seasonal": {
    what: "Add seasonal changes, holiday hours, or upcoming events your AI should know about.",
    why: "Prevents your AI from giving outdated information during holidays, special promotions, or seasonal schedule changes.",
    tips: {
      default: "Update before major holidays. Your AI will automatically mention adjusted hours and any special offers.",
    },
  },
  "pricing-rules": {
    what: "Set how your pricing works — flat rate, by distance, by vehicle type, etc.",
    why: "Your AI uses these rules to give accurate quotes instead of vague answers when callers ask 'How much will it cost?'",
    tips: {
      dispatch: "Most towing companies use distance-based pricing. Set your base rate and per-mile charge.",
      default: "Choose the pricing model that matches how you actually charge customers.",
    },
  },
  "service-coverage": {
    what: "Configure scheduling rules — how far out customers can book and appointment durations.",
    why: "Prevents your AI from booking appointments too far in advance or not leaving enough time between jobs.",
    tips: {
      default: "Set realistic buffer times between appointments to avoid running behind schedule.",
    },
  },
  "workload": {
    what: "Tell your AI about your current workload and availability.",
    why: "When you're slammed, your AI can set realistic expectations instead of promising same-day service you can't deliver.",
    tips: {
      dispatch: "Update this when you're booked up. Your AI will adjust ETAs and let callers know about wait times.",
      default: "Keeping this updated helps your AI give accurate availability information.",
    },
  },
  "hipaa": {
    what: "Enable HIPAA-compliant mode for handling protected health information.",
    why: "Required for medical practices. Ensures your AI handles patient data according to HIPAA regulations.",
    tips: {
      medical: "This should always be enabled for healthcare providers. It adds data handling safeguards to every call.",
      default: "Only enable this if your business handles protected health information.",
    },
  },
};
