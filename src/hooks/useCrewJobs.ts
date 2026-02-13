import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";
import { startOfDay, endOfDay } from "date-fns";
import type { ActiveJob, JobStatus } from "./useActiveJobs";

/**
 * Hook for crew members / technicians to view their assigned jobs.
 * Looks up the current user's fleet_drivers record, then queries
 * active_jobs where metadata_json->>'assigned_to' matches their driver ID.
 */
export function useCrewJobs() {
  const { user, tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Resolve current user's fleet_drivers record
  const driverQuery = useQuery({
    queryKey: ["my-driver-record", tenant?.id, user?.id],
    queryFn: async () => {
      if (!tenant?.id || !user?.id) return null;
      const { data, error } = await supabase
        .from("fleet_drivers")
        .select("id, full_name, status")
        .eq("tenant_id", tenant.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id && !!user?.id,
  });

  const driverId = driverQuery.data?.id ?? null;

  // Fetch jobs assigned to this driver
  const jobsQuery = useQuery({
    queryKey: ["crew-jobs", tenant?.id, driverId],
    queryFn: async () => {
      if (!tenant?.id || !driverId) return [];

      const { data, error } = await (supabase as any)
        .from("active_jobs")
        .select("*, job_service_items(*)")
        .eq("tenant_id", tenant.id)
        .filter("metadata_json->>assigned_to", "eq", driverId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as ActiveJob[];
    },
    enabled: !!tenant?.id && !!driverId,
  });

  // Update job status from crew view
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crew-jobs", tenant?.id, driverId] });
      queryClient.invalidateQueries({ queryKey: ["active-jobs", tenant?.id] });
      toast({ title: "Job updated" });
    },
    onError: () => {
      toast({ title: "Failed to update job", variant: "destructive" });
    },
  });

  // Update service item status
  const updateServiceItem = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pending" | "in_progress" | "completed" | "skipped" }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "completed") updates.completed_at = new Date().toISOString();
      if (status === "in_progress") updates.started_at = new Date().toISOString();

      const { data, error } = await (supabase as any)
        .from("job_service_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crew-jobs", tenant?.id, driverId] });
      queryClient.invalidateQueries({ queryKey: ["active-jobs", tenant?.id] });
    },
    onError: () => {
      toast({ title: "Failed to update item", variant: "destructive" });
    },
  });

  // Categorize jobs
  const categorized = useMemo(() => {
    const all = jobsQuery.data ?? [];
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const todayJobs = all.filter((j) => {
      const created = new Date(j.created_at);
      return j.is_active && created >= todayStart && created <= todayEnd;
    });

    const activeJobs = all.filter((j) => j.is_active && j.status !== "cancelled");
    const completedJobs = all.filter((j) => j.status === "completed" || j.status === "picked_up");

    return { todayJobs, activeJobs, completedJobs };
  }, [jobsQuery.data]);

  return {
    driver: driverQuery.data,
    isDriver: !!driverQuery.data,
    isLoading: driverQuery.isLoading || jobsQuery.isLoading,
    jobs: jobsQuery.data ?? [],
    todayJobs: categorized.todayJobs,
    activeJobs: categorized.activeJobs,
    completedJobs: categorized.completedJobs,
    updateJobStatus,
    updateServiceItem,
  };
}
