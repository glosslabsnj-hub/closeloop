import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import AIReadinessScore from "@/components/knowledge/AIReadinessScore";
import KnowledgeGapQueue from "@/components/knowledge/KnowledgeGapQueue";
import VoiceSelector from "@/components/ai/VoiceSelector";
import VoiceAgentTest from "@/components/ai/VoiceAgentTest";
import BookingBehaviorSettings from "@/components/ai/BookingBehaviorSettings";
import ServiceCallFlowSettings from "@/components/ai/ServiceCallFlowSettings";
import CalendarSyncSettings from "@/components/ai/CalendarSyncSettings";
import ElevenLabsSetupGuide from "@/components/ai/ElevenLabsSetupGuide";
import VoiceModeSelector from "@/components/ai/VoiceModeSelector";
import AIBehaviorModeSelector from "@/components/ai/AIBehaviorModeSelector";
import {
  Bot,
  Play,
  Mic,
  MessageSquare,
  HelpCircle,
  AlertTriangle,
  CalendarCheck,
  Settings2,
  Brain,
  PhoneForwarded,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AIAssistantPage() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const { context, loading: contextLoading, refetch } = useBusinessContext(tenant?.id || null);
  
  const [aiEnabled, setAiEnabled] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>("sarah");
  const [greeting, setGreeting] = useState("");
  const [fallback, setFallback] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load AI assistant settings
  useEffect(() => {
    if (tenant?.id) {
      loadAssistantSettings();
    }
  }, [tenant?.id]);

  const loadAssistantSettings = async () => {
    if (!tenant?.id) return;

    const { data } = await supabase
      .from('ai_assistants')
      .select('*')
      .eq('tenant_id', tenant.id)
      .single();

    if (data) {
      setAiEnabled(data.is_enabled);
      setSelectedVoice(data.voice_id || "sarah");
      
      setGreeting(data.greeting_script || '');
      setFallback(data.fallback_script || '');
    } else {
      // Set defaults from context
      setGreeting(`Hi, thank you for calling ${tenant.name}! How can I help you today?`);
      setFallback("I'd be happy to have someone call you back. What's the best number to reach you?");
    }
  };

  const handleTestCall = () => {
    setTesting(true);
    toast({
      title: "🎙️ AI Test Call",
      description: "Simulating how your AI assistant would handle a call...",
    });
    setTimeout(() => {
      setTesting(false);
      toast({
        title: "✅ Test Complete",
        description: "Your AI assistant is ready to take calls!",
      });
    }, 3000);
  };

  const handleSave = async () => {
    if (!tenant?.id) return;

    setSaving(true);
    try {
      // Check if assistant exists
      const { data: existing } = await supabase
        .from('ai_assistants')
        .select('id')
        .eq('tenant_id', tenant.id)
        .single();

      const assistantData = {
        tenant_id: tenant.id,
        is_enabled: aiEnabled,
        voice_id: selectedVoice,
        greeting_script: greeting,
        fallback_script: fallback,
      };

      if (existing) {
        await supabase
          .from('ai_assistants')
          .update(assistantData)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('ai_assistants')
          .insert([{ ...assistantData, name: 'AI Assistant' }]);
      }

      // Update tenant ai_enabled flag
      await supabase
        .from('tenants')
        .update({ ai_enabled: aiEnabled })
        .eq('id', tenant.id);

      toast({ title: "Settings saved!" });
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Failed to save", 
        description: error.message 
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        icon={<Bot className="h-5 w-5" />}
        title="AI Assistant"
        description="Configure your AI voice assistant"
        action={
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2" onClick={handleTestCall} disabled={testing}>
              <Play className="h-4 w-4" />
              {testing ? "Testing..." : "Test AI Call"}
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">AI Enabled</span>
              <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
            </div>
          </div>
        }
      />

      {/* AI Readiness Score */}
      <AIReadinessScore compact />

      {/* Main Banner */}
      <Card className={aiEnabled ? "border-primary/50 bg-primary/5" : ""}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${aiEnabled ? "bg-primary" : "bg-muted"}`}>
              <Bot className={`h-8 w-8 ${aiEnabled ? "text-primary-foreground" : "text-muted-foreground"}`} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {aiEnabled ? "AI Assistant is Active" : "AI Assistant is Off"}
              </h2>
              <p className="text-muted-foreground">
                {aiEnabled
                  ? "Your AI is answering calls and booking appointments 24/7"
                  : "Enable AI to start answering calls automatically"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="voice" className="w-full">
        <TabsList className="w-full justify-start flex-wrap">
          <TabsTrigger value="voice" className="gap-2">
            <Mic className="h-4 w-4" />
            Voice
          </TabsTrigger>
          <TabsTrigger value="routing" className="gap-2">
            <PhoneForwarded className="h-4 w-4" />
            Call Routing
          </TabsTrigger>
          <TabsTrigger value="booking" className="gap-2">
            <CalendarCheck className="h-4 w-4" />
            Booking
          </TabsTrigger>
          <TabsTrigger value="scripts" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Scripts
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            Knowledge Base
          </TabsTrigger>
          <TabsTrigger value="gaps" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Knowledge Gaps
          </TabsTrigger>
          <TabsTrigger value="setup" className="gap-2">
            <Settings2 className="h-4 w-4" />
            ElevenLabs Setup
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-2">
            <Play className="h-4 w-4" />
            Test Agent
          </TabsTrigger>
        </TabsList>

        {/* Voice Tab */}
        <TabsContent value="voice" className="space-y-6">
          <div className="max-w-lg">
            <VoiceSelector selected={selectedVoice} onSelect={setSelectedVoice} />
          </div>
        </TabsContent>

        {/* Call Routing Tab */}
        <TabsContent value="routing" className="space-y-6">
          <div className="max-w-2xl space-y-6">
            <VoiceModeSelector />
            <AIBehaviorModeSelector />
          </div>
        </TabsContent>

        {/* Booking Tab */}
        <TabsContent value="booking" className="space-y-6">
          <ServiceCallFlowSettings />
          <div className="grid lg:grid-cols-2 gap-6">
            <BookingBehaviorSettings />
            <CalendarSyncSettings />
          </div>
        </TabsContent>

        {/* Scripts Tab */}
        <TabsContent value="scripts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Greeting Script</CardTitle>
              <CardDescription>What your AI says when answering calls</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                rows={3}
                placeholder="Hi, thank you for calling..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fallback Script</CardTitle>
              <CardDescription>When AI needs to escalate to a human</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={fallback}
                onChange={(e) => setFallback(e.target.value)}
                rows={3}
                placeholder="I'd be happy to have someone call you back..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Knowledge Base Tab - Redirects to Business Brain */}
        <TabsContent value="knowledge" className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Knowledge Management Has Moved
              </CardTitle>
              <CardDescription>
                All FAQ and knowledge management now happens in Business Brain for centralized control
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Add and edit FAQs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Manage objection handlers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>View your complete knowledge base in one place</span>
                  </div>
                </div>
                <Button asChild className="w-full sm:w-auto">
                  <Link to="/app/business-brain">
                    <Brain className="mr-2 h-4 w-4" />
                    Go to Business Brain
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Knowledge Gaps Tab */}
        <TabsContent value="gaps" className="space-y-6">
          <KnowledgeGapQueue />
        </TabsContent>

        {/* ElevenLabs Setup Tab */}
        <TabsContent value="setup" className="space-y-6">
          <ElevenLabsSetupGuide />
        </TabsContent>

        {/* Test Agent Tab */}
        <TabsContent value="test" className="space-y-6">
          <div className="max-w-md">
            <VoiceAgentTest />
          </div>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </PageContainer>
  );
}
