import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { AgentControlPanel } from "./AgentControlPanel";
import { BusynessSliderWidget } from "./BusynessSliderWidget";
import { MetricsGrid } from "./MetricsGrid";
import { NeedsAttentionBanner } from "./NeedsAttentionBanner";
import { LiveActivityFeed } from "./LiveActivityFeed";
import { UnifiedAlertBanner } from "./UnifiedAlertBanner";
import { Copilot, CopilotTrigger } from "./Copilot";
import { SetupProgressChecklist } from "./SetupProgressChecklist";
import { ROIPerformanceWidget } from "./ROIPerformanceWidget";
import { LeadRecoveryWidget } from "./LeadRecoveryWidget";
import { SoundManager } from "@/components/notifications/SoundManager";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function LiveDashboard() {
  const { tenant, assistantSettings } = useAuth();
  const { businessMode } = useTenantConfig();
  const caps = useCapabilities();
  const [copilotOpen, setCopilotOpen] = useState(false);

  const businessName = tenant?.name?.split(' ')[0] || "there";
  const greeting = getGreeting();
  
  // Lead Recovery is not relevant for dispatch businesses
  const showLeadRecovery = !caps.isDispatchBusiness;

  // Busyness slider is only relevant for businesses that quote ETAs
  // - Dispatch/Food: Always (ETA is core to the flow)
  // - Service with urgency_check/dispatch_first: Yes (same-day/emergency dispatch)
  // - Service with schedule_first: No (appointments are scheduled ahead)
  // - If same_day_enabled: Yes (they offer same-day service)
  const showBusynessSlider = useMemo(() => {
    // Always show for dispatch and food - ETAs are core
    if (caps.isDispatchBusiness || caps.isFoodBusiness) return true;
    
    // For service/medical/general, only show if same-day/urgent flow is enabled
    const flow = assistantSettings?.service_default_flow;
    const sameDayEnabled = assistantSettings?.same_day_enabled;
    
    if (flow === "urgency_check" || flow === "dispatch_first") return true;
    if (sameDayEnabled) return true;
    
    // Default: hide for appointment-first businesses (salons, etc.)
    return false;
  }, [caps, assistantSettings?.service_default_flow, assistantSettings?.same_day_enabled]);

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

      {/* Busyness Quick Adjust - Only show for ETA-relevant businesses */}
      {showBusynessSlider && <BusynessSliderWidget />}

      {/* Performance Widgets - Conditional layout based on business mode */}
      {showLeadRecovery ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <ROIPerformanceWidget />
          <LeadRecoveryWidget />
        </div>
      ) : (
        <ROIPerformanceWidget />
      )}

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
