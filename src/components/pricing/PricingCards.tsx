import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Check, MessageSquare, Phone, Sparkles, ArrowRight, ChevronDown } from "lucide-react";
import {
  TIERS,
  LADDER_STEPS,
  INCLUDED_IN_ALL_PLANS,
  getTierInfo,
  getLadderStepsForTier,
  getDefaultStepForTier,
  formatPrice,
  type PlanTier,
  type PlanSku,
  type TierInfo,
  type PlanLadderStep,
} from "@/config/pricing";

const getIcon = (iconName: TierInfo["icon"]) => {
  switch (iconName) {
    case "MessageSquare":
      return MessageSquare;
    case "Phone":
      return Phone;
    case "Sparkles":
      return Sparkles;
  }
};

interface PricingCardsProps {
  onSelectPlan?: (sku: PlanSku) => void;
  linkToSignup?: boolean;
  compact?: boolean;
}

export function PricingCards({ onSelectPlan, linkToSignup = false, compact = false }: PricingCardsProps) {
  const [expandedTier, setExpandedTier] = useState<PlanTier | null>(null);
  const [selectedSkus, setSelectedSkus] = useState<Record<PlanTier, PlanSku>>(() => {
    const defaults: Record<PlanTier, PlanSku> = {} as Record<PlanTier, PlanSku>;
    TIERS.forEach((tier) => {
      const defaultStep = getDefaultStepForTier(tier.tier);
      if (defaultStep) {
        defaults[tier.tier] = defaultStep.sku;
      }
    });
    return defaults;
  });

  const handleTierClick = (tier: PlanTier) => {
    setExpandedTier(expandedTier === tier ? null : tier);
  };

  const handleSkuChange = (tier: PlanTier, sku: PlanSku) => {
    setSelectedSkus((prev) => ({ ...prev, [tier]: sku }));
  };

  const getSelectedStep = (tier: PlanTier): PlanLadderStep | undefined => {
    const sku = selectedSkus[tier];
    return LADDER_STEPS.find((s) => s.sku === sku);
  };

  return (
    <div className="space-y-8">
      <div className={`grid gap-6 ${compact ? "md:grid-cols-3" : "md:grid-cols-3"}`}>
        {TIERS.map((tierInfo) => {
          const Icon = getIcon(tierInfo.icon);
          const isExpanded = expandedTier === tierInfo.tier;
          const ladderSteps = getLadderStepsForTier(tierInfo.tier);
          const selectedSku = selectedSkus[tierInfo.tier];
          const selectedStep = getSelectedStep(tierInfo.tier);
          const displayPrice = selectedStep?.price ?? tierInfo.startingPrice;

          const cardContent = (
            <Card
              className={`relative transition-all ${
                tierInfo.highlight
                  ? "border-primary shadow-lg scale-[1.02]"
                  : "hover:border-primary/50"
              }`}
            >
              {tierInfo.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                </div>
              )}

              <CardHeader className={compact ? "pb-2" : "pb-4"}>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg mb-3 ${
                    tierInfo.highlight
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">{tierInfo.displayName}</CardTitle>
                <CardDescription>{tierInfo.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Price */}
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-muted-foreground">Starting at</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{formatPrice(tierInfo.startingPrice)}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>

                {/* Features */}
                <ul className="space-y-3">
                  {tierInfo.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Usage Options Collapsible */}
                <Collapsible open={isExpanded} onOpenChange={() => handleTierClick(tierInfo.tier)}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between" type="button">
                      <span className="text-sm">
                        {isExpanded ? "Selected: " : "Choose usage level"}
                        {isExpanded && selectedStep && (
                          <span className="font-medium">{selectedStep.shortName}</span>
                        )}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-4">
                    <RadioGroup
                      value={selectedSku}
                      onValueChange={(value) => handleSkuChange(tierInfo.tier, value as PlanSku)}
                    >
                      {ladderSteps.map((step) => (
                        <div
                          key={step.sku}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            selectedSku === step.sku ? "border-primary bg-primary/5" : "border-border"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value={step.sku} id={step.sku} />
                            <Label htmlFor={step.sku} className="cursor-pointer">
                              <div className="font-medium">{step.shortName}</div>
                              <div className="text-xs text-muted-foreground">
                                {step.includedMinutes && `${step.includedMinutes.toLocaleString()} min`}
                                {step.includedMinutes && step.includedSmsSegments && " + "}
                                {step.includedSmsSegments &&
                                  `${step.includedSmsSegments.toLocaleString()} SMS`}
                              </div>
                            </Label>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatPrice(step.price)}</div>
                            <div className="text-xs text-muted-foreground">/mo</div>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                    {selectedStep && (
                      <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        Overage rates:{" "}
                        {selectedStep.overageMinuteRate && `$${selectedStep.overageMinuteRate}/min`}
                        {selectedStep.overageMinuteRate && selectedStep.overageSmsRate && " • "}
                        {selectedStep.overageSmsRate && `$${selectedStep.overageSmsRate}/SMS`}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* CTA */}
                <div>
                  {linkToSignup ? (
                    <Link to={`/signup?sku=${selectedSku}`}>
                      <Button
                        className="w-full"
                        variant={tierInfo.highlight ? "default" : "outline"}
                      >
                        Start 7-Day Free Trial
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      className="w-full"
                      variant={tierInfo.highlight ? "default" : "outline"}
                      onClick={onSelectPlan ? () => onSelectPlan(selectedSku) : undefined}
                    >
                      Start 7-Day Free Trial
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Then {formatPrice(selectedStep?.price ?? tierInfo.startingPrice)}/mo after trial
                  </p>
                </div>
              </CardContent>
            </Card>
          );

          return <div key={tierInfo.tier}>{cardContent}</div>;
        })}
      </div>

      {/* What's Included in All Plans */}
      <div className="text-center">
        <h3 className="font-semibold mb-4">Included in all plans</h3>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          {INCLUDED_IN_ALL_PLANS.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Re-export for backward compatibility
export type { PlanSku as PlanCode } from "@/config/pricing";
