import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type KnowledgeSourceType = "menu_pdf" | "pricing" | "services_doc" | "faq_doc" | "general";
export type KnowledgeSourceStatus = "uploading" | "processing" | "ready" | "failed";

export interface KnowledgeSource {
  id: string;
  tenant_id: string;
  file_name: string;
  file_url: string | null;
  source_type: KnowledgeSourceType;
  status: KnowledgeSourceStatus;
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export function useKnowledgeUploads() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all knowledge sources
  const { data: uploads = [], isLoading, error, refetch } = useQuery({
    queryKey: ["knowledge-uploads", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const { data, error } = await supabase
        .from("knowledge_sources")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as KnowledgeSource[];
    },
    enabled: !!tenant?.id,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!tenant?.id) return;

    const channel = supabase
      .channel(`knowledge-sources-${tenant.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "knowledge_sources",
          filter: `tenant_id=eq.${tenant.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["knowledge-uploads", tenant.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, queryClient]);

  // Create a new knowledge source record
  const createUploadMutation = useMutation({
    mutationFn: async (params: { fileName: string; fileUrl?: string; sourceType: KnowledgeSourceType }) => {
      if (!tenant?.id) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("knowledge_sources")
        .insert({
          tenant_id: tenant.id,
          file_name: params.fileName,
          file_url: params.fileUrl || null,
          source_type: params.sourceType,
          status: "uploading",
        })
        .select()
        .single();

      if (error) throw error;
      return data as KnowledgeSource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-uploads", tenant?.id] });
    },
  });

  // Update status (e.g., to trigger processing)
  const updateStatusMutation = useMutation({
    mutationFn: async (params: { id: string; status: KnowledgeSourceStatus; errorMessage?: string }) => {
      const { error } = await supabase
        .from("knowledge_sources")
        .update({
          status: params.status,
          error_message: params.errorMessage || null,
          processed_at: params.status === "ready" ? new Date().toISOString() : null,
        })
        .eq("id", params.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-uploads", tenant?.id] });
    },
  });

  // Delete a knowledge source
  const deleteUploadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("knowledge_sources")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-uploads", tenant?.id] });
    },
  });

  // Computed values
  const processingCount = uploads.filter((u) => u.status === "processing" || u.status === "uploading").length;
  const readyCount = uploads.filter((u) => u.status === "ready").length;
  const failedCount = uploads.filter((u) => u.status === "failed").length;

  return {
    uploads,
    isLoading,
    error,
    refetch,
    processingCount,
    readyCount,
    failedCount,
    createUpload: createUploadMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutate,
    deleteUpload: deleteUploadMutation.mutate,
    isCreating: createUploadMutation.isPending,
  };
}
