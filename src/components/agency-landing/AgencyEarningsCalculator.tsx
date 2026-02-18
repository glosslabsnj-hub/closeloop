import { useState } from "react";
import { LADDER_STEPS } from "@/config/pricing";
import { cn } from "@/lib/utils";
import { Calculator, DollarSign } from "lucide-react";

const clientOptions = [5, 10, 25, 50];
const COMMISSION_RATE = 0.20;

// Only show non-enterprise plans
const plans = LADDER_STEPS.filter((s) => !s.isEnterprise && s.price > 0);

export function AgencyEarningsCalculator() {
  const [clients, setClients] = useState(10);
  const [selectedPlan, setSelectedPlan] = useState(plans[1]?.sku ?? plans[0]?.sku);

  const plan = plans.find((p) => p.sku === selectedPlan) ?? plans[0];
  const monthlyCommission = clients * plan.price * COMMISSION_RATE;
  const annualCommission = monthlyCommission * 12;

  return (
    <section className="py-20 md:py-28 bg-card/30">
      <div className="container mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Earnings Calculator
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            See how much you could earn with recurring 20% commissions.
          </p>
        </div>

        <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-6 md:p-10 shadow-lg">
          <div className="space-y-8">
            {/* Client count selector */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-3 block">
                How many clients will you bring?
              </label>
              <div className="flex flex-wrap gap-3">
                {clientOptions.map((count) => (
                  <button
                    key={count}
                    onClick={() => setClients(count)}
                    className={cn(
                      "rounded-lg border px-5 py-2.5 text-sm font-medium transition-all",
                      clients === count
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border hover:border-primary/40 hover:bg-primary/5"
                    )}
                  >
                    {count} clients
                  </button>
                ))}
              </div>
            </div>

            {/* Plan selector */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-3 block">
                Average client plan
              </label>
              <div className="grid sm:grid-cols-3 gap-3">
                {plans.map((p) => (
                  <button
                    key={p.sku}
                    onClick={() => setSelectedPlan(p.sku)}
                    className={cn(
                      "rounded-lg border p-4 text-left transition-all",
                      selectedPlan === p.sku
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className="text-sm font-semibold">{p.name}</div>
                    <div className="text-lg font-bold text-primary">
                      ${p.price.toLocaleString()}/mo
                    </div>
                    <div className="text-xs text-muted-foreground">{p.shortName} included</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-blue-500/5 border border-primary/20 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  {clients} clients on {plan.name} (${plan.price.toLocaleString()}/mo)
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Monthly Commission</div>
                  <div className="flex items-baseline gap-1">
                    <DollarSign className="h-6 w-6 text-green-500" />
                    <span className="text-4xl font-bold text-foreground">
                      {monthlyCommission.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Annual Commission</div>
                  <div className="flex items-baseline gap-1">
                    <DollarSign className="h-6 w-6 text-green-500" />
                    <span className="text-4xl font-bold text-foreground">
                      {annualCommission.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">/yr</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
