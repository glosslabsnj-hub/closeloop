/**
 * QuotingBehaviorGuidance
 *
 * Replaces PricingEtaGuidance for non-dispatch modes.
 * Shows contextual guidance based on the industry's pricing model
 * (catalog, menu, fee_schedule, custom).
 */

import { Info, DollarSign, BookOpen, UtensilsCrossed } from "lucide-react";
import type { PricingModel } from "@/config/industryBrainConfig";

interface QuotingBehaviorGuidanceProps {
  pricingModel: PricingModel;
  className?: string;
}

const MODEL_GUIDANCE: Record<PricingModel, {
  icon: typeof Info;
  title: string;
  description: string;
  detail: string;
}> = {
  catalog: {
    icon: DollarSign,
    title: "Your service catalog IS your pricing config",
    description:
      "Each service's price type tells the AI what to quote. Set \"fixed\" for exact prices, \"starting at\" for ranges, or \"quote only\" to offer a callback.",
    detail:
      "No separate pricing rules needed — just keep your services up to date and the AI handles the rest.",
  },
  menu: {
    icon: UtensilsCrossed,
    title: "Menu prices are your pricing",
    description:
      "Your menu item prices are what the AI quotes to callers. Delivery fees and surcharges are configured in Order Settings.",
    detail:
      "Keep your menu prices current and the AI will accurately quote totals including any applicable fees.",
  },
  fee_schedule: {
    icon: BookOpen,
    title: "Your fee schedule is for reference",
    description:
      "The AI directs pricing questions to your billing department. Service listings help patients understand what you offer, not what they'll pay.",
    detail:
      "If you want the AI to quote specific prices, set them as \"fixed\" on each procedure. Otherwise, it will offer to have someone call with details.",
  },
  distance: {
    icon: DollarSign,
    title: "Distance-based pricing",
    description:
      "Your pricing rules, base rates, and per-mile charges are configured in the Pricing section.",
    detail:
      "The AI uses your distance pricing rules to provide real-time quotes based on pickup and dropoff locations.",
  },
  custom: {
    icon: Info,
    title: "Custom pricing approach",
    description:
      "Your service catalog prices tell the AI what to quote. Set each service's price type to control how the AI presents pricing.",
    detail:
      "For services with variable pricing, use \"starting at\" or \"quote only\" so the AI doesn't over-promise.",
  },
};

export function QuotingBehaviorGuidance({ pricingModel, className }: QuotingBehaviorGuidanceProps) {
  const guidance = MODEL_GUIDANCE[pricingModel] ?? MODEL_GUIDANCE.custom;
  const Icon = guidance.icon;

  return (
    <div className={`rounded-lg border bg-muted/30 p-4 ${className ?? ""}`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <p className="text-sm font-medium">{guidance.title}</p>
          <p className="text-sm text-muted-foreground">{guidance.description}</p>
          <p className="text-xs text-muted-foreground">{guidance.detail}</p>
        </div>
      </div>
    </div>
  );
}
