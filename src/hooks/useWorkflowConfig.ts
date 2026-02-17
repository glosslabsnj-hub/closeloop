import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ============= TYPE DEFINITIONS =============

export interface DispatchWorkflowConfig {
  id?: string;
  tenant_id: string;
  vehicle_info_timing: "before_pricing" | "after_pricing" | "optional";
  vehicle_affects_pricing: boolean;
  required_vehicle_fields: string[];
  luxury_flatbed_recommendation: boolean;
  luxury_brands: string[];
  awd_detection_enabled: boolean;
  motorcycle_special_handling: boolean;
  ask_payment_method: boolean;
  payment_timing: "upfront" | "on_arrival" | "invoiced";
  require_payment_confirmation: boolean;
  accepted_methods: string[];
  payment_due_message: string;
  confirm_geocoded_address: boolean;
  require_zip_code: boolean;
  address_confirmation_script: string;
  driver_callback_script: string;
  include_direct_contact_info: boolean;
  escalation_number: string;
  service_dropoff_rules: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceWorkflowConfig {
  id?: string;
  tenant_id: string;
  collect_service_duration: boolean;
  collect_deposit_upfront: boolean;
  deposit_timing: "before_booking" | "at_confirmation" | "day_before";
  deposit_amount_behavior: "fixed" | "percentage" | "per_service";
  default_deposit_percentage: number;
  required_intake_questions: Array<{ service_id: string; questions: string[] }>;
  suggest_alternatives_when_unavailable: boolean;
  max_alternatives_to_suggest: number;
  alternative_suggestion_window_days: number;
  booking_confirmation_script: string;
  send_sms_confirmation: boolean;
  ask_for_email_confirmation: boolean;
  allow_ai_rescheduling: boolean;
  allow_ai_cancellation: boolean;
  cancellation_requires_manager: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FoodWorkflowConfig {
  id?: string;
  tenant_id: string;
  ask_pickup_vs_delivery: "always" | "if_both_enabled" | "never";
  default_order_type: "pickup" | "delivery" | "ask";
  allow_menu_customizations: boolean;
  require_allergy_check: boolean;
  ask_special_instructions: boolean;
  ask_asap_vs_scheduled: boolean;
  min_advance_order_minutes: number;
  default_prep_time_minutes: number;
  collect_delivery_instructions: boolean;
  require_buzzer_code: boolean;
  order_confirmation_script: string;
  repeat_order_back: boolean;
  confirm_total_before_submit: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MedicalWorkflowConfig {
  id?: string;
  tenant_id: string;
  consent_timing: "before_intake" | "after_reason" | "at_end";
  consent_script: string;
  require_explicit_consent: boolean;
  collect_symptom_details: boolean;
  symptom_severity_scale: boolean;
  ask_duration_of_symptoms: boolean;
  required_intake_questions: Array<{ service_id: string; questions: string[] }>;
  detect_emergency_keywords: boolean;
  emergency_escalation_script: string;
  created_at?: string;
  updated_at?: string;
}

export interface GeneralWorkflowConfig {
  id?: string;
  tenant_id: string;
  qualification_questions: Array<{ question: string; required: boolean }>;
  callback_confirmation_script: string;
  ask_best_time_to_call: boolean;
  ask_callback_reason: boolean;
  escalate_unknown_questions: boolean;
  unknown_question_script: string;
  created_at?: string;
  updated_at?: string;
}

// ============= DISPATCH WORKFLOW CONFIG =============

export function useDispatchWorkflowConfig() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["dispatch_workflow_config", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("dispatch_workflow_config")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error) throw error;
      return data as DispatchWorkflowConfig | null;
    },
    enabled: !!tenant?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<DispatchWorkflowConfig>) => {
      if (!tenant?.id) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("dispatch_workflow_config")
        .upsert({
          tenant_id: tenant.id,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch_workflow_config", tenant?.id] });
      toast.success("Dispatch workflow updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  return {
    config: query.data,
    isLoading: query.isLoading,
    error: query.error,
    update: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}

// ============= SERVICE WORKFLOW CONFIG =============

export function useServiceWorkflowConfig() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["service_workflow_config", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("service_workflow_config")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error) throw error;
      return data as ServiceWorkflowConfig | null;
    },
    enabled: !!tenant?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<ServiceWorkflowConfig>) => {
      if (!tenant?.id) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("service_workflow_config")
        .upsert({
          tenant_id: tenant.id,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_workflow_config", tenant?.id] });
      toast.success("Service workflow updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  return {
    config: query.data,
    isLoading: query.isLoading,
    error: query.error,
    update: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}

// ============= FOOD WORKFLOW CONFIG =============

export function useFoodWorkflowConfig() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["food_workflow_config", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("food_workflow_config")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error) throw error;
      return data as FoodWorkflowConfig | null;
    },
    enabled: !!tenant?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<FoodWorkflowConfig>) => {
      if (!tenant?.id) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("food_workflow_config")
        .upsert({
          tenant_id: tenant.id,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food_workflow_config", tenant?.id] });
      toast.success("Food workflow updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  return {
    config: query.data,
    isLoading: query.isLoading,
    error: query.error,
    update: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}

// ============= MEDICAL WORKFLOW CONFIG =============

export function useMedicalWorkflowConfig() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["medical_workflow_config", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("medical_workflow_config")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error) throw error;
      return data as MedicalWorkflowConfig | null;
    },
    enabled: !!tenant?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<MedicalWorkflowConfig>) => {
      if (!tenant?.id) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("medical_workflow_config")
        .upsert({
          tenant_id: tenant.id,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical_workflow_config", tenant?.id] });
      toast.success("Medical workflow updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  return {
    config: query.data,
    isLoading: query.isLoading,
    error: query.error,
    update: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}

// ============= GENERAL WORKFLOW CONFIG =============

export function useGeneralWorkflowConfig() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["general_workflow_config", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("general_workflow_config")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error) throw error;
      return data as GeneralWorkflowConfig | null;
    },
    enabled: !!tenant?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<GeneralWorkflowConfig>) => {
      if (!tenant?.id) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("general_workflow_config")
        .upsert({
          tenant_id: tenant.id,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["general_workflow_config", tenant?.id] });
      toast.success("General workflow updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  return {
    config: query.data,
    isLoading: query.isLoading,
    error: query.error,
    update: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
