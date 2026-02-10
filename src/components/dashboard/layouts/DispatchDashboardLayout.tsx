import { Truck } from "lucide-react";
import { ActiveJobQueue } from "../widgets/ActiveJobQueue";
import { QuickActionButton } from "../widgets/QuickActionButton";
import { FleetStatusCard } from "../widgets/FleetStatusCard";
import { ImpoundCountCard } from "../widgets/ImpoundCountCard";
import { MetricsGrid } from "../MetricsGrid";
import { ROIPerformanceWidget } from "../ROIPerformanceWidget";
import { BusynessSliderWidget } from "../BusynessSliderWidget";
import { useCapabilities } from "@/hooks/useCapabilities";

export function DispatchDashboardLayout() {
  const caps = useCapabilities();

  return (
    <div className="space-y-6">
      <MetricsGrid />

      <ActiveJobQueue />

      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <BusynessSliderWidget />
        <QuickActionButton
          label="Quick Dispatch"
          description="Create a new dispatch job"
          href="/app/dispatch/new"
          icon={Truck}
        />
      </div>

      {(caps.hasFleetManagement || caps.hasImpoundLot) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {caps.hasFleetManagement && <FleetStatusCard />}
          {caps.hasImpoundLot && <ImpoundCountCard />}
        </div>
      )}

      <ROIPerformanceWidget />
    </div>
  );
}
