import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type SuggestionType = "service" | "faq" | "menu_item" | "policy" | "objection";
export type SuggestionStatus = "pending_review" | "approved" | "rejected" | "merged";

export interface ExtractedKnowledgeSuggestion {
  id: string;
  tenant_id: string;
  source_id: string;
  suggestion_type: SuggestionType;
  extracted_data: Record<string, any>;
  status: SuggestionStatus;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export function useKnowledgeSuggestions() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all suggestions (optionally filter by status)
  const { data: suggestions = [], isLoading, error, refetch } = useQuery({
    queryKey: ["knowledge-suggestions", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const { data, error } = await supabase
        .from("extracted_knowledge_suggestions")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ExtractedKnowledgeSuggestion[];
    },
    enabled: !!tenant?.id,
  });

  // Approve a suggestion (creates the actual entity)
  const approveMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      const suggestion = suggestions.find((s) => s.id === suggestionId);
      if (!suggestion) throw new Error("Suggestion not found");

      // Based on suggestion type, create the appropriate entity
      const { suggestion_type, extracted_data } = suggestion;

      switch (suggestion_type) {
        case "service":
          await supabase.from("services").insert({
            tenant_id: tenant?.id,
            name: extracted_data.name,
            description: extracted_data.description,
            duration_minutes: extracted_data.duration_minutes || 60,
            price_type: extracted_data.price_type || "fixed",
            price_amount: extracted_data.price_amount,
            is_active: true,
          });
          break;

        case "faq":
          await supabase.from("business_faqs").insert({
            tenant_id: tenant?.id,
            question: extracted_data.question,
            answer: extracted_data.answer,
          });
          break;

        case "menu_item":
          await supabase.from("menu_items").insert({
            tenant_id: tenant?.id,
            name: extracted_data.name,
            description: extracted_data.description,
            price_cents: extracted_data.price_cents,
            category: extracted_data.category,
            dietary_tags: extracted_data.dietary_tags || [],
            is_available: true,
          });
          break;

        case "objection":
          await supabase.from("objection_responses").insert({
            tenant_id: tenant?.id,
            objection: extracted_data.objection,
            response: extracted_data.response,
          });
          break;

        case "policy":
          await supabase.from("ai_knowledge_base").insert({
            tenant_id: tenant?.id,
            type: "policy",
            title: extracted_data.title,
            content: extracted_data.content,
          });
          break;
      }

      // Mark suggestion as approved
      const { error: updateError } = await supabase
        .from("extracted_knowledge_suggestions")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", suggestionId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-suggestions", tenant?.id] });
      // Also invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-stats"] });
    },
  });

  // Reject a suggestion
  const rejectMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      const { error } = await supabase
        .from("extracted_knowledge_suggestions")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", suggestionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-suggestions", tenant?.id] });
    },
  });

  // Computed values
  const pendingCount = suggestions.filter((s) => s.status === "pending_review").length;
  const approvedCount = suggestions.filter((s) => s.status === "approved").length;
  const rejectedCount = suggestions.filter((s) => s.status === "rejected").length;

  const pendingSuggestions = suggestions.filter((s) => s.status === "pending_review");

  return {
    suggestions,
    pendingSuggestions,
    isLoading,
    error,
    refetch,
    pendingCount,
    approvedCount,
    rejectedCount,
    approve: approveMutation.mutateAsync,
    reject: rejectMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}
