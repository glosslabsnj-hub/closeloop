import { formatDistanceToNow, format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Phone,
  MapPin,
  Navigation,
  Truck,
  User,
  Clock,
  DollarSign,
  FileText,
  ExternalLink,
  Copy,
  ChevronRight,
  Calendar,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface DispatchJob {
  id: string;
  job_number?: string;
  status: string;
  priority: string;
  customer_name: string | null;
  customer_phone: string | null;
  pickup_address: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  dropoff_address?: string | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  job_type?: string | null;
  description?: string | null;
  notes?: string | null;
  price_cents?: number | null;
  estimated_duration_minutes?: number | null;
  assigned_crew: string | null;
  assigned_vehicle: string | null;
  created_at: string;
  dispatched_at?: string | null;
  arrived_at?: string | null;
  completed_at?: string | null;
  customers?: { full_name: string; phone_e164: string } | null;
}

interface DispatchJobDetailsSheetProps {
  job: DispatchJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (job: DispatchJob) => void;
  onUpdateStatus: (job: DispatchJob, status: string) => void;
  onCall: (job: DispatchJob) => void;
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending: { label: "Pending", className: "bg-warning/10 text-warning border-warning/30", icon: Clock },
  assigned: { label: "Assigned", className: "bg-primary/10 text-primary border-primary/30", icon: User },
  en_route: { label: "En Route", className: "bg-primary/10 text-primary border-primary/30", icon: Navigation },
  on_site: { label: "On Site", className: "bg-success/10 text-success border-success/30", icon: MapPin },
  completed: { label: "Completed", className: "bg-success/10 text-success border-success/30", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle },
};

const priorityConfig: Record<string, { label: string; className: string; dotClass: string }> = {
  urgent: { label: "Urgent", className: "bg-destructive/10 text-destructive border-destructive/30", dotClass: "bg-destructive" },
  high: { label: "High", className: "bg-warning/10 text-warning border-warning/30", dotClass: "bg-warning" },
  normal: { label: "Normal", className: "bg-muted/50 text-muted-foreground border-border/50", dotClass: "bg-muted-foreground" },
  low: { label: "Low", className: "bg-muted/30 text-muted-foreground/70 border-border/30", dotClass: "bg-muted-foreground/50" },
};

export function DispatchJobDetailsSheet({
  job,
  open,
  onOpenChange,
  onAssign,
  onUpdateStatus,
  onCall,
}: DispatchJobDetailsSheetProps) {
  const { toast } = useToast();

  if (!job) return null;

  const status = statusConfig[job.status] || statusConfig.pending;
  const priority = priorityConfig[job.priority] || priorityConfig.normal;
  const StatusIcon = status.icon;
  
  const getNextStatus = (currentStatus: string): string | null => {
    const flow: Record<string, string> = {
      pending: "assigned",
      assigned: "en_route",
      en_route: "on_site",
      on_site: "completed",
    };
    return flow[currentStatus] || null;
  };

  const getNextStatusLabel = (currentStatus: string): string | null => {
    const labels: Record<string, string> = {
      pending: "Assign & Dispatch",
      assigned: "Mark En Route",
      en_route: "Mark Arrived",
      on_site: "Complete Job",
    };
    return labels[currentStatus] || null;
  };

  const nextStatus = getNextStatus(job.status);
  const nextLabel = getNextStatusLabel(job.status);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied to clipboard` });
  };

  const openInMaps = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, "_blank");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-background border-l border-border/50">
        <SheetHeader className="pb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Job Details
              </p>
              <SheetTitle className="text-xl font-semibold">
                #{job.job_number || job.id.slice(0, 8)}
              </SheetTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-xs font-medium", priority.className)}>
                <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5", priority.dotClass)} />
                {priority.label}
              </Badge>
              <Badge variant="outline" className={cn("text-xs font-medium", status.className)}>
                <StatusIcon className="h-3 w-3 mr-1.5" />
                {status.label}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Quick Actions */}
          {nextStatus && nextLabel && (
            <div className="flex gap-3">
              <Button
                className="flex-1 h-11"
                onClick={() => {
                  if (job.status === "pending") {
                    onAssign(job);
                  } else {
                    onUpdateStatus(job, nextStatus);
                  }
                }}
              >
                <ChevronRight className="h-4 w-4 mr-2" />
                {nextLabel}
              </Button>
              {job.customer_phone && (
                <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => onCall(job)}>
                  <Phone className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          <Separator className="bg-border/50" />

          {/* Customer Info */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Customer
            </h4>
            <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {job.customer_name || job.customers?.full_name || "Unknown"}
                  </p>
                  {job.customer_phone && (
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        variant="link"
                        className="h-auto p-0 text-sm text-muted-foreground hover:text-primary"
                        onClick={() => onCall(job)}
                      >
                        {job.customer_phone}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(job.customer_phone!, "Phone")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Locations */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Locations
            </h4>
            <div className="space-y-3">
              {/* Pickup */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                  <MapPin className="h-3.5 w-3.5" />
                  PICKUP LOCATION
                </div>
                {job.pickup_address ? (
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-foreground">{job.pickup_address}</p>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyToClipboard(job.pickup_address!, "Address")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openInMaps(job.pickup_address!)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not provided</p>
                )}
              </div>

              {/* Dropoff */}
              {job.dropoff_address && (
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                    <Navigation className="h-3.5 w-3.5" />
                    DROP-OFF LOCATION
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-foreground">{job.dropoff_address}</p>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyToClipboard(job.dropoff_address!, "Address")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openInMaps(job.dropoff_address!)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Job Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Job Details
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Service Type</p>
                <p className="text-sm font-medium">{job.job_type || "General"}</p>
              </div>
              {job.price_cents !== null && job.price_cents !== undefined && (
                <div className="p-4 rounded-xl bg-success/5 border border-success/20">
                  <p className="text-xs text-muted-foreground mb-1">Price</p>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-success" />
                    <p className="text-sm font-semibold text-success">{(job.price_cents / 100).toFixed(2)}</p>
                  </div>
                </div>
              )}
              {job.estimated_duration_minutes && (
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Est. Duration</p>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{job.estimated_duration_minutes} min</p>
                  </div>
                </div>
              )}
            </div>
            {(job.description || job.notes) && (
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <FileText className="h-3.5 w-3.5" />
                  NOTES
                </div>
                <p className="text-sm text-foreground/80">{job.description || job.notes}</p>
              </div>
            )}
          </div>

          {/* Assignment */}
          {(job.assigned_crew || job.assigned_vehicle) && (
            <>
              <Separator className="bg-border/50" />
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Assignment
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {job.assigned_crew && (
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-1">Crew / Driver</p>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">{job.assigned_crew}</p>
                      </div>
                    </div>
                  )}
                  {job.assigned_vehicle && (
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Vehicle</p>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">{job.assigned_vehicle}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator className="bg-border/50" />

          {/* Timeline */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Timeline
            </h4>
            <div className="space-y-3">
              {[
                { label: "Created", time: job.created_at, icon: Calendar },
                { label: "Dispatched", time: job.dispatched_at, icon: Navigation },
                { label: "Arrived", time: job.arrived_at, icon: MapPin },
                { label: "Completed", time: job.completed_at, icon: CheckCircle2 },
              ].filter(item => item.time).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="text-sm font-medium">
                    {format(new Date(item.time!), "MMM d, h:mm a")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Cancel Button */}
          {job.status !== "cancelled" && job.status !== "completed" && (
            <>
              <Separator className="bg-border/50" />
              <Button
                variant="outline"
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onUpdateStatus(job, "cancelled")}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Job
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
