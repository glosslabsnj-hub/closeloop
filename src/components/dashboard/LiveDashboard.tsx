import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardHeroCard } from "./DashboardHeroCard";
import { TodayQueueCard } from "./TodayQueueCard";
import { RecentActivityCard } from "./RecentActivityCard";
import { QuickLinksCard } from "./QuickLinksCard";
import { GoLiveChecklist } from "./GoLiveChecklist";
import { UsageThresholdBanner } from "./UsageThresholdBanner";
import { Copilot, CopilotTrigger } from "./Copilot";
import { BusinessBrainStatusCard } from "./BusinessBrainStatusCard";
import { KnowledgeConflictBanner } from "./KnowledgeConflictBanner";

export function LiveDashboard() {
  const { assistantSettings } = useAuth();
  const [copilotOpen, setCopilotOpen] = useState(false);
  
  const isLive = assistantSettings?.go_live_enabled;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Critical Banners - Stacked at top */}
      <KnowledgeConflictBanner />
      <UsageThresholdBanner threshold={80} />

      {/* HERO: Agent Status + Key Stats (full width) */}
      <DashboardHeroCard />

      {/* Two Column: Queue + Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <TodayQueueCard />
        <QuickLinksCard />
      </div>

      {/* Full Width: Recent Activity */}
      <RecentActivityCard />

      {/* Two Column: Brain Status + Setup/Checklist */}
      <div className="grid md:grid-cols-2 gap-6">
        <BusinessBrainStatusCard />
        {!isLive && <GoLiveChecklist />}
      </div>

      {/* Copilot FAB */}
      {copilotOpen ? (
        <Copilot isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
      ) : (
        <CopilotTrigger onClick={() => setCopilotOpen(true)} />
      )}
    </div>
  );
}
