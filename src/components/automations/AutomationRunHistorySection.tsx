import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, XCircle, Clock, RefreshCw, ChevronRight, ChevronDown, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAutomationRuns, useAutomationRunSteps, type AutomationRun } from "@/hooks/useIntegrations";

interface AutomationRunHistorySectionProps {
  tenantId: string;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "success":
      return <CheckCircle className="h-4 w-4 text-primary" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "running":
      return <Clock className="h-4 w-4 text-accent-foreground animate-pulse" />;
    case "pending":
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    default:
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    success: "default",
    failed: "destructive",
    running: "secondary",
    pending: "outline",
    skipped: "outline",
  };

  return (
    <Badge variant={variants[status] || "secondary"} className="text-[10px] h-5 px-1.5">
      {status}
    </Badge>
  );
}

function RunDetails({ run }: { run: AutomationRun }) {
  const { data: steps, isLoading } = useAutomationRunSteps(run.id);

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 bg-muted/50 border-t">
      {/* Payload preview */}
      {run.payload_snapshot && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Payload</p>
          <pre className="text-xs bg-background p-2 rounded border overflow-x-auto max-h-32">
            {JSON.stringify(run.payload_snapshot, null, 2)}
          </pre>
        </div>
      )}

      {/* Steps */}
      {steps && steps.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Steps</p>
          <div className="space-y-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className="flex items-center justify-between p-2 bg-background rounded border text-sm"
              >
                <div className="flex items-center gap-2">
                  <StatusIcon status={step.status} />
                  <span>{step.action_type}</span>
                  {step.destination_provider && (
                    <Badge variant="outline" className="text-[10px]">
                      {step.destination_provider}
                    </Badge>
                  )}
                </div>
                <StatusBadge status={step.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error message */}
      {run.error_message && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-destructive">Error</p>
          <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
            {run.error_message}
          </p>
        </div>
      )}
    </div>
  );
}

export function AutomationRunHistorySection({ tenantId }: AutomationRunHistorySectionProps) {
  const { data: runs, isLoading, refetch } = useAutomationRuns(tenantId, 25);
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());

  const toggleExpanded = (runId: string) => {
    setExpandedRuns((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!runs || runs.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Run History</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Clock}
            title="No runs yet"
            description="Automation runs will appear here when events trigger your automations"
          />
        </CardContent>
      </Card>
    );
  }

  // Stats
  const successCount = runs.filter((r) => r.status === "success").length;
  const failedCount = runs.filter((r) => r.status === "failed").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Run History</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {successCount} successful, {failedCount} failed
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 p-0">
        {runs.map((run) => {
          const isExpanded = expandedRuns.has(run.id);

          return (
            <Collapsible key={run.id} open={isExpanded} onOpenChange={() => toggleExpanded(run.id)}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={run.status} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {run.rule?.name || run.trigger_event}
                        </span>
                        <StatusBadge status={run.status} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {run.trigger_event} • {run.entity_type}
                        {run.finished_at && (
                          <span> • {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <RunDetails run={run} />
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
