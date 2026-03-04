import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Bot, Loader2 } from "lucide-react";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import type { BusinessMode } from "@/hooks/useTenantConfig";
import { useIndustryContext } from "@/hooks/useIndustryContext";

type AIBehaviorMode = "full_service" | "callback_only";

function getFullServiceDesc(mode: BusinessMode, appointmentLabel: string): string {
  switch (mode) {
    case "service": return `AI schedules ${appointmentLabel}s and handles everything — fully automated`;
    case "dispatch": return "AI dispatches jobs and coordinates drivers — fully automated";
    case "food": return "AI takes orders and handles reservations — fully automated";
    case "medical": return `AI schedules ${appointmentLabel}s and handles patient intake — fully automated`;
    case "sales": return "AI qualifies leads and schedules follow-ups — fully automated";
    default: return "AI captures caller info and schedules callbacks — fully automated";
  }
}

function getCallbackDesc(mode: BusinessMode, appointmentLabel: string): string {
  switch (mode) {
    case "service": return `AI answers questions and captures caller info, but you handle ${appointmentLabel}s yourself`;
    case "dispatch": return "AI answers questions and captures caller info, but you handle dispatching yourself";
    case "food": return "AI answers questions and captures caller info, but you handle orders yourself";
    case "medical": return "AI answers questions and captures caller info, but you handle scheduling yourself";
    case "sales": return "AI answers questions and captures caller info, but you handle follow-ups yourself";
    default: return "AI answers questions and captures caller info, you call them back to follow up";
  }
}

export default function AIBehaviorModeSelector() {
  const { tenant, assistantSettings, refreshTenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const { terminology } = useIndustryContext();
  const { toast } = useToast();

  const [behaviorMode, setBehaviorMode] = useState<AIBehaviorMode>(
    ((assistantSettings as any)?.ai_behavior_mode as AIBehaviorMode) || "full_service"
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (assistantSettings) {
      setBehaviorMode(
        ((assistantSettings as any).ai_behavior_mode as AIBehaviorMode) || "full_service"
      );
    }
  }, [assistantSettings]);

  const handleChange = async (value: string) => {
    const newMode = value as AIBehaviorMode;
    setBehaviorMode(newMode);

    if (!tenant?.id) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("assistant_settings")
        .update({
          ai_behavior_mode: newMode,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      await refreshTenant();

      toast({
        title: newMode === "full_service"
          ? "Full service mode enabled"
          : "Capture & callback mode enabled",
      });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5" />
          What AI Does On Calls
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardTitle>
        <CardDescription>
          Control how your AI handles callers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={behaviorMode} onValueChange={handleChange}>
          <div className="space-y-3">
            {/* Full Service */}
            <Label
              htmlFor="behavior-full"
              className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                behaviorMode === "full_service"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value="full_service" id="behavior-full" className="mt-0.5" />
              <div className="flex-1">
                <span className="font-medium">Full Service</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {getFullServiceDesc(businessMode, terminology.appointmentLabel)}
                </p>
              </div>
            </Label>

            {/* Capture & Callback */}
            <Label
              htmlFor="behavior-callback"
              className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                behaviorMode === "callback_only"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value="callback_only" id="behavior-callback" className="mt-0.5" />
              <div className="flex-1">
                <span className="font-medium">Capture & Callback</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {getCallbackDesc(businessMode, terminology.appointmentLabel)}
                </p>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
