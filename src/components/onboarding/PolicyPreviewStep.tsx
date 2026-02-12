/**
 * PolicyPreviewStep - Onboarding step for previewing/editing template policies
 *
 * Shows pre-filled cancellation, deposit, and refund policies from industry template.
 * Each is editable with a speech-ready indicator.
 */

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

export interface EditablePolicies {
  cancellation: string;
  deposit: string;
  refund: string;
}

interface PolicyPreviewStepProps {
  businessMode: BusinessMode;
  policies: EditablePolicies;
  onChange: (policies: EditablePolicies) => void;
}

const policyContext: Record<string, Record<string, string>> = {
  cancellation: {
    service: "When a customer asks about canceling an appointment",
    dispatch: "When a customer cancels a tow or job request",
    food: "When a guest asks about canceling an order",
    medical: "When a patient asks about canceling a visit",
    general: "When a client asks about canceling",
    sales: "When a prospect asks about canceling an appointment",
  },
  deposit: {
    service: "When asked about upfront payment or deposits",
    dispatch: "When asked about pre-payment for services",
    food: "When asked about payment for catering or large orders",
    medical: "When asked about co-pays or payment at time of visit",
    general: "When asked about deposits or prepayment",
    sales: "When asked about earnest money or deposits",
  },
  refund: {
    service: "When a customer requests a refund",
    dispatch: "When a customer disputes charges or wants a refund",
    food: "When a guest is unhappy and wants a refund",
    medical: "When a patient asks about billing adjustments",
    general: "When a client asks about refunds",
    sales: "When a buyer asks about returns or refunds",
  },
};

export function PolicyPreviewStep({
  businessMode,
  policies,
  onChange,
}: PolicyPreviewStepProps) {
  const update = (field: keyof EditablePolicies, value: string) => {
    onChange({ ...policies, [field]: value });
  };

  const sections: { key: keyof EditablePolicies; label: string }[] = [
    { key: "cancellation", label: "Cancellation Policy" },
    { key: "deposit", label: "Deposit / Payment Policy" },
    { key: "refund", label: "Refund Policy" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Your Policies
        </h2>
        <p className="mt-2 text-muted-foreground">
          Your AI will reference these when customers ask about cancellations,
          deposits, or refunds. Edit them to match how you actually operate.
        </p>
      </div>

      {sections.map(({ key, label }) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={`policy-${key}`}>{label}</Label>
          <Textarea
            id={`policy-${key}`}
            value={policies[key]}
            onChange={(e) => update(key, e.target.value)}
            rows={3}
            placeholder={`Describe your ${key} policy...`}
          />
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
            <span>
              Your AI says this {policyContext[key]?.[businessMode] || "when asked"}.
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
