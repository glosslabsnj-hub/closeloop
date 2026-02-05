/**
 * DispatchIvrSettings - Configure IVR call routing mode
 * 
 * Allows dispatch businesses to choose how inbound calls are routed:
 * - Towing only (default)
 * - Impound only
 * - IVR routing (Press 1 for towing, Press 2 for impound status)
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Phone, Truck, Warehouse, PhoneCall, Sparkles } from "lucide-react";

type IvrMode = "towing_only" | "impound_only" | "ivr_routing";

interface IvrOption {
  value: IvrMode;
  label: string;
  description: string;
  icon: typeof Truck;
  preview: string;
}

const IVR_OPTIONS: IvrOption[] = [
  {
    value: "towing_only",
    label: "Towing Calls Only",
    description: "All calls go directly to the dispatch AI for towing, roadside, and service requests.",
    icon: Truck,
    preview: "Hi, thanks for calling! Do you need a tow or roadside assistance today?",
  },
  {
    value: "impound_only",
    label: "Impound Inquiries Only",
    description: "All calls go directly to the impound AI for vehicle lookups and release information.",
    icon: Warehouse,
    preview: "Hi, thanks for calling! I can help you check on a vehicle or get release information. What's the license plate number?",
  },
  {
    value: "ivr_routing",
    label: "IVR Menu (1 or 2)",
    description: "Callers choose: Press 1 for towing/roadside, Press 2 for impound status. Both agents can transfer to each other.",
    icon: PhoneCall,
    preview: "Thanks for calling! Press 1 for towing and roadside assistance, or press 2 to check on an impounded vehicle.",
  },
];

export function DispatchIvrSettings() {
  const { tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<IvrMode>("towing_only");

  useEffect(() => {
    if (tenant?.id) {
      loadSettings();
    }
  }, [tenant?.id]);

  const loadSettings = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("assistant_settings")
        .select("dispatch_ivr_mode")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error) throw error;
      setMode((data?.dispatch_ivr_mode as IvrMode) || "towing_only");
    } catch (error) {
      console.error("Failed to load IVR settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!tenant?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("assistant_settings")
        .update({
          dispatch_ivr_mode: mode,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      toast.success("Call routing saved");
    } catch (error: any) {
      console.error("Failed to save:", error);
      toast.error(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedOption = IVR_OPTIONS.find(o => o.value === mode)!;

  return (
    <div className="space-y-6">
      {/* AI Preview */}
      <div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primary mb-1">What callers hear</p>
            <p className="text-sm italic">"{selectedOption.preview}"</p>
          </div>
        </div>
      </div>

      {/* Mode Selection */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium">Inbound Call Routing</h4>
          </div>

          <RadioGroup value={mode} onValueChange={(v) => setMode(v as IvrMode)}>
            <div className="space-y-3">
              {IVR_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                    mode === option.value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value={option.value} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Agent Transfer Note */}
      {mode === "ivr_routing" && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Agent Transfers:</strong> Both the towing and impound agents can transfer 
            callers to each other if needed. For example, if someone calls the towing line 
            asking about an impounded vehicle, the AI will offer to transfer them.
          </p>
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Routing
        </Button>
      </div>
    </div>
  );
}
