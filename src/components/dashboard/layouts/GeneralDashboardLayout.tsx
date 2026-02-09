import { Users } from "lucide-react";
import { LeadFunnelSummary } from "../widgets/LeadFunnelSummary";
import { QuickActionButton } from "../widgets/QuickActionButton";
import { MetricsGrid } from "../MetricsGrid";
import { ROIPerformanceWidget } from "../ROIPerformanceWidget";
import { LeadRecoveryWidget } from "../LeadRecoveryWidget";

export function GeneralDashboardLayout() {
  return (
    <div className="space-y-6">
      <LeadFunnelSummary />

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <QuickActionButton
            label="View Leads"
            description="See your lead pipeline"
            href="/app/leads"
            icon={Users}
          />
        </div>
        <div className="lg:col-span-3">
          <MetricsGrid />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ROIPerformanceWidget />
        <LeadRecoveryWidget />
      </div>
    </div>
  );
}
