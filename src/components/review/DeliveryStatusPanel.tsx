import { useDeliveryAttempts, type EntityType, type DeliveryAttempt } from "@/hooks/useUniversalDelivery";
import { useTriggerDelivery } from "@/hooks/useUniversalDelivery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface DeliveryStatusPanelProps {
  entityType: EntityType;
  entityId: string;
}

export function DeliveryStatusPanel({ entityType, entityId }: DeliveryStatusPanelProps) {
  const attemptsQuery = useDeliveryAttempts(entityType, entityId);
  const triggerDelivery = useTriggerDelivery();

  const attempts = attemptsQuery.data || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Success</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const handleRetry = () => {
    triggerDelivery.mutate({ entityType, entityId });
  };

  if (attemptsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (attempts.length === 0) {
    return null; // Don't show if no attempts
  }

  const hasFailures = attempts.some((a) => a.status === "failed");

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Delivery Status</CardTitle>
          {hasFailures && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetry}
              disabled={triggerDelivery.isPending}
            >
              {triggerDelivery.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-1">Retry</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="py-2">
        <div className="space-y-2">
          {attempts.slice(0, 5).map((attempt) => (
            <div
              key={attempt.id}
              className="flex items-center justify-between text-sm py-2 border-b last:border-0"
            >
              <div className="flex items-center gap-2">
                {getStatusIcon(attempt.status)}
                <span className="capitalize">{attempt.method}</span>
                <span className="text-muted-foreground text-xs">
                  {format(new Date(attempt.created_at), "MMM d, h:mm a")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(attempt.status)}
              </div>
            </div>
          ))}
          {attempts.length > 5 && (
            <div className="text-xs text-muted-foreground text-center pt-2">
              +{attempts.length - 5} more attempts
            </div>
          )}
        </div>
        {hasFailures && attempts.find((a) => a.status === "failed")?.error_message && (
          <div className="mt-3 p-2 bg-destructive/10 rounded text-xs text-destructive">
            {attempts.find((a) => a.status === "failed")?.error_message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}