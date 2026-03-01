import { ShoppingBag } from "lucide-react";
import { ActiveOrderBoard } from "../widgets/ActiveOrderBoard";
import { QuickActionButton } from "../widgets/QuickActionButton";
import { ROIPerformanceWidget } from "../ROIPerformanceWidget";

export function FoodDashboardLayout() {
  return (
    <div className="space-y-6">
      <ActiveOrderBoard />

      <QuickActionButton
        label="New Order"
        description="Take a new food order"
        href="/app/orders"
        icon={ShoppingBag}
      />

      <ROIPerformanceWidget />
    </div>
  );
}
