/**
 * useDispatchMutations — extracted CRUD mutations for dispatch_jobs.
 *
 * Replaces inline mutations scattered across DispatchPage.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function useDispatchMutations() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["dispatch-jobs", tenant?.id] });
    queryClient.invalidateQueries({ queryKey: ["dispatch-dashboard", tenant?.id] });
  };

  /** Generic update — used by other convenience mutations */
  const updateJob = useMutation({
    mutationFn: async ({ jobId, updates }: { jobId: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("dispatch_jobs")
        .update(updates)
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Job updated" });
    },
    onError: (error) => {
      toast({ title: "Failed to update job", description: String(error), variant: "destructive" });
    },
  });

  /** Update job status with auto-timestamps */
  const updateStatus = useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "completed") updates.completed_at = new Date().toISOString();
      if (status === "on_site") updates.arrived_at = new Date().toISOString();
      if (status === "en_route") updates.dispatched_at = updates.dispatched_at || new Date().toISOString();
      const { error } = await supabase
        .from("dispatch_jobs")
        .update(updates)
        .eq("id", jobId);
      if (error) throw error;

      // Trigger workflow for completed jobs
      if (status === "completed" && tenant?.id) {
        supabase.functions.invoke("trigger-workflow", {
          body: {
            tenant_id: tenant.id,
            trigger: "dispatch_job.completed",
            entity_type: "dispatch_job",
            entity_id: jobId,
          },
        }).catch((err) => console.error("trigger-workflow error:", err));
      }
    },
    onSuccess: (_, { status }) => {
      invalidate();
      const label = STATUS_LABELS[status] || status;
      toast({ title: `Job ${label.toLowerCase()}` });
    },
    onError: (error) => {
      toast({ title: "Failed to update status", description: String(error), variant: "destructive" });
    },
  });

  /** Assign a job to a driver/vehicle */
  const assignJob = useMutation({
    mutationFn: async ({
      jobId,
      crew,
      vehicle,
      driverId,
      vehicleId,
    }: {
      jobId: string;
      crew?: string;
      vehicle?: string;
      driverId?: string;
      vehicleId?: string;
    }) => {
      const updates: Record<string, unknown> = {
        status: "assigned",
        assigned_crew: crew || null,
        assigned_vehicle: vehicle || null,
        driver_id: driverId || null,
        vehicle_id: vehicleId || null,
        dispatched_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("dispatch_jobs")
        .update(updates)
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Job assigned" });
    },
    onError: (error) => {
      toast({ title: "Failed to assign job", description: String(error), variant: "destructive" });
    },
  });

  /** Cancel a dispatch job */
  const cancelJob = useMutation({
    mutationFn: async ({ jobId, reason }: { jobId: string; reason?: string }) => {
      const updates: Record<string, unknown> = {
        status: "cancelled",
        completed_at: new Date().toISOString(),
      };
      if (reason) updates.notes = reason;
      const { error } = await supabase
        .from("dispatch_jobs")
        .update(updates)
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Job cancelled" });
    },
    onError: (error) => {
      toast({ title: "Failed to cancel job", description: String(error), variant: "destructive" });
    },
  });

  /** Create a new dispatch job */
  const createJob = useMutation({
    mutationFn: async (data: {
      customer_name: string;
      customer_phone?: string;
      pickup_address?: string;
      dropoff_address?: string;
      job_type?: string;
      priority?: string;
      description?: string;
      notes?: string;
      price_cents?: number;
    }) => {
      if (!tenant?.id) throw new Error("No tenant");
      const jobNum = `JOB-${Date.now().toString(36).toUpperCase()}`;
      const { data: job, error } = await (supabase as any)
        .from("dispatch_jobs")
        .insert({
          tenant_id: tenant.id,
          job_number: jobNum,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone || null,
          pickup_address: data.pickup_address || null,
          dropoff_address: data.dropoff_address || null,
          job_type: data.job_type || null,
          priority: data.priority || "normal",
          description: data.description || null,
          notes: data.notes || null,
          price_cents: data.price_cents || null,
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      return job;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Job created" });
    },
    onError: (error) => {
      toast({ title: "Failed to create job", description: String(error), variant: "destructive" });
    },
  });

  /** Mark a job as paid */
  const markPaid = useMutation({
    mutationFn: async ({ jobId, paymentMethod }: { jobId: string; paymentMethod?: string }) => {
      // dispatch_jobs has no payment_status/payment_method columns yet;
      // mark the job as completed to indicate it's been paid.
      const { error } = await supabase
        .from("dispatch_jobs")
        .update({ status: "completed" as any, completed_at: new Date().toISOString() })
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Marked as paid" });
    },
    onError: (error) => {
      toast({ title: "Failed to mark as paid", description: String(error), variant: "destructive" });
    },
  });

  return {
    updateJob,
    updateStatus,
    assignJob,
    cancelJob,
    createJob,
    markPaid,
  };
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  assigned: "Assigned",
  en_route: "En Route",
  on_site: "On Site",
  completed: "Completed",
  cancelled: "Cancelled",
};
