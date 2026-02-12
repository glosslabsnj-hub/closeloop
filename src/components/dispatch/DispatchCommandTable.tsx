import { Phone, MoreHorizontal, ChevronRight, MapPin, Navigation, Truck, Clock, ChevronDown } from "lucide-react";
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
  DropdownMenuLabel,
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

const priorityConfig: Record<string, { label: string; className: string; rowClass: string }> = {
  urgent: { 
    label: "Urgent", 
    className: "bg-destructive text-destructive-foreground",
    rowClass: "bg-destructive/5 hover:bg-destructive/10"
  },
  high: { 
    label: "High", 
    className: "bg-warning/15 text-warning border-warning/30",
    rowClass: ""
  },
  normal: { 
    label: "Normal", 
    className: "bg-muted text-muted-foreground",
    rowClass: ""
  },
  low: { 
    label: "Low", 
    className: "bg-muted/50 text-muted-foreground",
    rowClass: ""
  },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "border-warning text-warning bg-warning/10" },
  assigned: { label: "Assigned", className: "border-info text-info bg-info/10" },
  en_route: { label: "En Route", className: "border-primary text-primary bg-primary/10" },
  on_site: { label: "On Site", className: "border-success text-success bg-success/10" },
  completed: { label: "Completed", className: "border-muted-foreground text-muted-foreground" },
  cancelled: { label: "Cancelled", className: "border-destructive/30 text-destructive" },
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

  const truncateAddress = (address: string | null, maxLength = 28) => {
    if (!address) return "—";
    if (address.length <= maxLength) return address;
    return address.slice(0, maxLength) + "…";
  };

  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="hover:bg-transparent bg-muted/30">
            <TableHead className="w-[80px] whitespace-nowrap">Job #</TableHead>
            <TableHead className="w-[110px] whitespace-nowrap">Customer</TableHead>
            <TableHead className="whitespace-nowrap">Pickup</TableHead>
            <TableHead className="hidden 2xl:table-cell whitespace-nowrap">Drop-off</TableHead>
            <TableHead className="w-[60px] whitespace-nowrap">Type</TableHead>
            <TableHead className="w-[60px] hidden xl:table-cell text-right whitespace-nowrap">Price</TableHead>
            <TableHead className="w-[70px] whitespace-nowrap">Priority</TableHead>
            <TableHead className="w-[85px] whitespace-nowrap">Status</TableHead>
            <TableHead className="w-[65px] hidden xl:table-cell whitespace-nowrap">Time</TableHead>
            <TableHead className="w-[40px] whitespace-nowrap"></TableHead>
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
                  "cursor-pointer transition-colors hover:bg-muted/20",
                  priority.rowClass
                )}
                onClick={() => onViewDetails(job)}
              >
                {/* Job Number */}
                <TableCell className="font-mono text-xs font-medium">
                  {job.job_number || job.id.slice(0, 8)}
                </TableCell>

                {/* Customer */}
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-sm truncate block">
                      {job.customer_name || job.customers?.full_name || "Unknown"}
                    </span>
                    {job.customer_phone && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs text-muted-foreground justify-start"
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
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate block">
                          {truncateAddress(job.pickup_address)}
                        </span>
                      </div>
                    </TooltipTrigger>
                    {job.pickup_address && (
                      <TooltipContent side="bottom" className="max-w-xs">
                        {job.pickup_address}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TableCell>

                {/* Dropoff Address */}
                <TableCell className="hidden 2xl:table-cell">
                  {job.dropoff_address ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5">
                          <Navigation className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate block">
                            {truncateAddress(job.dropoff_address, 24)}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        {job.dropoff_address}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Service Type */}
                <TableCell>
                  <span className="text-sm">{job.job_type || "Service"}</span>
                </TableCell>

                {/* Price */}
                <TableCell className="hidden xl:table-cell text-right">
                  {job.price_cents !== null && job.price_cents !== undefined ? (
                    <span className="text-sm font-medium tabular-nums">
                      ${(job.price_cents / 100).toFixed(0)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>

                {/* Priority */}
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs", priority.className)}>
                    {priority.label}
                  </Badge>
                </TableCell>

                {/* Status - Clickable Dropdown */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-7 px-2 text-xs gap-1 font-normal",
                          status.className,
                          "border hover:opacity-80"
                        )}
                      >
                        {status.label}
                        <ChevronDown className="h-3 w-3 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-36">
                      <DropdownMenuLabel className="text-xs">Change Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <DropdownMenuItem
                          key={key}
                          onClick={() => {
                            if (key === "assigned" && job.status === "pending") {
                              onAssign(job);
                            } else {
                              onUpdateStatus(job, key);
                            }
                          }}
                          className={cn(
                            "text-xs",
                            job.status === key && "bg-muted font-medium"
                          )}
                        >
                          <Badge
                            variant="outline"
                            className={cn("h-4 w-4 p-0 mr-2 shrink-0", config.className)}
                          />
                          {config.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>

                {/* Time */}
                <TableCell className="hidden xl:table-cell">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(job.created_at), { addSuffix: false })}
                  </div>
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewDetails(job)}>
                          View Details
                        </DropdownMenuItem>
                        {nextStatus && nextLabel && (
                          <DropdownMenuItem
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
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onCall(job)}>
                          <Phone className="h-4 w-4 mr-2" />
                          Call Customer
                        </DropdownMenuItem>
                        {job.status !== "cancelled" && job.status !== "completed" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
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
