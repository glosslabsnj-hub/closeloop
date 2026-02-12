import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CallHistoryItem {
  id: string;
  started_at: string;
  ended_at: string | null;
  outcome: string | null;
  summary: string | null;
}

export interface BookingHistoryItem {
  id: string;
  start_at: string;
  status: string;
  notes: string | null;
  service: { name: string } | null;
}

export interface RelatedLead {
  id: string;
  full_name: string;
  phone: string | null;
  status: string;
  source: string;
  created_at: string;
}

export function useCustomerActivity(customerId: string | null, customerPhone: string | null) {
  const { tenant } = useAuth();

  const callHistoryQuery = useQuery({
    queryKey: ["customer-calls", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from("ai_call_sessions")
        .select("id, started_at, ended_at, outcome, summary")
        .eq("customer_id", customerId)
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as CallHistoryItem[];
    },
    enabled: !!customerId,
  });

  const relatedLeadsQuery = useQuery({
    queryKey: ["customer-leads", tenant?.id, customerPhone],
    queryFn: async () => {
      if (!tenant?.id || !customerPhone) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("id, full_name, phone, status, source, created_at")
        .eq("tenant_id", tenant.id)
        .eq("phone", customerPhone)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RelatedLead[];
    },
    enabled: !!tenant?.id && !!customerPhone,
  });

  const leadIds = relatedLeadsQuery.data?.map((l) => l.id) ?? [];

  const bookingsQuery = useQuery({
    queryKey: ["customer-bookings", leadIds],
    queryFn: async () => {
      if (leadIds.length === 0) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("id, start_at, status, notes, service:services(name)")
        .in("lead_id", leadIds)
        .order("start_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((b) => ({
        ...b,
        service: Array.isArray(b.service) ? b.service[0] : b.service,
      })) as BookingHistoryItem[];
    },
    enabled: leadIds.length > 0,
  });

  return {
    callHistory: callHistoryQuery.data ?? [],
    bookings: bookingsQuery.data ?? [],
    relatedLeads: relatedLeadsQuery.data ?? [],
    isLoading: callHistoryQuery.isLoading || relatedLeadsQuery.isLoading || bookingsQuery.isLoading,
  };
}
