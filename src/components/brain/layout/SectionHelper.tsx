/**
 * SectionHelper - Industry-aware helper content for Business Brain sections
 * 
 * Provides contextual guidance showing:
 * - What this section controls
 * - How AI uses the data
 * - Industry-specific examples
 */

import { Info, Lightbulb, Mic } from "lucide-react";
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
      dispatch: "\"Thanks for calling FastTow 24/7, serving the entire Bay Area...\"",
      medical: "\"Thanks for calling Greenview Family Practice, where your health comes first...\"",
      general: "\"Thanks for calling [Your Business], how can I help you today?\"",
    },
  },
  hours: {
    whatItControls: "When your business is open for calls, bookings, and appointments",
    howAIUsesIt: [
      "Tells callers if you're currently open or closed",
      "Suggests booking times within your operating hours",
      "Explains when you'll be available next",
    ],
    examples: {
      service: "\"We're open Monday through Saturday, 8 AM to 6 PM. Would tomorrow morning work?\"",
      food: "\"We're open until 10 PM tonight. Would you like to place an order for pickup?\"",
      dispatch: "\"We're available 24/7 for emergencies. How urgent is your situation?\"",
      medical: "\"Our office hours are 9 AM to 5 PM weekdays. I can check our next available appointment.\"",
      general: "\"We're open until 5 PM today. What can I help you with?\"",
    },
  },
  services: {
    whatItControls: "Your service catalog, menu items, and pricing",
    howAIUsesIt: [
      "Matches caller needs to the right service",
      "Quotes accurate prices when asked",
      "Recommends services based on what the caller describes",
    ],
    examples: {
      service: "\"Our drain cleaning starts at $149. Would you like me to schedule that for you?\"",
      food: "\"Our large pepperoni is $18.99. Want me to add that to your order?\"",
      dispatch: "\"Standard towing within 10 miles is $95. Let me get your pickup location.\"",
      medical: "\"We offer both new patient visits and follow-ups. Which are you looking for?\"",
      general: "\"We have several options available. Let me walk you through them.\"",
    },
    speechReadyTip: "Include clear pricing info — the AI will quote exact amounts or 'starting at' ranges based on your setup.",
  },
  "service-area": {
    whatItControls: "Where you provide service, travel times, and out-of-area messaging",
    howAIUsesIt: [
      "Checks if the caller's location is within your coverage",
      "Calculates estimated arrival times based on distance",
      "Politely declines jobs outside your service area",
    ],
    examples: {
      service: "\"We serve a 25-mile radius from downtown. What's your ZIP code?\"",
      dispatch: "\"We cover all of Orange County. What's the pickup address?\"",
      food: "\"We deliver within 5 miles of the restaurant. What's your address?\"",
      general: "\"Let me confirm we can help in your area. What city are you in?\"",
    },
    speechReadyTip: "Write your out-of-area message exactly as you want the AI to say it.",
  },
  availability: {
    whatItControls: "Calendar sync and real-time availability for bookings",
    howAIUsesIt: [
      "Checks your calendar before offering appointment times",
      "Avoids double-booking automatically",
      "Syncs when you receive new bookings",
    ],
    examples: {
      service: "\"I see we have openings tomorrow at 10 AM and 2 PM. Which works better?\"",
      medical: "\"Dr. Smith has availability next Tuesday at 3 PM. Should I book that?\"",
      general: "\"Let me check what's available... I can offer you Thursday or Friday.\"",
    },
    speechReadyTip: "Connected calendars sync automatically — you don't need to refresh manually.",
  },
  policies: {
    whatItControls: "Business rules — cancellations, deposits, payment terms, and required questions",
    howAIUsesIt: [
      "Explains policies before they become objections",
      "Collects required information from every caller",
      "Sets proper expectations about deposits and payments",
    ],
    examples: {
      service: "\"We do require a $50 deposit to hold your spot, refundable if you cancel 24 hours ahead.\"",
      food: "\"We accept cash and all major credit cards. Will this be for pickup or delivery?\"",
      dispatch: "\"We accept payment on arrival. Cash, card, or Apple Pay all work.\"",
      medical: "\"We'll need your insurance information when you come in for your visit.\"",
    },
    speechReadyTip: "Write policies in first-person as if you're speaking them — the AI will read them naturally.",
  },
  "ai-behavior": {
    whatItControls: "How your AI greets callers, handles uncertainty, and speaks",
    howAIUsesIt: [
      "Delivers your custom greeting on every call",
      "Falls back to your script when unsure how to proceed",
      "Follows your tone and personality preferences",
    ],
    examples: {
      service: "\"Hi! Thanks for calling ABC Plumbing, this is your AI assistant. How can I help you today?\"",
      food: "\"Thanks for calling Mario's! Ready to take your order whenever you are.\"",
      dispatch: "\"Hi, this is the dispatch line for QuickTow. Do you need a tow right now?\"",
      medical: "\"Thank you for calling Oakwood Medical. How may I direct your call?\"",
    },
    speechReadyTip: "Your greeting script is read word-for-word. Make it conversational!",
  },
  knowledge: {
    whatItControls: "FAQs, objection responses, and custom knowledge your AI can reference",
    howAIUsesIt: [
      "Answers common questions instantly without guessing",
      "Handles price objections and hesitation smoothly",
      "References uploaded documents for detailed info",
    ],
    examples: {
      service: "\"Yes, we're fully licensed and insured. We've been in business since 2008.\"",
      food: "\"Our gluten-free options include the cauliflower crust and all our salads.\"",
      dispatch: "\"We accept all major roadside assistance programs including AAA.\"",
      medical: "\"We accept most major insurance plans. I can verify yours when you come in.\"",
    },
    speechReadyTip: "The more FAQs you add, the fewer 'I don't know' responses your AI will give.",
  },
};

export function SectionHelper({ sectionId, businessMode, className }: SectionHelperProps) {
  const content = SECTION_CONTENT[sectionId];
  
  if (!content) return null;
  
  const example = content.examples[businessMode] || content.examples.general || Object.values(content.examples)[0];
  
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
            <p className="text-xs font-medium text-muted-foreground mb-1">Example of what AI might say:</p>
            <p className="text-sm italic text-foreground/80">{example}</p>
          </div>
        </div>
      )}
      
      {/* Speech-ready tip */}
      {content.speechReadyTip && (
        <div className="flex items-start gap-2 pt-2 border-t border-border/50">
          <Mic className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-primary/80">{content.speechReadyTip}</p>
        </div>
      )}
    </div>
  );
}
