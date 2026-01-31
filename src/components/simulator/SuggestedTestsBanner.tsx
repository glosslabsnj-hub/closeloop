import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

interface SuggestedTestsBannerProps {
  onDismiss?: () => void;
}

/**
 * Suggested Tests Banner
 *
 * Shows mode-specific test scenarios after onboarding completion.
 * Helps users get started with testing their AI by providing relevant
 * test prompts based on their business_mode.
 */
export function SuggestedTestsBanner({ onDismiss }: SuggestedTestsBannerProps) {
  const { tenant } = useAuth();
  const businessMode = (tenant?.business_mode as BusinessMode) || "service";

  // Generate mode-specific test suggestions
  const suggestedTests = useMemo(() => {
    switch (businessMode) {
      case "service":
        return [
          "Hi, I need to schedule an appointment",
          "What are your prices?",
          "Are you available tomorrow at 2pm?",
          "Do you offer emergency services?",
          "What's your cancellation policy?",
        ];

      case "food":
        return [
          "I'd like to place an order for pickup",
          "Do you deliver to my area?",
          "What are your hours today?",
          "Can I make a reservation for 4 people?",
          "Do you have vegetarian options?",
        ];

      case "dispatch":
        return [
          "I need a tow truck right now",
          "How quickly can you get here?",
          "What's the cost for a 10-mile tow?",
          "Are you available 24/7?",
          "Do you handle roadside assistance?",
        ];

      case "medical":
        return [
          "I need to schedule a new patient appointment",
          "Do you accept my insurance?",
          "What are your office hours?",
          "Can I get a same-day appointment?",
          "What should I bring to my first visit?",
        ];

      case "general":
      default:
        return [
          "What services do you offer?",
          "How can I contact you?",
          "What are your business hours?",
          "Where are you located?",
          "Do you offer consultations?",
        ];
    }
  }, [businessMode]);

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Try these test scenarios</h3>
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              Start testing your AI with these common customer questions for {businessMode} businesses:
            </p>

            <div className="flex flex-wrap gap-2">
              {suggestedTests.map((test, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="h-auto py-2 px-3 text-xs font-normal whitespace-normal text-left"
                  onClick={() => {
                    // Copy to clipboard for easy pasting into simulator
                    navigator.clipboard.writeText(test);
                    // You could also dispatch a custom event here that CallSimulator listens to
                    window.dispatchEvent(
                      new CustomEvent('suggested-test-clicked', {
                        detail: { text: test }
                      })
                    );
                  }}
                >
                  "{test}"
                </Button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              💡 Click any test to copy it to your clipboard
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
