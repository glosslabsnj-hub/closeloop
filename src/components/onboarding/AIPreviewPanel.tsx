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
}

const TONE_GREETINGS: Record<AITone, (name: string) => string> = {
  professional: (name) =>
    `Thank you for calling ${name}. How may I assist you today?`,
  friendly: (name) =>
    `Hi there! Thanks for calling ${name}. How can I help you today?`,
  casual: (name) =>
    `Hey! You've reached ${name}. What can I do for you?`,
};

const TONE_RESPONSES: Record<AITone, string> = {
  professional:
    "I'd be happy to help you with that. Let me check our availability for you right away.",
  friendly:
    "Great, I can definitely help with that! Let me look at what we have available.",
  casual:
    "Sure thing! Let me pull that up for you real quick.",
};

function getCallerMessage(mode: BusinessMode): string {
  switch (mode) {
    case "food":
      return "Hi, I'd like to place an order for pickup.";
    case "dispatch":
      return "I need a tow truck. My car broke down on Highway 101.";
    case "medical":
      return "I'd like to schedule an appointment with the doctor.";
    case "sales":
      return "I'm interested in what you have available. Can you tell me more?";
    default:
      return "I'd like to schedule an appointment, please.";
  }
}

export function AIPreviewPanel({
  businessName,
  businessMode,
  aiTone,
  customGreeting,
}: AIPreviewPanelProps) {
  const displayName = businessName || "Your Business";

  const greeting = useMemo(() => {
    if (customGreeting.trim()) return customGreeting;
    return TONE_GREETINGS[aiTone](displayName);
  }, [customGreeting, aiTone, displayName]);

  const callerMessage = useMemo(() => getCallerMessage(businessMode), [businessMode]);
  const aiResponse = useMemo(() => TONE_RESPONSES[aiTone], [aiTone]);

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
