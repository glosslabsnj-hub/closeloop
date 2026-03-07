import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type MessagingAutomation = Database["public"]["Tables"]["messaging_automations"]["Row"];

export const AUTOMATION_LABELS: Record<string, { label: string; description: string }> = {
  booking_confirmed: {
    label: "Booking Confirmation",
    description: "Send a confirmation message when a new booking is created",
  },
  appointment_reminder: {
    label: "Appointment Reminder",
    description: "Send a reminder before an upcoming appointment",
  },
  service_completed: {
    label: "Post-Service Follow-Up",
    description: "Send a follow-up message after service is completed",
  },
  review_request: {
    label: "Review Request",
    description: "Ask for a review after a successful service",
  },
  re_engagement: {
    label: "Re-Engagement",
    description: "Reach out to customers who haven't visited recently",
  },
};

export function useMessagingAutomations() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const automationsQuery = useQuery({
    queryKey: ["messaging-automations", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("messaging_automations")
        .select("*, template:messaging_templates(*)")
        .eq("tenant_id", tenant.id)
        .order("trigger_type", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id,
  });

  const toggleAutomation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { data, error } = await supabase
        .from("messaging_automations")
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["messaging-automations", tenant?.id] });
      const label = AUTOMATION_LABELS[data.trigger_type]?.label || data.trigger_type;
      toast({ title: data.enabled ? `${label} enabled` : `${label} disabled` });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateAutomation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MessagingAutomation> & { id: string }) => {
      const { data, error } = await supabase
        .from("messaging_automations")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messaging-automations", tenant?.id] });
      toast({ title: "Automation updated" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    automations: automationsQuery.data ?? [],
    isLoading: automationsQuery.isLoading,
    error: automationsQuery.error,
    toggleAutomation,
    updateAutomation,
    refetch: automationsQuery.refetch,
  };
}
