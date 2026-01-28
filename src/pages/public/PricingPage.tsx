import { Shield, Clock, CreditCard } from "lucide-react";
import { PricingCards } from "@/components/pricing/PricingCards";
import { LOCATION_ADD_ONS } from "@/config/pricing";

export default function PricingPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start your 7-day free trial. Enter payment info upfront — you won't be charged until
            the trial ends.
          </p>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-6 mb-10 text-sm text-muted-foreground">
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

        {/* Plans */}
        <div className="max-w-5xl mx-auto">
          <PricingCards linkToSignup />
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Your card will be securely saved and charged only after your 7-day trial ends.
        </p>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
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
                q: "What happens to my data if I cancel?",
                a: "Your data is yours. You can export everything before canceling, and we keep your data for 30 days after cancellation.",
              },
              {
                q: "How does usage metering work?",
                a: "Each plan includes a set amount of voice minutes and/or SMS segments per month. You can track your usage in the dashboard. If you exceed your included limits, overage charges apply at the rates shown.",
              },
              {
                q: "What if I go over my included limits?",
                a: "No worries! Your service continues uninterrupted. You'll be billed for overages at the rates shown (e.g., $0.45/min for voice, $0.03/SMS). If you consistently exceed limits, upgrading to the next tier often saves money.",
              },
              {
                q: "What's the difference between SMS and Voice plans?",
                a: "SMS Instant Respond sends automated text replies to missed calls and leads. AI Voice Receptionist actually answers your phone, qualifies leads, and books appointments in real-time. The Both plan combines both capabilities.",
              },
              {
                q: "Can I add multiple locations or phone numbers?",
                a: `Yes! Additional locations are $${LOCATION_ADD_ONS.smsOnly}/month for SMS-only plans or $${LOCATION_ADD_ONS.voiceOrBoth}/month for Voice or Both plans. Each location includes a dedicated number with separate routing.`,
              },
            ].map((faq) => (
              <div key={faq.q}>
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
