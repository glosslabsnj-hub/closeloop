import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard, XCircle } from "lucide-react";

/**
 * Shows a prominent banner when the subscription is in a bad state:
 * - past_due: payment failed, AI is offline
 * - canceled: subscription was canceled
 * - No subscription at all after trial would have expired
 *
 * The TrialBanner handles the "trialing" state.
 * This component handles everything AFTER the trial.
 */
export function SubscriptionStatusBanner() {
  const { subscription, tenant } = useAuth();

  if (!tenant) return null;

  const status = subscription?.status;

  // Only show for bad states
  if (!status || status === "active" || status === "trialing" || status === "incomplete") {
    return null;
  }

  if (status === "past_due") {
    return (
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm border-b bg-destructive/10 border-destructive/20">
        <div className="flex items-center gap-3 min-w-0">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          <div>
            <span className="font-semibold text-destructive">Payment failed.</span>
            <span className="text-muted-foreground ml-1.5">Your AI receptionist is offline. Update your payment method to restore service.</span>
          </div>
        </div>
        <Link to="/app/go-live">
          <Button size="sm" variant="destructive" className="h-8 text-xs gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Update Payment
          </Button>
        </Link>
      </div>
    );
  }

  if (status === "canceled") {
    return (
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm border-b bg-muted/50 border-border">
        <div className="flex items-center gap-3 min-w-0">
          <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <span className="font-semibold text-foreground">Subscription canceled.</span>
            <span className="text-muted-foreground ml-1.5">Your AI receptionist is offline. Reactivate to start answering calls again.</span>
          </div>
        </div>
        <Link to="/app/go-live">
          <Button size="sm" className="h-8 text-xs gap-1.5">
            Reactivate
          </Button>
        </Link>
      </div>
    );
  }

  // Catch-all for any other non-active status
  return (
    <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm border-b bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
      <div className="flex items-center gap-3 min-w-0">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        <span className="font-medium text-amber-800 dark:text-amber-200">
          Your subscription needs attention. Your AI receptionist may not be active.
        </span>
      </div>
      <Link to="/app/go-live">
        <Button size="sm" variant="outline" className="h-8 text-xs">
          Fix Now
        </Button>
      </Link>
    </div>
  );
}
