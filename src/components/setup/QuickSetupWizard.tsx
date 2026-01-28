import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Phone,
  MessageSquare,
  Mic,
  PhoneCall,
  Check,
  Copy,
  Loader2,
  ArrowRight,
  Play,
  Settings,
} from "lucide-react";
import VoiceAgentTest from "@/components/ai/VoiceAgentTest";

interface QuickSetupWizardProps {
  onComplete?: () => void;
}

export default function QuickSetupWizard({ onComplete }: QuickSetupWizardProps) {
  const { tenant } = useAuth();
  const { toast } = useToast();
  
  // Phone connection state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [phoneConnected, setPhoneConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // AI settings state
  const [elevenlabsAgentId, setElevenlabsAgentId] = useState("");
  const [textBackEnabled, setTextBackEnabled] = useState(true);
  const [textBackDelay, setTextBackDelay] = useState([30]); // seconds
  
  // Loading states
  const [connecting, setConnecting] = useState(false);
  const [callingPhone, setCallingPhone] = useState(false);
  const [saving, setSaving] = useState(false);

  // Mock forwarding number
  const forwardingNumber = "+1 (555) 123-4567";

  const copyForwardingNumber = () => {
    navigator.clipboard.writeText(forwardingNumber.replace(/\D/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Forwarding number copied to clipboard" });
  };

  const handleConnectPhone = async () => {
    if (!tenant || !phoneNumber.trim()) return;
    
    setConnecting(true);
    try {
      const { error } = await supabase
        .from("assistant_settings")
        .upsert({
          tenant_id: tenant.id,
          business_phone_number: phoneNumber.trim(),
          phone_connected: true,
          sms_first_delay_seconds: textBackDelay[0],
          instant_text_enabled: textBackEnabled,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "tenant_id",
        });

      if (error) throw error;

      setPhoneConnected(true);
      toast({
        title: "Phone Connected! ✅",
        description: "Now set up call forwarding to complete the setup.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: error.message,
      });
    } finally {
      setConnecting(false);
    }
  };

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
      // Mock: In production, this would trigger a real outbound call via Twilio
      const { data, error } = await supabase.functions.invoke("test-call-phone", {
        body: { 
          tenantId: tenant?.id, 
          phoneNumber: testPhoneNumber.trim(),
          agentId: elevenlabsAgentId,
        },
      });

      if (error) throw error;

      toast({
        title: "📞 Test Call Initiated",
        description: "Your phone should ring in a few seconds. Answer to talk to your AI!",
      });
    } catch (error: any) {
      // Since this is mock mode, show a demo toast
      toast({
        title: "📞 Demo Mode",
        description: "In production, your AI would call this number. Use browser test for now!",
      });
    } finally {
      setCallingPhone(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!tenant) return;
    
    setSaving(true);
    try {
      // Save assistant settings
      const { error: settingsError } = await supabase
        .from("assistant_settings")
        .upsert({
          tenant_id: tenant.id,
          sms_first_delay_seconds: textBackDelay[0],
          instant_text_enabled: textBackEnabled,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "tenant_id",
        });

      if (settingsError) throw settingsError;

      // Save ElevenLabs agent ID
      if (elevenlabsAgentId) {
        const { data: existing } = await supabase
          .from("ai_assistants")
          .select("id")
          .eq("tenant_id", tenant.id)
          .single();

        if (existing) {
          await supabase
            .from("ai_assistants")
            .update({ elevenlabs_agent_id: elevenlabsAgentId } as any)
            .eq("id", existing.id);
        } else {
          await supabase
            .from("ai_assistants")
            .insert([{
              tenant_id: tenant.id,
              name: "AI Assistant",
              is_enabled: true,
              elevenlabs_agent_id: elevenlabsAgentId,
            } as any]);
        }
      }

      toast({ title: "Settings Saved!" });
      onComplete?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const formatDelay = (seconds: number) => {
    if (seconds === 0) return "Instantly";
    if (seconds < 60) return `${seconds} seconds`;
    return `${Math.floor(seconds / 60)} minute${seconds >= 120 ? 's' : ''}`;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="connect" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="connect" className="gap-2">
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">Connect Phone</span>
            <span className="sm:hidden">Phone</span>
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-2">
            <Mic className="h-4 w-4" />
            <span className="hidden sm:inline">Test AI</span>
            <span className="sm:hidden">Test</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
            <span className="sm:hidden">Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* Step 1: Connect Phone */}
        <TabsContent value="connect" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Connect Your Business Phone
              </CardTitle>
              <CardDescription>
                Enter your business phone number and set up call forwarding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Phone number input */}
              <div className="space-y-2">
                <Label htmlFor="business-phone">Your Business Phone Number</Label>
                <Input
                  id="business-phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={phoneConnected}
                />
              </div>

              {!phoneConnected ? (
                <Button
                  onClick={handleConnectPhone}
                  disabled={connecting || !phoneNumber.trim()}
                  className="w-full"
                >
                  {connecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Connect Number
                </Button>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-primary">
                    <Check className="h-5 w-5" />
                    <span className="font-medium">Phone number connected!</span>
                  </div>

                  {/* Call forwarding instructions */}
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-4">
                    <p className="font-medium">Set up call forwarding:</p>
                    <ol className="space-y-3 text-sm">
                      <li className="flex items-start gap-3">
                        <Badge variant="outline" className="shrink-0 mt-0.5">1</Badge>
                        <span>Go to your phone carrier settings or dial *72</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Badge variant="outline" className="shrink-0 mt-0.5">2</Badge>
                        <span>Enable call forwarding when busy or unanswered</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Badge variant="outline" className="shrink-0 mt-0.5">3</Badge>
                        <div className="flex-1">
                          <span>Forward calls to:</span>
                          <div className="flex items-center gap-2 mt-2">
                            <code className="bg-background px-3 py-1.5 rounded text-sm font-mono">
                              {forwardingNumber}
                            </code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={copyForwardingNumber}
                            >
                              {copied ? (
                                <Check className="h-4 w-4 text-primary" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </li>
                    </ol>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 2: Test AI */}
        <TabsContent value="test" className="space-y-4 mt-6">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Browser Test */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mic className="h-5 w-5" />
                  Browser Test
                </CardTitle>
                <CardDescription>
                  Speak directly to your AI in the browser
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="agent-id-test">ElevenLabs Agent ID</Label>
                    <Input
                      id="agent-id-test"
                      placeholder="Enter Agent ID to test"
                      value={elevenlabsAgentId}
                      onChange={(e) => setElevenlabsAgentId(e.target.value)}
                    />
                  </div>
                  <VoiceAgentTest agentId={elevenlabsAgentId} />
                </div>
              </CardContent>
            </Card>

            {/* Phone Test */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PhoneCall className="h-5 w-5" />
                  Call My Phone
                </CardTitle>
                <CardDescription>
                  Have your AI call you to experience it as a customer would
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  disabled={callingPhone || !testPhoneNumber.trim()}
                  className="w-full"
                  variant="outline"
                >
                  {callingPhone ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PhoneCall className="mr-2 h-4 w-4" />
                  )}
                  Call My Phone
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Demo mode: Real calls require Twilio integration
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Step 3: Settings */}
        <TabsContent value="settings" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Missed Call Text-Back
              </CardTitle>
              <CardDescription>
                Automatically send an AI-generated text when calls are missed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Text-Back</Label>
                  <p className="text-sm text-muted-foreground">
                    Send AI message when calls go unanswered
                  </p>
                </div>
                <Switch
                  checked={textBackEnabled}
                  onCheckedChange={setTextBackEnabled}
                />
              </div>

              {/* Delay slider */}
              {textBackEnabled && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Response Delay</Label>
                    <Badge variant="secondary">
                      {formatDelay(textBackDelay[0])}
                    </Badge>
                  </div>
                  <Slider
                    value={textBackDelay}
                    onValueChange={setTextBackDelay}
                    max={120}
                    min={0}
                    step={10}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Wait time after missed call before sending text (0 = instant)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                AI Voice Agent
              </CardTitle>
              <CardDescription>
                Connect your ElevenLabs Conversational AI agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agent-id-settings">ElevenLabs Agent ID</Label>
                <Input
                  id="agent-id-settings"
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
                </p>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full"
            size="lg"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Save & Go Live
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
