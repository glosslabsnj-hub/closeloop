import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig, type BusinessMode } from "@/hooks/useTenantConfig";

export interface NotificationEvent {
  eventType: string;
  label: string;
  description: string;
  category: "calls" | "bookings" | "intelligence" | "reports" | "mode_specific";
  requiredModule?: string;
  requiredMode?: BusinessMode[];
}

export const NOTIFICATION_EVENTS: NotificationEvent[] = [
  // Calls & Leads
  { eventType: "missed_call", label: "Missed calls", description: "When an inbound call is missed", category: "calls" },
  { eventType: "new_lead", label: "New leads", description: "When a new lead is captured", category: "calls" },
  { eventType: "ai_escalation", label: "AI escalations", description: "When the AI needs human help", category: "calls" },

  // Bookings
  { eventType: "new_booking", label: "New bookings", description: "When a booking is created", category: "bookings", requiredModule: "booking" },
  { eventType: "booking_cancelled", label: "Cancellations", description: "When a booking is cancelled", category: "bookings", requiredModule: "booking" },

  // Intelligence
  { eventType: "knowledge_gap", label: "Knowledge gaps", description: "When the AI encounters an unanswered question", category: "intelligence" },
  { eventType: "handoff_failure", label: "Handoff failures", description: "When a booking/order handoff fails", category: "intelligence" },

  // Reports
  { eventType: "daily_summary", label: "Daily summary", description: "A daily digest of calls and bookings", category: "reports" },

  // Mode-specific
  { eventType: "dispatch_urgent", label: "Urgent dispatches", description: "When a high-priority job comes in", category: "mode_specific", requiredModule: "dispatch_queue" },
  { eventType: "new_order", label: "New orders", description: "When a food order is placed", category: "mode_specific", requiredModule: "food_orders" },
  { eventType: "new_estimate_request", label: "Estimate requests", description: "When a customer requests an estimate", category: "mode_specific" },
];

interface NotificationPref {
  id: string;
  event_type: string;
  channel_email: boolean;
  channel_sms: boolean;
  channel_push: boolean;
  enabled: boolean;
}

export function useNotificationPreferences() {
  const { user, tenant } = useAuth();
  const { enabledModules, businessMode } = useTenantConfig();
  const queryClient = useQueryClient();
  const tenantId = tenant?.id;
  const userId = user?.id;

  // Filter visible events based on enabled modules and business mode
  const visibleEvents = NOTIFICATION_EVENTS.filter((event) => {
    if (event.requiredModule && !enabledModules.includes(event.requiredModule)) return false;
    if (event.requiredMode && !event.requiredMode.includes(businessMode)) return false;
    return true;
  });

  const prefsQuery = useQuery({
    queryKey: ["notification-preferences", tenantId, userId],
    queryFn: async () => {
      if (!tenantId || !userId) return [];

      const { data, error } = await (supabase as any)
        .from("notification_preferences")
        .select("id, event_type, channel_email, channel_sms, channel_push, enabled")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId);

      if (error) throw error;
      return (data ?? []) as NotificationPref[];
    },
    enabled: !!tenantId && !!userId,
  });

  const togglePreference = useMutation({
    mutationFn: async ({ eventType, enabled }: { eventType: string; enabled: boolean }) => {
      if (!tenantId || !userId) throw new Error("Missing tenant or user");

      const { error } = await (supabase as any)
        .from("notification_preferences")
        .upsert(
          {
            tenant_id: tenantId,
            user_id: userId,
            event_type: eventType,
            enabled,
            channel_email: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id,user_id,event_type" },
        );

      if (error) throw error;
    },
    onMutate: async ({ eventType, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ["notification-preferences", tenantId, userId] });
      const previous = queryClient.getQueryData<NotificationPref[]>(["notification-preferences", tenantId, userId]);

      queryClient.setQueryData<NotificationPref[]>(
        ["notification-preferences", tenantId, userId],
        (old = []) => {
          const exists = old.find((p) => p.event_type === eventType);
          if (exists) {
            return old.map((p) => (p.event_type === eventType ? { ...p, enabled } : p));
          }
          return [...old, { id: "temp", event_type: eventType, channel_email: true, channel_sms: false, channel_push: false, enabled }];
        },
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notification-preferences", tenantId, userId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences", tenantId, userId] });
    },
  });

  // Helper to get the enabled status for an event type
  const getPreference = (eventType: string): boolean => {
    const pref = prefsQuery.data?.find((p) => p.event_type === eventType);
    // Default to enabled if no preference exists
    return pref ? pref.enabled : true;
  };

  return {
    preferences: prefsQuery.data ?? [],
    visibleEvents,
    isLoading: prefsQuery.isLoading,
    getPreference,
    togglePreference,
  };
}
