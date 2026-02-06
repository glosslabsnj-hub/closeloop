import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type NotificationType = 
  | "upload_processing" 
  | "upload_ready" 
  | "upload_failed" 
  | "suggestions_pending" 
  | "conflicts_detected" 
  | "conflicts_resolved";

export type NotificationSeverity = "info" | "warning" | "critical";

export interface OwnerNotification {
  id: string;
  tenant_id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  is_read: boolean;
  action_path: string | null;
  related_source_id: string | null;
  created_at: string;
}

export function useNotifications() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading, error, refetch } = useQuery({
    queryKey: ["notifications", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const { data, error } = await supabase
        .from("owner_notifications")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as OwnerNotification[];
    },
    enabled: !!tenant?.id,
    staleTime: 30000,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!tenant?.id) return;

    const channel = supabase
      .channel(`notifications-${tenant.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "owner_notifications",
          filter: `tenant_id=eq.${tenant.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", tenant.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, queryClient]);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("owner_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", tenant?.id] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) return;

      const { error } = await supabase
        .from("owner_notifications")
        .update({ is_read: true })
        .eq("tenant_id", tenant.id)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", tenant?.id] });
    },
  });

  // Computed values
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const criticalCount = notifications.filter(
    (n) => !n.is_read && n.severity === "critical"
  ).length;

  return {
    notifications,
    isLoading,
    error,
    refetch,
    unreadCount,
    criticalCount,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingRead: markAsReadMutation.isPending,
    isMarkingAllRead: markAllAsReadMutation.isPending,
  };
}
