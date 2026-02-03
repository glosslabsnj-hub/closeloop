import { useAuth } from "@/contexts/AuthContext";
import { useAIReadinessV2, formatReadinessFlag } from "@/hooks/useAIReadinessV2";
import { SectionCard } from "@/components/layout/SectionCard";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Rocket,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Go Live Checklist - Uses V2 readiness system with RPC-based scoring
 * Shows P0 blockers with deep links to fix them
 */
export function GoLiveChecklist() {
  const { assistantSettings } = useAuth();
  const {
    score,
    p0Flags,
    p1Flags,
    recommendations,
    canGoLive,
    isReady,
    loading
  } = useAIReadinessV2();

  const goLiveEnabled = assistantSettings?.go_live_enabled || false;

  // Already live - show success state
  if (goLiveEnabled) {
    return (
      <SectionCard
        variant="elevated"
        className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent"
      >
        <div className="flex items-center gap-4 p-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Rocket className="h-6 w-6 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold flex items-center gap-2">
              You're Live!
              <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">
                Active
              </Badge>
            </h3>
            <p className="text-sm text-muted-foreground">
              AI answering calls 24/7 • {score}% readiness
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link to="/app/calls">
              View Calls
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </SectionCard>
    );
  }

  if (loading) {
    return (
      <SectionCard>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          <span className="ml-3 text-sm text-muted-foreground">Checking readiness...</span>
        </div>
      </SectionCard>
    );
  }

  const getScoreColor = () => {
    if (score >= 85) return "text-emerald-500";
    if (score >= 70) return "text-amber-500";
    if (score >= 50) return "text-orange-500";
    return "text-rose-500";
  };

  const getProgressColor = () => {
    if (score >= 85) return "[&>div]:bg-emerald-500";
    if (score >= 70) return "[&>div]:bg-amber-500";
    if (score >= 50) return "[&>div]:bg-orange-500";
    return "[&>div]:bg-rose-500";
  };

  return (
    <SectionCard
      variant="elevated"
      className={score >= 85 && p0Flags.length === 0 ? "border-emerald-500/30" : ""}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 p-5 pb-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              Go Live Checklist
              {canGoLive && (
                <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                  Ready
                </Badge>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">
              {canGoLive
                ? "All requirements met"
                : `${p0Flags.length} issue${p0Flags.length !== 1 ? 's' : ''} to fix`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${getScoreColor()}`}>{score}%</div>
          <div className="text-xs text-muted-foreground">readiness</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-5 pb-4">
        <Progress value={score} className={`h-2 ${getProgressColor()}`} />
      </div>

      <Separator />

      {/* Checklist Items */}
      <div className="p-5 space-y-3">
        {/* P0 Issues - Must Fix */}
        {p0Flags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-rose-500" />
              <span className="text-sm font-medium text-rose-600 dark:text-rose-400">
                Must Fix ({p0Flags.length})
              </span>
            </div>
            {p0Flags.map((flag) => {
              const rec = recommendations.find(r =>
                r.label.toLowerCase().includes(flag.replace(/_/g, " ").split("_")[0]) ||
                flag.includes(r.label.toLowerCase().replace(/\s+/g, "_"))
              );
              return (
                <Link
                  key={flag}
                  to={rec?.deep_link || "/app/settings"}
                  className="flex items-center justify-between p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 hover:bg-rose-500/10 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {formatReadinessFlag(flag)}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                </Link>
              );
            })}
          </div>
        )}

        {/* P1 Issues - Recommended (show max 3) */}
        {p0Flags.length === 0 && p1Flags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Recommended ({p1Flags.length})
              </span>
            </div>
            {p1Flags.slice(0, 3).map((flag) => {
              const rec = recommendations.find(r =>
                r.label.toLowerCase().includes(flag.replace(/_/g, " ").split("_")[0]) ||
                flag.includes(r.label.toLowerCase().replace(/\s+/g, "_"))
              );
              return (
                <Link
                  key={flag}
                  to={rec?.deep_link || "/app/settings"}
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="text-sm truncate">{formatReadinessFlag(flag)}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                </Link>
              );
            })}
          </div>
        )}

        {/* All Good State */}
        {p0Flags.length === 0 && p1Flags.length === 0 && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            <div className="flex-1">
              <p className="font-medium text-emerald-600 dark:text-emerald-400">
                All requirements met!
              </p>
              <p className="text-sm text-muted-foreground">
                You're ready to go live with your AI assistant.
              </p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <Button
            className={`w-full gap-2 ${!canGoLive && 'opacity-50 cursor-not-allowed'}`}
            variant={canGoLive ? "default" : "secondary"}
            disabled={!canGoLive}
            asChild={canGoLive}
          >
            {canGoLive ? (
              <Link to="/app/go-live">
                <Rocket className="h-4 w-4" />
                Go Live Now
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Link>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Complete {p0Flags.length} Step{p0Flags.length !== 1 ? 's' : ''} to Go Live
              </>
            )}
          </Button>
          {!canGoLive && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Score must be 85%+ with no blocking issues
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
