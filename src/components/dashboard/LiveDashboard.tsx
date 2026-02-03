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
import { KnowledgeUploadBanner } from "./KnowledgeUploadBanner";
import { AIReadinessPanel } from "./AIReadinessPanel";
import { SetupProgressChecklist } from "./SetupProgressChecklist";
import { ScheduleConnectionCard } from "@/components/schedule/ScheduleConnectionCard";
import { SoundManager } from "@/components/notifications/SoundManager";
import { hasVoiceFeature } from "@/config/pricing";

export function LiveDashboard() {
  const { tenant, assistantSettings, subscription } = useAuth();
  const [copilotOpen, setCopilotOpen] = useState(false);
  
  const isLive = assistantSettings?.go_live_enabled;
  const hasVoice = hasVoiceFeature(subscription?.plan_code);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in relative z-10">
      {/* Audio notification manager */}
      <SoundManager />

      {/* Critical Banners - z-20 to stay below nav but above content */}
      <div className="relative z-20 space-y-4">
        <AIReadinessPanel compact />
        <KnowledgeConflictBanner />
        <KnowledgeUploadBanner />
        <UsageThresholdBanner threshold={80} />
      </div>

      {/* HERO: Agent Status + Toggle - z-10 to stay below banners and nav */}
      <div className="relative z-10">
        <DashboardHeroCard />
      </div>

      {/* Phone Number Card - Prominent for Voice plans */}
      {hasVoice && <PhoneNumberCard />}

      {/* Schedule Connection Card - Show if not connected */}
      <ScheduleConnectionCard variant="compact" showIfConnected={false} />

      {/* Today's Snapshot - Mode-adaptive metrics */}
      <TodaySnapshot />

      {/* Needs Attention Banner - Consolidated urgent items */}
      <NeedsAttentionBanner />

      {/* Two Column: Live Activity + Quick Actions + Setup Progress */}
      <div className="grid md:grid-cols-5 gap-6">
        <div className="md:col-span-3">
          <LiveActivityFeed />
        </div>
        <div className="md:col-span-2 space-y-4">
          <QuickActionsCard />
          {/* Setup Progress Checklist - only shows if not live */}
          <SetupProgressChecklist />
        </div>
      </div>

      {/* Go-Live Checklist - Only show when not live */}
      {!isLive && <GoLiveChecklist />}

      {/* Copilot FAB - z-25 to stay below nav (z-40) but above content */}
      <div className="relative z-[25]">
        {copilotOpen ? (
          <Copilot isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
        ) : (
          <CopilotTrigger onClick={() => setCopilotOpen(true)} />
        )}
      </div>
    </div>
  );
}
