import { useAgencyAccount, useAgencyMetrics } from "@/hooks/useAgencyData";
import { AgencyOverview } from "@/components/agency/AgencyOverview";
import { useAgencyCommissions } from "@/hooks/useAgencyData";

export default function AgencyReportsPage() {
  const { data: agency } = useAgencyAccount();
  const { data: metrics, isLoading: metricsLoading } = useAgencyMetrics(agency?.id);
  const { data: commissionData } = useAgencyCommissions(agency?.id);
  const commissionRate = (agency?.billing_config_json as Record<string, unknown>)?.commission_rate as number | undefined;

  return (
    <div className="container max-w-6xl py-8 px-4 sm:px-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Performance overview across your managed clients.</p>
      </div>
      <AgencyOverview
        metrics={metrics}
        isLoading={metricsLoading}
        commissionThisMonthCents={commissionData?.thisMonthCents ?? 0}
        commissionRate={commissionRate}
      />
    </div>
  );
}
