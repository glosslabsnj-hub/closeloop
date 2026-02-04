import { useAuth } from "@/contexts/AuthContext";
import { SetupWizard } from "@/components/dashboard/SetupWizard";
import { LiveDashboard } from "@/components/dashboard/LiveDashboard";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";

export default function DashboardPage() {
  const { tenant, subscription, assistantSettings, refreshTenant } = useAuth();
  const { canGoLive, p0Flags, loading: readinessLoading } = useAIReadinessV2();

  // Determine if setup is complete (check both old flag AND readiness)
  const setupComplete =
    assistantSettings?.go_live_enabled === true ||
    !!(assistantSettings as any)?.setup_completed_at;

  // Agent is truly live only if setup complete AND no P0 blockers
  const isActuallyLive = setupComplete && canGoLive && p0Flags.length === 0;

  // If no subscription, show calm welcome
  if (!subscription) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-8">
        <div className="text-center space-y-6 max-w-md animate-fade-in">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted/40 mb-6">
            <span className="text-xl">👋</span>
          </div>
          <h1 className="text-xl font-normal tracking-tight text-foreground/90">
            Welcome to CloseLoop
          </h1>
          <p className="text-muted-foreground/60 text-sm leading-relaxed">
            Complete your subscription to start using your AI assistant.
          </p>
          <Button asChild size="lg" className="mt-2">
            <a href="/app/go-live">
              <CreditCard className="mr-2 h-4 w-4" />
              Choose Your Plan
            </a>
          </Button>
        </div>
      </div>
    );
  }

  // Show appropriate badge based on actual status
  const renderStatusBadge = () => {
    if (readinessLoading) return null;
    
    if (isActuallyLive) {
      return (
        <Badge variant="success" size="sm">
          <span className="status-dot status-dot-live mr-1.5" />
          Live
        </Badge>
      );
    }
    
    if (setupComplete && !isActuallyLive) {
      // Setup done but blockers exist
      return (
        <Badge variant="outline" size="sm" className="border-amber-500/50 text-amber-500">
          Setup Incomplete
        </Badge>
      );
    }
    
    return null;
  };

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Dashboard"
        description={setupComplete ? "Your AI agent at a glance" : "Complete setup to get started"}
        editorial
        badge={renderStatusBadge()}
      />

      {setupComplete ? (
        <LiveDashboard />
      ) : (
        <SetupWizard onSetupComplete={refreshTenant} />
      )}
    </PageContainer>
  );
}
