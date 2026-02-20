import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import { AIReadinessPanel } from "@/components/dashboard/AIReadinessPanel";
import { ScheduleConnectionCard } from "@/components/schedule/ScheduleConnectionCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare, Phone, Sparkles, Check, ArrowRight, Loader2, 
  Zap, Clock, Bot, Shield, ChevronRight, ChevronLeft, AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAgencyManagedTenant } from "@/hooks/useIsAgencyManagedTenant";
import { cn } from "@/lib/utils";
import {
  TIERS,
  TRIAL_CONFIG,
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
  const { user, tenant, refreshTenant, isSuperAdmin } = useAuth();
  const { createSubscription, loading: subLoading } = useSubscription(tenant?.id || null, isSuperAdmin);
  const { score, canGoLive, p0Flags, isReady } = useAIReadinessV2();
  const [step, setStep] = useState<"tier" | "usage">("tier");
  const [selectedTier, setSelectedTier] = useState<PlanTier | null>(null);
  const [selectedSku, setSelectedSku] = useState<PlanSku | null>(null);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: isAgencyManaged } = useIsAgencyManagedTenant(tenant?.id || null);

  if (!user) return <Navigate to="/login" replace />;

  // Go-live is blocked unless canGoLive is true — relaxed for agency-managed tenants
  const goLiveBlocked = isAgencyManaged ? false : !canGoLive;

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

    // Block if readiness requirements not met
    if (goLiveBlocked) {
      toast({
        variant: "destructive",
        title: "Cannot Go Live Yet",
        description: `Please fix ${p0Flags.length} blocking issue${p0Flags.length > 1 ? 's' : ''} first. Scroll up to see details.`,
      });
      return;
    }

    setProcessing(true);

    try {
      // Create Stripe Checkout Session via edge function
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { plan_sku: selectedSku },
      });

      if (error) throw new Error(error.message || "Failed to create checkout session");
      if (!data?.checkout_url) throw new Error("No checkout URL returned");

      // Redirect to Stripe Checkout
      window.location.href = data.checkout_url;
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        variant: "destructive",
        title: "Failed to start checkout",
        description: error.message || "Please try again.",
      });
      setProcessing(false);
    }
  };

  const ladderSteps = selectedTier ? getLadderStepsForTier(selectedTier) : [];
  const selectedStep = ladderSteps.find((s) => s.sku === selectedSku);
  const tierInfo = selectedTier ? TIERS.find((t) => t.tier === selectedTier) : null;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-2xl font-bold tracking-tight mb-2">
            {step === "tier" ? "Choose Your Plan" : "Select Usage Level"}
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            {step === "tier"
              ? "Select your plan to get started."
              : `Choose how much usage you need for ${tierInfo?.displayName}.`}
          </p>
        </div>

        {/* AI Readiness Panel - Full version with P0/P1 checklists */}
        <div className="mb-8">
          <AIReadinessPanel alwaysShow={true} />
        </div>

        {/* Schedule Connection Card */}
        <div className="mb-8">
          <ScheduleConnectionCard />
        </div>
        
        {/* Blocking Message */}
        {goLiveBlocked && (
          <Card className="mb-8 border-destructive/50 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    Finish {p0Flags.length} item{p0Flags.length > 1 ? 's' : ''} to go live
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Fix the blocking issues above before activating your plan.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mb-6" />

        {/* Step 1: Tier Selection */}
        {step === "tier" && (
          <div className="grid md:grid-cols-3 gap-6">
            {TIERS.map((tier) => {
              const Icon = getIcon(tier.icon);

              return (
                <Card
                  key={tier.tier}
                  className={cn(
                    "relative transition-all duration-150 cursor-pointer hover:border-primary/50 bg-card/60 backdrop-blur-sm card-interactive",
                    tier.highlight ? 'border-primary glow-primary-sm glow-primary scale-[1.02]' : 'border-border/30'
                  )}
                  onClick={() => handleTierSelect(tier.tier)}
                >
                  {tier.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground glow-primary-sm">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl mb-3",
                      tier.highlight ? 'bg-primary text-primary-foreground glow-primary-sm' : 'bg-primary/10 text-primary border border-primary/15'
                    )}>
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
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl",
                        tierInfo.highlight ? 'bg-primary text-primary-foreground glow-primary-sm' : 'bg-primary/10 text-primary border border-primary/15'
                      )}>
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
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-150 bg-card/60 backdrop-blur-sm",
                          selectedSku === ladderStep.sku ? "border-primary bg-primary/5 shadow-sm" : "border-border/30 hover:border-primary/50"
                        )}
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
                  <div className="bg-card/60 backdrop-blur-sm border border-border/20 rounded-xl p-4 space-y-2 text-sm card-interactive">
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
                  disabled={processing || !selectedSku || goLiveBlocked}
                  variant={goLiveBlocked ? "secondary" : "default"}
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : goLiveBlocked ? (
                    <>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Fix Issues First
                    </>
                  ) : (
                    <>
                      Start {TRIAL_CONFIG.duration_days}-Day Free Trial
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                {selectedStep && !goLiveBlocked && (
                  <p className="text-xs text-center text-muted-foreground">
                    {TRIAL_CONFIG.duration_days}-day free trial, then {formatPrice(selectedStep.price)}/month
                  </p>
                )}
                {goLiveBlocked && (
                  <p className="text-xs text-center text-muted-foreground">
                    Scroll up to see what needs to be fixed
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer note */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          {TRIAL_CONFIG.duration_days}-day free trial with {TRIAL_CONFIG.included_minutes} minutes included. Cancel anytime.
          <br />
          Your card will be charged after the trial ends. By continuing, you agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
}
