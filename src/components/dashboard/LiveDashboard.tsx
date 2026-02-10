import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AgentControlPanel } from "./AgentControlPanel";
import { NeedsAttentionBanner } from "./NeedsAttentionBanner";
import { LiveActivityFeed } from "./LiveActivityFeed";
import { UnifiedAlertBanner } from "./UnifiedAlertBanner";
import { Copilot, CopilotTrigger } from "./Copilot";
import { SetupProgressChecklist } from "./SetupProgressChecklist";
import { ModeContentArea } from "./ModeContentArea";
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
      {/* Audio notification manager */}
      <SoundManager />

      {/* Greeting + Alerts inline */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-lg font-medium text-muted-foreground">
          {greeting}, <span className="text-foreground">{businessName}</span>
        </p>
        <UnifiedAlertBanner />
      </div>

      {/* Attention Items */}
      <NeedsAttentionBanner />

      {/* Bento Grid: Primary + Sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Primary Column */}
        <div className="space-y-6 min-w-0">
          <AgentControlPanel />
          <ModeContentArea />
        </div>

        {/* Sidebar Column */}
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
