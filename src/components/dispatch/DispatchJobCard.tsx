import { MapPin, Clock, Phone, AlertTriangle, Truck, User, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const priorityConfig: Record<string, { label: string; badgeClass: string; dotClass: string; cardClass: string }> = {
  urgent: {
    label: "Urgent",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/30",
    dotClass: "bg-destructive",
    cardClass: "border-destructive/40 bg-destructive/[0.02]",
  },
  high: {
    label: "High",
    badgeClass: "bg-warning/10 text-warning border-warning/30",
    dotClass: "bg-warning",
    cardClass: "",
  },
  normal: {
    label: "Normal",
    badgeClass: "bg-muted/50 text-muted-foreground border-border/50",
    dotClass: "bg-muted-foreground",
    cardClass: "",
  },
  low: {
    label: "Low",
    badgeClass: "bg-muted/30 text-muted-foreground/70 border-border/30",
    dotClass: "bg-muted-foreground/50",
    cardClass: "",
  },
};

export const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning/10 text-warning border-warning/30" },
  assigned: { label: "Assigned", className: "bg-primary/10 text-primary border-primary/30" },
  en_route: { label: "En Route", className: "bg-primary/10 text-primary border-primary/30" },
  on_site: { label: "On Site", className: "bg-success/10 text-success border-success/30" },
  completed: { label: "Completed", className: "bg-muted/50 text-muted-foreground border-border/50" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/30" },
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
    eta_minutes?: number | null;
    assigned_crew: string | null;
    assigned_vehicle: string | null;
    created_at: string;
  };
  onAssign?: (job: T) => void;
  onUpdateStatus?: (job: T, newStatus: string) => void;
  onCall?: (job: T) => void;
}

export function DispatchJobCard<T>({ job, onAssign, onUpdateStatus, onCall }: DispatchJobCardProps<T>) {
  const priority = priorityConfig[job.priority] || priorityConfig.normal;
  const status = statusConfig[job.status] || statusConfig.pending;

  const getNextAction = () => {
    switch (job.status) {
      case "pending":
        return { label: "Assign", onClick: () => onAssign?.(job) };
      case "assigned":
        return { label: "Start Route", onClick: () => onUpdateStatus?.(job, "en_route") };
      case "en_route":
        return { label: "Arrived", onClick: () => onUpdateStatus?.(job, "on_site") };
      case "on_site":
        return { label: "Complete", onClick: () => onUpdateStatus?.(job, "completed") };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
        priority.cardClass
      )}
    >
      <CardContent className="p-5">
        {/* Header with priority and status */}
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className={cn("text-xs font-medium", priority.badgeClass)}>
            {job.priority === "urgent" && <AlertTriangle className="w-3 h-3 mr-1.5" />}
            <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5", priority.dotClass)} />
            {priority.label}
          </Badge>
          <Badge variant="outline" className={cn("text-xs font-medium", status.className)}>
            {status.label}
          </Badge>
        </div>

        {/* Customer & service */}
        <div className="mb-4">
          <h3 className="font-semibold text-foreground truncate">
            {job.customer_name || "Unknown Customer"}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">{job.job_type || "Service"}</p>
        </div>

        {/* Location */}
        <div className="flex items-start gap-2.5 text-sm text-muted-foreground mb-4 p-3 rounded-lg bg-muted/30">
          <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
          <p className="line-clamp-2 text-foreground/80">{job.pickup_address || "No address provided"}</p>
        </div>

        {/* ETA or assigned info */}
        <div className="flex items-center gap-4 text-sm mb-4">
          {job.eta_minutes && job.eta_minutes > 0 ? (
            <div className="flex items-center gap-2 text-primary">
              <Clock className="w-4 h-4" />
              <span className="font-medium">ETA: {job.eta_minutes} min</span>
            </div>
          ) : job.assigned_crew ? (
            <>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span className="font-medium">{job.assigned_crew}</span>
              </div>
              {job.assigned_vehicle && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Truck className="w-4 h-4" />
                  <span>{job.assigned_vehicle}</span>
                </div>
              )}
            </>
          ) : (
            <span className="text-muted-foreground/60 text-xs">Not yet assigned</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-border/50">
          {nextAction ? (
            <Button 
              size="sm" 
              className="flex-1 h-9"
              onClick={nextAction.onClick}
            >
              <ChevronRight className="w-4 h-4 mr-1" />
              {nextAction.label}
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="flex-1 h-9" disabled>
              Done
            </Button>
          )}
          <Button 
            size="sm" 
            variant="outline" 
            className="h-9 w-9 p-0"
            onClick={() => onCall?.(job)}
          >
            <Phone className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
