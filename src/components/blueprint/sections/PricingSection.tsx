import {
  TIERS,
  LADDER_STEPS,
  LOCATION_ADD_ONS,
  INCLUDED_IN_ALL_PLANS,
  TRIAL_CONFIG,
  formatPrice,
} from "@/config/pricing";

export function PricingSection() {
  return (
    <section id="pricing" className="blueprint-section">
      <h2 className="text-3xl font-bold mb-2 print:text-black">12. Pricing & Subscriptions</h2>
      <p className="text-sm text-muted-foreground mb-6 print:text-gray-600">
        Single-tier pricing with pooled minute bundles. All plans include the full platform.
      </p>
      <p className="text-xs text-muted-foreground mb-6 italic print:text-gray-500">
        Auto-generated from pricing.ts — prices update automatically.
      </p>

      {/* Base Plan */}
      <h3 className="text-xl font-semibold mb-3">Platform Plan</h3>
      {TIERS.map((tier) => (
        <div key={tier.tier} className="border rounded-lg p-4 mb-6">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold">{formatPrice(tier.startingPrice)}/mo</span>
            <span className="text-muted-foreground">starting</span>
          </div>
          <p className="font-semibold mb-1">{tier.displayName}</p>
          <p className="text-sm text-muted-foreground mb-3 print:text-gray-600">{tier.description}</p>
          <ul className="text-sm space-y-1">
            {tier.features.map((f, i) => (
              <li key={i} className="text-muted-foreground print:text-gray-700">• {f}</li>
            ))}
          </ul>
        </div>
      ))}

      {/* Minute Bundles */}
      <h3 className="text-xl font-semibold mb-3">
        Minute Bundles
        <span className="text-sm font-normal text-muted-foreground ml-2">({LADDER_STEPS.length} tiers)</span>
      </h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3 font-semibold">Plan</th>
              <th className="text-left py-2 px-3 font-semibold">SKU</th>
              <th className="text-right py-2 px-3 font-semibold">Price/mo</th>
              <th className="text-right py-2 px-3 font-semibold">Minutes</th>
              <th className="text-right py-2 px-3 font-semibold">Overage Rate</th>
            </tr>
          </thead>
          <tbody>
            {LADDER_STEPS.map((step) => (
              <tr key={step.sku} className="border-b border-border/50">
                <td className="py-2 px-3 font-medium">
                  {step.name}
                  {step.isDefault && <span className="ml-2 text-xs text-primary">(Default)</span>}
                  {step.isEnterprise && <span className="ml-2 text-xs text-muted-foreground">(Contact Sales)</span>}
                </td>
                <td className="py-2 px-3 font-mono text-xs">{step.sku}</td>
                <td className="py-2 px-3 text-right">{step.price === 0 ? "Custom" : formatPrice(step.price)}</td>
                <td className="py-2 px-3 text-right">{step.includedMinutes?.toLocaleString() ?? "Custom"}</td>
                <td className="py-2 px-3 text-right">
                  {step.overageMinuteRate ? `$${step.overageMinuteRate.toFixed(2)}/min` : "Contact sales"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Location Add-ons */}
      <h3 className="text-xl font-semibold mb-3">Location Add-ons</h3>
      <p className="text-sm text-muted-foreground mb-4 print:text-gray-600">
        Additional locations with dedicated phone numbers: <span className="font-semibold text-foreground print:text-black">${LOCATION_ADD_ONS.voice}/mo</span> per location.
        Minutes are pooled across all locations.
      </p>

      {/* Trial */}
      <h3 className="text-xl font-semibold mb-3">Trial Configuration</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">
          <tbody>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">Duration</td>
              <td className="py-2 px-3">{TRIAL_CONFIG.duration_days} days</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">Included Minutes</td>
              <td className="py-2 px-3">{TRIAL_CONFIG.included_minutes}</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">Card Required</td>
              <td className="py-2 px-3">{TRIAL_CONFIG.card_required ? "Yes" : "No"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Included in All Plans */}
      <h3 className="text-xl font-semibold mb-3">Included in All Plans</h3>
      <ul className="text-sm space-y-1 mb-6">
        {INCLUDED_IN_ALL_PLANS.map((feature, i) => (
          <li key={i} className="text-muted-foreground print:text-gray-700">• {feature}</li>
        ))}
      </ul>
    </section>
  );
}
