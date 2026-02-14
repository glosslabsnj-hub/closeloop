import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

export type LeadTemperature = "hot" | "warm" | "cold";

export interface EnrichedLead extends Lead {
  temperature: LeadTemperature;
  temperatureReason: string;
  latestCallScore: string | null;
  latestCallOutcome: string | null;
  latestCallAt: string | null;
  callCount: number;
}

function computeTemperature(
  lead: Lead,
  latestScore: string | null,
  latestOutcome: string | null,
  latestCallAt: string | null,
): { temperature: LeadTemperature; reason: string } {
  const now = Date.now();
  const lastActivity = lead.last_message_at
    ? new Date(lead.last_message_at).getTime()
    : latestCallAt
      ? new Date(latestCallAt).getTime()
      : new Date(lead.created_at).getTime();

  const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);

  // Hot: explicit hot score, booked/dispatched, or very recent high-intent activity
  if (latestScore === "hot") {
    return { temperature: "hot", reason: "AI scored as high-intent" };
  }
  if (lead.status === "booked" || lead.status === "won") {
    return { temperature: "hot", reason: `Status: ${lead.status}` };
  }
  if (latestOutcome === "booked" || latestOutcome === "dispatch") {
    return { temperature: "hot", reason: `Outcome: ${latestOutcome === "booked" ? "booked appointment" : "dispatch requested"}` };
  }
  if (hoursSinceActivity <= 24 && lead.status !== "lost" && (latestOutcome === "followup" || latestOutcome === "lead_captured")) {
    const hrs = Math.round(hoursSinceActivity);
    return { temperature: "hot", reason: `${latestOutcome === "followup" ? "Requested callback" : "Lead captured"} ${hrs}h ago` };
  }

  // Warm: warm score, contacted/qualified, or recent activity within 3 days
  if (latestScore === "warm") {
    return { temperature: "warm", reason: "AI scored as engaged" };
  }
  if (lead.status === "contacted") {
    return { temperature: "warm", reason: "Contacted — awaiting response" };
  }
  if (lead.status === "qualified") {
    return { temperature: "warm", reason: "Qualified — ready for quote" };
  }
  if (latestOutcome === "followup" && hoursSinceActivity <= 72) {
    return { temperature: "warm", reason: "Follow-up requested recently" };
  }
  if (latestOutcome === "lead_captured" && hoursSinceActivity <= 72) {
    return { temperature: "warm", reason: "Captured within 3 days" };
  }
  if (hoursSinceActivity <= 72 && lead.status !== "lost") {
    return { temperature: "warm", reason: "Active within 3 days" };
  }

  // Cold
  if (lead.status === "lost") {
    return { temperature: "cold", reason: "Marked as lost" };
  }
  if (hoursSinceActivity > 168) {
    return { temperature: "cold", reason: "No activity in 7+ days" };
  }
  return { temperature: "cold", reason: "No recent engagement" };
}

export function useLeadIntelligence() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id ?? null;

  return useQuery({
    queryKey: ["lead-intelligence", tenantId],
    queryFn: async (): Promise<EnrichedLead[]> => {
      if (!tenantId) return [];

      const { data: leads, error: leadsErr } = await supabase
        .from("leads")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (leadsErr) throw leadsErr;
      if (!leads || leads.length === 0) return [];

      const leadIds = leads.map((l) => l.id);
      const { data: sessions } = await supabase
        .from("ai_call_sessions")
        .select("lead_id, lead_score, outcome, started_at")
        .eq("tenant_id", tenantId)
        .in("lead_id", leadIds)
        .order("started_at", { ascending: false });

      const sessionMap = new Map<
        string,
        { score: string | null; outcome: string | null; at: string | null; count: number }
      >();

      for (const s of sessions || []) {
        if (!s.lead_id) continue;
        const existing = sessionMap.get(s.lead_id);
        if (existing) {
          existing.count++;
        } else {
          sessionMap.set(s.lead_id, {
            score: s.lead_score,
            outcome: s.outcome,
            at: s.started_at,
            count: 1,
          });
        }
      }

      return leads.map((lead): EnrichedLead => {
        const session = sessionMap.get(lead.id);
        const { temperature, reason } = computeTemperature(
          lead,
          session?.score ?? null,
          session?.outcome ?? null,
          session?.at ?? null,
        );
        return {
          ...lead,
          temperature,
          temperatureReason: reason,
          latestCallScore: session?.score ?? null,
          latestCallOutcome: session?.outcome ?? null,
          latestCallAt: session?.at ?? null,
          callCount: session?.count ?? 0,
        };
      });
    },
    enabled: !!tenantId,
    staleTime: 30000,
  });
}
