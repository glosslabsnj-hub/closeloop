import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAIReadiness } from "@/hooks/useAIReadiness";
import { useKnowledgeConflicts } from "@/hooks/useKnowledgeConflicts";
import { useKnowledgeUploads } from "@/hooks/useKnowledgeUploads";
import { useUsage } from "@/hooks/useUsage";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  FileWarning,
  Brain,
  Upload,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Alert {
  id: string;
  type: "critical" | "warning" | "info";
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
  actionLink: string;
  count?: number;
}

/**
 * AlertBanner — Single priority-ordered alert strip.
 * Shows the highest-priority system alert with expandable secondary alerts.
 * Priority: Usage limit > Knowledge conflicts > AI readiness > Pending uploads.
 * Renders nothing when there are no alerts (zero height).
 */
export function AlertBanner() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { tenant } = useAuth();

  const { items: readinessItems, score: readinessScore } = useAIReadiness();
  const { conflicts } = useKnowledgeConflicts();
  const { uploads } = useKnowledgeUploads();
  const pendingUploads = uploads.filter(
    (u) => u.status === "processing" || u.status === "uploading"
  );

  const { planSku } = useSubscription(tenant?.id || null);
  const { usage } = useUsage(tenant?.id || null, planSku);

  const alerts: Alert[] = [];

  // 1. Usage alert (billing impact — highest priority)
  const usagePercent = Math.max(
    usage?.voicePercentUsed || 0,
    usage?.smsPercentUsed || 0
  );
  if (usagePercent >= 80) {
    alerts.push({
      id: "usage",
      type: usagePercent >= 95 ? "critical" : "warning",
      icon: CreditCard,
      title:
        usagePercent >= 95
          ? "Usage limit almost reached"
          : "Approaching usage limit",
      description: `${usagePercent}% of your monthly allowance used.`,
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
      description: `${conflicts.length} conflicting item${conflicts.length > 1 ? "s" : ""} need review.`,
      actionLabel: "Resolve",
      actionLink: "/app/business-brain#conflicts",
      count: conflicts.length,
    });
  }

  // 3. AI Readiness (setup completeness)
  const criticalItems =
    readinessItems?.filter((item) => !item.complete && item.weight >= 15) || [];
  if (criticalItems.length > 0 && readinessScore < 85) {
    alerts.push({
      id: "readiness",
      type: readinessScore < 60 ? "critical" : "warning",
      icon: Brain,
      title: "AI setup incomplete",
      description: `${criticalItems.length} important item${criticalItems.length > 1 ? "s" : ""} need attention.`,
      actionLabel: "Fix Issues",
      actionLink: "/app/business-brain",
      count: criticalItems.length,
    });
  }

  // 4. Pending uploads (lowest priority)
  if (pendingUploads.length > 0) {
    alerts.push({
      id: "uploads",
      type: "info",
      icon: Upload,
      title: "Uploads pending review",
      description: `${pendingUploads.length} upload${pendingUploads.length > 1 ? "s" : ""} ready for approval.`,
      actionLabel: "Review",
      actionLink: "/app/business-brain#uploads",
      count: pendingUploads.length,
    });
  }

  if (alerts.length === 0) return null;

  const primary = alerts[0];
  const secondary = alerts.slice(1);
  const hasCritical = alerts.some((a) => a.type === "critical");
  const PrimaryIcon = primary.icon;

  const borderColor = hasCritical
    ? "border-l-destructive bg-destructive/5"
    : primary.type === "warning"
      ? "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
      : "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20";

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className={cn("rounded-lg border-l-4 px-4 py-3", borderColor)}>
        {/* Primary alert */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full shrink-0",
              hasCritical
                ? "bg-destructive/10 text-destructive"
                : primary.type === "warning"
                  ? "bg-amber-500/10 text-amber-600"
                  : "bg-blue-500/10 text-blue-600"
            )}
          >
            <PrimaryIcon className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{primary.title}</p>
              {secondary.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  +{secondary.length} more
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {primary.description}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              asChild
              size="sm"
              variant={hasCritical ? "destructive" : "outline"}
              className="h-7 text-xs"
            >
              <Link to={primary.actionLink}>
                {primary.actionLabel}
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </Button>
            {secondary.length > 0 && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
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

        {/* Secondary alerts (collapsible) */}
        <CollapsibleContent>
          {secondary.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
              {secondary.map((alert) => {
                const Icon = alert.icon;
                return (
                  <div key={alert.id} className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        alert.type === "critical"
                          ? "text-destructive"
                          : alert.type === "warning"
                            ? "text-amber-600"
                            : "text-blue-600"
                      )}
                    />
                    <p className="text-sm flex-1 min-w-0 truncate">
                      {alert.title}
                    </p>
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs shrink-0"
                    >
                      <Link to={alert.actionLink}>{alert.actionLabel}</Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
