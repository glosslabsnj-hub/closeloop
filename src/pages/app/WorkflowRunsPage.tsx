import { useParams, Link } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, Clock, Ban } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useWorkflow } from "@/hooks/useWorkflows";
import { useWorkflowRuns, useRetryWorkflowRun } from "@/hooks/useWorkflowRuns";
import { TRIGGER_METADATA, type WorkflowRunStatus } from "@/types/workflow";

export default function WorkflowRunsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: workflow, isLoading: loadingWorkflow } = useWorkflow(id ?? null);
  const { data: runs, isLoading: loadingRuns, refetch } = useWorkflowRuns(id ?? null, { limit: 25 });
  const retryRun = useRetryWorkflowRun();

  const isLoading = loadingWorkflow || loadingRuns;

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="container py-6">
        <p>Workflow not found</p>
      </div>
    );
  }

  const triggerMeta = TRIGGER_METADATA[workflow.trigger];

  return (
    <ErrorBoundary context="loading workflow history">
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/app/workflows/${id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Run History</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{triggerMeta?.icon}</span>
              <span>{workflow.name}</span>
            </div>
          </div>
        </div>
        
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Runs List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Runs</CardTitle>
          <CardDescription>Execution history for this workflow</CardDescription>
        </CardHeader>
        <CardContent>
          {!runs || runs.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No runs yet"
              description="This workflow hasn't been triggered yet"
            />
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <RunStatusIcon status={run.status} />
                    <div>
                      <div className="font-medium">
                        {run.entity_type} #{run.entity_id.slice(0, 8)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                        {run.finished_at && (
                          <span className="ml-2">
                            · Duration: {formatDuration(run.started_at, run.finished_at)}
                          </span>
                        )}
                      </div>
                      {run.error && (
                        <div className="text-sm text-destructive mt-1">
                          {run.error.slice(0, 100)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <RunStatusBadge status={run.status} />
                    {run.status === "failed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => retryRun.mutate(run.id)}
                        disabled={retryRun.isPending}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Retry
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/app/workflows/${id}/runs/${run.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </ErrorBoundary>
  );
}

function RunStatusIcon({ status }: { status: WorkflowRunStatus }) {
  switch (status) {
    case "success":
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case "failed":
      return <XCircle className="h-5 w-5 text-red-600" />;
    case "running":
      return <Clock className="h-5 w-5 text-blue-600 animate-pulse" />;
    case "cancelled":
      return <Ban className="h-5 w-5 text-muted-foreground" />;
    default:
      return <Clock className="h-5 w-5 text-muted-foreground" />;
  }
}

function RunStatusBadge({ status }: { status: WorkflowRunStatus }) {
  const variants: Record<WorkflowRunStatus, "default" | "secondary" | "destructive" | "outline"> = {
    success: "default",
    failed: "destructive",
    running: "secondary",
    cancelled: "outline",
  };
  
  return (
    <Badge variant={variants[status] || "secondary"}>
      {status}
    </Badge>
  );
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60000)}m`;
}
