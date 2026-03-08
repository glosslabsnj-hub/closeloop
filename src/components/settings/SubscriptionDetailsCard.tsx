import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, FileText, Calendar, ExternalLink } from "lucide-react";

export function SubscriptionDetailsCard() {
  const { tenant, effectiveTenant, isSuperAdmin } = useAuth();
  const displayTenant = isSuperAdmin ? (effectiveTenant ?? tenant) : tenant;
  const { subscription, loading } = useSubscription(displayTenant?.id || null);

  if (loading) return null;

  const status = subscription?.status || "none";
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : null;
  const stripeCustomerId = (subscription as any)?.stripe_customer_id;
  const isTrial = status === "trialing";
  const isActive = status === "active";

  const statusLabel: Record<string, string> = {
    active: "Active",
    trialing: "Trial",
    past_due: "Past Due",
    canceled: "Canceled",
    none: "No Subscription",
  };

  const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    active: "default",
    trialing: "secondary",
    past_due: "destructive",
    canceled: "outline",
    none: "outline",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Billing Details</CardTitle>
        <CardDescription>Subscription and payment information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subscription Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Status</span>
          </div>
          <Badge variant={statusVariant[status] || "outline"}>
            {statusLabel[status] || status}
          </Badge>
        </div>

        {/* Renewal / Trial End */}
        {periodEnd && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{isTrial ? "Trial ends" : "Renews on"}</span>
            </div>
            <span className="text-sm font-medium">
              {periodEnd.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        )}

        {/* Payment Method */}
        <div className="p-3 rounded-lg border border-dashed border-muted-foreground/20">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Payment Method</span>
          </div>
          {stripeCustomerId ? (
            <p className="text-sm text-muted-foreground">
              Payment method on file. Manage via Stripe portal.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isTrial
                ? "No payment method required during trial. Add one before your trial ends to continue service."
                : "No payment method on file."}
            </p>
          )}
          {(isActive || isTrial) && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-2"
              onClick={() =>
                window.open("/pricing", "_blank")
              }
            >
              <CreditCard className="h-3.5 w-3.5" />
              {stripeCustomerId ? "Update Payment Method" : "Add Payment Method"}
            </Button>
          )}
        </div>

        {/* Invoices */}
        <div className="p-3 rounded-lg border border-dashed border-muted-foreground/20">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Invoices</span>
          </div>
          {isTrial ? (
            <p className="text-sm text-muted-foreground">
              No invoices yet. Your first invoice will be generated when your trial ends.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Invoice history will appear here after your first billing cycle.
            </p>
          )}
        </div>

        {/* Need Help */}
        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-2 text-muted-foreground"
            onClick={() =>
              window.open("mailto:support@getfluxdata.com?subject=Billing Question", "_blank")
            }
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Contact support for billing questions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
