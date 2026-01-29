import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { HelpCircle, ExternalLink } from "lucide-react";
import { useState } from "react";

interface InlineHelpTooltipProps {
  title: string;
  description: string;
  steps?: string[];
  learnMoreLink?: string;
  side?: "top" | "right" | "bottom" | "left";
}

export function InlineHelpTooltip({
  title,
  description,
  steps,
  learnMoreLink,
  side = "top",
}: InlineHelpTooltipProps) {
  const [open, setOpen] = useState(false);

  // Use simple tooltip for short content, popover for detailed content
  if (!steps && !learnMoreLink) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="inline-flex items-center justify-center h-5 w-5 rounded-full hover:bg-muted transition-colors">
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side={side} className="max-w-xs">
            <p className="font-medium text-sm mb-0.5">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Popover for detailed content with steps
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center justify-center h-5 w-5 rounded-full hover:bg-muted transition-colors">
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} className="w-80">
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm">{title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>

          {steps && steps.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">How to set up:</p>
              <ol className="space-y-1 text-xs text-muted-foreground">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-bold text-primary shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {learnMoreLink && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              asChild
            >
              <a href={learnMoreLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1.5" />
                Learn more
              </a>
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Pre-configured help tooltips for common automations
export const AUTOMATION_HELP = {
  orderConfirmed: {
    title: "Order Confirmation Text",
    description: "Automatically sends a text message to customers when their order is confirmed.",
    steps: [
      "Toggle this ON to enable automatic texts",
      "Click 'Edit message' to customize what's sent",
      "Use {{customer_name}} to personalize the message",
      "Include {{order_number}} for reference",
    ],
  },
  orderReady: {
    title: "Order Ready Notification",
    description: "Alerts customers via text when their order is ready for pickup.",
    steps: [
      "Toggle ON to enable notifications",
      "Customize the ready message",
      "Include the order number so they know which order",
    ],
  },
  bookingConfirmed: {
    title: "Booking Confirmation",
    description: "Sends automatic confirmation when appointments are booked.",
    steps: [
      "Toggle ON to confirm bookings automatically",
      "Include date/time using {{start_date}} and {{start_time}}",
      "Add the service name with {{service_name}}",
    ],
  },
  missedCall: {
    title: "Missed Call Follow-up",
    description: "Automatically texts back when you miss a call.",
    steps: [
      "Toggle ON to enable auto-replies",
      "Customize a friendly follow-up message",
      "Include how they can reach you or book",
    ],
  },
  printTicket: {
    title: "Print Kitchen Ticket",
    description: "Automatically prints order tickets for your kitchen when orders come in.",
    steps: [
      "Toggle ON to enable auto-printing",
      "Choose thermal or full-page format",
      "Set number of copies",
    ],
  },
  webhookCrm: {
    title: "Push to CRM",
    description: "Sends call summaries and data to your CRM or other tools automatically.",
    steps: [
      "Toggle ON to enable data sync",
      "Enter your webhook URL (or use Zapier)",
      "Test the connection",
      "Data will flow automatically after each call",
    ],
  },
  dispatchCreated: {
    title: "Job Request Confirmation",
    description: "Confirms that a service request has been received.",
    steps: [
      "Toggle ON to auto-confirm jobs",
      "Include job number and type",
      "Add estimated arrival time if available",
    ],
  },
  dispatchCompleted: {
    title: "Job Completed Notification",
    description: "Sends a thank you and feedback request after jobs are completed.",
    steps: [
      "Toggle ON to request feedback",
      "Thank the customer",
      "Ask for a simple rating (1-5 stars)",
    ],
  },
};
