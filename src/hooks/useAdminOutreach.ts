import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OutreachSequence {
  id: string;
  name: string;
  description: string | null;
  target_type: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OutreachSequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  step_type: string;
  delay_hours: number;
  subject: string | null;
  message_template: string | null;
  use_ai_personalization: boolean;
  skip_if_responded: boolean;
  created_at: string;
}

export interface OutreachCampaign {
  id: string;
  name: string;
  sequence_id: string;
  status: string;
  target_type: string;
  filters: Record<string, any>;
  total_enrolled: number;
  total_responded: number;
  total_converted: number;
  created_at: string;
  updated_at: string;
}

export interface OutreachEnrollment {
  id: string;
  campaign_id: string;
  lead_type: string;
  lead_id: string;
  lead_name: string;
  lead_email: string | null;
  lead_phone: string | null;
  status: string;
  current_step: number;
  next_action_at: string | null;
  last_action_at: string | null;
  response_text: string | null;
  response_sentiment: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachAction {
  id: string;
  enrollment_id: string;
  campaign_id: string;
  step_order: number;
  action_type: string;
  message_sent: string | null;
  subject_sent: string | null;
  delivery_status: string;
  delivery_error: string | null;
  external_message_id: string | null;
  executed_at: string;
}

// ---- Sequences ----

export function useOutreachSequences() {
  return useQuery({
    queryKey: ["admin-outreach-sequences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_outreach_sequences" as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as OutreachSequence[];
    },
  });
}

export function useOutreachSequenceSteps(sequenceId: string | undefined) {
  return useQuery({
    queryKey: ["admin-outreach-sequence-steps", sequenceId],
    enabled: !!sequenceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_outreach_sequence_steps" as any)
        .select("*")
        .eq("sequence_id", sequenceId!)
        .order("step_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as OutreachSequenceStep[];
    },
  });
}

export function useCreateOutreachSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (seq: { name: string; description?: string; target_type: string }) => {
      const { data, error } = await supabase
        .from("admin_outreach_sequences" as any)
        .insert(seq as any)
        .select("id")
        .single();
      if (error) throw error;
      return data as unknown as { id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-outreach-sequences"] });
      toast.success("Sequence created");
    },
  });
}

export function useUpdateOutreachSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<OutreachSequence>) => {
      const { error } = await supabase
        .from("admin_outreach_sequences" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-outreach-sequences"] });
    },
  });
}

export function useDeleteOutreachSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("admin_outreach_sequences" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-outreach-sequences"] });
      toast.success("Sequence deleted");
    },
  });
}

export function useSaveSequenceSteps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sequenceId, steps }: { sequenceId: string; steps: Omit<OutreachSequenceStep, "id" | "created_at">[] }) => {
      // Delete existing steps then re-insert
      await supabase
        .from("admin_outreach_sequence_steps" as any)
        .delete()
        .eq("sequence_id", sequenceId);
      if (steps.length > 0) {
        const { error } = await supabase
          .from("admin_outreach_sequence_steps" as any)
          .insert(steps as any);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-outreach-sequence-steps", vars.sequenceId] });
      toast.success("Steps saved");
    },
  });
}

// ---- Campaigns ----

export function useOutreachCampaigns() {
  return useQuery({
    queryKey: ["admin-outreach-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_outreach_campaigns" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OutreachCampaign[];
    },
  });
}

export function useCreateOutreachCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaign: Omit<OutreachCampaign, "id" | "total_enrolled" | "total_responded" | "total_converted" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("admin_outreach_campaigns" as any)
        .insert(campaign as any)
        .select("id")
        .single();
      if (error) throw error;
      return data as unknown as { id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-outreach-campaigns"] });
      toast.success("Campaign created");
    },
  });
}

export function useUpdateOutreachCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<OutreachCampaign>) => {
      const { error } = await supabase
        .from("admin_outreach_campaigns" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-outreach-campaigns"] });
    },
  });
}

// ---- Enrollments ----

export function useOutreachEnrollments(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["admin-outreach-enrollments", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_outreach_enrollments" as any)
        .select("*")
        .eq("campaign_id", campaignId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OutreachEnrollment[];
    },
  });
}

export function useEnrollLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { campaign_id: string; leads: Array<{ lead_id: string; lead_type: string; lead_name: string; lead_email?: string; lead_phone?: string; lead_metadata?: Record<string, any> }> }) => {
      const { data, error } = await supabase.functions.invoke("admin-outreach-enroll", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-outreach-enrollments"] });
      qc.invalidateQueries({ queryKey: ["admin-outreach-campaigns"] });
      toast.success(`${data?.enrolled ?? 0} lead(s) enrolled`);
    },
    onError: () => toast.error("Failed to enroll leads"),
  });
}

// ---- Conversion Tracking ----

export function useMarkConverted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase.rpc("admin_mark_enrollment_converted" as any, {
        p_enrollment_id: enrollmentId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-outreach-enrollments"] });
      qc.invalidateQueries({ queryKey: ["admin-outreach-campaigns"] });
      qc.invalidateQueries({ queryKey: ["admin-growth-activity-log"] });
      toast.success("Lead marked as converted!");
    },
    onError: () => toast.error("Failed to mark conversion"),
  });
}

// ---- Actions (activity log per campaign) ----

export function useOutreachActions(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["admin-outreach-actions", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_outreach_actions" as any)
        .select("*")
        .eq("campaign_id", campaignId!)
        .order("executed_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as OutreachAction[];
    },
  });
}
