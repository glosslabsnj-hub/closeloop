import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo } from "react";

interface SalesLead {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  session_id: string | null;
  lead_number: string | null;
  interest_type: string | null;
  vehicle_interest: string | null;
  budget_range: string | null;
  timeline: string | null;
  financing_preapproved: boolean;
  has_trade_in: boolean;
  trade_in_details: string | null;
  assigned_sales_rep: string | null;
  status: string;
  priority: string;
  follow_up_at: string | null;
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    full_name: string | null;
    phone_e164: string | null;
    email: string | null;
  } | null;
}

type SalesLeadInsert = Omit<SalesLead, "id" | "created_at" | "updated_at" | "customer">;

export function useSalesLeads() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const leadsQuery = useQuery({
    queryKey: ["sales-leads", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const { data, error } = await supabase
        .from("sales_leads")
        .select("*, customer:customers(full_name, phone_e164, email)")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SalesLead[];
    },
    enabled: !!tenant?.id,
  });

  // Realtime subscription
  useEffect(() => {
    if (!tenant?.id) return;

    const channel = supabase
      .channel(`sales-leads-realtime-${tenant.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales_leads",
          filter: `tenant_id=eq.${tenant.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["sales-leads", tenant.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, queryClient]);

  const createLead = useMutation({
    mutationFn: async (lead: Omit<SalesLeadInsert, "tenant_id">) => {
      if (!tenant?.id) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("sales_leads")
        .insert({ ...lead, tenant_id: tenant.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-leads", tenant?.id] });
      toast({ title: "Lead created", description: "New sales lead added." });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Try again?", variant: "destructive" });
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SalesLead> & { id: string }) => {
      const { data, error } = await supabase
        .from("sales_leads")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-leads", tenant?.id] });
      toast({ title: "Lead updated", description: "Changes saved." });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Try again?", variant: "destructive" });
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales_leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-leads", tenant?.id] });
      toast({ title: "Lead removed", description: "Sales lead deleted." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const stats = useMemo(() => {
    const leads = leadsQuery.data ?? [];
    return {
      total: leads.length,
      new: leads.filter((l) => l.status === "new").length,
      qualified: leads.filter((l) => l.status === "qualified").length,
      hot: leads.filter((l) => l.priority === "hot").length,
      sold: leads.filter((l) => l.status === "sold").length,
    };
  }, [leadsQuery.data]);

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
