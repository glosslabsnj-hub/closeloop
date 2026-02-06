import { useMemo, useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Download } from "lucide-react";
import { format, isToday, isYesterday, startOfDay, isWithinInterval } from "date-fns";
import { CallListCard } from "./CallListCard";
import { CallDetailPanel } from "./CallDetailPanel";
import { CallsFilterBar, CallFilters } from "./CallsFilterBar";

interface CallSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  caller_phone: string | null;
  call_direction: "inbound" | "outbound";
  outcome: string | null;
  summary: string | null;
  transcript?: string | null;
  context_json: Record<string, unknown> | null;
  extracted_payload: Record<string, unknown> | null;
  customer_id: string | null;
  customer?: {
    id: string;
    full_name: string;
    phone_e164: string;
  } | null;
}

interface GroupedCalls {
  label: string;
  date: Date;
  calls: CallSession[];
}

// Helper to extract customer name from call data
function getCustomerName(call: CallSession): string {
  if (call.customer?.full_name && call.customer.full_name !== "Unknown") {
    return call.customer.full_name;
  }
  const ctx = call.context_json;
  if (ctx) {
    const name = ctx.customer_name || ctx.name || ctx.caller_name;
    if (typeof name === "string" && name && name !== "Unknown") return name;
  }
  const payload = call.extracted_payload;
  if (payload) {
    const name = payload.customer_name || payload.name;
    if (typeof name === "string" && name && name !== "Unknown") return name;
  }
  return "Unknown Caller";
}

function getDateLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d");
}

// Calculate call duration in seconds
function getCallDuration(call: CallSession): number {
  if (!call.ended_at) return 0;
  return Math.floor((new Date(call.ended_at).getTime() - new Date(call.started_at).getTime()) / 1000);
}

// Get revenue from call
function getCallRevenue(call: CallSession): number {
  const payload = call.extracted_payload;
  if (!payload) return 0;
  return (payload.price as number) || (payload.total as number) || 0;
}

const DEFAULT_FILTERS: CallFilters = {
  search: "",
  outcome: "all",
  duration: "all",
  customerType: "all",
  datePreset: "all",
  dateRange: undefined,
  sort: "recent",
};

export function CallsListView() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [filters, setFilters] = useState<CallFilters>(DEFAULT_FILTERS);
  const [selectedCall, setSelectedCall] = useState<CallSession | null>(null);
  const [limit, setLimit] = useState(50);

  // Realtime subscription
  useEffect(() => {
    if (!tenant?.id) return;
    const channel = supabase
      .channel("calls-list-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ai_call_sessions", filter: `tenant_id=eq.${tenant.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["calls_list", tenant.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenant?.id, queryClient]);

  // Fetch calls
  const { data: calls, isLoading } = useQuery({
    queryKey: ["calls_list", tenant?.id, limit],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("ai_call_sessions")
        .select(`
          id, started_at, ended_at, caller_phone, call_direction,
          outcome, summary, transcript, context_json, extracted_payload,
          customer_id, customer:customers!ai_call_sessions_customer_id_fkey (id, full_name, phone_e164)
        `)
        .eq("tenant_id", tenant.id)
        .order("started_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []).map((row) => ({
        ...row,
        context_json: row.context_json as Record<string, unknown> | null,
        extracted_payload: row.extracted_payload as Record<string, unknown> | null,
        customer: Array.isArray(row.customer) ? row.customer[0] : row.customer,
      })) as CallSession[];
    },
    enabled: !!tenant?.id,
  });

  // Open call from URL param
  useEffect(() => {
    const callId = searchParams.get("call");
    if (callId && calls) {
      const call = calls.find(c => c.id === callId);
      if (call) setSelectedCall(call);
    }
  }, [calls, searchParams]);

  // Filter, sort, and group calls
  const { filteredCalls, groupedCalls, outcomeCounts } = useMemo(() => {
    if (!calls) return { filteredCalls: [], groupedCalls: [], outcomeCounts: {} as Record<string, number> };
    
    // Count outcomes (before filtering)
    const counts: Record<string, number> = { all: calls.length };
    calls.forEach(call => {
      const outcome = call.outcome || "pending";
      counts[outcome] = (counts[outcome] || 0) + 1;
    });

    // Apply filters
    let filtered = calls;

    // Search filter (phone, name, summary, transcript)
    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(call =>
        call.caller_phone?.toLowerCase().includes(query) ||
        call.summary?.toLowerCase().includes(query) ||
        call.transcript?.toLowerCase().includes(query) ||
        getCustomerName(call).toLowerCase().includes(query)
      );
    }

    // Outcome filter
    if (filters.outcome !== "all") {
      filtered = filtered.filter(call => call.outcome === filters.outcome);
    }

    // Date range filter
    if (filters.dateRange?.from) {
      filtered = filtered.filter(call => {
        const callDate = new Date(call.started_at);
        if (filters.dateRange?.to) {
          return isWithinInterval(callDate, { start: filters.dateRange.from!, end: filters.dateRange.to });
        }
        return callDate >= filters.dateRange.from!;
      });
    }

    // Duration filter
    if (filters.duration !== "all") {
      filtered = filtered.filter(call => {
        const duration = getCallDuration(call);
        switch (filters.duration) {
          case "under1": return duration < 60;
          case "1to3": return duration >= 60 && duration < 180;
          case "3to5": return duration >= 180 && duration < 300;
          case "over5": return duration >= 300;
          default: return true;
        }
      });
    }

    // Customer type filter
    if (filters.customerType !== "all") {
      filtered = filtered.filter(call => {
        const name = getCustomerName(call);
        const hasCustomer = !!call.customer_id;
        const isReturning = hasCustomer && call.customer?.full_name !== "Unknown";
        
        switch (filters.customerType) {
          case "new": return hasCustomer && !isReturning;
          case "returning": return isReturning;
          case "unknown": return name === "Unknown Caller";
          default: return true;
        }
      });
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (filters.sort) {
        case "oldest":
          return new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
        case "longest":
          return getCallDuration(b) - getCallDuration(a);
        case "revenue":
          return getCallRevenue(b) - getCallRevenue(a);
        case "recent":
        default:
          return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
      }
    });

    // Group by date
    const groups: Record<string, CallSession[]> = {};
    sorted.forEach(call => {
      const dayKey = startOfDay(new Date(call.started_at)).toISOString();
      if (!groups[dayKey]) groups[dayKey] = [];
      groups[dayKey].push(call);
    });

    const grouped: GroupedCalls[] = Object.entries(groups)
      .map(([dateStr, calls]) => ({
        date: new Date(dateStr),
        label: getDateLabel(new Date(dateStr)),
        calls,
      }))
      .sort((a, b) => {
        // Respect sort order for groups
        if (filters.sort === "oldest") {
          return a.date.getTime() - b.date.getTime();
        }
        return b.date.getTime() - a.date.getTime();
      });

    return { filteredCalls: sorted, groupedCalls: grouped, outcomeCounts: counts };
  }, [calls, filters]);

  const handleSelectCall = useCallback((call: CallSession) => {
    setSelectedCall(call);
    setSearchParams({ call: call.id }, { replace: true });
  }, [setSearchParams]);

  const handleCloseDetail = useCallback(() => {
    setSelectedCall(null);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const loadMore = useCallback(() => {
    setLimit(prev => prev + 50);
  }, []);

  const totalCount = calls?.length || 0;

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        icon={<Phone className="h-5 w-5" />}
        title="Calls & Sessions"
        description="View all AI-handled calls and their outcomes."
        action={
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        }
      />

      {/* Filters */}
      <div className="mb-6">
        <CallsFilterBar
          filters={filters}
          onChange={setFilters}
          outcomeCounts={outcomeCounts}
        />
      </div>

      {/* Call list */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-5 w-24" />
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filteredCalls.length === 0 ? (
        <EmptyState
          icon={Phone}
          title={filters.search || filters.outcome !== "all" ? "No matching calls" : "No calls yet"}
          description={
            filters.search || filters.outcome !== "all"
              ? "Try adjusting your filters to find what you're looking for."
              : "When your AI handles calls, they'll appear here with full transcripts and extracted data."
          }
        />
      ) : (
        <div className="space-y-6">
          {groupedCalls.map(group => (
            <div key={group.date.toISOString()}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {group.label}
              </h3>
              <div className="space-y-3">
                {group.calls.map(call => (
                  <CallListCard
                    key={call.id}
                    call={call}
                    customerName={getCustomerName(call)}
                    onClick={() => handleSelectCall(call)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Load more */}
          {totalCount >= limit && (
            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={loadMore}>
                Load More
              </Button>
              <span className="text-sm text-muted-foreground">
                Showing {filteredCalls.length} of {totalCount}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Call Detail Slide-over */}
      <CallDetailPanel
        call={selectedCall}
        onClose={handleCloseDetail}
        customerName={selectedCall ? getCustomerName(selectedCall) : undefined}
      />
    </PageContainer>
  );
}
