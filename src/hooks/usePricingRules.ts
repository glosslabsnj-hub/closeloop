import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface PricingRule {
  id: string;
  name: string;
  description: string;
  type: "surcharge" | "discount" | "fee";
  amount: number;
  amount_type: "percent" | "fixed";
  service_id: string | null; // null = global rule, uuid = service-scoped
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function usePricingRules() {
  const { tenant, refreshTenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = tenant?.id;

  const { data: rules, isLoading, error } = useQuery({
    queryKey: ["pricing-rules", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("tenants")
        .select("pricing_rules_json")
        .eq("id", tenantId)
        .single();

      if (error) throw error;

      const rulesJson = data?.pricing_rules_json;
      if (!rulesJson) return [];

      return (Array.isArray(rulesJson) ? rulesJson : []) as PricingRule[];
    },
    enabled: !!tenantId,
  });

  const saveRules = useMutation({
    mutationFn: async (newRules: PricingRule[]) => {
      if (!tenantId) throw new Error("No tenant");

      const { error } = await supabase
        .from("tenants")
        .update({ pricing_rules_json: newRules as unknown as Record<string, unknown>[] })
        .eq("id", tenantId);

      if (error) throw error;
      return newRules;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-rules", tenantId] });
      refreshTenant?.();
      toast({ title: "Pricing rules saved", description: "Your changes have been saved." });
    },
    onError: (error) => {
      console.error("Failed to save pricing rules:", error);
      toast({ title: "Error", description: "Failed to save pricing rules.", variant: "destructive" });
    },
  });

  const addRule = async (rule: Omit<PricingRule, "id" | "created_at" | "updated_at">) => {
    const newRule: PricingRule = {
      ...rule,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updatedRules = [...(rules || []), newRule];
    await saveRules.mutateAsync(updatedRules);
    return newRule;
  };

  const updateRule = async (id: string, updates: Partial<Omit<PricingRule, "id" | "created_at">>) => {
    const updatedRules = (rules || []).map((rule) =>
      rule.id === id
        ? { ...rule, ...updates, updated_at: new Date().toISOString() }
        : rule
    );
    await saveRules.mutateAsync(updatedRules);
  };

  const deleteRule = async (id: string) => {
    const updatedRules = (rules || []).filter((rule) => rule.id !== id);
    await saveRules.mutateAsync(updatedRules);
  };

  const toggleRuleActive = async (id: string, is_active: boolean) => {
    await updateRule(id, { is_active });
  };

  /**
   * Get applicable pricing rules for a given service.
   * Returns both global rules (service_id = null) and rules scoped to the specific service.
   */
  const getApplicablePricingRules = (serviceId?: string | null): PricingRule[] => {
    if (!rules) return [];

    return rules.filter((rule) => {
      if (!rule.is_active) return false;
      // Include global rules (service_id is null)
      if (rule.service_id === null) return true;
      // Include service-scoped rules if serviceId matches
      if (serviceId && rule.service_id === serviceId) return true;
      return false;
    });
  };

  /**
   * Get only global pricing rules (applicable to all services).
   */
  const getGlobalRules = (): PricingRule[] => {
    if (!rules) return [];
    return rules.filter((rule) => rule.service_id === null);
  };

  /**
   * Get pricing rules scoped to a specific service.
   */
  const getServiceScopedRules = (serviceId: string): PricingRule[] => {
    if (!rules) return [];
    return rules.filter((rule) => rule.service_id === serviceId);
  };

  return {
    rules: rules || [],
    isLoading,
    error,
    isSaving: saveRules.isPending,
    addRule,
    updateRule,
    deleteRule,
    toggleRuleActive,
    saveRules: saveRules.mutateAsync,
    getApplicablePricingRules,
    getGlobalRules,
    getServiceScopedRules,
  };
}
