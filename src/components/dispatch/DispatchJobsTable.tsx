import { Phone, MoreHorizontal, ChevronRight } from "lucide-react";
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
  notes?: string | null;
  eta_minutes?: number | null;
  assigned_crew: string | null;
  assigned_vehicle: string | null;
  created_at: string;
  customers?: { full_name: string; phone_e164: string } | null;
}

interface DispatchJobsTableProps {
  jobs: DispatchJob[];
  onAssign: (job: DispatchJob) => void;
  onUpdateStatus: (job: DispatchJob, newStatus: string) => void;
  onCall: (job: DispatchJob) => void;
  onViewDetails: (job: DispatchJob) => void;
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  urgent: { label: "Urgent", className: "bg-destructive text-destructive-foreground" },
  high: { label: "High", className: "bg-warning/15 text-warning border-warning/30" },
  normal: { label: "Normal", className: "bg-muted text-muted-foreground" },
  low: { label: "Low", className: "bg-muted/50 text-muted-foreground" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "border-warning text-warning bg-warning/10" },
  assigned: { label: "Assigned", className: "border-info text-info bg-info/10" },
  en_route: { label: "En Route", className: "border-primary text-primary bg-primary/10" },
  on_site: { label: "On Site", className: "border-success text-success bg-success/10" },
  completed: { label: "Completed", className: "border-muted-foreground text-muted-foreground" },
  cancelled: { label: "Cancelled", className: "border-destructive/30 text-destructive" },
};

export function DispatchJobsTable({
  jobs,
  onAssign,
  onUpdateStatus,
  onCall,
  onViewDetails,
}: DispatchJobsTableProps) {
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

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[100px]">Job #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Service</TableHead>
            <TableHead className="hidden lg:table-cell">Location</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Assigned</TableHead>
            <TableHead className="hidden md:table-cell">Time</TableHead>
            <TableHead className="w-[50px]"></TableHead>
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
                  "cursor-pointer transition-colors",
                  job.priority === "urgent" && "bg-destructive/5"
                )}
                onClick={() => onViewDetails(job)}
              >
                <TableCell className="font-mono text-xs">
                  {job.job_number || job.id.slice(0, 8)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
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
                        {job.customer_phone}
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {job.job_type || "Service"}
                </TableCell>
                <TableCell className="hidden lg:table-cell max-w-[200px]">
                  <span className="truncate block text-sm text-muted-foreground">
                    {job.pickup_address || "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs", priority.className)}>
                    {priority.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs", status.className)}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {job.assigned_crew || "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {nextStatus && nextLabel && (
                        <>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
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
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onCall(job);
                        }}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call Customer
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails(job);
                        }}
                      >
                        View Details
                      </DropdownMenuItem>
                      {job.status !== "cancelled" && job.status !== "completed" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStatus(job, "cancelled");
                            }}
                          >
                            Cancel Job
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
