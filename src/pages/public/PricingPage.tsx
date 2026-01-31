import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Clock, CreditCard, Check, ArrowRight, Sparkles, MessageSquare, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  TIERS,
  LADDER_STEPS,
  INCLUDED_IN_ALL_PLANS,
  LOCATION_ADD_ONS,
  getLadderStepsForTier,
  getDefaultStepForTier,
  formatPrice,
  type PlanTier,
  type PlanSku,
  type TierInfo,
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

// Re-order tiers to put "Both" in the middle (recommended)
const orderedTiers = [
  TIERS.find(t => t.tier === "sms")!,
  TIERS.find(t => t.tier === "both")!,
  TIERS.find(t => t.tier === "voice")!,
];

export default function PricingPage() {
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

  const handleSkuChange = (tier: PlanTier, sku: PlanSku) => {
    setSelectedSkus((prev) => ({ ...prev, [tier]: sku }));
  };

  const getSelectedStep = (tier: PlanTier) => {
    const sku = selectedSkus[tier];
    return LADDER_STEPS.find((s) => s.sku === sku);
  };

  return (
    <div className="py-16 md:py-24">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start your 7-day free trial. No charge until it ends.
          </p>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-6 mb-12 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>7-day free trial</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span>No charge until trial ends</span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
          {orderedTiers.map((tierInfo) => {
            const Icon = getIcon(tierInfo.icon);
            const isRecommended = tierInfo.tier === "both";
            const ladderSteps = getLadderStepsForTier(tierInfo.tier);
            const selectedSku = selectedSkus[tierInfo.tier];
            const selectedStep = getSelectedStep(tierInfo.tier);

            return (
              <Card
                key={tierInfo.tier}
                className={`relative transition-all ${
                  isRecommended
                    ? "border-primary shadow-xl scale-[1.02] md:scale-105"
                    : "hover:border-primary/50"
                }`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground gap-1 px-4 py-1">
                      <Sparkles className="h-3 w-3" />
                      Recommended
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4 pt-6">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl mb-4 ${
                      isRecommended
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{tierInfo.displayName}</CardTitle>
                  <CardDescription className="min-h-[40px]">{tierInfo.shortDescription}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Price Display */}
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">
                        {formatPrice(selectedStep?.price ?? tierInfo.startingPrice)}
                      </span>
                      <span className="text-muted-foreground">/mo</span>
                    </div>
                    {selectedStep && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedStep.includedMinutes && `${selectedStep.includedMinutes.toLocaleString()} min`}
                        {selectedStep.includedMinutes && selectedStep.includedSmsSegments && " + "}
                        {selectedStep.includedSmsSegments && `${selectedStep.includedSmsSegments.toLocaleString()} SMS`}
                        {" included"}
                      </p>
                    )}
                  </div>

                  {/* Usage Level Selector */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Choose your usage level:</p>
                    <RadioGroup
                      value={selectedSku}
                      onValueChange={(value) => handleSkuChange(tierInfo.tier, value as PlanSku)}
                      className="space-y-2"
                    >
                      {ladderSteps.map((step) => (
                        <div
                          key={step.sku}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedSku === step.sku
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/30"
                          }`}
                          onClick={() => handleSkuChange(tierInfo.tier, step.sku)}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value={step.sku} id={step.sku} />
                            <Label htmlFor={step.sku} className="cursor-pointer font-normal">
                              {step.shortName}
                            </Label>
                          </div>
                          <span className="font-semibold">{formatPrice(step.price)}</span>
                        </div>
                      ))}
                    </RadioGroup>
                    {selectedStep && (
                      <p className="text-xs text-muted-foreground">
                        Overage:{" "}
                        {selectedStep.overageMinuteRate && `$${selectedStep.overageMinuteRate}/min`}
                        {selectedStep.overageMinuteRate && selectedStep.overageSmsRate && " • "}
                        {selectedStep.overageSmsRate && `$${selectedStep.overageSmsRate}/SMS`}
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2">
                    {tierInfo.features.slice(0, 4).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link to={`/signup?sku=${selectedSku}`}>
                    <Button
                      className="w-full gap-2"
                      variant={isRecommended ? "default" : "outline"}
                      size="lg"
                    >
                      Start Free Trial
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Included in all plans */}
        <div className="max-w-4xl mx-auto text-center mb-12 p-6 rounded-2xl bg-secondary/30">
          <h3 className="font-semibold mb-4">Included in all plans</h3>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>Business Brain</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>Integration syncing</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>Handoff delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>Unlimited simultaneous calls</span>
            </div>
          </div>
        </div>

        {/* Multi-location */}
        <div className="max-w-xl mx-auto text-center mb-16 p-4 rounded-xl border bg-card">
          <p className="font-medium mb-1">Need multiple locations?</p>
          <p className="text-sm text-muted-foreground">
            Add extra locations from ${LOCATION_ADD_ONS.smsOnly}/mo (SMS) or ${LOCATION_ADD_ONS.voiceOrBoth}/mo (Voice/Both).
            Each includes a dedicated number.
          </p>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently asked questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "How does the 7-day free trial work?",
                a: "Select your plan, enter your payment info, and get full access for 7 days. You won't be charged until the trial ends. Cancel anytime before that — no questions asked.",
              },
              {
                q: "Can I change plans later?",
                a: "Absolutely. You can upgrade to a higher usage tier or switch between SMS, Voice, or Both at any time. Changes take effect on your next billing cycle.",
              },
              {
                q: "What if I go over my included limits?",
                a: "No worries! Your service continues uninterrupted. You'll be billed for overages at the rates shown. If you consistently exceed limits, upgrading often saves money.",
              },
              {
                q: "What's the difference between the plans?",
                a: "SMS Instant Respond texts back missed calls automatically. AI Voice Receptionist answers calls live, qualifies leads, and books appointments. Both combines everything for maximum conversion.",
              },
            ].map((faq) => (
              <div key={faq.q}>
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mt-16">
          <Link to="/signup">
            <Button size="lg" className="gap-2 h-14 px-8 text-lg">
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            7-day free trial • No charge until trial ends
          </p>
        </div>
      </div>
    </div>
  );
}
