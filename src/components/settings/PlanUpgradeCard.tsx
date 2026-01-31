import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useUsage } from "@/hooks/useUsage";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowUpRight, Check, Loader2, TrendingUp } from "lucide-react";
import {
  getLadderStep,
  getLadderStepsForTier,
  getTierInfo,
  formatPrice,
  type PlanSku,
  type PlanLadderStep,
} from "@/config/pricing";

export function PlanUpgradeCard() {
  const { tenant } = useAuth();
  const { subscription, planSku, hasVoice, hasSms, refetch } = useSubscription(tenant?.id || null);
  const { usage, nextUpgrade } = useUsage(tenant?.id || null, planSku);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [selectedUpgradeSku, setSelectedUpgradeSku] = useState<PlanSku | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const currentStep = planSku ? getLadderStep(planSku) : null;
  const tierInfo = currentStep ? getTierInfo(currentStep.tier) : null;
  const tierSteps = currentStep ? getLadderStepsForTier(currentStep.tier) : [];
  const currentIndex = tierSteps.findIndex(s => s.sku === planSku);

  const handleUpgrade = async () => {
    if (!tenant?.id || !selectedUpgradeSku) return;

    setIsUpgrading(true);
    try {
      const newStep = getLadderStep(selectedUpgradeSku);
      if (!newStep) throw new Error("Invalid SKU");

      // Update subscription with new plan
      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan_code: selectedUpgradeSku,
          included_minutes: newStep.includedMinutes,
          included_sms_segments: newStep.includedSmsSegments,
          overage_minute_rate_cents: newStep.overageMinuteRate ? Math.round(newStep.overageMinuteRate * 100) : null,
          overage_sms_rate_cents: Math.round(newStep.overageSmsRate * 100),
        })
        .eq("tenant_id", tenant.id);

      if (error) throw error;

      // In production, this would also update the Stripe subscription
      // await supabase.functions.invoke("update-stripe-subscription", {
      //   body: { tenant_id: tenant.id, new_sku: selectedUpgradeSku }
      // });

      toast.success(`Upgraded to ${newStep.name}!`, {
        description: `Your new included limits are now active.`,
      });

      setShowUpgradeDialog(false);
      setSelectedUpgradeSku(null);
      await refetch();
    } catch (error) {
      console.error("Upgrade failed:", error);
      toast.error("Failed to upgrade plan");
    } finally {
      setIsUpgrading(false);
    }
  };

  if (!subscription || !currentStep || !tierInfo) {
    return null;
  }

  const totalOverage = (usage?.projectedVoiceOverage || 0) + (usage?.projectedSmsOverage || 0);
  const availableUpgrades = tierSteps.slice(currentIndex + 1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>{tierInfo.displayName}</CardDescription>
          </div>
          <Badge variant={subscription.status === "trialing" ? "secondary" : "default"}>
            {subscription.status === "trialing" ? "Trial" : "Active"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan Details */}
        <div className="p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-lg">{currentStep.name}</span>
            <span className="font-bold text-xl">{formatPrice(currentStep.price)}/mo</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {currentStep.includedMinutes && `${currentStep.includedMinutes.toLocaleString()} minutes`}
            {currentStep.includedMinutes && currentStep.includedSmsSegments && " + "}
            {currentStep.includedSmsSegments && `${currentStep.includedSmsSegments.toLocaleString()} SMS`}
            {" included"}
          </div>
        </div>

        {/* Usage Summary */}
        {usage && (
          <div className="space-y-3">
            {hasVoice && usage.includedMinutes !== null && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Voice minutes</span>
                  <span>{usage.voiceMinutesUsed.toLocaleString()} / {usage.includedMinutes.toLocaleString()}</span>
                </div>
                <Progress 
                  value={usage.voicePercentUsed} 
                  className={usage.voicePercentUsed >= 90 ? "bg-destructive/20" : ""}
                />
              </div>
            )}
            {hasSms && usage.includedSmsSegments !== null && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>SMS segments</span>
                  <span>{usage.smsSegmentsUsed.toLocaleString()} / {usage.includedSmsSegments.toLocaleString()}</span>
                </div>
                <Progress 
                  value={usage.smsPercentUsed}
                  className={usage.smsPercentUsed >= 90 ? "bg-destructive/20" : ""}
                />
              </div>
            )}
            {totalOverage > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                <span className="text-sm font-medium">Projected overage this period</span>
                <span className="font-bold">${totalOverage.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Upgrade Options */}
        {availableUpgrades.length > 0 && (
          <>
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-medium">Upgrade for more included usage</span>
              </div>
              
              <div className="space-y-2">
                {availableUpgrades.map((step) => {
                  const priceDiff = step.price - currentStep.price;
                  const wouldSave = totalOverage > priceDiff;
                  
                  return (
                    <button
                      key={step.sku}
                      className="w-full flex items-center justify-between p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                      onClick={() => {
                        setSelectedUpgradeSku(step.sku);
                        setShowUpgradeDialog(true);
                      }}
                    >
                      <div>
                        <div className="font-medium">{step.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {step.includedMinutes && `${step.includedMinutes.toLocaleString()} min`}
                          {step.includedMinutes && step.includedSmsSegments && " + "}
                          {step.includedSmsSegments && `${step.includedSmsSegments.toLocaleString()} SMS`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatPrice(step.price)}/mo</div>
                        <div className="text-xs text-muted-foreground">
                          +{formatPrice(priceDiff)}/mo
                        </div>
                        {wouldSave && (
                          <Badge variant="secondary" className="text-xs mt-1 bg-primary/10 text-primary">
                            Saves ${(totalOverage - priceDiff).toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Overage Rates */}
        <div className="text-xs text-muted-foreground border-t pt-4">
          <strong>Overage rates:</strong>{" "}
          {currentStep.overageMinuteRate && `$${currentStep.overageMinuteRate.toFixed(2)}/min`}
          {currentStep.overageMinuteRate && currentStep.overageSmsRate && " • "}
          {currentStep.overageSmsRate && `$${currentStep.overageSmsRate.toFixed(2)}/SMS`}
        </div>
      </CardContent>

      {/* Upgrade Confirmation Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Plan Upgrade</DialogTitle>
            <DialogDescription>
              You're upgrading to a plan with more included usage.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUpgradeSku && (() => {
            const newStep = getLadderStep(selectedUpgradeSku);
            if (!newStep) return null;
            const priceDiff = newStep.price - currentStep.price;
            
            return (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                  <div>
                    <div className="font-medium">{currentStep.name}</div>
                    <div className="text-sm text-muted-foreground">Current plan</div>
                  </div>
                  <ArrowUpRight className="h-5 w-5" />
                  <div className="text-right">
                    <div className="font-medium">{newStep.name}</div>
                    <div className="text-sm text-muted-foreground">New plan</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>New monthly rate</span>
                    <span className="font-bold">{formatPrice(newStep.price)}/mo</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Increase from current</span>
                    <span>+{formatPrice(priceDiff)}/mo</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-primary/10 text-sm">
                  <div className="font-medium mb-1">New included limits:</div>
                  <ul className="space-y-1 text-muted-foreground">
                    {newStep.includedMinutes && (
                      <li className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-primary" />
                        {newStep.includedMinutes.toLocaleString()} voice minutes
                      </li>
                    )}
                    {newStep.includedSmsSegments && (
                      <li className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-primary" />
                        {newStep.includedSmsSegments.toLocaleString()} SMS segments
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpgrade} disabled={isUpgrading}>
              {isUpgrading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
