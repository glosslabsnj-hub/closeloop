import { useAuth } from "@/contexts/AuthContext";
import { SetupWizard } from "@/components/dashboard/SetupWizard";
import { LiveDashboard } from "@/components/dashboard/LiveDashboard";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

export default function DashboardPage() {
  const { tenant, subscription, assistantSettings, refreshTenant } = useAuth();

  // Determine if setup is complete
  const setupComplete =
    assistantSettings?.go_live_enabled === true ||
    !!(assistantSettings as any)?.setup_completed_at;

  // If no subscription, show basic welcome
  if (!subscription) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="text-center space-y-5 max-w-md animate-fade-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-hero shadow-glow mb-4">
            <span className="text-3xl">👋</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to CloseLoop</h1>
          <p className="text-muted-foreground text-base">
            Please complete your subscription to start using your AI assistant.
          </p>
          <Button asChild size="lg" className="shadow-soft">
            <a href="/app/go-live">
              <CreditCard className="mr-2 h-4 w-4" />
              Choose Your Plan
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Dashboard"
        description={setupComplete ? "Your AI agent overview" : "Complete setup to get started"}
        badge={
          setupComplete && (
            <Badge variant="outline" className="gap-1.5">
              <span className="status-dot status-dot-live" />
              Live
            </Badge>
          )
        }
      />

      {setupComplete ? (
        <LiveDashboard />
      ) : (
        <SetupWizard onSetupComplete={refreshTenant} />
      )}
    </PageContainer>
  );
}
