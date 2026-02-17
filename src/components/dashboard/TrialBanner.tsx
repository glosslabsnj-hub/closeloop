import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRIAL_CONFIG } from "@/config/pricing";

export function TrialBanner() {
  const { tenant, subscription } = useAuth();

  const { data: usage } = useQuery({
    queryKey: ["trial-usage", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data } = await supabase
        .from("subscription_usage")
        .select("voice_minutes_used")
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      return data;
    },
    enabled: !!tenant?.id && subscription?.status === "trialing",
    refetchInterval: 60_000, // Refresh every minute
  });

  if (subscription?.status !== "trialing") return null;

  const trialStarted = (subscription as Record<string, unknown>)?.trial_started_at
    ? new Date((subscription as Record<string, unknown>).trial_started_at as string)
    : (subscription as Record<string, unknown>)?.created_at
      ? new Date((subscription as Record<string, unknown>).created_at as string)
      : new Date();

  const trialEnd = new Date(trialStarted.getTime() + TRIAL_CONFIG.duration_days * 24 * 60 * 60 * 1000);
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

  const minutesUsed = usage?.voice_minutes_used ?? 0;
  const minutesLimit = TRIAL_CONFIG.included_minutes;
  const minutePercent = Math.min(100, Math.round((minutesUsed / minutesLimit) * 100));

  const isUrgent = daysRemaining <= 2 || minutesUsed >= minutesLimit - 5;

  return (
    <div className={cn(
      "px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-sm border-b",
      isUrgent
        ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
        : "bg-primary/5 border-primary/10"
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <Clock className={cn("h-4 w-4 shrink-0", isUrgent ? "text-amber-600" : "text-primary")} />
        <span className={cn("font-medium", isUrgent ? "text-amber-800 dark:text-amber-200" : "text-foreground")}>
          Free trial — {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
        </span>
        <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
          <Progress value={minutePercent} className="w-20 h-1.5" />
          <span className="text-xs">{minutesUsed}/{minutesLimit} min</span>
        </div>
      </div>
      <Link to="/app/go-live">
        <Button size="sm" variant={isUrgent ? "default" : "outline"} className="h-7 text-xs gap-1">
          Upgrade Now
          <ArrowRight className="h-3 w-3" />
        </Button>
      </Link>
    </div>
  );
}
