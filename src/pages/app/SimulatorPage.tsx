import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import VoiceAgentTest from "@/components/ai/VoiceAgentTest";
import SMSSimulator from "@/components/simulator/SMSSimulator";
import AIBrainDebugger from "@/components/simulator/AIBrainDebugger";
import TextConversationSimulator from "@/components/simulator/TextConversationSimulator";
import { SuggestedTestsBanner } from "@/components/simulator/SuggestedTestsBanner";
import { Phone, MessageSquare, Brain, MessageCircle } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function SimulatorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const showSuggested = searchParams.get("suggested") === "true";
  const [showBanner, setShowBanner] = useState(showSuggested);

  useEffect(() => {
    if (showSuggested) {
      const timer = setTimeout(() => {
        setSearchParams({}, { replace: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showSuggested, setSearchParams]);

  const defaultTab = showSuggested ? "call" : "call";

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="Test Your AI"
        description="Test how your AI handles calls and questions using real business data"
      />

      {showBanner && (
        <SuggestedTestsBanner onDismiss={() => setShowBanner(false)} />
      )}

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          <TabsTrigger value="call" className="gap-2">
            <Phone className="h-4 w-4" />
            Call Test
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS Test
          </TabsTrigger>
          <TabsTrigger value="text" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Text Test
          </TabsTrigger>
          <TabsTrigger value="brain" className="gap-2">
            <Brain className="h-4 w-4" />
            Knowledge Check
          </TabsTrigger>
        </TabsList>

        <TabsContent value="call" className="mt-4">
          <ErrorBoundary context="loading simulator">
            <VoiceAgentTest />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="sms" className="mt-4">
          <ErrorBoundary context="loading simulator">
            <SMSSimulator />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="text" className="mt-4">
          <ErrorBoundary context="loading simulator">
            <TextConversationSimulator />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="brain" className="mt-4">
          <ErrorBoundary context="loading simulator">
            <AIBrainDebugger />
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
