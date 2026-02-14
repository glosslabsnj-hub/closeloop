import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCapabilities } from "@/hooks/useCapabilities";
import { AgentControlPanel } from "./AgentControlPanel";
import { NeedsAttentionBanner } from "./NeedsAttentionBanner";
import { LiveActivityFeed } from "./LiveActivityFeed";
import { UnifiedAlertBanner } from "./UnifiedAlertBanner";

import { SetupProgressChecklist } from "./SetupProgressChecklist";
import { ModeContentArea } from "./ModeContentArea";
import { MetricsGrid } from "./MetricsGrid";
import { BusynessSliderWidget } from "./BusynessSliderWidget";
import { TestCallCard } from "./TestCallCard";
import { SoundManager } from "@/components/notifications/SoundManager";

export function LiveDashboard() {
  const { tenant, assistantSettings } = useAuth();
  const caps = useCapabilities();
  

  // Show test call prompt for recently onboarded users (within 7 days of setup)
  const showTestCallPrompt = useMemo(() => {
    const setupAt = assistantSettings?.setup_completed_at;
    if (!setupAt) return false;
    const setupDate = new Date(setupAt as string);
    const daysSinceSetup = (Date.now() - setupDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceSetup <= 7;
  }, [assistantSettings]);

  return (
    <div className="space-y-8 animate-fade-in">
      <SoundManager />

      {/* ═══ TIER 1: Agent Status Hero + Busyness ═══ */}
      <AgentControlPanel />
      {caps.derivedPrimaryMode === "dispatch" && <BusynessSliderWidget />}

      {/* ═══ TIER 1.5: Test Call Prompt (new users only) ═══ */}
      {showTestCallPrompt && <TestCallCard variant="compact" />}

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

    </div>
  );
}
