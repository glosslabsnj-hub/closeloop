import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DispatchJob {
  status: string;
  priority: string;
  completed_at?: string | null;
}

interface DispatchCommandStatsProps {
  jobs: DispatchJob[];
  onStatusClick?: (status: string) => void;
}

const STATUS_DOTS: { key: string; label: string; color: string }[] = [
  { key: "pending", label: "Pending", color: "bg-destructive" },
  { key: "en_route", label: "En Route", color: "bg-warning" },
  { key: "on_site", label: "On Site", color: "bg-success" },
];

export function DispatchCommandStats({ jobs, onStatusClick }: DispatchCommandStatsProps) {
  const activeStatuses = ["pending", "assigned", "en_route", "on_site"];
  const emergencyCount = jobs.filter(
    (j) => j.priority === "emergency" && activeStatuses.includes(j.status)
  ).length;
  const urgentCount = jobs.filter(
    (j) => (j.priority === "urgent" || j.priority === "emergency") && activeStatuses.includes(j.status)
  ).length;

  const completedToday = jobs.filter(
    (j) =>
      j.status === "completed" &&
      j.completed_at &&
      new Date(j.completed_at).toDateString() === new Date().toDateString()
  ).length;

  const counts: Record<string, number> = {
    pending: jobs.filter((j) => j.status === "pending").length,
    en_route: jobs.filter((j) => j.status === "en_route").length,
    on_site: jobs.filter((j) => j.status === "on_site").length,
  };

  return (
    <div className="space-y-3">
      {/* Emergency banner (highest priority) */}
      {emergencyCount > 0 && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-destructive border border-destructive animate-pulse">
          <AlertTriangle className="h-4 w-4 text-destructive-foreground shrink-0" />
          <p className="text-sm font-bold text-destructive-foreground">
            {emergencyCount} EMERGENCY job{emergencyCount > 1 ? "s" : ""} — dispatch immediately
          </p>
        </div>
      )}
      {/* Urgent banner (urgent but not emergency) */}
      {urgentCount > emergencyCount && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/30">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm font-medium text-destructive">
            {urgentCount - emergencyCount} urgent job{urgentCount - emergencyCount > 1 ? "s" : ""} need immediate dispatch
          </p>
        </div>
      )}

      {/* Compact stats bar */}
      <div className="flex items-center flex-wrap gap-x-5 gap-y-2 text-sm">
        {STATUS_DOTS.map((stat) => (
          <button
            key={stat.key}
            type="button"
            onClick={() => onStatusClick?.(stat.key)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className={cn("h-2 w-2 rounded-full shrink-0", stat.color)} />
            <span className="font-medium tabular-nums">{counts[stat.key]}</span>
            <span className="text-muted-foreground">{stat.label}</span>
          </button>
        ))}

        <div className="h-4 w-px bg-border/50" />

        <button
          type="button"
          onClick={() => onStatusClick?.("completed")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="text-muted-foreground">✓</span>
          <span className="font-medium tabular-nums">{completedToday}</span>
          <span className="text-muted-foreground">Completed Today</span>
        </button>
      </div>
    </div>
  );
}
