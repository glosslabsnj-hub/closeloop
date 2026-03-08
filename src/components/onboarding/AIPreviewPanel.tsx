/**
 * AIPreviewPanel — Shows a live preview of how the AI will greet callers
 * during onboarding Phase 5 (Your AI Assistant).
 */
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Bot, User } from "lucide-react";
import type { AITone } from "@/components/onboarding/CommunicationPreferences";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

interface AIPreviewPanelProps {
  businessName: string;
  businessMode: BusinessMode;
  aiTone: AITone;
  customGreeting: string;
  industrySlug?: string;
}

const TONE_GREETINGS: Record<AITone, (name: string) => string> = {
  professional: (name) =>
    `Thank you for calling ${name}. How may I assist you today?`,
  friendly: (name) =>
    `Hi there! Thanks for calling ${name}. How can I help you today?`,
  casual: (name) =>
    `Hey! You've reached ${name}. What can I do for you?`,
};

const TONE_RESPONSES: Record<AITone, Record<BusinessMode, string>> = {
  professional: {
    service: "I'd be happy to help you with that. I have availability this Thursday at 10 AM or Friday at 2 PM. Which works better for you?",
    food: "I'd be happy to help you with that. What items would you like to order today?",
    dispatch: "I can dispatch someone to you right away. Can you confirm your exact location?",
    medical: "I'd be happy to help you schedule that. Are you a new patient or an existing patient?",
    sales: "Absolutely. Let me go over what we currently have available that might be a good fit for you.",
    general: "I'd be happy to help you with that. Let me check our availability for you right away.",
  },
  friendly: {
    service: "I can definitely help with that! I've got a few openings this week — how does Thursday at 10 AM sound?",
    food: "Great choice! What can I get started for you today?",
    dispatch: "I'll get someone out to you right away! Can you give me your exact location?",
    medical: "Of course! Are you a new patient, or have you been in before?",
    sales: "Sure! Let me tell you about what we've got that might work for you.",
    general: "Great, I can definitely help with that! Let me look at what we have available.",
  },
  casual: {
    service: "No problem! I've got some spots open this week. How about Thursday at 10?",
    food: "Awesome, what are you in the mood for?",
    dispatch: "On it! Where exactly are you right now?",
    medical: "No worries! Have you been here before, or is this your first visit?",
    sales: "For sure! Let me tell you what we've got going on.",
    general: "Sure thing! Let me pull that up for you real quick.",
  },
};

/** Industry-specific caller messages for the preview conversation */
const SLUG_CALLER_MESSAGES: Record<string, string> = {
  plumbing: "Hi, I've got a leak under my kitchen sink. Can someone come take a look?",
  hvac: "My AC isn't cooling. Can I get someone out to take a look?",
  electrical: "I need some outlets installed in my garage. Can you help?",
  "hair-salon": "Hi, I'd like to book a haircut and color for this Saturday.",
  barbershop: "Hey, do you have any openings for a cut today?",
  dental: "I'd like to schedule a cleaning and exam, please.",
  chiropractic: "I've been having back pain. Can I get an adjustment?",
  "house-cleaning": "I need a deep clean for my 3-bedroom house. Are you available this week?",
  "auto-detailing": "I'd like to get a full detail on my SUV. What's your availability?",
  auto_detailing: "I'd like to get a full detail on my SUV. What's your availability?",
  landscaping: "I need my lawn mowed and some bushes trimmed. Can you come out?",
  lawn_care: "My grass is getting long. Can someone come out for a regular mowing?",
  "pest-control": "I think I have a termite problem. Can you send someone to inspect?",
  pest_control: "I think I have a termite problem. Can you send someone to inspect?",
  towing: "My car broke down on Highway 101. I need a tow.",
  "massage-therapy": "I'd like to book a 60-minute deep tissue massage.",
  massage_therapy: "I'd like to book a 60-minute deep tissue massage.",
  veterinary: "My dog needs his annual checkup. Do you have any openings?",
  pizza: "Hi, I'd like to place an order for pickup.",
  general_contractor: "Hi, I want to remodel my kitchen. Can I get a free estimate?",
  handyman: "I have a leaky faucet and a loose door hinge. Can someone come out today?",
  roofing: "I have a roof leak and need someone to come take a look.",
  painting: "I need the exterior of my house painted. Do you offer free quotes?",
  flooring: "I want to replace my carpet with hardwood. Can I schedule a consultation?",
  cleaning: "I need a deep clean for my 3-bedroom house. Are you available this week?",
  "window-cleaning": "I need my windows cleaned inside and out. What do you charge?",
  window_cleaning: "I need my windows cleaned inside and out. What do you charge?",
  salon: "Hi, I'd like to book a haircut and color for this Saturday.",
  nail: "I'd like to book a gel manicure. Do you have any openings tomorrow?",
  nail_salon: "I'd like to book a gel manicure. Do you have any openings tomorrow?",
  spa: "I'd like to schedule a facial. What packages do you offer?",
  "personal-training": "I'd like to book a personal training session. Do you have any openings this week?",
  personal_training: "I'd like to book a personal training session. Do you have any openings this week?",
  consulting: "I'd like to schedule a consultation. What does the process look like?",
  // Auto services
  auto_repair: "My check engine light came on. Can I bring it in for a diagnostic?",
  "auto-repair": "My check engine light came on. Can I bring it in for a diagnostic?",
  tire_shop: "I need four new tires on my SUV. Do you have appointments today?",
  auto_glass: "I've got a crack in my windshield. Can you replace it this week?",
  body_shop: "I have a dent in my bumper from a fender bender. Can I get an estimate?",
  car_wash: "Do you have any openings for a full-service wash and detail today?",
  window_tinting: "I'd like to get my sedan's windows tinted. What packages do you offer?",
  // Home services - extended
  cleaning: "I need a deep clean for my 3-bedroom house before I move in. Are you available Friday?",
  carpet_cleaning: "I have some pet stains on my living room carpet. Can someone come out this week?",
  pressure_washing: "I need my driveway and deck pressure washed before summer. What's your availability?",
  garage_door: "My garage door spring broke this morning. Can someone come out today?",
  appliance_repair: "My refrigerator stopped cooling. How soon can you send someone?",
  locksmith: "I'm locked out of my house. How fast can you get here?",
  moving: "I'm moving across town next Saturday. Do you have trucks available?",
  junk_removal: "I need to clear out a basement. It's quite a bit of stuff. Do you offer free estimates?",
  tree_service: "I have a large tree that came down in a storm. Can you remove it?",
  pool_service: "My pool water is turning green. Can someone come take a look?",
  landscaping: "I need my lawn mowed and some overgrown bushes trimmed back. Are you available this week?",
  painting: "I'd like to get my exterior painted before winter. Do you offer free quotes?",
  flooring: "I want to replace my carpet with hardwood. Can I get a consultation?",
  fencing: "I need about 200 feet of privacy fence installed. Do you offer free estimates?",
  concrete: "I need a new driveway poured. Can I get a quote?",
  gutter: "My gutters are clogged and overflowing. Can you come clean them out?",
  insulation: "I want to add insulation to my attic. Can someone give me an assessment?",
  solar: "I'm interested in going solar. Can I schedule a free consultation?",
  // Medical extended
  orthodontics: "I'd like to schedule a consultation about braces for my teenager.",
  optometry: "I need a new eye exam and prescription update. Do you take new patients?",
  physical_therapy: "My doctor referred me for PT for a knee injury. Are you accepting new patients?",
  dermatology: "I'd like to schedule a full skin check. Are you taking new patients?",
  mental_health: "I'm looking for a therapist. Do you have availability for a new patient?",
  pediatrics: "I need to schedule my son's 2-year well visit. Are you accepting new patients?",
  urgent_care: "I have a bad sore throat and mild fever. Can I come in today?",
  // Pet services
  pet_grooming: "I need to get my golden retriever groomed. Do you have any openings this week?",
  veterinary: "My cat hasn't been eating. Can I get her in to see the vet today?",
};

function getCallerMessage(mode: BusinessMode, slug?: string): string {
  if (slug && SLUG_CALLER_MESSAGES[slug]) return SLUG_CALLER_MESSAGES[slug];
  switch (mode) {
    case "food":
      return "Hi, I'd like to place an order for pickup.";
    case "dispatch":
      return "I need a tow truck. My car broke down on Highway 101.";
    case "medical":
      return "I'd like to schedule a visit with the doctor.";
    case "sales":
      return "I'm interested in what you have available. Can you tell me more?";
    default:
      return "Hi, I'd like to schedule a service call.";
  }
}

export function AIPreviewPanel({
  businessName,
  businessMode,
  aiTone,
  customGreeting,
  industrySlug,
}: AIPreviewPanelProps) {
  const displayName = businessName || "Your Business";

  const greeting = useMemo(() => {
    if (customGreeting.trim()) return customGreeting;
    return TONE_GREETINGS[aiTone](displayName);
  }, [customGreeting, aiTone, displayName]);

  const callerMessage = useMemo(() => getCallerMessage(businessMode, industrySlug), [businessMode, industrySlug]);
  const aiResponse = useMemo(() => TONE_RESPONSES[aiTone][businessMode] || TONE_RESPONSES[aiTone].general, [aiTone, businessMode]);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Phone className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Live Preview</p>
            <p className="text-xs text-muted-foreground">
              Here's how your AI will handle a call
            </p>
          </div>
        </div>

        {/* Simulated conversation */}
        <div className="space-y-3">
          {/* AI Greeting */}
          <div className="flex items-start gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-0.5">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="bg-primary/10 rounded-lg rounded-tl-none px-3 py-2 max-w-[85%]">
              <p className="text-sm">{greeting}</p>
            </div>
          </div>

          {/* Caller */}
          <div className="flex items-start gap-2 justify-end">
            <div className="bg-muted rounded-lg rounded-tr-none px-3 py-2 max-w-[85%]">
              <p className="text-sm text-muted-foreground">{callerMessage}</p>
            </div>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted shrink-0 mt-0.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>

          {/* AI Response */}
          <div className="flex items-start gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-0.5">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="bg-primary/10 rounded-lg rounded-tl-none px-3 py-2 max-w-[85%]">
              <p className="text-sm">{aiResponse}</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-1">
          This is a preview. The actual AI adapts to each caller's needs.
        </p>
      </CardContent>
    </Card>
  );
}
