/**
 * FleetPage - Standalone fleet management page
 * 
 * Displays drivers and vehicles for dispatch businesses.
 * This is the same content as Business Brain > Fleet section,
 * but accessible directly from the sidebar for quick access.
 */

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { FleetDriversManager } from "@/components/brain/dispatch/FleetDriversManager";
import { FleetVehiclesManager } from "@/components/brain/dispatch/FleetVehiclesManager";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { Users } from "lucide-react";
import { Navigate } from "react-router-dom";

export default function FleetPage() {
  const { isAllowed, isLoading } = useModuleRequired(["dispatch_queue"]);

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
    <PageContainer>
      <PageHeader
        icon={<Users className="h-5 w-5" />}
        title="Fleet Management"
        description="Manage your drivers and vehicles for dispatch operations"
      />

      <div className="space-y-6">
        <FleetDriversManager />
        <FleetVehiclesManager />
      </div>
    </PageContainer>
  );
}
