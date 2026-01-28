import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Phone, Plus, ArrowRight, Check, Copy, Loader2 } from "lucide-react";
import type { AssistantSettings } from "@/types/database";

interface ConnectPhoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSettings: AssistantSettings | null;
  onSuccess: () => void;
}

export function ConnectPhoneDialog({ 
  open, 
  onOpenChange, 
  currentSettings,
  onSuccess 
}: ConnectPhoneDialogProps) {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [existingNumber, setExistingNumber] = useState("");
  const [copied, setCopied] = useState(false);

  // Mock CloseLoop forwarding number
  const closeloopForwardingNumber = "+1 (555) 123-4567";

  const handleConnectExisting = async () => {
    if (!tenant || !existingNumber.trim()) return;
    
    setLoading(true);
    try {
      // Upsert assistant settings with the business phone
      const { error } = await supabase
        .from("assistant_settings")
        .upsert({
          tenant_id: tenant.id,
          business_phone_number: existingNumber.trim(),
          phone_connected: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "tenant_id",
        });

      if (error) throw error;

      toast({
        title: "Phone connected!",
        description: "Set up call forwarding to complete the connection.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to connect",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGetNewNumber = async () => {
    if (!tenant) return;
    
    setLoading(true);
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

      toast({
        title: "New number assigned!",
        description: `Your CloseLoop number is ${data.friendly_name || data.phone_number}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Provisioning error:", error);
      toast({
        variant: "destructive",
        title: "Failed to provision number",
        description: error.message || "Failed to provision phone number",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyForwardingNumber = () => {
    navigator.clipboard.writeText(closeloopForwardingNumber.replace(/\D/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Connect Phone Number
          </DialogTitle>
          <DialogDescription>
            Set up your business phone to receive AI-powered calls and texts.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="existing" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Use Existing</TabsTrigger>
            <TabsTrigger value="new">Get New Number</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Your Business Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={existingNumber}
                onChange={(e) => setExistingNumber(e.target.value)}
              />
            </div>

            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <p className="text-sm font-medium">Set up call forwarding:</p>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">1</span>
                  <span>Go to your phone carrier settings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">2</span>
                  <span>Enable call forwarding when busy/unanswered</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">3</span>
                  <div className="flex-1">
                    <span>Forward to this number:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-background px-2 py-1 rounded text-xs">
                        {closeloopForwardingNumber}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={copyForwardingNumber}
                      >
                        {copied ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </li>
              </ol>
            </div>

            <Button 
              className="w-full" 
              onClick={handleConnectExisting}
              disabled={loading || !existingNumber.trim()}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Connect Number
            </Button>
          </TabsContent>

          <TabsContent value="new" className="space-y-4 mt-4">
            <div className="rounded-lg border bg-muted/50 p-4 text-center">
              <Plus className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Get a CloseLoop Number</p>
              <p className="text-sm text-muted-foreground mt-1">
                We'll provision a new local number for your business. 
                Customers call this number and your AI answers.
              </p>
            </div>

            <Button 
              className="w-full" 
              onClick={handleGetNewNumber}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {loading ? "Provisioning..." : "Get New Number"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
