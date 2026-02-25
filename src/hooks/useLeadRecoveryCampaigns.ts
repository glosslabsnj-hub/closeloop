import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CampaignStatus = "active" | "paused" | "converted" | "stopped" | "declined" | "expired" | "all";

export interface CampaignFilters {
  status?: CampaignStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CampaignWithDetails {
  id: string;
  status: string;
  current_step: number;
  next_action_at: string | null;
  created_at: string;
  converted_at: string | null;
  recovered_value_cents: number | null;
  original_intent: string | null;
  original_service_interest: string | null;
  original_objection: string | null;
  original_call_outcome: string | null;
  total_attempts: number;
  total_responses: number;
  last_attempt_at: string | null;
  stopped_at: string | null;
  stopped_reason: string | null;
  converted_booking_id: string | null;
  customer: {
    id: string;
    full_name: string;
    phone_e164: string;
    email: string | null;
  } | null;
  sequence: {
    name: string;
    id: string;
  } | null;
  last_action: {
    action_type: string;
    executed_at: string;
    response_received: boolean;
    response_content: string | null;
    response_sentiment: string | null;
  } | null;
}

export interface CampaignCounts {
  all: number;
  active: number;
  paused: number;
  converted: number;
  stopped: number;
  declined: number;
}

export function useLeadRecoveryCampaigns(filters: CampaignFilters = {}) {
  const { tenant } = useAuth();
  const tenantId = tenant?.id;

  return useQuery({
    queryKey: ["lead-recovery-campaigns", tenantId, filters],
    queryFn: async (): Promise<{ campaigns: CampaignWithDetails[]; counts: CampaignCounts }> => {
      if (!tenantId) {
        return { campaigns: [], counts: { all: 0, active: 0, paused: 0, converted: 0, stopped: 0, declined: 0 } };
      }

      // Get counts for all statuses
      const { data: allCampaigns, error: countError } = await supabase
        .from("lead_recovery_campaigns")
        .select("status")
        .eq("tenant_id", tenantId);

      if (countError) {
        console.error("Error fetching campaign counts:", countError);
        throw countError;
      }

      const counts: CampaignCounts = {
        all: allCampaigns?.length || 0,
        active: allCampaigns?.filter(c => c.status === "active").length || 0,
        paused: allCampaigns?.filter(c => c.status === "paused").length || 0,
        converted: allCampaigns?.filter(c => c.status === "converted").length || 0,
        stopped: allCampaigns?.filter(c => c.status === "stopped" || c.status === "expired").length || 0,
        declined: allCampaigns?.filter(c => c.status === "declined").length || 0,
      };

      // Build filtered query
      let query = supabase
        .from("lead_recovery_campaigns")
        .select(`
          id,
          status,
          current_step,
          next_action_at,
          created_at,
          converted_at,
          recovered_value_cents,
          original_intent,
          original_service_interest,
          original_objection,
          original_call_outcome,
          total_attempts,
          total_responses,
          last_attempt_at,
          stopped_at,
          stopped_reason,
          converted_booking_id,
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
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      // Apply status filter
      if (filters.status && filters.status !== "all") {
        if (filters.status === "stopped") {
          // Include both stopped and expired
          query = query.in("status", ["stopped", "expired"]);
        } else {
          query = query.eq("status", filters.status);
        }
      }

      // Apply pagination
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data: campaigns, error } = await query;

      if (error) {
        console.error("Error fetching campaigns:", error);
        throw error;
      }

      // Fetch last action for each campaign
      const campaignIds = campaigns?.map(c => c.id) || [];
      
      const actionsMap: Record<string, any> = {};
      if (campaignIds.length > 0) {
        const { data: actions } = await supabase
          .from("lead_recovery_actions")
          .select("campaign_id, action_type, executed_at, response_received, response_content, response_sentiment")
          .in("campaign_id", campaignIds)
          .order("executed_at", { ascending: false });

        // Group by campaign_id and take first (most recent)
        if (actions) {
          for (const action of actions) {
            if (!actionsMap[action.campaign_id]) {
              actionsMap[action.campaign_id] = action;
            }
          }
        }
      }

      // Filter by search if provided
      let filteredCampaigns = campaigns || [];
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredCampaigns = filteredCampaigns.filter(c => {
          const name = c.customer?.full_name?.toLowerCase() || "";
          const phone = c.customer?.phone_e164 || "";
          return name.includes(searchLower) || phone.includes(filters.search || "");
        });
      }

      // Map campaigns with last action
      const campaignsWithDetails: CampaignWithDetails[] = filteredCampaigns.map(c => ({
        ...c,
        customer: c.customer as CampaignWithDetails["customer"],
        sequence: c.sequence as CampaignWithDetails["sequence"],
        last_action: actionsMap[c.id] || null,
      }));

      return { campaigns: campaignsWithDetails, counts };
    },
    enabled: !!tenantId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useRecentBookings() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id;

  return useQuery({
    queryKey: ["recent-bookings-for-recovery", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          start_at,
          status,
          service:services(name)
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching recent bookings:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!tenantId,
  });
}
