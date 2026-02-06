import { Phone, MoreHorizontal, ChevronRight, MapPin, Navigation, Truck, Clock, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface DispatchJob {
  id: string;
  job_number?: string;
  status: string;
  priority: string;
  customer_name: string | null;
  customer_phone: string | null;
  pickup_address: string | null;
  dropoff_address?: string | null;
  job_type?: string | null;
  description?: string | null;
  notes?: string | null;
  price_cents?: number | null;
  estimated_duration_minutes?: number | null;
  assigned_crew: string | null;
  assigned_vehicle: string | null;
  created_at: string;
  customers?: { full_name: string; phone_e164: string } | null;
}

interface DispatchCommandTableProps {
  jobs: DispatchJob[];
  onAssign: (job: DispatchJob) => void;
  onUpdateStatus: (job: DispatchJob, newStatus: string) => void;
  onCall: (job: DispatchJob) => void;
  onViewDetails: (job: DispatchJob) => void;
}

const priorityConfig: Record<string, { label: string; className: string; dotClass: string; rowClass: string }> = {
  urgent: { 
    label: "Urgent", 
    className: "bg-destructive/10 text-destructive border-destructive/30",
    dotClass: "bg-destructive",
    rowClass: "bg-destructive/[0.03] hover:bg-destructive/[0.06]"
  },
  high: { 
    label: "High", 
    className: "bg-warning/10 text-warning border-warning/30",
    dotClass: "bg-warning",
    rowClass: ""
  },
  normal: { 
    label: "Normal", 
    className: "bg-muted/50 text-muted-foreground border-border/50",
    dotClass: "bg-muted-foreground",
    rowClass: ""
  },
  low: { 
    label: "Low", 
    className: "bg-muted/30 text-muted-foreground/70 border-border/30",
    dotClass: "bg-muted-foreground/50",
    rowClass: ""
  },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning/10 text-warning border-warning/30" },
  assigned: { label: "Assigned", className: "bg-primary/10 text-primary border-primary/30" },
  en_route: { label: "En Route", className: "bg-primary/10 text-primary border-primary/30" },
  on_site: { label: "On Site", className: "bg-success/10 text-success border-success/30" },
  completed: { label: "Completed", className: "bg-muted/50 text-muted-foreground border-border/50" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

export function DispatchCommandTable({
  jobs,
  onAssign,
  onUpdateStatus,
  onCall,
  onViewDetails,
}: DispatchCommandTableProps) {
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
      pending: "Assign",
      assigned: "Start Route",
      en_route: "Arrived",
      on_site: "Complete",
    };
    return labels[currentStatus] || null;
  };

  const truncateAddress = (address: string | null, maxLength = 35) => {
    if (!address) return "—";
    if (address.length <= maxLength) return address;
    return address.slice(0, maxLength) + "...";
  };

  const openInMaps = (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, "_blank");
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent bg-muted/30 border-b border-border/50">
            <TableHead className="w-[90px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job #</TableHead>
            <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pickup</TableHead>
            <TableHead className="hidden xl:table-cell text-xs font-semibold uppercase tracking-wider text-muted-foreground">Drop-off</TableHead>
            <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service</TableHead>
            <TableHead className="w-[120px] hidden lg:table-cell text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vehicle</TableHead>
            <TableHead className="w-[80px] hidden lg:table-cell text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price</TableHead>
            <TableHead className="w-[80px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</TableHead>
            <TableHead className="w-[90px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
            <TableHead className="w-[100px] hidden md:table-cell text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</TableHead>
            <TableHead className="w-[110px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            const priority = priorityConfig[job.priority] || priorityConfig.normal;
            const status = statusConfig[job.status] || statusConfig.pending;
            const nextStatus = getNextStatus(job.status);
            const nextLabel = getNextStatusLabel(job.status);

            return (
              <TableRow
                key={job.id}
                className={cn(
                  "cursor-pointer transition-colors border-b border-border/30",
                  priority.rowClass || "hover:bg-muted/30"
                )}
                onClick={() => onViewDetails(job)}
              >
                {/* Job Number */}
                <TableCell className="font-mono text-xs font-medium text-foreground/80">
                  {job.job_number || job.id.slice(0, 8)}
                </TableCell>

                {/* Customer */}
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-sm truncate max-w-[120px]">
                      {job.customer_name || job.customers?.full_name || "Unknown"}
                    </span>
                    {job.customer_phone && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs text-muted-foreground hover:text-primary justify-start"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCall(job);
                        }}
                      >
                        <Phone className="h-3 w-3 mr-1" />
                        {job.customer_phone.replace(/(\+1)(\d{3})(\d{3})(\d{4})/, "$2-$3-$4")}
                      </Button>
                    )}
                  </div>
                </TableCell>

                {/* Pickup Address */}
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 group">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate max-w-[200px]">
                          {truncateAddress(job.pickup_address)}
                        </span>
                        {job.pickup_address && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => openInMaps(job.pickup_address!, e)}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TooltipTrigger>
                    {job.pickup_address && (
                      <TooltipContent side="bottom" className="max-w-xs bg-popover border-border">
                        {job.pickup_address}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TableCell>

                {/* Dropoff Address */}
                <TableCell className="hidden xl:table-cell">
                  {job.dropoff_address ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 group">
                          <Navigation className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate max-w-[180px]">
                            {truncateAddress(job.dropoff_address, 30)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => openInMaps(job.dropoff_address!, e)}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs bg-popover border-border">
                        {job.dropoff_address}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </TableCell>

                {/* Service Type */}
                <TableCell>
                  <span className="text-sm text-foreground/80">{job.job_type || "Service"}</span>
                </TableCell>

                {/* Vehicle */}
                <TableCell className="hidden lg:table-cell">
                  {job.assigned_vehicle ? (
                    <div className="flex items-center gap-2">
                      <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{job.assigned_vehicle}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/50 text-sm">—</span>
                  )}
                </TableCell>

                {/* Price */}
                <TableCell className="hidden lg:table-cell text-right">
                  {job.price_cents !== null && job.price_cents !== undefined ? (
                    <span className="text-sm font-semibold tabular-nums text-success">
                      ${(job.price_cents / 100).toFixed(0)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/50 text-sm">—</span>
                  )}
                </TableCell>

                {/* Priority */}
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs font-medium", priority.className)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5", priority.dotClass)} />
                    {priority.label}
                  </Badge>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs font-medium", status.className)}>
                    {status.label}
                  </Badge>
                </TableCell>

                {/* Time */}
                <TableCell className="hidden md:table-cell">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(job.created_at), { addSuffix: false })}
                  </div>
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {nextStatus && nextLabel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs font-medium hover:bg-primary/10 hover:text-primary"
                        onClick={() => {
                          if (job.status === "pending") {
                            onAssign(job);
                          } else {
                            onUpdateStatus(job, nextStatus);
                          }
                        }}
                      >
                        <ChevronRight className="h-3 w-3 mr-1" />
                        {nextLabel}
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border w-48">
                        <DropdownMenuItem onClick={() => onViewDetails(job)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCall(job)}>
                          <Phone className="h-4 w-4 mr-2" />
                          Call Customer
                        </DropdownMenuItem>
                        {job.status !== "cancelled" && job.status !== "completed" && (
                          <>
                            <DropdownMenuSeparator className="bg-border/50" />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => onUpdateStatus(job, "cancelled")}
                            >
                              Cancel Job
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
