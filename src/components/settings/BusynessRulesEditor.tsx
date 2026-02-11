import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, Info, TrendingUp } from "lucide-react";

export interface BusynessLevelConfig {
  etaMultiplier: number;   // 1.0 = normal, 1.5 = 50% longer
  surchargePercent: number; // 0-100
}

export interface BusynessRulesConfig {
  base_prep_minutes: number;
  busy_buffer_minutes: number;
  manual_busyness_pct: number; // 0-100
  // Level-based config consumed by computeEtaQuote() pricing engine
  low?: BusynessLevelConfig;
  medium?: BusynessLevelConfig;
  high?: BusynessLevelConfig;
}

export function BusynessRulesEditor() {
  const { tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [config, setConfig] = useState<BusynessRulesConfig>({
    base_prep_minutes: 30,
    busy_buffer_minutes: 15,
    manual_busyness_pct: 0,
    low: { etaMultiplier: 1.0, surchargePercent: 0 },
    medium: { etaMultiplier: 1.3, surchargePercent: 0 },
    high: { etaMultiplier: 1.6, surchargePercent: 0 },
  });

  useEffect(() => {
    if (!tenant?.id) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("tenants")
          .select("busyness_rules_jsonb" as any)
          .eq("id", tenant.id)
          .single();

        if (error) throw error;

        const dataAny = data as any;
        if (dataAny?.busyness_rules_jsonb) {
          setConfig(dataAny.busyness_rules_jsonb as BusynessRulesConfig);
        }
      } catch (error) {
        console.error("Failed to load busyness rules:", error);
        toast.error("Failed to load busyness rules");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tenant?.id]);

  const updateConfig = (updates: Partial<BusynessRulesConfig>) => {
    setConfig({ ...config, ...updates });
    setHasChanges(true);
  };

  const saveRules = async () => {
    if (!tenant?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({ busyness_rules_jsonb: config } as any)
        .eq("id", tenant.id);

      if (error) throw error;

      toast.success("Busyness rules saved successfully");
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save busyness rules:", error);
      toast.error("Failed to save busyness rules");
    } finally {
      setSaving(false);
    }
  };

  const calculateETA = () => {
    const baseTime = config.base_prep_minutes;
    const busyBuffer = (config.manual_busyness_pct / 100) * config.busy_buffer_minutes;
    return Math.round(baseTime + busyBuffer);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            <span className="ml-3 text-sm text-muted-foreground">Loading busyness rules...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Busy Day Settings</h3>
          <p className="text-sm text-muted-foreground">
            Tell the AI how long things take based on how busy you are
          </p>
        </div>
        {hasChanges && (
          <Button onClick={saveRules} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      {/* Info Banner - Simplified language */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-medium text-primary mb-1">How wait times work</p>
          <p className="text-muted-foreground">
            When you're not busy, the AI uses your base time. As you get busier, it adds extra time 
            so customers get realistic expectations.
          </p>
        </div>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Settings
          </CardTitle>
          <CardDescription>
            Set how long things take when you're free vs. slammed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Base Prep Time */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="base-prep">When not busy, how long do things take?</Label>
              <span className="text-sm font-medium">{config.base_prep_minutes} min</span>
            </div>
            <Input
              id="base-prep"
              type="number"
              min="0"
              step="5"
              value={config.base_prep_minutes}
              onChange={(e) => updateConfig({ base_prep_minutes: parseInt(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">
              Your typical turnaround time on a slow day
            </p>
          </div>

          {/* Busy Buffer */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="busy-buffer">Extra time when you're slammed?</Label>
              <span className="text-sm font-medium">+{config.busy_buffer_minutes} min</span>
            </div>
            <Input
              id="busy-buffer"
              type="number"
              min="0"
              step="5"
              value={config.busy_buffer_minutes}
              onChange={(e) => updateConfig({ busy_buffer_minutes: parseInt(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">
              How much longer things take when you're at 100% capacity
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Manual Busyness */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            How Busy Are You Right Now?
          </CardTitle>
          <CardDescription>
            Adjust this as your day changes — the AI will update wait times automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <Label>Slide to match your current workload</Label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{config.manual_busyness_pct}%</span>
                {config.manual_busyness_pct === 0 && <Badge variant="outline" className="text-green-500 border-green-500/30">Wide Open</Badge>}
                {config.manual_busyness_pct > 0 && config.manual_busyness_pct < 50 && <Badge variant="outline" className="text-blue-500 border-blue-500/30">Light Day</Badge>}
                {config.manual_busyness_pct >= 50 && config.manual_busyness_pct < 80 && <Badge variant="outline" className="text-amber-500 border-amber-500/30">Pretty Busy</Badge>}
                {config.manual_busyness_pct >= 80 && <Badge variant="outline" className="text-rose-500 border-rose-500/30">Slammed!</Badge>}
              </div>
            </div>

            <Slider
              value={[config.manual_busyness_pct]}
              onValueChange={([value]) => updateConfig({ manual_busyness_pct: value })}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Wide open</span>
              <span>Moderate</span>
              <span>Slammed</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Level-Based ETA Multipliers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            ETA Multipliers by Busyness Level
          </CardTitle>
          <CardDescription>
            How much to adjust ETAs and prices at each busyness level. The AI pricing engine uses these automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(["low", "medium", "high"] as const).map((level) => {
            const levelConfig = config[level] || { etaMultiplier: 1.0, surchargePercent: 0 };
            const labels = { low: "Low", medium: "Medium", high: "High" };
            const colors = { low: "text-green-500", medium: "text-amber-500", high: "text-rose-500" };
            return (
              <div key={level} className="grid grid-cols-3 gap-4 items-center border rounded-lg p-3">
                <div>
                  <Badge variant="outline" className={colors[level]}>
                    {labels[level]}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">ETA Multiplier</Label>
                  <Input
                    type="number"
                    min="1"
                    max="3"
                    step="0.1"
                    value={levelConfig.etaMultiplier}
                    onChange={(e) => updateConfig({
                      [level]: { ...levelConfig, etaMultiplier: parseFloat(e.target.value) || 1.0 },
                    })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Surcharge %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={levelConfig.surchargePercent}
                    onChange={(e) => updateConfig({
                      [level]: { ...levelConfig, surchargePercent: parseInt(e.target.value) || 0 },
                    })}
                  />
                </div>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            Example: At "High" busyness with 1.6x multiplier, a 30-min ETA becomes ~48 min.
          </p>
        </CardContent>
      </Card>

      {/* ETA Preview */}
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader>
          <CardTitle className="text-base">Current ETA Estimate</CardTitle>
          <CardDescription>
            What customers will hear based on current settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-3xl font-bold text-emerald-400">{calculateETA()} minutes</div>
              <p className="text-sm text-muted-foreground mt-1">
                {config.base_prep_minutes} min base
                {config.manual_busyness_pct > 0 && ` + ${Math.round((config.manual_busyness_pct / 100) * config.busy_buffer_minutes)} min busy buffer`}
              </p>
            </div>
            <div className="text-sm bg-muted/30 p-3 rounded-lg">
              <p className="text-muted-foreground mb-1">AI will say:</p>
              <p className="font-medium">
                {calculateETA() <= 30 && '"We can be there in about 30 minutes"'}
                {calculateETA() > 30 && calculateETA() <= 60 && '"We can be there in about 45 minutes to an hour"'}
                {calculateETA() > 60 && '"We can be there within the hour"'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold">1</span>
              </div>
              <div>
                <p className="font-medium">Set your base prep time</p>
                <p className="text-muted-foreground text-xs">
                  This is how long you need when you have zero appointments/orders
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold">2</span>
              </div>
              <div>
                <p className="font-medium">Set your busy day buffer</p>
                <p className="text-muted-foreground text-xs">
                  How much longer things take when you're slammed
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold">3</span>
              </div>
              <div>
                <p className="font-medium">Adjust busyness as your day changes</p>
                <p className="text-muted-foreground text-xs">
                  Slow morning? 0-20%. Lunch rush? 70-90%. Dead afternoon? Back to 0%.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
