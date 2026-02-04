import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import CallSimulator from "@/components/simulator/CallSimulator";
import SMSSimulator from "@/components/simulator/SMSSimulator";
import AIBrainDebugger from "@/components/simulator/AIBrainDebugger";
import CustomerMergeQueue from "@/components/customers/CustomerMergeQueue";
import { ReadinessQuickFix } from "@/components/simulator/ReadinessQuickFix";
import QuickSetupWizard from "@/components/setup/QuickSetupWizard";
import { DebugPagesNav } from "@/components/admin/DebugPagesNav";
import { SuggestedTestsBanner } from "@/components/simulator/SuggestedTestsBanner";
import { Phone, MessageSquare, Users, Brain, Zap, Bug, FlaskConical } from "lucide-react";

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
    <PageContainer maxWidth="xl">
      <PageHeader
        icon={<FlaskConical className="h-5 w-5" />}
        title="Simulator & Setup"
        description="Test your AI with real business data and see how it processes questions"
      />

      {/* AI Readiness Quick Fix - Shows next recommended action */}
      <ReadinessQuickFix />

      {/* Suggested Tests Banner (shown after onboarding) */}
      {showBanner && (
        <SuggestedTestsBanner onDismiss={() => setShowBanner(false)} />
      )}

      {/* Tab guidance - simplified */}
      <div className="mb-4 p-4 rounded-lg bg-muted/50 border border-white/[0.06]">
        <p className="text-sm text-muted-foreground mb-1">
          <strong>Testing tools available:</strong>
        </p>
        <div className="text-sm text-muted-foreground grid grid-cols-1 sm:grid-cols-2 gap-1">
          <span><span className="text-foreground font-medium">Call Simulator</span> — Test full phone conversations</span>
          <span><span className="text-foreground font-medium">SMS Simulator</span> — Test text message responses</span>
          <span><span className="text-foreground font-medium">AI Brain Debugger</span> — See how your AI retrieves knowledge</span>
          <span><span className="text-foreground font-medium">Quick Setup</span> — Configure your testing environment</span>
        </div>
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
            Duplicate Contacts
          </TabsTrigger>
          <TabsTrigger value="debug" className="gap-2" title="Advanced tools for technical troubleshooting">
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
    </PageContainer>
  );
}
