import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AdminAdCampaign {
  id: string;
  name: string;
  platform: string;
  industry: string | null;
  location: string | null;
  objective: string | null;
  status: string;
  headlines: string[];
  descriptions: string[];
  keywords: string[];
  targeting: Record<string, any>;
  cta: string | null;
  performance_metrics: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useAdminAdCampaigns() {
  return useQuery({
    queryKey: ["admin-ad-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_ad_campaigns" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AdminAdCampaign[];
    },
  });
}

export function useCreateAdCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaign: Omit<AdminAdCampaign, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("admin_ad_campaigns" as any)
        .insert(campaign as any)
        .select("id")
        .single();
      if (error) throw error;
      return data as unknown as { id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ad-campaigns"] });
      toast.success("Ad campaign saved");
    },
  });
}

export function useUpdateAdCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<AdminAdCampaign>) => {
      const { error } = await supabase
        .from("admin_ad_campaigns" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ad-campaigns"] });
    },
  });
}

export function useDeleteAdCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("admin_ad_campaigns" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ad-campaigns"] });
      toast.success("Ad campaign deleted");
    },
  });
}

export function useGenerateAdCopy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { platform: string; industry: string; location: string; objective: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-generate-ad-copy", { body });
      if (error) throw error;
      return data as AdminAdCampaign;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ad-campaigns"] });
      toast.success("Ad copy generated and saved");
    },
    onError: () => toast.error("Failed to generate ad copy"),
  });
}
