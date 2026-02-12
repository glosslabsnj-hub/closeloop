import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";

export type JobStatus = "intake" | "in_progress" | "on_hold" | "completed" | "picked_up" | "cancelled";
export type JobPriority = "normal" | "rush" | "urgent";

export interface JobServiceItem {
  id: string;
  job_id: string;
  tenant_id: string;
  service_id: string | null;
  title: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  sort_order: number;
  assigned_to: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface ActiveJob {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  location_id: string | null;
  job_number: string;
  title: string;
  status: JobStatus;
  priority: JobPriority;
  notes: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  metadata_json: Record<string, unknown>;
  estimated_completion: string | null;
  actual_completion: string | null;
  intake_method: string;
  source_session_id: string | null;
  notify_on_step_complete: boolean;
  notify_on_all_complete: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  job_service_items: JobServiceItem[];
}

export type JobFilter = {
  status?: JobStatus | "all";
  priority?: JobPriority | "all";
  search?: string;
};

export function useActiveJobs() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<JobFilter>({ status: "all", priority: "all", search: "" });

  const jobsQuery = useQuery({
    queryKey: ["active-jobs", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const { data, error } = await (supabase as any)
        .from("active_jobs")
        .select("*, job_service_items(*)")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as ActiveJob[];
    },
    enabled: !!tenant?.id,
  });

  // Realtime subscription
  useEffect(() => {
    if (!tenant?.id) return;

    const channel = supabase
      .channel(`active-jobs-realtime-${tenant.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "active_jobs",
          filter: `tenant_id=eq.${tenant.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["active-jobs", tenant.id] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_service_items",
          filter: `tenant_id=eq.${tenant.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["active-jobs", tenant.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, queryClient]);

  const createJob = useMutation({
    mutationFn: async (input: {
      title: string;
      customer_name?: string;
      customer_phone?: string;
      customer_id?: string;
      priority?: JobPriority;
      notes?: string;
      estimated_completion?: string;
      metadata_json?: Record<string, unknown>;
      intake_method?: string;
      services?: { title: string; service_id?: string }[];
    }) => {
      if (!tenant?.id) throw new Error("No tenant");

      // Generate job number
      const { data: jobNumData, error: jobNumError } = await (supabase as any)
        .rpc("generate_job_number", { p_tenant_id: tenant.id });
      if (jobNumError) throw jobNumError;

      const jobNumber = jobNumData as unknown as string;

      const { data: job, error: jobError } = await (supabase as any)
        .from("active_jobs")
        .insert({
          tenant_id: tenant.id,
          job_number: jobNumber,
          title: input.title,
          customer_name: input.customer_name || null,
          customer_phone: input.customer_phone || null,
          customer_id: input.customer_id || null,
          priority: input.priority || "normal",
          notes: input.notes || null,
          estimated_completion: input.estimated_completion || null,
          metadata_json: input.metadata_json || {},
          intake_method: input.intake_method || "manual",
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Create service items if provided
      if (input.services && input.services.length > 0) {
        const items = input.services.map((s, i) => ({
          job_id: job.id,
          tenant_id: tenant.id,
          title: s.title,
          service_id: s.service_id || null,
          sort_order: i,
          status: "pending" as const,
        }));

        const { error: itemsError } = await (supabase as any)
          .from("job_service_items")
          .insert(items);
        if (itemsError) throw itemsError;
      }

      return job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-jobs", tenant?.id] });
      toast({ title: "Job created", description: "New job has been added." });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Try again?", variant: "destructive" });
    },
  });

  const updateJob = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ActiveJob> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("active_jobs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-jobs", tenant?.id] });
      toast({ title: "Job updated", description: "Changes saved." });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Try again?", variant: "destructive" });
    },
  });

  const updateJobStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: JobStatus }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "completed") {
        updates.actual_completion = new Date().toISOString();
      }
      if (status === "cancelled" || status === "picked_up") {
        updates.is_active = false;
      }

      const { data, error } = await (supabase as any)
        .from("active_jobs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["active-jobs", tenant?.id] });
      toast({ title: "Status updated", description: `Job moved to ${vars.status.replace("_", " ")}.` });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Try again?", variant: "destructive" });
    },
  });

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    let jobs = jobsQuery.data ?? [];

    if (filter.status && filter.status !== "all") {
      jobs = jobs.filter((j) => j.status === filter.status);
    }
    if (filter.priority && filter.priority !== "all") {
      jobs = jobs.filter((j) => j.priority === filter.priority);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.job_number.toLowerCase().includes(q) ||
          j.customer_name?.toLowerCase().includes(q) ||
          j.customer_phone?.includes(q)
      );
    }

    return jobs;
  }, [jobsQuery.data, filter]);

  const stats = useMemo(() => {
    const all = jobsQuery.data ?? [];
    return {
      activeCount: all.filter((j) => j.is_active && j.status !== "cancelled").length,
      inProgressCount: all.filter((j) => j.status === "in_progress").length,
      rushCount: all.filter((j) => j.is_active && (j.priority === "rush" || j.priority === "urgent")).length,
      completedCount: all.filter((j) => j.status === "completed" || j.status === "picked_up").length,
    };
  }, [jobsQuery.data]);

  return {
    jobs: filteredJobs,
    allJobs: jobsQuery.data ?? [],
    isLoading: jobsQuery.isLoading,
    error: jobsQuery.error,
    stats,
    filter,
    setFilter,
    createJob,
    updateJob,
    updateJobStatus,
    refetch: jobsQuery.refetch,
  };
}
