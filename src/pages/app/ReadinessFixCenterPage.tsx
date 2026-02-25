/**
 * Readiness Fix Center
 *
 * Centralized page for diagnosing and fixing AI readiness issues.
 * Routes users to the correct place (Business Brain, Integrations, etc.)
 * instead of incorrectly sending them to plan selection.
 */

import { Link, useNavigate } from "react-router-dom";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import { getIssueDetails, isPlanGatedIssue, type ReadinessIssue, type FixType } from "@/lib/readiness/issueMapping";
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
  ChevronLeft,
  Sparkles,
  XCircle,
  Info,
  Loader2,
  Link2,
  CreditCard,
  Settings,
  Wrench,
  Rocket,
  ArrowRight,
} from "lucide-react";

const fixTypeIcons: Record<FixType, React.ElementType> = {
  brain: Brain,
  integration: Link2,
  plan: CreditCard,
  settings: Settings,
};

const fixTypeColors: Record<FixType, string> = {
  brain: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  integration: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  plan: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  settings: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

export default function ReadinessFixCenterPage() {
  const navigate = useNavigate();
  const {
    score,
    p0Flags,
    p1Flags,
    recommendations,
    canGoLive,
    isReady,
    loading,
    businessMode,
    refetch,
  } = useAIReadinessV2();

  // Convert flags to full issue details
  const p0Issues = p0Flags.map(getIssueDetails);
  const p1Issues = p1Flags.map(getIssueDetails);
  const allIssues = [...p0Issues, ...p1Issues];

  // Separate plan-gated from fixable
  const planGatedIssues = allIssues.filter((i) => isPlanGatedIssue(i.code));
  const _fixableIssues = allIssues.filter((i) => !isPlanGatedIssue(i.code));

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

  if (loading) {
    return (
      <div className="container max-w-4xl py-8 px-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Analyzing readiness...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 px-4">
      {/* Back Navigation */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/app/dashboard")}
        className="mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10">
            <Wrench className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Readiness Fix Center</h1>
            <p className="text-muted-foreground">
              Fix issues to get your AI ready for production
            </p>
          </div>
        </div>
        {/* Encouragement message */}
        {(p0Issues.length > 0 || p1Issues.length > 0) && score >= 50 && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-primary font-medium">
              🎯 You're almost there! Complete these items to launch your AI.
            </p>
          </div>
        )}
      </div>

      {/* Score Card */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Score Display */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={`text-5xl font-bold ${getScoreColor()}`}>
                  {score}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Readiness Score
                </div>
              </div>
              <Separator orientation="vertical" className="h-16 hidden md:block" />
            </div>

            {/* Progress + Status */}
            <div className="flex-1 space-y-3">
              <Progress value={score} className={`h-3 ${getProgressColor()}`} />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {businessMode.charAt(0).toUpperCase() + businessMode.slice(1)} mode
                </span>
                <span className={canGoLive ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                  {canGoLive ? "Ready to go live!" : "Need 85% + no blockers"}
                </span>
              </div>
            </div>

            {/* Go Live Button */}
            {canGoLive && (
              <Button asChild className="shrink-0">
                <Link to="/app/go-live">
                  <Rocket className="h-4 w-4 mr-2" />
                  Go Live
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* All Good State */}
      {p0Issues.length === 0 && p1Issues.length === 0 && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/20">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold text-emerald-600 dark:text-emerald-400">
                  All requirements met!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your AI assistant is configured and ready to go live.
                </p>
              </div>
              <Button asChild className="ml-auto">
                <Link to="/app/go-live">
                  Activate Plan
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blocking Issues (P0) - Required */}
      {p0Issues.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="h-5 w-5 text-rose-500" />
            <h2 className="text-lg font-semibold text-rose-600 dark:text-rose-400">
              Required to Go Live ({p0Issues.length})
            </h2>
          </div>
          <div className="space-y-3">
            {p0Issues.map((issue) => (
              <IssueCard key={issue.code} issue={issue} variant="blocker" />
            ))}
          </div>
        </div>
      )}

      {/* Optional Improvements (P1) */}
      {p1Issues.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-amber-600 dark:text-amber-400">
              Optional Improvements ({p1Issues.length})
            </h2>
          </div>
          <div className="space-y-3">
            {p1Issues.map((issue) => (
              <IssueCard key={issue.code} issue={issue} variant="recommended" />
            ))}
          </div>
        </div>
      )}

      {/* Plan-Gated Issues (if any) */}
      {planGatedIssues.length > 0 && (
        <div className="mb-8">
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-500" />
                Plan Required
              </CardTitle>
              <CardDescription>
                These features require a plan upgrade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {planGatedIssues.map((issue) => (
                  <div
                    key={issue.code}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-sm">{issue.title}</span>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={issue.fixLink}>View Plans</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <CardDescription>
            Common places to configure your AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickActionButton
              icon={Brain}
              label="Business Brain"
              href="/app/business-brain"
            />
            <QuickActionButton
              icon={Link2}
              label="Integrations"
              href="/app/integrations"
            />
            <QuickActionButton
              icon={Sparkles}
              label="Test AI"
              href="/app/simulator"
            />
            <QuickActionButton
              icon={Settings}
              label="Settings"
              href="/app/settings"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface IssueCardProps {
  issue: ReadinessIssue;
  variant: "blocker" | "recommended";
}

function IssueCard({ issue, variant }: IssueCardProps) {
  const Icon = fixTypeIcons[issue.fixType];
  const colorClass = fixTypeColors[issue.fixType];
  const borderClass = variant === "blocker"
    ? "border-rose-500/20 bg-rose-500/5"
    : "border-amber-500/20 bg-amber-500/5";

  return (
    <Card className={`${borderClass}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`flex items-center justify-center h-10 w-10 rounded-lg border shrink-0 ${colorClass}`}>
            <Icon className="h-5 w-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium">{issue.title}</h3>
              <Badge
                variant="outline"
                className={`text-xs ${
                  issue.fixType === "brain"
                    ? "border-purple-500/50 text-purple-600"
                    : issue.fixType === "integration"
                      ? "border-blue-500/50 text-blue-600"
                      : issue.fixType === "plan"
                        ? "border-amber-500/50 text-amber-600"
                        : "border-slate-500/50 text-slate-600"
                }`}
              >
                {issue.fixType === "brain"
                  ? "Business Brain"
                  : issue.fixType === "integration"
                    ? "Integration"
                    : issue.fixType === "plan"
                      ? "Plan Required"
                      : "Settings"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{issue.reason}</p>
          </div>

          {/* Fix Button */}
          <Button
            size="sm"
            variant={variant === "blocker" ? "default" : "outline"}
            asChild
            className="shrink-0"
          >
            <Link to={issue.fixLink}>
              {issue.fixLabel}
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickActionButtonProps {
  icon: React.ElementType;
  label: string;
  href: string;
}

function QuickActionButton({ icon: Icon, label, href }: QuickActionButtonProps) {
  return (
    <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
      <Link to={href}>
        <Icon className="h-5 w-5" />
        <span className="text-xs">{label}</span>
      </Link>
    </Button>
  );
}
