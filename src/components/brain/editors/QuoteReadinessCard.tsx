/**
 * Quote Readiness Card
 *
 * Compact collapsible bar showing quote readiness score.
 * Click to expand and see specific issues with "Fix" links.
 * When ready (100%), stays collapsed as a simple green confirmation.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Calculator,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [isOpen, setIsOpen] = useState(false);

  const isLoading = servicesLoading || areaLoading || rulesLoading;

  useEffect(() => {
    if (isLoading || !tenant) return;

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
      <div className="flex items-center gap-2 text-sm text-muted-foreground px-1 py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Checking quote readiness...</span>
      </div>
    );
  }

  if (!readiness) return null;

  const hasIssues = readiness.issues.length > 0;

  // Fully ready — show a simple one-line confirmation
  if (readiness.ready && !hasIssues) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 px-1 py-1">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>Quote engine ready — your AI can provide pricing</span>
      </div>
    );
  }

  const scoreColor = readiness.score >= 80
    ? "text-emerald-600 dark:text-emerald-400"
    : readiness.score >= 50
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";

  const barBg = readiness.score >= 80
    ? "bg-emerald-500"
    : readiness.score >= 50
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Compact clickable header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <Calculator className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium flex-1 text-left">Quote Readiness</span>

        {/* Score + mini progress bar */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", barBg)} style={{ width: `${readiness.score}%` }} />
          </div>
          <span className={cn("text-sm font-semibold tabular-nums w-8 text-right", scoreColor)}>
            {readiness.score}%
          </span>
        </div>

        {hasIssues && (
          <span className="text-xs text-muted-foreground shrink-0">
            {readiness.issues.length} issue{readiness.issues.length !== 1 ? "s" : ""}
          </span>
        )}

        <span className="text-muted-foreground shrink-0">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      </button>

      {/* Expanded content — issue list with fix links */}
      {isOpen && hasIssues && (
        <div className="px-4 pb-3 space-y-1.5 border-t border-border/30">
          <p className="text-xs text-muted-foreground pt-2 pb-1">Fix these to enable AI quoting:</p>
          {readiness.issues.map((issue, idx) => (
            <IssueRow key={idx} issue={issue} />
          ))}
        </div>
      )}

      {isOpen && !hasIssues && (
        <div className="px-4 pb-3 border-t border-border/30">
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 pt-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>All set — your quote engine is fully configured</span>
          </div>
        </div>
      )}
    </div>
  );
}

function IssueRow({ issue }: { issue: QuoteReadinessIssue }) {
  const Icon = issue.severity === "error" ? AlertCircle : AlertTriangle;
  const iconColor = issue.severity === "error"
    ? "text-red-500"
    : "text-amber-500";

  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-muted/30">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColor)} />
      <span className="text-sm flex-1 min-w-0 truncate">{issue.message}</span>
      <Button variant="ghost" size="sm" className="shrink-0 h-7 px-2 text-xs" asChild>
        <a href={issue.deepLink}>
          Fix <ArrowRight className="h-3 w-3 ml-1" />
        </a>
      </Button>
    </div>
  );
}
