import { formatDistanceToNow } from "date-fns";
import { CheckCircle, XCircle, Clock, Ban, RefreshCw, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useTenantWorkflowRuns, useRetryWorkflowRun } from "@/hooks/useWorkflowRuns";
import type { WorkflowRunStatus } from "@/types/workflow";

interface WorkflowRunLogCardProps {
  tenantId: string;
  limit?: number;
  showViewAll?: boolean;
}

export function WorkflowRunLogCard({ tenantId, limit = 5, showViewAll = true }: WorkflowRunLogCardProps) {
  const { data: runs, isLoading } = useTenantWorkflowRuns(tenantId, { limit });
  const retryRun = useRetryWorkflowRun();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Workflow Runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!runs || runs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Workflow Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Clock}
            title="No runs yet"
            description="Workflow runs will appear here when events trigger your workflows"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Recent Workflow Runs</CardTitle>
        {showViewAll && (
          <Button variant="ghost" size="sm" asChild>
            <Link to="/app/automations?tab=history">
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {runs.map((run) => (
          <div
            key={run.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <StatusIcon status={run.status} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {run.workflow?.name || "Unknown Workflow"}
                  </span>
                  <StatusBadge status={run.status} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {run.trigger} • {run.entity_type}
                  {run.finished_at && (
                    <span> • {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}</span>
                  )}
                </div>
                {run.error && (
                  <div className="text-xs text-destructive mt-0.5 line-clamp-1">
                    {run.error}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {run.status === "failed" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => retryRun.mutate(run.id)}
                  disabled={retryRun.isPending}
                  title="Retry"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" asChild title="View Details">
                <Link to={`/app/workflows/${run.workflow_id}/runs/${run.id}`}>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function StatusIcon({ status }: { status: WorkflowRunStatus }) {
  switch (status) {
    case "success":
      return <CheckCircle className="h-5 w-5 text-primary shrink-0" />;
    case "failed":
      return <XCircle className="h-5 w-5 text-destructive shrink-0" />;
    case "running":
      return <Clock className="h-5 w-5 text-accent-foreground animate-pulse shrink-0" />;
    case "cancelled":
      return <Ban className="h-5 w-5 text-muted-foreground shrink-0" />;
    default:
      return <Clock className="h-5 w-5 text-muted-foreground shrink-0" />;
  }
}

function StatusBadge({ status }: { status: WorkflowRunStatus }) {
  const variants: Record<WorkflowRunStatus, "default" | "secondary" | "destructive" | "outline"> = {
    success: "default",
    failed: "destructive",
    running: "secondary",
    cancelled: "outline",
  };
  
  return (
    <Badge variant={variants[status] || "secondary"} className="text-[10px] h-4 px-1">
      {status}
    </Badge>
  );
}
