import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Truck, AlertTriangle, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DispatchJobCard } from "@/components/dispatch/DispatchJobCard";
import { DispatchJobsTable } from "@/components/dispatch/DispatchJobsTable";
import { DispatchQueueStats } from "@/components/dispatch/DispatchQueueStats";
import { DispatchFilters } from "@/components/dispatch/DispatchFilters";
import { EmptyState } from "@/components/ui/empty-state";

export default function DispatchPage() {
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["dispatch_queue"]);
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

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
    mutationFn: async ({ jobId, updates }: { jobId: string; updates: Record<string, unknown> }) => {
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

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];

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
        const address = job.pickup_address?.toLowerCase() || "";
        const jobNumber = job.job_number?.toLowerCase() || "";
        const jobType = job.job_type?.toLowerCase() || "";
        return (
          customerName.includes(query) ||
          address.includes(query) ||
          jobNumber.includes(query) ||
          jobType.includes(query)
        );
      }

      return true;
    });
  }, [jobs, statusFilter, priorityFilter, searchQuery]);

  const urgentJobs = jobs?.filter(
    (j) => j.priority === "urgent" && activeStatuses.includes(j.status)
  ) || [];

  const handleAssign = (job: NonNullable<typeof jobs>[0]) => {
    // TODO: Open assign dialog
  };

  const handleUpdateStatus = (job: NonNullable<typeof jobs>[0], newStatus: string) => {
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "completed") {
      updates.completed_at = new Date().toISOString();
    }
    updateJobMutation.mutate({ jobId: job.id, updates });
  };

  const handleCall = (job: NonNullable<typeof jobs>[0]) => {
    if (job.customer_phone) {
      window.open(`tel:${job.customer_phone}`);
    }
  };

  const handleViewDetails = (job: NonNullable<typeof jobs>[0]) => {
    // TODO: Open details sheet
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
    <PageContainer maxWidth="full">
      <div className="space-y-6">
        <PageHeader
          icon={<Truck className="h-5 w-5" />}
          title="Dispatch Queue"
          description={`${filteredJobs.length} ${statusFilter === "active" ? "active" : ""} jobs`}
          action={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Button>
          }
        />

        {/* Urgent Alert */}
        {urgentJobs.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="font-medium text-destructive text-sm">
                    {urgentJobs.length} Urgent Job{urgentJobs.length > 1 ? "s" : ""} Require
                    Immediate Attention
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <DispatchQueueStats jobs={jobs || []} />

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
        />

        {/* Jobs List */}
        {filteredJobs.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No dispatch jobs"
            description={
              statusFilter !== "all" || priorityFilter !== "all" || searchQuery
                ? "Try adjusting your filters to see more results."
                : "When your AI creates dispatch requests, they'll appear here for assignment."
            }
            action={
              statusFilter === "all" && priorityFilter === "all" && !searchQuery
                ? { label: "Create Job", onClick: () => {} }
                : undefined
            }
          />
        ) : viewMode === "table" ? (
          <DispatchJobsTable
            jobs={filteredJobs}
            onAssign={handleAssign}
            onUpdateStatus={handleUpdateStatus}
            onCall={handleCall}
            onViewDetails={handleViewDetails}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredJobs.map((job) => (
              <DispatchJobCard
                key={job.id}
                job={job}
                onAssign={handleAssign}
                onUpdateStatus={handleUpdateStatus}
                onCall={handleCall}
              />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
