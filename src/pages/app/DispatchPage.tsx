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
  Truck, 
  MapPin, 
  Clock, 
  User,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Plus,
  Loader2
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

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  high: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  urgent: "bg-destructive/10 text-destructive",
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dispatch Queue</h1>
          <p className="text-muted-foreground">Manage and dispatch jobs to crews</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Job
        </Button>
      </div>

      {/* Urgent Alert */}
      {urgentJobs.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
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
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {jobs?.filter(j => j.status === "pending").length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Assigned</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {jobs?.filter(j => j.status === "assigned").length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">En Route</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {jobs?.filter(j => j.status === "en_route").length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">On Site</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {jobs?.filter(j => j.status === "on_site").length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Today Done</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {jobs?.filter(j => 
                j.status === "completed" && 
                j.completed_at && 
                new Date(j.completed_at).toDateString() === new Date().toDateString()
              ).length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
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
        <span className="text-sm text-muted-foreground">
          {filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Jobs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job #</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Pickup</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No jobs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono font-medium">
                      {job.job_number}
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColors[job.priority] || ""}>
                        {job.priority}
                      </Badge>
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
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[job.status] || ""}>
                        {job.status.replace(/_/g, " ")}
                      </Badge>
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
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="assigned">Assigned</SelectItem>
                          <SelectItem value="en_route">En Route</SelectItem>
                          <SelectItem value="on_site">On Site</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
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
    </div>
  );
}
