import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CallSimulator from "@/components/simulator/CallSimulator";
import SMSSimulator from "@/components/simulator/SMSSimulator";
import CustomerMergeQueue from "@/components/customers/CustomerMergeQueue";
import AIReadinessScore from "@/components/knowledge/AIReadinessScore";
import { Phone, MessageSquare, Users, Brain } from "lucide-react";

export default function SimulatorPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Simulator & Testing</h1>
        <p className="text-muted-foreground">
          Test the customer resolution pipeline with simulated calls and messages
        </p>
      </div>

      {/* AI Readiness Banner */}
      <AIReadinessScore compact />

      <Tabs defaultValue="call" className="w-full">
        <TabsList className="w-full justify-start">
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
          <TabsTrigger value="readiness" className="gap-2">
            <Brain className="h-4 w-4" />
            AI Readiness
          </TabsTrigger>
        </TabsList>

        <TabsContent value="call" className="mt-4">
          <CallSimulator />
        </TabsContent>

        <TabsContent value="sms" className="mt-4">
          <SMSSimulator />
        </TabsContent>

        <TabsContent value="conflicts" className="mt-4">
          <CustomerMergeQueue />
        </TabsContent>

        <TabsContent value="readiness" className="mt-4">
          <AIReadinessScore />
        </TabsContent>
      </Tabs>
    </div>
  );
}
