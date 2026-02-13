import { FleetDriversManager } from "./FleetDriversManager";
import { FleetVehiclesManager } from "./FleetVehiclesManager";
import { useTenantConfig } from "@/hooks/useTenantConfig";

export function FleetManagementSection() {
  const { businessMode } = useTenantConfig();
  const isServiceMode = businessMode === "service" || businessMode === "medical" || businessMode === "general";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">
          {isServiceMode ? "Your Team" : "Your Fleet"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isServiceMode
            ? "Manage your technicians and assign jobs to crew members"
            : "Manage your crew members and vehicles for dispatch operations"}
        </p>
      </div>
      
      <FleetDriversManager />
      {!isServiceMode && <FleetVehiclesManager />}
    </div>
  );
}
