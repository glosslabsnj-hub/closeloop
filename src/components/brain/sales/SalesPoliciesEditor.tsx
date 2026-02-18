/**
 * Sales Policies Editor
 * For car dealerships, real estate, solar, insurance, equipment, luxury retail, etc.
 * Handles pricing strategy, qualification behavior, appointment settings, and lead capture.
 * Reads/writes to general_workflow_config table (sales_* columns).
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, DollarSign, UserCheck, CalendarCheck, Target } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AIPreviewCard } from "../AIPreviewCard";

interface SalesWorkflowConfig {
  tenant_id: string;
  sales_pricing_strategy: string;
  sales_ask_trade_in: boolean;
  sales_ask_financing: boolean;
  sales_ask_timeline: boolean;
  sales_ask_budget: string;
  sales_max_vehicles_to_mention: number;
  sales_appointment_label: string;
  sales_push_intensity: string;
  sales_follow_up_script: string;
  sales_lead_capture_minimum: string;
  sales_inventory_presentation: string;
}

const DEFAULTS: Omit<SalesWorkflowConfig, "tenant_id"> = {
  sales_pricing_strategy: "deflect_to_visit",
  sales_ask_trade_in: true,
  sales_ask_financing: true,
  sales_ask_timeline: true,
  sales_ask_budget: "careful",
  sales_max_vehicles_to_mention: 3,
  sales_appointment_label: "test drive",
  sales_push_intensity: "medium",
  sales_follow_up_script: "",
  sales_lead_capture_minimum: "name_phone_interest",
  sales_inventory_presentation: "conversational",
};

export function SalesPoliciesEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<SalesWorkflowConfig | null>(null);

  useEffect(() => {
    if (tenant?.id) {
      loadConfig();
    }
  }, [tenant?.id]);

  const loadConfig = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("general_workflow_config")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      setFormData({
        tenant_id: tenant.id,
        sales_pricing_strategy: data?.sales_pricing_strategy || DEFAULTS.sales_pricing_strategy,
        sales_ask_trade_in: data?.sales_ask_trade_in !== false,
        sales_ask_financing: data?.sales_ask_financing !== false,
        sales_ask_timeline: data?.sales_ask_timeline !== false,
        sales_ask_budget: data?.sales_ask_budget || DEFAULTS.sales_ask_budget,
        sales_max_vehicles_to_mention: data?.sales_max_vehicles_to_mention || DEFAULTS.sales_max_vehicles_to_mention,
        sales_appointment_label: data?.sales_appointment_label || DEFAULTS.sales_appointment_label,
        sales_push_intensity: data?.sales_push_intensity || DEFAULTS.sales_push_intensity,
        sales_follow_up_script: data?.sales_follow_up_script || DEFAULTS.sales_follow_up_script,
        sales_lead_capture_minimum: data?.sales_lead_capture_minimum || DEFAULTS.sales_lead_capture_minimum,
        sales_inventory_presentation: data?.sales_inventory_presentation || DEFAULTS.sales_inventory_presentation,
      });
    } catch (err: any) {
      toast.error("Failed to load sales config");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenant?.id || !formData) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("general_workflow_config")
        .upsert(
          {
            tenant_id: tenant.id,
            sales_pricing_strategy: formData.sales_pricing_strategy,
            sales_ask_trade_in: formData.sales_ask_trade_in,
            sales_ask_financing: formData.sales_ask_financing,
            sales_ask_timeline: formData.sales_ask_timeline,
            sales_ask_budget: formData.sales_ask_budget,
            sales_max_vehicles_to_mention: formData.sales_max_vehicles_to_mention,
            sales_appointment_label: formData.sales_appointment_label,
            sales_push_intensity: formData.sales_push_intensity,
            sales_follow_up_script: formData.sales_follow_up_script,
            sales_lead_capture_minimum: formData.sales_lead_capture_minimum,
            sales_inventory_presentation: formData.sales_inventory_presentation,
          },
          { onConflict: "tenant_id" }
        );

      if (error) throw error;
      toast.success("Sales settings saved");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = <K extends keyof SalesWorkflowConfig>(field: K, value: SalesWorkflowConfig[K]) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const buildAIPreview = (): string => {
    if (!formData) return "";
    const parts: string[] = [];

    const pricingMap: Record<string, string> = {
      deflect_to_visit: "I'll encourage you to visit us for the best pricing.",
      give_range: "I can share a general price range to help you plan.",
      give_exact: "I'll share our current pricing with you.",
    };
    parts.push(pricingMap[formData.sales_pricing_strategy] || pricingMap.deflect_to_visit);

    if (formData.sales_ask_trade_in) parts.push("I'll ask about trade-ins.");
    if (formData.sales_ask_financing) parts.push("I'll discuss financing options.");

    const pushMap: Record<string, string> = {
      soft: `I'll gently suggest scheduling a ${formData.sales_appointment_label}.`,
      medium: `I'll recommend booking a ${formData.sales_appointment_label} when the time is right.`,
      assertive: `I'll actively work to get you scheduled for a ${formData.sales_appointment_label}.`,
    };
    parts.push(pushMap[formData.sales_push_intensity] || pushMap.medium);

    return parts.join(" ");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!formData) return null;

  return (
    <div className="space-y-6">
      {/* AI Preview */}
      <AIPreviewCard title="How AI handles sales calls" preview={buildAIPreview()} />

      {/* Pricing Strategy */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pricing Strategy
          </CardTitle>
          <CardDescription>How your AI handles pricing questions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>When asked about price</Label>
            <Select
              value={formData.sales_pricing_strategy}
              onValueChange={(v) => updateField("sales_pricing_strategy", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deflect_to_visit">Deflect to visit - "Come see us for the best deal"</SelectItem>
                <SelectItem value="give_range">Give a range - Share approximate pricing</SelectItem>
                <SelectItem value="give_exact">Give exact price - Share listed prices from inventory</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Inventory presentation style</Label>
            <Select
              value={formData.sales_inventory_presentation}
              onValueChange={(v) => updateField("sales_inventory_presentation", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conversational">Conversational - Weave into natural dialogue</SelectItem>
                <SelectItem value="list_format">List format - Present as organized options</SelectItem>
                <SelectItem value="highlight_best_match">Best match - Lead with top recommendation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Max items to mention per response: {formData.sales_max_vehicles_to_mention}</Label>
            <Slider
              value={[formData.sales_max_vehicles_to_mention]}
              onValueChange={([v]) => updateField("sales_max_vehicles_to_mention", v)}
              min={1}
              max={5}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              How many inventory items the AI describes in a single response
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Qualification Questions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Qualification Questions
          </CardTitle>
          <CardDescription>What your AI asks to qualify leads</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Ask about trade-ins</Label>
              <p className="text-xs text-muted-foreground">Ask if caller has something to trade in</p>
            </div>
            <Switch
              checked={formData.sales_ask_trade_in}
              onCheckedChange={(v) => updateField("sales_ask_trade_in", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Ask about financing</Label>
              <p className="text-xs text-muted-foreground">Ask if caller needs financing</p>
            </div>
            <Switch
              checked={formData.sales_ask_financing}
              onCheckedChange={(v) => updateField("sales_ask_financing", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Ask about timeline</Label>
              <p className="text-xs text-muted-foreground">Ask when they're looking to buy</p>
            </div>
            <Switch
              checked={formData.sales_ask_timeline}
              onCheckedChange={(v) => updateField("sales_ask_timeline", v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Ask about budget</Label>
            <Select
              value={formData.sales_ask_budget}
              onValueChange={(v) => updateField("sales_ask_budget", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="always">Always - Ask every caller</SelectItem>
                <SelectItem value="careful">Careful - Only when naturally relevant</SelectItem>
                <SelectItem value="never">Never - Don't ask about budget</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Minimum info to capture</Label>
            <Select
              value={formData.sales_lead_capture_minimum}
              onValueChange={(v) => updateField("sales_lead_capture_minimum", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name_phone">Name + phone only</SelectItem>
                <SelectItem value="name_phone_interest">Name + phone + what they're looking for</SelectItem>
                <SelectItem value="name_phone_interest_timeline">Name + phone + interest + timeline</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              AI will try to collect at least this much before ending the call
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" />
            Appointment Settings
          </CardTitle>
          <CardDescription>How your AI pushes for appointments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>What to call the appointment</Label>
            <Select
              value={formData.sales_appointment_label}
              onValueChange={(v) => updateField("sales_appointment_label", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="test drive">Test Drive</SelectItem>
                <SelectItem value="showing">Showing</SelectItem>
                <SelectItem value="demo">Demo</SelectItem>
                <SelectItem value="consultation">Consultation</SelectItem>
                <SelectItem value="site visit">Site Visit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Push intensity</Label>
            <Select
              value={formData.sales_push_intensity}
              onValueChange={(v) => updateField("sales_push_intensity", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="soft">Soft - Mention once, don't push</SelectItem>
                <SelectItem value="medium">Medium - Suggest at natural points in conversation</SelectItem>
                <SelectItem value="assertive">Assertive - Actively guide toward booking</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Follow-up Script */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Follow-Up
          </CardTitle>
          <CardDescription>Custom script for callback situations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Follow-up script</Label>
            <Textarea
              value={formData.sales_follow_up_script}
              onChange={(e) => updateField("sales_follow_up_script", e.target.value)}
              placeholder="Hi, this is the AI assistant from {{business_name}}. You called earlier about {{interest}}. I wanted to follow up and see if you'd like to schedule a {{appointment_label}}."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Used when the AI follows up on a previous inquiry. Leave blank for default.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Save Sales Settings
        </Button>
      </div>
    </div>
  );
}
