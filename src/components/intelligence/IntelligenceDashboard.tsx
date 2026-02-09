/**
 * IntelligenceDashboard - Main intelligence view for the Business Brain
 *
 * Composes: ConversionMetrics + InsightsFeed + PatternsList + WeeklyDigest
 * Used as the content for the "intelligence" section in BusinessBrainPage.
 */

import { ConversionMetricsCard } from "./ConversionMetricsCard";
import { InsightsFeed } from "./InsightsFeed";
import { PatternsList } from "./PatternsList";
import { WeeklyDigestCard } from "./WeeklyDigestCard";
import { useUnreadInsightCount } from "@/hooks/useIntelligence";
import { SectionSummaryCard } from "@/components/brain/layout/SectionSummaryCard";
import { EssentialGroup } from "@/components/brain/layout/EssentialGroup";
import { AdvancedGroup } from "@/components/brain/layout/AdvancedGroup";
import { IntelligenceSettingsForm } from "@/components/settings/IntelligenceSettingsForm";
import type { BusinessMode } from "@/hooks/useTenantConfig";
import { BarChart3, Lightbulb, TrendingUp, Calendar, Settings2 } from "lucide-react";

interface IntelligenceDashboardProps {
  businessMode: BusinessMode;
}

export function IntelligenceDashboard({ businessMode }: IntelligenceDashboardProps) {
  const { data: unreadCount = 0 } = useUnreadInsightCount();

  return (
    <div className="space-y-4">
      {/* Conversion Metrics */}
      <SectionSummaryCard
        id="conversion-metrics"
        title="Call Performance"
        icon={BarChart3}
        status={unreadCount > 0 ? "warning" : "complete"}
        statusText={unreadCount > 0 ? `${unreadCount} insight${unreadCount === 1 ? "" : "s"} need attention` : "Your AI is handling calls"}
        mode={businessMode}
        defaultExpanded
        usedByAI={[
          "Tracks every call outcome automatically",
          "Measures conversion rates and call duration",
          "Estimates revenue from AI-handled calls",
        ]}
      >
        <ConversionMetricsCard />
      </SectionSummaryCard>

      {/* Insights Feed */}
      <EssentialGroup title="Action Items" description="Things you can do to improve your AI" numbered={false}>
        <SectionSummaryCard
          id="insights"
          title="Insights & Recommendations"
          icon={Lightbulb}
          status={unreadCount > 0 ? "warning" : "complete"}
          statusText={unreadCount > 0 ? `${unreadCount} new insight${unreadCount === 1 ? "" : "s"}` : "All caught up"}
          mode={businessMode}
          defaultExpanded={unreadCount > 0}
          whyText="Your AI analyzes call patterns and surfaces things you can fix to convert more callers."
          usedByAI={[
            "Detects when callers aren't getting answers",
            "Finds services with low conversion rates",
            "Identifies peak times and capacity issues",
          ]}
        >
          <InsightsFeed />
        </SectionSummaryCard>
      </EssentialGroup>

      {/* Patterns */}
      <AdvancedGroup title="Detected Patterns" collapsedDescription="Trends your AI has spotted across calls">
        <SectionSummaryCard
          id="patterns"
          title="Business Patterns"
          icon={TrendingUp}
          status="complete"
          statusText="Automatically detected from call data"
          mode={businessMode}
          usedByAI={[
            "Tracks peak call hours and best conversion times",
            "Identifies most-requested services",
            "Monitors escalation and hangup trends",
          ]}
        >
          <PatternsList />
        </SectionSummaryCard>
      </AdvancedGroup>

      {/* Weekly Digest */}
      <AdvancedGroup title="Weekly Summary" collapsedDescription="Your AI's performance this week">
        <SectionSummaryCard
          id="weekly-digest"
          title="Weekly Digest"
          icon={Calendar}
          status="complete"
          statusText="Auto-generated summary of your AI's performance"
          mode={businessMode}
        >
          <WeeklyDigestCard />
        </SectionSummaryCard>
      </AdvancedGroup>

      {/* Learning Settings */}
      <AdvancedGroup title="Learning Settings" collapsedDescription="Control how your AI learns and adapts">
        <SectionSummaryCard
          id="intelligence-settings"
          title="Learning Preferences"
          icon={Settings2}
          status="complete"
          statusText="Control memory and adaptation features"
          mode={businessMode}
          usedByAI={[
            "Controls whether AI remembers returning callers",
            "Sets confidence thresholds for learning",
          ]}
        >
          <IntelligenceSettingsForm />
        </SectionSummaryCard>
      </AdvancedGroup>
    </div>
  );
}
