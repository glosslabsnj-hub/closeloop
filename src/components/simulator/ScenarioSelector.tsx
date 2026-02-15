import { useTenantConfig } from "@/hooks/useTenantConfig";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";

interface ScenarioSelectorProps {
  onSelect: (prompt: string) => void;
}

const SCENARIOS: Record<string, { label: string; prompt: string }[]> = {
  service: [
    { label: "Book an appointment", prompt: "Hi, I'd like to book an appointment for tomorrow morning." },
    { label: "Ask about pricing", prompt: "How much do you charge for your services?" },
    { label: "Emergency request", prompt: "I have an emergency, can someone come out today?" },
    { label: "Cancel appointment", prompt: "I need to cancel my appointment scheduled for Friday." },
  ],
  dispatch: [
    { label: "Emergency tow", prompt: "My car broke down on the highway, I need a tow truck right away." },
    { label: "Get a quote", prompt: "How much would it cost to tow my car about 15 miles?" },
    { label: "Check ETA", prompt: "I called about 30 minutes ago, how far out is the driver?" },
    { label: "Impound release", prompt: "I need to pick up my car from your impound lot." },
  ],
  food: [
    { label: "Place an order", prompt: "I'd like to place a pickup order for two large pizzas." },
    { label: "Delivery inquiry", prompt: "Do you deliver to the downtown area?" },
    { label: "Catering request", prompt: "I'm planning a party for 50 people next Saturday." },
    { label: "Menu question", prompt: "Do you have any gluten-free options?" },
  ],
  medical: [
    { label: "Book visit", prompt: "I need to schedule a checkup with the doctor." },
    { label: "Insurance question", prompt: "Do you accept Blue Cross Blue Shield insurance?" },
    { label: "Urgent symptom", prompt: "I've been having chest pains since this morning." },
    { label: "Prescription refill", prompt: "I need to refill my blood pressure medication." },
  ],
  general: [
    { label: "General inquiry", prompt: "Hi, I'm interested in your services. Can you tell me more?" },
    { label: "Pricing question", prompt: "How much do you charge?" },
    { label: "Hours of operation", prompt: "What are your business hours?" },
    { label: "Request a callback", prompt: "Can someone call me back to discuss a project?" },
  ],
  sales: [
    { label: "Product inquiry", prompt: "I'm interested in looking at what you have available." },
    { label: "Schedule test drive", prompt: "Can I schedule a test drive for this weekend?" },
    { label: "Pricing question", prompt: "What's the price range for your inventory?" },
    { label: "Trade-in inquiry", prompt: "Do you accept trade-ins? I have a 2020 Honda Civic." },
  ],
};

export function ScenarioSelector({ onSelect }: ScenarioSelectorProps) {
  const { businessMode } = useTenantConfig();
  const scenarios = SCENARIOS[businessMode] || SCENARIOS.general;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Try a test scenario</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {scenarios.map((s) => (
          <Button
            key={s.label}
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onSelect(s.prompt)}
          >
            {s.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
