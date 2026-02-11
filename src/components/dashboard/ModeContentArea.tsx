import { useCapabilities } from "@/hooks/useCapabilities";
import { ServiceDashboardLayout } from "./layouts/ServiceDashboardLayout";
import { DispatchDashboardLayout } from "./layouts/DispatchDashboardLayout";
import { FoodDashboardLayout } from "./layouts/FoodDashboardLayout";
import { MedicalDashboardLayout } from "./layouts/MedicalDashboardLayout";
import { GeneralDashboardLayout } from "./layouts/GeneralDashboardLayout";

export function ModeContentArea() {
  const caps = useCapabilities();

  switch (caps.derivedPrimaryMode) {
    case "service":
    case "sales":
      return <ServiceDashboardLayout />;
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
