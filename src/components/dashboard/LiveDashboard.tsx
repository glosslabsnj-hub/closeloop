import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AgentControlPanel } from "./AgentControlPanel";
import { NeedsAttentionBanner } from "./NeedsAttentionBanner";
import { CompleteProfileBanner } from "./CompleteProfileBanner";
import { LiveActivityFeed } from "./LiveActivityFeed";
import { UnifiedAlertBanner } from "./UnifiedAlertBanner";
import { SystemHealthBanner } from "./SystemHealthBanner";
import { ModeContentArea } from "./ModeContentArea";
import { MetricsGrid } from "./MetricsGrid";
import { SoundManager } from "@/components/notifications/SoundManager";
import { EmptyDashboard } from "./EmptyDashboard";
import ErrorBoundary from "@/components/ErrorBoundary";

export function LiveDashboard() {
  const { tenant, isSuperAdmin } = useAuth();

  // Check if tenant has any call sessions
  const { data: hasCallData, isLoading } = useQuery({
    queryKey: ["has-call-data-dashboard", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return false;
      const { count } = await supabase
        .from("ai_call_sessions")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .limit(1);
      return (count || 0) > 0;
    },
    enabled: !!tenant?.id,
  });

  // Show empty dashboard for new tenants (skip for super admins who may be testing)
  if (!isLoading && !hasCallData && !isSuperAdmin) {
    return <EmptyDashboard />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SoundManager />

      {/* Agent Status */}
      <ErrorBoundary context="loading agent status">
        <AgentControlPanel />
      </ErrorBoundary>

      {/* System Health */}
      <ErrorBoundary context="loading system health">
        <SystemHealthBanner />
      </ErrorBoundary>

      {/* Alerts (only when present) */}
      <ErrorBoundary context="loading alerts">
        <UnifiedAlertBanner />
        <CompleteProfileBanner />
        <NeedsAttentionBanner />
      </ErrorBoundary>

      {/* Key Metrics */}
      <ErrorBoundary context="loading your metrics">
        <MetricsGrid />
      </ErrorBoundary>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6 min-w-0">
          <ErrorBoundary context="loading your content">
            <ModeContentArea />
          </ErrorBoundary>
        </div>
        <div className="space-y-6 min-w-0">
          <ErrorBoundary context="loading recent activity">
            <LiveActivityFeed />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
