import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AgentControlPanel } from "./AgentControlPanel";
import { MetricsGrid } from "./MetricsGrid";
import { NeedsAttentionBanner } from "./NeedsAttentionBanner";
import { LiveActivityFeed } from "./LiveActivityFeed";
import { UnifiedAlertBanner } from "./UnifiedAlertBanner";
import { Copilot, CopilotTrigger } from "./Copilot";
import { SetupProgressChecklist } from "./SetupProgressChecklist";
import { SoundManager } from "@/components/notifications/SoundManager";
import { format } from "date-fns";

export function LiveDashboard() {
  const { tenant, assistantSettings } = useAuth();
  const [copilotOpen, setCopilotOpen] = useState(false);

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const today = format(new Date(), "EEEE, MMMM d");

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* Audio notification manager */}
      <SoundManager />

      {/* Welcome Header */}
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          {greeting}{tenant?.name ? `, ${tenant.name.split(' ')[0]}` : ""}
        </h1>
        <p className="text-muted-foreground text-sm">
          {today} • Here's how your business is doing
        </p>
      </header>

      {/* Alerts - Only show if there are issues */}
      <UnifiedAlertBanner />

      {/* Agent Control */}
      <section>
        <AgentControlPanel />
      </section>

      {/* Attention Items */}
      <NeedsAttentionBanner />

      {/* Metrics */}
      <section>
        <MetricsGrid />
      </section>

      {/* Main Content */}
      <section className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <LiveActivityFeed />
        </div>
        <div className="lg:col-span-2">
          <SetupProgressChecklist />
        </div>
      </section>

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
