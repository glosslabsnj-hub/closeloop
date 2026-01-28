import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AgentControlCard } from "./AgentControlCard";
import { QuickStatsCard } from "./QuickStatsCard";
import { RecentActivityCard } from "./RecentActivityCard";
import { QuickLinksCard } from "./QuickLinksCard";
import { DashboardByMode } from "./DashboardByMode";
import { GoLiveChecklist } from "./GoLiveChecklist";
import { UsageThresholdBanner } from "./UsageThresholdBanner";
import { Copilot, CopilotTrigger } from "./Copilot";
import { BusinessBrainStatusCard } from "./BusinessBrainStatusCard";
import { KnowledgeConflictBanner } from "./KnowledgeConflictBanner";

export function LiveDashboard() {
  const { tenant, assistantSettings } = useAuth();
  const [copilotOpen, setCopilotOpen] = useState(false);
  
  const isLive = assistantSettings?.go_live_enabled;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Knowledge Conflict Warning - Highest Priority */}
      <KnowledgeConflictBanner />

      {/* Usage Threshold Warning */}
      <UsageThresholdBanner threshold={80} />

      {/* Go Live Checklist - Show if not live yet */}
      {!isLive && <GoLiveChecklist />}

      {/* Agent Control - Primary Focus */}
      <AgentControlCard />

      {/* Mode-Specific Today View */}
      <DashboardByMode />

      {/* Two Column Layout for Brain Status & Stats */}
      <div className="grid md:grid-cols-2 gap-6">
        <BusinessBrainStatusCard />
        <QuickStatsCard />
      </div>

      {/* Two Column Layout for Activity & Links */}
      <div className="grid md:grid-cols-2 gap-6">
        <RecentActivityCard />
        <QuickLinksCard />
      </div>

      {/* Copilot */}
      {copilotOpen ? (
        <Copilot isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
      ) : (
        <CopilotTrigger onClick={() => setCopilotOpen(true)} />
      )}
    </div>
  );
}
