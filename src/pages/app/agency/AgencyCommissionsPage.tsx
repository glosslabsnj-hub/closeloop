import { useAgencyAccount, useAgencyCommissions } from "@/hooks/useAgencyData";
import { AgencyCommissionHistory } from "@/components/agency/AgencyCommissionHistory";

export default function AgencyCommissionsPage() {
  const { data: agency } = useAgencyAccount();
  const { data: commissionData, isLoading } = useAgencyCommissions(agency?.id);

  return (
    <div className="container max-w-6xl py-8 px-4 sm:px-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Commissions</h1>
        <p className="text-sm text-muted-foreground">Track your earnings from managed client accounts.</p>
      </div>
      <AgencyCommissionHistory commissions={commissionData?.commissions ?? []} isLoading={isLoading} />
    </div>
  );
}
