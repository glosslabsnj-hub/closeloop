import { ShoppingBag } from "lucide-react";
import { ActiveOrderBoard } from "../widgets/ActiveOrderBoard";
import { QuickActionButton } from "../widgets/QuickActionButton";
import { MetricsGrid } from "../MetricsGrid";
import { ROIPerformanceWidget } from "../ROIPerformanceWidget";
import { BusynessSliderWidget } from "../BusynessSliderWidget";

export function FoodDashboardLayout() {
  return (
    <div className="space-y-6">
      <ActiveOrderBoard />

      <div className="grid gap-6 lg:grid-cols-2">
        <BusynessSliderWidget />
        <QuickActionButton
          label="New Order"
          description="Take a new food order"
          href="/app/orders/new"
          icon={ShoppingBag}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ROIPerformanceWidget />
        <MetricsGrid />
      </div>
    </div>
  );
}
