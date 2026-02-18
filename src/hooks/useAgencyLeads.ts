import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Search Limit ──

export function useAgencySearchLimit(agencyId: string | undefined) {
  return useQuery({
    queryKey: ["agency-search-limit", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from("agency_lead_searches" as any)
        .select("*", { count: "exact", head: true })
        .eq("agency_id", agencyId!)
        .gte("searched_at", todayStart.toISOString());

      if (error) throw error;
      return { used: count ?? 0, limit: 3, remaining: 3 - (count ?? 0) };
    },
    refetchInterval: 30_000,
  });
}

export function useLogSearch(agencyId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { industry: string; location: string; result_count: number }) => {
      const { error } = await supabase
        .from("agency_lead_searches" as any)
        .insert({ agency_id: agencyId, ...params });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agency-search-limit", agencyId] }),
  });
}

// ── Saved Leads ──

export interface SavedLead {
  id: string;
  agency_id: string;
  name: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  industry: string | null;
  rating: number | null;
  review_count: number | null;
  employee_estimate: string | null;
  hours: string | null;
  reason: string | null;
  friction_signals: string[];
  confidence: string | null;
  score: number | null;
  temperature: string | null;
  score_reasons: string[];
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useSavedLeads(agencyId: string | undefined) {
  return useQuery({
    queryKey: ["agency-saved-leads", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_saved_leads" as any)
        .select("*")
        .eq("agency_id", agencyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SavedLead[];
    },
  });
}

export function useSaveLead(agencyId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: Omit<SavedLead, "id" | "agency_id" | "status" | "notes" | "created_at" | "updated_at">) => {
      const { error } = await supabase
        .from("agency_saved_leads" as any)
        .insert({ agency_id: agencyId, ...lead } as any);
      if (error) {
        if (error.code === "23505") {
          toast.info(`"${lead.name}" is already saved`);
          return;
        }
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agency-saved-leads", agencyId] }),
  });
}

export function useSaveLeadsBatch(agencyId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leads: Omit<SavedLead, "id" | "agency_id" | "status" | "notes" | "created_at" | "updated_at">[]) => {
      const rows = leads.map((l) => ({ agency_id: agencyId, ...l }));
      const { data, error } = await supabase
        .from("agency_saved_leads" as any)
        .upsert(rows as any, { onConflict: "agency_id,name,address", ignoreDuplicates: true })
        .select("id");
      if (error) throw error;
      return (data ?? []).length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["agency-saved-leads", agencyId] });
      if (count != null) toast.success(`${count} lead${count === 1 ? "" : "s"} saved`);
    },
  });
}

export function useUpdateSavedLead(agencyId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; status?: string; notes?: string }) => {
      const { id, ...updates } = params;
      const { error } = await supabase
        .from("agency_saved_leads" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agency-saved-leads", agencyId] }),
  });
}

export function useDeleteSavedLead(agencyId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("agency_saved_leads" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agency-saved-leads", agencyId] });
      toast.success("Lead removed");
    },
  });
}
