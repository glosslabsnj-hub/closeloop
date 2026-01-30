import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardHeroCard } from "./DashboardHeroCard";
import { PhoneNumberCard } from "./PhoneNumberCard";
import { TodaySnapshot } from "./TodaySnapshot";
import { NeedsAttentionBanner } from "./NeedsAttentionBanner";
import { LiveActivityFeed } from "./LiveActivityFeed";
import { QuickActionsCard } from "./QuickActionsCard";
import { GoLiveChecklist } from "./GoLiveChecklist";
import { UsageThresholdBanner } from "./UsageThresholdBanner";
import { Copilot, CopilotTrigger } from "./Copilot";
import { KnowledgeConflictBanner } from "./KnowledgeConflictBanner";
import { AIReadinessBanner } from "./AIReadinessBanner";
import { SoundManager } from "@/components/notifications/SoundManager";
import { hasVoiceFeature } from "@/config/pricing";

export function LiveDashboard() {
  const { tenant, assistantSettings, subscription } = useAuth();
  const [copilotOpen, setCopilotOpen] = useState(false);
  
  const isLive = assistantSettings?.go_live_enabled;
  const hasVoice = hasVoiceFeature(subscription?.plan_code);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Audio notification manager */}
      <SoundManager />

      {/* Critical Banners */}
      <AIReadinessBanner />
      <KnowledgeConflictBanner />
      <UsageThresholdBanner threshold={80} />

      {/* HERO: Agent Status + Toggle */}
      <DashboardHeroCard />

      {/* Phone Number Card - Prominent for Voice plans */}
      {hasVoice && <PhoneNumberCard />}

      {/* Today's Snapshot - Mode-adaptive metrics */}
      <TodaySnapshot />

      {/* Needs Attention Banner - Consolidated urgent items */}
      <NeedsAttentionBanner />

      {/* Two Column: Live Activity + Quick Actions */}
      <div className="grid md:grid-cols-5 gap-6">
        <div className="md:col-span-3">
          <LiveActivityFeed />
        </div>
        <div className="md:col-span-2">
          <QuickActionsCard />
        </div>
      </div>

      {/* Go-Live Checklist - Only show when not live */}
      {!isLive && <GoLiveChecklist />}

      {/* Copilot FAB */}
      {copilotOpen ? (
        <Copilot isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
      ) : (
        <CopilotTrigger onClick={() => setCopilotOpen(true)} />
      )}
    </div>
  );
}
