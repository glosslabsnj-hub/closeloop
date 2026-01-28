import { useAuth } from "@/contexts/AuthContext";
import { SetupWizard } from "@/components/dashboard/SetupWizard";
import { LiveDashboard } from "@/components/dashboard/LiveDashboard";

export default function DashboardPage() {
  const { tenant, subscription, assistantSettings, refreshTenant } = useAuth();

  // Determine if setup is complete
  // Setup is complete when: go_live_enabled = true OR setup_completed_at is set
  const setupComplete = 
    assistantSettings?.go_live_enabled === true || 
    !!(assistantSettings as any)?.setup_completed_at;

  // If no subscription, show basic welcome (they need to pick a plan first)
  if (!subscription) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold">Welcome to CloseLoop</h1>
          <p className="text-muted-foreground">
            Please complete your subscription to start using your AI assistant.
          </p>
          <a 
            href="/app/go-live" 
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90 transition-colors"
          >
            Choose Your Plan
          </a>
        </div>
      </div>
    );
  }

  // Show setup wizard if not complete, otherwise show live dashboard
  return (
    <div className="p-4 md:p-6">
      {setupComplete ? (
        <LiveDashboard />
      ) : (
        <SetupWizard onSetupComplete={refreshTenant} />
      )}
    </div>
  );
}
