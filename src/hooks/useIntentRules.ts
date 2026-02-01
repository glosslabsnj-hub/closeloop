import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type IntentRuleType =
  | "time_preference"
  | "upsell_rule"
  | "discount_guardrail"
  | "urgency_handling"
  | "capacity_protection"
  | "required_inputs";

export interface IntentRule {
  id: string;
  tenant_id: string;
  rule_type: IntentRuleType;
  name: string;
  description: string | null;
  condition_json: Record<string, any>;
  action_json: Record<string, any>;
  priority: number;
  is_enabled: boolean;
  is_suggested: boolean;
  suggested_reason: string | null;
  created_at: string;
  updated_at: string;
}

export const ruleTypeLabels: Record<IntentRuleType, string> = {
  time_preference: "Time Preference",
  upsell_rule: "Upsell Rule",
  discount_guardrail: "Discount Guardrail",
  urgency_handling: "Urgency Handling",
  capacity_protection: "Capacity Protection",
  required_inputs: "Required Questions",
};

export const ruleTypeIcons: Record<IntentRuleType, string> = {
  time_preference: "📅",
  upsell_rule: "📦",
  discount_guardrail: "💰",
  urgency_handling: "🚨",
  capacity_protection: "📊",
  required_inputs: "❓",
};

export const ruleTypeDescriptions: Record<IntentRuleType, string> = {
  time_preference: "Suggest earlier or later alternatives during peak times",
  upsell_rule: "Suggest add-ons or upgrades for specific services",
  discount_guardrail: "Control when discounts can be offered",
  urgency_handling: "Handle emergency or urgent requests appropriately",
  capacity_protection: "Discourage same-day bookings when capacity is high",
  required_inputs: "Define required questions for each intent (booking, order, dispatch, etc.)",
};

export function useIntentRules() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = tenant?.id;

  const { data: rules, isLoading, error } = useQuery({
    queryKey: ["intent-rules", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("business_intent_rules")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("priority", { ascending: false });

      if (error) throw error;
      return (data || []) as IntentRule[];
    },
    enabled: !!tenantId,
  });

  const createRule = useMutation({
    mutationFn: async (rule: Omit<IntentRule, "id" | "tenant_id" | "created_at" | "updated_at">) => {
      if (!tenantId) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("business_intent_rules")
        .insert({
          tenant_id: tenantId,
          ...rule,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intent-rules", tenantId] });
      toast.success("Rule created");
    },
    onError: (error) => {
      console.error("Failed to create rule:", error);
      toast.error("Failed to create rule");
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ ruleId, updates }: { ruleId: string; updates: Partial<IntentRule> }) => {
      const { error } = await supabase
        .from("business_intent_rules")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intent-rules", tenantId] });
      toast.success("Rule updated");
    },
    onError: (error) => {
      console.error("Failed to update rule:", error);
      toast.error("Failed to update rule");
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from("business_intent_rules")
        .delete()
        .eq("id", ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intent-rules", tenantId] });
      toast.success("Rule deleted");
    },
    onError: (error) => {
      console.error("Failed to delete rule:", error);
      toast.error("Failed to delete rule");
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ ruleId, isEnabled }: { ruleId: string; isEnabled: boolean }) => {
      const { error } = await supabase
        .from("business_intent_rules")
        .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
        .eq("id", ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intent-rules", tenantId] });
    },
    onError: (error) => {
      console.error("Failed to toggle rule:", error);
      toast.error("Failed to update rule");
    },
  });

  const approveRule = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from("business_intent_rules")
        .update({ 
          is_suggested: false, 
          is_enabled: true,
          updated_at: new Date().toISOString() 
        })
        .eq("id", ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intent-rules", tenantId] });
      toast.success("Rule approved and enabled");
    },
    onError: (error) => {
      console.error("Failed to approve rule:", error);
      toast.error("Failed to approve rule");
    },
  });

  const dismissRule = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from("business_intent_rules")
        .delete()
        .eq("id", ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intent-rules", tenantId] });
      toast.success("Suggestion dismissed");
    },
    onError: (error) => {
      console.error("Failed to dismiss rule:", error);
      toast.error("Failed to dismiss suggestion");
    },
  });

  // Categorized rules
  const activeRules = rules?.filter((r) => r.is_enabled && !r.is_suggested) || [];
  const inactiveRules = rules?.filter((r) => !r.is_enabled && !r.is_suggested) || [];
  const suggestedRules = rules?.filter((r) => r.is_suggested) || [];

  return {
    rules: rules || [],
    activeRules,
    inactiveRules,
    suggestedRules,
    isLoading,
    error,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    approveRule,
    dismissRule,
    isCreating: createRule.isPending,
    isUpdating: updateRule.isPending,
    isDeleting: deleteRule.isPending,
  };
}
