import { Link } from "react-router-dom";
import { GitBranch, CheckCircle2, XCircle, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkflowStats, useRecentWorkflowRuns } from "@/hooks/useWorkflowRuns";
import { useAuth } from "@/contexts/AuthContext";
import { TRIGGER_METADATA } from "@/types/workflow";
import { formatDistanceToNow } from "date-fns";

export function WorkflowActivityCard() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id ?? null;
  
  const { data: stats } = useWorkflowStats(tenantId);
  const { data: recentRuns } = useRecentWorkflowRuns(tenantId, 5);

  const successRate = stats?.total_runs 
    ? Math.round((stats.successful_runs / stats.total_runs) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          Workflow Activity
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/workflows">
            View All
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{stats?.active_workflows || 0}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-primary">{stats?.successful_runs || 0}</p>
            <p className="text-xs text-muted-foreground">Succeeded</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-destructive">{stats?.failed_runs || 0}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
        </div>

        {/* Recent Runs */}
        {recentRuns && recentRuns.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Recent Activity
            </p>
            {recentRuns.map((run) => {
              const triggerMeta = TRIGGER_METADATA[run.trigger as keyof typeof TRIGGER_METADATA];
              return (
                <Link
                  key={run.id}
                  to={`/app/workflow-runs/${run.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {run.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    ) : run.status === "failed" ? (
                      <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground animate-pulse flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {triggerMeta?.icon} {triggerMeta?.label || run.trigger}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={run.status === "success" ? "default" : run.status === "failed" ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {run.status}
                  </Badge>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <p>No workflow runs yet.</p>
            <p className="text-xs mt-1">Activate a workflow to see activity here.</p>
          </div>
        )}

        {/* Success Rate Bar */}
        {stats?.total_runs && stats.total_runs > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Success Rate</span>
              <span className="font-medium">{successRate}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
