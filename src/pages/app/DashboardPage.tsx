import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SetupWizard } from "@/components/dashboard/SetupWizard";
import { LiveDashboard } from "@/components/dashboard/LiveDashboard";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function DashboardPage() {
  const { _tenant, _subscription, assistantSettings, refreshTenant, isSuperAdmin, hasActiveSubscription } = useAuth();
  const { _canGoLive, _p0Flags, loading: _readinessLoading } = useAIReadinessV2();
  const [searchParams] = useSearchParams();

  // Fire Google Ads conversion when user returns from Stripe Checkout
  useEffect(() => {
    if (searchParams.get("activated") === "true") {
      if (typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", "conversion", {
          send_to: "AW-17970313271",
          value: 249.0,
          currency: "USD",
        });
        window.gtag("event", "trial_activated", {
          send_to: "G-FS9HB4ZQKB",
          value: 249.0,
          currency: "USD",
        });
      }
    }
  }, [searchParams]);

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
