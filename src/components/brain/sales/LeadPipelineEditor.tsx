/**
 * Lead Pipeline Editor
 * Configure lead stages and how the AI categorizes prospects.
 * Sales mode only.
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, GitBranch, Flame, Thermometer, Snowflake, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AIPreviewCard } from "../AIPreviewCard";

interface LeadStage {
  name: string;
  color: string;
  autoAdvance: boolean;
}

interface PipelineConfig {
  stages: LeadStage[];
  autoScoreLeads: boolean;
  scoringMethod: string;
  hotLeadSignals: string[];
  coldLeadSignals: string[];
  assignmentMethod: string;
}

const DEFAULT_STAGES: LeadStage[] = [
  { name: "New", color: "blue", autoAdvance: false },
  { name: "Contacted", color: "yellow", autoAdvance: true },
  { name: "Qualified", color: "orange", autoAdvance: false },
  { name: "Proposal", color: "purple", autoAdvance: false },
  { name: "Won", color: "green", autoAdvance: false },
  { name: "Lost", color: "gray", autoAdvance: false },
];

const DEFAULT_CONFIG: PipelineConfig = {
  stages: DEFAULT_STAGES,
  autoScoreLeads: true,
  scoringMethod: "conversation_signals",
  hotLeadSignals: ["ready to buy", "wants to schedule", "has financing"],
  coldLeadSignals: ["just browsing", "not sure yet", "checking prices"],
  assignmentMethod: "round_robin",
};

const STAGE_COLORS = ["blue", "yellow", "orange", "purple", "green", "gray", "red", "pink"];

export function LeadPipelineEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<PipelineConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    if (tenant?.id) loadConfig();
  }, [tenant?.id]);

  const loadConfig = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("general_workflow_config")
        .select("sales_pipeline_config")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      if (data?.sales_pipeline_config) {
        setConfig({ ...DEFAULT_CONFIG, ...data.sales_pipeline_config });
      }
    } catch (err) {
      console.error("Failed to load pipeline config:", err);
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
          { tenant_id: tenant.id, sales_pipeline_config: config },
          { onConflict: "tenant_id" }
        );
      if (error) throw error;
      toast.success("Lead pipeline saved");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const addStage = () => {
    setConfig((prev) => ({
      ...prev,
      stages: [...prev.stages, { name: "", color: "blue", autoAdvance: false }],
    }));
  };

  const removeStage = (idx: number) => {
    setConfig((prev) => ({
      ...prev,
      stages: prev.stages.filter((_, i) => i !== idx),
    }));
  };

  const updateStage = (idx: number, field: keyof LeadStage, value: string | boolean) => {
    setConfig((prev) => ({
      ...prev,
      stages: prev.stages.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    }));
  };

  const buildPreview = (): string => {
    const parts: string[] = [];
    const activeStages = config.stages.filter((s) => s.name.trim());
    parts.push(`I'll track leads through ${activeStages.length} stages: ${activeStages.map((s) => s.name).join(" → ")}.`);
    if (config.autoScoreLeads) {
      parts.push("I'll automatically score leads as hot, warm, or cold based on conversation signals.");
    }
    if (config.assignmentMethod === "round_robin") {
      parts.push("New leads are distributed evenly across your sales team.");
    } else if (config.assignmentMethod === "best_match") {
      parts.push("I'll assign leads to the salesperson best suited to their needs.");
    }
    return parts.join(" ");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AIPreviewCard title="How AI manages your pipeline" preview={buildPreview()} />

      {/* Pipeline Stages */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Pipeline Stages
          </CardTitle>
          <CardDescription>Define the stages a lead moves through</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {config.stages.map((stage, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: stage.color }}
              />
              <Input
                value={stage.name}
                onChange={(e) => updateStage(idx, "name", e.target.value)}
                placeholder="Stage name"
                className="flex-1"
              />
              <Select
                value={stage.color}
                onValueChange={(v) => updateStage(idx, "color", v)}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_COLORS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeStage(idx)}
                disabled={config.stages.length <= 2}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addStage} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Add Stage
          </Button>
        </CardContent>
      </Card>

      {/* Lead Scoring */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-4 w-4" />
            Lead Scoring
          </CardTitle>
          <CardDescription>How the AI rates lead quality</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-score leads</Label>
              <p className="text-xs text-muted-foreground">AI rates leads as hot/warm/cold after each call</p>
            </div>
            <Switch
              checked={config.autoScoreLeads}
              onCheckedChange={(v) => setConfig((p) => ({ ...p, autoScoreLeads: v }))}
            />
          </div>

          {config.autoScoreLeads && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Flame className="h-3.5 w-3.5 text-red-500" />
                  <Label>Hot lead signals</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Phrases or behaviors that indicate a hot lead
                </p>
                <Input
                  value={config.hotLeadSignals.join(", ")}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      hotLeadSignals: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    }))
                  }
                  placeholder="ready to buy, wants to schedule, has financing"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Snowflake className="h-3.5 w-3.5 text-blue-500" />
                  <Label>Cold lead signals</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Phrases or behaviors that indicate a cold lead
                </p>
                <Input
                  value={config.coldLeadSignals.join(", ")}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      coldLeadSignals: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    }))
                  }
                  placeholder="just browsing, not sure yet, checking prices"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Lead Assignment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Thermometer className="h-4 w-4" />
            Lead Assignment
          </CardTitle>
          <CardDescription>How new leads are assigned to your team</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Assignment method</Label>
          <Select
            value={config.assignmentMethod}
            onValueChange={(v) => setConfig((p) => ({ ...p, assignmentMethod: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="round_robin">Round robin - Distribute evenly</SelectItem>
              <SelectItem value="best_match">Best match - Based on expertise</SelectItem>
              <SelectItem value="first_available">First available - Whoever's free</SelectItem>
              <SelectItem value="manual">Manual - Owner assigns all leads</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Save Pipeline
        </Button>
      </div>
    </div>
  );
}
