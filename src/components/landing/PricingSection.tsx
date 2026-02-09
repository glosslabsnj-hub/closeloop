import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";
import { LADDER_STEPS, INCLUDED_IN_ALL_PLANS, formatPrice } from "@/config/pricing";

const displayPlans = LADDER_STEPS.filter((s) => !s.isEnterprise);

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 md:py-28 bg-background">
      <div className="container">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Pricing
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            One platform, flexible minute bundles. No hidden fees.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto mb-12">
          {displayPlans.map((plan) => {
            const isRecommended = plan.sku === "growth-2000";
            return (
              <Card
                key={plan.sku}
                className={`relative bg-card transition-all duration-300 hover:shadow-lg ${
                  isRecommended
                    ? "border-primary shadow-md ring-1 ring-primary/20"
                    : "hover:border-border/60"
                }`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    Most Popular
                  </div>
                )}
                <CardContent className="p-6 pt-8">
                  <p className="text-sm font-medium text-muted-foreground mb-1">{plan.name}</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-bold">{formatPrice(plan.price)}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-5">
                    {plan.includedMinutes?.toLocaleString()} minutes included
                  </p>

                  <Link to={`/signup?sku=${plan.sku}`}>
                    <Button
                      className="w-full gap-2"
                      variant={isRecommended ? "default" : "outline"}
                    >
                      Start Free Trial
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>

                  <div className="mt-5 pt-5 border-t space-y-2.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Includes
                    </p>
                    <ul className="space-y-2">
                      <li className="text-sm flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{plan.includedMinutes?.toLocaleString()} pooled minutes</span>
                      </li>
                      <li className="text-sm flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>Dedicated phone number</span>
                      </li>
                      {plan.overageMinuteRate && (
                        <li className="text-sm flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span>${plan.overageMinuteRate.toFixed(2)}/min overage</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Enterprise callout */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-xl bg-muted/50 border">
            <div>
              <p className="font-semibold">Enterprise (20,000+ minutes)</p>
              <p className="text-sm text-muted-foreground">
                Custom pricing, dedicated support, and SLA guarantees
              </p>
            </div>
            <Button variant="outline" asChild>
              <a href="mailto:sales@closeloop.ai">Contact Sales</a>
            </Button>
          </div>
        </div>

        {/* Included in all plans */}
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm font-semibold mb-4">Included in every plan</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {INCLUDED_IN_ALL_PLANS.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
