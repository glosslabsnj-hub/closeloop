import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface IndustryDemo {
  id: string;
  industry_key: string;
  title: string;
  audio_url: string | null;
  caption_bullets: string[];
  transcript_excerpt: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useIndustryDemos(activeOnly = true) {
  const [demos, setDemos] = useState<IndustryDemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDemos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("industry_demos")
        .select("*")
        .order("created_at", { ascending: true });

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Parse caption_bullets from JSONB
      const parsed = (data || []).map((d: any) => ({
        ...d,
        caption_bullets: Array.isArray(d.caption_bullets) 
          ? d.caption_bullets 
          : JSON.parse(d.caption_bullets || "[]"),
      }));

      setDemos(parsed);
    } catch (err: any) {
      console.error("Error fetching demos:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => {
    fetchDemos();
  }, [fetchDemos]);

  return { demos, loading, error, refetch: fetchDemos };
}

export function useIndustryDemoAdmin() {
  const { demos, loading, error, refetch } = useIndustryDemos(false);

  const updateDemo = async (id: string, updates: Partial<IndustryDemo>) => {
    const { error } = await supabase
      .from("industry_demos")
      .update({
        ...updates,
        caption_bullets: updates.caption_bullets 
          ? JSON.stringify(updates.caption_bullets) 
          : undefined,
      } as any)
      .eq("id", id);

    if (error) throw error;
    await refetch();
  };

  const uploadAudio = async (industryKey: string, file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${industryKey}-demo.${ext}`;

    // Delete existing file if any
    await supabase.storage.from("demo-audio").remove([path]);

    // Upload new file
    const { error: uploadError } = await supabase.storage
      .from("demo-audio")
      .upload(path, file, { upsert: true });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data } = supabase.storage.from("demo-audio").getPublicUrl(path);
    return data.publicUrl;
  };

  const deleteAudio = async (industryKey: string) => {
    const { data: files } = await supabase.storage
      .from("demo-audio")
      .list("", { search: industryKey });

    if (files && files.length > 0) {
      await supabase.storage
        .from("demo-audio")
        .remove(files.map((f) => f.name));
    }
  };

  return { demos, loading, error, refetch, updateDemo, uploadAudio, deleteAudio };
}
