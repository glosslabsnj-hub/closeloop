import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay } from "date-fns";

interface DispatchJob {
  id: string;
  status: string;
  priority: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
  estimated_arrival_at: string | null;
}

interface DispatchDashboardData {
  activeJobs: DispatchJob[];
  urgentCount: number;
  pendingCount: number;
  assignedCount: number;
  inProgressCount: number;
  completedTodayCount: number;
}

export function useDispatchDashboard(): {
  data: DispatchDashboardData | null;
  isLoading: boolean;
} {
  const { tenant } = useAuth();

  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["dispatch-dashboard", tenant?.id, todayStart],
    queryFn: async () => {
      if (!tenant?.id) return null;

      // Fetch active jobs (not completed or cancelled)
      const { data: jobs, error } = await supabase
        .from("dispatch_jobs")
        .select("id, status, priority, pickup_address, dropoff_address, customer_name, customer_phone, created_at, estimated_arrival_at")
        .eq("tenant_id", tenant.id)
        .in("status", ["pending", "assigned", "en_route", "on_site"])
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch completed today count
      const { count: completedCount } = await supabase
        .from("dispatch_jobs")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("status", "completed")
        .gte("updated_at", todayStart)
        .lte("updated_at", todayEnd);

      const activeJobs = (jobs || []) as DispatchJob[];

      return {
        activeJobs: activeJobs.slice(0, 6),
        urgentCount: activeJobs.filter(j => j.priority === "urgent" || j.priority === "high").length,
        pendingCount: activeJobs.filter(j => j.status === "pending").length,
        assignedCount: activeJobs.filter(j => j.status === "assigned").length,
        inProgressCount: activeJobs.filter(j => j.status === "en_route" || j.status === "on_site").length,
        completedTodayCount: completedCount || 0,
      };
    },
    enabled: !!tenant?.id,
    refetchInterval: 30000, // Refresh every 30 seconds for live updates
  });

  return { data: data ?? null, isLoading };
}
