import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Phone, Check, Loader2, Smartphone, ArrowRight, CheckCircle2, Clock, PhoneCall } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CarrierInstructions } from "./CarrierInstructions";
import { ElevenLabsInitWebhookCard } from "./ElevenLabsInitWebhookCard";

interface PhoneConnectionStepProps {
  onComplete: () => void;
  isComplete: boolean;
}

// Format E.164 number to friendly display
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    const areaCode = cleaned.substring(1, 4);
    const prefix = cleaned.substring(4, 7);
    const line = cleaned.substring(7, 11);
    return `(${areaCode}) ${prefix}-${line}`;
  }
  return phone;
}

export function PhoneConnectionStep({ onComplete, isComplete }: PhoneConnectionStepProps) {
  const { tenant, assistantSettings, refreshTenant } = useAuth();
  const { toast } = useToast();
  
  const [phoneMethod, setPhoneMethod] = useState<"closeloop_number" | "forwarded">("forwarded");
  const [businessPhone, setBusinessPhone] = useState(assistantSettings?.business_phone_number || "");
  const [connecting, setConnecting] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  
  // Get the real Twilio number if provisioned
  const closeloopNumber = useMemo(() => {
    // Priority: forwarding_phone_e164 > closeloop_number > placeholder
    const phoneNumber = assistantSettings?.forwarding_phone_e164 || assistantSettings?.closeloop_number;
    if (phoneNumber) {
      return phoneNumber;
    }
    return null;
  }, [assistantSettings]);

  // Get connection status
  const connectStatus = assistantSettings?.connect_status || "not_connected";

  const saveSettings = async (updates: Record<string, unknown>) => {
    if (!tenant) throw new Error("No tenant");

    // Check if settings exist first
    const { data: existing } = await supabase
      .from("assistant_settings")
      .select("tenant_id")
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (existing) {
      // UPDATE existing row
      const { error } = await supabase
        .from("assistant_settings")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenant.id);
      if (error) throw error;
    } else {
      // INSERT new row
      const { error } = await supabase
        .from("assistant_settings")
        .insert({
          tenant_id: tenant.id,
          ...updates,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    }
  };

  const handleConnectExisting = async () => {
    if (!tenant || !businessPhone.trim()) {
      toast({
        variant: "destructive",
        title: "Enter phone number",
        description: "Please enter your business phone number",
      });
      return;
    }

    setConnecting(true);
    try {
      await saveSettings({
        business_phone_number: businessPhone.trim(),
        phone_connected: true,
        phone_method: "forwarded",
        closeloop_number: closeloopNumber,
        setup_step_phone: true,
      });

      // Also sync to tenants.phone_public
      await supabase
        .from("tenants")
        .update({ phone_public: businessPhone.trim() })
        .eq("id", tenant.id);

      await refreshTenant();
      toast({
        title: "Phone Connected! ✅",
        description: "Now set up call forwarding using the instructions below.",
      });
      onComplete();
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

  const handleProvisionNew = async () => {
    if (!tenant) return;

    setProvisioning(true);
    try {
      // Call the Twilio provisioning edge function
      const { data, error } = await supabase.functions.invoke("provision-twilio-number", {
        body: { 
          tenant_id: tenant.id,
          number_type: "local"
        },
      });

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || "Failed to provision number");
      }

      await refreshTenant();
      toast({
        title: "New Number Provisioned! 🎉",
        description: `Your new CloseLoop number is ${data.friendly_name || data.phone_number}`,
      });
      onComplete();
    } catch (error: any) {
      console.error("Provisioning error:", error);
      toast({
        variant: "destructive",
        title: "Provisioning Failed",
        description: error.message || "Failed to provision phone number",
      });
    } finally {
      setProvisioning(false);
    }
  };

  if (isComplete && closeloopNumber) {
    const isVerified = connectStatus === "forwarding_verified";
    const displayNumber = formatPhoneNumber(closeloopNumber);
    
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Check className="h-5 w-5" />
            Phone Connected
          </CardTitle>
          <CardDescription className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground text-lg">{displayNumber}</span>
              {isVerified ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Awaiting First Call
                </Badge>
              )}
            </div>
            <p className="text-sm">
              {assistantSettings?.phone_method === "closeloop_number" 
                ? "This is your dedicated CloseLoop number. Share it with customers!"
                : "Forward your business calls to this number."
              }
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {assistantSettings?.phone_method === "forwarded" && (
            <CarrierInstructions forwardingNumber={closeloopNumber} />
          )}
          
          {/* Connection status indicator */}
          <div className="rounded-lg border p-4 bg-background">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${isVerified ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`} />
                <div>
                  <p className="font-medium">
                    {isVerified ? "AI Voice Agent Active" : "Waiting for first call..."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isVerified 
                      ? "Your AI is answering calls on this number" 
                      : "Make a test call to verify the connection"
                    }
                  </p>
                </div>
              </div>
              {!isVerified && (
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <a href={`tel:${closeloopNumber}`}>
                    <PhoneCall className="h-4 w-4" />
                    Test Call
                  </a>
                </Button>
              )}
            </div>
          </div>
          
          {/* ElevenLabs Init Webhook Card */}
          <ElevenLabsInitWebhookCard />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          Connect Your Business Phone
        </CardTitle>
        <CardDescription>
          Choose how you want your AI to receive calls
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup 
          value={phoneMethod} 
          onValueChange={(v) => setPhoneMethod(v as "closeloop_number" | "forwarded")}
          className="space-y-4"
        >
          {/* Option 1: Get new AI number */}
          <div 
            onClick={() => setPhoneMethod("closeloop_number")}
            className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-colors cursor-pointer ${
              phoneMethod === "closeloop_number" 
                ? "border-primary bg-primary/5" 
                : "border-muted hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="closeloop_number" id="new-number" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="new-number" className="font-medium cursor-pointer flex items-center gap-2">
                Get a New AI Number
                <Badge variant="secondary" className="text-xs">Recommended</Badge>
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                We'll assign you a dedicated phone number. Give this to customers or add it to your website.
              </p>
            </div>
          </div>

          {/* Option 2: Keep existing number */}
          <div 
            onClick={() => setPhoneMethod("forwarded")}
            className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-colors cursor-pointer ${
              phoneMethod === "forwarded" 
                ? "border-primary bg-primary/5" 
                : "border-muted hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="forwarded" id="existing-number" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="existing-number" className="font-medium cursor-pointer flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Keep My Current Number
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                We'll give you an AI number behind the scenes. Forward your calls there when you can't answer.
              </p>
            </div>
          </div>
        </RadioGroup>
        
        {/* Clarifying note */}
        <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          Both options give you an AI-powered number. The difference is whether customers call it directly or you forward calls to it.
        </p>

        {/* Conditional content based on selection */}
        {phoneMethod === "closeloop_number" ? (
          <div className="space-y-4 pt-4 border-t">
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
                <Phone className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Click below to get your dedicated AI phone number instantly
              </p>
              <Button 
                onClick={handleProvisionNew} 
                disabled={provisioning}
                size="lg"
                className="gap-2"
              >
                {provisioning ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Phone className="h-5 w-5" />
                )}
                {provisioning ? "Provisioning..." : "Get My Number"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="business-phone">Your Business Phone Number</Label>
              <Input
                id="business-phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This is the number you currently use for your business
              </p>
            </div>

            <Button 
              onClick={handleConnectExisting} 
              disabled={connecting || !businessPhone.trim()}
              className="w-full gap-2"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {connecting ? "Connecting..." : "Connect & Show Forwarding Steps"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
