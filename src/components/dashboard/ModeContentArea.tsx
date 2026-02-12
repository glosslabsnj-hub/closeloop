import { useCapabilities } from "@/hooks/useCapabilities";
import { useServices } from "@/hooks/useServices";
import { ServiceDashboardLayout } from "./layouts/ServiceDashboardLayout";
import { DispatchDashboardLayout } from "./layouts/DispatchDashboardLayout";
import { FoodDashboardLayout } from "./layouts/FoodDashboardLayout";
import { MedicalDashboardLayout } from "./layouts/MedicalDashboardLayout";
import { GeneralDashboardLayout } from "./layouts/GeneralDashboardLayout";

export function ModeContentArea() {
  const caps = useCapabilities();
  const { services } = useServices();

  // Find most popular service name for quick action label
  const topServiceName = (services || []).find((s) => s.is_active !== false)?.name;
  const quickBookLabel = topServiceName ? `Book ${topServiceName}` : undefined;

  switch (caps.derivedPrimaryMode) {
    case "service":
    case "sales":
      return <ServiceDashboardLayout quickBookLabel={quickBookLabel} />;
    case "dispatch":
      return <DispatchDashboardLayout />;
    case "food":
      return <FoodDashboardLayout />;
    case "medical":
      return <MedicalDashboardLayout />;
    case "general":
    default:
      return <GeneralDashboardLayout />;
  }
}
