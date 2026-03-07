import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type MessagingCampaign = Database["public"]["Tables"]["messaging_campaigns"]["Row"];
type MessagingCampaignInsert = Database["public"]["Tables"]["messaging_campaigns"]["Insert"];
type CampaignRecipient = Database["public"]["Tables"]["messaging_campaign_recipients"]["Row"];

export function useMessagingCampaigns() {
  const { tenant, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const campaignsQuery = useQuery({
    queryKey: ["messaging-campaigns", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("messaging_campaigns")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MessagingCampaign[];
    },
    enabled: !!tenant?.id,
  });

  const createCampaign = useMutation({
    mutationFn: async (campaign: Omit<MessagingCampaignInsert, "tenant_id" | "created_by">) => {
      if (!tenant?.id) throw new Error("No tenant");
      const { data, error } = await supabase
        .from("messaging_campaigns")
        .insert({ ...campaign, tenant_id: tenant.id, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messaging-campaigns", tenant?.id] });
      toast({ title: "Campaign created" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MessagingCampaign> & { id: string }) => {
      const { data, error } = await supabase
        .from("messaging_campaigns")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messaging-campaigns", tenant?.id] });
      toast({ title: "Campaign updated" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("messaging_campaigns")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messaging-campaigns", tenant?.id] });
      toast({ title: "Campaign deleted" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    campaigns: campaignsQuery.data ?? [],
    isLoading: campaignsQuery.isLoading,
    error: campaignsQuery.error,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    refetch: campaignsQuery.refetch,
  };
}

export function useCampaignRecipients(campaignId: string | null) {
  const recipientsQuery = useQuery({
    queryKey: ["campaign-recipients", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("messaging_campaign_recipients")
        .select("*, customer:customers(full_name, phone_e164)")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });

  return {
    recipients: recipientsQuery.data ?? [],
    isLoading: recipientsQuery.isLoading,
    error: recipientsQuery.error,
    refetch: recipientsQuery.refetch,
  };
}
