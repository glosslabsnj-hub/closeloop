import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface KnowledgeMergeItem {
  id: string;
  tenant_id: string;
  upload_id: string | null;
  entity_type: "service" | "menu_item" | "policy" | "faq" | "intake_field" | "menu_category";
  entity_key: string;
  existing_value: Record<string, unknown> | null;
  proposed_value: Record<string, unknown>;
  conflict_type: "different_price" | "missing_field" | "name_mismatch" | "duplicate" | "new_item" | "other";
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

export function useKnowledgeMergeQueue() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  // Fetch pending merge queue items
  const { data: pendingItems = [], isLoading, refetch } = useQuery({
    queryKey: ["knowledge-merge-queue", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const { data, error } = await supabase
        .from("knowledge_merge_queue")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as KnowledgeMergeItem[];
    },
    enabled: !!tenant?.id,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!tenant?.id) return;

    const channel = supabase
      .channel(`knowledge-merge-${tenant.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "knowledge_merge_queue",
          filter: `tenant_id=eq.${tenant.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["knowledge-merge-queue", tenant.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, queryClient]);

  // Accept a merge item (apply to structured truth)
  const acceptMutation = useMutation({
    mutationFn: async (item: KnowledgeMergeItem) => {
      // Apply the change to the appropriate table
      await applyMergeItem(item, tenant!.id);

      // Mark as accepted
      const { error } = await supabase
        .from("knowledge_merge_queue")
        .update({ status: "accepted" })
        .eq("id", item.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-merge-queue", tenant?.id] });
      // Also invalidate related data
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["business-faqs"] });
    },
  });

  // Reject a merge item
  const rejectMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("knowledge_merge_queue")
        .update({ status: "rejected" })
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-merge-queue", tenant?.id] });
    },
  });

  // Accept all pending items
  const acceptAllMutation = useMutation({
    mutationFn: async () => {
      for (const item of pendingItems) {
        await applyMergeItem(item, tenant!.id);
        await supabase
          .from("knowledge_merge_queue")
          .update({ status: "accepted" })
          .eq("id", item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-merge-queue", tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["business-faqs"] });
    },
  });

  // Reject all pending items
  const rejectAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("knowledge_merge_queue")
        .update({ status: "rejected" })
        .eq("tenant_id", tenant?.id)
        .eq("status", "pending");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-merge-queue", tenant?.id] });
    },
  });

  return {
    pendingItems,
    pendingCount: pendingItems.length,
    isLoading,
    refetch,
    acceptItem: acceptMutation.mutateAsync,
    rejectItem: rejectMutation.mutateAsync,
    acceptAll: acceptAllMutation.mutateAsync,
    rejectAll: rejectAllMutation.mutateAsync,
    isAccepting: acceptMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}

// Helper to apply merge item to structured truth
async function applyMergeItem(item: KnowledgeMergeItem, tenantId: string) {
  const { entity_type, entity_key, existing_value, proposed_value } = item;

  switch (entity_type) {
    case "service": {
      if (existing_value?.id) {
        // Update existing service
        await supabase
          .from("services")
          .update({
            name: proposed_value.name as string,
            description: proposed_value.description as string || null,
            duration_minutes: proposed_value.duration_minutes as number || 60,
            price_cents: proposed_value.price_cents as number || proposed_value.price as number * 100 || 0,
          })
          .eq("id", existing_value.id as string);
      } else {
        // Insert new service
        await supabase.from("services").insert({
          tenant_id: tenantId,
          name: proposed_value.name as string || entity_key,
          description: proposed_value.description as string || null,
          duration_minutes: proposed_value.duration_minutes as number || 60,
          price_cents: proposed_value.price_cents as number || (proposed_value.price as number || 0) * 100,
          is_active: true,
        });
      }
      break;
    }

    case "menu_item": {
      if (existing_value?.id) {
        await supabase
          .from("menu_items")
          .update({
            name: proposed_value.name as string,
            description: proposed_value.description as string || null,
            price_cents: proposed_value.price_cents as number || (proposed_value.price as number || 0) * 100,
            category_id: proposed_value.category_id as string || null,
          })
          .eq("id", existing_value.id as string);
      } else {
        await supabase.from("menu_items").insert({
          tenant_id: tenantId,
          name: proposed_value.name as string || entity_key,
          description: proposed_value.description as string || null,
          price_cents: proposed_value.price_cents as number || (proposed_value.price as number || 0) * 100,
          is_available: true,
        });
      }
      break;
    }

    case "faq": {
      if (existing_value?.id) {
        await supabase
          .from("business_faqs")
          .update({
            question: proposed_value.question as string || entity_key,
            answer: proposed_value.answer as string,
          })
          .eq("id", existing_value.id as string);
      } else {
        await supabase.from("business_faqs").insert({
          tenant_id: tenantId,
          question: proposed_value.question as string || entity_key,
          answer: proposed_value.answer as string || "",
        });
      }
      break;
    }

    case "menu_category": {
      // Menu categories may not exist in all schemas - handle gracefully
      try {
        if (existing_value?.id) {
          const { error } = await supabase
            .from("menu_categories" as any)
            .update({
              name: proposed_value.name as string || entity_key,
              description: proposed_value.description as string || null,
            })
            .eq("id", existing_value.id as string);
          if (error) console.warn("Menu category update error:", error);
        } else {
          const { error } = await supabase
            .from("menu_categories" as any)
            .insert({
              tenant_id: tenantId,
              name: proposed_value.name as string || entity_key,
              description: proposed_value.description as string || null,
              display_order: proposed_value.display_order as number || 0,
            });
          if (error) console.warn("Menu category insert error:", error);
        }
      } catch (e) {
        console.warn("Menu category operation failed:", e);
      }
      break;
    }

    case "policy": {
      // Update the tenant's policies JSON field
      const { data: tenantPolicyData } = await (supabase as any)
        .from("tenants")
        .select("policies")
        .eq("id", tenantId)
        .single();

      const currentPolicies = (tenantPolicyData?.policies as Record<string, unknown>) || {};
      const updatedPolicies = {
        ...currentPolicies,
        [entity_key]: proposed_value,
      };

      const { error: policyError } = await (supabase as any)
        .from("tenants")
        .update({ policies: updatedPolicies })
        .eq("id", tenantId);

      if (policyError) console.warn("Policy update error:", policyError);
      break;
    }

    case "intake_field": {
      // Update the tenant's intake_fields JSON field
      const { data: tenantIntakeData } = await (supabase as any)
        .from("tenants")
        .select("intake_fields")
        .eq("id", tenantId)
        .single();

      const currentFields = Array.isArray(tenantIntakeData?.intake_fields)
        ? (tenantIntakeData.intake_fields as Record<string, unknown>[])
        : [];

      const existingIdx = currentFields.findIndex(
        (f: any) => f.key === entity_key || f.name === entity_key
      );

      let updatedFields: Record<string, unknown>[];
      if (existingIdx >= 0) {
        updatedFields = [...currentFields];
        updatedFields[existingIdx] = { ...updatedFields[existingIdx], ...proposed_value };
      } else {
        updatedFields = [...currentFields, { key: entity_key, ...proposed_value }];
      }

      const { error: intakeError } = await (supabase as any)
        .from("tenants")
        .update({ intake_fields: updatedFields })
        .eq("id", tenantId);

      if (intakeError) console.warn("Intake field update error:", intakeError);
      break;
    }
  }
}
