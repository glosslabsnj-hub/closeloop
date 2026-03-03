import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CustomerEnrichment {
  customerId: string;
  lastServiceDate: string | null;
  nextBookingDate: string | null;
  recentCallCount: number;
  isActive: boolean;
}

/**
 * Batch-fetches last service date, next booking, recent call count, and
 * active status for all customers belonging to the current tenant.
 *
 * "Active" = has any calls or bookings in the last 90 days.
 * "Last Service" = most recent past booking (any status except cancelled).
 * "Next Booking" = earliest future booking (pending or confirmed).
 */
export function useCustomerEnrichment(customerIds: string[]) {
  const { tenant } = useAuth();
  const tenantId = tenant?.id ?? null;

  return useQuery({
    queryKey: ["customer-enrichment", tenantId, customerIds.length],
    queryFn: async (): Promise<Map<string, CustomerEnrichment>> => {
      if (!tenantId || customerIds.length === 0) return new Map();

      const map = new Map<string, CustomerEnrichment>();
      const now = new Date().toISOString();

      // Fetch all non-cancelled bookings per customer via lead linkage
      const { data: bookings } = await supabase
        .from("bookings")
        .select("lead_id, start_at, status, leads!inner(customer_id)")
        .eq("tenant_id", tenantId)
        .not("status", "in", '("canceled","cancelled")')
        .order("start_at", { ascending: false });

      // Build last-service map (most recent PAST booking) and next-booking map
      const lastServiceMap = new Map<string, string>();
      const nextBookingMap = new Map<string, string>();
      for (const b of bookings || []) {
        const custId = (b.leads as any)?.customer_id;
        if (!custId) continue;

        const bookingTime = b.start_at;
        if (bookingTime <= now) {
          // Past booking — take the most recent one
          if (!lastServiceMap.has(custId)) {
            lastServiceMap.set(custId, bookingTime);
          }
        } else {
          // Future booking — take the earliest upcoming
          const existing = nextBookingMap.get(custId);
          if (!existing || bookingTime < existing) {
            nextBookingMap.set(custId, bookingTime);
          }
        }
      }

      // Fetch recent call counts (last 90 days for activity, display last 30)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: calls } = await supabase
        .from("ai_call_sessions")
        .select("customer_id, started_at")
        .eq("tenant_id", tenantId)
        .in("customer_id", customerIds)
        .gte("started_at", ninetyDaysAgo.toISOString());

      const callCountMap = new Map<string, number>();
      const hasRecentCallMap = new Map<string, boolean>();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

      for (const c of calls || []) {
        if (c.customer_id) {
          hasRecentCallMap.set(c.customer_id, true);
          if (c.started_at >= thirtyDaysAgoStr) {
            callCountMap.set(c.customer_id, (callCountMap.get(c.customer_id) || 0) + 1);
          }
        }
      }

      for (const id of customerIds) {
        const hasRecentCall = hasRecentCallMap.get(id) || false;
        const hasRecentBooking = lastServiceMap.has(id) || nextBookingMap.has(id);

        map.set(id, {
          customerId: id,
          lastServiceDate: lastServiceMap.get(id) ?? null,
          nextBookingDate: nextBookingMap.get(id) ?? null,
          recentCallCount: callCountMap.get(id) ?? 0,
          isActive: hasRecentCall || hasRecentBooking,
        });
      }

      return map;
    },
    enabled: !!tenantId && customerIds.length > 0,
    staleTime: 60000,
  });
}
