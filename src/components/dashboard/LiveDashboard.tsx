import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardHeroCard } from "./DashboardHeroCard";
import { PhoneNumberCard } from "./PhoneNumberCard";
import { TodayQueueCard } from "./TodayQueueCard";
import { RecentActivityCard } from "./RecentActivityCard";
import { QuickLinksCard } from "./QuickLinksCard";
import { GoLiveChecklist } from "./GoLiveChecklist";
import { UsageThresholdBanner } from "./UsageThresholdBanner";
import { Copilot, CopilotTrigger } from "./Copilot";
import { BusinessBrainStatusCard } from "./BusinessBrainStatusCard";
import { KnowledgeConflictBanner } from "./KnowledgeConflictBanner";
import { NextStepsPanel } from "./NextStepsPanel";
import { hasVoiceFeature } from "@/config/pricing";

export function LiveDashboard() {
  const { tenant, assistantSettings, subscription } = useAuth();
  const [copilotOpen, setCopilotOpen] = useState(false);
  
  const isLive = assistantSettings?.go_live_enabled;
  // Use centralized helper for voice feature detection
  const hasVoice = hasVoiceFeature(subscription?.plan_code);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Critical Banners - Stacked at top */}
      <KnowledgeConflictBanner />
      <UsageThresholdBanner threshold={80} />

      {/* HERO: Agent Status + Key Stats (full width) */}
      <DashboardHeroCard />

      {/* Phone Number Card - Prominent for Voice plans */}
      {hasVoice && <PhoneNumberCard />}

      {/* Two Column: Queue + Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <TodayQueueCard />
        <QuickLinksCard />
      </div>

      {/* Full Width: Recent Activity + What's Happening */}
      <div className="grid md:grid-cols-2 gap-6">
        <RecentActivityCard />
        <NextStepsPanel />
      </div>

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
