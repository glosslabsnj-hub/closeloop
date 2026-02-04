import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, DollarSign, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PricingEtaGuidance } from "@/components/brain/guidance";

interface PricingRule {
  id: string;
  name: string;
  ruleType: "fixed" | "range" | "conditional";
  enabled?: boolean;
  conditions?: Record<string, any>;
  requiredInputs?: string[];
  fixedPrice?: number; // cents
  rangeMin?: number; // cents
  rangeMax?: number; // cents
  priority: number;
}

const RULE_TYPE_OPTIONS = [
  { value: "fixed", label: "Fixed Price", description: "A single, exact price for this rule" },
  { value: "range", label: "Price Range", description: "Minimum and maximum price estimate" },
  { value: "conditional", label: "Conditional", description: "Price depends on specific conditions" },
];

export function PricingRulesEditor() {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [newRule, setNewRule] = useState<Partial<PricingRule>>({
    name: "",
    ruleType: "fixed",
    enabled: true,
    priority: 10,
    requiredInputs: [],
  });

  // Fetch existing pricing rules
  const rulesQuery = useQuery({
    queryKey: ["pricing_rules", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const { data, error } = await supabase
        .from("tenants")
        .select("pricing_rules_jsonb")
        .eq("id", tenant.id)
        .single();

      if (error) throw error;
      
      // Safe extraction: handle array, object with rules, or null
      const jsonb = data?.pricing_rules_jsonb;
      if (!jsonb) return [];
      if (Array.isArray(jsonb)) return jsonb as unknown as PricingRule[];
      if (typeof jsonb === 'object' && 'rules' in jsonb && Array.isArray((jsonb as Record<string, unknown>).rules)) {
        return (jsonb as Record<string, unknown>).rules as unknown as PricingRule[];
      }
      return [];
    },
    enabled: !!tenant?.id,
  });

  // Save pricing rules mutation
  const saveMutation = useMutation({
    mutationFn: async (rules: PricingRule[]) => {
      if (!tenant?.id) throw new Error("No tenant");

      const { error } = await supabase
        .from("tenants")
        .update({ pricing_rules_jsonb: rules as any })
        .eq("id", tenant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing_rules", tenant?.id] });
      toast({ title: "Pricing rules saved", description: "Your changes have been saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rules = rulesQuery.data || [];

  const handleAddRule = () => {
    // Validate
    const errors = validateRule(newRule);
    if (errors.length > 0) {
      toast({
        title: "Validation errors",
        description: errors.join(". "),
        variant: "destructive",
      });
      return;
    }

    const ruleToAdd: PricingRule = {
      id: crypto.randomUUID(),
      name: newRule.name!,
      ruleType: newRule.ruleType as "fixed" | "range" | "conditional",
      enabled: newRule.enabled ?? true,
      priority: newRule.priority || 10,
      requiredInputs: newRule.requiredInputs || [],
      conditions: newRule.conditions,
      fixedPrice: newRule.fixedPrice,
      rangeMin: newRule.rangeMin,
      rangeMax: newRule.rangeMax,
    };

    saveMutation.mutate([...rules, ruleToAdd]);
    resetWizard();
  };

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    const updatedRules = rules.map((r) =>
      r.id === ruleId ? { ...r, enabled } : r
    );
    saveMutation.mutate(updatedRules);
  };

  const handleDeleteRule = (ruleId: string) => {
    const updatedRules = rules.filter((r) => r.id !== ruleId);
    saveMutation.mutate(updatedRules);
  };

  const resetWizard = () => {
    setNewRule({
      name: "",
      ruleType: "fixed",
      enabled: true,
      priority: 10,
      requiredInputs: [],
    });
    setWizardStep(1);
    setIsAddDialogOpen(false);
  };

  const validateRule = (rule: Partial<PricingRule>): string[] => {
    const errors: string[] = [];

    if (!rule.name || rule.name.trim() === "") {
      errors.push("Rule name is required");
    }

    if (rule.ruleType === "fixed") {
      if (rule.fixedPrice === undefined || rule.fixedPrice < 0) {
        errors.push("Fixed price must be a positive number");
      }
    }

    if (rule.ruleType === "range") {
      if (rule.rangeMin === undefined || rule.rangeMin < 0) {
        errors.push("Range minimum must be a positive number");
      }
      if (rule.rangeMax === undefined || rule.rangeMax < 0) {
        errors.push("Range maximum must be a positive number");
      }
      if (rule.rangeMin !== undefined && rule.rangeMax !== undefined && rule.rangeMin > rule.rangeMax) {
        errors.push("Range minimum cannot be greater than maximum");
      }
    }

    if (rule.ruleType === "conditional") {
      if (rule.fixedPrice === undefined || rule.fixedPrice < 0) {
        errors.push("Conditional rules must have a fixed price");
      }
    }

    return errors;
  };

  const formatPrice = (cents?: number) => {
    if (cents === undefined) return "-";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getRuleTypeBadgeColor = (type: string) => {
    switch (type) {
      case "fixed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "range":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "conditional":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      default:
        return "";
    }
  };

  const renderWizardStep = () => {
    switch (wizardStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                placeholder="e.g., Standard Service Pricing"
              />
            </div>

            <div className="space-y-2">
              <Label>Rule Type *</Label>
              <Select
                value={newRule.ruleType}
                onValueChange={(value) =>
                  setNewRule({ ...newRule, ruleType: value as "fixed" | "range" | "conditional" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div>
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Input
                type="number"
                value={newRule.priority}
                onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 10 })}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">
                Higher priority rules are checked first
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            {newRule.ruleType === "fixed" && (
              <div className="space-y-2">
                <Label>Fixed Price (USD) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-8"
                    value={newRule.fixedPrice ? newRule.fixedPrice / 100 : ""}
                    onChange={(e) =>
                      setNewRule({ ...newRule, fixedPrice: Math.round(parseFloat(e.target.value) * 100) || 0 })
                    }
                    placeholder="149.00"
                  />
                </div>
              </div>
            )}

            {newRule.ruleType === "range" && (
              <>
                <div className="space-y-2">
                  <Label>Minimum Price (USD) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-8"
                      value={newRule.rangeMin ? newRule.rangeMin / 100 : ""}
                      onChange={(e) =>
                        setNewRule({ ...newRule, rangeMin: Math.round(parseFloat(e.target.value) * 100) || 0 })
                      }
                      placeholder="100.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Maximum Price (USD) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-8"
                      value={newRule.rangeMax ? newRule.rangeMax / 100 : ""}
                      onChange={(e) =>
                        setNewRule({ ...newRule, rangeMax: Math.round(parseFloat(e.target.value) * 100) || 0 })
                      }
                      placeholder="300.00"
                    />
                  </div>
                </div>
              </>
            )}

            {newRule.ruleType === "conditional" && (
              <>
                <div className="space-y-2">
                  <Label>Condition Field</Label>
                  <Input
                    value={(newRule.conditions as any)?.field || ""}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        conditions: { ...(newRule.conditions || {}), field: e.target.value },
                      })
                    }
                    placeholder="e.g., urgency, service_type"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Condition Value</Label>
                  <Input
                    value={(newRule.conditions as any)?.value || ""}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        conditions: { ...(newRule.conditions || {}), value: e.target.value },
                      })
                    }
                    placeholder="e.g., high, drain_cleaning"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Price (USD) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-8"
                      value={newRule.fixedPrice ? newRule.fixedPrice / 100 : ""}
                      onChange={(e) =>
                        setNewRule({ ...newRule, fixedPrice: Math.round(parseFloat(e.target.value) * 100) || 0 })
                      }
                      placeholder="199.00"
                    />
                  </div>
                </div>
              </>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Prices are stored in cents to avoid rounding errors. Enter dollar amounts and they'll be
                converted automatically.
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
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
    <div className="space-y-6">
      {/* Pricing & ETA Guidance */}
      <PricingEtaGuidance businessMode={businessMode} />
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pricing Rules</CardTitle>
              <CardDescription>
                Define pricing rules for services, estimates, and quotes. These power your AI's pricing
                decisions.
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>
                    {wizardStep === 1 ? "New Pricing Rule" : "Set Price Amount"}
                  </DialogTitle>
                  <DialogDescription>
                    {wizardStep === 1
                      ? "Choose a name and type for your pricing rule"
                      : "Configure the price or price range for this rule"}
                  </DialogDescription>
                </DialogHeader>

                {renderWizardStep()}

                <DialogFooter>
                  {wizardStep > 1 && (
                    <Button variant="outline" onClick={() => setWizardStep(wizardStep - 1)}>
                      Back
                    </Button>
                  )}
                  {wizardStep < 2 ? (
                    <Button onClick={() => setWizardStep(2)}>Next</Button>
                  ) : (
                    <Button onClick={handleAddRule} disabled={saveMutation.isPending}>
                      {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Add Rule
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No pricing rules yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first pricing rule to help your AI provide accurate quotes and estimates.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">{rule.name}</h4>
                      <Badge className={getRuleTypeBadgeColor(rule.ruleType)}>
                        {rule.ruleType}
                      </Badge>
                      {!rule.enabled && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {rule.ruleType === "fixed" && (
                        <span>Fixed price: {formatPrice(rule.fixedPrice)}</span>
                      )}
                      {rule.ruleType === "range" && (
                        <span>
                          Range: {formatPrice(rule.rangeMin)} - {formatPrice(rule.rangeMax)}
                        </span>
                      )}
                      {rule.ruleType === "conditional" && (
                        <span>
                          Conditional: {formatPrice(rule.fixedPrice)} •{" "}
                          {rule.conditions && Object.keys(rule.conditions).length > 0
                            ? `${Object.keys(rule.conditions).length} condition(s)`
                            : "No conditions"}
                        </span>
                      )}
                      {" • "}Priority: {rule.priority}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.enabled !== false}
                      onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                      disabled={saveMutation.isPending}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRule(rule.id)}
                      disabled={saveMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How Pricing Rules Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <strong className="text-foreground">Fixed Price:</strong> Use when you have a single,
            exact price for a service (e.g., "Oil change: $49.99").
          </div>
          <div>
            <strong className="text-foreground">Price Range:</strong> Use when pricing varies but you
            can provide a minimum and maximum (e.g., "HVAC repair: $200-$500").
          </div>
          <div>
            <strong className="text-foreground">Conditional:</strong> Use when price depends on
            specific conditions (e.g., "Urgent service: $199" vs "Standard service: $149").
          </div>
          <div>
            <strong className="text-foreground">Priority:</strong> Higher priority rules are matched
            first. Use this to create specific rules that override general ones.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
