/**
 * FleetPage - Team & Fleet management page
 * 
 * For service businesses: "Your Team" with technician management + job assignments
 * For dispatch businesses: "Fleet Management" with drivers + vehicles
 */

import ErrorBoundary from "@/components/ErrorBoundary";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { FleetDriversManager } from "@/components/brain/dispatch/FleetDriversManager";
import { FleetVehiclesManager } from "@/components/brain/dispatch/FleetVehiclesManager";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { Users, Wrench } from "lucide-react";
import { Navigate } from "react-router-dom";

export default function FleetPage() {
  const { isAllowed, isLoading } = useModuleRequired(["dispatch_queue", "fleet_management", "booking"]);
  const { businessMode } = useTenantConfig();

  const isServiceMode = businessMode === "service" || businessMode === "medical" || businessMode === "general";

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      </PageContainer>
    );
  }

  if (!isAllowed) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <ErrorBoundary context="loading your team">
    <PageContainer>
      <PageHeader
        icon={isServiceMode ? <Wrench className="h-5 w-5" /> : <Users className="h-5 w-5" />}
        title={isServiceMode ? "Your Team" : "Fleet Management"}
        description={
          isServiceMode
            ? "Manage your technicians and assign jobs to crew members"
            : "Manage your drivers and vehicles for dispatch operations"
        }
      />

      <div className="space-y-6">
        <FleetDriversManager />
        {!isServiceMode && <FleetVehiclesManager />}
      </div>
    </PageContainer>
    </ErrorBoundary>
  );
}
