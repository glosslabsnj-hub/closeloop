import { useState } from "react";
import { 
  CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, 
  Calendar, FileSpreadsheet, Webhook, Printer, RefreshCw, 
  ExternalLink, Loader2, MessageSquare
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow, format } from "date-fns";
import type { AutomationRun } from "@/hooks/useIntegrations";

interface AutomationActivityFeedProps {
  runs: AutomationRun[];
  isLoading?: boolean;
  onRetry?: (runId: string) => void;
  onViewDetails?: (runId: string) => void;
}

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  google_calendar: <Calendar className="h-4 w-4" />,
  google_sheets: <FileSpreadsheet className="h-4 w-4" />,
  webhook: <Webhook className="h-4 w-4" />,
  printer: <Printer className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
};

const STATUS_CONFIG = {
  success: {
    icon: <CheckCircle className="h-4 w-4 text-green-500" />,
    badge: "Success",
    badgeClass: "bg-green-500/10 text-green-600 border-green-500/20",
  },
  failed: {
    icon: <XCircle className="h-4 w-4 text-red-500" />,
    badge: "Failed",
    badgeClass: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  running: {
    icon: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
    badge: "Running",
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  pending: {
    icon: <Clock className="h-4 w-4 text-amber-500" />,
    badge: "Pending",
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  skipped: {
    icon: <Clock className="h-4 w-4 text-muted-foreground" />,
    badge: "Skipped",
    badgeClass: "bg-muted text-muted-foreground",
  },
};

interface ActivityItemProps {
  run: AutomationRun;
  onRetry?: (runId: string) => void;
}

function ActivityItem({ run, onRetry }: ActivityItemProps) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = STATUS_CONFIG[run.status] || STATUS_CONFIG.pending;
  const providerIcon = PROVIDER_ICONS[run.rule?.destination_provider || ""] || <Webhook className="h-4 w-4" />;

  const triggerLabel = run.trigger_event
    .replace(".", " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());

  const ruleName = run.rule?.name || triggerLabel;
  const timeAgo = formatDistanceToNow(new Date(run.started_at), { addSuffix: true });

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className={`p-4 transition-colors ${expanded ? "bg-muted/50" : "hover:bg-muted/30"}`}>
        <div className="flex items-start gap-3">
          {/* Status Icon */}
          <div className="pt-0.5 shrink-0">
            {statusConfig.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{ruleName}</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    {providerIcon}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {timeAgo}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={`text-[10px] h-5 ${statusConfig.badgeClass}`}>
                  {statusConfig.badge}
                </Badge>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    {expanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>

            {/* Error message preview */}
            {run.status === "failed" && run.error_message && !expanded && (
              <p className="text-xs text-red-600 mt-1 truncate">
                {run.error_message}
              </p>
            )}
          </div>
        </div>

        {/* Expanded Details */}
        <CollapsibleContent>
          <div className="mt-3 ml-7 space-y-3">
            <Separator />
            
            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Trigger:</span>
                <p className="font-medium">{triggerLabel}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Entity:</span>
                <p className="font-medium">{run.entity_type} / {run.entity_id.slice(0, 8)}...</p>
              </div>
              <div>
                <span className="text-muted-foreground">Started:</span>
                <p className="font-medium">{format(new Date(run.started_at), "MMM d, h:mm a")}</p>
              </div>
              {run.finished_at && (
                <div>
                  <span className="text-muted-foreground">Finished:</span>
                  <p className="font-medium">{format(new Date(run.finished_at), "MMM d, h:mm a")}</p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {run.error_message && (
              <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-900/50">
                <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Error:</p>
                <p className="text-xs font-mono text-red-600 dark:text-red-300">
                  {run.error_message}
                </p>
              </div>
            )}

            {/* Payload Preview */}
            {run.payload_snapshot && Object.keys(run.payload_snapshot).length > 0 && (
              <div className="p-2 bg-muted rounded">
                <p className="text-xs font-medium text-muted-foreground mb-1">Payload:</p>
                <pre className="text-xs font-mono overflow-auto max-h-24">
                  {JSON.stringify(run.payload_snapshot, null, 2)}
                </pre>
              </div>
            )}

            {/* Actions */}
            {run.status === "failed" && onRetry && (
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onRetry(run.id)}>
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function AutomationActivityFeed({ runs, isLoading, onRetry }: AutomationActivityFeedProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!runs || runs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium mb-1">No Activity Yet</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Once you enable automations, each time one runs you'll see it here — successes, failures, and retries.
          </p>
          <p className="text-xs text-muted-foreground">
            Go to the <strong>Automations</strong> tab to enable your first one.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group runs by date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groupedRuns = runs.reduce<Record<string, AutomationRun[]>>((acc, run) => {
    const runDate = new Date(run.started_at);
    let key: string;
    
    if (runDate.toDateString() === today.toDateString()) {
      key = "Today";
    } else if (runDate.toDateString() === yesterday.toDateString()) {
      key = "Yesterday";
    } else {
      key = format(runDate, "MMMM d, yyyy");
    }
    
    if (!acc[key]) acc[key] = [];
    acc[key].push(run);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          Recent Activity
          {runs.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {runs.length} runs
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          {Object.entries(groupedRuns).map(([dateLabel, dateRuns]) => (
            <div key={dateLabel}>
              <div className="sticky top-0 bg-background px-4 py-2 border-b z-10">
                <span className="text-xs font-medium text-muted-foreground">{dateLabel}</span>
              </div>
              <div className="divide-y">
                {dateRuns.map((run) => (
                  <ActivityItem key={run.id} run={run} onRetry={onRetry} />
                ))}
              </div>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
