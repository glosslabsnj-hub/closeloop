import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, Clock, Ban, SkipForward, RefreshCw, AlertTriangle, FlaskConical } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useWorkflowRunDetails, useCancelWorkflowRun, useRetryWorkflowRun } from "@/hooks/useWorkflowRuns";
import { TRIGGER_METADATA, NODE_TYPE_METADATA, type WorkflowRunStepStatus } from "@/types/workflow";
import { useAuth } from "@/contexts/AuthContext";

export default function WorkflowRunDetailPage() {
  const { id, runId } = useParams<{ id: string; runId: string }>();
  const { data: run, isLoading } = useWorkflowRunDetails(runId ?? null);
  const cancelRun = useCancelWorkflowRun();
  const retryRun = useRetryWorkflowRun();
  const { isSuperAdmin } = useAuth();
  
  const isDryRun = (run?.context as any)?.is_dry_run === true;

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="container py-6">
        <p>Run not found</p>
      </div>
    );
  }

  const workflow = run.workflow;
  const triggerMeta = workflow ? TRIGGER_METADATA[workflow.trigger] : null;

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/app/workflows/${id}/runs`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Run Details</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {triggerMeta && <span>{triggerMeta.icon}</span>}
              <span>{workflow?.name || "Workflow"}</span>
              <span>·</span>
              <span>{run.entity_type} #{run.entity_id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {run.status === "failed" && (
            <Button
              variant="outline"
              onClick={() => retryRun.mutate(run.id)}
              disabled={retryRun.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${retryRun.isPending ? "animate-spin" : ""}`} />
              Retry Run
            </Button>
          )}
          {run.status === "running" && (
            <Button
              variant="outline"
              onClick={() => cancelRun.mutate(run.id)}
              disabled={cancelRun.isPending}
            >
              <Ban className="h-4 w-4 mr-2" />
              Cancel Run
            </Button>
          )}
        </div>
      </div>

      {/* Dry Run Banner */}
      {isDryRun && (
        <Alert>
          <FlaskConical className="h-4 w-4" />
          <AlertTitle>Dry Run Mode</AlertTitle>
          <AlertDescription>
            This was a simulation. No webhooks were sent, no SMS/email delivered, no database changes made.
          </AlertDescription>
        </Alert>
      )}

      {/* Run Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RunStatusIcon status={run.status} />
            Run Status: {run.status}
            {isDryRun && <Badge variant="outline" className="ml-2">Dry Run</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Started</div>
              <div className="font-medium">
                {format(new Date(run.started_at), "MMM d, yyyy h:mm a")}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Finished</div>
              <div className="font-medium">
                {run.finished_at
                  ? format(new Date(run.finished_at), "MMM d, yyyy h:mm a")
                  : "In progress..."}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Duration</div>
              <div className="font-medium">
                {run.finished_at
                  ? formatDuration(run.started_at, run.finished_at)
                  : "Running..."}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Steps</div>
              <div className="font-medium">{run.steps?.length || 0}</div>
            </div>
          </div>
          
          {run.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Execution Failed</AlertTitle>
              <AlertDescription>
                {run.error}
                {isSuperAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => retryRun.mutate(run.id)}
                    disabled={retryRun.isPending}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${retryRun.isPending ? "animate-spin" : ""}`} />
                    Retry Now
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Execution Steps</CardTitle>
          <CardDescription>Each action executed during this run</CardDescription>
        </CardHeader>
        <CardContent>
          {!run.steps || run.steps.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No steps recorded</p>
          ) : (
            <div className="space-y-4">
              {run.steps.map((step, index) => {
                const nodeMeta = NODE_TYPE_METADATA[step.node_type];
                return (
                  <div key={step.id} className="relative">
                    {index < run.steps.length - 1 && (
                      <div className="absolute left-[22px] top-12 bottom-0 w-px bg-border" />
                    )}
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-11 h-11 rounded-full bg-muted flex items-center justify-center">
                        <StepStatusIcon status={step.status as WorkflowRunStepStatus} />
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{nodeMeta?.icon}</span>
                          <span className="font-medium">{nodeMeta?.label || step.node_type}</span>
                          <Badge variant={getStepBadgeVariant(step.status as WorkflowRunStepStatus)}>
                            {step.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {format(new Date(step.started_at), "h:mm:ss a")}
                          {step.finished_at && (
                            <span className="ml-2">
                              · {formatDuration(step.started_at, step.finished_at)}
                            </span>
                          )}
                        </div>
                        {step.error && (
                          <div className="text-sm text-destructive mt-2">{step.error}</div>
                        )}
                        {step.output && Object.keys(step.output).length > 0 && (
                          <div className="mt-2 p-3 rounded bg-muted text-xs font-mono overflow-x-auto">
                            <pre>{JSON.stringify(step.output, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Context */}
      {run.context && Object.keys(run.context).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Runtime Context</CardTitle>
            <CardDescription>Variables available during execution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-3 rounded bg-muted text-xs font-mono overflow-x-auto">
              <pre>{JSON.stringify(run.context, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RunStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "success":
      return <CheckCircle className="h-6 w-6 text-green-600" />;
    case "failed":
      return <XCircle className="h-6 w-6 text-red-600" />;
    case "running":
      return <Clock className="h-6 w-6 text-blue-600 animate-pulse" />;
    case "cancelled":
      return <Ban className="h-6 w-6 text-muted-foreground" />;
    default:
      return <Clock className="h-6 w-6 text-muted-foreground" />;
  }
}

function StepStatusIcon({ status }: { status: WorkflowRunStepStatus }) {
  switch (status) {
    case "success":
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case "failed":
      return <XCircle className="h-5 w-5 text-red-600" />;
    case "running":
      return <Clock className="h-5 w-5 text-blue-600 animate-pulse" />;
    case "skipped":
      return <SkipForward className="h-5 w-5 text-muted-foreground" />;
    default:
      return <Clock className="h-5 w-5 text-muted-foreground" />;
  }
}

function getStepBadgeVariant(status: WorkflowRunStepStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "success": return "default";
    case "failed": return "destructive";
    case "running": return "secondary";
    case "skipped": return "outline";
    default: return "secondary";
  }
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60000)}m`;
}
