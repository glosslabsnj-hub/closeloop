import { Shield, Clock, CreditCard } from "lucide-react";
import { PricingCards } from "@/components/pricing/PricingCards";

export default function PricingPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start your 7-day free trial. Enter payment info upfront — you won't be charged until the trial ends.
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
          <h2 className="text-2xl font-bold text-center mb-8">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "How does the 7-day free trial work?",
                a: "Select your plan, enter your payment info, and get full access for 7 days. You won't be charged until the trial ends. Cancel anytime before that — no questions asked.",
              },
              {
                q: "Can I change plans later?",
                a: "Absolutely. You can upgrade or downgrade at any time. Changes take effect on your next billing cycle.",
              },
              {
                q: "What happens to my data if I cancel?",
                a: "Your data is yours. You can export everything before canceling, and we keep your data for 30 days after cancellation.",
              },
              {
                q: "Do you charge per call or message?",
                a: "No! Our pricing is flat-rate. Unlimited calls and messages are included in all plans.",
              },
              {
                q: "What's the difference between Text-Back and Voice?",
                a: "Text-Back sends instant SMS replies to missed calls. Voice lets AI actually answer your phone, qualify leads, and book appointments in real-time.",
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
