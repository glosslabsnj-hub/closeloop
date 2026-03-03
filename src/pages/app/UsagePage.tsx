import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useUsage } from "@/hooks/useUsage";
import { useBillingPortal } from "@/hooks/useBillingPortal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone, MessageSquare, TrendingUp, AlertTriangle,
  ArrowUpRight, Calendar, DollarSign, ExternalLink, Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  getLadderStep,
  getTierInfo,
  formatPrice,
  type PlanSku,
} from "@/config/pricing";

export default function UsagePage() {
  const { tenant } = useAuth();
  const { subscription, planSku, hasVoice, hasSms, loading: subLoading, error: subError, refetch: refetchSub } = useSubscription(tenant?.id || null);
  const { usage, loading: usageLoading, nextUpgrade } = useUsage(tenant?.id || null, planSku);
  const { openPortal, loading: portalLoading } = useBillingPortal(tenant?.id || null);

  const step = planSku ? getLadderStep(planSku) : null;
  const tierInfo = step ? getTierInfo(step.tier) : null;

  const isLoading = subLoading || usageLoading;

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Usage</h1>
          <p className="text-muted-foreground">Track your voice minutes</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (subError) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Usage</h1>
          <p className="text-muted-foreground">Track your voice minutes</p>
        </div>
        <div className="mx-auto max-w-lg py-8">
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold">Couldn't load your usage data</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                This is usually a temporary connection issue. Try again, or come back in a minute.
              </p>
              <Button variant="outline" onClick={() => refetchSub()}>
                Try again
              </Button>
              <div className="flex items-center justify-center gap-3 text-sm">
                <Link to="/app" className="text-primary hover:underline">Back to Dashboard</Link>
                <span className="text-border">·</span>
                <a href="mailto:support@getfluxdata.com" className="text-muted-foreground hover:underline">Contact Support</a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!subscription || !step) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Usage</h1>
          <p className="text-muted-foreground">Track your voice minutes</p>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">No active subscription found.</p>
            <Link to="/app/go-live">
              <Button>Choose a Plan</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const totalOverage = (usage?.projectedVoiceOverage || 0) + (usage?.projectedSmsOverage || 0);

  return (
    <ErrorBoundary context="loading your usage data">
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usage</h1>
        <p className="text-muted-foreground">Track your voice minutes</p>
      </div>

      {/* Current Plan Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{tierInfo?.displayName}</CardTitle>
              <CardDescription>{step.name}</CardDescription>
            </div>
            <Badge variant={subscription.status === "trialing" ? "secondary" : "default"}>
              {subscription.status === "trialing" ? "Trial" : "Active"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Billing period: {formatDate(usage?.billingPeriodStart)} – {formatDate(usage?.billingPeriodEnd)}
            </div>
            <div className="font-medium">{formatPrice(step.price)}/mo</div>
          </div>
          {subscription.stripe_customer_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={openPortal}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Manage Billing
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Usage Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Voice Usage */}
        {hasVoice && usage?.includedMinutes !== null && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Voice Minutes</CardTitle>
                  <CardDescription>Inbound call duration</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>{usage.voiceMinutesUsed.toLocaleString()} used</span>
                  <span>{usage.includedMinutes?.toLocaleString()} included</span>
                </div>
                <Progress 
                  value={usage.voicePercentUsed} 
                  className={usage.voicePercentUsed >= 90 ? "bg-destructive/20" : ""}
                />
              </div>

              {usage.voicePercentUsed >= 80 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    {usage.voicePercentUsed >= 100 
                      ? "You've exceeded your included minutes. Overage charges apply."
                      : "Approaching your included minutes limit."}
                  </div>
                </div>
              )}

              {usage.projectedVoiceOverage > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div className="text-sm">
                    <div className="font-medium">Projected overage</div>
                    <div className="text-muted-foreground">
                      {Math.max(0, usage.voiceMinutesUsed - (usage.includedMinutes || 0))} min @ ${usage.overageMinuteRate}/min
                    </div>
                  </div>
                  <div className="font-bold text-lg">${usage.projectedVoiceOverage.toFixed(2)}</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* SMS Usage */}
        {hasSms && usage?.includedSmsSegments !== null && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">SMS Segments</CardTitle>
                  <CardDescription>Text messages sent</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>{usage.smsSegmentsUsed.toLocaleString()} used</span>
                  <span>{usage.includedSmsSegments?.toLocaleString()} included</span>
                </div>
                <Progress 
                  value={usage.smsPercentUsed} 
                  className={usage.smsPercentUsed >= 90 ? "bg-destructive/20" : ""}
                />
              </div>

              {usage.smsPercentUsed >= 80 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    {usage.smsPercentUsed >= 100 
                      ? "You've exceeded your included SMS segments. Overage charges apply."
                      : "Approaching your included SMS limit."}
                  </div>
                </div>
              )}

              {usage.projectedSmsOverage > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div className="text-sm">
                    <div className="font-medium">Projected overage</div>
                    <div className="text-muted-foreground">
                      {Math.max(0, usage.smsSegmentsUsed - (usage.includedSmsSegments || 0))} SMS @ ${usage.overageSmsRate}/SMS
                    </div>
                  </div>
                  <div className="font-bold text-lg">${usage.projectedSmsOverage.toFixed(2)}</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Total Projected Overage */}
      {totalOverage > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-amber-600" />
                <div>
                  <div className="font-medium">Total Projected Overage This Period</div>
                  <div className="text-sm text-muted-foreground">
                    Will be added to your next invoice
                  </div>
                </div>
              </div>
              <div className="text-2xl font-bold">${totalOverage.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Suggestion */}
      {nextUpgrade && (usage?.voicePercentUsed || 0) >= 70 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Save Money by Upgrading</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <div className="font-medium">{nextUpgrade.name}</div>
                <div className="text-sm text-muted-foreground">
                  {nextUpgrade.includedMinutes && `${nextUpgrade.includedMinutes.toLocaleString()} minutes`}
                  {nextUpgrade.includedMinutes && nextUpgrade.includedSmsSegments && " + "}
                  {nextUpgrade.includedSmsSegments && `${nextUpgrade.includedSmsSegments.toLocaleString()} SMS`}
                  {" included"}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">{formatPrice(nextUpgrade.price)}/mo</div>
                {totalOverage > (nextUpgrade.price - step.price) && (
                  <div className="text-sm text-primary">
                    Saves ${(totalOverage - (nextUpgrade.price - step.price)).toFixed(2)}/mo
                  </div>
                )}
              </div>
            </div>
            <Link to="/app/settings?tab=billing">
              <Button className="w-full mt-4">
                Upgrade Plan
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
    </ErrorBoundary>
  );
}
