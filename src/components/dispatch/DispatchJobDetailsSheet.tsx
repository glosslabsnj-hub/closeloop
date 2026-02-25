import { format } from "date-fns";
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
  Route,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PriceBreakdown {
  base_price?: number;
  per_mile_rate?: number;
  distance_charge?: number;
  vehicle_modifier?: number;
  urgency_modifier?: number;
  total?: number;
  description?: string;
  [key: string]: unknown;
}

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
  // Distance & Pricing fields
  dispatch_distance_miles?: number | null;
  tow_distance_miles?: number | null;
  total_distance_miles?: number | null;
  service_tier?: string | null;
  pricing_note?: string | null;
  price_breakdown?: PriceBreakdown | null;
}

interface DispatchJobDetailsSheetProps {
  job: DispatchJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (job: DispatchJob) => void;
  onUpdateStatus: (job: DispatchJob, status: string) => void;
  onCall: (job: DispatchJob) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "border-warning text-warning bg-warning/10" },
  assigned: { label: "Assigned", className: "border-info text-info bg-info/10" },
  en_route: { label: "En Route", className: "border-primary text-primary bg-primary/10" },
  on_site: { label: "On Site", className: "border-success text-success bg-success/10" },
  completed: { label: "Completed", className: "border-muted-foreground text-muted-foreground bg-muted" },
  cancelled: { label: "Cancelled", className: "border-destructive/30 text-destructive bg-destructive/10" },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  urgent: { label: "Urgent", className: "bg-destructive text-destructive-foreground" },
  high: { label: "High", className: "bg-warning/15 text-warning border-warning/30" },
  normal: { label: "Normal", className: "bg-muted text-muted-foreground" },
  low: { label: "Low", className: "bg-muted/50 text-muted-foreground" },
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
    toast({ title: `${label} copied` });
  };

  const openInMaps = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, "_blank");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">
              Job #{job.job_number || job.id.slice(0, 8)}
            </SheetTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-xs", priority.className)}>
                {priority.label}
              </Badge>
              <Badge variant="outline" className={cn("text-xs", status.className)}>
                {status.label}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Quick Actions */}
          {nextStatus && nextLabel && (
            <div className="flex gap-2">
              <Button
                className="flex-1"
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
                <Button variant="outline" size="icon" onClick={() => onCall(job)}>
                  <Phone className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          <Separator />

          {/* Customer Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Customer
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {job.customer_name || job.customers?.full_name || "Unknown"}
                </span>
              </div>
              {job.customer_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Button
                    variant="link"
                    className="h-auto p-0 text-primary"
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

          <Separator />

          {/* Locations */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Locations
            </h4>
            <div className="space-y-4">
              {/* Pickup */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  PICKUP
                </div>
                {job.pickup_address ? (
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-sm">{job.pickup_address}</p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyToClipboard(job.pickup_address!, "Address")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openInMaps(job.pickup_address!)}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not provided</p>
                )}
              </div>

              {/* Dropoff */}
              {job.dropoff_address && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Navigation className="h-3 w-3" />
                    DROP-OFF
                  </div>
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-sm">{job.dropoff_address}</p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyToClipboard(job.dropoff_address!, "Address")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openInMaps(job.dropoff_address!)}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Distance & Pricing Section */}
          <Separator />
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Route className="h-4 w-4" />
              Distance & Pricing
            </h4>
            
            {/* Show guidance when no distance data is available */}
            {!job.dispatch_distance_miles && !job.tow_distance_miles && !job.price_breakdown && !job.pricing_note ? (
              <div className="p-3 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/30">
                <p className="text-sm text-muted-foreground">
                  Distance and pricing data will appear here when jobs are created through AI calls with a base address configured in Business Brain → Coverage & ETA.
                </p>
              </div>
            ) : (
              <>
                {/* Distance Breakdown */}
                {(job.dispatch_distance_miles || job.tow_distance_miles) && (
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Distance Breakdown</p>
                    <div className="grid grid-cols-2 gap-3">
                      {job.dispatch_distance_miles != null && (
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">Drive to Pickup</p>
                          <p className="text-sm font-semibold">{job.dispatch_distance_miles.toFixed(1)} mi</p>
                        </div>
                      )}
                      {job.tow_distance_miles != null && (
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">Pickup → Drop-off</p>
                          <p className="text-sm font-semibold">{job.tow_distance_miles.toFixed(1)} mi</p>
                        </div>
                      )}
                    </div>
                    {job.total_distance_miles != null && (
                      <div className="pt-2 border-t border-border/50 flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">Total Trip</p>
                        <p className="text-sm font-bold">{job.total_distance_miles.toFixed(1)} mi</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Service Tier Badge */}
                {job.service_tier && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Service Tier:</span>
                    <Badge variant="outline" className="text-xs">
                      {job.service_tier}
                    </Badge>
                  </div>
                )}

                {/* Price Breakdown */}
                {job.price_breakdown && Object.keys(job.price_breakdown).length > 0 && (
                  <div className="p-3 rounded-lg border border-success/30 bg-success/5 space-y-2">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-success" />
                      <p className="text-xs font-medium text-success uppercase tracking-wide">Price Breakdown</p>
                    </div>
                    <div className="space-y-1.5">
                      {job.price_breakdown.base_price != null && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Base Price</span>
                          <span className="font-medium">${job.price_breakdown.base_price.toFixed(2)}</span>
                        </div>
                      )}
                      {job.price_breakdown.distance_charge != null && job.price_breakdown.distance_charge > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Distance Charge
                            {job.price_breakdown.per_mile_rate && (
                              <span className="text-xs ml-1">(${job.price_breakdown.per_mile_rate}/mi)</span>
                            )}
                          </span>
                          <span className="font-medium">${job.price_breakdown.distance_charge.toFixed(2)}</span>
                        </div>
                      )}
                      {job.price_breakdown.vehicle_modifier != null && job.price_breakdown.vehicle_modifier !== 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Vehicle Adjustment</span>
                          <span className="font-medium">
                            {job.price_breakdown.vehicle_modifier > 0 ? '+' : ''}${job.price_breakdown.vehicle_modifier.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {job.price_breakdown.urgency_modifier != null && job.price_breakdown.urgency_modifier !== 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Urgency Fee</span>
                          <span className="font-medium">
                            +${job.price_breakdown.urgency_modifier.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {job.price_breakdown.total != null && (
                        <div className="flex justify-between text-sm pt-2 border-t border-success/20">
                          <span className="font-semibold text-foreground">Total Quote</span>
                          <span className="font-bold text-success text-base">${job.price_breakdown.total.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Pricing Note from AI */}
                {job.pricing_note && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-xs font-medium text-primary mb-1">AI Quote Given to Customer</p>
                    <p className="text-sm text-foreground">{job.pricing_note}</p>
                  </div>
                )}
              </>
            )}
          </div>

          <Separator />

          {/* Job Details */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Job Details
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Service Type</p>
                <p className="text-sm font-medium">{job.job_type || "General"}</p>
              </div>
              {job.price_cents !== null && job.price_cents !== undefined && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Final Price</p>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-success" />
                    <p className="text-sm font-semibold">${(job.price_cents / 100).toFixed(2)}</p>
                  </div>
                </div>
              )}
              {job.estimated_duration_minutes && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Est. Duration</p>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{job.estimated_duration_minutes} min</p>
                  </div>
                </div>
              )}
            </div>
            {(job.description || job.notes) && (
              <div className="space-y-1 pt-2">
                <p className="text-xs text-muted-foreground">Notes</p>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <p className="text-sm">{job.description || job.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Assignment */}
          {(job.assigned_crew || job.assigned_vehicle) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Assignment
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {job.assigned_crew && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Crew</p>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">{job.assigned_crew}</p>
                      </div>
                    </div>
                  )}
                  {job.assigned_vehicle && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Vehicle</p>
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

          <Separator />

          {/* Timeline */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Timeline
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{format(new Date(job.created_at), "MMM d, h:mm a")}</span>
              </div>
              {job.dispatched_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dispatched</span>
                  <span>{format(new Date(job.dispatched_at), "MMM d, h:mm a")}</span>
                </div>
              )}
              {job.arrived_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Arrived</span>
                  <span>{format(new Date(job.arrived_at), "MMM d, h:mm a")}</span>
                </div>
              )}
              {job.completed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span>{format(new Date(job.completed_at), "MMM d, h:mm a")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Cancel Button */}
          {job.status !== "cancelled" && job.status !== "completed" && (
            <>
              <Separator />
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => onUpdateStatus(job, "cancelled")}
              >
                Cancel Job
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
