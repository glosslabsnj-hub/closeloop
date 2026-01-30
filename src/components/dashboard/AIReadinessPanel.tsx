import { Link } from "react-router-dom";
import { useAIReadinessV2, formatReadinessFlag, type ReadinessRecommendation } from "@/hooks/useAIReadinessV2";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight,
  Sparkles,
  XCircle,
  Info,
  Loader2
} from "lucide-react";

interface AIReadinessPanelProps {
  /** Compact mode for dashboard banner */
  compact?: boolean;
  /** Show even when ready */
  alwaysShow?: boolean;
}

/**
 * AI Readiness Panel - Shows readiness score, P0/P1 issues, and fix links
 * Used on /app/go-live (full) and /app/dashboard (compact banner)
 */
export function AIReadinessPanel({ compact = false, alwaysShow = false }: AIReadinessPanelProps) {
  const { 
    score, 
    p0Flags, 
    p1Flags, 
    recommendations, 
    canGoLive, 
    isReady, 
    loading,
    businessMode 
  } = useAIReadinessV2();
  
  // Don't show if ready and not forced
  if (!alwaysShow && isReady && p0Flags.length === 0) {
    return null;
  }
  
  if (loading) {
    return compact ? null : (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Calculating readiness...</span>
        </CardContent>
      </Card>
    );
  }
  
  const getScoreColor = () => {
    if (score >= 85) return "text-emerald-500";
    if (score >= 70) return "text-amber-500";
    if (score >= 50) return "text-orange-500";
    return "text-rose-500";
  };
  
  const getScoreBg = () => {
    if (score >= 85) return "bg-emerald-500/10 border-emerald-500/30";
    if (score >= 70) return "bg-amber-500/10 border-amber-500/30";
    if (score >= 50) return "bg-orange-500/10 border-orange-500/30";
    return "bg-rose-500/10 border-rose-500/30";
  };
  
  const getProgressColor = () => {
    if (score >= 85) return "[&>div]:bg-emerald-500";
    if (score >= 70) return "[&>div]:bg-amber-500";
    if (score >= 50) return "[&>div]:bg-orange-500";
    return "[&>div]:bg-rose-500";
  };

  // Compact banner for dashboard
  if (compact) {
    return (
      <Card className={`border ${getScoreBg()}`}>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Score Badge */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">AI Readiness</span>
                  <Badge variant="outline" className={getScoreColor()}>
                    {score}%
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={score} className={`w-24 h-1.5 ${getProgressColor()}`} />
                  <span className="text-xs text-muted-foreground">
                    {score >= 85 ? "Ready to go live" : "Need 85% to go live"}
                  </span>
                </div>
              </div>
            </div>
            
            {/* P0 Issues Preview */}
            {p0Flags.length > 0 && (
              <div className="flex-1 flex flex-wrap gap-2">
                {p0Flags.slice(0, 3).map(flag => (
                  <div 
                    key={flag}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  >
                    <XCircle className="h-3 w-3" />
                    <span>{formatReadinessFlag(flag)}</span>
                  </div>
                ))}
                {p0Flags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{p0Flags.length - 3} more
                  </Badge>
                )}
              </div>
            )}
            
            {/* Action Button */}
            <Button size="sm" className="gap-1 shrink-0" asChild>
              <Link to="/app/go-live">
                <Sparkles className="h-3.5 w-3.5" />
                {canGoLive ? "Go Live" : "Fix Issues"}
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full panel for go-live page
  return (
    <Card className={`border ${getScoreBg()}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Readiness Score</CardTitle>
              <CardDescription>
                {businessMode.charAt(0).toUpperCase() + businessMode.slice(1)} mode requirements
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${getScoreColor()}`}>{score}%</div>
            <div className="text-sm text-muted-foreground">
              {canGoLive ? "Ready to go live!" : "Need 85% + no blockers"}
            </div>
          </div>
        </div>
        <Progress value={score} className={`mt-4 h-3 ${getProgressColor()}`} />
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* P0 Issues - Must Fix */}
        {p0Flags.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-rose-500" />
              <h4 className="font-medium text-rose-600 dark:text-rose-400">
                Must Fix to Go Live ({p0Flags.length})
              </h4>
            </div>
            <div className="space-y-2">
              {p0Flags.map(flag => {
                const rec = recommendations.find(r => 
                  r.label.toLowerCase().includes(flag.replace(/_/g, " ").split("_")[0])
                );
                return (
                  <div 
                    key={flag}
                    className="flex items-center justify-between p-3 rounded-lg bg-rose-500/5 border border-rose-500/20"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-500" />
                      <span className="text-sm font-medium">{formatReadinessFlag(flag)}</span>
                    </div>
                    {rec && (
                      <Button size="sm" variant="outline" className="text-xs h-7" asChild>
                        <Link to={rec.deep_link}>
                          Fix Now
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {p0Flags.length > 0 && p1Flags.length > 0 && <Separator />}
        
        {/* P1 Issues - Recommended */}
        {p1Flags.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-500" />
              <h4 className="font-medium text-amber-600 dark:text-amber-400">
                Recommended Improvements ({p1Flags.length})
              </h4>
            </div>
            <div className="space-y-2">
              {p1Flags.map(flag => {
                const rec = recommendations.find(r => 
                  r.label.toLowerCase().includes(flag.replace(/_/g, " ").split("_")[0])
                );
                return (
                  <div 
                    key={flag}
                    className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/20"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">{formatReadinessFlag(flag)}</span>
                    </div>
                    {rec && (
                      <Button size="sm" variant="ghost" className="text-xs h-7" asChild>
                        <Link to={rec.deep_link}>
                          Improve
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* All Good State */}
        {p0Flags.length === 0 && p1Flags.length === 0 && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            <div>
              <p className="font-medium text-emerald-600 dark:text-emerald-400">
                All requirements met!
              </p>
              <p className="text-sm text-muted-foreground">
                Your AI assistant is ready to go live.
              </p>
            </div>
          </div>
        )}
        
        {/* Recommendations List */}
        {recommendations.length > 0 && p0Flags.length === 0 && p1Flags.length === 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Quick Links</h4>
            <div className="flex flex-wrap gap-2">
              {recommendations.slice(0, 4).map((rec, i) => (
                <Button key={i} size="sm" variant="outline" asChild>
                  <Link to={rec.deep_link}>
                    {rec.label}
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
