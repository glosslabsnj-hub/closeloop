import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SetupWizard } from "@/components/dashboard/SetupWizard";
import { LiveDashboard } from "@/components/dashboard/LiveDashboard";
import { HowToGuide } from "@/components/dashboard/HowToGuide";
import { LayoutDashboard, BookOpen } from "lucide-react";

export default function DashboardPage() {
  const { tenant, subscription, assistantSettings, refreshTenant } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("dashboard");

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

  return (
    <div className="p-4 md:p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {activeTab === "dashboard" ? "Dashboard" : "How To Guides"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {activeTab === "dashboard" 
                ? (setupComplete ? "Your AI agent overview" : "Complete setup to get started")
                : "Step-by-step instructions to set up your AI"
              }
            </p>
          </div>
          
          <TabsList className="grid grid-cols-2 w-full sm:w-auto">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="howto" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">How To</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="mt-0">
          {setupComplete ? (
            <LiveDashboard />
          ) : (
            <SetupWizard onSetupComplete={refreshTenant} />
          )}
        </TabsContent>

        <TabsContent value="howto" className="mt-0">
          <HowToGuide />
        </TabsContent>
      </Tabs>
    </div>
  );
}
