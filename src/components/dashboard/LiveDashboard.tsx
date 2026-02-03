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
    <div className="animate-fade-in">
      {/* Audio notification manager */}
      <SoundManager />

      {/* ==========================================
          ENTRY ZONE - Welcoming, breathing space
          ========================================== */}
      <div className="entry-zone space-y-5">
        {/* Critical Banners - Minimal, only when needed */}
        <AIReadinessPanel compact />
        <KnowledgeConflictBanner />
        <KnowledgeUploadBanner />
        <UsageThresholdBanner threshold={80} />
      </div>

      {/* ==========================================
          FOCUS ZONE - Primary content, the "desk"
          ========================================== */}
      <div className="focus-zone">
        {/* HERO: Agent Status - Main focus of attention */}
        <div className="work-area mb-10">
          <DashboardHeroCard />
        </div>

        {/* Phone & Schedule - Important but secondary */}
        <div className="space-y-6 mb-12">
          {hasVoice && <PhoneNumberCard />}
          <ScheduleConnectionCard variant="compact" showIfConnected={false} />
        </div>

        {/* Today's Metrics - Clean, scannable */}
        <div className="mb-12">
          <p className="section-label">Today's Activity</p>
          <TodaySnapshot />
        </div>

        {/* Needs Attention - Consolidated urgent items */}
        <NeedsAttentionBanner />
      </div>

      {/* ==========================================
          SUPPORTING ZONE - Secondary content
          ========================================== */}
      <div className="supporting-zone">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Live Activity - Primary supporting content */}
          <div className="lg:col-span-3">
            <p className="section-label">Recent Activity</p>
            <LiveActivityFeed />
          </div>
          
          {/* Quick Actions & Setup - Secondary */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <p className="section-label">Quick Actions</p>
              <QuickActionsCard />
            </div>
            <SetupProgressChecklist />
          </div>
        </div>

        {/* Go-Live Checklist - Only show when not live */}
        {!isLive && (
          <div className="mt-12">
            <GoLiveChecklist />
          </div>
        )}
      </div>

      {/* Copilot FAB */}
      <div className="relative z-30">
        {copilotOpen ? (
          <Copilot isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
        ) : (
          <CopilotTrigger onClick={() => setCopilotOpen(true)} />
        )}
      </div>
    </div>
  );
}
