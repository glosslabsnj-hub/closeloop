import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AdminSavedLead {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
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

export function useAdminSavedLeads(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-saved-leads", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_saved_leads" as any)
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AdminSavedLead[];
    },
  });
}

export function useAdminSaveLead(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: Omit<AdminSavedLead, "id" | "user_id" | "status" | "notes" | "created_at" | "updated_at">) => {
      const { error } = await supabase
        .from("admin_saved_leads" as any)
        .insert({ user_id: userId, ...lead } as any);
      if (error) {
        if (error.code === "23505") {
          toast.info(`"${lead.name}" is already saved`);
          return;
        }
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-saved-leads", userId] }),
  });
}

export function useAdminSaveLeadsBatch(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leads: Omit<AdminSavedLead, "id" | "user_id" | "status" | "notes" | "created_at" | "updated_at">[]) => {
      const rows = leads.map((l) => ({ user_id: userId, ...l }));
      const { data, error } = await supabase
        .from("admin_saved_leads" as any)
        .upsert(rows as any, { onConflict: "user_id,name,address", ignoreDuplicates: true })
        .select("id");
      if (error) throw error;
      return (data ?? []).length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["admin-saved-leads", userId] });
      if (count != null) toast.success(`${count} lead${count === 1 ? "" : "s"} saved`);
    },
  });
}

export function useAdminUpdateSavedLead(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; status?: string; notes?: string }) => {
      const { id, ...updates } = params;
      const { error } = await supabase
        .from("admin_saved_leads" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-saved-leads", userId] }),
  });
}

export function useAdminDeleteSavedLead(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("admin_saved_leads" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-saved-leads", userId] });
      toast.success("Lead removed");
    },
  });
}
