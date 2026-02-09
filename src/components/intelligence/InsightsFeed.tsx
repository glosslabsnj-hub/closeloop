/**
 * InsightsFeed - Displays actionable insights with severity, deep links, and actions
 */

import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, Info, AlertCircle, ExternalLink, CheckCircle2,
  X, Lightbulb, TrendingDown, Clock, BookOpen, DollarSign, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  useIntelligenceInsights,
  useMarkInsightRead,
  useMarkInsightActioned,
  type IntelligenceInsight,
} from "@/hooks/useIntelligence";

const SEVERITY_STYLES: Record<string, { border: string; bg: string; icon: typeof Info }> = {
  critical: { border: "border-l-red-500", bg: "bg-red-50 dark:bg-red-950/20", icon: AlertCircle },
  warning: { border: "border-l-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", icon: AlertTriangle },
  info: { border: "border-l-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20", icon: Info },
};

const INSIGHT_ICONS: Record<string, typeof Info> = {
  knowledge_gap: BookOpen,
  upsell_opportunity: DollarSign,
  capacity_warning: Clock,
  conversion_drop: TrendingDown,
  time_opportunity: Clock,
  service_recommendation: Lightbulb,
  policy_needed: Shield,
};

function InsightCard({ insight }: { insight: IntelligenceInsight }) {
  const navigate = useNavigate();
  const markRead = useMarkInsightRead();
  const markActioned = useMarkInsightActioned();

  const severity = SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.info;
  const SeverityIcon = severity.icon;
  const TypeIcon = INSIGHT_ICONS[insight.insight_type] || Lightbulb;

  const handleNavigate = () => {
    if (!insight.is_read) markRead.mutate(insight.id);
    if (insight.action_link) {
      navigate(insight.action_link);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    markActioned.mutate(insight.id);
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-l-4 p-4 transition-all",
        severity.border,
        !insight.is_read && severity.bg,
        insight.is_read && "bg-card opacity-80"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <SeverityIcon className={cn(
            "h-4 w-4",
            insight.severity === "critical" && "text-red-600",
            insight.severity === "warning" && "text-amber-600",
            insight.severity === "info" && "text-blue-600",
          )} />
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <h4 className="text-sm font-medium">{insight.title}</h4>
            {!insight.is_read && (
              <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
            )}
          </div>

          <p className="text-xs text-muted-foreground">{insight.description}</p>

          {insight.impact_estimate && (
            <p className="text-xs text-green-700 dark:text-green-400 font-medium">
              {insight.impact_estimate}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            {insight.action_link && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleNavigate}
              >
                {insight.recommended_action || "Fix this"}
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground"
              onClick={handleDismiss}
            >
              <CheckCircle2 className="h-3 w-3" />
              Done
            </Button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface InsightsFeedProps {
  className?: string;
  maxItems?: number;
}

export function InsightsFeed({ className, maxItems = 10 }: InsightsFeedProps) {
  const { data: insights = [], isLoading } = useIntelligenceInsights();

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-lg bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  const visibleInsights = insights.slice(0, maxItems);

  if (visibleInsights.length === 0) {
    return (
      <div className={cn("rounded-lg border bg-card p-6 text-center", className)}>
        <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">No insights yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Your AI will surface patterns and recommendations as it handles more calls.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {visibleInsights.map(insight => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}
