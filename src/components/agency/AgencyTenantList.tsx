import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink, Search, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { getLadderStep } from "@/config/pricing";
import { ClientOnboardingTracker } from "@/components/agency/ClientOnboardingTracker";
import type { AgencyTenant, AgencyMetrics } from "@/hooks/useAgencyData";
import type { ClientReadiness } from "@/hooks/useAgencyClientReadiness";

interface AgencyTenantListProps {
  tenants: AgencyTenant[];
  metrics: AgencyMetrics | null | undefined;
  isLoading: boolean;
  onActivateTenant?: (tenantId: string, tenantName: string) => void;
  readinessMap?: Record<string, ClientReadiness>;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  suspended: "secondary",
  archived: "outline",
};

const modeLabels: Record<string, string> = {
  service: "Service",
  dispatch: "Dispatch",
  food: "Food",
  medical: "Medical",
  general: "General",
  sales: "Sales",
};

function SubscriptionBadge({ status, currentPeriodEnd }: { status: string | null | undefined; currentPeriodEnd: string | null | undefined }) {
  if (!status) {
    return <Badge variant="outline" className="text-xs text-muted-foreground">No Plan</Badge>;
  }

  if (status === "trialing" && currentPeriodEnd) {
    const daysLeft = Math.max(0, Math.ceil((new Date(currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    return (
      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
        Trial ({daysLeft}d left)
      </Badge>
    );
  }

  if (status === "active") {
    return (
      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
        Active
      </Badge>
    );
  }

  if (status === "past_due") {
    return (
      <Badge variant="destructive" className="text-xs">
        Past Due
      </Badge>
    );
  }

  if (status === "canceled") {
    return <Badge variant="outline" className="text-xs text-muted-foreground">Canceled</Badge>;
  }

  return <Badge variant="outline" className="text-xs capitalize">{status}</Badge>;
}

export function AgencyTenantList({ tenants, metrics, isLoading, onActivateTenant, readinessMap }: AgencyTenantListProps) {
  const [search, setSearch] = useState("");

  const metricsMap = new Map(
    (metrics?.per_tenant || []).map((m) => [m.tenant_id, m])
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <div className="p-3 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No clients yet. Click "Add Client" above or use the Lead Finder below to get started.
        </p>
      </div>
    );
  }

  const filtered = search
    ? tenants.filter((t) =>
        (t.tenant_name || "").toLowerCase().includes(search.toLowerCase())
      )
    : tenants;

  return (
    <div className="space-y-3">
      {/* Search — only show when there are enough clients to warrant it */}
      {tenants.length > 5 && (
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
      )}

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Setup</TableHead>
              <TableHead className="text-right">Calls (30d)</TableHead>
              <TableHead className="text-right">Revenue (30d)</TableHead>
              <TableHead className="w-[140px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                  {search ? "No clients match your search." : "No clients found."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((tenant) => {
                const m = metricsMap.get(tenant.tenant_id);
                const planStep = tenant.plan_code ? getLadderStep(tenant.plan_code) : null;
                const needsActivation = !tenant.stripe_customer_id && (!tenant.subscription_status || tenant.subscription_status === "trialing" || tenant.subscription_status === "incomplete");

                return (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">
                      {tenant.tenant_name || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {modeLabels[tenant.business_mode || "general"] || tenant.business_mode}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[tenant.status] ?? "default"} className="text-xs capitalize">
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {planStep ? planStep.shortName : tenant.plan_code || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <SubscriptionBadge status={tenant.subscription_status} currentPeriodEnd={tenant.current_period_end} />
                    </TableCell>
                    <TableCell>
                      <ClientOnboardingTracker
                        readiness={readinessMap?.[tenant.tenant_id]}
                        tenantId={tenant.tenant_id}
                        compact
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {m?.calls_30d?.toLocaleString() ?? "-"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {m?.revenue_30d_cents != null
                        ? `$${(m.revenue_30d_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {needsActivation && onActivateTenant && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onActivateTenant(tenant.tenant_id, tenant.tenant_name || "Client")}
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            Activate
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                          <Link to={`/app/dashboard?tenant=${tenant.tenant_id}`}>
                            View
                            <ExternalLink className="h-3 w-3 ml-1.5" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
