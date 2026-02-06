import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Truck, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFleetDrivers } from "@/hooks/useFleetDrivers";
import { useFleetVehicles } from "@/hooks/useFleetVehicles";

interface DispatchJob {
  id: string;
  job_number?: string;
  customer_name: string | null;
  pickup_address: string | null;
  assigned_crew: string | null;
  assigned_vehicle: string | null;
  driver_id?: string | null;
  vehicle_id?: string | null;
}

interface AssignJobDialogProps {
  job: DispatchJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (jobId: string, crew: string, vehicle: string, driverId?: string, vehicleId?: string) => void;
  isLoading?: boolean;
}

export function AssignJobDialog({
  job,
  open,
  onOpenChange,
  onAssign,
  isLoading,
}: AssignJobDialogProps) {
  const { activeDrivers, isLoading: driversLoading } = useFleetDrivers();
  const { availableVehicles, isLoading: vehiclesLoading } = useFleetVehicles();
  
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");

  // Reset form when dialog opens with job
  useEffect(() => {
    if (open && job) {
      setSelectedDriverId(job.driver_id || "");
      setSelectedVehicleId(job.vehicle_id || "");
    } else if (!open) {
      setSelectedDriverId("");
      setSelectedVehicleId("");
    }
  }, [open, job]);

  // Auto-fill vehicle when driver is selected
  useEffect(() => {
    if (selectedDriverId) {
      const driver = activeDrivers.find(d => d.id === selectedDriverId);
      if (driver?.default_vehicle_id && !selectedVehicleId) {
        setSelectedVehicleId(driver.default_vehicle_id);
      }
    }
  }, [selectedDriverId, activeDrivers, selectedVehicleId]);

  const handleAssign = () => {
    if (!job) return;
    
    const selectedDriver = activeDrivers.find(d => d.id === selectedDriverId);
    const selectedVehicle = availableVehicles.find(v => v.id === selectedVehicleId);
    
    const crewName = selectedDriver?.full_name || "";
    const vehicleName = selectedVehicle?.name || "";
    
    onAssign(job.id, crewName, vehicleName, selectedDriverId || undefined, selectedVehicleId || undefined);
  };

  const hasFleetData = activeDrivers.length > 0 || availableVehicles.length > 0;

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Job</DialogTitle>
          <DialogDescription>
            Assign crew and vehicle to Job #{job.job_number || job.id.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Job Summary */}
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p className="font-medium">{job.customer_name || "Unknown Customer"}</p>
            {job.pickup_address && (
              <p className="text-muted-foreground mt-1 truncate">{job.pickup_address}</p>
            )}
          </div>

          {/* Driver Selection */}
          <div className="space-y-2">
            <Label htmlFor="driver" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Driver / Crew Member
            </Label>
            {driversLoading ? (
              <div className="h-10 bg-muted animate-pulse rounded-md" />
            ) : activeDrivers.length > 0 ? (
              <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                <SelectTrigger id="driver">
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {activeDrivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      <span className="flex items-center gap-2">
                        {driver.full_name}
                        {driver.default_vehicle && (
                          <span className="text-muted-foreground text-xs">
                            ({driver.default_vehicle.name})
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                No drivers added yet. Add drivers in Business Brain → Fleet.
              </p>
            )}
          </div>

          {/* Vehicle Selection */}
          <div className="space-y-2">
            <Label htmlFor="vehicle" className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              Vehicle
            </Label>
            {vehiclesLoading ? (
              <div className="h-10 bg-muted animate-pulse rounded-md" />
            ) : availableVehicles.length > 0 ? (
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger id="vehicle">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {availableVehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      <span className="flex items-center gap-2">
                        {vehicle.name}
                        {vehicle.make && vehicle.model && (
                          <span className="text-muted-foreground text-xs">
                            ({vehicle.year} {vehicle.make} {vehicle.model})
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                No vehicles added yet. Add vehicles in Business Brain → Fleet.
              </p>
            )}
          </div>

          {!hasFleetData && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-200 text-sm">
              <p className="font-medium text-amber-700">Set up your fleet first</p>
              <p className="text-amber-600 mt-1">
                Go to Business Brain → Fleet to add your drivers and vehicles before assigning jobs.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={isLoading || (!selectedDriverId && !selectedVehicleId)}
          >
            {isLoading ? "Assigning..." : "Assign & Dispatch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
