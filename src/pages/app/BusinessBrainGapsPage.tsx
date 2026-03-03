import ErrorBoundary from "@/components/ErrorBoundary";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { StatCard } from "@/components/layout/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SkeletonStatCard,
  SkeletonCard
} from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Brain,
  Clock,
  DollarSign,
  HelpCircle,
  MapPin,
  MessageSquare,
  FileText,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  useKnowledgeGaps,
  getGapTypeLabel,
  getGapTypeDeepLink,
  getGapTypeAction,
} from "@/hooks/useKnowledgeGaps";

const gapTypeIcons: Record<string, React.ElementType> = {
  missing_policy: FileText,
  missing_pricing: DollarSign,
  missing_service_area: MapPin,
  unanswered_question: HelpCircle,
  missing_hours: Clock,
  missing_faq: MessageSquare,
  other: HelpCircle,
};

const gapTypeColors: Record<
  string,
  { icon: string; bg: string; border: string }
> = {
  missing_policy: {
    icon: "text-rose-400",
    bg: "bg-rose-500/15",
    border: "border-rose-500/30",
  },
  missing_pricing: {
    icon: "text-amber-400",
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
  },
  missing_service_area: {
    icon: "text-blue-400",
    bg: "bg-blue-500/15",
    border: "border-blue-500/30",
  },
  unanswered_question: {
    icon: "text-purple-400",
    bg: "bg-purple-500/15",
    border: "border-purple-500/30",
  },
  missing_hours: {
    icon: "text-cyan-400",
    bg: "bg-cyan-500/15",
    border: "border-cyan-500/30",
  },
  missing_faq: {
    icon: "text-orange-400",
    bg: "bg-orange-500/15",
    border: "border-orange-500/30",
  },
  other: {
    icon: "text-gray-400",
    bg: "bg-gray-500/15",
    border: "border-gray-500/30",
  },
};

const priorityLabels: Record<number, { label: string; color: string }> = {
  1: { label: "Low", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  2: {
    label: "Medium",
    color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  3: { label: "High", color: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
};

export default function BusinessBrainGapsPage() {
  const {
    gapTypeAggregates,
    topGaps,
    totalUnresolvedCount,
    totalOccurrences,
    loading,
  } = useKnowledgeGaps();

  return (
    <ErrorBoundary context="loading knowledge gaps">
    <PageContainer>
      <PageHeader
        title="Business Brain Gaps"
        description="Questions your AI couldn't answer confidently during calls"
        action={
          <Button variant="outline" asChild>
            <Link to="/app/business-brain">
              <Brain className="h-4 w-4 mr-2" />
              View Knowledge Base
            </Link>
          </Button>
        }
      />

      {/* Stats Row */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Total Gaps"
            value={totalUnresolvedCount}
            icon={AlertTriangle}
            description="Unique knowledge gaps"
            variant={totalUnresolvedCount > 0 ? "warning" : "success"}
          />
          <StatCard
            label="Total Occurrences"
            value={totalOccurrences}
            icon={TrendingUp}
            description="How many times gaps were hit"
            variant={totalOccurrences > 10 ? "destructive" : "default"}
          />
          <StatCard
            label="Gap Types"
            value={gapTypeAggregates.length}
            icon={Brain}
            description="Categories of missing info"
            variant="primary"
          />
        </div>
      )}

      {/* Empty State */}
      {!loading && totalUnresolvedCount === 0 && (
        <SectionCard variant="elevated">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Knowledge Gaps!</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Your AI has all the information it needs to handle customer
              questions confidently.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link to="/app/business-brain">
                  <Brain className="h-4 w-4 mr-2" />
                  View Knowledge Base
                </Link>
              </Button>
              <Button asChild>
                <Link to="/app/simulator">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Test AI
                </Link>
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Gap Types Overview */}
      {!loading && gapTypeAggregates.length > 0 && (
        <SectionCard
          title="Gaps by Type"
          description="Knowledge gaps grouped by category"
          variant="elevated"
        >
          <div className="space-y-3">
            {gapTypeAggregates.map((aggregate) => {
              const Icon = gapTypeIcons[aggregate.gap_type] || HelpCircle;
              const colors =
                gapTypeColors[aggregate.gap_type] || gapTypeColors.other;
              const deepLink = getGapTypeDeepLink(aggregate.gap_type);
              const action = getGapTypeAction(aggregate.gap_type);

              return (
                <Link
                  key={aggregate.gap_type}
                  to={deepLink}
                  className={`flex items-center justify-between p-4 rounded-lg border ${colors.border} ${colors.bg} hover:bg-opacity-80 transition-colors group`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`h-10 w-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0`}
                    >
                      <Icon className={`h-5 w-5 ${colors.icon}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {getGapTypeLabel(aggregate.gap_type)}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            priorityLabels[aggregate.highest_priority].color
                          }
                        >
                          {priorityLabels[aggregate.highest_priority].label}{" "}
                          Priority
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          {aggregate.unresolved_count} unique gap
                          {aggregate.unresolved_count !== 1 ? "s" : ""}
                        </span>
                        <span>•</span>
                        <span>
                          {aggregate.total_occurrences} occurrence
                          {aggregate.total_occurrences !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = deepLink;
                      }}
                    >
                      {action}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Top Gaps */}
      {!loading && topGaps.length > 0 && (
        <SectionCard
          title="Most Frequent Gaps"
          description="Top questions your AI struggled with"
          variant="elevated"
        >
          <div className="space-y-3">
            {topGaps.map((gap, index) => {
              const Icon = gapTypeIcons[gap.gap_type] || HelpCircle;
              const colors = gapTypeColors[gap.gap_type] || gapTypeColors.other;
              const deepLink = getGapTypeDeepLink(gap.gap_type);

              return (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div
                        className={`h-8 w-8 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center`}
                      >
                        <Icon className={`h-4 w-4 ${colors.icon}`} />
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs px-1.5 py-0.5"
                      >
                        {gap.occurrence_count}x
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {getGapTypeLabel(gap.gap_type)}
                        </span>
                        <Badge
                          variant="outline"
                          className={priorityLabels[gap.priority].color}
                        >
                          {priorityLabels[gap.priority].label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {gap.description}
                      </p>
                      {gap.latest_question && (
                        <div className="p-2 rounded bg-muted/50 text-xs">
                          <span className="text-muted-foreground">
                            Customer asked:{" "}
                          </span>
                          <span className="italic">"{gap.latest_question}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 shrink-0"
                    asChild
                  >
                    <Link to={deepLink}>
                      Fix <ChevronRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>

          {topGaps.length >= 10 && (
            <div className="mt-4 pt-4 border-t flex justify-center">
              <Button variant="outline" asChild>
                <Link to="/app/business-brain?tab=overview#gaps">
                  View All Gaps in Knowledge Base
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          )}
        </SectionCard>
      )}

      {/* Loading State */}
      {loading && (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      )}

      {/* What to Do Next */}
      {!loading && totalUnresolvedCount > 0 && (
        <SectionCard
          title="What to Do Next"
          description="Fix these gaps to improve AI performance"
          variant="elevated"
        >
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold">1</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">
                  Review gaps by type above
                </p>
                <p className="text-xs text-muted-foreground">
                  Click on a gap category to go directly to the fix page
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold">2</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">
                  Add missing information
                </p>
                <p className="text-xs text-muted-foreground">
                  Add FAQs, pricing, policies, or other missing data to your
                  knowledge base
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold">3</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Test your AI</p>
                <p className="text-xs text-muted-foreground">
                  Use the simulator to verify your AI can now answer these
                  questions
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  asChild
                >
                  <Link to="/app/simulator">
                    <Sparkles className="h-3 w-3 mr-1.5" />
                    Open Simulator
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </SectionCard>
      )}
    </PageContainer>
    </ErrorBoundary>
  );
}
