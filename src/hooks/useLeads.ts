import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

export function useLeads() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const leadsQuery = useQuery({
    queryKey: ["leads", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!tenant?.id,
  });

  const createLead = useMutation({
    mutationFn: async (lead: Omit<LeadInsert, "tenant_id">) => {
      if (!tenant?.id) throw new Error("No tenant");
      
      const { data, error } = await supabase
        .from("leads")
        .insert({ ...lead, tenant_id: tenant.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", tenant?.id] });
      toast({ title: "Lead created", description: "New lead added successfully." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: LeadUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("leads")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", tenant?.id] });
      toast({ title: "Lead updated", description: "Changes saved successfully." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", tenant?.id] });
      toast({ title: "Lead deleted", description: "Lead removed successfully." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Computed stats
  const stats = {
    total: leadsQuery.data?.length ?? 0,
    new: leadsQuery.data?.filter((l) => l.status === "new").length ?? 0,
    booked: leadsQuery.data?.filter((l) => l.status === "booked").length ?? 0,
    won: leadsQuery.data?.filter((l) => l.status === "won").length ?? 0,
  };

  return {
    leads: leadsQuery.data ?? [],
    isLoading: leadsQuery.isLoading,
    error: leadsQuery.error,
    stats,
    createLead,
    updateLead,
    deleteLead,
    refetch: leadsQuery.refetch,
  };
}
