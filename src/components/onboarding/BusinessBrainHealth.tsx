import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Brain, CheckCircle2, AlertCircle, XCircle, ChevronRight } from "lucide-react";

interface BusinessBrainHealthProps {
  /** Show compact version with minimal details */
  compact?: boolean;
  /** Show action buttons like "Go Live" */
  showActions?: boolean;
}

/**
 * Business Brain Health Panel
 *
 * Displays AI readiness score (0-100) with actionable recommendations.
 * Uses the existing useAIReadinessV2 hook to fetch readiness data.
 *
 * Supports two modes:
 * - Full: Complete panel with score, progress bar, recommendations list
 * - Compact: Minimal inline display for headers/dashboards
 */
export function BusinessBrainHealth({ compact = false, showActions = false }: BusinessBrainHealthProps) {
  const {
    score,
    p0Flags,
    p1Flags,
    recommendations,
    canGoLive,
    isReady,
    loading
  } = useAIReadinessV2();

  if (loading) {
    if (compact) {
      return (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <Skeleton className="h-5 w-5 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-1.5 w-full" />
          </div>
        </div>
      );
    }

    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Compact mode - minimal inline display
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
        <Brain className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">AI Readiness</span>
            <Badge variant="outline" className="text-xs">
              {score}%
            </Badge>
          </div>
          <Progress value={score} className="h-1.5" />
        </div>
        {recommendations.length > 0 && (
          <Badge variant="secondary" className="shrink-0">
            {recommendations.length} left
          </Badge>
        )}
      </div>
    );
  }

  // Full mode - complete panel
  const statusMessage = canGoLive
    ? "Your AI is ready to go live!"
    : isReady
    ? "Almost there! Complete a few more items to go live."
    : `${recommendations.length} ${recommendations.length === 1 ? 'item' : 'items'} to complete`;

  const statusVariant = canGoLive ? "default" : isReady ? "secondary" : "outline";
  const statusIcon = canGoLive ? CheckCircle2 : AlertCircle;
  const StatusIcon = statusIcon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-primary" />
            <CardTitle>Business Brain Health</CardTitle>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{score}%</div>
            <Badge variant={statusVariant} className="mt-1">
              {canGoLive ? "Ready" : isReady ? "Almost Ready" : "In Progress"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={score} className="h-2" />

        {/* Status message */}
        <div
          className={`flex items-center gap-2 p-3 rounded-lg ${
            canGoLive
              ? "text-emerald-400 bg-emerald-500/10"
              : "text-amber-400 bg-amber-500/10"
          }`}
        >
          <StatusIcon className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">
            {statusMessage}
          </span>
        </div>

        {/* Recommendations list */}
        {recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Action Items
            </h4>
            {recommendations.map((rec, i) => {
              // Determine if this is P0 (critical) or P1 (recommended)
              const isP0 = p0Flags.some(flag => rec.label.toLowerCase().includes(flag.replace(/_/g, ' ')));

              // Deep-link safety: normalize path and check validity
              const hasValidLink = rec.deep_link && typeof rec.deep_link === 'string' && rec.deep_link.trim().length > 0;
              const normalizedLink = hasValidLink
                ? rec.deep_link.startsWith('/') ? rec.deep_link : `/${rec.deep_link}`
                : '';

              const content = (
                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <XCircle
                      className={`h-4 w-4 shrink-0 ${
                        isP0 ? 'text-rose-400' : 'text-amber-400'
                      }`}
                    />
                    <div>
                      <span className="text-sm">{rec.label}</span>
                      {isP0 && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                  </div>
                  {hasValidLink && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>
              );

              // If no valid link, render as plain div
              if (!hasValidLink) {
                return <div key={i}>{content}</div>;
              }

              // Otherwise render as Link with normalized path
              return (
                <Link key={i} to={normalizedLink}>
                  {content}
                </Link>
              );
            })}
          </div>
        )}

        {/* Completed items indicator */}
        {score > 0 && recommendations.length === 0 && (
          <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-3 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">
              All setup items completed!
            </span>
          </div>
        )}

        {/* Action button */}
        {showActions && canGoLive && (
          <Button className="w-full" asChild>
            <Link to="/app/go-live">Review & Go Live</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
