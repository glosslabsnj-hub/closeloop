/**
 * PatternsList - Shows detected business patterns with dismiss functionality
 */

import {
  Clock, TrendingUp, MessageCircle, BarChart3, Gauge, DollarSign, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useBusinessPatterns, useDismissPattern, type BusinessPattern } from "@/hooks/useIntelligence";

const PATTERN_TYPE_ICONS: Record<string, typeof Clock> = {
  time_pattern: Clock,
  service_trend: TrendingUp,
  objection_pattern: MessageCircle,
  conversion_pattern: BarChart3,
  capacity_pattern: Gauge,
  upsell_opportunity: DollarSign,
};

const PATTERN_TYPE_LABELS: Record<string, string> = {
  time_pattern: "Time Pattern",
  service_trend: "Service Trend",
  objection_pattern: "Objection Pattern",
  conversion_pattern: "Conversion",
  capacity_pattern: "Capacity",
  upsell_opportunity: "Upsell",
};

function PatternCard({ pattern }: { pattern: BusinessPattern }) {
  const dismissPattern = useDismissPattern();
  const Icon = PATTERN_TYPE_ICONS[pattern.pattern_type] || BarChart3;
  const label = PATTERN_TYPE_LABELS[pattern.pattern_type] || pattern.pattern_type;

  const confidencePct = Math.round(pattern.confidence_score * 100);

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {label}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {confidencePct}% confidence
          </span>
        </div>
        <p className="text-sm">{pattern.description}</p>
        {pattern.suggested_action && (
          <p className="text-xs text-primary">{pattern.suggested_action}</p>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => dismissPattern.mutate(pattern.id)}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

interface PatternsListProps {
  className?: string;
  maxItems?: number;
}

export function PatternsList({ className, maxItems = 10 }: PatternsListProps) {
  const { data: patterns = [], isLoading } = useBusinessPatterns();

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-lg bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  const actionablePatterns = patterns
    .filter(p => p.is_actionable && p.confidence_score >= 0.6)
    .slice(0, maxItems);

  if (actionablePatterns.length === 0) {
    return (
      <div className={cn("rounded-lg border bg-card p-6 text-center", className)}>
        <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">No patterns detected yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Patterns will appear here as your AI handles more calls and detects trends.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {actionablePatterns.map(pattern => (
        <PatternCard key={pattern.id} pattern={pattern} />
      ))}
    </div>
  );
}
