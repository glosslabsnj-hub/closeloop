import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Building2 } from "lucide-react";
import { AgencyOverview } from "@/components/agency/AgencyOverview";
import { AgencyTenantList } from "@/components/agency/AgencyTenantList";
import { AgencyCommissionHistory } from "@/components/agency/AgencyCommissionHistory";
import { QuickProvisionWizard } from "@/components/agency/QuickProvisionWizard";
import { useAgencyAccount, useAgencyTenants, useAgencyMetrics, useAgencyCommissions } from "@/hooks/useAgencyData";

export default function AgencyDashboardPage() {
  const { data: agency, isLoading: agencyLoading } = useAgencyAccount();
  const { data: tenants, isLoading: tenantsLoading } = useAgencyTenants(agency?.id);
  const { data: metrics, isLoading: metricsLoading } = useAgencyMetrics(agency?.id);
  const { data: commissionData, isLoading: commissionsLoading } = useAgencyCommissions(agency?.id);
  const [provisionOpen, setProvisionOpen] = useState(false);

  const commissionRate = (agency?.billing_config_json as Record<string, unknown>)?.commission_rate as number | undefined;

  if (agencyLoading) {
    return (
      <div className="container max-w-6xl py-8 px-4 sm:px-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="container max-w-6xl py-8 px-4 sm:px-6">
        <div className="text-center py-16 space-y-4">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">No Agency Account</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You don't have an agency account yet. Contact support to set up your agency partner account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Agency</p>
          <h1 className="text-2xl font-bold tracking-tight">{agency.agency_name}</h1>
        </div>
        <Button onClick={() => setProvisionOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* KPI Cards */}
      <AgencyOverview
        metrics={metrics}
        isLoading={metricsLoading}
        commissionThisMonthCents={commissionData?.thisMonthCents ?? 0}
        commissionRate={commissionRate}
      />

      {/* Commission rate info */}
      <div className="text-xs text-muted-foreground px-1">
        Your commission rate: {Math.round((commissionRate ?? 0.20) * 100)}%. Contact us to discuss changes.
      </div>

      {/* Tenants Table */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Managed Clients</h2>
        <AgencyTenantList
          tenants={tenants || []}
          metrics={metrics}
          isLoading={tenantsLoading}
        />
      </div>

      {/* Commission History */}
      <AgencyCommissionHistory
        commissions={commissionData?.commissions ?? []}
        isLoading={commissionsLoading}
      />

      {/* Quick Provision Wizard */}
      <QuickProvisionWizard
        open={provisionOpen}
        onOpenChange={setProvisionOpen}
        agencyId={agency.id}
      />
    </div>
  );
}
