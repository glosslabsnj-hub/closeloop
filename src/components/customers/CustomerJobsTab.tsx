import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface CustomerJobsTabProps {
  customerId: string;
}

const statusColors: Record<string, string> = {
  intake: "bg-blue-500/10 text-blue-700",
  in_progress: "bg-amber-500/10 text-amber-700",
  on_hold: "bg-orange-500/10 text-orange-700",
  completed: "bg-emerald-500/10 text-emerald-700",
  picked_up: "bg-primary/10 text-primary",
  cancelled: "bg-red-500/10 text-red-700",
};

export function CustomerJobsTab({ customerId }: CustomerJobsTabProps) {
  const { tenant } = useAuth();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["customer-jobs", tenant?.id, customerId],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await (supabase as any)
        .from("active_jobs")
        .select("id, job_number, title, status, priority, created_at, actual_completion, job_service_items(id, title, status)")
        .eq("tenant_id", tenant.id)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenant?.id && !!customerId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No jobs yet</p>;
  }

  return (
    <div className="space-y-3">
      {jobs.map((job: any) => {
        const items = job.job_service_items || [];
        const completedItems = items.filter((i: any) => i.status === "completed").length;
        return (
          <div key={job.id} className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">{job.job_number}</span>
                <span className="text-sm font-medium">{job.title}</span>
              </div>
              <Badge className={statusColors[job.status] || "bg-muted"}>
                {job.status?.replace("_", " ")}
              </Badge>
            </div>
            {items.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {completedItems}/{items.length} steps completed
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
            </p>
          </div>
        );
      })}
    </div>
  );
}
