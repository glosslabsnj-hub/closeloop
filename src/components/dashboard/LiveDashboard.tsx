import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardHeroCard } from "./DashboardHeroCard";
import { PhoneNumberCard } from "./PhoneNumberCard";
import { KnowledgeStatusBar } from "./KnowledgeStatusBar";
import { TeachAISection } from "./TeachAISection";
import { ActivityFeed } from "./ActivityFeed";
import { QuickLinksCard } from "./QuickLinksCard";
import { GoLiveChecklist } from "./GoLiveChecklist";
import { UsageThresholdBanner } from "./UsageThresholdBanner";
import { Copilot, CopilotTrigger } from "./Copilot";
import { KnowledgeConflictBanner } from "./KnowledgeConflictBanner";
import { AutomationStatusCard } from "./AutomationStatusCard";
import { hasVoiceFeature } from "@/config/pricing";

export function LiveDashboard() {
  const { tenant, assistantSettings, subscription } = useAuth();
  const [copilotOpen, setCopilotOpen] = useState(false);
  
  const isLive = assistantSettings?.go_live_enabled;
  const hasVoice = hasVoiceFeature(subscription?.plan_code);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Critical Banners - Stacked at top */}
      <KnowledgeConflictBanner />
      <UsageThresholdBanner threshold={80} />

      {/* HERO: Agent Status + Key Stats (full width) */}
      <DashboardHeroCard />

      {/* Phone Number Card - Prominent for Voice plans */}
      {hasVoice && <PhoneNumberCard />}

      {/* Knowledge Status Bar - Always visible AI readiness */}
      <KnowledgeStatusBar />

      {/* Teach AI Section - Upload + Quick Add */}
      <TeachAISection />

      {/* Two Column: Activity Feed + Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <ActivityFeed />
        <div className="space-y-6">
          <AutomationStatusCard />
          <QuickLinksCard />
        </div>
      </div>

      {/* Go-Live Checklist - Only show when not live */}
      {!isLive && <GoLiveChecklist />}

      {/* Copilot FAB */}
      {copilotOpen ? (
        <Copilot isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
      ) : (
        <CopilotTrigger onClick={() => setCopilotOpen(true)} />
      )}
    </div>
  );
}
