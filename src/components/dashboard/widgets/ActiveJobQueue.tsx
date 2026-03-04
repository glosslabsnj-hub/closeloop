import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, AlertTriangle, MapPin } from "lucide-react";
import { useDispatchDashboard } from "@/hooks/useDispatchDashboard";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  assigned: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  en_route: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  on_site: "bg-violet-500/10 text-violet-600 border-violet-500/30",
};

export function ActiveJobQueue() {
  const { data, isLoading } = useDispatchDashboard();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-5 w-40" />
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.activeJobs.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Truck className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No active dispatch jobs</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Truck className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">Active Jobs</p>
          <div className="flex gap-1.5 ml-auto">
            {data.urgentCount > 0 && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="h-3 w-3" />
                {data.urgentCount} urgent
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {data.activeJobs.length} active
            </Badge>
          </div>
        </div>
        <div className="space-y-2">
          {data.activeJobs.map((job) => {
            const isUrgent = job.priority === "urgent" || job.priority === "high";
            return (
              <div
                key={job.id}
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  isUrgent && "border-destructive/50 bg-destructive/5"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {job.customer_name || "Unknown"}
                    </p>
                    {job.pickup_address && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                        <p className="text-xs text-muted-foreground truncate">{job.pickup_address}</p>
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className={cn("text-xs shrink-0", statusColors[job.status] || "")}>
                    {job.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
