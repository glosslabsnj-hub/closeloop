import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CampaignDetailAction {
  id: string;
  campaign_id: string;
  step_id: string | null;
  action_type: string;
  executed_at: string | null;
  message_sent: string | null;
  call_session_id: string | null;
  delivery_status: string | null;
  response_received: boolean;
  response_at: string | null;
  response_content: string | null;
  response_sentiment: string | null;
  response_outcome: string | null;
}

export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  action_type: string;
  delay_minutes: number;
  message_template: string | null;
  ai_call_script_hints: string | null;
}

export interface CampaignDetailData {
  id: string;
  tenant_id: string;
  customer_id: string;
  lead_id: string | null;
  sequence_id: string;
  status: string;
  current_step: number;
  next_action_at: string | null;
  created_at: string;
  converted_at: string | null;
  stopped_at: string | null;
  stopped_reason: string | null;
  recovered_value_cents: number | null;
  converted_booking_id: string | null;
  original_intent: string | null;
  original_service_interest: string | null;
  original_objection: string | null;
  original_call_outcome: string | null;
  total_attempts: number;
  total_responses: number;
  last_attempt_at: string | null;
  last_response_at: string | null;
  notes: string | null;
  customer: {
    id: string;
    full_name: string;
    phone_e164: string;
    email: string | null;
  } | null;
  sequence: {
    id: string;
    name: string;
  } | null;
  original_call: {
    id: string;
    started_at: string;
    ended_at: string | null;
    transcript: string | null;
    summary: string | null;
  } | null;
  actions: CampaignDetailAction[];
  allSteps: SequenceStep[];
}

export function useCampaignDetail(campaignId: string | null) {
  return useQuery({
    queryKey: ["campaign-detail", campaignId],
    queryFn: async (): Promise<CampaignDetailData | null> => {
      if (!campaignId) return null;

      // Fetch campaign with related data
      const { data: campaign, error } = await supabase
        .from("lead_recovery_campaigns")
        .select(`
          *,
          customer:customers!lead_recovery_campaigns_customer_id_fkey(
            id,
            full_name,
            phone_e164,
            email
          ),
          sequence:lead_recovery_sequences!lead_recovery_campaigns_sequence_id_fkey(
            id,
            name
          )
        `)
        .eq("id", campaignId)
        .single();

      if (error || !campaign) {
        console.error("Error fetching campaign detail:", error);
        return null;
      }

      // Original call info is not directly linked - set to null
      // Could be enhanced later to look up by customer + time
      const originalCall = null;

      // Fetch actions
      const { data: actions } = await supabase
        .from("lead_recovery_actions")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("executed_at", { ascending: true });

      // Fetch all steps in sequence
      let allSteps: SequenceStep[] = [];
      if (campaign.sequence_id) {
        const { data: steps } = await supabase
          .from("lead_recovery_sequence_steps")
          .select("*")
          .eq("sequence_id", campaign.sequence_id)
          .order("step_order", { ascending: true });
        allSteps = (steps || []) as SequenceStep[];
      }

      return {
        ...campaign,
        customer: campaign.customer as CampaignDetailData["customer"],
        sequence: campaign.sequence as CampaignDetailData["sequence"],
        original_call: originalCall,
        actions: (actions || []) as CampaignDetailAction[],
        allSteps,
      };
    },
    enabled: !!campaignId,
  });
}
