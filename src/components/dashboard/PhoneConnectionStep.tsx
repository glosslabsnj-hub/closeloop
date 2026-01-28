import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Phone, Check, Loader2, Smartphone, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CarrierInstructions } from "./CarrierInstructions";

interface PhoneConnectionStepProps {
  onComplete: () => void;
  isComplete: boolean;
}

export function PhoneConnectionStep({ onComplete, isComplete }: PhoneConnectionStepProps) {
  const { tenant, assistantSettings, refreshTenant } = useAuth();
  const { toast } = useToast();
  
  const [phoneMethod, setPhoneMethod] = useState<"closeloop_number" | "forwarded">("forwarded");
  const [businessPhone, setBusinessPhone] = useState(assistantSettings?.business_phone_number || "");
  const [connecting, setConnecting] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  
  // Mock CloseLoop number (in production, this would be provisioned via Twilio)
  const closeloopNumber = assistantSettings?.closeloop_number || "+1 (555) 123-4567";

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
      const { error } = await supabase
        .from("assistant_settings")
        .upsert({
          tenant_id: tenant.id,
          business_phone_number: businessPhone.trim(),
          phone_connected: true,
          phone_method: "forwarded",
          setup_step_phone: true,
          updated_at: new Date().toISOString(),
        } as any, {
          onConflict: "tenant_id",
        });

      if (error) throw error;

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
      // Mock provisioning - in production this would call Twilio to provision a number
      const mockNewNumber = `+1 (${Math.floor(Math.random() * 900 + 100)}) ${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`;
      
      const { error } = await supabase
        .from("assistant_settings")
        .upsert({
          tenant_id: tenant.id,
          closeloop_number: mockNewNumber,
          phone_connected: true,
          phone_method: "closeloop_number",
          setup_step_phone: true,
          updated_at: new Date().toISOString(),
        } as any, {
          onConflict: "tenant_id",
        });

      if (error) throw error;

      await refreshTenant();
      toast({
        title: "New Number Provisioned! 🎉",
        description: `Your new CloseLoop number is ${mockNewNumber}`,
      });
      onComplete();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Provisioning Failed",
        description: error.message,
      });
    } finally {
      setProvisioning(false);
    }
  };

  if (isComplete) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Check className="h-5 w-5" />
            Phone Connected
          </CardTitle>
          <CardDescription>
            {assistantSettings?.phone_method === "closeloop_number" 
              ? `Your CloseLoop number: ${assistantSettings?.closeloop_number}`
              : `Forwarding from: ${assistantSettings?.business_phone_number}`
            }
          </CardDescription>
        </CardHeader>
        {assistantSettings?.phone_method === "forwarded" && (
          <CardContent>
            <CarrierInstructions forwardingNumber={closeloopNumber} />
          </CardContent>
        )}
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
          {/* Option 1: Get new number */}
          <div className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-colors cursor-pointer ${
            phoneMethod === "closeloop_number" 
              ? "border-primary bg-primary/5" 
              : "border-muted hover:border-primary/50"
          }`}>
            <RadioGroupItem value="closeloop_number" id="new-number" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="new-number" className="font-medium cursor-pointer flex items-center gap-2">
                Get a New CloseLoop Number
                <Badge variant="secondary" className="text-xs">Recommended</Badge>
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                We'll give you a dedicated phone number for your AI. Give this number to customers or put it on your website.
              </p>
            </div>
          </div>

          {/* Option 2: Use existing number */}
          <div className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-colors cursor-pointer ${
            phoneMethod === "forwarded" 
              ? "border-primary bg-primary/5" 
              : "border-muted hover:border-primary/50"
          }`}>
            <RadioGroupItem value="forwarded" id="existing-number" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="existing-number" className="font-medium cursor-pointer flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Use My Existing Number
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Keep your current business number and forward unanswered calls to your AI.
              </p>
            </div>
          </div>
        </RadioGroup>

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
