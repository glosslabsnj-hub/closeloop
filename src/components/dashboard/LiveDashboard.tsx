import { useAuth } from "@/contexts/AuthContext";
import { AgentControlCard } from "./AgentControlCard";
import { QuickStatsCard } from "./QuickStatsCard";
import { RecentActivityCard } from "./RecentActivityCard";
import { QuickLinksCard } from "./QuickLinksCard";
import { DashboardByMode } from "./DashboardByMode";

export function LiveDashboard() {
  const { tenant } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Agent Control - Primary Focus */}
      <AgentControlCard />

      {/* Mode-Specific Today View */}
      <DashboardByMode />

      {/* Stats Overview */}
      <QuickStatsCard />

      {/* Two Column Layout for Activity & Links */}
      <div className="grid md:grid-cols-2 gap-6">
        <RecentActivityCard />
        <QuickLinksCard />
      </div>
    </div>
  );
}
