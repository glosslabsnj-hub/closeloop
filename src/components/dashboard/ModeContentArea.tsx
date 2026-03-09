import { useCapabilities } from "@/hooks/useCapabilities";
import { useServices } from "@/hooks/useServices";
import { useAuth } from "@/contexts/AuthContext";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { ServiceDashboardLayout } from "./layouts/ServiceDashboardLayout";
import { DispatchDashboardLayout } from "./layouts/DispatchDashboardLayout";
import { FoodDashboardLayout } from "./layouts/FoodDashboardLayout";
import { MedicalDashboardLayout } from "./layouts/MedicalDashboardLayout";
import { GeneralDashboardLayout } from "./layouts/GeneralDashboardLayout";
import { CallbackDashboardLayout } from "./layouts/CallbackDashboardLayout";
import { SalesDashboardLayout } from "./layouts/SalesDashboardLayout";

export function ModeContentArea() {
  const caps = useCapabilities();
  const { services } = useServices();
  const { assistantSettings } = useAuth();
  const { terms } = useIndustryContext();

  // Detect callback-only mode
  const isCallbackOnly =
    (assistantSettings as Record<string, unknown> | null)?.ai_behavior_mode === "callback_only";

  // Find most popular service name for quick action label.
  // Use "Schedule" for estimate-based businesses (GC), "Book" as default.
  const topServiceName = (services || []).find((s) => s.is_active !== false)?.name;
  const bookVerb = terms.booking === "estimate" ? "Schedule" : "Book";
  const quickBookLabel = topServiceName ? `${bookVerb} ${topServiceName}` : undefined;
  const quickBookDescription = terms.booking === "estimate"
    ? "Schedule a new estimate"
    : terms.booking === "service visit"
    ? "Schedule a new service visit"
    : "Create a new booking";

  // Callback-only tenants get their own layout regardless of mode
  if (isCallbackOnly) {
    return <CallbackDashboardLayout />;
  }

  switch (caps.derivedPrimaryMode) {
    case "service":
      return <ServiceDashboardLayout quickBookLabel={quickBookLabel} quickBookDescription={quickBookDescription} />;
    case "sales":
      return <SalesDashboardLayout />;
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
