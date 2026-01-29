import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, Check, Loader2, PhoneCall, Volume2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { hasVoiceFeature, hasSmsFeature } from "@/config/pricing";
import VoiceAgentTest from "@/components/ai/VoiceAgentTest";
import SMSSimulator from "@/components/simulator/SMSSimulator";

interface TestAIStepProps {
  onComplete: () => void;
  isComplete: boolean;
}

export function TestAIStep({ onComplete, isComplete }: TestAIStepProps) {
  const { tenant, refreshTenant, subscription } = useAuth();
  const { toast } = useToast();
  
  // Use centralized helpers for feature detection
  const planCode = subscription?.plan_code;
  const hasVoice = hasVoiceFeature(planCode);
  const hasSms = hasSmsFeature(planCode);
  
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [callingPhone, setCallingPhone] = useState(false);
  const [hasTested, setHasTested] = useState(false);
  
  // Default to appropriate tab based on plan
  const defaultTab = hasVoice ? "browser" : "sms";

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
      // Check if settings exist
      const { data: existing } = await supabase
        .from("assistant_settings")
        .select("tenant_id")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("assistant_settings")
          .update({
            setup_step_tested: true,
            updated_at: new Date().toISOString(),
          })
          .eq("tenant_id", tenant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("assistant_settings")
          .insert({
            tenant_id: tenant.id,
            setup_step_tested: true,
          });
        if (error) throw error;
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
          {hasVoice ? <Mic className="h-5 w-5 text-primary" /> : <MessageSquare className="h-5 w-5 text-primary" />}
          {hasVoice ? "Test Your AI Voice Agent" : "Test Your AI Text Responses"}
        </CardTitle>
        <CardDescription>
          {hasVoice 
            ? "Experience your AI as customers will. Make a test call to hear it in action."
            : "See how your AI responds to text messages from customers."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Methods */}
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className={`grid w-full ${hasVoice && hasSms ? "grid-cols-3" : "grid-cols-2"}`}>
            {hasVoice && (
              <>
                <TabsTrigger value="browser" className="gap-2">
                  <Volume2 className="h-4 w-4" />
                  Browser Test
                </TabsTrigger>
                <TabsTrigger value="phone" className="gap-2">
                  <PhoneCall className="h-4 w-4" />
                  Call My Phone
                </TabsTrigger>
              </>
            )}
            {hasSms && (
              <TabsTrigger value="sms" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                SMS Test
              </TabsTrigger>
            )}
          </TabsList>

          {hasVoice && (
            <>
              <TabsContent value="browser" className="mt-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Speak directly to your AI through your browser's microphone. This is the quickest way to test.
                  </p>
                  
                  <VoiceAgentTest />
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
                    disabled={callingPhone || !testPhoneNumber.trim()}
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
            </>
          )}

          {hasSms && (
            <TabsContent value="sms" className="mt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Simulate an incoming text message to see how your AI responds to customers.
                </p>
                
                <SMSSimulator />
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Complete Step */}
        <div className="pt-4 border-t">
          <Button 
            onClick={handleMarkComplete}
            className="w-full gap-2"
          >
            <Check className="h-4 w-4" />
            I've Tested My AI - Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
