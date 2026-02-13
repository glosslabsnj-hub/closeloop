import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CustomerEnrichment {
  customerId: string;
  lastServiceDate: string | null;
  recentCallCount: number;
}

/**
 * Batch-fetches last service date and recent call count for all customers
 * belonging to the current tenant.
 */
export function useCustomerEnrichment(customerIds: string[]) {
  const { tenant } = useAuth();
  const tenantId = tenant?.id ?? null;

  return useQuery({
    queryKey: ["customer-enrichment", tenantId, customerIds.length],
    queryFn: async (): Promise<Map<string, CustomerEnrichment>> => {
      if (!tenantId || customerIds.length === 0) return new Map();

      const map = new Map<string, CustomerEnrichment>();

      // Fetch most recent completed booking per customer via lead linkage
      // Bookings link through leads, so we join leads -> bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select("lead_id, start_at, status, leads!inner(customer_id)")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .order("start_at", { ascending: false });

      // Build last-service map by customer_id
      const lastServiceMap = new Map<string, string>();
      for (const b of bookings || []) {
        const custId = (b.leads as any)?.customer_id;
        if (custId && !lastServiceMap.has(custId)) {
          lastServiceMap.set(custId, b.start_at);
        }
      }

      // Fetch recent call counts (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: calls } = await supabase
        .from("ai_call_sessions")
        .select("customer_id")
        .eq("tenant_id", tenantId)
        .in("customer_id", customerIds)
        .gte("started_at", thirtyDaysAgo.toISOString());

      const callCountMap = new Map<string, number>();
      for (const c of calls || []) {
        if (c.customer_id) {
          callCountMap.set(c.customer_id, (callCountMap.get(c.customer_id) || 0) + 1);
        }
      }

      for (const id of customerIds) {
        map.set(id, {
          customerId: id,
          lastServiceDate: lastServiceMap.get(id) ?? null,
          recentCallCount: callCountMap.get(id) ?? 0,
        });
      }

      return map;
    },
    enabled: !!tenantId && customerIds.length > 0,
    staleTime: 60000,
  });
}
