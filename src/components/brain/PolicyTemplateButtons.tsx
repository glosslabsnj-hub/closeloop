import { Button } from "@/components/ui/button";
import { FileText, Lightbulb } from "lucide-react";

interface PolicyTemplate {
  label: string;
  text: string;
}

interface PolicyTemplateButtonsProps {
  type: "cancellation" | "deposit" | "refund";
  onSelect: (text: string) => void;
}

const CANCELLATION_TEMPLATES: PolicyTemplate[] = [
  {
    label: "24hr Notice",
    text: "We require 24 hours notice for cancellations. Cancellations with less than 24 hours notice may incur a cancellation fee."
  },
  {
    label: "48hr Notice",
    text: "Please provide at least 48 hours notice for cancellations. Late cancellations or no-shows may be charged the full service fee."
  },
  {
    label: "Flexible",
    text: "We understand things come up! Just give us a call as soon as you can if you need to reschedule."
  },
];

const DEPOSIT_TEMPLATES: PolicyTemplate[] = [
  {
    label: "$50 Deposit",
    text: "A $50 deposit is required to secure your booking. This deposit is applied toward your final bill."
  },
  {
    label: "50% Deposit",
    text: "A 50% deposit is required at the time of booking. The remaining balance is due upon completion of service."
  },
  {
    label: "No Deposit",
    text: "No deposit is required. Full payment is due at the time of service."
  },
];

const REFUND_TEMPLATES: PolicyTemplate[] = [
  {
    label: "Full Refund",
    text: "Full refunds are available if you cancel at least 48 hours before your scheduled appointment."
  },
  {
    label: "Partial Refund",
    text: "Cancellations made 24-48 hours in advance receive a 50% refund. Less than 24 hours notice is non-refundable."
  },
  {
    label: "No Refunds",
    text: "All sales are final. We encourage you to reschedule rather than cancel if your plans change."
  },
];

const TEMPLATES_MAP = {
  cancellation: CANCELLATION_TEMPLATES,
  deposit: DEPOSIT_TEMPLATES,
  refund: REFUND_TEMPLATES,
};

export function PolicyTemplateButtons({ type, onSelect }: PolicyTemplateButtonsProps) {
  const templates = TEMPLATES_MAP[type];

  return (
    <div className="flex flex-wrap gap-2">
      {templates.map((template) => (
        <Button
          key={template.label}
          variant="outline"
          size="sm"
          className="text-xs h-7 gap-1"
          onClick={() => onSelect(template.text)}
        >
          <FileText className="h-3 w-3" />
          {template.label}
        </Button>
      ))}
    </div>
  );
}
