import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, Phone, Check, Loader2, PhoneCall, Volume2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import VoiceAgentTest from "@/components/ai/VoiceAgentTest";

interface TestAIStepProps {
  onComplete: () => void;
  isComplete: boolean;
}

export function TestAIStep({ onComplete, isComplete }: TestAIStepProps) {
  const { tenant, refreshTenant } = useAuth();
  const { toast } = useToast();
  
  const [agentId, setAgentId] = useState("");
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [callingPhone, setCallingPhone] = useState(false);
  const [hasTested, setHasTested] = useState(false);

  const handleTestCallToPhone = async () => {
    if (!testPhoneNumber.trim()) {
      toast({
        variant: "destructive",
        title: "Enter phone number",
        description: "Please enter the phone number to call",
      });
      return;
    }

    setCallingPhone(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-call-phone", {
        body: { 
          tenantId: tenant?.id, 
          phoneNumber: testPhoneNumber.trim(),
          agentId: agentId,
        },
      });

      if (error) throw error;

      toast({
        title: "📞 Test Call Initiated",
        description: "Your phone should ring in a few seconds. Answer to talk to your AI!",
      });
      setHasTested(true);
    } catch (error: any) {
      // Demo mode fallback
      toast({
        title: "📞 Demo Mode",
        description: "Real phone calls require Twilio. Use the browser test below!",
      });
      setHasTested(true);
    } finally {
      setCallingPhone(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!tenant) return;

    try {
      const { error } = await supabase
        .from("assistant_settings")
        .upsert({
          tenant_id: tenant.id,
          setup_step_tested: true,
          updated_at: new Date().toISOString(),
        } as any, {
          onConflict: "tenant_id",
        });

      if (error) throw error;

      // Also save the agent ID if provided
      if (agentId) {
        const { data: existing } = await supabase
          .from("ai_assistants")
          .select("id")
          .eq("tenant_id", tenant.id)
          .single();

        if (existing) {
          await supabase
            .from("ai_assistants")
            .update({ elevenlabs_agent_id: agentId } as any)
            .eq("id", existing.id);
        } else {
          await supabase
            .from("ai_assistants")
            .insert([{
              tenant_id: tenant.id,
              name: "AI Assistant",
              is_enabled: true,
              elevenlabs_agent_id: agentId,
            } as any]);
        }
      }

      await refreshTenant();
      toast({
        title: "AI Tested! ✅",
        description: "You're ready to go live.",
      });
      onComplete();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  if (isComplete) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Check className="h-5 w-5" />
            AI Tested
          </CardTitle>
          <CardDescription>
            You've tested your AI voice agent and it's working great!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" />
          Test Your AI Voice Agent
        </CardTitle>
        <CardDescription>
          Experience your AI as customers will. Make a test call to hear it in action.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Agent ID Setup */}
        <div className="space-y-2 p-4 rounded-lg bg-muted/50">
          <Label htmlFor="agent-id" className="font-medium">ElevenLabs Agent ID</Label>
          <Input
            id="agent-id"
            placeholder="agent_xxxxxxxxxxxx"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Create an agent at{" "}
            <a
              href="https://elevenlabs.io/conversational-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              ElevenLabs Conversational AI
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>

        {/* Test Methods */}
        <Tabs defaultValue="browser" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browser" className="gap-2">
              <Volume2 className="h-4 w-4" />
              Browser Test
            </TabsTrigger>
            <TabsTrigger value="phone" className="gap-2">
              <PhoneCall className="h-4 w-4" />
              Call My Phone
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browser" className="mt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Speak directly to your AI through your browser's microphone. This is the quickest way to test.
              </p>
              
              {agentId ? (
                <VoiceAgentTest agentId={agentId} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Mic className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Enter your ElevenLabs Agent ID above to start testing</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="phone" className="mt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Have your AI call you to experience exactly what your customers will hear.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="test-phone">Your Phone Number</Label>
                <Input
                  id="test-phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                />
              </div>

              <Button
                onClick={handleTestCallToPhone}
                disabled={callingPhone || !testPhoneNumber.trim() || !agentId}
                className="w-full gap-2"
                variant="outline"
              >
                {callingPhone ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PhoneCall className="h-4 w-4" />
                )}
                {callingPhone ? "Calling..." : "Call My Phone"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Demo mode: Real calls require Twilio integration
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Complete Step */}
        <div className="pt-4 border-t">
          <Button 
            onClick={handleMarkComplete}
            className="w-full gap-2"
            disabled={!agentId}
          >
            <Check className="h-4 w-4" />
            {agentId ? "I've Tested My AI - Continue" : "Enter Agent ID to Continue"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
