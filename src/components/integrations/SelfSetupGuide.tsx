import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SelfSetupGuideProps {
  providerId: string;
}

interface GuideStep {
  step: number;
  text: string;
}

interface GuideContent {
  title: string;
  steps: GuideStep[];
  tip?: string;
  links?: { label: string; url: string }[];
}

const SETUP_GUIDES: Record<string, GuideContent> = {
  google_calendar: {
    title: "How to connect Google Calendar",
    steps: [
      { step: 1, text: 'Click "Connect" below' },
      { step: 2, text: "Sign in with your Google account" },
      { step: 3, text: "Allow Voxly to access your calendar" },
      { step: 4, text: "Choose which calendar to use for bookings" },
    ],
    tip: "New bookings will automatically appear on your calendar once connected.",
  },
  google_sheets: {
    title: "How to connect Google Sheets",
    steps: [
      { step: 1, text: 'Click "Connect" below' },
      { step: 2, text: "Sign in with your Google account" },
      { step: 3, text: "Create a new spreadsheet OR choose an existing one" },
      { step: 4, text: "Tell us which sheet to add data to" },
    ],
    tip: "Call data and leads will be logged automatically to your spreadsheet.",
  },
  webhook: {
    title: "How to set up a Webhook",
    steps: [
      { step: 1, text: "Get your webhook URL from Zapier, Make, or your system" },
      { step: 2, text: "Paste the URL below" },
      { step: 3, text: "We'll send JSON data whenever events happen" },
    ],
    tip: "Perfect for connecting to automation tools like Zapier or Make.",
    links: [
      { label: "How to create a Zapier webhook", url: "https://zapier.com/help/create/code-webhooks/trigger-zaps-from-webhooks" },
    ],
  },
  printer: {
    title: "How to set up printing",
    steps: [
      { step: 1, text: "Option A (Cloud): Get a PrintNode account and enter your API key" },
      { step: 2, text: "Option B (Local): Leave API key blank for browser-based printing" },
      { step: 3, text: "New orders will trigger prints automatically" },
    ],
    tip: "Cloud printing works from anywhere. Local printing uses your browser's print dialog.",
    links: [
      { label: "Get PrintNode", url: "https://www.printnode.com" },
    ],
  },
};

export function SelfSetupGuide({ providerId }: SelfSetupGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const guide = SETUP_GUIDES[providerId];

  if (!guide) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-muted-foreground hover:text-foreground h-8 px-2"
        >
          <span className="text-xs">How to set up</span>
          {isOpen ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-3">
        <ol className="space-y-2 text-xs text-muted-foreground">
          {guide.steps.map(({ step, text }) => (
            <li key={step} className="flex gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-medium">
                {step}
              </span>
              <span className="pt-0.5">{text}</span>
            </li>
          ))}
        </ol>

        {guide.tip && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
            💡 {guide.tip}
          </p>
        )}

        {guide.links && guide.links.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {guide.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {link.label}
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
