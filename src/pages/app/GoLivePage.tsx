import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare, Phone, Sparkles, Check, ArrowRight, Loader2, 
  Zap, Clock, Bot, Shield, ChevronRight, ChevronLeft
} from "lucide-react";
import {
  TIERS,
  getLadderStepsForTier,
  getDefaultStepForTier,
  formatPrice,
  type PlanTier,
  type PlanSku,
  type TierInfo,
} from "@/config/pricing";

const getIcon = (iconName: TierInfo["icon"]) => {
  switch (iconName) {
    case "MessageSquare":
      return MessageSquare;
    case "Phone":
      return Phone;
    case "Sparkles":
      return Sparkles;
  }
};

export default function GoLivePage() {
  const { tenant, refreshTenant } = useAuth();
  const { createSubscription, loading: subLoading } = useSubscription(tenant?.id || null);
  const [step, setStep] = useState<"tier" | "usage">("tier");
  const [selectedTier, setSelectedTier] = useState<PlanTier | null>(null);
  const [selectedSku, setSelectedSku] = useState<PlanSku | null>(null);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleTierSelect = (tier: PlanTier) => {
    setSelectedTier(tier);
    const defaultStep = getDefaultStepForTier(tier);
    if (defaultStep) {
      setSelectedSku(defaultStep.sku);
    }
    setStep("usage");
  };

  const handleBack = () => {
    setStep("tier");
  };

  const handleConfirm = async () => {
    if (!selectedSku || processing) return;
    
    setProcessing(true);

    try {
      await createSubscription(selectedSku);
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

  const ladderSteps = selectedTier ? getLadderStepsForTier(selectedTier) : [];
  const selectedStep = ladderSteps.find((s) => s.sku === selectedSku);
  const tierInfo = selectedTier ? TIERS.find((t) => t.tier === selectedTier) : null;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
            <Zap className="h-4 w-4" />
            Almost there!
          </div>
          <h1 className="text-4xl font-bold mb-3">
            {step === "tier" ? "Choose Your Plan" : "Select Usage Level"}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {step === "tier"
              ? "Select your plan and start your 7-day free trial. You won't be charged until the trial ends."
              : `Choose how much usage you need for ${tierInfo?.displayName}.`}
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
            <span>7-day free trial</span>
          </div>
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span>No charge until trial ends</span>
          </div>
        </div>

        {/* Step 1: Tier Selection */}
        {step === "tier" && (
          <div className="grid md:grid-cols-3 gap-6">
            {TIERS.map((tier) => {
              const Icon = getIcon(tier.icon);

              return (
                <Card 
                  key={tier.tier} 
                  className={`relative transition-all cursor-pointer hover:border-primary/50 ${
                    tier.highlight ? 'border-primary shadow-lg scale-[1.02]' : ''
                  }`}
                  onClick={() => handleTierSelect(tier.tier)}
                >
                  {tier.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg mb-3 ${
                      tier.highlight ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                    }`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">{tier.displayName}</CardTitle>
                    <CardDescription>{tier.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Price */}
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Starting at</div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">{formatPrice(tier.startingPrice)}</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3">
                      {tier.features.slice(0, 4).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Button 
                      className="w-full" 
                      variant={tier.highlight ? "default" : "outline"}
                    >
                      Select {tier.displayName}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Step 2: Usage Level Selection */}
        {step === "usage" && tierInfo && (
          <div className="max-w-2xl mx-auto">
            <Button variant="ghost" onClick={handleBack} className="mb-6">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to plans
            </Button>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  {(() => {
                    const Icon = getIcon(tierInfo.icon);
                    return (
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        tierInfo.highlight ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    );
                  })()}
                  <div>
                    <CardTitle>{tierInfo.displayName}</CardTitle>
                    <CardDescription>{tierInfo.shortDescription}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-medium mb-4 block">
                    Choose your usage level
                  </Label>
                  <RadioGroup
                    value={selectedSku || undefined}
                    onValueChange={(value) => setSelectedSku(value as PlanSku)}
                    className="space-y-3"
                  >
                    {ladderSteps.map((ladderStep) => (
                      <div
                        key={ladderStep.sku}
                        className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer ${
                          selectedSku === ladderStep.sku ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedSku(ladderStep.sku)}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={ladderStep.sku} id={ladderStep.sku} />
                          <Label htmlFor={ladderStep.sku} className="cursor-pointer">
                            <div className="font-medium">{ladderStep.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {ladderStep.includedMinutes && `${ladderStep.includedMinutes.toLocaleString()} minutes`}
                              {ladderStep.includedMinutes && ladderStep.includedSmsSegments && " + "}
                              {ladderStep.includedSmsSegments && `${ladderStep.includedSmsSegments.toLocaleString()} SMS segments`}
                              {" included"}
                            </div>
                          </Label>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{formatPrice(ladderStep.price)}</div>
                          <div className="text-sm text-muted-foreground">/month</div>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {selectedStep && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="font-medium">Overage rates:</div>
                    <div className="text-muted-foreground">
                      {selectedStep.overageMinuteRate && (
                        <span>${selectedStep.overageMinuteRate}/minute over included</span>
                      )}
                      {selectedStep.overageMinuteRate && selectedStep.overageSmsRate && " • "}
                      {selectedStep.overageSmsRate && (
                        <span>${selectedStep.overageSmsRate}/SMS segment over included</span>
                      )}
                    </div>
                  </div>
                )}

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleConfirm}
                  disabled={processing || !selectedSku}
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Start 7-Day Free Trial
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                {selectedStep && (
                  <p className="text-xs text-center text-muted-foreground">
                    Then {formatPrice(selectedStep.price)}/mo after trial ends
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer note */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Your card will be securely saved and charged only after your 7-day trial ends.
          <br />
          Cancel anytime during the trial — no charges. By continuing, you agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
}
