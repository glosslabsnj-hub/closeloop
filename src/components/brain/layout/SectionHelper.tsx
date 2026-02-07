/**
 * SectionHelper - Industry-aware helper content for Business Brain sections
 * 
 * Provides contextual guidance showing:
 * - What this section controls
 * - How AI uses the data
 * - Industry-specific examples
 */

import { Info, Lightbulb, Mic, Truck, MapPin, Clock, DollarSign, Warehouse, Phone, FileCheck } from "lucide-react";
import type { BusinessMode } from "@/hooks/useTenantConfig";

export interface SectionHelperProps {
  sectionId: string;
  businessMode: BusinessMode;
  className?: string;
}

interface SectionContent {
  whatItControls: string;
  howAIUsesIt: string[];
  examples: Partial<Record<BusinessMode, string>>;
  speechReadyTip?: string;
  dispatchTip?: string;
}

const SECTION_CONTENT: Record<string, SectionContent> = {
  profile: {
    whatItControls: "Your business identity — name, tagline, location, and contact info",
    howAIUsesIt: [
      "Introduces your business by name on every call",
      "Answers 'Where are you located?' questions",
      "Mentions years in business to build trust",
    ],
    examples: {
      service: "\"Thanks for calling Mike's Plumbing, where we've been fixing leaks for 15 years...\"",
      food: "\"Thanks for calling Bella's Pizza, home of the best deep dish in Chicago...\"",
      dispatch: "\"Hi, thanks for calling FastTow 24/7. Do you need a tow or roadside assistance?\"",
      medical: "\"Thanks for calling Greenview Family Practice, where your health comes first...\"",
      general: "\"Thanks for calling [Your Business], how can I help you today?\"",
    },
    dispatchTip: "Your greeting sets the tone. Keep it short — callers in emergencies need fast help.",
  },
  hours: {
    whatItControls: "When your business is open for calls, bookings, and appointments",
    howAIUsesIt: [
      "Tells callers if you're currently open or closed",
      "Adjusts urgency messaging based on time of day",
      "Explains when you'll be available next",
    ],
    examples: {
      service: "\"We're open Monday through Saturday, 8 AM to 6 PM. Would tomorrow morning work?\"",
      food: "\"We're open until 10 PM tonight. Would you like to place an order for pickup?\"",
      dispatch: "\"We're available 24/7 for emergencies. I can dispatch a driver right now.\"",
      medical: "\"Our office hours are 9 AM to 5 PM weekdays. I can check our next available appointment.\"",
      general: "\"We're open until 5 PM today. What can I help you with?\"",
    },
    dispatchTip: "If you're 24/7, the AI will never say you're closed — it'll always offer to send help.",
  },
  services: {
    whatItControls: "Your service catalog with pricing — what you offer and what it costs",
    howAIUsesIt: [
      "Matches what callers need to the right service",
      "Quotes accurate prices based on distance and vehicle type",
      "Recommends add-ons like fuel delivery or tire changes",
    ],
    examples: {
      service: "\"Our drain cleaning starts at $149. Would you like me to schedule that for you?\"",
      food: "\"Our large pepperoni is $18.99. Want me to add that to your order?\"",
      dispatch: "\"Local tow within 10 miles is $95. For your 15-mile tow, that's $120 — $95 base plus $5 per mile over 10.\"",
      medical: "\"We offer both new patient visits and follow-ups. Which are you looking for?\"",
      general: "\"We have several options available. Let me walk you through them.\"",
    },
    speechReadyTip: "Set up distance tiers so the AI can calculate accurate quotes automatically.",
    dispatchTip: "Example: Local Tow ($95 base, +$5/mi over 10), Long Distance ($150 base, +$3.50/mi)",
  },
  "service-area": {
    whatItControls: "Where you provide service — coverage zones, ETAs, and out-of-area responses",
    howAIUsesIt: [
      "Checks if the caller's pickup location is within your service area",
      "Calculates realistic ETAs based on distance from your base",
      "Politely declines or offers callbacks for out-of-area jobs",
    ],
    examples: {
      service: "\"We serve a 25-mile radius from downtown. What's your ZIP code?\"",
      dispatch: "\"We cover all of Orange County. What's the exact pickup address?\"",
      food: "\"We deliver within 5 miles of the restaurant. What's your address?\"",
      general: "\"Let me confirm we can help in your area. What city are you in?\"",
    },
    speechReadyTip: "The AI will ask for exact addresses to calculate distance-based pricing.",
    dispatchTip: "Set your base location (your shop/lot) so the AI can calculate drive times to customers.",
  },
  availability: {
    whatItControls: "Calendar sync and real-time availability for scheduled pickups",
    howAIUsesIt: [
      "Books scheduled (non-emergency) pickups around your busy times",
      "Avoids double-booking automatically",
      "Syncs when you receive new bookings",
    ],
    examples: {
      service: "\"I see we have openings tomorrow at 10 AM and 2 PM. Which works better?\"",
      dispatch: "\"For a scheduled pickup, I have tomorrow morning or afternoon available.\"",
      general: "\"Let me check what's available... I can offer you Thursday or Friday.\"",
    },
    speechReadyTip: "Most dispatch calls are immediate — but some callers want to schedule ahead.",
    dispatchTip: "Calendar sync is optional for dispatch. Urgent calls skip scheduling entirely.",
  },
  policies: {
    whatItControls: "Business rules — payments, requirements, cancellations, and what your AI should/shouldn't promise",
    howAIUsesIt: [
      "Explains policies before they become objections",
      "Collects required information (addresses, vehicle type, etc.)",
      "Avoids making promises you can't keep",
    ],
    examples: {
      service: "\"We do require a $50 deposit to hold your spot, refundable if you cancel 24 hours ahead.\"",
      food: "\"We accept cash and all major credit cards. Will this be for pickup or delivery?\"",
      dispatch: "\"Payment is due when the driver arrives. We accept cash, card, or Apple Pay.\"",
      medical: "\"We'll need your insurance information when you come in for your visit.\"",
    },
    speechReadyTip: "Write policies in first-person as if speaking — the AI reads them naturally.",
    dispatchTip: "Key policies: payment timing, vehicle storage limits, distance-based surcharges.",
  },
  "ai-behavior": {
    whatItControls: "How your AI greets callers, handles uncertainty, and communicates",
    howAIUsesIt: [
      "Delivers your custom greeting on every call",
      "Falls back to your script when unsure how to proceed",
      "Follows your tone and personality preferences",
    ],
    examples: {
      service: "\"Hi! Thanks for calling ABC Plumbing, this is your AI assistant. How can I help you today?\"",
      food: "\"Thanks for calling Mario's! Ready to take your order whenever you are.\"",
      dispatch: "\"Hi, thanks for calling QuickTow. Do you need a tow right now?\"",
      medical: "\"Thank you for calling Oakwood Medical. How may I direct your call?\"",
    },
    speechReadyTip: "Your greeting script is read word-for-word. Make it conversational!",
    dispatchTip: "Dispatch greetings should be short and action-oriented — ask about their situation fast.",
  },
  knowledge: {
    whatItControls: "FAQs, objection responses, and custom knowledge your AI can reference",
    howAIUsesIt: [
      "Answers common questions instantly without guessing",
      "Handles price objections and competitor comparisons smoothly",
      "References uploaded documents for detailed info",
    ],
    examples: {
      service: "\"Yes, we're fully licensed and insured. We've been in business since 2008.\"",
      food: "\"Our gluten-free options include the cauliflower crust and all our salads.\"",
      dispatch: "\"We accept all major roadside assistance programs including AAA. We can bill them directly.\"",
      medical: "\"We accept most major insurance plans. I can verify yours when you come in.\"",
    },
    speechReadyTip: "The more FAQs you add, the fewer 'I don't know' responses your AI will give.",
    dispatchTip: "Add FAQs about: AAA coverage, payment methods, vehicle types you tow, after-hours fees.",
  },
  fleet: {
    whatItControls: "Your crew members, drivers, and fleet vehicles that can be assigned to dispatch jobs",
    howAIUsesIt: [
      "Shows available drivers when assigning jobs",
      "Links drivers to their default vehicles",
      "Tracks vehicle status and assignments",
    ],
    examples: {
      dispatch: "\"John is currently available with Truck #1. I'll assign him to this job.\"",
    },
    speechReadyTip: "Drivers can log in to their own portal to view assigned jobs and update status.",
    dispatchTip: "Set default vehicles for each driver to speed up job assignment.",
  },
};

export function SectionHelper({ sectionId, businessMode, className }: SectionHelperProps) {
  const content = SECTION_CONTENT[sectionId];
  
  if (!content) return null;
  
  const example = content.examples[businessMode] || content.examples.general || Object.values(content.examples)[0];
  const showDispatchTip = businessMode === "dispatch" && content.dispatchTip;
  
  return (
    <div className={`rounded-lg border bg-muted/30 p-4 space-y-3 ${className || ""}`}>
      {/* What it controls */}
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">{content.whatItControls}</p>
      </div>
      
      {/* How AI uses it */}
      <div className="pl-6 space-y-1">
        {content.howAIUsesIt.map((item, i) => (
          <p key={i} className="text-xs text-muted-foreground">• {item}</p>
        ))}
      </div>
      
      {/* Example */}
      {example && (
        <div className="flex items-start gap-2 pt-2 border-t border-border/50">
          <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Example of what AI says:</p>
            <p className="text-sm italic text-foreground/80">{example}</p>
          </div>
        </div>
      )}
      
      {/* Dispatch-specific tip */}
      {showDispatchTip && (
        <div className="flex items-start gap-2 pt-2 border-t border-border/50 bg-primary/5 -mx-4 px-4 py-3 -mb-4 rounded-b-lg">
          <Truck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-primary mb-0.5">Dispatch Tip</p>
            <p className="text-xs text-primary/80">{content.dispatchTip}</p>
          </div>
        </div>
      )}
      
      {/* Speech-ready tip (non-dispatch) */}
      {!showDispatchTip && content.speechReadyTip && (
        <div className="flex items-start gap-2 pt-2 border-t border-border/50">
          <Mic className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-primary/80">{content.speechReadyTip}</p>
        </div>
      )}
    </div>
  );
}
