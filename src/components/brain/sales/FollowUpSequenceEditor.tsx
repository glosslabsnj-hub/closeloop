/**
 * Follow-Up Sequence Editor
 * Configure automated follow-up timing and message templates for leads.
 * Sales mode only.
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Clock, MessageSquare, Plus, Trash2, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AIPreviewCard } from "../AIPreviewCard";

interface FollowUpStep {
  delayHours: number;
  channel: "sms" | "call";
  template: string;
  onlyIfNoResponse: boolean;
}

interface FollowUpConfig {
  enabled: boolean;
  maxFollowUps: number;
  hotLeadSteps: FollowUpStep[];
  warmLeadSteps: FollowUpStep[];
  coldLeadSteps: FollowUpStep[];
  respectQuietHours: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  stopOnBooking: boolean;
  stopOnOptOut: boolean;
}

const DEFAULT_HOT_STEPS: FollowUpStep[] = [
  { delayHours: 1, channel: "sms", template: "Hi {{name}}, thanks for your interest in {{interest}}! Ready to schedule a {{appointment_label}}?", onlyIfNoResponse: false },
  { delayHours: 24, channel: "sms", template: "Just following up on {{interest}} — we have great availability this week. Want me to book a time?", onlyIfNoResponse: true },
];

const DEFAULT_WARM_STEPS: FollowUpStep[] = [
  { delayHours: 4, channel: "sms", template: "Hi {{name}}, thanks for calling about {{interest}}. Let me know if you have any questions!", onlyIfNoResponse: false },
  { delayHours: 72, channel: "sms", template: "Still thinking about {{interest}}? Happy to help with any questions.", onlyIfNoResponse: true },
];

const DEFAULT_CONFIG: FollowUpConfig = {
  enabled: true,
  maxFollowUps: 3,
  hotLeadSteps: DEFAULT_HOT_STEPS,
  warmLeadSteps: DEFAULT_WARM_STEPS,
  coldLeadSteps: [],
  respectQuietHours: true,
  quietHoursStart: "21:00",
  quietHoursEnd: "09:00",
  stopOnBooking: true,
  stopOnOptOut: true,
};

export function FollowUpSequenceEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<FollowUpConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<"hot" | "warm" | "cold">("hot");

  useEffect(() => {
    if (tenant?.id) loadConfig();
  }, [tenant?.id]);

  const loadConfig = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("general_workflow_config")
        .select("sales_followup_config")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      if (data?.sales_followup_config) {
        setConfig({ ...DEFAULT_CONFIG, ...data.sales_followup_config });
      }
    } catch (err) {
      console.error("Failed to load follow-up config:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenant?.id) return;
    setIsSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("general_workflow_config")
        .upsert(
          { tenant_id: tenant.id, sales_followup_config: config },
          { onConflict: "tenant_id" }
        );
      if (error) throw error;
      toast.success("Follow-up sequences saved");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const getSteps = (): FollowUpStep[] => {
    if (activeTab === "hot") return config.hotLeadSteps;
    if (activeTab === "warm") return config.warmLeadSteps;
    return config.coldLeadSteps;
  };

  const setSteps = (steps: FollowUpStep[]) => {
    setConfig((prev) => ({
      ...prev,
      [`${activeTab}LeadSteps`]: steps,
    }));
  };

  const addStep = () => {
    setSteps([
      ...getSteps(),
      { delayHours: 24, channel: "sms", template: "", onlyIfNoResponse: true },
    ]);
  };

  const removeStep = (idx: number) => {
    setSteps(getSteps().filter((_, i) => i !== idx));
  };

  const updateStep = (idx: number, field: keyof FollowUpStep, value: any) => {
    setSteps(getSteps().map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const _formatDelay = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const buildPreview = (): string => {
    if (!config.enabled) return "Follow-up sequences are turned off.";
    const hotCount = config.hotLeadSteps.length;
    const warmCount = config.warmLeadSteps.length;
    return `Hot leads get ${hotCount} follow-up${hotCount !== 1 ? "s" : ""}, warm leads get ${warmCount}. ${config.respectQuietHours ? `Quiet hours: ${config.quietHoursStart}–${config.quietHoursEnd}.` : ""} ${config.stopOnBooking ? "Stops automatically when they book." : ""}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const steps = getSteps();

  return (
    <div className="space-y-6">
      <AIPreviewCard title="How AI follows up with leads" preview={buildPreview()} />

      {/* Master Toggle */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Enable follow-up sequences</p>
              <p className="text-xs text-muted-foreground">AI will automatically follow up with leads via text</p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(v) => setConfig((p) => ({ ...p, enabled: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {config.enabled && (
        <>
          {/* Lead Temperature Tabs */}
          <div className="flex gap-2">
            {(["hot", "warm", "cold"] as const).map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(tab)}
                className="capitalize"
              >
                {tab} Leads
                <span className="ml-1.5 text-xs opacity-70">
                  ({tab === "hot" ? config.hotLeadSteps.length : tab === "warm" ? config.warmLeadSteps.length : config.coldLeadSteps.length})
                </span>
              </Button>
            ))}
          </div>

          {/* Sequence Steps */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Lead Sequence
              </CardTitle>
              <CardDescription>
                Messages sent to {activeTab} leads after their initial call
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {steps.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No follow-ups configured for {activeTab} leads.
                </p>
              )}
              {steps.map((step, idx) => (
                <div key={idx} className="space-y-2">
                  {idx > 0 && (
                    <div className="flex justify-center">
                      <ArrowDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="border rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Step {idx + 1}</p>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeStep(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Wait</Label>
                        <Select
                          value={String(step.delayHours)}
                          onValueChange={(v) => updateStep(idx, "delayHours", Number(v))}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0.5">30 min</SelectItem>
                            <SelectItem value="1">1 hour</SelectItem>
                            <SelectItem value="4">4 hours</SelectItem>
                            <SelectItem value="24">1 day</SelectItem>
                            <SelectItem value="48">2 days</SelectItem>
                            <SelectItem value="72">3 days</SelectItem>
                            <SelectItem value="168">1 week</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Channel</Label>
                        <Select
                          value={step.channel}
                          onValueChange={(v) => updateStep(idx, "channel", v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="call">AI Call</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={step.onlyIfNoResponse}
                            onCheckedChange={(v) => updateStep(idx, "onlyIfNoResponse", v)}
                            className="scale-75"
                          />
                          <span className="text-xs text-muted-foreground">Only if no reply</span>
                        </div>
                      </div>
                    </div>
                    <Textarea
                      value={step.template}
                      onChange={(e) => updateStep(idx, "template", e.target.value)}
                      placeholder="Hi {{name}}, following up about {{interest}}..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addStep} className="gap-1 w-full">
                <Plus className="h-3.5 w-3.5" />
                Add Step
              </Button>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Respect quiet hours</Label>
                  <p className="text-xs text-muted-foreground">Don't send messages late at night</p>
                </div>
                <Switch
                  checked={config.respectQuietHours}
                  onCheckedChange={(v) => setConfig((p) => ({ ...p, respectQuietHours: v }))}
                />
              </div>
              {config.respectQuietHours && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Quiet start</Label>
                    <Input
                      type="time"
                      value={config.quietHoursStart}
                      onChange={(e) => setConfig((p) => ({ ...p, quietHoursStart: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quiet end</Label>
                    <Input
                      type="time"
                      value={config.quietHoursEnd}
                      onChange={(e) => setConfig((p) => ({ ...p, quietHoursEnd: e.target.value }))}
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Stop on booking</Label>
                  <p className="text-xs text-muted-foreground">Stop sequence when lead books an appointment</p>
                </div>
                <Switch
                  checked={config.stopOnBooking}
                  onCheckedChange={(v) => setConfig((p) => ({ ...p, stopOnBooking: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Stop on opt-out</Label>
                  <p className="text-xs text-muted-foreground">Stop if they reply STOP or unsubscribe</p>
                </div>
                <Switch
                  checked={config.stopOnOptOut}
                  onCheckedChange={(v) => setConfig((p) => ({ ...p, stopOnOptOut: v }))}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Save Sequences
        </Button>
      </div>
    </div>
  );
}
