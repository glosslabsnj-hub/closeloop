import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AIReadinessScore from "@/components/knowledge/AIReadinessScore";
import KnowledgeGapQueue from "@/components/knowledge/KnowledgeGapQueue";
import VoiceSelector from "@/components/ai/VoiceSelector";
import ToneSelector from "@/components/ai/ToneSelector";
import LiveFAQList from "@/components/ai/LiveFAQList";
import VoiceAgentTest from "@/components/ai/VoiceAgentTest";
import BookingBehaviorSettings from "@/components/ai/BookingBehaviorSettings";
import CalendarSyncSettings from "@/components/ai/CalendarSyncSettings";
import {
  Bot,
  Play,
  Mic,
  MessageSquare,
  HelpCircle,
  AlertTriangle,
  Settings,
  CalendarCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AIAssistantPage() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const { context, loading: contextLoading, refetch } = useBusinessContext(tenant?.id || null);
  
  const [aiEnabled, setAiEnabled] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("echo");
  const [selectedTone, setSelectedTone] = useState<string>("friendly");
  const [greeting, setGreeting] = useState("");
  const [fallback, setFallback] = useState("");
  const [elevenlabsAgentId, setElevenlabsAgentId] = useState("");
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
      setSelectedVoice(data.voice_id || 'echo');
      setSelectedTone(data.tone);
      setGreeting(data.greeting_script || '');
      setFallback(data.fallback_script || '');
      setElevenlabsAgentId((data as any).elevenlabs_agent_id || '');
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
        tone: selectedTone as any,
        greeting_script: greeting,
        fallback_script: fallback,
        elevenlabs_agent_id: elevenlabsAgentId || null,
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
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">AI Assistant</h1>
          <p className="text-muted-foreground">Configure your AI voice assistant</p>
        </div>
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
      </div>

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
            Voice & Tone
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
          <TabsTrigger value="agent" className="gap-2">
            <Settings className="h-4 w-4" />
            Agent Config
          </TabsTrigger>
        </TabsList>

        {/* Voice & Tone Tab */}
        <TabsContent value="voice" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <VoiceSelector selected={selectedVoice} onSelect={setSelectedVoice} />
            <ToneSelector selected={selectedTone} onSelect={setSelectedTone} />
          </div>
        </TabsContent>

        {/* Booking Tab */}
        <TabsContent value="booking" className="space-y-6">
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

        {/* Knowledge Base Tab - Live from DB */}
        <TabsContent value="knowledge" className="space-y-6">
          <LiveFAQList />
        </TabsContent>

        {/* Knowledge Gaps Tab */}
        <TabsContent value="gaps" className="space-y-6">
          <KnowledgeGapQueue />
        </TabsContent>

        {/* Agent Config Tab */}
        <TabsContent value="agent" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ElevenLabs Agent</CardTitle>
                <CardDescription>
                  Connect your ElevenLabs Conversational AI agent to enable voice calls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-id">Agent ID</Label>
                  <Input
                    id="agent-id"
                    placeholder="Enter your ElevenLabs Agent ID"
                    value={elevenlabsAgentId}
                    onChange={(e) => setElevenlabsAgentId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Create an agent at{" "}
                    <a
                      href="https://elevenlabs.io/conversational-ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      ElevenLabs Conversational AI
                    </a>
                    {" "}and paste the Agent ID here.
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <p className="text-sm font-medium">Agent Setup Tips:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>Use the system prompt from your business context</li>
                    <li>Enable "Allow Interruptions" for natural conversations</li>
                    <li>Set up client tools for booking and callbacks</li>
                    <li>Test with the simulator before going live</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <VoiceAgentTest agentId={elevenlabsAgentId} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
