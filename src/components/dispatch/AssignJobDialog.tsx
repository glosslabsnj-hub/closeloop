import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, User } from "lucide-react";

interface DispatchJob {
  id: string;
  job_number?: string;
  customer_name: string | null;
  pickup_address: string | null;
  assigned_crew: string | null;
  assigned_vehicle: string | null;
}

interface AssignJobDialogProps {
  job: DispatchJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (jobId: string, crew: string, vehicle: string) => void;
  isLoading?: boolean;
}

export function AssignJobDialog({
  job,
  open,
  onOpenChange,
  onAssign,
  isLoading,
}: AssignJobDialogProps) {
  const [crew, setCrew] = useState(job?.assigned_crew || "");
  const [vehicle, setVehicle] = useState(job?.assigned_vehicle || "");

  const handleAssign = () => {
    if (job && (crew || vehicle)) {
      onAssign(job.id, crew, vehicle);
    }
  };

  // Reset form when job changes
  useState(() => {
    if (job) {
      setCrew(job.assigned_crew || "");
      setVehicle(job.assigned_vehicle || "");
    }
  });

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

          {/* Crew Assignment */}
          <div className="space-y-2">
            <Label htmlFor="crew" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Crew / Driver
            </Label>
            <Input
              id="crew"
              placeholder="e.g., John D. or Crew Alpha"
              value={crew}
              onChange={(e) => setCrew(e.target.value)}
            />
          </div>

          {/* Vehicle Assignment */}
          <div className="space-y-2">
            <Label htmlFor="vehicle" className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              Vehicle
            </Label>
            <Input
              id="vehicle"
              placeholder="e.g., Truck #3 or Flatbed-01"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={isLoading || (!crew && !vehicle)}>
            {isLoading ? "Assigning..." : "Assign & Dispatch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
