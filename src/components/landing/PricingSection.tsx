import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";
import { LADDER_STEPS, INCLUDED_IN_ALL_PLANS, TRIAL_CONFIG, formatPrice } from "@/config/pricing";

const displayPlans = LADDER_STEPS.filter((s) => !s.isEnterprise);

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_0%,hsl(230_70%_62%/0.06),transparent)] pointer-events-none" />

      <div className="container relative">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Pricing
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-5">
            Simple,{" "}
            <span className="text-gradient-primary">transparent pricing</span>
          </h2>
          <p className="text-lg text-muted-foreground/80 max-w-xl mx-auto leading-relaxed">
            One platform, flexible minute bundles. No hidden fees.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto mb-14">
          {displayPlans.map((plan) => {
            const isRecommended = plan.sku === "growth-150";
            return (
              <div
                key={plan.sku}
                className={`relative rounded-xl p-6 pt-8 transition-all duration-300 ${
                  isRecommended
                    ? "bg-card/80 backdrop-blur-sm border-primary/50 border shadow-[0_0_40px_-8px_hsl(230_70%_62%/0.2)] hover:shadow-[0_0_50px_-6px_hsl(230_70%_62%/0.3)]"
                    : "bg-card/60 backdrop-blur-sm border border-border/30 hover:border-primary/30 hover:bg-card/80 hover:shadow-[0_8px_32px_-8px_hsl(230_70%_62%/0.1)]"
                }`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-[0_0_20px_-4px_hsl(230_70%_62%/0.4)]">
                    Most Popular
                  </div>
                )}
                <p className="text-sm font-medium text-muted-foreground mb-1">{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold tracking-tight">{formatPrice(plan.price)}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
                <p className="text-sm text-muted-foreground mb-5">
                  {plan.includedMinutes?.toLocaleString()} minutes included
                </p>

                <Link to={`/signup?sku=${plan.sku}`}>
                  <Button
                    className={`w-full gap-2 ${isRecommended ? "shadow-[0_0_20px_-6px_hsl(230_70%_62%/0.3)]" : ""}`}
                    variant={isRecommended ? "default" : "outline"}
                  >
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  {TRIAL_CONFIG.duration_days}-day free trial, then {formatPrice(plan.price)}/mo
                </p>

                <div className="mt-5 pt-5 border-t border-border/30 space-y-2.5">
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
              </div>
            );
          })}
        </div>

        {/* Enterprise callout */}
        <div className="max-w-3xl mx-auto mb-14">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30">
            <div>
              <p className="font-semibold">Enterprise (20,000+ minutes)</p>
              <p className="text-sm text-muted-foreground">
                Custom pricing, dedicated support, and SLA guarantees
              </p>
            </div>
            <Button variant="outline" asChild>
              <a href="mailto:jack@getfluxdata.com">Contact Sales</a>
            </Button>
          </div>
        </div>

        {/* Included in all plans */}
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm font-semibold mb-5">Included in every plan</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2.5">
            {INCLUDED_IN_ALL_PLANS.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground/80">
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
