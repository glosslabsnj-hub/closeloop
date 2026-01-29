import { useAuth } from "@/contexts/AuthContext";
import { SetupWizard } from "@/components/dashboard/SetupWizard";
import { LiveDashboard } from "@/components/dashboard/LiveDashboard";

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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <span className="text-3xl">👋</span>
          </div>
          <h1 className="text-2xl font-bold">Welcome to CloseLoop</h1>
          <p className="text-muted-foreground">
            Please complete your subscription to start using your AI assistant.
          </p>
          <a 
            href="/app/go-live" 
            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-8 py-3.5 font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            Choose Your Plan
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          {setupComplete ? "Your AI agent overview" : "Complete setup to get started"}
        </p>
      </div>

      {setupComplete ? (
        <LiveDashboard />
      ) : (
        <SetupWizard onSetupComplete={refreshTenant} />
      )}
    </div>
  );
}
