import { Clock, User, Navigation, MapPin, CheckCircle2, AlertTriangle, DollarSign, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface DispatchJob {
  status: string;
  priority: string;
  completed_at?: string | null;
  price_cents?: number | null;
  estimated_duration_minutes?: number | null;
}

interface DispatchCommandStatsProps {
  jobs: DispatchJob[];
}

export function DispatchCommandStats({ jobs }: DispatchCommandStatsProps) {
  const activeStatuses = ["pending", "assigned", "en_route", "on_site"];
  const activeJobs = jobs.filter((j) => activeStatuses.includes(j.status));
  const urgentCount = jobs.filter((j) => j.priority === "urgent" && activeStatuses.includes(j.status)).length;
  
  const completedToday = jobs.filter(
    (j) =>
      j.status === "completed" &&
      j.completed_at &&
      new Date(j.completed_at).toDateString() === new Date().toDateString()
  );
  
  const todayRevenue = completedToday.reduce((sum, j) => sum + (j.price_cents || 0), 0);
  const avgDuration = completedToday.length > 0
    ? Math.round(completedToday.reduce((sum, j) => sum + (j.estimated_duration_minutes || 0), 0) / completedToday.length)
    : 0;

  const statusStats = [
    {
      key: "pending",
      label: "Pending",
      value: jobs.filter((j) => j.status === "pending").length,
      icon: Clock,
      colorClass: "text-warning bg-warning/10 border-warning/30",
      iconColor: "text-warning",
    },
    {
      key: "assigned",
      label: "Assigned",
      value: jobs.filter((j) => j.status === "assigned").length,
      icon: User,
      colorClass: "text-primary bg-primary/10 border-primary/30",
      iconColor: "text-primary",
    },
    {
      key: "en_route",
      label: "En Route",
      value: jobs.filter((j) => j.status === "en_route").length,
      icon: Navigation,
      colorClass: "text-info bg-info/10 border-info/30",
      iconColor: "text-info",
    },
    {
      key: "on_site",
      label: "On Site",
      value: jobs.filter((j) => j.status === "on_site").length,
      icon: MapPin,
      colorClass: "text-success bg-success/10 border-success/30",
      iconColor: "text-success",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Urgent Alert Banner */}
      {urgentCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <div className="p-2 rounded-full bg-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-destructive">
              {urgentCount} Urgent Job{urgentCount > 1 ? "s" : ""} Need Immediate Dispatch
            </p>
            <p className="text-sm text-destructive/80">
              These jobs are marked high priority and awaiting assignment
            </p>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Status Pipeline Stats */}
        {statusStats.map((stat) => (
          <div
            key={stat.key}
            className={cn(
              "relative overflow-hidden rounded-lg border p-4 transition-colors",
              stat.value > 0 ? stat.colorClass : "bg-muted/30 border-border"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={cn("h-5 w-5", stat.value > 0 ? stat.iconColor : "text-muted-foreground")} />
              <span className={cn(
                "text-2xl font-bold tabular-nums",
                stat.value > 0 ? "" : "text-muted-foreground"
              )}>
                {stat.value}
              </span>
            </div>
            <p className={cn(
              "text-xs font-medium uppercase tracking-wide",
              stat.value > 0 ? "" : "text-muted-foreground"
            )}>
              {stat.label}
            </p>
          </div>
        ))}

        {/* Divider on larger screens */}
        <div className="hidden lg:flex items-center justify-center">
          <div className="h-12 w-px bg-border" />
        </div>

        {/* Completed Today */}
        <div className="rounded-lg border bg-success/5 border-success/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <span className="text-2xl font-bold tabular-nums text-success">
              {completedToday.length}
            </span>
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-success/80">
            Completed Today
          </p>
        </div>

        {/* Revenue Today */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            <span className="text-2xl font-bold tabular-nums">
              ${(todayRevenue / 100).toLocaleString()}
            </span>
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Today's Revenue
          </p>
        </div>
      </div>

      {/* Active Jobs Summary Bar */}
      <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-muted/30 border">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm font-medium">{activeJobs.length} Active Jobs</span>
          </div>
          {avgDuration > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Timer className="h-4 w-4" />
              <span>Avg. {avgDuration} min</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Total Jobs Today: {jobs.filter(j => 
            new Date(j.completed_at || '').toDateString() === new Date().toDateString() ||
            activeStatuses.includes(j.status)
          ).length}</span>
        </div>
      </div>
    </div>
  );
}
