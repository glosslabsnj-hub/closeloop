import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Gauge, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BusynessRulesConfig {
  base_prep_minutes: number;
  busy_buffer_minutes: number;
  manual_busyness_pct: number;
}

/**
 * Compact busyness slider for the dashboard.
 * Allows quick adjustment of current workload level.
 */
export function BusynessSliderWidget() {
  const { tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busynessPct, setBusynessPct] = useState(0);
  const [config, setConfig] = useState<BusynessRulesConfig | null>(null);

  // Load current busyness settings
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
          const rules = dataAny.busyness_rules_jsonb as BusynessRulesConfig;
          setConfig(rules);
          setBusynessPct(rules.manual_busyness_pct ?? 0);
        } else {
          // Default values if not configured
          setConfig({
            base_prep_minutes: 30,
            busy_buffer_minutes: 15,
            manual_busyness_pct: 0
          });
          setBusynessPct(0);
        }
      } catch (error) {
        console.error("Failed to load busyness settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tenant?.id]);

  // Save busyness value with debounce
  const saveBusyness = async (value: number) => {
    if (!tenant?.id || !config) return;

    setSaving(true);
    try {
      const updatedConfig = { ...config, manual_busyness_pct: value };
      
      const { error } = await supabase
        .from("tenants")
        .update({ busyness_rules_jsonb: updatedConfig } as any)
        .eq("id", tenant.id);

      if (error) throw error;
      
      setConfig(updatedConfig);
      toast.success(`Busyness set to ${value}%`);
    } catch (error) {
      console.error("Failed to save busyness:", error);
      toast.error("Failed to update busyness");
    } finally {
      setSaving(false);
    }
  };

  const handleSliderChange = (values: number[]) => {
    setBusynessPct(values[0]);
  };

  const handleSliderCommit = (values: number[]) => {
    saveBusyness(values[0]);
  };

  // Get status label and color
  const getStatus = () => {
    if (busynessPct === 0) return { label: "Wide Open", color: "text-success border-success/30" };
    if (busynessPct < 50) return { label: "Light", color: "text-blue-500 border-blue-500/30" };
    if (busynessPct < 80) return { label: "Busy", color: "text-amber-500 border-amber-500/30" };
    return { label: "Slammed", color: "text-destructive border-destructive/30" };
  };

  const status = getStatus();

  // Calculate current ETA adjustment
  const getETAImpact = () => {
    if (!config) return null;
    const buffer = Math.round((busynessPct / 100) * (config.busy_buffer_minutes ?? 15));
    return buffer > 0 ? `+${buffer} min` : null;
  };

  if (loading) {
    return (
      <Card className="border-2 border-border">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            busynessPct >= 80 ? "bg-destructive/10" : 
            busynessPct >= 50 ? "bg-amber-500/10" : 
            busynessPct > 0 ? "bg-blue-500/10" : "bg-success/10"
          )}>
            <Gauge className={cn(
              "h-5 w-5",
              busynessPct >= 80 ? "text-destructive" : 
              busynessPct >= 50 ? "text-amber-500" : 
              busynessPct > 0 ? "text-blue-500" : "text-success"
            )} />
          </div>

          {/* Slider Section */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Current Busyness</span>
                {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
              <div className="flex items-center gap-2">
                {getETAImpact() && (
                  <span className="text-xs text-muted-foreground">
                    ETA {getETAImpact()}
                  </span>
                )}
                <Badge variant="outline" className={cn("text-xs", status.color)}>
                  {status.label}
                </Badge>
                <span className="text-lg font-bold tabular-nums w-12 text-right">
                  {busynessPct}%
                </span>
              </div>
            </div>
            
            <Slider
              value={[busynessPct]}
              onValueChange={handleSliderChange}
              onValueCommit={handleSliderCommit}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
