import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, MessageSquare, Phone, Sparkles, ArrowRight } from "lucide-react";
import type { PlanCode } from "@/types/database";

export interface PlanInfo {
  code: PlanCode;
  name: string;
  price: number;
  description: string;
  features: string[];
  highlight?: boolean;
}

export const plans: PlanInfo[] = [
  {
    code: "text",
    name: "Instant Text-Back",
    price: 99,
    description: "Automated SMS follow-ups for missed calls and new leads",
    features: [
      "Instant missed call text-back",
      "New lead auto-SMS",
      "Follow-up sequences",
      "Booking link delivery",
      "Smart conversation tracking",
    ],
  },
  {
    code: "voice",
    name: "AI Voice Receptionist",
    price: 199,
    description: "AI answers calls, qualifies leads, and books appointments",
    features: [
      "AI answers inbound calls",
      "Captures customer info",
      "Handles objections naturally",
      "Pushes to booking links",
      "SMS follow-up messages",
      "Multiple routing modes",
    ],
    highlight: true,
  },
  {
    code: "both",
    name: "Complete Package",
    price: 249.99,
    description: "Full AI voice + instant text-back for maximum conversion",
    features: [
      "Everything in Text-Back",
      "Everything in Voice",
      "Combined automation power",
      "Priority support",
      "Advanced analytics",
    ],
  },
];

const getPlanIcon = (code: PlanCode) => {
  switch (code) {
    case "text":
      return MessageSquare;
    case "voice":
      return Phone;
    case "both":
      return Sparkles;
  }
};

interface PricingCardsProps {
  onSelectPlan?: (planCode: PlanCode) => void;
  linkToSignup?: boolean;
  compact?: boolean;
}

export function PricingCards({ onSelectPlan, linkToSignup = false, compact = false }: PricingCardsProps) {
  return (
    <div className={`grid gap-6 ${compact ? 'md:grid-cols-3' : 'md:grid-cols-3'}`}>
      {plans.map((plan) => {
        const Icon = getPlanIcon(plan.code);

        const cardContent = (
          <Card
            className={`relative transition-all cursor-pointer ${
              plan.highlight
                ? "border-primary shadow-lg scale-[1.02]"
                : "hover:border-primary/50"
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              </div>
            )}

            <CardHeader className={compact ? "pb-2" : "pb-4"}>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg mb-3 ${
                  plan.highlight
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/10 text-primary"
                }`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Price */}
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>

              {/* Features */}
              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div>
                <Button
                  className="w-full"
                  variant={plan.highlight ? "default" : "outline"}
                  onClick={onSelectPlan ? () => onSelectPlan(plan.code) : undefined}
                >
                  Start 7-Day Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Then ${plan.price}/mo after trial
                </p>
              </div>
            </CardContent>
          </Card>
        );

        if (linkToSignup) {
          return (
            <Link key={plan.code} to={`/signup?plan=${plan.code}`}>
              {cardContent}
            </Link>
          );
        }

        return <div key={plan.code}>{cardContent}</div>;
      })}
    </div>
  );
}
