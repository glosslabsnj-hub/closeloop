import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AdminGrowthSettings {
  id: string;
  auto_discovery_enabled: boolean;
  discovery_industries: string[];
  discovery_locations: string[];
  discovery_frequency_hours: number;
  discovery_max_per_run: number;
  auto_outreach_enabled: boolean;
  outreach_from_email: string;
  outreach_from_name: string;
  outreach_daily_email_limit: number;
  outreach_daily_sms_limit: number;
  outreach_quiet_hours_start: string;
  outreach_quiet_hours_end: string;
  outreach_quiet_days: string[];
  auto_social_enabled: boolean;
  social_platforms: string[];
  social_posts_per_week: number;
  social_tone: string;
  social_auto_post: boolean;
  auto_ads_enabled: boolean;
  ads_platforms: string[];
  ads_weekly_budget_hint: number | null;
  notification_email: string | null;
  notify_on_response: boolean;
  notify_on_conversion: boolean;
  demo_link: string;
  trial_link: string;
  discovery_stats: Record<string, any>;
  best_industries: string[];
  best_locations: string[];
  created_at: string;
  updated_at: string;
}

const SETTINGS_ID = "c0000000-0000-0000-0000-000000000001";

export function useAdminGrowthSettings() {
  return useQuery({
    queryKey: ["admin-growth-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_growth_settings" as any)
        .select("*")
        .eq("id", SETTINGS_ID)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as AdminGrowthSettings | null;
    },
    staleTime: 30_000,
  });
}

export function useUpdateAdminGrowthSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<Omit<AdminGrowthSettings, "id" | "created_at" | "updated_at">>) => {
      const { error } = await supabase
        .from("admin_growth_settings" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", SETTINGS_ID);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-growth-settings"] });
      toast.success("Settings saved");
    },
    onError: () => toast.error("Failed to save settings"),
  });
}
