import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Loader2, Clock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BusynessRulesConfig {
  base_buffer_minutes: number;
  busy_buffer_minutes: number;
  manual_busyness_pct: number;
  use_queue_metrics: boolean;
  low?: {
    busynessLevel: "low";
    etaMultiplier: number;
  };
  medium?: {
    busynessLevel: "medium";
    etaMultiplier: number;
  };
  high?: {
    busynessLevel: "high";
    etaMultiplier: number;
  };
}

const DEFAULT_CONFIG: BusynessRulesConfig = {
  base_buffer_minutes: 15,
  busy_buffer_minutes: 30,
  manual_busyness_pct: 50,
  use_queue_metrics: false,
  low: {
    busynessLevel: "low",
    etaMultiplier: 1.0,
  },
  medium: {
    busynessLevel: "medium",
    etaMultiplier: 1.3,
  },
  high: {
    busynessLevel: "high",
    etaMultiplier: 1.8,
  },
};

export function BusynessRulesEditor() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [baseBuffer, setBaseBuffer] = useState(15);
  const [busyBuffer, setBusyBuffer] = useState(30);
  const [manualBusyness, setManualBusyness] = useState(50);
  const [useQueueMetrics, setUseQueueMetrics] = useState(false);

  // Fetch existing busyness rules
  const rulesQuery = useQuery({
    queryKey: ["busyness_rules", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return DEFAULT_CONFIG;

      const { data, error } = await supabase
        .from("tenants")
        .select("busyness_rules_jsonb")
        .eq("id", tenant.id)
        .single();

      if (error) throw error;

      // Merge with defaults to ensure all fields exist
      const stored = (data?.busyness_rules_jsonb as BusynessRulesConfig) || {};
      return { ...DEFAULT_CONFIG, ...stored };
    },
    enabled: !!tenant?.id,
  });

  // Initialize form state from query data
  useEffect(() => {
    if (rulesQuery.data) {
      setBaseBuffer(rulesQuery.data.base_buffer_minutes || 15);
      setBusyBuffer(rulesQuery.data.busy_buffer_minutes || 30);
      setManualBusyness(rulesQuery.data.manual_busyness_pct || 50);
      setUseQueueMetrics(rulesQuery.data.use_queue_metrics || false);
    }
  }, [rulesQuery.data]);

  // Save busyness rules mutation
  const saveMutation = useMutation({
    mutationFn: async (config: BusynessRulesConfig) => {
      if (!tenant?.id) throw new Error("No tenant");

      const { error } = await supabase
        .from("tenants")
        .update({ busyness_rules_jsonb: config as any })
        .eq("id", tenant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["busyness_rules", tenant?.id] });
      toast({ title: "Busyness settings saved", description: "Your ETA calculations have been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    // Validate
    if (baseBuffer < 0 || busyBuffer < 0) {
      toast({
        title: "Validation error",
        description: "Buffer times must be positive numbers",
        variant: "destructive",
      });
      return;
    }

    if (busyBuffer < baseBuffer) {
      toast({
        title: "Validation warning",
        description: "Busy buffer is typically longer than base buffer",
        variant: "destructive",
      });
      return;
    }

    // Calculate ETA multipliers based on manual busyness percentage
    const busynessLevel = manualBusyness < 33 ? "low" : manualBusyness < 66 ? "medium" : "high";
    const multiplier = 1 + (manualBusyness / 100);

    const config: BusynessRulesConfig = {
      base_buffer_minutes: baseBuffer,
      busy_buffer_minutes: busyBuffer,
      manual_busyness_pct: manualBusyness,
      use_queue_metrics: useQueueMetrics,
      low: {
        busynessLevel: "low",
        etaMultiplier: 1.0,
      },
      medium: {
        busynessLevel: "medium",
        etaMultiplier: 1.3,
      },
      high: {
        busynessLevel: "high",
        etaMultiplier: 1.8,
      },
    };

    saveMutation.mutate(config);
  };

  const getBusynessLabel = (pct: number) => {
    if (pct < 33) return "Low";
    if (pct < 66) return "Medium";
    return "High";
  };

  const getBusynessColor = (pct: number) => {
    if (pct < 33) return "text-green-600 dark:text-green-400";
    if (pct < 66) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  if (rulesQuery.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Busyness & ETA Settings</CardTitle>
            <CardDescription>
              Configure how your AI estimates wait times and service readiness based on current demand.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Base Buffer */}
        <div className="space-y-2">
          <Label>Base Prep/Service Buffer (minutes)</Label>
          <Input
            type="number"
            min="0"
            value={baseBuffer}
            onChange={(e) => setBaseBuffer(parseInt(e.target.value) || 0)}
            placeholder="15"
          />
          <p className="text-xs text-muted-foreground">
            Baseline time added to all ETAs when business is not busy
          </p>
        </div>

        {/* Busy Buffer */}
        <div className="space-y-2">
          <Label>Busy Buffer (minutes)</Label>
          <Input
            type="number"
            min="0"
            value={busyBuffer}
            onChange={(e) => setBusyBuffer(parseInt(e.target.value) || 0)}
            placeholder="30"
          />
          <p className="text-xs text-muted-foreground">
            Additional time added when business is marked as busy
          </p>
        </div>

        {/* Manual Busyness Override */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Current Busyness Level</Label>
            <span className={`text-sm font-medium ${getBusynessColor(manualBusyness)}`}>
              {getBusynessLabel(manualBusyness)} ({manualBusyness}%)
            </span>
          </div>
          <Slider
            value={[manualBusyness]}
            onValueChange={(value) => setManualBusyness(value[0])}
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0% (Not Busy)</span>
            <span>50% (Moderate)</span>
            <span>100% (Very Busy)</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Manually set how busy you are right now. This affects ETA calculations immediately.
          </p>
        </div>

        {/* Queue Metrics Toggle */}
        <div className="flex items-center justify-between py-3 border-t">
          <div className="space-y-1">
            <Label>Use Queue Metrics (Advanced)</Label>
            <p className="text-xs text-muted-foreground">
              Automatically calculate busyness from current queue length instead of manual override
            </p>
          </div>
          <Switch checked={useQueueMetrics} onCheckedChange={setUseQueueMetrics} />
        </div>

        {useQueueMetrics && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              When enabled, the system will use real-time queue data from bookings and orders to calculate
              ETAs. Manual busyness percentage will be ignored.
            </AlertDescription>
          </Alert>
        )}

        {/* Save Button */}
        <div className="flex gap-3 pt-4">
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Settings
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setBaseBuffer(DEFAULT_CONFIG.base_buffer_minutes);
              setBusyBuffer(DEFAULT_CONFIG.busy_buffer_minutes);
              setManualBusyness(DEFAULT_CONFIG.manual_busyness_pct);
              setUseQueueMetrics(DEFAULT_CONFIG.use_queue_metrics);
            }}
          >
            Reset to Defaults
          </Button>
        </div>

        {/* Info Card */}
        <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
          <div className="font-medium">How ETA Calculation Works:</div>
          <ul className="space-y-1 text-muted-foreground list-disc list-inside">
            <li>
              <strong>Low busyness (0-33%):</strong> Uses base buffer (1.0x multiplier)
            </li>
            <li>
              <strong>Medium busyness (34-66%):</strong> Uses base buffer + 30% (1.3x multiplier)
            </li>
            <li>
              <strong>High busyness (67-100%):</strong> Uses base buffer + 80% (1.8x multiplier)
            </li>
            <li>When queue metrics are enabled, busyness is calculated from pending orders/bookings</li>
          </ul>
        </div>

        {/* Current Config Preview */}
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            View stored configuration (JSON)
          </summary>
          <pre className="mt-2 p-3 rounded bg-muted overflow-auto">
            {JSON.stringify(
              {
                base_buffer_minutes: baseBuffer,
                busy_buffer_minutes: busyBuffer,
                manual_busyness_pct: manualBusyness,
                use_queue_metrics: useQueueMetrics,
                low: { busynessLevel: "low", etaMultiplier: 1.0 },
                medium: { busynessLevel: "medium", etaMultiplier: 1.3 },
                high: { busynessLevel: "high", etaMultiplier: 1.8 },
              },
              null,
              2
            )}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}
