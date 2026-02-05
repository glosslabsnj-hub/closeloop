import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AgentControlPanel } from "./AgentControlPanel";
import { MetricsGrid } from "./MetricsGrid";
import { NeedsAttentionBanner } from "./NeedsAttentionBanner";
import { LiveActivityFeed } from "./LiveActivityFeed";
import { UnifiedAlertBanner } from "./UnifiedAlertBanner";
import { Copilot, CopilotTrigger } from "./Copilot";
import { SetupProgressChecklist } from "./SetupProgressChecklist";
import { SoundManager } from "@/components/notifications/SoundManager";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function LiveDashboard() {
  const { tenant, assistantSettings } = useAuth();
  const [copilotOpen, setCopilotOpen] = useState(false);

  const businessName = tenant?.name?.split(' ')[0] || "there";
  const greeting = getGreeting();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Audio notification manager */}
      <SoundManager />

      {/* Page Header */}
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          {greeting}, {businessName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here's what's happening with your AI receptionist today.
        </p>
      </header>

      {/* Alerts - Only show if there are issues */}
      <UnifiedAlertBanner />

      {/* Attention Items */}
      <NeedsAttentionBanner />

      {/* Agent Control - Most prominent element */}
      <AgentControlPanel />

      {/* Metrics */}
      <MetricsGrid />

      {/* Activity & Setup */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 min-h-0">
          <LiveActivityFeed />
        </div>
        <div className="lg:col-span-2 min-h-0">
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
