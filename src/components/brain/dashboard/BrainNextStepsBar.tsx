/**
 * BrainNextStepsBar - Priority-ordered "What Should I Do Next?" engine
 *
 * Builds a task queue from:
 * - Capability flags that are ON but unconfigured
 * - AI readiness P0/P1 checks that are failing
 * - Categories with low completion percentages
 *
 * Renders as a persistent bar at the top of the BrainDashboard.
 */

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import { useBusinessCapabilities } from "@/hooks/useBusinessCapabilities";
import type { CategoryCompletionStats } from "@/hooks/useCategoryCompletion";
import type { CategoryConfig } from "@/components/brain/layout/businessBrainNavConfig";

interface NextStep {
  id: string;
  label: string;
  reason: string;
  section: string;
  priority: "critical" | "important" | "nice";
}

interface BrainNextStepsBarProps {
  completions: Record<string, CategoryCompletionStats>;
  categories: CategoryConfig[];
  onNavigate: (section: string) => void;
}

/**
 * Derive priority-ordered next steps from readiness, capabilities, and completion.
 */
function buildNextSteps(
  readiness: ReturnType<typeof useAIReadinessV2>,
  capabilities: ReturnType<typeof useBusinessCapabilities>,
  completions: Record<string, CategoryCompletionStats>,
  categories: CategoryConfig[],
): NextStep[] {
  const steps: NextStep[] = [];

  // 1. P0 readiness blockers (critical)
  for (const flag of readiness.p0Flags) {
    const rec = readiness.recommendations.find(r => r.deep_link.includes(flag) || r.label.toLowerCase().includes(flag.replace(/_/g, " ")));
    steps.push({
      id: `p0-${flag}`,
      label: rec?.label || flag.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      reason: "Required to go live",
      section: mapFlagToSection(flag),
      priority: "critical",
    });
  }

  // 2. Categories with 0% completion (important)
  const sorted = [...categories].sort((a, b) => a.order - b.order);
  for (const cat of sorted) {
    const stats = completions[cat.section];
    if (stats && stats.percentage === 0 && stats.totalFields > 0) {
      // Skip if already covered by P0
      if (steps.some(s => s.section === cat.section)) continue;
      steps.push({
        id: `empty-${cat.section}`,
        label: `Set up ${cat.title}`,
        reason: "No data configured yet",
        section: cat.section,
        priority: "important",
      });
    }
  }

  // 3. Categories with < 50% completion (important)
  for (const cat of sorted) {
    const stats = completions[cat.section];
    if (stats && stats.percentage > 0 && stats.percentage < 50 && stats.totalFields > 0) {
      if (steps.some(s => s.section === cat.section)) continue;
      steps.push({
        id: `low-${cat.section}`,
        label: `Finish ${cat.title}`,
        reason: `${stats.percentage}% complete`,
        section: cat.section,
        priority: "important",
      });
    }
  }

  // 4. Capability-driven suggestions (nice)
  if (capabilities.mode === "service" || capabilities.mode === "general") {
    if (!capabilities.hasFAQs) {
      if (!steps.some(s => s.id.includes("faq"))) {
        steps.push({
          id: "cap-faqs",
          label: "Add FAQs",
          reason: "Helps your AI answer common questions",
          section: "training",
          priority: "nice",
        });
      }
    }
  }

  // 5. P1 flags (nice)
  for (const flag of readiness.p1Flags.slice(0, 2)) {
    if (steps.some(s => s.id.includes(flag))) continue;
    steps.push({
      id: `p1-${flag}`,
      label: flag.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      reason: "Recommended improvement",
      section: mapFlagToSection(flag),
      priority: "nice",
    });
  }

  return steps;
}

function mapFlagToSection(flag: string): string {
  if (flag.includes("service") || flag.includes("menu") || flag.includes("catalog")) return "services";
  if (flag.includes("hour") || flag.includes("name") || flag.includes("profile")) return "about";
  if (flag.includes("greeting") || flag.includes("faq") || flag.includes("script") || flag.includes("knowledge")) return "training";
  if (flag.includes("polic") || flag.includes("cancel") || flag.includes("deposit")) return "rules";
  if (flag.includes("coverage") || flag.includes("area") || flag.includes("calendar")) return "operations";
  return "about";
}

const PRIORITY_COLORS = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  important: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  nice: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
};

export function BrainNextStepsBar({ completions, categories, onNavigate }: BrainNextStepsBarProps) {
  const readiness = useAIReadinessV2();
  const capabilities = useBusinessCapabilities();
  const [showAll, setShowAll] = useState(false);

  const steps = useMemo(
    () => buildNextSteps(readiness, capabilities, completions, categories),
    [readiness, capabilities, completions, categories],
  );

  if (steps.length === 0) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/50">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <p className="text-sm font-medium text-green-800 dark:text-green-200">
          All set! Your AI knowledge base is fully configured.
        </p>
      </div>
    );
  }

  const visibleSteps = showAll ? steps : steps.slice(0, 3);
  const hasMore = steps.length > 3;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">What to do next</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          Step 1 of {steps.length}
        </span>
      </div>

      {/* Steps */}
      <div className="space-y-1.5">
        {visibleSteps.map((step, i) => (
          <button
            key={step.id}
            type="button"
            onClick={() => onNavigate(step.section)}
            className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left group"
          >
            <span className="text-xs font-bold text-muted-foreground tabular-nums shrink-0 w-5">
              {i + 1}.
            </span>
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider",
              PRIORITY_COLORS[step.priority],
            )}>
              {step.priority === "critical" ? "Fix" : step.priority === "important" ? "Do" : "Try"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{step.label}</p>
              <p className="text-xs text-muted-foreground truncate">
                {step.reason}
                {step.priority === "critical" ? " · ~2 min" : step.priority === "important" ? " · ~3 min" : " · ~1 min"}
              </p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </button>
        ))}
      </div>

      {/* Show more/less */}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full text-xs"
        >
          {showAll ? "Show less" : `Show ${steps.length - 3} more`}
          {showAll ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
        </Button>
      )}
    </div>
  );
}
