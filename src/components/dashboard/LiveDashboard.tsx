import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AgentControlPanel } from "./AgentControlPanel";
import { NeedsAttentionBanner } from "./NeedsAttentionBanner";
import { CompleteProfileBanner } from "./CompleteProfileBanner";
import { LiveActivityFeed } from "./LiveActivityFeed";
import { UnifiedAlertBanner } from "./UnifiedAlertBanner";
import { ModeContentArea } from "./ModeContentArea";
import { MetricsGrid } from "./MetricsGrid";
import { SoundManager } from "@/components/notifications/SoundManager";

export function LiveDashboard() {
  const { assistantSettings } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in">
      <SoundManager />

      {/* Agent Status */}
      <AgentControlPanel />

      {/* Alerts (only when present) */}
      <UnifiedAlertBanner />
      <CompleteProfileBanner />
      <NeedsAttentionBanner />

      {/* Key Metrics */}
      <MetricsGrid />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6 min-w-0">
          <ModeContentArea />
        </div>
        <div className="space-y-6 min-w-0">
          <LiveActivityFeed />
        </div>
      </div>
    </div>
  );
}
