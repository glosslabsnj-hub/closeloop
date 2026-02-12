import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo } from "react";
import type { JobServiceItem } from "./useActiveJobs";

export function useJobServiceItems(jobId: string | null) {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const itemsQuery = useQuery({
    queryKey: ["job-service-items", jobId],
    queryFn: async () => {
      if (!jobId) return [];

      const { data, error } = await supabase
        .from("job_service_items")
        .select("*")
        .eq("job_id", jobId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data ?? []) as JobServiceItem[];
    },
    enabled: !!jobId,
  });

  // Realtime subscription for this job's items
  useEffect(() => {
    if (!jobId || !tenant?.id) return;

    const channel = supabase
      .channel(`job-items-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_service_items",
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["job-service-items", jobId] });
          queryClient.invalidateQueries({ queryKey: ["active-jobs", tenant.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, tenant?.id, queryClient]);

  const toggleItemStatus = useMutation({
    mutationFn: async ({ itemId, currentStatus }: { itemId: string; currentStatus: string }) => {
      const newStatus = currentStatus === "completed" ? "pending" : "completed";
      const updates: Record<string, unknown> = { status: newStatus };

      if (newStatus === "completed") {
        updates.completed_at = new Date().toISOString();
      } else {
        updates.completed_at = null;
      }

      const { data, error } = await supabase
        .from("job_service_items")
        .update(updates)
        .eq("id", itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-service-items", jobId] });
      queryClient.invalidateQueries({ queryKey: ["active-jobs", tenant?.id] });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Try again?", variant: "destructive" });
    },
  });

  const addItem = useMutation({
    mutationFn: async (input: { title: string; service_id?: string }) => {
      if (!jobId || !tenant?.id) throw new Error("Missing job or tenant");

      const maxSort = (itemsQuery.data ?? []).reduce(
        (max, item) => Math.max(max, item.sort_order),
        -1
      );

      const { data, error } = await supabase
        .from("job_service_items")
        .insert({
          job_id: jobId,
          tenant_id: tenant.id,
          title: input.title,
          service_id: input.service_id || null,
          sort_order: maxSort + 1,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-service-items", jobId] });
      queryClient.invalidateQueries({ queryKey: ["active-jobs", tenant?.id] });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Try again?", variant: "destructive" });
    },
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("job_service_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-service-items", jobId] });
      queryClient.invalidateQueries({ queryKey: ["active-jobs", tenant?.id] });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Try again?", variant: "destructive" });
    },
  });

  const reorderItems = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase
          .from("job_service_items")
          .update({ sort_order: index })
          .eq("id", id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-service-items", jobId] });
    },
  });

  const computed = useMemo(() => {
    const items = itemsQuery.data ?? [];
    const completedCount = items.filter((i) => i.status === "completed").length;
    const totalCount = items.length;
    return {
      completedCount,
      totalCount,
      progressPercent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    };
  }, [itemsQuery.data]);

  return {
    items: itemsQuery.data ?? [],
    isLoading: itemsQuery.isLoading,
    ...computed,
    toggleItemStatus,
    addItem,
    removeItem,
    reorderItems,
  };
}
