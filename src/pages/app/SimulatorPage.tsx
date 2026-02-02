import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CallSimulator from "@/components/simulator/CallSimulator";
import SMSSimulator from "@/components/simulator/SMSSimulator";
import AIBrainDebugger from "@/components/simulator/AIBrainDebugger";
import CustomerMergeQueue from "@/components/customers/CustomerMergeQueue";
import { AIReadinessChecklist } from "@/components/knowledge/AIReadinessChecklist";
import QuickSetupWizard from "@/components/setup/QuickSetupWizard";
import { DebugPagesNav } from "@/components/admin/DebugPagesNav";
import { SuggestedTestsBanner } from "@/components/simulator/SuggestedTestsBanner";
import { Phone, MessageSquare, Users, Brain, Zap, Bug } from "lucide-react";

export default function SimulatorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const showSuggested = searchParams.get("suggested") === "true";
  const [showBanner, setShowBanner] = useState(showSuggested);

  // Clear the query param after showing the banner
  useEffect(() => {
    if (showSuggested) {
      const timer = setTimeout(() => {
        setSearchParams({}, { replace: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showSuggested, setSearchParams]);

  // Determine default tab - show "call" tab when coming from onboarding
  const defaultTab = showSuggested ? "call" : "setup";

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Simulator & Setup</h1>
        <p className="text-muted-foreground mt-1.5 text-sm md:text-base">
          Test your AI with real business data and see how it processes questions
        </p>
      </div>

      {/* AI Readiness Banner */}
      <AIReadinessChecklist compact />

      {/* Suggested Tests Banner (shown after onboarding) */}
      {showBanner && (
        <SuggestedTestsBanner onDismiss={() => setShowBanner(false)} />
      )}

      {/* Tab guidance */}
      <div className="mb-4 p-4 rounded-lg bg-muted/50 border">
        <p className="text-sm text-muted-foreground">
          <strong>Choose a testing tool:</strong>
          {" "}
          <span className="text-foreground">Call Simulator</span> - Test full phone conversations with your AI
          {" • "}
          <span className="text-foreground">SMS Simulator</span> - Test text message responses
          {" • "}
          <span className="text-foreground">AI Brain Debugger</span> - See how your AI retrieves knowledge
          {" • "}
          <span className="text-foreground">Quick Setup</span> - Configure your testing environment
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="w-full justify-start flex-wrap">
          <TabsTrigger value="setup" className="gap-2">
            <Zap className="h-4 w-4" />
            Quick Setup
          </TabsTrigger>
          <TabsTrigger value="brain" className="gap-2">
            <Brain className="h-4 w-4" />
            AI Brain Debugger
          </TabsTrigger>
          <TabsTrigger value="call" className="gap-2">
            <Phone className="h-4 w-4" />
            Call Simulator
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS Simulator
          </TabsTrigger>
          <TabsTrigger value="conflicts" className="gap-2">
            <Users className="h-4 w-4" />
            Customer Conflicts
          </TabsTrigger>
          <TabsTrigger value="debug" className="gap-2">
            <Bug className="h-4 w-4" />
            Debug Pages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="mt-4">
          <QuickSetupWizard />
        </TabsContent>

        <TabsContent value="brain" className="mt-4">
          <AIBrainDebugger />
        </TabsContent>

        <TabsContent value="call" className="mt-4">
          <CallSimulator />
        </TabsContent>

        <TabsContent value="sms" className="mt-4">
          <SMSSimulator />
        </TabsContent>

        <TabsContent value="conflicts" className="mt-4">
          <CustomerMergeQueue />
        </TabsContent>

        <TabsContent value="debug" className="mt-4">
          <DebugPagesNav />
        </TabsContent>
      </Tabs>
    </div>
  );
}
