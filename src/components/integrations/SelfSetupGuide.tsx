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
      { step: 3, text: "Allow Flux Receptionist to access your calendar" },
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
    title: "How to connect another app",
    steps: [
      { step: 1, text: "Get your connection URL from Zapier, Make, or your system" },
      { step: 2, text: "Paste the URL below" },
      { step: 3, text: "We'll automatically send updates whenever something happens" },
    ],
    tip: "Perfect for connecting to automation tools like Zapier or Make.",
    links: [
      { label: "How to create a Zapier webhook", url: "https://zapier.com/help/create/code-webhooks/trigger-zaps-from-webhooks" },
    ],
  },
  printer: {
    title: "How to set up printing",
    steps: [
      { step: 1, text: "Option A (PrintNode): Sign up at PrintNode and enter your access code" },
      { step: 2, text: "Option B (Direct): Leave the access code blank to print from your browser" },
      { step: 3, text: "New orders will trigger prints automatically" },
    ],
    tip: "Cloud printing works from anywhere. Local printing uses your browser's print dialog.",
    links: [
      { label: "Get PrintNode", url: "https://www.printnode.com" },
    ],
  },
  jobber: {
    title: "Coming soon — how to connect Jobber",
    steps: [
      { step: 1, text: "In Jobber, go to Settings → Connected Apps → Developer Center" },
      { step: 2, text: "Create a new app and copy your Client ID and Client Secret" },
      { step: 3, text: 'Click "Connect" here and authorize the connection' },
      { step: 4, text: "New bookings will sync to Jobber as work orders automatically" },
    ],
    tip: "While Jobber connect is in beta, use our webhook integration to forward bookings to Zapier and into Jobber.",
    links: [
      { label: "Jobber developer docs", url: "https://developer.getjobber.com/docs" },
    ],
  },
  housecallpro: {
    title: "Coming soon — how to connect Housecall Pro",
    steps: [
      { step: 1, text: "In Housecall Pro, go to Settings → Integrations → API" },
      { step: 2, text: "Generate a new API key and copy it" },
      { step: 3, text: 'Click "Connect" here and paste your API key' },
      { step: 4, text: "Bookings and customer data will sync automatically" },
    ],
    tip: "While HCP direct connect is in beta, use our webhook integration to forward bookings to Zapier and into HCP.",
    links: [
      { label: "Housecall Pro API docs", url: "https://help.housecallpro.com/en/articles/8229791-api-documentation" },
    ],
  },
  quickbooks: {
    title: "Coming soon — how to connect QuickBooks",
    steps: [
      { step: 1, text: 'Click "Connect" here and sign in to your QuickBooks account' },
      { step: 2, text: "Authorize Flux Receptionist to access your QuickBooks company" },
      { step: 3, text: "New invoices will be created automatically from bookings" },
    ],
    tip: "While QuickBooks connect is in beta, invoices can be exported manually as CSV from your Reports page.",
    links: [
      { label: "QuickBooks OAuth guide", url: "https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0" },
    ],
  },
  hubspot: {
    title: "Coming soon — how to connect HubSpot",
    steps: [
      { step: 1, text: 'Click "Connect" here and sign in to your HubSpot account' },
      { step: 2, text: "Authorize Flux Receptionist to access your HubSpot CRM" },
      { step: 3, text: "New leads and contacts will sync to your CRM automatically" },
    ],
    tip: "While HubSpot connect is in beta, use the Google Sheets integration to log leads, then import to HubSpot.",
    links: [
      { label: "HubSpot OAuth guide", url: "https://developers.hubspot.com/docs/api/oauth-quickstart-guide" },
    ],
  },
  square_pos: {
    title: "Coming soon — how to connect Square",
    steps: [
      { step: 1, text: 'Click "Connect" here and sign in to your Square account' },
      { step: 2, text: "Choose which Square location to connect" },
      { step: 3, text: "Orders and payments will sync to Square automatically" },
    ],
    tip: "While Square connect is in beta, use our webhook integration to forward order data to your Square account.",
    links: [
      { label: "Square developer docs", url: "https://developer.squareup.com/docs/oauth-api/overview" },
    ],
  },
  fieldedge: {
    title: "How to connect FieldEdge",
    steps: [
      { step: 1, text: "In FieldEdge, go to Settings → Integrations → API Access" },
      { step: 2, text: "Click \"Generate API Key\" and copy the key shown" },
      { step: 3, text: "Paste the key below and click Connect" },
      { step: 4, text: "New bookings and service calls will sync to FieldEdge automatically" },
    ],
    tip: "Bookings sync as service calls in FieldEdge. Customer records and technician assignments update in real time.",
    links: [
      { label: "FieldEdge help center", url: "https://support.fieldedge.com" },
    ],
  },
  stripe_connect: {
    title: "Coming soon — how to connect Stripe",
    steps: [
      { step: 1, text: 'Click "Connect" here and sign in to your Stripe account' },
      { step: 2, text: "Authorize Flux Receptionist to collect payments on your behalf" },
      { step: 3, text: "Customers can pay by credit card when booking" },
    ],
    tip: "While Stripe Connect is in beta, deposit collection can be handled manually after booking confirmation.",
    links: [
      { label: "Stripe Connect docs", url: "https://stripe.com/docs/connect" },
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
