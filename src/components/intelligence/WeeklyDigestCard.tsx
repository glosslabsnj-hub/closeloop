/**
 * WeeklyDigestCard - Shows the latest weekly intelligence digest
 */

import { Calendar, TrendingUp, Lightbulb, BarChart3, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLatestDigest } from "@/hooks/useIntelligence";

interface WeeklyDigestCardProps {
  className?: string;
}

export function WeeklyDigestCard({ className }: WeeklyDigestCardProps) {
  const { data: digest, isLoading } = useLatestDigest();

  if (isLoading) {
    return (
      <div className={cn("rounded-lg border bg-card p-4", className)}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-20 bg-muted/50 rounded" />
        </div>
      </div>
    );
  }

  if (!digest) {
    return (
      <div className={cn("rounded-lg border bg-card p-6 text-center", className)}>
        <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">No weekly digest yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Your first weekly summary will be generated after enough call data is collected.
        </p>
      </div>
    );
  }

  const m = digest.metrics_json;
  const periodLabel = `${new Date(digest.period_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(digest.period_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <div className={cn("rounded-lg border bg-card overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Weekly Summary</h3>
          </div>
          <span className="text-xs text-muted-foreground">{periodLabel}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Key metrics row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold tabular-nums">{m.total_calls}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Calls</p>
          </div>
          <div>
            <p className={cn(
              "text-lg font-bold tabular-nums",
              m.conversion_rate >= 50 ? "text-green-600" : m.conversion_rate < 30 ? "text-red-500" : ""
            )}>
              {m.conversion_rate}%
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Converted</p>
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">{Math.round(m.avg_duration_seconds / 60)}m</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Length</p>
          </div>
        </div>

        {/* Highlights */}
        {digest.highlights_json.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Key Findings</span>
            </div>
            {digest.highlights_json.slice(0, 3).map((h, i) => (
              <p key={i} className="text-xs text-muted-foreground pl-5">
                {h.description}
              </p>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {digest.recommendations_json.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-medium">Recommendations</span>
            </div>
            {digest.recommendations_json.slice(0, 3).map((r, i) => (
              <p key={i} className="text-xs text-muted-foreground pl-5">
                <span className="font-medium text-foreground">{r.title}:</span>{" "}
                {r.action}
              </p>
            ))}
          </div>
        )}

        {/* Bottom stats */}
        <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
          {digest.patterns_discovered > 0 && (
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {digest.patterns_discovered} patterns found
            </span>
          )}
          {digest.gaps_identified > 0 && (
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {digest.gaps_identified} insights generated
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
