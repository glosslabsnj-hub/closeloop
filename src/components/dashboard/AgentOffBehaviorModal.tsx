import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Phone, Voicemail, PhoneForwarded, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AgentOffBehaviorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  currentBehavior?: "FORWARD_OWNER" | "VOICEMAIL" | "CALLBACK_ONLY";
  currentForwardNumber?: string;
  onConfigured: () => void;
}

export function AgentOffBehaviorModal({
  open,
  onOpenChange,
  tenantId,
  currentBehavior = "FORWARD_OWNER",
  currentForwardNumber = "",
  onConfigured,
}: AgentOffBehaviorModalProps) {
  const { toast } = useToast();
  const [behavior, setBehavior] = useState<"FORWARD_OWNER" | "VOICEMAIL" | "CALLBACK_ONLY">(currentBehavior);
  const [forwardNumber, setForwardNumber] = useState(currentForwardNumber);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    // Validation
    if (behavior === "FORWARD_OWNER" && !forwardNumber.trim()) {
      toast({
        variant: "destructive",
        title: "Phone Number Required",
        description: "Please enter your phone number to enable forwarding.",
      });
      return;
    }

    setSaving(true);
    try {
      const updates: any = {
        off_behavior: behavior,
        updated_at: new Date().toISOString(),
      };

      if (behavior === "FORWARD_OWNER") {
        // Normalize phone to E.164 format
        const normalizedNumber = normalizePhoneNumber(forwardNumber);
        if (!normalizedNumber) {
          throw new Error("Please enter a valid phone number (e.g. 555-123-4567)");
        }
        updates.owner_forward_number = normalizedNumber;
        updates.owner_forward_verified = true; // Stub for now - can add verification flow later
      }

      const { error } = await supabase
        .from("assistant_settings")
        .update(updates)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      toast({
        title: "OFF Behavior Configured",
        description: getSuccessMessage(behavior),
      });

      onConfigured();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Configuration Failed",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const normalizePhoneNumber = (phone: string): string | null => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("1")) {
      return `+${digits}`;
    } else if (digits.length === 10) {
      return `+1${digits}`;
    } else if (phone.startsWith("+")) {
      return phone;
    }
    return null;
  };

  const getSuccessMessage = (behavior: string): string => {
    switch (behavior) {
      case "FORWARD_OWNER":
        return "Calls will be forwarded to your phone when AI is OFF";
      case "VOICEMAIL":
        return "Calls will go to voicemail when AI is OFF";
      case "CALLBACK_ONLY":
        return "Calls will be captured for callback when AI is OFF";
      default:
        return "Configuration saved";
    }
  };

  const getBehaviorSubtext = (behavior: string): string => {
    switch (behavior) {
      case "FORWARD_OWNER":
        return "Forward to your phone";
      case "VOICEMAIL":
        return "Voicemail";
      case "CALLBACK_ONLY":
        return "Callback only";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Agent OFF Behavior</DialogTitle>
          <DialogDescription>
            Choose what happens when you turn your AI agent OFF
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your Flux Receptionist phone still receives calls when AI is OFF. Configure how to handle them.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <RadioGroup value={behavior} onValueChange={(value: any) => setBehavior(value)}>
            <div className="space-y-3">
              {/* Forward to Owner */}
              <Label
                htmlFor="forward"
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  behavior === "FORWARD_OWNER"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="FORWARD_OWNER" id="forward" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <PhoneForwarded className="h-4 w-4" />
                    <span className="font-medium">Forward to my phone</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Calls ring your phone when AI is OFF
                  </p>
                </div>
              </Label>

              {/* Voicemail */}
              <Label
                htmlFor="voicemail"
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  behavior === "VOICEMAIL"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="VOICEMAIL" id="voicemail" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Voicemail className="h-4 w-4" />
                    <span className="font-medium">Voicemail</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Play message and record voicemail
                  </p>
                </div>
              </Label>

              {/* Callback Only */}
              <Label
                htmlFor="callback"
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  behavior === "CALLBACK_ONLY"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="CALLBACK_ONLY" id="callback" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span className="font-medium">Callback only</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Capture caller info, promise callback
                  </p>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {/* Forward Number Input */}
          {behavior === "FORWARD_OWNER" && (
            <div className="space-y-2 pt-2">
              <Label htmlFor="phone">Your Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={forwardNumber}
                onChange={(e) => setForwardNumber(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Enter your 10-digit phone number or include country code (e.g. +1)
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save & Turn OFF
          </Button>
        </DialogFooter>

        <div className="text-xs text-muted-foreground text-center">
          When AI is OFF: <span className="font-medium">{getBehaviorSubtext(behavior)}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
