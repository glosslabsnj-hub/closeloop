import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type EntityType = "order" | "booking" | "dispatch" | "reservation" | "catering" | "intake";
export type AuthMode = "none" | "header" | "basic";

export interface UniversalDeliverySettings {
  tenant_id: string;
  internal_enabled: boolean;
  webhook_enabled: boolean;
  webhook_url: string | null;
  webhook_secret: string | null;
  email_enabled: boolean;
  notify_email: string | null;
  sms_enabled: boolean;
  notify_phone: string | null;
  auth_mode: AuthMode;
  auth_header_name: string | null;
  auth_header_value: string | null;
  basic_user: string | null;
  basic_pass: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryRule {
  id: string;
  tenant_id: string;
  entity_type: EntityType;
  auto_confirm: boolean;
  review_queue_enabled: boolean;
  notify_on_new: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliveryAttempt {
  id: string;
  tenant_id: string;
  entity_type: EntityType;
  entity_id: string;
  method: "webhook" | "email" | "sms";
  status: "pending" | "success" | "failed";
  error_message: string | null;
  request_payload: Record<string, unknown> | null;
  response_body: string | null;
  created_at: string;
}

export function useUniversalDeliverySettings() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["universal_delivery_settings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      
      const { data, error } = await supabase
        .from("universal_delivery_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error) throw error;
      
      // Initialize if not exists
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from("universal_delivery_settings")
          .insert({ tenant_id: tenant.id })
          .select()
          .single();
        
        if (insertError) throw insertError;
        return newData as unknown as UniversalDeliverySettings;
      }
      
      return data as unknown as UniversalDeliverySettings;
    },
    enabled: !!tenant?.id,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<UniversalDeliverySettings>) => {
      if (!tenant?.id) throw new Error("No tenant");
      
      const { data, error } = await supabase
        .from("universal_delivery_settings")
        .update(updates as Record<string, unknown>)
        .eq("tenant_id", tenant.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["universal_delivery_settings", tenant?.id] });
      toast({ title: "Settings saved", description: "Delivery settings updated." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    updateSettings,
    isUpdating: updateSettings.isPending,
    refetch: query.refetch,
  };
}

export function useDeliveryRules() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["delivery_rules", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      
      const { data, error } = await supabase
        .from("delivery_rules")
        .select("*")
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      return data as unknown as DeliveryRule[];
    },
    enabled: !!tenant?.id,
  });

  const updateRule = useMutation({
    mutationFn: async ({ entityType, updates }: { entityType: EntityType; updates: Partial<DeliveryRule> }) => {
      if (!tenant?.id) throw new Error("No tenant");
      
      // Upsert the rule
      const { data, error } = await supabase
        .from("delivery_rules")
        .upsert({
          tenant_id: tenant.id,
          entity_type: entityType,
          ...updates,
        }, {
          onConflict: "tenant_id,entity_type",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery_rules", tenant?.id] });
      toast({ title: "Rule updated", description: "Automation rule saved." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getRuleForEntity = (entityType: EntityType): DeliveryRule | undefined => {
    return query.data?.find((r) => r.entity_type === entityType);
  };

  return {
    rules: query.data || [],
    isLoading: query.isLoading,
    updateRule,
    getRuleForEntity,
    isUpdating: updateRule.isPending,
    refetch: query.refetch,
  };
}

export function useDeliveryAttempts(entityType?: EntityType, entityId?: string) {
  const { tenant } = useAuth();

  return useQuery({
    queryKey: ["delivery_attempts", tenant?.id, entityType, entityId],
    queryFn: async () => {
      if (!tenant?.id) return [];
      
      let query = supabase
        .from("delivery_attempts")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (entityType) {
        query = query.eq("entity_type", entityType);
      }
      if (entityId) {
        query = query.eq("entity_id", entityId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as DeliveryAttempt[];
    },
    enabled: !!tenant?.id,
  });
}

export function useTestDelivery() {
  const { tenant } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ entityType, method }: { entityType: EntityType; method: "webhook" | "email" | "sms" }) => {
      if (!tenant?.id) throw new Error("No tenant");
      
      const response = await supabase.functions.invoke("universal-delivery", {
        body: {
          tenant_id: tenant.id,
          entity_type: entityType,
          entity_id: "test-" + Date.now(),
          test_mode: true,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.results?.webhook?.success || data?.results?.email?.success || data?.results?.sms?.success) {
        toast({ title: "Test sent", description: "Test delivery was successful." });
      } else {
        toast({ 
          title: "Test completed", 
          description: "Check results for any errors.",
          variant: "default",
        });
      }
    },
    onError: (error) => {
      toast({ title: "Test failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useTriggerDelivery() {
  const { tenant } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ entityType, entityId }: { entityType: EntityType; entityId: string }) => {
      if (!tenant?.id) throw new Error("No tenant");
      
      const response = await supabase.functions.invoke("universal-delivery", {
        body: {
          tenant_id: tenant.id,
          entity_type: entityType,
          entity_id: entityId,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      toast({ title: "Delivery triggered", description: "Item sent to configured destinations." });
    },
    onError: (error) => {
      toast({ title: "Delivery failed", description: error.message, variant: "destructive" });
    },
  });
}