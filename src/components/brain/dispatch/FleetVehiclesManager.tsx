import { useState } from "react";
import { useFleetVehicles, FleetVehicle } from "@/hooks/useFleetVehicles";
import { useFleetDrivers } from "@/hooks/useFleetDrivers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Truck, User, MoreVertical, Pencil, Trash2, Wrench, Loader2 } from "lucide-react";
import { VehicleEditorDialog } from "./VehicleEditorDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function FleetVehiclesManager() {
  const { vehicles, isLoading, updateVehicle, deleteVehicle } = useFleetVehicles();
  const { drivers } = useFleetDrivers();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<FleetVehicle | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<FleetVehicle | null>(null);

  const handleEdit = (vehicle: FleetVehicle) => {
    setEditingVehicle(vehicle);
    setEditorOpen(true);
  };

  const handleAdd = () => {
    setEditingVehicle(null);
    setEditorOpen(true);
  };

  const handleDeleteClick = (vehicle: FleetVehicle) => {
    setVehicleToDelete(vehicle);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (vehicleToDelete) {
      deleteVehicle.mutate(vehicleToDelete.id);
    }
    setDeleteConfirmOpen(false);
    setVehicleToDelete(null);
  };

  const handleToggleMaintenance = (vehicle: FleetVehicle) => {
    const newStatus = vehicle.status === "maintenance" ? "available" : "maintenance";
    updateVehicle.mutate({ id: vehicle.id, status: newStatus });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200">Available</Badge>;
      case "in_use":
        return <Badge variant="default" className="bg-blue-500/10 text-blue-600 border-blue-200">In Use</Badge>;
      case "maintenance":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">Maintenance</Badge>;
      case "retired":
        return <Badge variant="secondary">Retired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getVehicleDescription = (vehicle: FleetVehicle) => {
    const parts = [];
    if (vehicle.year) parts.push(vehicle.year);
    if (vehicle.make) parts.push(vehicle.make);
    if (vehicle.model) parts.push(vehicle.model);
    if (vehicle.vehicle_type) parts.push(`(${vehicle.vehicle_type})`);
    return parts.length > 0 ? parts.join(" ") : null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Fleet Vehicles
            </CardTitle>
            <CardDescription>
              Vehicles that can be dispatched to jobs
            </CardDescription>
          </div>
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No vehicles added yet</p>
              <p className="text-sm">Add your first vehicle to start managing your fleet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{vehicle.name}</span>
                        {getStatusBadge(vehicle.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        {getVehicleDescription(vehicle) && (
                          <span>{getVehicleDescription(vehicle)}</span>
                        )}
                        {vehicle.license_plate && (
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                            {vehicle.license_plate}
                          </span>
                        )}
                        {vehicle.current_driver && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {vehicle.current_driver.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(vehicle)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleMaintenance(vehicle)}>
                        <Wrench className="h-4 w-4 mr-2" />
                        {vehicle.status === "maintenance" ? "Mark Available" : "Mark Maintenance"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(vehicle)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <VehicleEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        vehicle={editingVehicle}
        drivers={drivers}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Vehicle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {vehicleToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
