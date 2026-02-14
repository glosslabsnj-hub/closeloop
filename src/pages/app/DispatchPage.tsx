import { useState, useMemo, useEffect, useCallback } from "react";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Truck, Plus, Loader2, Map, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DispatchJobCard } from "@/components/dispatch/DispatchJobCard";
import { DispatchCommandTable } from "@/components/dispatch/DispatchCommandTable";
import { DispatchCommandStats } from "@/components/dispatch/DispatchCommandStats";
import { DispatchFilters } from "@/components/dispatch/DispatchFilters";
import { DispatchJobDetailsSheet } from "@/components/dispatch/DispatchJobDetailsSheet";
import { AssignJobDialog } from "@/components/dispatch/AssignJobDialog";
import { EmptyState } from "@/components/ui/empty-state";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Link } from "react-router-dom";
import { toast as sonnerToast } from "sonner";

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

export default function DispatchPage() {
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["dispatch_queue"]);
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  
  // Sheet and Dialog state
  const [selectedJob, setSelectedJob] = useState<DispatchJob | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [jobToAssign, setJobToAssign] = useState<DispatchJob | null>(null);

  const { data: jobs, isLoading, refetch } = useQuery({
    queryKey: ["dispatch-jobs", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("dispatch_jobs")
        .select("*, customers(full_name, phone_e164)")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as DispatchJob[];
    },
    enabled: !!tenant?.id,
  });

  // Fetch callback requests from opportunities
  const { data: callbacks, refetch: refetchCallbacks } = useQuery({
    queryKey: ["dispatch-callbacks", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("opportunities")
        .select("*, customers(full_name, phone_e164)")
        .eq("tenant_id", tenant.id)
        .eq("source", "voice_callback")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  const pendingCallbacks = callbacks?.filter(c => c.status === "pending") || [];

  // Real-time subscription for new jobs and status updates
  useEffect(() => {
    if (!tenant?.id) return;

    const channel = supabase
      .channel(`dispatch-jobs-realtime-${tenant.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dispatch_jobs",
          filter: `tenant_id=eq.${tenant.id}`,
        },
        (payload) => {
          // Show alert for new job
          const newJob = payload.new as DispatchJob;
          sonnerToast.info("New Dispatch Job!", {
            description: `${newJob.customer_name || "Customer"} - ${newJob.pickup_address?.slice(0, 40) || "Unknown location"}`,
            duration: 10000,
            action: {
              label: "View",
              onClick: () => {
                setSelectedJob(newJob);
                setDetailsOpen(true);
              },
            },
          });
          // Play notification sound if available
          try {
            const audio = new Audio("/notification.mp3");
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch {}
          // Refetch to get the new job
          refetch();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "dispatch_jobs",
          filter: `tenant_id=eq.${tenant.id}`,
        },
        () => {
          // Refetch on any update (driver status changes, etc.)
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, refetch]);

  const updateJobMutation = useMutation({
    mutationFn: async ({ jobId, updates }: { jobId: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("dispatch_jobs")
        .update(updates)
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch-jobs", tenant?.id] });
      toast({ title: "Job updated" });
      setDetailsOpen(false);
      setAssignDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const activeStatuses = ["pending", "assigned", "en_route", "on_site"];

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];

    // If callbacks filter is selected, we handle that separately in the render
    if (statusFilter === "callbacks") return [];

    return jobs.filter((job) => {
      // Status filter
      if (statusFilter === "active") {
        if (!activeStatuses.includes(job.status)) return false;
      } else if (statusFilter !== "all" && job.status !== statusFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== "all" && job.priority !== priorityFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const customerName = job.customer_name?.toLowerCase() || "";
        const pickupAddress = job.pickup_address?.toLowerCase() || "";
        const dropoffAddress = job.dropoff_address?.toLowerCase() || "";
        const jobNumber = job.job_number?.toLowerCase() || "";
        const jobType = job.job_type?.toLowerCase() || "";
        const vehicle = job.assigned_vehicle?.toLowerCase() || "";
        const crew = job.assigned_crew?.toLowerCase() || "";
        return (
          customerName.includes(query) ||
          pickupAddress.includes(query) ||
          dropoffAddress.includes(query) ||
          jobNumber.includes(query) ||
          jobType.includes(query) ||
          vehicle.includes(query) ||
          crew.includes(query)
        );
      }

      return true;
    });
  }, [jobs, statusFilter, priorityFilter, searchQuery]);

  const handleAssign = (job: DispatchJob) => {
    setJobToAssign(job);
    setAssignDialogOpen(true);
  };

  const handleAssignSubmit = (jobId: string, crew: string, vehicle: string, driverId?: string, vehicleId?: string) => {
    const updates: Record<string, unknown> = {
      status: "assigned",
      assigned_crew: crew || null,
      assigned_vehicle: vehicle || null,
      driver_id: driverId || null,
      vehicle_id: vehicleId || null,
      dispatched_at: new Date().toISOString(),
    };
    updateJobMutation.mutate({ jobId, updates });
  };

  const handleUpdateStatus = (job: DispatchJob, newStatus: string) => {
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "completed") {
      updates.completed_at = new Date().toISOString();
    }
    if (newStatus === "on_site") {
      updates.arrived_at = new Date().toISOString();
    }
    updateJobMutation.mutate({ jobId: job.id, updates });
  };

  const handleCall = (job: DispatchJob) => {
    const phone = job.customer_phone || job.customers?.phone_e164;
    if (phone) {
      window.open(`tel:${phone}`);
    }
  };

  const handleViewDetails = (job: DispatchJob) => {
    setSelectedJob(job);
    setDetailsOpen(true);
  };

  if (moduleLoading || !isAllowed) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <PageContainer maxWidth="full">
        <div className="space-y-6">
          <PageHeader
            title="Dispatch Command Center"
            description={`${filteredJobs.length} ${statusFilter === "active" ? "active " : ""}jobs in queue`}
            action={
              <div className="flex items-center gap-2">
                <Button variant="outline" asChild>
                  <Link to="/app/dispatch-map">
                    <Map className="h-4 w-4" />
                    Map View
                  </Link>
                </Button>
                <Button>
                  <Plus className="h-4 w-4" />
                  New Job
                </Button>
              </div>
            }
          />

          {/* Command Center Stats */}
          <DispatchCommandStats jobs={jobs || []} />

          {/* Filters */}
          <DispatchFilters
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            callbackCount={pendingCallbacks.length}
          />

          {/* Callbacks List */}
          {statusFilter === "callbacks" ? (
            callbacks && callbacks.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Callback requests from callers who need follow-up
                </p>
                <div className="grid gap-3">
                  {callbacks.map((callback: any) => (
                    <div
                      key={callback.id}
                      className="flex items-start justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {callback.customers?.full_name || "Unknown Caller"}
                          </span>
                          {callback.status === "pending" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning/15 text-warning border border-warning/30">
                              Pending
                            </span>
                          )}
                          {callback.status === "contacted" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success/15 text-success border border-success/30">
                              Contacted
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {callback.notes}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(callback.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {callback.customers?.phone_e164 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`tel:${callback.customers.phone_e164}`)}
                          >
                            Call Back
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await supabase
                              .from("opportunities")
                              .update({ status: "contacted" })
                              .eq("id", callback.id);
                            refetchCallbacks();
                          }}
                        >
                          Mark Done
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Truck}
                title="No callback requests"
                description="When callers request a callback, they'll appear here for follow-up."
              />
            )
          ) : filteredJobs.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No active jobs"
              description={
                statusFilter !== "all" || priorityFilter !== "all" || searchQuery
                  ? "Try adjusting your filters to see more results."
                  : "When dispatch requests come in, you'll see them here for assignment."
              }
              action={
                statusFilter === "all" && priorityFilter === "all" && !searchQuery
                  ? { label: "Create Job", onClick: () => {} }
                  : undefined
              }
            />
          ) : viewMode === "table" ? (
            <DispatchCommandTable
              jobs={filteredJobs}
              onAssign={handleAssign}
              onUpdateStatus={handleUpdateStatus}
              onCall={handleCall}
              onViewDetails={handleViewDetails}
            />
          ) : (
            <AnimatedList className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredJobs.map((job) => (
                <AnimatedListItem key={job.id}>
                  <DispatchJobCard
                    job={job}
                    onAssign={handleAssign}
                    onUpdateStatus={handleUpdateStatus}
                    onCall={handleCall}
                  />
                </AnimatedListItem>
              ))}
            </AnimatedList>
          )}
        </div>

        {/* Job Details Sheet */}
        <DispatchJobDetailsSheet
          job={selectedJob}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          onAssign={handleAssign}
          onUpdateStatus={handleUpdateStatus}
          onCall={handleCall}
        />

        {/* Assign Job Dialog */}
        <AssignJobDialog
          job={jobToAssign}
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          onAssign={handleAssignSubmit}
          isLoading={updateJobMutation.isPending}
        />
      </PageContainer>
    </TooltipProvider>
  );
}
