import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Clock, AlertTriangle, Zap } from "lucide-react";
import type { ActiveJob } from "@/hooks/useActiveJobs";
import type { JobLabels } from "@/hooks/useJobLabels";

interface JobCardProps {
  job: ActiveJob;
  labels: JobLabels;
  onClick: (job: ActiveJob) => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  intake: { label: "Intake", variant: "outline" },
  in_progress: { label: "In Progress", variant: "default" },
  on_hold: { label: "On Hold", variant: "secondary" },
  completed: { label: "Completed", variant: "default" },
  picked_up: { label: "Picked Up", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const PRIORITY_CONFIG: Record<string, { icon: typeof Clock; className: string }> = {
  normal: { icon: Clock, className: "" },
  rush: { icon: Zap, className: "text-amber-500" },
  urgent: { icon: AlertTriangle, className: "text-red-500" },
};

function getTimeElapsed(created: string): string {
  const diff = Date.now() - new Date(created).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function JobCard({ job, labels, onClick }: JobCardProps) {
  const items = job.job_service_items || [];
  const completedCount = items.filter((i) => i.status === "completed").length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const statusCfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.intake;
  const priorityCfg = PRIORITY_CONFIG[job.priority] || PRIORITY_CONFIG.normal;
  const PriorityIcon = priorityCfg.icon;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick(job)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">{job.job_number}</span>
              {job.priority !== "normal" && (
                <PriorityIcon className={cn("h-3.5 w-3.5", priorityCfg.className)} />
              )}
            </div>
            <p className="font-medium text-sm mt-0.5 truncate">{job.title}</p>
          </div>
          <Badge variant={statusCfg.variant} className="text-xs shrink-0">
            {statusCfg.label}
          </Badge>
        </div>

        {/* Source badge */}
        {job.intake_method === "tekmetric" && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 w-fit border-primary/30 text-primary">
            Tekmetric
          </Badge>
        )}

        {/* Customer */}
        {job.customer_name && (
          <p className="text-xs text-muted-foreground truncate">
            {job.customer_name}
            {job.customer_phone && ` \u00b7 ${job.customer_phone}`}
          </p>
        )}

        {/* Progress */}
        {totalCount > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {completedCount}/{totalCount} {labels.serviceSteps.toLowerCase()}
              </span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{getTimeElapsed(job.created_at)} ago</span>
          {job.estimated_completion && (
            <span>
              Est. {new Date(job.estimated_completion).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
