import { FleetDriversManager } from "./FleetDriversManager";
import { FleetVehiclesManager } from "./FleetVehiclesManager";

export function FleetManagementSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Your Fleet</h2>
        <p className="text-sm text-muted-foreground">
          Manage your crew members and vehicles for dispatch operations
        </p>
      </div>
      
      <FleetDriversManager />
      <FleetVehiclesManager />
    </div>
  );
}
