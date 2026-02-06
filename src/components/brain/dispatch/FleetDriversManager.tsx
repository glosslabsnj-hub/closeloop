import { useState } from "react";
import { useFleetDrivers, FleetDriver } from "@/hooks/useFleetDrivers";
import { useFleetVehicles } from "@/hooks/useFleetVehicles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, User, Phone, Mail, Truck, MoreVertical, Pencil, Trash2, Loader2 } from "lucide-react";
import { DriverEditorDialog } from "./DriverEditorDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

export function FleetDriversManager() {
  const { drivers, isLoading, deleteDriver } = useFleetDrivers();
  const { vehicles } = useFleetVehicles();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<FleetDriver | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<FleetDriver | null>(null);

  const handleEdit = (driver: FleetDriver) => {
    setEditingDriver(driver);
    setEditorOpen(true);
  };

  const handleAdd = () => {
    setEditingDriver(null);
    setEditorOpen(true);
  };

  const handleDeleteClick = (driver: FleetDriver) => {
    setDriverToDelete(driver);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (driverToDelete) {
      deleteDriver.mutate(driverToDelete.id);
    }
    setDeleteConfirmOpen(false);
    setDriverToDelete(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "on_break":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">On Break</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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
              <User className="h-5 w-5" />
              Crew & Drivers
            </CardTitle>
            <CardDescription>
              Add the people who can be assigned to dispatch jobs
            </CardDescription>
          </div>
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Driver
          </Button>
        </CardHeader>
        <CardContent>
          {drivers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No drivers added yet</p>
              <p className="text-sm">Add your first crew member to start assigning jobs</p>
            </div>
          ) : (
            <div className="space-y-3">
              {drivers.map((driver) => (
                <div
                  key={driver.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{driver.full_name}</span>
                        {getStatusBadge(driver.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        {driver.phone_e164 && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {driver.phone_e164}
                          </span>
                        )}
                        {driver.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {driver.email}
                          </span>
                        )}
                        {driver.default_vehicle && (
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {driver.default_vehicle.name}
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
                      <DropdownMenuItem onClick={() => handleEdit(driver)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(driver)}
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

      <DriverEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        driver={editingDriver}
        vehicles={vehicles}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Driver</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {driverToDelete?.full_name}? This action cannot be undone.
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
