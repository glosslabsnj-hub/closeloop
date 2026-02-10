import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AgentStatusStrip } from "./AgentStatusStrip";
import { AlertBanner } from "./AlertBanner";
import { TodayBriefing } from "./TodayBriefing";
import { MetricsStrip } from "./MetricsStrip";
import { LiveActivityFeed } from "./LiveActivityFeed";
import { Copilot, CopilotTrigger } from "./Copilot";
import { SoundManager } from "@/components/notifications/SoundManager";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * LiveDashboard — The "Morning Briefing" layout.
 *
 * 5-layer hierarchy (each full width, stacked vertically):
 *   Layer 0: AgentStatusStrip — compact AI on/off toggle
 *   Layer 1: AlertBanner — single highest-priority system alert
 *   Layer 2: TodayBriefing — actionable items needing attention
 *   Layer 3: MetricsStrip — 3 key business metrics
 *   Layer 4: LiveActivityFeed — real-time event stream
 *   + Copilot FAB in bottom-right corner
 */
export function LiveDashboard() {
  const { tenant } = useAuth();
  const [copilotOpen, setCopilotOpen] = useState(false);

  const businessName = tenant?.name?.split(" ")[0] || "there";
  const greeting = getGreeting();

  return (
    <div className="space-y-6 animate-fade-in">
      <SoundManager />

      {/* Page Header */}
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          {greeting}, {businessName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here's what's happening today.
        </p>
      </header>

      {/* Layer 0: Agent Status Strip */}
      <AgentStatusStrip />

      {/* Layer 1: Critical Alerts (renders nothing if no alerts) */}
      <AlertBanner />

      {/* Layer 2: Today's Briefing */}
      <TodayBriefing />

      {/* Layer 3: Metrics Strip */}
      <MetricsStrip />

      {/* Layer 4: Activity Feed (full width) */}
      <LiveActivityFeed />

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
