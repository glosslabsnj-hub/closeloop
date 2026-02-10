import { Users } from "lucide-react";
import { LeadFunnelSummary } from "../widgets/LeadFunnelSummary";
import { QuickActionButton } from "../widgets/QuickActionButton";
import { ROIPerformanceWidget } from "../ROIPerformanceWidget";
import { LeadRecoveryWidget } from "../LeadRecoveryWidget";

export function GeneralDashboardLayout() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <LeadFunnelSummary />
        <QuickActionButton
          label="View Leads"
          description="See your lead pipeline"
          href="/app/leads"
          icon={Users}
        />
      </div>

      <ROIPerformanceWidget />
      <LeadRecoveryWidget />
    </div>
  );
}
