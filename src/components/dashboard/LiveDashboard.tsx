import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { AgentControlPanel } from "./AgentControlPanel";
import { DashboardHeroMetrics } from "./DashboardHeroMetrics";
import { DashboardRecentActivity } from "./DashboardRecentActivity";
import { DashboardNeedsAttention } from "./DashboardNeedsAttention";
import { DashboardCallChart } from "./DashboardCallChart";
import { DashboardTodaySchedule } from "./DashboardTodaySchedule";
import { DashboardAIPerformance } from "./DashboardAIPerformance";
import { UnifiedAlertBanner } from "./UnifiedAlertBanner";
import { SetupProgressChecklist } from "./SetupProgressChecklist";
import { Copilot, CopilotTrigger } from "./Copilot";
import { SoundManager } from "@/components/notifications/SoundManager";
import { format } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function LiveDashboard() {
  const { tenant, assistantSettings } = useAuth();
  const { enabledModules } = useTenantConfig();
  const [copilotOpen, setCopilotOpen] = useState(false);

  const businessName = tenant?.name?.split(' ')[0] || "there";
  const greeting = getGreeting();
  const hasBooking = enabledModules.includes("booking");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Audio notification manager */}
      <SoundManager />

      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {greeting}, {businessName}!
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Here's how your business is performing today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>{format(new Date(), "EEEE, MMMM d, yyyy")}</span>
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

      {/* Schedule + AI Performance - Side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {hasBooking && <DashboardTodaySchedule />}
        <DashboardAIPerformance />
        {!hasBooking && <SetupProgressChecklist />}
      </div>

      {/* Setup Progress - Only if booking enabled */}
      {hasBooking && <SetupProgressChecklist />}

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
