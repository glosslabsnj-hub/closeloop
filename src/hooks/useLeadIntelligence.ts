import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

export type LeadTemperature = "hot" | "warm" | "cold";

export interface EnrichedLead extends Lead {
  temperature: LeadTemperature;
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
): LeadTemperature {
  const now = Date.now();
  const lastActivity = lead.last_message_at
    ? new Date(lead.last_message_at).getTime()
    : latestCallAt
      ? new Date(latestCallAt).getTime()
      : new Date(lead.created_at).getTime();

  const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);

  // Hot: explicit hot score, booked status, or very recent activity
  if (
    latestScore === "hot" ||
    lead.status === "booked" ||
    lead.status === "won" ||
    (hoursSinceActivity <= 24 && lead.status !== "lost")
  ) {
    return "hot";
  }

  // Warm: warm score, contacted/qualified, or recent activity within 3 days
  if (
    latestScore === "warm" ||
    lead.status === "contacted" ||
    lead.status === "qualified" ||
    latestOutcome === "followup" ||
    (hoursSinceActivity <= 72 && lead.status !== "lost")
  ) {
    return "warm";
  }

  return "cold";
}

export function useLeadIntelligence() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id ?? null;

  return useQuery({
    queryKey: ["lead-intelligence", tenantId],
    queryFn: async (): Promise<EnrichedLead[]> => {
      if (!tenantId) return [];

      // Fetch leads
      const { data: leads, error: leadsErr } = await supabase
        .from("leads")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (leadsErr) throw leadsErr;
      if (!leads || leads.length === 0) return [];

      // Fetch latest call session per lead (batch)
      const leadIds = leads.map((l) => l.id);
      const { data: sessions } = await supabase
        .from("ai_call_sessions")
        .select("lead_id, lead_score, outcome, started_at")
        .eq("tenant_id", tenantId)
        .in("lead_id", leadIds)
        .order("started_at", { ascending: false });

      // Build map: lead_id -> latest session info + count
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
        const temperature = computeTemperature(
          lead,
          session?.score ?? null,
          session?.outcome ?? null,
          session?.at ?? null,
        );
        return {
          ...lead,
          temperature,
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
