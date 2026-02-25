import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Check, Phone, ArrowRight, MapPin, Plus, Minus, Mail } from "lucide-react";
import {
  TIERS,
  LADDER_STEPS,
  INCLUDED_IN_ALL_PLANS,
  LOCATION_ADD_ONS,
  formatPrice,
  calculateMonthlyTotal,
  type PlanSku,
  type PlanLadderStep,
} from "@/config/pricing";

interface PricingCardsProps {
  onSelectPlan?: (sku: PlanSku, additionalLocations?: number) => void;
  linkToSignup?: boolean;
  compact?: boolean;
}

export function PricingCards({ onSelectPlan, linkToSignup = false, compact = false }: PricingCardsProps) {
  const [selectedSku, setSelectedSku] = useState<PlanSku>("base-200");
  const [additionalLocations, setAdditionalLocations] = useState(0);

  const selectedStep = LADDER_STEPS.find((s) => s.sku === selectedSku);
  const tierInfo = TIERS[0]; // Only voice tier
  const monthlyTotal = calculateMonthlyTotal(selectedSku, additionalLocations);

  // Filter out enterprise from self-serve options
  const selfServeSteps = LADDER_STEPS.filter((s) => !s.isEnterprise);
  const enterpriseStep = LADDER_STEPS.find((s) => s.isEnterprise);

  const handleLocationChange = (delta: number) => {
    setAdditionalLocations(Math.max(0, additionalLocations + delta));
  };

  const handleSelectPlan = () => {
    if (onSelectPlan) {
      onSelectPlan(selectedSku, additionalLocations);
    }
  };

  return (
    <div className="space-y-10">
      {/* Main Pricing Card */}
      <div className="max-w-2xl mx-auto">
        <Card className="relative transition-all duration-300 border-primary shadow-xl bg-gradient-to-b from-card to-primary/5">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground px-4 py-1 shadow-md">
              <Phone className="h-3 w-3 mr-1.5" />
              AI Receptionist
            </Badge>
          </div>

          <CardHeader className={compact ? "pb-2 pt-8" : "pb-4 pt-8"}>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl mb-4 bg-primary text-primary-foreground shadow-md">
              <Phone className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl">{tierInfo.displayName}</CardTitle>
            <CardDescription className="text-base">{tierInfo.description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Minute Bundle Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Choose your monthly minutes</Label>
              <p className="text-sm text-muted-foreground">
                Minutes are pooled across all your locations
              </p>
              <RadioGroup
                value={selectedSku}
                onValueChange={(value) => setSelectedSku(value as PlanSku)}
                className="space-y-2"
              >
                {selfServeSteps.map((step) => (
                  <div
                    key={step.sku}
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedSku === step.sku 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedSku(step.sku)}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value={step.sku} id={step.sku} />
                      <Label htmlFor={step.sku} className="cursor-pointer">
                        <div className="font-medium">{step.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {step.includedMinutes?.toLocaleString()} minutes • ${step.overageMinuteRate}/min overage
                        </div>
                      </Label>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{formatPrice(step.price)}</div>
                      <div className="text-xs text-muted-foreground">/month</div>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Multi-location Add-on */}
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <Label className="font-medium">Additional Locations</Label>
                </div>
                <Badge variant="secondary">${LOCATION_ADD_ONS.voice}/mo each</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Each location gets a dedicated phone number. Your base plan includes 1 location.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleLocationChange(-1)}
                  disabled={additionalLocations === 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-16 text-center font-medium text-lg">
                  {additionalLocations + 1} {additionalLocations === 0 ? "location" : "locations"}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleLocationChange(1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {additionalLocations > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  +{formatPrice(additionalLocations * LOCATION_ADD_ONS.voice)}/mo for {additionalLocations} additional location{additionalLocations > 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* Features */}
            <ul className="space-y-2">
              {tierInfo.features.slice(0, 6).map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm leading-relaxed">{feature}</span>
                </li>
              ))}
            </ul>

            {/* Monthly Total */}
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">Monthly Total</span>
                <span className="text-2xl font-bold">{formatPrice(monthlyTotal)}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedStep?.includedMinutes?.toLocaleString()} pooled minutes • {additionalLocations + 1} location{additionalLocations > 0 ? "s" : ""}
              </div>
            </div>

            {/* CTA */}
            <div>
              {linkToSignup ? (
                <Link to={`/signup?sku=${selectedSku}&locations=${additionalLocations}`}>
                  <Button className="w-full" variant="default" size="lg">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Button
                  className="w-full"
                  variant="default"
                  size="lg"
                  onClick={handleSelectPlan}
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enterprise Card */}
      {enterpriseStep && (
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-dashed">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{enterpriseStep.name}</h3>
                  <p className="text-muted-foreground">
                    {enterpriseStep.shortName} with custom pricing and dedicated support
                  </p>
                </div>
                <a href="mailto:jack@getfluxdata.com?subject=Enterprise%20Inquiry">
                  <Button variant="outline" className="gap-2">
                    <Mail className="h-4 w-4" />
                    Talk to Sales
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* What's Included in All Plans */}
      <div className="text-center p-8 rounded-2xl bg-muted/30 border max-w-4xl mx-auto">
        <h3 className="font-semibold text-lg mb-5">Included in all plans</h3>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm">
          {INCLUDED_IN_ALL_PLANS.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              <span className="font-medium">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Re-export for backward compatibility
export type { PlanSku as PlanCode } from "@/config/pricing";
