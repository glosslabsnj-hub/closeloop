import React from "react";
/**
 * Phase 5: YOUR AI ASSISTANT — Tone, booking mode, after-hours behavior + live preview
 */
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";
import type { AITone, AIBookingMode } from "@/components/onboarding/CommunicationPreferences";
import { AIPreviewPanel } from "@/components/onboarding/AIPreviewPanel";

export type AfterHoursBehavior = "ai_24_7" | "voicemail" | "text_back";

interface OnboardingAIProps {
  businessName: string;
  businessMode: BusinessMode;
  aiTone: AITone;
  onAiToneChange: (tone: AITone) => void;
  bookingMode: AIBookingMode;
  onBookingModeChange: (mode: AIBookingMode) => void;
  afterHours: AfterHoursBehavior;
  onAfterHoursChange: (behavior: AfterHoursBehavior) => void;
  customGreeting: string;
  onCustomGreetingChange: (greeting: string) => void;
}

const toneOptions: { value: AITone; label: string; description: string; emoji: string }[] = [
  { value: "professional", label: "Professional", description: "Formal, polished, business-like", emoji: "🤝" },
  { value: "friendly", label: "Friendly", description: "Warm, approachable, conversational", emoji: "😊" },
  { value: "casual", label: "Casual", description: "Relaxed, laid-back, like a neighbor", emoji: "👋" },
];

const bookingOptions: { value: AIBookingMode; label: string; description: string; recommended?: boolean }[] = [
  { value: "auto_book", label: "Book automatically", description: "AI checks your calendar and books instantly", recommended: true },
  { value: "pending_approval", label: "Confirm first", description: "AI suggests times, waits for your approval" },
  { value: "callback_only", label: "Take message", description: "AI collects info, you call back to book" },
];

const afterHoursOptions: { value: AfterHoursBehavior; label: string; description: string }[] = [
  { value: "ai_24_7", label: "AI answers 24/7", description: "AI handles calls anytime, day or night" },
  { value: "voicemail", label: "Go to voicemail", description: "Callers leave a message after hours" },
  { value: "text_back", label: "Text back with hours", description: "Auto-text callers your business hours" },
];

export const OnboardingAI = React.memo(function OnboardingAI({
  businessName,
  businessMode,
  aiTone,
  onAiToneChange,
  bookingMode,
  onBookingModeChange,
  afterHours,
  onAfterHoursChange,
  customGreeting,
  onCustomGreetingChange,
}: OnboardingAIProps) {
  const showBookingMode = businessMode !== "dispatch";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Customize your AI receptionist
        </h2>
        <p className="mt-2 text-muted-foreground">
          Set the tone and behavior. The preview below updates live as you make changes.
        </p>
      </div>

      {/* AI Preview */}
      <AIPreviewPanel
        businessName={businessName}
        businessMode={businessMode}
        aiTone={aiTone}
        customGreeting={customGreeting}
      />

      {/* Tone Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Choose how the AI sounds:</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-[200px]">This affects word choice, formality, and conversational style across all calls.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {toneOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onAiToneChange(opt.value)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border text-center transition-all",
                aiTone === opt.value
                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                  : "hover:bg-muted/50"
              )}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <span className="text-sm font-medium">{opt.label}</span>
              <span className="text-xs text-muted-foreground">{opt.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Booking Mode */}
      {showBookingMode && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">When someone wants to book:</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[200px]">Auto-booking requires a connected calendar. You can change this anytime.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <RadioGroup
              value={bookingMode}
              onValueChange={(v) => onBookingModeChange(v as AIBookingMode)}
              className="space-y-2"
            >
              {bookingOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                    bookingMode === opt.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                >
                  <RadioGroupItem value={opt.value} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{opt.label}</span>
                      {opt.recommended && <Badge variant="default" className="text-xs">Recommended</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{opt.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>
        </>
      )}

      {/* After-Hours */}
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">After-hours calls:</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-[200px]">What happens when someone calls outside your business hours.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <RadioGroup
          value={afterHours}
          onValueChange={(v) => onAfterHoursChange(v as AfterHoursBehavior)}
          className="space-y-2"
        >
          {afterHoursOptions.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                afterHours === opt.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              )}
            >
              <RadioGroupItem value={opt.value} className="mt-1" />
              <div className="flex-1">
                <span className="font-medium text-sm">{opt.label}</span>
                <p className="text-sm text-muted-foreground mt-0.5">{opt.description}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Custom Greeting */}
      <Separator />
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="custom-greeting">Custom greeting (optional)</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-[200px]">Leave blank and we'll generate one based on your industry. Or write exactly what you want the AI to say first.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="custom-greeting"
          placeholder={
            businessName
              ? aiTone === "professional"
                ? `Thank you for calling ${businessName}. How may I assist you today?`
                : aiTone === "casual"
                  ? `Hey! You've reached ${businessName}. What can I do for you?`
                  : `Hi there! Thanks for calling ${businessName}. How can I help you today?`
              : "e.g. Thanks for calling! How can I help you today?"
          }
          value={customGreeting}
          onChange={(e) => onCustomGreetingChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {customGreeting
            ? `${customGreeting.length} characters`
            : "Leave blank and your AI will use the greeting shown in the preview above."}
        </p>
      </div>
    </div>
  );
});
