import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type ConflictType = "price_mismatch" | "description_mismatch" | "name_mismatch" | "duration_mismatch" | "field_mismatch" | "other";
export type ConflictStatus = "unresolved" | "keep_existing" | "accept_upload" | "custom_merged";

export const conflictTypeLabels: Record<ConflictType | string, string> = {
  price_mismatch: "Price Difference",
  description_mismatch: "Description Difference",
  name_mismatch: "Name Difference",
  duration_mismatch: "Duration Difference",
  field_mismatch: "Field Difference",
  other: "Other Difference",
};

export const entityTypeLabels: Record<string, string> = {
  service: "Service",
  menu_item: "Menu Item",
  faq: "FAQ",
  policy: "Policy",
  hours: "Hours",
};

export interface KnowledgeConflict {
  id: string;
  tenant_id: string;
  source_id: string;
  conflict_type: ConflictType;
  entity_type: string;
  existing_entity_id: string | null;
  existing_data: Record<string, any>;
  proposed_data: Record<string, any>;
  differing_fields: string[];
  status: ConflictStatus;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export function useKnowledgeConflicts() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all conflicts
  const { data: conflicts = [], isLoading, error, refetch } = useQuery({
    queryKey: ["knowledge-conflicts", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const { data, error } = await supabase
        .from("knowledge_conflicts")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      // Fail silently — this runs on every page via AppLayout.
      // Missing table or RLS error should not pollute console.
      if (error) return [] as KnowledgeConflict[];
      return data as KnowledgeConflict[];
    },
    enabled: !!tenant?.id,
    retry: false,
    staleTime: 60_000, // Realtime subscription handles updates; no need to re-query on every page nav
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!tenant?.id) return;

    const channel = supabase
      .channel(`knowledge-conflicts-${tenant.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "knowledge_conflicts",
          filter: `tenant_id=eq.${tenant.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["knowledge-conflicts", tenant.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, queryClient]);

  // Keep existing (dismiss the conflict, keep current data)
  const keepExistingMutation = useMutation({
    mutationFn: async (conflictId: string) => {
      const { error } = await supabase
        .from("knowledge_conflicts")
        .update({
          status: "keep_existing",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", conflictId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-conflicts", tenant?.id] });
    },
  });

  // Accept upload (update existing entity with proposed data)
  const acceptUploadMutation = useMutation({
    mutationFn: async (conflictId: string) => {
      const conflict = conflicts.find((c) => c.id === conflictId);
      if (!conflict) throw new Error("Conflict not found");

      const { entity_type, existing_entity_id, proposed_data } = conflict;

      if (existing_entity_id) {
        // Update the existing entity based on type
        switch (entity_type) {
          case "service":
            await supabase
              .from("services")
              .update({
                name: proposed_data.name,
                description: proposed_data.description,
                price_amount: proposed_data.price_amount,
                duration_minutes: proposed_data.duration_minutes,
              })
              .eq("id", existing_entity_id);
            break;

          case "menu_item":
            await supabase
              .from("menu_items")
              .update({
                name: proposed_data.name,
                description: proposed_data.description,
                price_cents: proposed_data.price_cents,
                category: proposed_data.category,
              })
              .eq("id", existing_entity_id);
            break;

          case "faq":
            await supabase
              .from("business_faqs")
              .update({
                question: proposed_data.question,
                answer: proposed_data.answer,
              })
              .eq("id", existing_entity_id);
            break;

          case "hours":
            await supabase
              .from("availability_slots")
              .update({
                start_time: proposed_data.start_time,
                end_time: proposed_data.end_time,
                is_available: proposed_data.is_available,
              })
              .eq("id", existing_entity_id);
            break;
        }
      }

      // Mark conflict as resolved
      const { error: updateError } = await supabase
        .from("knowledge_conflicts")
        .update({
          status: "accept_upload",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", conflictId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-conflicts", tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-stats"] });
    },
  });

  // Custom merge (apply custom data to existing entity)
  const customMergeMutation = useMutation({
    mutationFn: async (params: { conflictId: string; mergedData: Record<string, any> }) => {
      const conflict = conflicts.find((c) => c.id === params.conflictId);
      if (!conflict) throw new Error("Conflict not found");

      const { entity_type, existing_entity_id } = conflict;

      if (existing_entity_id) {
        switch (entity_type) {
          case "service":
            await supabase
              .from("services")
              .update(params.mergedData)
              .eq("id", existing_entity_id);
            break;

          case "menu_item":
            await supabase
              .from("menu_items")
              .update(params.mergedData)
              .eq("id", existing_entity_id);
            break;

          case "faq":
            await supabase
              .from("business_faqs")
              .update(params.mergedData)
              .eq("id", existing_entity_id);
            break;

          case "hours":
            await supabase
              .from("availability_slots")
              .update(params.mergedData)
              .eq("id", existing_entity_id);
            break;
        }
      }

      const { error: updateError } = await supabase
        .from("knowledge_conflicts")
        .update({
          status: "custom_merged",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", params.conflictId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-conflicts", tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    },
  });

  // Batch: Keep all existing
  const keepAllExistingMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("knowledge_conflicts")
        .update({
          status: "keep_existing",
          resolved_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenant?.id)
        .eq("status", "unresolved");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-conflicts", tenant?.id] });
    },
  });

  // Batch: Accept all uploads
  const acceptAllUploadsMutation = useMutation({
    mutationFn: async () => {
      const unresolved = conflicts.filter((c) => c.status === "unresolved");
      
      for (const conflict of unresolved) {
        const { entity_type, existing_entity_id, proposed_data } = conflict;

        if (existing_entity_id) {
          switch (entity_type) {
            case "service":
              await supabase
                .from("services")
                .update({
                  name: proposed_data.name,
                  description: proposed_data.description,
                  price_amount: proposed_data.price_amount,
                  duration_minutes: proposed_data.duration_minutes,
                })
                .eq("id", existing_entity_id);
              break;

            case "menu_item":
              await supabase
                .from("menu_items")
                .update({
                  name: proposed_data.name,
                  description: proposed_data.description,
                  price_cents: proposed_data.price_cents,
                  category: proposed_data.category,
                })
                .eq("id", existing_entity_id);
              break;

            case "faq":
              await supabase
                .from("business_faqs")
                .update({
                  question: proposed_data.question,
                  answer: proposed_data.answer,
                })
                .eq("id", existing_entity_id);
              break;

            case "hours":
              await supabase
                .from("availability_slots")
                .update({
                  start_time: proposed_data.start_time,
                  end_time: proposed_data.end_time,
                  is_available: proposed_data.is_available,
                })
                .eq("id", existing_entity_id);
              break;
          }
        }
      }

      // Mark all as resolved
      const { error } = await supabase
        .from("knowledge_conflicts")
        .update({
          status: "accept_upload",
          resolved_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenant?.id)
        .eq("status", "unresolved");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-conflicts", tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-stats"] });
    },
  });

  // Computed values
  const unresolvedCount = conflicts.filter((c) => c.status === "unresolved").length;
  const resolvedCount = conflicts.filter((c) => c.status !== "unresolved").length;
  const unresolvedConflicts = conflicts.filter((c) => c.status === "unresolved");

  return {
    conflicts,
    unresolvedConflicts,
    isLoading,
    error,
    refetch,
    unresolvedCount,
    resolvedCount,
    keepExisting: keepExistingMutation.mutateAsync,
    acceptUpload: acceptUploadMutation.mutateAsync,
    customMerge: customMergeMutation.mutateAsync,
    keepAllExisting: keepAllExistingMutation.mutateAsync,
    acceptAllUploads: acceptAllUploadsMutation.mutateAsync,
    isResolving:
      keepExistingMutation.isPending ||
      acceptUploadMutation.isPending ||
      customMergeMutation.isPending ||
      keepAllExistingMutation.isPending ||
      acceptAllUploadsMutation.isPending,
  };
}
