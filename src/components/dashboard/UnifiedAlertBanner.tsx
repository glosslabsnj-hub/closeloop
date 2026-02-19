import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import { useKnowledgeConflicts } from "@/hooks/useKnowledgeConflicts";
import { useKnowledgeUploads } from "@/hooks/useKnowledgeUploads";
import { useUsage } from "@/hooks/useUsage";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileWarning,
  Upload,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: "critical" | "warning" | "info";
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  actionLabel?: string;
  actionLink?: string;
  count?: number;
}

/**
 * UnifiedAlertBanner consolidates multiple dashboard alerts into a single expandable panel.
 * Priority order: Usage (billing) > Knowledge Conflicts > Readiness > Uploads
 */
export function UnifiedAlertBanner() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { tenant } = useAuth();

  // Gather alerts from various sources (V2 readiness — V1 was deprecated)
  const { score: readinessScore, p0Flags } = useAIReadinessV2();
  const { conflicts } = useKnowledgeConflicts();
  const { uploads, processingCount } = useKnowledgeUploads();
  
  // Pending uploads are those still processing or uploading
  const pendingUploads = uploads.filter(u => u.status === "processing" || u.status === "uploading");

  // Usage tracking
  const { planSku, hasVoice, hasSms } = useSubscription(tenant?.id || null);
  const { usage } = useUsage(tenant?.id || null, planSku);

  const alerts: Alert[] = [];

  // 1. Usage alert (highest priority - billing impact)
  const usagePercent = Math.max(usage?.voicePercentUsed || 0, usage?.smsPercentUsed || 0);
  const isNearLimit = usagePercent >= 80;

  if (isNearLimit) {
    alerts.push({
      id: "usage",
      type: usagePercent >= 95 ? "critical" : "warning",
      icon: CreditCard,
      title: usagePercent >= 95 ? "Usage limit almost reached" : "Approaching usage limit",
      description: `You've used ${usagePercent}% of your monthly allowance. ${usagePercent >= 95 ? "Calls may be limited soon." : "Consider upgrading your plan."}`,
      actionLabel: "Manage Plan",
      actionLink: "/app/go-live",
    });
  }

  // 2. Knowledge conflicts (data integrity)
  if (conflicts && conflicts.length > 0) {
    alerts.push({
      id: "conflicts",
      type: "warning",
      icon: FileWarning,
      title: "Knowledge conflicts detected",
      description: `${conflicts.length} piece${conflicts.length > 1 ? "s" : ""} of conflicting information need your review.`,
      actionLabel: "Resolve Conflicts",
      actionLink: "/app/business-brain#conflicts",
      count: conflicts.length,
    });
  }

  // 3. AI Readiness — handled inline in AgentControlPanel, skip here

  // 4. Pending uploads (lowest priority)
  if (pendingUploads && pendingUploads.length > 0) {
    alerts.push({
      id: "uploads",
      type: "info",
      icon: Upload,
      title: "Knowledge uploads pending review",
      description: `${pendingUploads.length} upload${pendingUploads.length > 1 ? "s" : ""} ready for your approval.`,
      actionLabel: "Review Uploads",
      actionLink: "/app/business-brain#uploads",
      count: pendingUploads.length,
    });
  }

  // Don't render if no alerts
  if (alerts.length === 0) {
    return null;
  }

  const primaryAlert = alerts[0];
  const secondaryAlerts = alerts.slice(1);
  const hasCritical = alerts.some((a) => a.type === "critical");

  const PrimaryIcon = primaryAlert.icon;

  return (
    <Card
      className={cn(
        "border-l-4",
        hasCritical
          ? "border-l-destructive bg-destructive/5"
          : primaryAlert.type === "warning"
            ? "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
            : "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardContent className="p-4">
          {/* Primary Alert */}
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full shrink-0",
                hasCritical
                  ? "bg-destructive/10 text-destructive"
                  : primaryAlert.type === "warning"
                    ? "bg-amber-500/10 text-amber-600"
                    : "bg-blue-500/10 text-blue-600"
              )}
            >
              <PrimaryIcon className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">{primaryAlert.title}</p>
                {alerts.length > 1 && (
                  <Badge variant="secondary" className="text-xs">
                    +{alerts.length - 1} more
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{primaryAlert.description}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {primaryAlert.actionLink && (
                <Button asChild size="sm" variant={hasCritical ? "destructive" : "outline"}>
                  <Link to={primaryAlert.actionLink}>
                    {primaryAlert.actionLabel}
                    <ExternalLink className="ml-1.5 h-3 w-3" />
                  </Link>
                </Button>
              )}

              {secondaryAlerts.length > 0 && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
          </div>

          {/* Secondary Alerts (collapsible) */}
          <CollapsibleContent>
            {secondaryAlerts.length > 0 && (
              <div className="mt-4 pt-4 border-t space-y-3">
                {secondaryAlerts.map((alert) => {
                  const AlertIcon = alert.icon;
                  return (
                    <div key={alert.id} className="flex items-center gap-3">
                      <AlertIcon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          alert.type === "critical"
                            ? "text-destructive"
                            : alert.type === "warning"
                              ? "text-amber-600"
                              : "text-blue-600"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
                      </div>
                      {alert.actionLink && (
                        <Button asChild size="sm" variant="ghost" className="shrink-0">
                          <Link to={alert.actionLink}>{alert.actionLabel}</Link>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
