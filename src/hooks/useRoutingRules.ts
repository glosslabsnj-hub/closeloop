import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface RoutingRule {
  id: string;
  tenant_id: string;
  trigger_event: string;
  destination: string;
  label: string;
  enabled: boolean;
  integration_id: string | null;
  config_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RoutingRuleTemplate {
  trigger_event: string;
  destination: string;
  label: string;
  icon: string;
  requiresIntegration: boolean;
  integrationProvider?: string;
  modes: string[]; // Which business modes this applies to
}

// Sentence-based routing templates
export const ROUTING_TEMPLATES: RoutingRuleTemplate[] = [
  // Booking routing
  {
    trigger_event: "booking.created",
    destination: "google_calendar",
    label: "When AI books an appointment → Add to Google Calendar",
    icon: "calendar",
    requiresIntegration: true,
    integrationProvider: "google_calendar",
    modes: ["service", "medical", "general"],
  },
  {
    trigger_event: "booking.created",
    destination: "google_sheets",
    label: "When AI books an appointment → Add row to Google Sheet",
    icon: "table",
    requiresIntegration: true,
    integrationProvider: "google_sheets",
    modes: ["service", "medical", "general"],
  },
  {
    trigger_event: "booking.created",
    destination: "sms",
    label: "When AI books an appointment → Send confirmation SMS",
    icon: "message-square",
    requiresIntegration: false,
    modes: ["service", "medical", "food", "general"],
  },

  // Order routing
  {
    trigger_event: "order.created",
    destination: "printnode",
    label: "When AI takes an order → Print receipt automatically",
    icon: "printer",
    requiresIntegration: true,
    integrationProvider: "printnode",
    modes: ["food"],
  },
  {
    trigger_event: "order.created",
    destination: "print_view",
    label: "When AI takes an order → Show printable receipt",
    icon: "file-text",
    requiresIntegration: false,
    modes: ["food"],
  },
  {
    trigger_event: "order.created",
    destination: "sms",
    label: "When AI takes an order → Send confirmation SMS",
    icon: "message-square",
    requiresIntegration: false,
    modes: ["food"],
  },
  {
    trigger_event: "order.created",
    destination: "google_sheets",
    label: "When AI takes an order → Add row to Google Sheet",
    icon: "table",
    requiresIntegration: true,
    integrationProvider: "google_sheets",
    modes: ["food"],
  },

  // Dispatch routing
  {
    trigger_event: "dispatch.created",
    destination: "sms",
    label: "When AI creates dispatch job → Notify driver via SMS",
    icon: "message-square",
    requiresIntegration: false,
    modes: ["dispatch"],
  },
  {
    trigger_event: "dispatch.created",
    destination: "google_sheets",
    label: "When AI creates dispatch job → Add row to Google Sheet",
    icon: "table",
    requiresIntegration: true,
    integrationProvider: "google_sheets",
    modes: ["dispatch"],
  },

  // Lead routing
  {
    trigger_event: "lead.captured",
    destination: "google_sheets",
    label: "When AI captures a lead → Add to Google Sheet",
    icon: "table",
    requiresIntegration: true,
    integrationProvider: "google_sheets",
    modes: ["service", "dispatch", "food", "medical", "general"],
  },
  {
    trigger_event: "lead.captured",
    destination: "email",
    label: "When AI captures a lead → Send email notification",
    icon: "mail",
    requiresIntegration: false,
    modes: ["service", "dispatch", "food", "medical", "general"],
  },

  // Missed call routing
  {
    trigger_event: "call.missed",
    destination: "sms",
    label: "When call is missed → Auto-text the caller",
    icon: "message-square",
    requiresIntegration: false,
    modes: ["service", "dispatch", "food", "medical", "general"],
  },
];

export function useRoutingRules() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const rulesQuery = useQuery({
    queryKey: ["routing_rules", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const { data, error } = await supabase
        .from("routing_rules")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as RoutingRule[];
    },
    enabled: !!tenant?.id,
  });

  const toggleRule = useMutation({
    mutationFn: async ({
      trigger_event,
      destination,
      enabled,
      label,
    }: {
      trigger_event: string;
      destination: string;
      enabled: boolean;
      label: string;
    }) => {
      if (!tenant?.id) throw new Error("No tenant");

      // Check if rule exists
      const { data: existing } = await supabase
        .from("routing_rules")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("trigger_event", trigger_event)
        .eq("destination", destination)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("routing_rules")
          .update({ enabled })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase.from("routing_rules").insert({
          tenant_id: tenant.id,
          trigger_event,
          destination,
          label,
          enabled,
          config_json: {},
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing_rules", tenant?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getTemplatesForMode = (mode: string): RoutingRuleTemplate[] => {
    return ROUTING_TEMPLATES.filter((t) => t.modes.includes(mode));
  };

  const isRuleEnabled = (trigger_event: string, destination: string): boolean => {
    const rule = rulesQuery.data?.find(
      (r) => r.trigger_event === trigger_event && r.destination === destination
    );
    return rule?.enabled ?? false;
  };

  return {
    rules: rulesQuery.data ?? [],
    isLoading: rulesQuery.isLoading,
    error: rulesQuery.error,
    toggleRule,
    getTemplatesForMode,
    isRuleEnabled,
    refetch: rulesQuery.refetch,
  };
}
