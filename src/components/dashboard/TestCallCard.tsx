import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PhoneCall, Sparkles, MessageSquare } from "lucide-react";
import { useIndustryContext } from "@/hooks/useIndustryContext";

// Format E.164 number to friendly display
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `(${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 11)}`;
  }
  return phone;
}

interface TestCallCardProps {
  /** Compact inline version (for sidebar) vs. full card */
  variant?: "full" | "compact";
}

/**
 * TestCallCard - Prominent CTA to make a test call to the AI agent.
 * Shows phone number, sample prompts, and a direct call link.
 */
export function TestCallCard({ variant = "full" }: TestCallCardProps) {
  const { assistantSettings } = useAuth();
  const { terms, mode } = useIndustryContext();
  const [showModal, setShowModal] = useState(false);

  const aiNumber = assistantSettings?.forwarding_phone_e164 || assistantSettings?.closeloop_number;
  if (!aiNumber) return null;

  const displayNumber = formatPhoneNumber(aiNumber);

  // Mode-aware sample prompts
  const samplePrompts = (() => {
    switch (mode) {
      case "dispatch":
        return [
          `"I need a tow truck"`,
          `"How much does a tow cost?"`,
          `"What's your service area?"`,
          `"How long until you can get here?"`,
        ];
      case "food":
        return [
          `"I'd like to place an order for pickup"`,
          `"What are your hours?"`,
          `"Do you deliver to my area?"`,
          `"Can I make a reservation for tonight?"`,
        ];
      case "medical":
        return [
          `"I need to schedule an appointment"`,
          `"What are your office hours?"`,
          `"Do you accept my insurance?"`,
          `"I need to reschedule my visit"`,
        ];
      case "general":
        return [
          `"I'd like some information about your business"`,
          `"What are your hours?"`,
          `"Can someone call me back?"`,
          `"What services do you offer?"`,
        ];
      default: // service
        return [
          `"I need to schedule ${(terms.bookingLabel as string)?.toLowerCase() || "an appointment"}"`,
          `"What are your hours?"`,
          `"How much does a ${(terms.serviceLabel as string)?.toLowerCase() || "service"} cost?"`,
          `"Do you have any availability today?"`,
        ];
    }
  })();

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <PhoneCall className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Test Your AI</p>
          <p className="text-xs text-muted-foreground truncate">{displayNumber}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setShowModal(true)}>
          <PhoneCall className="h-3.5 w-3.5" />
          Call
        </Button>
      </div>
    );
  }

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Hear Your AI in Action</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Call your AI number to hear how it answers. Try one of the sample prompts below.
              </p>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold tracking-tight">{displayNumber}</span>
                <Badge variant="secondary" className="gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button className="gap-2" onClick={() => setShowModal(true)}>
                  <PhoneCall className="h-4 w-4" />
                  Make a Test Call
                </Button>
                <Button variant="outline" className="gap-2" asChild>
                  <a href={`tel:${aiNumber}`}>
                    <PhoneCall className="h-4 w-4" />
                    Call Now
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Call Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-primary" />
              Test Your AI Agent
            </DialogTitle>
            <DialogDescription>
              Call the number below from your phone to hear your AI in action.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Phone number */}
            <div className="text-center p-6 rounded-xl bg-muted/50 border">
              <p className="text-3xl font-bold tracking-tight">{displayNumber}</p>
              <p className="text-sm text-muted-foreground mt-2">Your AI phone number</p>
              <Button className="mt-4 gap-2" size="lg" asChild>
                <a href={`tel:${aiNumber}`}>
                  <PhoneCall className="h-5 w-5" />
                  Call from This Device
                </a>
              </Button>
            </div>

            {/* Sample prompts */}
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Try saying:
              </p>
              <div className="grid gap-2">
                {samplePrompts.map((prompt, i) => (
                  <div
                    key={i}
                    className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/30 border border-dashed"
                  >
                    {prompt}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              After your call, check the Inbox to see the transcript and how your AI handled it.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
