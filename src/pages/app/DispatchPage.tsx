import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Truck,
  MapPin,
  Clock,
  User,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Plus,
  Loader2,
  HelpCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  assigned: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  en_route: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  on_site: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  completed: "bg-green-500/10 text-green-700 dark:text-green-300",
  cancelled: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  assigned: "Assigned",
  en_route: "En Route",
  on_site: "On Site",
  completed: "Completed",
  cancelled: "Cancelled",
};

const statusDescriptions: Record<string, string> = {
  pending: "Waiting for crew assignment",
  assigned: "Crew assigned, ready to dispatch",
  en_route: "Crew is on the way to location",
  on_site: "Crew has arrived and is working",
  completed: "Job finished successfully",
  cancelled: "Job was cancelled",
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  high: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  urgent: "bg-destructive/10 text-destructive",
};

const priorityDescriptions: Record<string, string> = {
  low: "Can wait — schedule when convenient",
  normal: "Standard timing — handle in order",
  high: "Priority handling — move up the queue",
  urgent: "Drop everything — immediate attention needed",
};

export default function DispatchPage() {
  // P0-3: Route protection - redirect if dispatch_queue module not enabled
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["dispatch_queue"]);
  
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("active");

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["dispatch-jobs", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("dispatch_jobs")
        .select("*, customers(full_name, phone_e164)")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  const updateJobMutation = useMutation({
    mutationFn: async ({ jobId, updates }: { jobId: string; updates: any }) => {
      const { error } = await supabase
        .from("dispatch_jobs")
        .update(updates)
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch-jobs"] });
      toast({ title: "Job updated" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const activeStatuses = ["pending", "assigned", "en_route", "on_site"];
  
  const filteredJobs = jobs?.filter(job => {
    if (statusFilter === "active") {
      return activeStatuses.includes(job.status);
    }
    if (statusFilter === "all") return true;
    return job.status === statusFilter;
  }) || [];

  const urgentJobs = jobs?.filter(j => 
    j.priority === "urgent" && activeStatuses.includes(j.status)
  ) || [];

  // Show loading while checking module access
  if (moduleLoading || !isAllowed) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <PageContainer maxWidth="xl">
        <PageHeader
          icon={<Truck className="h-5 w-5" />}
          title="Dispatch Queue"
          description="Track and dispatch service calls to your team"
          action={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Button>
          }
        />

        {/* Urgent Alert with Tooltip */}
        {urgentJobs.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="border-destructive bg-destructive/5 cursor-help">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="font-medium text-destructive">
                        {urgentJobs.length} Urgent Job{urgentJobs.length > 1 ? "s" : ""} Pending
                      </p>
                      <p className="text-sm text-muted-foreground">
                        These require immediate attention
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Jobs marked "urgent" have been escalated and need immediate dispatch. These typically come from emergency service requests.
            </TooltipContent>
          </Tooltip>
        )}

        {/* Stats with Enhanced Labels and Tooltips */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-warning" />
                    <span className="text-sm text-muted-foreground">Pending</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    {jobs?.filter(j => j.status === "pending").length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Waiting for assignment</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Jobs that need a crew assigned to them</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Assigned</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    {jobs?.filter(j => j.status === "assigned").length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Crew assigned</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Jobs with an assigned crew, ready to be dispatched</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-accent-foreground" />
                    <span className="text-sm text-muted-foreground">En Route</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    {jobs?.filter(j => j.status === "en_route").length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">On the way</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Crews currently traveling to job locations</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-warning" />
                    <span className="text-sm text-muted-foreground">On Site</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    {jobs?.filter(j => j.status === "on_site").length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Working on site</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Crews currently at the job location working</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm text-muted-foreground">Today Done</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    {jobs?.filter(j => 
                      j.status === "completed" && 
                      j.completed_at && 
                      new Date(j.completed_at).toDateString() === new Date().toDateString()
                    ).length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Finished today</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Jobs completed today</TooltipContent>
          </Tooltip>
        </div>

        {/* Filter with Helper Text */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Jobs</SelectItem>
                <SelectItem value="all">All Jobs</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="en_route">En Route</SelectItem>
                <SelectItem value="on_site">On Site</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium mb-1">Job Status Flow:</p>
                <p className="text-xs">Pending → Assigned → En Route → On Site → Completed</p>
                <p className="text-xs mt-1 text-muted-foreground">Jobs can be cancelled at any stage</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <span className="text-sm text-muted-foreground">
            {filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Jobs Table with Enhanced Headers */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1">
                        Job #
                      </TooltipTrigger>
                      <TooltipContent>Unique job identifier</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1">
                        Priority
                      </TooltipTrigger>
                      <TooltipContent>How urgently this job needs attention</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1">
                        Pickup
                      </TooltipTrigger>
                      <TooltipContent>Job location or pickup address</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1">
                        Assigned
                      </TooltipTrigger>
                      <TooltipContent>Crew and vehicle assigned to this job</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1">
                        Actions
                      </TooltipTrigger>
                      <TooltipContent>Change job status to move it through the workflow</TooltipContent>
                    </Tooltip>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="font-medium text-lg mb-2">No jobs yet</p>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                        When customers call for service, your AI will capture the details and jobs will appear here ready for dispatch.
                      </p>
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Job
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobs.map((job) => (
                    <TableRow key={job.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono font-medium">
                        {job.job_number}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className={priorityColors[job.priority] || ""}>
                              {job.priority}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>{priorityDescriptions[job.priority]}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{job.customer_name || "Unknown"}</p>
                          {job.customer_phone && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {job.customer_phone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-1 max-w-[200px]">
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="text-sm truncate">{job.pickup_address || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {job.assigned_crew && (
                            <p className="text-sm">{job.assigned_crew}</p>
                          )}
                          {job.assigned_vehicle && (
                            <p className="text-xs text-muted-foreground">{job.assigned_vehicle}</p>
                          )}
                          {!job.assigned_crew && !job.assigned_vehicle && (
                            <span className="text-muted-foreground italic">Unassigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className={statusColors[job.status] || ""}>
                              {statusLabels[job.status] || job.status.replace(/_/g, " ")}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>{statusDescriptions[job.status]}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={job.status}
                          onValueChange={(status) => 
                            updateJobMutation.mutate({ 
                              jobId: job.id, 
                              updates: { 
                                status,
                                ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}),
                                ...(status === "en_route" ? { dispatched_at: new Date().toISOString() } : {}),
                                ...(status === "on_site" ? { arrived_at: new Date().toISOString() } : {}),
                              }
                            })
                          }
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">
                              <span className="flex items-center gap-2">
                                <Clock className="h-3 w-3" /> Pending
                              </span>
                            </SelectItem>
                            <SelectItem value="assigned">
                              <span className="flex items-center gap-2">
                                <User className="h-3 w-3" /> Assigned
                              </span>
                            </SelectItem>
                            <SelectItem value="en_route">
                              <span className="flex items-center gap-2">
                                <Navigation className="h-3 w-3" /> En Route
                              </span>
                            </SelectItem>
                            <SelectItem value="on_site">
                              <span className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" /> On Site
                              </span>
                            </SelectItem>
                            <SelectItem value="completed">
                              <span className="flex items-center gap-2">
                                <CheckCircle2 className="h-3 w-3" /> Completed
                              </span>
                            </SelectItem>
                            <SelectItem value="cancelled">
                              <span className="flex items-center gap-2 text-destructive">
                                Cancelled
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </PageContainer>
    </TooltipProvider>
  );
}
