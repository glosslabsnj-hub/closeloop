import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AdminSocialPost {
  id: string;
  platform: string;
  content: string;
  hashtags: string[];
  media_url: string | null;
  scheduled_for: string;
  status: string;
  external_post_id: string | null;
  notes: string | null;
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  clicks: number;
  created_at: string;
  updated_at: string;
}

export interface GrowthActivityLog {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

// ---- Social Posts ----

export function useAdminSocialPosts(status?: string) {
  return useQuery({
    queryKey: ["admin-social-posts", status],
    queryFn: async () => {
      let query = supabase
        .from("admin_social_posts" as any)
        .select("*")
        .order("scheduled_for", { ascending: true });
      if (status) {
        query = query.eq("status", status);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as AdminSocialPost[];
    },
  });
}

export function useCreateSocialPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (post: Omit<AdminSocialPost, "id" | "created_at" | "updated_at">) => {
      const { error } = await supabase
        .from("admin_social_posts" as any)
        .insert(post as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-social-posts"] });
      toast.success("Post created");
    },
  });
}

export function useUpdateSocialPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<AdminSocialPost>) => {
      const { error } = await supabase
        .from("admin_social_posts" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-social-posts"] });
    },
  });
}

export function useDeleteSocialPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("admin_social_posts" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-social-posts"] });
      toast.success("Post deleted");
    },
  });
}

export function useGenerateSocialBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { platforms?: string[]; posts_per_week?: number; tone?: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-generate-social-batch", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-social-posts"] });
      toast.success(`${data?.count ?? 0} post(s) generated`);
    },
    onError: () => toast.error("Failed to generate social posts"),
  });
}

// ---- Activity Log ----

export function useGrowthActivityLog(limit = 50) {
  return useQuery({
    queryKey: ["admin-growth-activity-log", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_growth_activity_log" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as GrowthActivityLog[];
    },
    refetchInterval: 30_000,
  });
}
