import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RecoverySettings {
  tenant_id: string;
  recovery_enabled: boolean;
  auto_start_recovery: boolean;
  require_phone_number: boolean;
  respect_business_hours: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_days: string[];
  max_attempts_per_lead: number;
  max_campaigns_per_day: number;
  cooldown_days: number;
  ai_calls_enabled: boolean;
  ai_call_hours_start: string | null;
  ai_call_hours_end: string | null;
  default_offer_code: string | null;
  default_offer_description: string | null;
  notify_on_response: boolean;
  notify_on_conversion: boolean;
  notification_email: string | null;
  notification_sms: string | null;
}

export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  action_type: string;
  delay_minutes: number;
  message_template: string | null;
  ai_call_script_hints: string | null;
  skip_if_responded: boolean;
  skip_if_booked: boolean;
}

export interface RecoverySequence {
  id: string;
  tenant_id: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
  steps: SequenceStep[];
}

const DEFAULT_SETTINGS: Partial<RecoverySettings> = {
  recovery_enabled: false,
  auto_start_recovery: true,
  require_phone_number: true,
  respect_business_hours: true,
  quiet_hours_start: "21:00",
  quiet_hours_end: "08:00",
  quiet_days: ["sunday"],
  max_attempts_per_lead: 10,
  max_campaigns_per_day: 50,
  cooldown_days: 30,
  ai_calls_enabled: false,
  ai_call_hours_start: "09:00",
  ai_call_hours_end: "18:00",
  notify_on_response: true,
  notify_on_conversion: true,
};

export function useRecoverySettings(tenantId: string | undefined) {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["recovery-settings", tenantId],
    queryFn: async (): Promise<RecoverySettings | null> => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from("lead_recovery_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching recovery settings:", error);
        return null;
      }

      // Return defaults if no settings exist
      if (!data) {
        return {
          tenant_id: tenantId,
          ...DEFAULT_SETTINGS,
        } as RecoverySettings;
      }

      return data as RecoverySettings;
    },
    enabled: !!tenantId,
  });

  const sequenceQuery = useQuery({
    queryKey: ["recovery-sequence", tenantId],
    queryFn: async (): Promise<RecoverySequence | null> => {
      if (!tenantId) return null;

      // First try to get default sequence
      const { data: sequence, error } = await supabase
        .from("lead_recovery_sequences")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_default", true)
        .maybeSingle();

      if (error) {
        console.error("Error fetching recovery sequence:", error);
        return null;
      }

      if (!sequence) return null;

      // Get steps for this sequence
      const { data: steps } = await supabase
        .from("lead_recovery_sequence_steps")
        .select("*")
        .eq("sequence_id", sequence.id)
        .order("step_order", { ascending: true });

      return {
        ...sequence,
        steps: (steps || []) as SequenceStep[],
      };
    },
    enabled: !!tenantId,
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<RecoverySettings>) => {
      if (!tenantId) throw new Error("No tenant ID");

      const { error } = await supabase
        .from("lead_recovery_settings")
        .upsert({
          tenant_id: tenantId,
          ...updates,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recovery-settings", tenantId] });
      toast.success("Settings saved");
    },
    onError: (error) => {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    },
  });

  const saveStepMutation = useMutation({
    mutationFn: async (step: Partial<SequenceStep> & { id?: string }) => {
      if (step.id) {
        // Update existing step
        const { error } = await supabase
          .from("lead_recovery_sequence_steps")
          .update({
            action_type: step.action_type,
            delay_minutes: step.delay_minutes,
            message_template: step.message_template,
            ai_call_script_hints: step.ai_call_script_hints,
            skip_if_responded: step.skip_if_responded,
            skip_if_booked: step.skip_if_booked,
          })
          .eq("id", step.id);
        if (error) throw error;
      } else {
        // Create new step
        const { error } = await supabase
          .from("lead_recovery_sequence_steps")
          .insert({
            sequence_id: step.sequence_id,
            step_order: step.step_order,
            action_type: step.action_type,
            delay_minutes: step.delay_minutes,
            message_template: step.message_template,
            ai_call_script_hints: step.ai_call_script_hints,
            skip_if_responded: step.skip_if_responded ?? true,
            skip_if_booked: step.skip_if_booked ?? true,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recovery-sequence", tenantId] });
      toast.success("Step saved");
    },
    onError: (error) => {
      console.error("Error saving step:", error);
      toast.error("Failed to save step");
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await supabase
        .from("lead_recovery_sequence_steps")
        .delete()
        .eq("id", stepId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recovery-sequence", tenantId] });
      toast.success("Step deleted");
    },
    onError: (error) => {
      console.error("Error deleting step:", error);
      toast.error("Failed to delete step");
    },
  });

  const createSequenceMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant ID");

      // Create default sequence
      const { data: sequence, error: seqError } = await supabase
        .from("lead_recovery_sequences")
        .insert({
          tenant_id: tenantId,
          name: "Default Follow-Up",
          is_default: true,
          is_active: true,
        })
        .select()
        .single();

      if (seqError) throw seqError;

      // Create default steps
      const defaultSteps = [
        {
          sequence_id: sequence.id,
          step_order: 1,
          action_type: "sms",
          delay_minutes: 60,
          message_template:
            "Hi {{customer_first_name}}, this is {{business_name}}. Thanks for calling! We'd love to help you with {{service_interest}}. Ready to schedule? Reply or call us back!",
          skip_if_responded: true,
          skip_if_booked: true,
        },
        {
          sequence_id: sequence.id,
          step_order: 2,
          action_type: "sms",
          delay_minutes: 1440, // 24 hours
          message_template:
            "Hi {{customer_first_name}}, just following up from {{business_name}}. We have availability this week if you're still interested. Let us know!",
          skip_if_responded: true,
          skip_if_booked: true,
        },
        {
          sequence_id: sequence.id,
          step_order: 3,
          action_type: "sms",
          delay_minutes: 4320, // 3 days
          message_template:
            "{{customer_first_name}}, this is {{business_name}} checking in one more time. We're here when you're ready. Use code {{offer_code}} for {{offer_description}}!",
          skip_if_responded: true,
          skip_if_booked: true,
        },
      ];

      const { error: stepsError } = await supabase
        .from("lead_recovery_sequence_steps")
        .insert(defaultSteps);

      if (stepsError) throw stepsError;

      return sequence;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recovery-sequence", tenantId] });
      toast.success("Default sequence created");
    },
    onError: (error) => {
      console.error("Error creating sequence:", error);
      toast.error("Failed to create sequence");
    },
  });

  return {
    settings: settingsQuery.data,
    sequence: sequenceQuery.data,
    isLoading: settingsQuery.isLoading || sequenceQuery.isLoading,
    saveSettings: saveSettingsMutation.mutate,
    saveStep: saveStepMutation.mutate,
    deleteStep: deleteStepMutation.mutate,
    createSequence: createSequenceMutation.mutate,
    isSaving: saveSettingsMutation.isPending || saveStepMutation.isPending,
  };
}
