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
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Brain,
  CheckCircle2,
  ChevronRight,
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
  brain: "bg-primary/10 text-primary border-primary/20",
  integration: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  plan: "bg-warning/10 text-warning border-warning/20",
  settings: "bg-muted text-muted-foreground border-border",
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
  const fixableIssues = allIssues.filter((i) => !isPlanGatedIssue(i.code));

  const getScoreColor = () => {
    if (score >= 85) return "text-success";
    if (score >= 70) return "text-warning";
    if (score >= 50) return "text-warning";
    return "text-destructive";
  };

  const getProgressColor = () => {
    if (score >= 85) return "[&>div]:bg-success";
    if (score >= 70) return "[&>div]:bg-warning";
    if (score >= 50) return "[&>div]:bg-warning";
    return "[&>div]:bg-destructive";
  };

  if (loading) {
    return (
      <PageContainer maxWidth="default">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Analyzing readiness...</span>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="default">
      {/* Header */}
      <PageHeader
        title="Readiness Fix Center"
        description="Fix issues to get your AI ready for production"
        breadcrumb={[
          { label: "Dashboard", href: "/app/dashboard" },
          { label: "Readiness" }
        ]}
        action={
          canGoLive ? (
            <Button asChild>
              <Link to="/app/go-live">
                <Rocket className="h-4 w-4 mr-2" />
                Go Live
              </Link>
            </Button>
          ) : undefined
        }
      />

      {/* Score Card */}
      <Card className="mb-8">
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Score Display */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={`text-4xl md:text-5xl font-bold tabular-nums ${getScoreColor()}`}>
                  {score}%
                </div>
                <div className="data-label mt-1">
                  Readiness Score
                </div>
              </div>
              <Separator orientation="vertical" className="h-16 hidden md:block" />
            </div>

            {/* Progress + Status */}
            <div className="flex-1 space-y-3">
              <Progress value={score} className={`h-2.5 ${getProgressColor()}`} />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {businessMode.charAt(0).toUpperCase() + businessMode.slice(1)} mode
                </span>
                <span className={canGoLive ? "text-success font-medium" : "text-muted-foreground"}>
                  {canGoLive ? "Ready to go live!" : "Need 85% + no blockers"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All Good State */}
      {p0Issues.length === 0 && p1Issues.length === 0 && (
        <Card className="border-success/30 bg-success/5 mb-8">
          <CardContent className="p-5 md:p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-success/20">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-success">
                  All requirements met!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your AI assistant is configured and ready to go live.
                </p>
              </div>
              <Button asChild className="shrink-0">
                <Link to="/app/go-live">
                  Activate Plan
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blocking Issues (P0) */}
      {p0Issues.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="h-5 w-5 text-destructive" />
            <h2 className="text-lg font-semibold">
              Must Fix to Go Live ({p0Issues.length})
            </h2>
          </div>
          <div className="space-y-3">
            {p0Issues.map((issue) => (
              <IssueCard key={issue.code} issue={issue} variant="blocker" />
            ))}
          </div>
        </div>
      )}

      {/* Recommended Improvements (P1) */}
      {p1Issues.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-5 w-5 text-warning" />
            <h2 className="text-lg font-semibold">
              Recommended Improvements ({p1Issues.length})
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
        <Card className="border-warning/30 bg-warning/5 mb-8">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-warning" />
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
    </PageContainer>
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

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`flex items-center justify-center h-10 w-10 rounded-lg border shrink-0 ${colorClass}`}>
            <Icon className="h-5 w-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-medium text-sm">{issue.title}</h3>
              <Badge
                variant="outline"
                className="text-xs"
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
    <Link to={href}>
      <Button variant="outline" className="h-auto py-4 w-full flex-col gap-2">
        <Icon className="h-5 w-5" />
        <span className="text-xs">{label}</span>
      </Button>
    </Link>
  );
}
