import { MapPin, ArrowRight, Phone, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const priorityColors: Record<string, string> = {
  urgent: "bg-destructive text-destructive-foreground",
  high: "bg-warning/10 text-warning border-warning/30",
  normal: "bg-muted text-muted-foreground border-border",
  low: "bg-muted/50 text-muted-foreground border-border",
};

export const statusColors: Record<string, string> = {
  pending: "border-warning text-warning",
  assigned: "border-info text-info",
  en_route: "border-primary text-primary",
  on_site: "border-success text-success",
  completed: "text-muted-foreground border-border",
  cancelled: "text-destructive border-destructive/30",
};

export const statusLabels: Record<string, string> = {
  pending: "Pending",
  assigned: "Assigned",
  en_route: "En Route",
  on_site: "On Site",
  completed: "Completed",
  cancelled: "Cancelled",
};

interface DispatchJobCardProps<T> {
  job: T & {
    id: string;
    job_number?: string;
    status: string;
    priority: string;
    customer_name: string | null;
    customer_phone: string | null;
    pickup_address: string | null;
    dropoff_address?: string | null;
    job_type?: string | null;
    notes?: string | null;
    price_cents?: number | null;
    total_distance_miles?: number | null;
    assigned_crew: string | null;
    assigned_vehicle: string | null;
    created_at: string;
  };
  onAssign?: (job: T) => void;
  onUpdateStatus?: (job: T, newStatus: string) => void;
  onCall?: (job: T) => void;
}

export function DispatchJobCard<T>({ job, onAssign, onUpdateStatus, onCall }: DispatchJobCardProps<T>) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors hover:border-border/60",
        job.priority === "urgent" && "border-destructive/40"
      )}
    >
      {/* Top: priority + job ID */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {job.priority === "urgent" ? (
            <Badge className="bg-destructive text-destructive-foreground text-[11px] h-5 gap-1">
              <AlertTriangle className="h-3 w-3" />
              URGENT
            </Badge>
          ) : job.priority === "high" ? (
            <span className="h-2 w-2 rounded-full bg-warning shrink-0" />
          ) : null}
        </div>
        {job.job_number && (
          <span className="text-xs text-muted-foreground font-mono">#{job.job_number}</span>
        )}
      </div>

      {/* Service type */}
      {job.job_type && (
        <p className={cn("text-sm font-medium mb-2", job.priority === "low" && "text-muted-foreground")}>
          {job.job_type}
        </p>
      )}

      {/* Pickup / Dropoff */}
      <div className="space-y-1.5 mb-3 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
          <span className="line-clamp-1">{job.pickup_address || "No pickup address"}</span>
        </div>
        {job.dropoff_address && (
          <div className="flex items-start gap-2">
            <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            <span className="line-clamp-1">{job.dropoff_address}</span>
          </div>
        )}
      </div>

      <div className="border-t border-border/30 pt-3 space-y-2">
        {/* Customer + phone */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{job.customer_name || "Unknown"}</span>
          {job.customer_phone && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{job.customer_phone}</span>
            </>
          )}
        </div>

        {/* Distance + price */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {job.total_distance_miles != null && (
            <span>{job.total_distance_miles.toFixed(1)} mi</span>
          )}
          {job.total_distance_miles != null && job.price_cents != null && <span>·</span>}
          {job.price_cents != null && (
            <span>${(job.price_cents / 100).toFixed(0)}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 mt-3 border-t border-border/30">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onCall?.(job)}>
          <Phone className="h-3.5 w-3.5" />
          Call
        </Button>
        {job.status === "pending" && (
          <Button size="sm" className="flex-1" onClick={() => onAssign?.(job)}>
            Assign Driver
          </Button>
        )}
        {job.status === "assigned" && (
          <Button size="sm" className="flex-1" onClick={() => onUpdateStatus?.(job as T, "en_route")}>
            Start Route
          </Button>
        )}
        {job.status === "en_route" && (
          <Button size="sm" className="flex-1" onClick={() => onUpdateStatus?.(job as T, "on_site")}>
            Arrived
          </Button>
        )}
        {job.status === "on_site" && (
          <Button size="sm" className="flex-1" onClick={() => onUpdateStatus?.(job as T, "completed")}>
            Complete
          </Button>
        )}
      </div>
    </div>
  );
}
