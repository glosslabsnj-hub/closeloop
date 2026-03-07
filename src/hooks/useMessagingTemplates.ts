import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type MessagingTemplate = Database["public"]["Tables"]["messaging_templates"]["Row"];
type MessagingTemplateInsert = Database["public"]["Tables"]["messaging_templates"]["Insert"];

export function useMessagingTemplates() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ["messaging-templates", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("messaging_templates")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("category", { ascending: true });
      if (error) throw error;
      return data as MessagingTemplate[];
    },
    enabled: !!tenant?.id,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Omit<MessagingTemplateInsert, "tenant_id">) => {
      if (!tenant?.id) throw new Error("No tenant");
      const { data, error } = await supabase
        .from("messaging_templates")
        .insert({ ...template, tenant_id: tenant.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messaging-templates", tenant?.id] });
      toast({ title: "Template created" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MessagingTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("messaging_templates")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messaging-templates", tenant?.id] });
      toast({ title: "Template updated" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("messaging_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messaging-templates", tenant?.id] });
      toast({ title: "Template deleted" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    templates: templatesQuery.data ?? [],
    isLoading: templatesQuery.isLoading,
    error: templatesQuery.error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refetch: templatesQuery.refetch,
  };
}
