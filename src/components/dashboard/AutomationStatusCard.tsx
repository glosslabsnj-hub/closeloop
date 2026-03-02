import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkflows } from "@/hooks/useWorkflows";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { getAutomationTogglesForMode } from "@/lib/createDefaultWorkflows";

export function AutomationStatusCard() {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const { terms } = useIndustryContext();
  const tenantId = tenant?.id ?? null;

  const { data: workflows, isLoading } = useWorkflows(tenantId);

  const stats = useMemo(() => {
    if (!workflows) return { active: 0, total: 0, hasCriticalOff: false };

    const activeCount = workflows.filter(w => w.status === "active").length;
    const toggles = getAutomationTogglesForMode(businessMode);
    
    // Check if any critical notifications are off
    const criticalTriggers = ["booking.confirmed", "order.confirmed", "dispatch.created", "missed_call"];
    const activeTriggers = new Set(
      workflows.filter(w => w.status === "active").map(w => w.trigger)
    );
    
    const hasCriticalOff = toggles.some(
      t => criticalTriggers.includes(t.trigger) && !activeTriggers.has(t.trigger)
    );

    return {
      active: activeCount,
      total: toggles.length,
      hasCriticalOff,
    };
  }, [workflows, businessMode]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Link to="/app/automations">
      <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Automations</CardTitle>
          <div className="flex items-center gap-2">
            {stats.hasCriticalOff ? (
              <AlertCircle className="h-4 w-4 text-accent-foreground" />
            ) : stats.active > 0 ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <Zap className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{stats.active}</span>
            <span className="text-sm text-muted-foreground">active</span>
          </div>
          
          {stats.hasCriticalOff ? (
            <div className="flex items-center gap-1 text-xs text-accent-foreground">
              <AlertCircle className="h-3 w-3" />
              {terms.customer.charAt(0).toUpperCase() + terms.customer.slice(1)} notifications may be off
            </div>
          ) : stats.active === 0 ? (
            <p className="text-xs text-muted-foreground">
              Enable auto-texts and notifications
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Auto-sending confirmations & alerts
            </p>
          )}

          <div className="flex items-center text-xs text-primary pt-1">
            Configure
            <ArrowRight className="h-3 w-3 ml-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
