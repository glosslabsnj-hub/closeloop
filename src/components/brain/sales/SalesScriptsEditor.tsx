/**
 * Sales Scripts / Objection Playbook Editor
 * Teach the AI how to handle price objections, competitor comparisons, and hesitation.
 * Sales mode only.
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Shield, Plus, Trash2, Swords, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AIPreviewCard } from "../AIPreviewCard";

interface SalesScript {
  id: string;
  category: string;
  trigger: string;
  response: string;
}

interface ScriptsConfig {
  scripts: SalesScript[];
  closingStyle: string;
  valueProps: string[];
}

const DEFAULT_SCRIPTS: SalesScript[] = [
  {
    id: "price-too-high",
    category: "price_objection",
    trigger: "That's too expensive / too much money",
    response: "I understand budget is important. Many of our customers felt the same way initially but found the value far exceeded the cost. Would it help if I walked you through what's included?",
  },
  {
    id: "thinking-about-it",
    category: "hesitation",
    trigger: "I need to think about it / not ready yet",
    response: "Absolutely, take your time! This is a big decision. Can I send you some information to review? And would it be okay if I followed up in a day or two?",
  },
  {
    id: "competitor-comparison",
    category: "competitor",
    trigger: "What about [competitor]? / I'm looking at other options",
    response: "Great question! We respect our competitors. What sets us apart is {{value_prop}}. Would you like to come in and see the difference firsthand?",
  },
];

const DEFAULT_CONFIG: ScriptsConfig = {
  scripts: DEFAULT_SCRIPTS,
  closingStyle: "assumptive",
  valueProps: [],
};

const CATEGORIES = [
  { value: "price_objection", label: "Price Objection", icon: "$" },
  { value: "hesitation", label: "Hesitation", icon: "..." },
  { value: "competitor", label: "Competitor Comparison", icon: "vs" },
  { value: "timing", label: "Timing / Not Now", icon: "clock" },
  { value: "trust", label: "Trust / Credibility", icon: "shield" },
  { value: "custom", label: "Custom", icon: "+" },
];

let nextId = 1;
function generateId() {
  return `script-${Date.now()}-${nextId++}`;
}

export function SalesScriptsEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<ScriptsConfig>(DEFAULT_CONFIG);
  const [newValueProp, setNewValueProp] = useState("");

  useEffect(() => {
    if (tenant?.id) loadConfig();
  }, [tenant?.id]);

  const loadConfig = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("general_workflow_config")
        .select("sales_scripts_config")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      if (data?.sales_scripts_config) {
        setConfig({ ...DEFAULT_CONFIG, ...data.sales_scripts_config });
      }
    } catch (err) {
      console.error("Failed to load scripts config:", err);
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
          { tenant_id: tenant.id, sales_scripts_config: config },
          { onConflict: "tenant_id" }
        );
      if (error) throw error;
      toast.success("Sales scripts saved");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const addScript = () => {
    setConfig((prev) => ({
      ...prev,
      scripts: [
        ...prev.scripts,
        { id: generateId(), category: "custom", trigger: "", response: "" },
      ],
    }));
  };

  const removeScript = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      scripts: prev.scripts.filter((s) => s.id !== id),
    }));
  };

  const updateScript = (id: string, field: keyof SalesScript, value: string) => {
    setConfig((prev) => ({
      ...prev,
      scripts: prev.scripts.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }));
  };

  const addValueProp = () => {
    if (!newValueProp.trim()) return;
    setConfig((prev) => ({
      ...prev,
      valueProps: [...prev.valueProps, newValueProp.trim()],
    }));
    setNewValueProp("");
  };

  const removeValueProp = (idx: number) => {
    setConfig((prev) => ({
      ...prev,
      valueProps: prev.valueProps.filter((_, i) => i !== idx),
    }));
  };

  const _getCategoryLabel = (cat: string) =>
    CATEGORIES.find((c) => c.value === cat)?.label || cat;

  const buildPreview = (): string => {
    const parts: string[] = [];
    const scriptCount = config.scripts.filter((s) => s.trigger.trim() && s.response.trim()).length;
    parts.push(`I have ${scriptCount} trained response${scriptCount !== 1 ? "s" : ""} for common objections.`);
    if (config.valueProps.length > 0) {
      parts.push(`I'll emphasize: ${config.valueProps.slice(0, 3).join(", ")}.`);
    }
    const closingMap: Record<string, string> = {
      assumptive: "I'll guide conversations toward booking with confidence.",
      consultative: "I'll listen first and recommend based on their needs.",
      soft: "I'll suggest next steps gently without pressure.",
    };
    parts.push(closingMap[config.closingStyle] || closingMap.assumptive);
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
      <AIPreviewCard title="How AI handles objections" preview={buildPreview()} />

      {/* Value Propositions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Value Propositions
          </CardTitle>
          <CardDescription>
            Key selling points the AI weaves into conversations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {config.valueProps.map((prop, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-sm flex-1">{prop}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeValueProp(idx)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newValueProp}
              onChange={(e) => setNewValueProp(e.target.value)}
              placeholder="e.g. Lifetime warranty included"
              onKeyDown={(e) => e.key === "Enter" && addValueProp()}
            />
            <Button variant="outline" size="sm" onClick={addValueProp}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Closing Style */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Swords className="h-4 w-4" />
            Closing Style
          </CardTitle>
          <CardDescription>How the AI approaches closing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Approach</Label>
          <Select
            value={config.closingStyle}
            onValueChange={(v) => setConfig((p) => ({ ...p, closingStyle: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assumptive">Assumptive - "Let's get you scheduled for..."</SelectItem>
              <SelectItem value="consultative">Consultative - "Based on what you've shared, I'd recommend..."</SelectItem>
              <SelectItem value="soft">Soft - "Would you like to take the next step?"</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Objection Scripts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Objection Playbook
          </CardTitle>
          <CardDescription>
            Teach the AI exactly how to respond to common pushback
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.scripts.map((script) => (
            <div key={script.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Select
                  value={script.category}
                  onValueChange={(v) => updateScript(script.id, "category", v)}
                >
                  <SelectTrigger className="w-48 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeScript(script.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">When the caller says...</Label>
                <Input
                  value={script.trigger}
                  onChange={(e) => updateScript(script.id, "trigger", e.target.value)}
                  placeholder="That's too expensive / I need to think about it"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">AI responds with...</Label>
                <Textarea
                  value={script.response}
                  onChange={(e) => updateScript(script.id, "response", e.target.value)}
                  placeholder="I understand. Many customers felt the same way..."
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addScript} className="gap-1 w-full">
            <Plus className="h-3.5 w-3.5" />
            Add Script
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Save Scripts
        </Button>
      </div>
    </div>
  );
}
