import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCapabilities } from "@/hooks/useCapabilities";
import { AgentControlPanel } from "./AgentControlPanel";
import { NeedsAttentionBanner } from "./NeedsAttentionBanner";
import { LiveActivityFeed } from "./LiveActivityFeed";
import { UnifiedAlertBanner } from "./UnifiedAlertBanner";
import { Copilot, CopilotTrigger } from "./Copilot";
import { SetupProgressChecklist } from "./SetupProgressChecklist";
import { ModeContentArea } from "./ModeContentArea";
import { MetricsGrid } from "./MetricsGrid";
import { BusynessSliderWidget } from "./BusynessSliderWidget";
import { SoundManager } from "@/components/notifications/SoundManager";

export function LiveDashboard() {
  const { tenant } = useAuth();
  const caps = useCapabilities();
  const [copilotOpen, setCopilotOpen] = useState(false);

  return (
    <div className="space-y-8 animate-fade-in">
      <SoundManager />

      {/* ═══ TIER 1: Agent Status Hero + Busyness ═══ */}
      <AgentControlPanel />
      {caps.derivedPrimaryMode === "dispatch" && <BusynessSliderWidget />}

      {/* ═══ TIER 2: Alerts (only when present) ═══ */}
      <UnifiedAlertBanner />
      <NeedsAttentionBanner />

      {/* ═══ TIER 3: Key Metrics Strip ═══ */}
      <MetricsGrid />

      {/* ═══ TIER 4: Main Content Grid ═══ */}
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Primary: Mode-specific operational content */}
        <div className="space-y-6 min-w-0">
          <ModeContentArea />
        </div>

        {/* Secondary: Activity + Setup */}
        <div className="space-y-6 min-w-0">
          <LiveActivityFeed />
          <SetupProgressChecklist />
        </div>
      </div>

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
