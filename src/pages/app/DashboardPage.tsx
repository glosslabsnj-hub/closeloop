import { useAuth } from "@/contexts/AuthContext";
import { SetupWizard } from "@/components/dashboard/SetupWizard";
import { LiveDashboard } from "@/components/dashboard/LiveDashboard";
import { WelcomeSetupChecklist } from "@/components/dashboard/WelcomeSetupChecklist";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, LayoutDashboard } from "lucide-react";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import { useState } from "react";

export default function DashboardPage() {
  const { tenant, subscription, assistantSettings, refreshTenant } = useAuth();
  const { canGoLive, p0Flags, loading: readinessLoading } = useAIReadinessV2();
  const [setupSkipped, setSetupSkipped] = useState(false);

  const setupComplete =
    assistantSettings?.go_live_enabled === true ||
    !!(assistantSettings as any)?.setup_completed_at;

  const isActuallyLive = setupComplete && canGoLive && p0Flags.length === 0;

  // Check if we should show the welcome checklist (new users without setup)
  const showWelcomeChecklist = !setupComplete && !setupSkipped;

  // No subscription - show welcome
  if (!subscription) {
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
        <Badge variant="outline" size="sm" className="border-amber-500/30 text-amber-500">
          Setup Incomplete
        </Badge>
      );
    }

    return null;
  })();

  // Show welcome checklist for new users
  if (showWelcomeChecklist) {
    return (
      <PageContainer maxWidth="lg">
        <div className="py-8">
          <WelcomeSetupChecklist onSkip={() => setSetupSkipped(true)} />
        </div>
      </PageContainer>
    );
  }

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
