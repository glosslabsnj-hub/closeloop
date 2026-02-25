import { useAgencyAccount, useAgencyTenants, useAgencyMetrics } from "@/hooks/useAgencyData";
import { AgencyTenantList } from "@/components/agency/AgencyTenantList";
import { QuickProvisionWizard } from "@/components/agency/QuickProvisionWizard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";

export default function AgencyClientsPage() {
  const { data: agency } = useAgencyAccount();
  const { data: tenants, isLoading } = useAgencyTenants(agency?.id);
  const { data: metrics } = useAgencyMetrics(agency?.id);
  const [provisionOpen, setProvisionOpen] = useState(false);

  return (
    <div className="container max-w-6xl py-8 px-4 sm:px-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">Manage your Flux Receptionist client accounts.</p>
        </div>
        <Button onClick={() => setProvisionOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Client
        </Button>
      </div>
      <AgencyTenantList tenants={tenants || []} metrics={metrics} isLoading={isLoading} />
      {agency && (
        <QuickProvisionWizard open={provisionOpen} onOpenChange={setProvisionOpen} agencyId={agency.id} />
      )}
    </div>
  );
}
