/**
 * Quote Readiness Card
 *
 * Shows the owner how ready their business is for AI quoting.
 * Displays a score, issues to fix, and links to configure missing pieces.
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Calculator,
} from "lucide-react";
import { useServices } from "@/hooks/useServices";
import { useServiceArea } from "@/hooks/useServiceArea";
import { usePricingRules } from "@/hooks/usePricingRules";
import { useAuth } from "@/contexts/AuthContext";
import {
  checkQuoteReadiness,
  type QuoteReadinessResult,
  type QuoteReadinessIssue,
  type QuoteContext,
} from "@/lib/quoteEngine";

export function QuoteReadinessCard() {
  const { tenant } = useAuth();
  const { services, isLoading: servicesLoading } = useServices();
  const { serviceArea, isLoading: areaLoading } = useServiceArea();
  const { rules: simpleRules, isLoading: rulesLoading } = usePricingRules();
  const [readiness, setReadiness] = useState<QuoteReadinessResult | null>(null);

  const isLoading = servicesLoading || areaLoading || rulesLoading;

  // Build context and check readiness when data loads
  useEffect(() => {
    if (isLoading || !tenant) return;

    // Get advanced rules from tenant (if available)
    const advancedRules = Array.isArray(
      (tenant as Record<string, unknown>).pricing_rules_jsonb
    )
      ? ((tenant as Record<string, unknown>).pricing_rules_jsonb as QuoteContext["advancedRules"])
      : [];

    const context: QuoteContext = {
      serviceArea,
      advancedRules,
      simpleRules,
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        price_amount: s.price_amount,
        price_type: s.price_type || "fixed",
        duration_minutes: s.duration_minutes,
      })),
    };

    const result = checkQuoteReadiness(context);
    setReadiness(result);
  }, [isLoading, tenant, services, serviceArea, simpleRules]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking quote readiness...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!readiness) {
    return null;
  }

  const scoreColor =
    readiness.score >= 80
      ? "text-emerald-500"
      : readiness.score >= 50
        ? "text-amber-500"
        : "text-destructive";

  const progressColor =
    readiness.score >= 80
      ? "bg-emerald-500"
      : readiness.score >= 50
        ? "bg-amber-500"
        : "bg-destructive";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Quote Readiness</CardTitle>
          </div>
          <Badge
            variant={readiness.ready ? "default" : "secondary"}
            className={readiness.ready ? "bg-emerald-600" : ""}
          >
            {readiness.ready ? "Ready" : "Setup Needed"}
          </Badge>
        </div>
        <CardDescription>
          How prepared your business is for AI-powered quoting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Readiness Score</span>
            <span className={`font-bold ${scoreColor}`}>{readiness.score}%</span>
          </div>
          <Progress
            value={readiness.score}
            className="h-2"
            // Note: Progress color is handled via CSS variable override
            style={
              {
                "--progress-foreground": progressColor.replace("bg-", "var(--"),
              } as React.CSSProperties
            }
          />
        </div>

        {/* Status Summary */}
        {readiness.ready ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 rounded-md px-3 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Your AI can provide quotes to customers</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Fix the issues below before AI can quote</span>
          </div>
        )}

        {/* Issues List */}
        {readiness.issues.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {readiness.issues.length} issue{readiness.issues.length !== 1 ? "s" : ""} to address
            </p>
            <div className="space-y-2">
              {readiness.issues.map((issue, idx) => (
                <IssueRow key={idx} issue={issue} />
              ))}
            </div>
          </div>
        )}

        {/* All Good */}
        {readiness.issues.length === 0 && (
          <div className="text-center py-4">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
            <p className="text-sm font-medium">All set!</p>
            <p className="text-xs text-muted-foreground">
              Your quote engine is fully configured
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IssueRow({ issue }: { issue: QuoteReadinessIssue }) {
  const Icon = issue.severity === "error" ? AlertCircle : AlertTriangle;
  const colorClass =
    issue.severity === "error"
      ? "text-destructive bg-destructive/10"
      : "text-amber-600 bg-amber-500/10";

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 ${colorClass}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-sm truncate">{issue.message}</span>
      </div>
      <Button variant="ghost" size="sm" className="shrink-0 h-7 px-2" asChild>
        <a href={issue.deepLink}>
          Fix <ArrowRight className="h-3 w-3 ml-1" />
        </a>
      </Button>
    </div>
  );
}
