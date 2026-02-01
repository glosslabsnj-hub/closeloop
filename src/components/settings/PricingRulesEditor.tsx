import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  DollarSign,
  Info,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Pricing rule types
type PricingRuleType = "flat" | "per-unit" | "tiered" | "distance-based" | "range-only" | "quote-only";

// Tier for tiered pricing
interface PricingTier {
  min_units: number;
  max_units: number | null;
  price_per_unit: number;
}

// Pricing rule structure
export interface PricingRule {
  id: string;
  type: PricingRuleType;
  service_id: string | null;
  service_name: string;
  required_inputs: string[];
  config: {
    // flat
    flat_price?: number;

    // per-unit
    per_unit_price?: number;
    unit_name?: string; // "mile", "hour", "item", etc.

    // tiered
    tiers?: PricingTier[];

    // distance-based
    base_price?: number;
    price_per_mile?: number;

    // range-only
    min_price?: number;
    max_price?: number;

    // All types can have modifiers
    modifiers?: {
      vehicle_type?: Record<string, number>; // e.g., { "suv": 1.2, "truck": 1.5 }
      service_level?: Record<string, number>; // e.g., { "standard": 1.0, "premium": 1.5 }
      urgency?: Record<string, number>; // e.g., { "normal": 1.0, "urgent": 2.0 }
    };
  };
}

interface PricingRulesConfig {
  rules: PricingRule[];
}

const ruleTypeLabels: Record<PricingRuleType, string> = {
  flat: "Flat Price",
  "per-unit": "Per-Unit Price",
  tiered: "Tiered Pricing",
  "distance-based": "Distance-Based",
  "range-only": "Price Range",
  "quote-only": "Quote Required"
};

const ruleTypeDescriptions: Record<PricingRuleType, string> = {
  flat: "Single fixed price (e.g., $149 for drain cleaning)",
  "per-unit": "Price per unit (e.g., $50/hour or $3/mile)",
  tiered: "Different prices based on quantity (e.g., 1-5 items: $10/ea, 6-10: $8/ea)",
  "distance-based": "Base price + per-mile rate (e.g., $75 + $2/mile)",
  "range-only": "Price range only, no exact quote (e.g., $200-$500)",
  "quote-only": "Requires custom quote (AI will say 'quote required')"
};

const availableInputs = [
  { value: "vehicle_type", label: "Vehicle Type" },
  { value: "miles", label: "Miles/Distance" },
  { value: "service_level", label: "Service Level" },
  { value: "urgency", label: "Urgency" },
  { value: "time_of_day", label: "Time of Day" },
  { value: "day_of_week", label: "Day of Week" },
  { value: "party_size", label: "Party Size" },
  { value: "item_count", label: "Item Count" }
];

export function PricingRulesEditor() {
  const { tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<PricingRulesConfig>({ rules: [] });
  const [services, setServices] = useState<Array<{ id: string; name: string }>>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!tenant?.id) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load existing pricing rules
        const { data: tenantData, error: tenantError } = await supabase
          .from("tenants")
          .select("pricing_rules_jsonb" as any)
          .eq("id", tenant.id)
          .single();

        if (tenantError) throw tenantError;

        const tenantDataAny = tenantData as any;
        if (tenantDataAny?.pricing_rules_jsonb) {
          setConfig(tenantDataAny.pricing_rules_jsonb as PricingRulesConfig);
        }

        // Load services
        const { data: servicesData, error: servicesError } = await supabase
          .from("services")
          .select("id, name")
          .eq("tenant_id", tenant.id)
          .order("name");

        if (servicesError) throw servicesError;
        setServices(servicesData || []);

      } catch (error) {
        console.error("Failed to load pricing rules:", error);
        toast.error("Failed to load pricing rules");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tenant?.id]);

  const addRule = () => {
    const newRule: PricingRule = {
      id: `rule_${Date.now()}`,
      type: "flat",
      service_id: null,
      service_name: "All Services",
      required_inputs: [],
      config: {
        flat_price: 0
      }
    };

    setConfig({
      ...config,
      rules: [...config.rules, newRule]
    });
    setHasChanges(true);
  };

  const updateRule = (index: number, updates: Partial<PricingRule>) => {
    const newRules = [...config.rules];
    newRules[index] = { ...newRules[index], ...updates };
    setConfig({ ...config, rules: newRules });
    setHasChanges(true);
  };

  const deleteRule = (index: number) => {
    const newRules = config.rules.filter((_, i) => i !== index);
    setConfig({ ...config, rules: newRules });
    setHasChanges(true);
  };

  const saveRules = async () => {
    if (!tenant?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({ pricing_rules_jsonb: config } as any)
        .eq("id", tenant.id);

      if (error) throw error;

      toast.success("Pricing rules saved successfully");
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save pricing rules:", error);
      toast.error("Failed to save pricing rules");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            <span className="ml-3 text-sm text-muted-foreground">Loading pricing rules...</span>
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
          <h3 className="text-lg font-semibold">Pricing Rules</h3>
          <p className="text-sm text-muted-foreground">
            Configure how AI quotes prices for your services
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
          <p className="font-medium text-blue-400 mb-1">How Pricing Rules Work</p>
          <p className="text-muted-foreground">
            The AI uses these rules to quote prices accurately. Flat prices give exact quotes,
            ranges give estimates, and quote-only tells customers to request a custom quote.
          </p>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {config.rules.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">No Pricing Rules</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add pricing rules to help your AI quote prices accurately
              </p>
              <Button onClick={addRule} className="gap-2">
                <Plus className="h-4 w-4" />
                Add First Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          config.rules.map((rule, index) => (
            <PricingRuleCard
              key={rule.id}
              rule={rule}
              services={services}
              onUpdate={(updates) => updateRule(index, updates)}
              onDelete={() => deleteRule(index)}
            />
          ))
        )}

        {config.rules.length > 0 && (
          <Button onClick={addRule} variant="outline" className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Add Another Rule
          </Button>
        )}
      </div>
    </div>
  );
}

interface PricingRuleCardProps {
  rule: PricingRule;
  services: Array<{ id: string; name: string }>;
  onUpdate: (updates: Partial<PricingRule>) => void;
  onDelete: () => void;
}

function PricingRuleCard({ rule, services, onUpdate, onDelete }: PricingRuleCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  const handleServiceChange = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    onUpdate({
      service_id: serviceId === "all" ? null : serviceId,
      service_name: serviceId === "all" ? "All Services" : (service?.name || "")
    });
  };

  const handleTypeChange = (type: PricingRuleType) => {
    // Reset config when type changes
    const newConfig: PricingRule["config"] = {};

    switch (type) {
      case "flat":
        newConfig.flat_price = 0;
        break;
      case "per-unit":
        newConfig.per_unit_price = 0;
        newConfig.unit_name = "unit";
        break;
      case "tiered":
        newConfig.tiers = [{ min_units: 1, max_units: 10, price_per_unit: 0 }];
        break;
      case "distance-based":
        newConfig.base_price = 0;
        newConfig.price_per_mile = 0;
        break;
      case "range-only":
        newConfig.min_price = 0;
        newConfig.max_price = 0;
        break;
      case "quote-only":
        // No config needed
        break;
    }

    onUpdate({ type, config: newConfig });
  };

  const toggleRequiredInput = (inputValue: string, checked: boolean) => {
    const newInputs = checked
      ? [...rule.required_inputs, inputValue]
      : rule.required_inputs.filter(i => i !== inputValue);

    onUpdate({ required_inputs: newInputs });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <div>
                  <CardTitle className="text-base">{rule.service_name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{ruleTypeLabels[rule.type]}</Badge>
                    {rule.required_inputs.length > 0 && (
                      <span className="text-xs">• Requires: {rule.required_inputs.join(", ")}</span>
                    )}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <Separator />

            {/* Service Selection */}
            <div className="grid gap-2">
              <Label>Service</Label>
              <Select
                value={rule.service_id || "all"}
                onValueChange={handleServiceChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {services.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rule Type */}
            <div className="grid gap-2">
              <Label>Pricing Type</Label>
              <Select
                value={rule.type}
                onValueChange={(v) => handleTypeChange(v as PricingRuleType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ruleTypeLabels) as PricingRuleType[]).map(type => (
                    <SelectItem key={type} value={type}>
                      {ruleTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ruleTypeDescriptions[rule.type]}
              </p>
            </div>

            {/* Type-Specific Config */}
            {rule.type === "flat" && (
              <div className="grid gap-2">
                <Label>Flat Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={rule.config.flat_price || 0}
                  onChange={(e) => onUpdate({
                    config: { ...rule.config, flat_price: parseFloat(e.target.value) || 0 }
                  })}
                  placeholder="149.00"
                />
              </div>
            )}

            {rule.type === "per-unit" && (
              <>
                <div className="grid gap-2">
                  <Label>Price Per Unit ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={rule.config.per_unit_price || 0}
                    onChange={(e) => onUpdate({
                      config: { ...rule.config, per_unit_price: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="50.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Unit Name</Label>
                  <Input
                    value={rule.config.unit_name || ""}
                    onChange={(e) => onUpdate({
                      config: { ...rule.config, unit_name: e.target.value }
                    })}
                    placeholder="hour, mile, item, etc."
                  />
                </div>
              </>
            )}

            {rule.type === "distance-based" && (
              <>
                <div className="grid gap-2">
                  <Label>Base Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={rule.config.base_price || 0}
                    onChange={(e) => onUpdate({
                      config: { ...rule.config, base_price: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="75.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Price Per Mile ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={rule.config.price_per_mile || 0}
                    onChange={(e) => onUpdate({
                      config: { ...rule.config, price_per_mile: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="2.50"
                  />
                </div>
              </>
            )}

            {rule.type === "range-only" && (
              <>
                <div className="grid gap-2">
                  <Label>Minimum Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={rule.config.min_price || 0}
                    onChange={(e) => onUpdate({
                      config: { ...rule.config, min_price: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="200.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Maximum Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={rule.config.max_price || 0}
                    onChange={(e) => onUpdate({
                      config: { ...rule.config, max_price: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="500.00"
                  />
                </div>
              </>
            )}

            {rule.type === "quote-only" && (
              <div className="p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
                AI will tell customers that pricing requires a custom quote and cannot be provided over the phone.
              </div>
            )}

            {/* Required Inputs */}
            {rule.type !== "quote-only" && (
              <div className="grid gap-3">
                <Label>Required Inputs (AI must ask before quoting)</Label>
                <div className="grid gap-2">
                  {availableInputs.map(input => (
                    <div key={input.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`${rule.id}-${input.value}`}
                        checked={rule.required_inputs.includes(input.value)}
                        onCheckedChange={(checked) => toggleRequiredInput(input.value, checked as boolean)}
                      />
                      <Label
                        htmlFor={`${rule.id}-${input.value}`}
                        className="font-normal cursor-pointer"
                      >
                        {input.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
