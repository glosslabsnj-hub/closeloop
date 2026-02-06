import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { AgentControlPanel } from "./AgentControlPanel";
import { DashboardHeroMetrics } from "./DashboardHeroMetrics";
import { DashboardRecentActivity } from "./DashboardRecentActivity";
import { DashboardNeedsAttention } from "./DashboardNeedsAttention";
import { DashboardCallChart } from "./DashboardCallChart";
import { DashboardTodaySchedule } from "./DashboardTodaySchedule";
import { DashboardActiveWork } from "./DashboardActiveWork";
import { DashboardAIPerformance } from "./DashboardAIPerformance";
import { UnifiedAlertBanner } from "./UnifiedAlertBanner";
import { SetupProgressChecklist } from "./SetupProgressChecklist";
import { Copilot, CopilotTrigger } from "./Copilot";
import { SoundManager } from "@/components/notifications/SoundManager";
import { PageTransition } from "@/components/ui/page-transition";
import { useState } from "react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function LiveDashboard() {
  const { tenant } = useAuth();
  const { enabledModules, businessMode } = useTenantConfig();
  const [copilotOpen, setCopilotOpen] = useState(false);

  const businessName = tenant?.name || "there";
  const greeting = getGreeting();
  const hasBooking = enabledModules.includes("booking");
  const showActiveWork = businessMode === "food" || businessMode === "dispatch";
  const showSchedule = hasBooking && !showActiveWork;

  return (
    <PageTransition className="space-y-8">
      {/* Audio notification manager */}
      <SoundManager />

      {/* Header with greeting */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {greeting}, {businessName} 👋
          </h1>
        </div>
      </header>

      {/* Alerts - Only show if there are issues */}
      <UnifiedAlertBanner />

      {/* Hero Metrics - 4 column grid */}
      <DashboardHeroMetrics />

      {/* Agent Control - Quick toggle */}
      <AgentControlPanel />

      {/* Activity + Attention - Side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardRecentActivity />
        <DashboardNeedsAttention />
      </div>

      {/* Call Volume Chart */}
      <DashboardCallChart />

      {/* Schedule / Active Work + AI Performance - Side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {showActiveWork && <DashboardActiveWork />}
        {showSchedule && <DashboardTodaySchedule />}
        <DashboardAIPerformance />
        {!showActiveWork && !showSchedule && <SetupProgressChecklist />}
      </div>

      {/* Setup Progress - Only if not already shown */}
      {(showActiveWork || showSchedule) && <SetupProgressChecklist />}

      {/* Copilot FAB */}
      <div className="fixed bottom-6 right-6 z-30 md:bottom-8 md:right-8">
        {copilotOpen ? (
          <Copilot isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
        ) : (
          <CopilotTrigger onClick={() => setCopilotOpen(true)} />
        )}
      </div>
    </PageTransition>
  );
}
