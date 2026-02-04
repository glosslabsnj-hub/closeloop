import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardHeroCard } from "./DashboardHeroCard";
import { PhoneNumberCard } from "./PhoneNumberCard";
import { TodaySnapshot } from "./TodaySnapshot";
import { NeedsAttentionBanner } from "./NeedsAttentionBanner";
import { LiveActivityFeed } from "./LiveActivityFeed";
import { QuickActionsCard } from "./QuickActionsCard";
import { GoLiveChecklist } from "./GoLiveChecklist";
import { UnifiedAlertBanner } from "./UnifiedAlertBanner";
import { Copilot, CopilotTrigger } from "./Copilot";
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
    <div className="space-y-8">
      {/* Audio notification manager */}
      <SoundManager />

      {/* Alerts - Only show if there are issues */}
      <UnifiedAlertBanner />

      {/* Hero Section - Agent Status */}
      <section>
        <DashboardHeroCard />
      </section>

      {/* Quick Setup Items - Phone & Calendar */}
      {(hasVoice || !isLive) && (
        <section className="grid gap-4 md:grid-cols-2">
          {hasVoice && <PhoneNumberCard />}
          <ScheduleConnectionCard variant="compact" showIfConnected={false} />
        </section>
      )}

      {/* Today's Metrics */}
      <section>
        <SectionHeader>Today</SectionHeader>
        <TodaySnapshot />
      </section>

      {/* Attention Items */}
      <NeedsAttentionBanner />

      {/* Main Content Grid */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Activity Feed - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader>Recent Activity</SectionHeader>
          <LiveActivityFeed />
        </div>

        {/* Sidebar - Quick Actions & Setup */}
        <div className="space-y-6">
          <div>
            <SectionHeader>Quick Actions</SectionHeader>
            <QuickActionsCard />
          </div>
          <SetupProgressChecklist />
        </div>
      </section>

      {/* Go-Live Checklist - Only when not live */}
      {!isLive && (
        <section>
          <GoLiveChecklist />
        </section>
      )}

      {/* Copilot FAB */}
      <div className="fixed bottom-6 right-6 z-30 md:bottom-8 md:right-8">
        {copilotOpen ? (
          <Copilot isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
        ) : (
          <CopilotTrigger onClick={() => setCopilotOpen(true)} />
        )}
      </div>
    </div>
  );
}

/** Clean section header */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">
      {children}
    </h2>
  );
}
