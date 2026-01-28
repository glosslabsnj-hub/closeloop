import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare, Phone, Sparkles, Check, ArrowRight, Loader2, 
  Zap, Clock, Bot, Shield
} from "lucide-react";
import type { PlanCode, PlanPackage } from "@/types/database";

const plans: PlanPackage[] = [
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

export default function GoLivePage() {
  const { tenant, refreshTenant } = useAuth();
  const { createSubscription, loading: subLoading } = useSubscription(tenant?.id || null);
  const [selectedPlan, setSelectedPlan] = useState<PlanCode | null>(null);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSelectPlan = async (planCode: PlanCode) => {
    if (processing) return;
    
    setSelectedPlan(planCode);
    setProcessing(true);

    try {
      await createSubscription(planCode);
      await refreshTenant();
      
      toast({
        title: "You're Live! 🎉",
        description: "Your AI assistant is ready. Complete the setup checklist to get started.",
      });

      navigate("/app/dashboard");
    } catch (error: any) {
      console.error("Subscription error:", error);
      toast({
        variant: "destructive",
        title: "Failed to activate plan",
        description: error.message || "Please try again.",
      });
    } finally {
      setProcessing(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
            <Zap className="h-4 w-4" />
            Almost there!
          </div>
          <h1 className="text-4xl font-bold mb-3">Choose Your Plan</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select the package that fits your business needs. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Trust badges */}
        <div className="flex justify-center gap-6 mb-10 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>14-day free trial</span>
          </div>
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span>AI trained on your business</span>
          </div>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = getPlanIcon(plan.code);
            const isSelected = selectedPlan === plan.code;
            const isProcessingThis = processing && isSelected;

            return (
              <Card 
                key={plan.code} 
                className={`relative transition-all ${
                  plan.highlight 
                    ? 'border-primary shadow-lg scale-[1.02]' 
                    : 'hover:border-primary/50'
                } ${isSelected ? 'ring-2 ring-primary' : ''}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg mb-3 ${
                    plan.highlight ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                  }`}>
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
                  <Button 
                    className="w-full" 
                    variant={plan.highlight ? "default" : "outline"}
                    onClick={() => handleSelectPlan(plan.code)}
                    disabled={processing}
                  >
                    {isProcessingThis ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Activating...
                      </>
                    ) : (
                      <>
                        Start Free Trial
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          By selecting a plan, you agree to our Terms of Service and Privacy Policy.
          <br />
          Stripe payment integration coming soon — currently using mock checkout.
        </p>
      </div>
    </div>
  );
}
