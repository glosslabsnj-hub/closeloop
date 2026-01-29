import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useServices } from "@/hooks/useServices";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Brain, 
  DollarSign, 
  Clock, 
  Users, 
  ShieldCheck,
  TrendingUp,
  ChevronDown,
  Loader2,
  Save,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

interface PolicyConfig {
  enabled: boolean;
  guidance: string;
  thresholds?: Record<string, number | string>;
}

interface BusinessPolicies {
  upsell: PolicyConfig & {
    thresholds: {
      min_order_value: number;
      max_suggestions: number;
    };
  };
  pricing: PolicyConfig & {
    thresholds: {
      max_discount_percent: number;
      loyalty_threshold_orders: number;
    };
  };
  capacity: PolicyConfig & {
    thresholds: {
      busy_threshold_percent: number;
      advance_booking_hours: number;
    };
  };
  recognition: PolicyConfig;
  escalation: PolicyConfig;
}

const defaultPolicies: BusinessPolicies = {
  upsell: {
    enabled: true,
    guidance: "Suggest relevant add-ons only after the customer has confirmed their main order. Match suggestions to what they're already getting. Never push if they seem rushed or frustrated.",
    thresholds: {
      min_order_value: 0,
      max_suggestions: 2,
    },
  },
  pricing: {
    enabled: true,
    guidance: "Politely decline discount requests by emphasizing value and quality. For loyal repeat customers, you may offer a small courtesy discount. Never negotiate below cost.",
    thresholds: {
      max_discount_percent: 10,
      loyalty_threshold_orders: 5,
    },
  },
  capacity: {
    enabled: true,
    guidance: "When capacity is limited, suggest alternative times nearby. For peak hours, mention shorter wait times if they book slightly earlier or later. Don't oversell - protect service quality.",
    thresholds: {
      busy_threshold_percent: 80,
      advance_booking_hours: 2,
    },
  },
  recognition: {
    enabled: true,
    guidance: "Recognize repeat customers warmly. Reference their past orders when relevant. Thank loyal customers. For first-time callers, be welcoming and helpful without being overwhelming.",
  },
  escalation: {
    enabled: true,
    guidance: "Transfer to a human if the customer asks to speak to a manager, expresses serious frustration, has a complaint, or if the request is outside your knowledge. Never argue with upset customers.",
  },
};

export function AIBusinessPolicies() {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const { services } = useServices();
  const queryClient = useQueryClient();
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>("upsell");

  const { data: policies, isLoading } = useQuery({
    queryKey: ["ai-business-policies", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return defaultPolicies;
      
      const { data } = await supabase
        .from("tenants")
        .select("ai_policies_json")
        .eq("id", tenant.id)
        .single();
      
      if (data?.ai_policies_json && typeof data.ai_policies_json === 'object') {
        const stored = data.ai_policies_json as Record<string, unknown>;
        return { ...defaultPolicies, ...stored } as BusinessPolicies;
      }
      return defaultPolicies;
    },
    enabled: !!tenant?.id,
  });

  const [localPolicies, setLocalPolicies] = useState<BusinessPolicies | null>(null);
  const effectivePolicies = localPolicies ?? policies ?? defaultPolicies;

  const saveMutation = useMutation({
    mutationFn: async (newPolicies: BusinessPolicies) => {
      if (!tenant?.id) throw new Error("No tenant");
      
      const { error } = await supabase
        .from("tenants")
        .update({ ai_policies_json: newPolicies as any })
        .eq("id", tenant.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-business-policies"] });
      toast.success("AI policies saved");
      setLocalPolicies(null);
    },
    onError: (error: Error) => {
      toast.error("Failed to save", { description: error.message });
    },
  });

  const updatePolicy = <K extends keyof BusinessPolicies>(
    key: K,
    updates: Partial<BusinessPolicies[K]>
  ) => {
    setLocalPolicies(prev => {
      const current = prev ?? effectivePolicies;
      return {
        ...current,
        [key]: { ...current[key], ...updates },
      };
    });
  };

  const updateThreshold = <K extends keyof BusinessPolicies>(
    policyKey: K,
    thresholdKey: string,
    value: number | string
  ) => {
    setLocalPolicies(prev => {
      const current = prev ?? effectivePolicies;
      const policy = current[policyKey];
      return {
        ...current,
        [policyKey]: {
          ...policy,
          thresholds: {
            ...(policy.thresholds ?? {}),
            [thresholdKey]: value,
          },
        },
      };
    });
  };

  const hasChanges = localPolicies !== null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const policyConfigs = [
    {
      key: "upsell" as const,
      icon: TrendingUp,
      title: "Upsell & Cross-sell",
      description: "How AI suggests additional items or upgrades",
      color: "text-green-600",
      hasThresholds: true,
    },
    {
      key: "pricing" as const,
      icon: DollarSign,
      title: "Pricing & Discounts",
      description: "How AI handles discount requests and price negotiations",
      color: "text-amber-600",
      hasThresholds: true,
    },
    {
      key: "capacity" as const,
      icon: Clock,
      title: "Capacity & Scheduling",
      description: "How AI manages busy times and availability",
      color: "text-blue-600",
      hasThresholds: true,
    },
    {
      key: "recognition" as const,
      icon: Users,
      title: "Customer Recognition",
      description: "How AI treats repeat vs new customers",
      color: "text-purple-600",
      hasThresholds: false,
    },
    {
      key: "escalation" as const,
      icon: ShieldCheck,
      title: "Escalation Rules",
      description: "When AI should transfer to a human",
      color: "text-red-600",
      hasThresholds: false,
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Brain className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Smart AI Behavior</p>
              <p className="text-sm text-muted-foreground">
                These policies give your AI judgment about <em>when</em> and <em>how</em> to act—not rigid 
                if-then rules. The AI reads the conversation context and applies these thoughtfully.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {policyConfigs.map(({ key, icon: Icon, title, description, color, hasThresholds }) => {
        const policy = effectivePolicies[key];
        const isExpanded = expandedPolicy === key;
        
        return (
          <Collapsible key={key} open={isExpanded} onOpenChange={() => setExpandedPolicy(isExpanded ? null : key)}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-background ${color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {title}
                          {policy.enabled ? (
                            <Badge variant="secondary" className="text-xs">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Disabled</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-sm">{description}</CardDescription>
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${key}-enabled`} className="font-medium">
                      Enable this policy
                    </Label>
                    <Switch
                      id={`${key}-enabled`}
                      checked={policy.enabled}
                      onCheckedChange={(enabled) => updatePolicy(key, { enabled })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5" />
                      AI Guidance
                    </Label>
                    <Textarea
                      value={policy.guidance}
                      onChange={(e) => updatePolicy(key, { guidance: e.target.value })}
                      placeholder="Describe how the AI should handle this..."
                      className="min-h-[100px] text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Write in plain English. The AI will interpret this intelligently based on conversation context.
                    </p>
                  </div>

                  {hasThresholds && key === "upsell" && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label className="text-sm">Min order value to suggest</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">$</span>
                          <Input
                            type="number"
                            min={0}
                            value={(policy as BusinessPolicies["upsell"]).thresholds.min_order_value}
                            onChange={(e) => updateThreshold(key, "min_order_value", parseInt(e.target.value) || 0)}
                            className="w-24"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Max suggestions per call</Label>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          value={(policy as BusinessPolicies["upsell"]).thresholds.max_suggestions}
                          onChange={(e) => updateThreshold(key, "max_suggestions", parseInt(e.target.value) || 2)}
                          className="w-24"
                        />
                      </div>
                    </div>
                  )}

                  {hasThresholds && key === "pricing" && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label className="text-sm">Max discount allowed</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={50}
                            value={(policy as BusinessPolicies["pricing"]).thresholds.max_discount_percent}
                            onChange={(e) => updateThreshold(key, "max_discount_percent", parseInt(e.target.value) || 0)}
                            className="w-24"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Loyalty after # orders</Label>
                        <Input
                          type="number"
                          min={1}
                          value={(policy as BusinessPolicies["pricing"]).thresholds.loyalty_threshold_orders}
                          onChange={(e) => updateThreshold(key, "loyalty_threshold_orders", parseInt(e.target.value) || 5)}
                          className="w-24"
                        />
                      </div>
                    </div>
                  )}

                  {hasThresholds && key === "capacity" && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label className="text-sm">Busy when capacity hits</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={50}
                            max={100}
                            value={(policy as BusinessPolicies["capacity"]).thresholds.busy_threshold_percent}
                            onChange={(e) => updateThreshold(key, "busy_threshold_percent", parseInt(e.target.value) || 80)}
                            className="w-24"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Suggest advance booking</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            value={(policy as BusinessPolicies["capacity"]).thresholds.advance_booking_hours}
                            onChange={(e) => updateThreshold(key, "advance_booking_hours", parseInt(e.target.value) || 2)}
                            className="w-24"
                          />
                          <span className="text-muted-foreground">hrs</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {hasChanges && (
        <div className="flex justify-end pt-2">
          <Button onClick={() => saveMutation.mutate(effectivePolicies)} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Policies
          </Button>
        </div>
      )}
    </div>
  );
}
