import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AgentControlPanel } from "./AgentControlPanel";
import { NeedsAttentionBanner } from "./NeedsAttentionBanner";
import { LiveActivityFeed } from "./LiveActivityFeed";
import { UnifiedAlertBanner } from "./UnifiedAlertBanner";
import { Copilot, CopilotTrigger } from "./Copilot";
import { SetupProgressChecklist } from "./SetupProgressChecklist";
import { ModeContentArea } from "./ModeContentArea";
import { MetricsGrid } from "./MetricsGrid";
import { SoundManager } from "@/components/notifications/SoundManager";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function LiveDashboard() {
  const { tenant } = useAuth();
  const [copilotOpen, setCopilotOpen] = useState(false);

  const businessName = tenant?.name?.split(' ')[0] || "there";
  const greeting = getGreeting();

  return (
    <div className="space-y-6 animate-fade-in">
      <SoundManager />

      {/* Header row: greeting + alerts */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {greeting}, <span className="text-foreground">{businessName}</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Here's what's happening today</p>
        </div>
        <UnifiedAlertBanner />
      </div>

      {/* Agent control — full width, prominent */}
      <AgentControlPanel />

      {/* Attention items */}
      <NeedsAttentionBanner />

      {/* Main grid: content + sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Primary column */}
        <div className="space-y-6 min-w-0">
          <ModeContentArea />
        </div>

        {/* Sidebar column */}
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
