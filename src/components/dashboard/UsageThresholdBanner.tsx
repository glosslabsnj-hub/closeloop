import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useUsage } from "@/hooks/useUsage";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowUpRight, TrendingUp } from "lucide-react";
import { formatPrice, getLadderStep, type PlanSku } from "@/config/pricing";

interface UsageThresholdBannerProps {
  threshold?: number; // Show banner when usage exceeds this percentage (default 80)
}

export function UsageThresholdBanner({ threshold = 80 }: UsageThresholdBannerProps) {
  const { tenant } = useAuth();
  const { planSku, hasVoice, hasSms } = useSubscription(tenant?.id || null);
  const { usage, nextUpgrade } = useUsage(tenant?.id || null, planSku);

  if (!usage) return null;

  const voiceOverThreshold = hasVoice && usage.voicePercentUsed >= threshold;
  const smsOverThreshold = hasSms && usage.smsPercentUsed >= threshold;

  if (!voiceOverThreshold && !smsOverThreshold) return null;

  const isOverLimit = usage.voicePercentUsed >= 100 || usage.smsPercentUsed >= 100;
  const totalOverage = usage.projectedVoiceOverage + usage.projectedSmsOverage;
  const currentStep = planSku ? getLadderStep(planSku) : null;
  const priceDiff = nextUpgrade && currentStep ? nextUpgrade.price - currentStep.price : 0;

  return (
    <div className={`rounded-lg border p-4 ${
      isOverLimit 
        ? "bg-destructive/10 border-destructive/50" 
        : "bg-amber-500/10 border-amber-500/50"
    }`}>
      <div className="flex flex-col sm:flex-row items-start gap-3">
        <AlertTriangle className={`h-5 w-5 mt-0.5 shrink-0 ${
          isOverLimit ? "text-destructive" : "text-amber-600"
        }`} />
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${isOverLimit ? "text-destructive" : "text-amber-700 dark:text-amber-400"}`}>
            {isOverLimit ? "Usage limit exceeded" : "Approaching usage limit"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {voiceOverThreshold && (
              <span>
                Voice: {usage.voiceMinutesUsed.toLocaleString()} / {usage.includedMinutes?.toLocaleString()} min ({usage.voicePercentUsed}%)
              </span>
            )}
            {voiceOverThreshold && smsOverThreshold && " • "}
            {smsOverThreshold && (
              <span>
                SMS: {usage.smsSegmentsUsed.toLocaleString()} / {usage.includedSmsSegments?.toLocaleString()} ({usage.smsPercentUsed}%)
              </span>
            )}
          </p>
          {totalOverage > 0 && (
            <p className="text-sm font-medium mt-1">
              Projected overage: ${totalOverage.toFixed(2)} this period
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          {nextUpgrade && (
            <Link to="/app/settings?tab=billing" className="flex-1 sm:flex-initial">
              <Button size="sm" variant={isOverLimit ? "default" : "outline"} className="w-full">
                <TrendingUp className="h-4 w-4 mr-1" />
                Upgrade
                {priceDiff > 0 && (
                  <span className="ml-1 text-xs opacity-80">
                    (+{formatPrice(priceDiff)}/mo)
                  </span>
                )}
              </Button>
            </Link>
          )}
          <Link to="/app/usage">
            <Button size="sm" variant="ghost">
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
