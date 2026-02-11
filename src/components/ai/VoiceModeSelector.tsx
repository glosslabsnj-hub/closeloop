import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Phone,
  PhoneForwarded,
  Voicemail,
  Clock,
  Radio,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import type { VoiceMode } from "@/types/database";

type OffBehavior = "FORWARD_OWNER" | "VOICEMAIL" | "CALLBACK_ONLY";

export default function VoiceModeSelector() {
  const { tenant, assistantSettings, refreshTenant } = useAuth();
  const { toast } = useToast();

  const [voiceMode, setVoiceMode] = useState<VoiceMode>(
    (assistantSettings?.voice_mode as VoiceMode) || "always_on"
  );
  const [offBehavior, setOffBehavior] = useState<OffBehavior>(
    (assistantSettings?.off_behavior as OffBehavior) || "FORWARD_OWNER"
  );
  const [forwardNumber, setForwardNumber] = useState(
    assistantSettings?.owner_forward_number || ""
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (assistantSettings) {
      setVoiceMode((assistantSettings.voice_mode as VoiceMode) || "always_on");
      setOffBehavior((assistantSettings.off_behavior as OffBehavior) || "FORWARD_OWNER");
      setForwardNumber(assistantSettings.owner_forward_number || "");
    }
  }, [assistantSettings]);

  const saveSettings = async (
    newMode: VoiceMode,
    newBehavior: OffBehavior,
    newNumber: string
  ) => {
    if (!tenant?.id) return;
    setSaving(true);

    try {
      const updates: Record<string, unknown> = {
        voice_mode: newMode,
        off_behavior: newBehavior,
        updated_at: new Date().toISOString(),
      };

      if (newBehavior === "FORWARD_OWNER" && newNumber.trim()) {
        const normalized = normalizePhone(newNumber);
        if (normalized) {
          updates.owner_forward_number = normalized;
        }
      }

      const { error } = await supabase
        .from("assistant_settings")
        .update(updates)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      await refreshTenant();

      toast({ title: "Call routing updated" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to save",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const normalizePhone = (phone: string): string | null => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    if (digits.length === 10) return `+1${digits}`;
    if (phone.startsWith("+")) return phone;
    return null;
  };

  const handleVoiceModeChange = (value: string) => {
    const newMode = value as VoiceMode;
    setVoiceMode(newMode);
    saveSettings(newMode, offBehavior, forwardNumber);
  };

  const handleOffBehaviorChange = (value: string) => {
    const newBehavior = value as OffBehavior;
    setOffBehavior(newBehavior);
    saveSettings(voiceMode, newBehavior, forwardNumber);
  };

  const handleForwardNumberBlur = () => {
    if (forwardNumber.trim()) {
      saveSettings(voiceMode, offBehavior, forwardNumber);
    }
  };

  const showOffBehavior = voiceMode === "after_hours_only" || voiceMode === "overflow" || voiceMode === "busy_mode";

  return (
    <div className="space-y-6">
      {/* When AI Answers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Radio className="h-5 w-5" />
            When AI Answers Calls
            {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardTitle>
          <CardDescription>
            Control when your AI assistant picks up incoming calls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={voiceMode} onValueChange={handleVoiceModeChange}>
            <div className="space-y-3">
              {/* Always On */}
              <Label
                htmlFor="mode-always"
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  voiceMode === "always_on"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="always_on" id="mode-always" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Always On</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    AI answers every call, 24/7
                  </p>
                </div>
              </Label>

              {/* After Hours Only */}
              <Label
                htmlFor="mode-afterhours"
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  voiceMode === "after_hours_only"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="after_hours_only" id="mode-afterhours" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">After Hours Only</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    During business hours, calls go to your phone. After hours, AI answers.
                  </p>
                </div>
              </Label>

              {/* Overflow — Coming Soon */}
              <Label
                htmlFor="mode-overflow"
                className="flex items-start gap-3 p-4 rounded-lg border-2 border-border opacity-50 cursor-not-allowed"
              >
                <RadioGroupItem value="overflow" id="mode-overflow" disabled className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Overflow</span>
                    <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ring your phone first. If you don't answer, AI picks up.
                  </p>
                </div>
              </Label>

              {/* Busy Mode — Coming Soon */}
              <Label
                htmlFor="mode-busy"
                className="flex items-start gap-3 p-4 rounded-lg border-2 border-border opacity-50 cursor-not-allowed"
              >
                <RadioGroupItem value="busy_mode" id="mode-busy" disabled className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Busy Mode</span>
                    <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    AI answers only when you're already on another call.
                  </p>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {voiceMode === "after_hours_only" && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Make sure your business hours are configured in Settings so the AI knows when to answer.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Off Behavior — what happens when AI is NOT answering */}
      {showOffBehavior && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">When AI Isn't Answering</CardTitle>
            <CardDescription>
              What happens to calls during business hours (or when AI is paused)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={offBehavior} onValueChange={handleOffBehaviorChange}>
              <div className="space-y-3">
                {/* Forward */}
                <Label
                  htmlFor="off-forward"
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    offBehavior === "FORWARD_OWNER"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value="FORWARD_OWNER" id="off-forward" className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <PhoneForwarded className="h-4 w-4" />
                      <span className="font-medium">Forward to my phone</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Calls ring your personal phone number
                    </p>
                  </div>
                </Label>

                {/* Voicemail */}
                <Label
                  htmlFor="off-voicemail"
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    offBehavior === "VOICEMAIL"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value="VOICEMAIL" id="off-voicemail" className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Voicemail className="h-4 w-4" />
                      <span className="font-medium">Voicemail</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Play a message and record a voicemail
                    </p>
                  </div>
                </Label>

                {/* Callback */}
                <Label
                  htmlFor="off-callback"
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    offBehavior === "CALLBACK_ONLY"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value="CALLBACK_ONLY" id="off-callback" className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span className="font-medium">Callback capture</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Acknowledge the call and promise a callback
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {/* Forward Number Input */}
            {offBehavior === "FORWARD_OWNER" && (
              <div className="space-y-2 mt-4">
                <Label htmlFor="forward-phone">Your Phone Number</Label>
                <Input
                  id="forward-phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={forwardNumber}
                  onChange={(e) => setForwardNumber(e.target.value)}
                  onBlur={handleForwardNumberBlur}
                  className="font-mono max-w-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your phone number. Calls will ring this number when AI isn't answering.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
