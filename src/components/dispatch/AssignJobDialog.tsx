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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, User, MapPin, ChevronRight } from "lucide-react";

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
  const [crew, setCrew] = useState("");
  const [vehicle, setVehicle] = useState("");

  // Reset form when job changes
  useEffect(() => {
    if (job && open) {
      setCrew(job.assigned_crew || "");
      setVehicle(job.assigned_vehicle || "");
    }
  }, [job, open]);

  const handleAssign = () => {
    if (job && (crew || vehicle)) {
      onAssign(job.id, crew, vehicle);
    }
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Assign Job</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Assign crew and vehicle to dispatch this job
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Job Summary */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Job #{job.job_number || job.id.slice(0, 8)}
              </span>
            </div>
            <p className="font-medium text-foreground">{job.customer_name || "Unknown Customer"}</p>
            {job.pickup_address && (
              <div className="flex items-start gap-2 mt-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="line-clamp-2">{job.pickup_address}</p>
              </div>
            )}
          </div>

          {/* Crew Assignment */}
          <div className="space-y-2">
            <Label htmlFor="crew" className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-muted-foreground" />
              Crew / Driver
            </Label>
            <Input
              id="crew"
              placeholder="e.g., John D. or Crew Alpha"
              value={crew}
              onChange={(e) => setCrew(e.target.value)}
              className="h-11 bg-muted/30 border-border/50 focus:bg-background transition-colors"
            />
          </div>

          {/* Vehicle Assignment */}
          <div className="space-y-2">
            <Label htmlFor="vehicle" className="flex items-center gap-2 text-sm font-medium">
              <Truck className="h-4 w-4 text-muted-foreground" />
              Vehicle
            </Label>
            <Input
              id="vehicle"
              placeholder="e.g., Truck #3 or Flatbed-01"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              className="h-11 bg-muted/30 border-border/50 focus:bg-background transition-colors"
            />
          </div>
        </div>

        <DialogFooter className="gap-3 sm:gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-border/50"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={isLoading || (!crew && !vehicle)}
            className="min-w-[140px]"
          >
            {isLoading ? (
              "Dispatching..."
            ) : (
              <>
                <ChevronRight className="h-4 w-4 mr-1" />
                Assign & Dispatch
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
