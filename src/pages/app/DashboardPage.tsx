import { useAuth } from "@/contexts/AuthContext";
import { SetupWizard } from "@/components/dashboard/SetupWizard";
import { LiveDashboard } from "@/components/dashboard/LiveDashboard";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, LayoutDashboard } from "lucide-react";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";

export default function DashboardPage() {
  const { tenant, subscription, assistantSettings, refreshTenant, isSuperAdmin, hasActiveSubscription } = useAuth();
  const { canGoLive, p0Flags, loading: readinessLoading } = useAIReadinessV2();

  // Super admins always bypass setup wizard - they can access the live dashboard directly
  const setupComplete =
    isSuperAdmin ||
    assistantSettings?.go_live_enabled === true ||
    !!assistantSettings?.setup_completed_at;

  // For status badge: super admins show as "Admin Mode", otherwise show live status
  const isActuallyLive = !isSuperAdmin && setupComplete && canGoLive && p0Flags.length === 0;

  // Super admins always bypass subscription gating - don't show "Choose Plan" screen
  // Only show for non-admins without an active subscription
  if (!hasActiveSubscription && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] p-8">
        <div className="text-center space-y-5 max-w-sm">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-xl">👋</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Welcome to CloseLoop
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Complete your subscription to start using your AI assistant.
            </p>
          </div>
          <Button asChild size="lg">
            <a href="/app/go-live">
              <CreditCard className="mr-2 h-4 w-4" />
              Choose Your Plan
            </a>
          </Button>
        </div>
      </div>
    );
  }

  // Status badge
  const statusBadge = (() => {
    if (readinessLoading) return null;

    // Super admins see an "Admin Mode" badge
    if (isSuperAdmin) {
      return (
        <Badge variant="secondary" size="sm" className="gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Admin Mode
        </Badge>
      );
    }

    if (isActuallyLive) {
      return (
        <Badge variant="success" size="sm" className="gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          Live
        </Badge>
      );
    }

    if (setupComplete && !isActuallyLive) {
      return (
        <Badge variant="outline" size="sm" className="border-warning/30 text-warning">
          Setup Incomplete
        </Badge>
      );
    }

    return null;
  })();

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        icon={<LayoutDashboard className="h-5 w-5" />}
        title="Dashboard"
        description={setupComplete ? "Your AI agent at a glance" : "Complete setup to get started"}
        badge={statusBadge}
      />

      {setupComplete ? (
        <LiveDashboard />
      ) : (
        <SetupWizard onSetupComplete={refreshTenant} />
      )}
    </PageContainer>
  );
}
