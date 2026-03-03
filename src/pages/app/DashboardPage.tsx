import { useAuth } from "@/contexts/AuthContext";
import { SetupWizard } from "@/components/dashboard/SetupWizard";
import { LiveDashboard } from "@/components/dashboard/LiveDashboard";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function DashboardPage() {
  const { _tenant, _subscription, assistantSettings, refreshTenant, isSuperAdmin, hasActiveSubscription } = useAuth();
  const { _canGoLive, _p0Flags, loading: _readinessLoading } = useAIReadinessV2();

  const setupComplete =
    isSuperAdmin ||
    assistantSettings?.go_live_enabled === true ||
    !!assistantSettings?.setup_completed_at;

  // No subscription — handled inside LiveDashboard's AgentControlPanel
  if (!hasActiveSubscription && !isSuperAdmin) {
    return (
      <PageContainer maxWidth="xl">
        <div className="pt-8">
          <ErrorBoundary context="loading your dashboard">
            <LiveDashboard />
          </ErrorBoundary>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="xl">
      <div className="pt-8">
        <ErrorBoundary context="loading your dashboard">
          {setupComplete ? (
            <LiveDashboard />
          ) : (
            <SetupWizard onSetupComplete={refreshTenant} />
          )}
        </ErrorBoundary>
      </div>
    </PageContainer>
  );
}
