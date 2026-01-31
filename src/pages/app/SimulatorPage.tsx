import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CallSimulator from "@/components/simulator/CallSimulator";
import SMSSimulator from "@/components/simulator/SMSSimulator";
import AIBrainDebugger from "@/components/simulator/AIBrainDebugger";
import CustomerMergeQueue from "@/components/customers/CustomerMergeQueue";
import { AIReadinessChecklist } from "@/components/knowledge/AIReadinessChecklist";
import QuickSetupWizard from "@/components/setup/QuickSetupWizard";
import { DebugPagesNav } from "@/components/admin/DebugPagesNav";
import { Phone, MessageSquare, Users, Brain, Zap, Bug } from "lucide-react";

export default function SimulatorPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Simulator & Setup</h1>
        <p className="text-muted-foreground">
          Test your AI with real business data and see how it processes questions
        </p>
      </div>

      {/* AI Readiness Banner */}
      <AIReadinessChecklist compact />

      <Tabs defaultValue="setup" className="w-full">
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
