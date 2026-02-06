import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface DriverJob {
  id: string;
  job_number: string | null;
  status: string;
  priority: string;
  customer_name: string | null;
  customer_phone: string | null;
  pickup_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  job_type: string | null;
  description: string | null;
  notes: string | null;
  price_cents: number | null;
  estimated_duration_minutes: number | null;
  assigned_crew: string | null;
  assigned_vehicle: string | null;
  driver_id: string | null;
  vehicle_id: string | null;
  created_at: string;
  dispatched_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
  tenant_id: string;
}

export function useDriverJobs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // First get the driver record for this user
  const { data: driverRecord } = useQuery({
    queryKey: ["fleet-driver-me", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("fleet_drivers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Then get jobs assigned to this driver
  const { data: jobs, isLoading, error, refetch } = useQuery({
    queryKey: ["driver-jobs", driverRecord?.id],
    queryFn: async () => {
      if (!driverRecord?.id) return [];
      
      const { data, error } = await supabase
        .from("dispatch_jobs")
        .select("*")
        .eq("driver_id", driverRecord.id)
        .in("status", ["assigned", "en_route", "on_site", "completed"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DriverJob[];
    },
    enabled: !!driverRecord?.id,
  });

  const updateJobStatus = useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      
      if (status === "en_route") {
        updates.dispatched_at = new Date().toISOString();
      } else if (status === "on_site") {
        updates.arrived_at = new Date().toISOString();
      } else if (status === "completed") {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("dispatch_jobs")
        .update(updates)
        .eq("id", jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-jobs"] });
      toast({ title: "Job status updated" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const activeJobs = jobs?.filter(j => ["assigned", "en_route", "on_site"].includes(j.status)) || [];
  const completedJobs = jobs?.filter(j => j.status === "completed") || [];

  return {
    driverRecord,
    jobs: jobs || [],
    activeJobs,
    completedJobs,
    isLoading,
    error,
    refetch,
    updateJobStatus,
  };
}
