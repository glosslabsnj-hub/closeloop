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
  en_route_at: string | null;
  on_site_at: string | null;
  estimated_arrival_at: string | null;
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
      const now = new Date().toISOString();
      const updates: Record<string, unknown> = { status };
      
      if (status === "en_route") {
        updates.dispatched_at = now;
        updates.en_route_at = now;
        
        // Calculate estimated arrival if we have pickup coordinates
        // Fetch job to get pickup location for ETA calculation
        const { data: job } = await supabase
          .from("dispatch_jobs")
          .select("pickup_lat, pickup_lng, tenant_id")
          .eq("id", jobId)
          .single();
        
        if (job?.pickup_lat && job?.pickup_lng) {
          // Call check-service-area to get drive time estimate
          try {
            const { data: etaData } = await supabase.functions.invoke("elevenlabs-check-service-area", {
              body: {
                tenant_id: job.tenant_id,
                address: "", // Not needed for ETA calc
                pickup_lat: job.pickup_lat,
                pickup_lng: job.pickup_lng,
              },
            });
            
            if (etaData?.eta_minutes) {
              const etaTime = new Date(Date.now() + etaData.eta_minutes * 60000);
              updates.estimated_arrival_at = etaTime.toISOString();
            }
          } catch (e) {
            // ETA calculation is best-effort; failure is expected when location unavailable
          }
        }
      } else if (status === "on_site") {
        updates.arrived_at = now;
        updates.on_site_at = now;
      } else if (status === "completed") {
        updates.completed_at = now;
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
