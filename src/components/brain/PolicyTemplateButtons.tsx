import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import type { BusinessMode } from "@/hooks/useTenantConfig";

interface PolicyTemplate {
  label: string;
  text: string;
}

interface PolicyTemplateButtonsProps {
  type: "cancellation" | "deposit" | "refund";
  onSelect: (text: string) => void;
}

/**
 * Industry-aware policy templates
 */
const MODE_TEMPLATES: Record<BusinessMode, {
  cancellation: PolicyTemplate[];
  deposit: PolicyTemplate[];
  refund: PolicyTemplate[];
}> = {
  service: {
    cancellation: [
      { label: "24hr Notice", text: "We require 24 hours notice for cancellations. Cancellations with less than 24 hours notice may incur a cancellation fee." },
      { label: "48hr Notice", text: "Please provide at least 48 hours notice for cancellations. Late cancellations or no-shows may be charged the full service fee." },
      { label: "Flexible", text: "We understand things come up! Just give us a call as soon as you can if you need to reschedule." },
    ],
    deposit: [
      { label: "$50 Deposit", text: "A $50 deposit is required to secure your booking. This deposit is applied toward your final bill." },
      { label: "50% Deposit", text: "A 50% deposit is required at the time of booking. The remaining balance is due upon completion of service." },
      { label: "No Deposit", text: "No deposit is required. Full payment is due at the time of service." },
    ],
    refund: [
      { label: "Full Refund", text: "Full refunds are available if you cancel at least 48 hours before your scheduled appointment." },
      { label: "Partial Refund", text: "Cancellations made 24-48 hours in advance receive a 50% refund. Less than 24 hours notice is non-refundable." },
      { label: "No Refunds", text: "All sales are final. We encourage you to reschedule rather than cancel if your plans change." },
    ],
  },
  dispatch: {
    cancellation: [
      { label: "Before Dispatch", text: "You can cancel at no charge before we dispatch a driver. Once a driver is en route, a trip fee may apply." },
      { label: "Trip Fee", text: "Cancellations after a driver has been dispatched are subject to a trip fee to cover the driver's time and fuel." },
      { label: "No Cancel Fee", text: "No cancellation fee. Just call us as soon as possible so we can free up the driver for other jobs." },
    ],
    deposit: [
      { label: "No Deposit", text: "No deposit required. Payment is due when the driver arrives or upon delivery to the destination." },
      { label: "Card on File", text: "We require a credit card on file before dispatch. Your card is only charged upon completion of service." },
      { label: "Prepay Required", text: "For long-distance tows or after-hours service, prepayment may be required before dispatch." },
    ],
    refund: [
      { label: "Service Issues", text: "If there's an issue with our service, contact us within 24 hours and we'll make it right." },
      { label: "No Refunds", text: "Once service is complete, payment is final. Contact us immediately if there are any issues." },
      { label: "Partial Refund", text: "Refunds are considered on a case-by-case basis. Please contact us to discuss any concerns." },
    ],
  },
  food: {
    cancellation: [
      { label: "Before Prep", text: "Orders can be cancelled at no charge if we haven't started preparing your food yet." },
      { label: "After Prep", text: "Once food preparation has started, we cannot offer refunds, but we can modify your order if possible." },
      { label: "Catering", text: "Catering orders require 48 hours notice to cancel. Less than 48 hours may incur a 50% charge." },
    ],
    deposit: [
      { label: "Catering Deposit", text: "Catering orders require a 50% deposit at the time of booking. The balance is due on the day of the event." },
      { label: "Large Orders", text: "Orders over $100 require a credit card on file. Your card is charged upon pickup or delivery." },
      { label: "No Deposit", text: "No deposit required for regular orders. Payment is due at pickup or delivery." },
    ],
    refund: [
      { label: "Quality Issues", text: "If you're not satisfied with your order, please contact us within 1 hour and we'll make it right or refund you." },
      { label: "No Refunds", text: "All food sales are final. If there's an issue with your order, please let us know and we'll try to resolve it." },
      { label: "Remake Policy", text: "If something is wrong with your order, we'll remake it at no charge. Refunds are offered if a remake isn't possible." },
    ],
  },
  medical: {
    cancellation: [
      { label: "24hr Notice", text: "We ask for 24 hours notice to cancel or reschedule. This allows us to offer your time slot to other patients." },
      { label: "48hr Notice", text: "Please provide 48 hours notice for cancellations. Late cancellations may incur a fee." },
      { label: "No-Show Fee", text: "Patients who miss appointments without notice may be charged a no-show fee." },
    ],
    deposit: [
      { label: "Copay at Visit", text: "Insurance copays and deductibles are due at the time of your visit." },
      { label: "Cosmetic Deposit", text: "Cosmetic procedures require a deposit to secure your appointment. The deposit is applied to your total." },
      { label: "No Deposit", text: "No deposit required. We'll verify your insurance and discuss any out-of-pocket costs at your visit." },
    ],
    refund: [
      { label: "Unused Services", text: "Prepaid services that are not used may be refunded within 90 days of purchase." },
      { label: "Package Refunds", text: "Treatment packages may be refunded at the prorated value of unused sessions." },
      { label: "No Refunds", text: "All services are final once rendered. Prepaid packages may be transferred to another person." },
    ],
  },
  general: {
    cancellation: [
      { label: "24hr Notice", text: "We require 24 hours notice for cancellations. Cancellations with less than 24 hours notice may incur a fee." },
      { label: "Flexible", text: "We understand things come up! Just let us know as soon as you can if you need to cancel or reschedule." },
      { label: "No Cancel Fee", text: "No cancellation fee. We appreciate as much notice as possible so we can adjust our schedule." },
    ],
    deposit: [
      { label: "50% Deposit", text: "A 50% deposit is required at the time of booking. The remaining balance is due upon completion." },
      { label: "Full Prepay", text: "Full payment is required at the time of booking to secure your appointment." },
      { label: "No Deposit", text: "No deposit is required. Payment is due upon completion of service." },
    ],
    refund: [
      { label: "Full Refund", text: "Full refunds are available if you cancel at least 48 hours in advance." },
      { label: "Case by Case", text: "Refund requests are handled on a case-by-case basis. Please contact us to discuss." },
      { label: "No Refunds", text: "All sales are final. We're happy to reschedule if your plans change." },
    ],
  },
  sales: {
    cancellation: [
      { label: "Before Delivery", text: "Orders can be cancelled before delivery at no charge. Once delivered, our return policy applies." },
      { label: "Restocking Fee", text: "Cancelled orders may be subject to a restocking fee depending on the item and timeframe." },
      { label: "No Cancel Fee", text: "No cancellation fee. Just let us know as soon as possible." },
    ],
    deposit: [
      { label: "Hold Deposit", text: "A deposit is required to hold items. This deposit is applied toward your final purchase." },
      { label: "Full Prepay", text: "Full payment is required at the time of purchase." },
      { label: "No Deposit", text: "No deposit required. Payment is due at time of delivery or pickup." },
    ],
    refund: [
      { label: "30-Day Return", text: "Full refunds within 30 days with original receipt. Items must be in original condition." },
      { label: "Exchange Only", text: "We offer exchanges within 14 days. No cash refunds." },
      { label: "No Refunds", text: "All sales are final. We're happy to assist with exchanges or store credit." },
    ],
  },
};

export function PolicyTemplateButtons({ type, onSelect }: PolicyTemplateButtonsProps) {
  const { businessMode } = useTenantConfig();
  const templates = MODE_TEMPLATES[businessMode]?.[type] || MODE_TEMPLATES.general[type];

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
