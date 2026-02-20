import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, CreditCard, Check, ArrowRight, Phone, MapPin, Plus, Minus, Mail, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  TIERS,
  LADDER_STEPS,
  LOCATION_ADD_ONS,
  INCLUDED_IN_ALL_PLANS,
  formatPrice,
  calculateMonthlyTotal,
  type PlanSku,
} from "@/config/pricing";

export default function PricingPage() {
  const [selectedSku, setSelectedSku] = useState<PlanSku>("base-200");
  const [additionalLocations, setAdditionalLocations] = useState(0);

  const selectedStep = LADDER_STEPS.find((s) => s.sku === selectedSku);
  const tierInfo = TIERS[0];
  const monthlyTotal = calculateMonthlyTotal(selectedSku, additionalLocations);
  
  const selfServeSteps = LADDER_STEPS.filter((s) => !s.isEnterprise);
  const enterpriseStep = LADDER_STEPS.find((s) => s.isEnterprise);

  const handleLocationChange = (delta: number) => {
    setAdditionalLocations(Math.max(0, additionalLocations + delta));
  };

  return (
    <div className="py-20 md:py-28 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_0%,hsl(230_70%_62%/0.08),transparent)] pointer-events-none" />

      <div className="container relative">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-5 gap-1.5 px-4 py-1.5 text-xs backdrop-blur-sm bg-primary/[0.06] border-primary/20">
            <Zap className="h-3 w-3" />
            Simple Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight mb-5 leading-[1.1]">
            One Platform,{" "}
            <span className="text-gradient-primary">Flexible Plans</span>
          </h1>
          <p className="text-lg text-muted-foreground/80 max-w-2xl mx-auto leading-relaxed">
            Start with the base plan and scale as you grow. All minutes are pooled across your locations.
          </p>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-16">
          {[
            { icon: Shield, text: "Cancel anytime" },
            { icon: CreditCard, text: "Secure payment" },
            { icon: Phone, text: "Unlimited simultaneous calls" },
          ].map(({ icon: TrustIcon, text }) => (
            <div key={text} className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-card/40 backdrop-blur-sm border border-border/30 text-sm text-muted-foreground/80">
              <TrustIcon className="h-3.5 w-3.5 text-primary" />
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Main Pricing Card */}
        <div className="max-w-2xl mx-auto mb-14">
          <div className="relative rounded-xl bg-card/70 backdrop-blur-sm border border-primary/40 shadow-[0_0_60px_-12px_hsl(230_70%_62%/0.2)] transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground gap-1.5 px-4 py-1 shadow-[0_0_20px_-4px_hsl(230_70%_62%/0.4)]">
                <Phone className="h-3 w-3" />
                AI Voice Receptionist
              </Badge>
            </div>

            <div className="px-6 pb-4 pt-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl mb-4 bg-primary text-primary-foreground glow-primary-sm">
                <Phone className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold">{tierInfo.displayName}</h3>
              <p className="text-sm text-muted-foreground">{tierInfo.shortDescription}</p>
            </div>

            <div className="px-6 pb-6 space-y-6">
              {/* Minute Bundle Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Choose your monthly minute bundle</Label>
                <RadioGroup
                  value={selectedSku}
                  onValueChange={(value) => setSelectedSku(value as PlanSku)}
                  className="space-y-2"
                >
                  {selfServeSteps.map((step) => (
                    <div
                      key={step.sku}
                      className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-150 ${
                        selectedSku === step.sku
                          ? "border-primary bg-primary/5 shadow-sm shadow-primary/5"
                          : "border-border/60 hover:border-primary/30"
                      }`}
                      onClick={() => setSelectedSku(step.sku)}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={step.sku} id={step.sku} />
                        <Label htmlFor={step.sku} className="cursor-pointer font-normal">
                          <div className="font-medium">{step.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {step.includedMinutes?.toLocaleString()} pooled minutes
                          </div>
                        </Label>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-lg">{formatPrice(step.price)}</span>
                        <span className="text-sm text-muted-foreground">/mo</span>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
                {selectedStep && (
                  <p className="text-sm text-muted-foreground">
                    Overage rate: ${selectedStep.overageMinuteRate}/min over included
                  </p>
                )}
              </div>

              {/* Multi-location Add-on */}
              <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <Label className="font-medium">Locations</Label>
                  </div>
                  <Badge variant="secondary">+${LOCATION_ADD_ONS.voice}/mo each</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Base plan includes 1 location with a dedicated number.
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
                  <span className="w-24 text-center font-medium">
                    {additionalLocations + 1} location{additionalLocations > 0 ? "s" : ""}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleLocationChange(1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2">
                {tierInfo.features.slice(0, 5).map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Monthly Total */}
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">Monthly Total</span>
                  <span className="text-2xl font-bold">{formatPrice(monthlyTotal)}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedStep?.includedMinutes?.toLocaleString()} minutes • {additionalLocations + 1} location{additionalLocations > 0 ? "s" : ""}
                </div>
              </div>

              {/* CTA */}
              <Link to={`/signup?sku=${selectedSku}&locations=${additionalLocations}`}>
                <Button
                  className="w-full gap-2 shadow-[0_0_20px_-6px_hsl(230_70%_62%/0.3)]"
                  variant="default"
                  size="lg"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Enterprise */}
        {enterpriseStep && (
          <div className="max-w-2xl mx-auto mb-14">
            <div className="rounded-xl border border-dashed border-border/40 bg-card/40 backdrop-blur-sm p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{enterpriseStep.name}</h3>
                  <p className="text-muted-foreground">
                    {enterpriseStep.shortName} with custom pricing and dedicated support
                  </p>
                </div>
                <a href="mailto:sales@closeloop.com?subject=Enterprise%20Inquiry">
                  <Button variant="outline" className="gap-2">
                    <Mail className="h-4 w-4" />
                    Talk to Sales
                  </Button>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Included in all plans */}
        <div className="max-w-4xl mx-auto text-center mb-14 p-8 rounded-2xl bg-card/40 backdrop-blur-sm border border-border/30">
          <h3 className="font-semibold mb-5">Included in all plans</h3>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm">
            {INCLUDED_IN_ALL_PLANS.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-muted-foreground/80">
                <Check className="h-4 w-4 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12 tracking-tight">Frequently asked questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "What does 'pooled minutes' mean?",
                a: "Your included minutes are shared across all your locations. For example, if you have 2,000 minutes and 3 locations, any location can use from that shared pool.",
              },
              {
                q: "Can I change plans later?",
                a: "Absolutely. You can upgrade to a higher minute bundle at any time. Changes take effect on your next billing cycle.",
              },
              {
                q: "What if I go over my included limits?",
                a: "Your service continues uninterrupted. You'll be billed for overages at the rates shown. If you consistently exceed limits, upgrading often saves money.",
              },
              {
                q: "What does the AI Receptionist do?",
                a: "The AI answers your calls 24/7, qualifies leads, captures customer information, handles common objections, and can push callers to your booking system.",
              },
              {
                q: "Can I add more locations later?",
                a: "Yes! You can add additional locations anytime from your billing settings. Each location is $99/mo and includes a dedicated phone number.",
              },
            ].map((faq) => (
              <div key={faq.q} className="p-5 rounded-xl bg-card/40 backdrop-blur-sm border border-border/20">
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-muted-foreground/80 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mt-20">
          <Link to="/signup">
            <Button size="lg" className="gap-2.5 h-14 px-10 text-lg font-semibold shadow-[0_0_40px_-8px_hsl(230_70%_62%/0.4)] hover:shadow-[0_0_50px_-6px_hsl(230_70%_62%/0.5)] hover:scale-[1.02] transition-all duration-300">
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
