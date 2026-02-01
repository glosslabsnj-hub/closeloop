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

export interface BusynessRulesConfig {
  base_prep_minutes: number;
  busy_buffer_minutes: number;
  manual_busyness_pct: number; // 0-100
}

export function BusynessRulesEditor() {
  const { tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [config, setConfig] = useState<BusynessRulesConfig>({
    base_prep_minutes: 30,
    busy_buffer_minutes: 15,
    manual_busyness_pct: 0
  });

  useEffect(() => {
    if (!tenant?.id) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("tenants")
          .select("busyness_rules_jsonb")
          .eq("id", tenant.id)
          .single();

        if (error) throw error;

        if (data?.busyness_rules_jsonb) {
          setConfig(data.busyness_rules_jsonb as BusynessRulesConfig);
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
        .update({ busyness_rules_jsonb: config })
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
          <h3 className="text-lg font-semibold">Busyness & ETA Rules</h3>
          <p className="text-sm text-muted-foreground">
            Configure how AI estimates wait times and arrival times
          </p>
        </div>
        {hasChanges && (
          <Button onClick={saveRules} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
        <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-medium text-blue-400 mb-1">How ETA Calculation Works</p>
          <p className="text-muted-foreground">
            ETA = Base Prep Time + (Busyness % × Buffer Time). For example, if you're 50% busy,
            the AI adds half of the buffer time to your base prep time.
          </p>
        </div>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Configuration
          </CardTitle>
          <CardDescription>
            Set your base preparation time and busy-day buffer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Base Prep Time */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="base-prep">Base Preparation Time (minutes)</Label>
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
              Minimum time needed when you're not busy at all
            </p>
          </div>

          {/* Busy Buffer */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="busy-buffer">Busy Day Buffer (minutes)</Label>
              <span className="text-sm font-medium">{config.busy_buffer_minutes} min</span>
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
              Maximum additional time added when you're 100% busy
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Manual Busyness */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Current Busyness Level
          </CardTitle>
          <CardDescription>
            Manually adjust how busy you are right now (0% = dead, 100% = slammed)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <Label>Busyness</Label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{config.manual_busyness_pct}%</span>
                {config.manual_busyness_pct === 0 && <Badge variant="outline" className="text-green-400 border-green-500/30">Not Busy</Badge>}
                {config.manual_busyness_pct > 0 && config.manual_busyness_pct < 50 && <Badge variant="outline" className="text-blue-400 border-blue-500/30">Light</Badge>}
                {config.manual_busyness_pct >= 50 && config.manual_busyness_pct < 80 && <Badge variant="outline" className="text-amber-400 border-amber-500/30">Busy</Badge>}
                {config.manual_busyness_pct >= 80 && <Badge variant="outline" className="text-rose-400 border-rose-500/30">Very Busy</Badge>}
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
              <span>0% (Not busy)</span>
              <span>50% (Moderate)</span>
              <span>100% (Slammed)</span>
            </div>
          </div>
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
