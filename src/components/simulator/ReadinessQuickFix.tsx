import { Link } from "react-router-dom";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import { getIssueDetails } from "@/lib/readiness/issueMapping";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ChevronRight, Brain } from "lucide-react";

/**
 * Quick readiness fix prompt for the simulator
 * Shows the highest priority issue and a direct fix link
 */
export function ReadinessQuickFix() {
  const { score, p0Flags, p1Flags, canGoLive, loading } = useAIReadinessV2();
  
  if (loading) return null;
  
  // If ready, show success state
  if (canGoLive && p0Flags.length === 0 && p1Flags.length === 0) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-emerald-600 dark:text-emerald-400 text-sm">
                AI Readiness: {score}%
              </p>
              <p className="text-xs text-muted-foreground">
                Your AI is configured and ready for testing!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Get the top priority issue
  const topIssueCode = p0Flags[0] || p1Flags[0];
  if (!topIssueCode) return null;
  
  const issue = getIssueDetails(topIssueCode);
  const isBlocker = p0Flags.includes(topIssueCode);
  const remainingCount = p0Flags.length + p1Flags.length - 1;
  
  return (
    <Card className={`border ${isBlocker ? 'border-rose-500/30 bg-rose-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className={`flex items-center justify-center h-10 w-10 rounded-lg shrink-0 ${
              isBlocker ? 'bg-rose-500/20' : 'bg-amber-500/20'
            }`}>
              <AlertTriangle className={`h-5 w-5 ${isBlocker ? 'text-rose-500' : 'text-amber-500'}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">Next recommended fix:</p>
                <Badge variant="outline" className={`text-xs ${
                  isBlocker ? 'border-rose-500/50 text-rose-600' : 'border-amber-500/50 text-amber-600'
                }`}>
                  {isBlocker ? 'Required' : 'Recommended'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{issue.title}</p>
              {remainingCount > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  +{remainingCount} more issue{remainingCount !== 1 ? 's' : ''} to resolve
                </p>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant={isBlocker ? "default" : "outline"} asChild>
              <Link to={issue.fixLink}>
                <Brain className="h-3.5 w-3.5 mr-1" />
                {issue.fixLabel}
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/app/readiness">
                View All
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
