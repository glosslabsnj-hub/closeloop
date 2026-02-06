import { useMemo, useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Phone, Search, Filter, Download, Loader2 } from "lucide-react";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import { CallListCard } from "./CallListCard";
import { CallDetailPanel } from "./CallDetailPanel";
import { cn } from "@/lib/utils";

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

type OutcomeFilter = "all" | "booked" | "answered" | "lost" | "message" | "escalated";

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

const OUTCOME_FILTERS: { value: OutcomeFilter; label: string; count?: number }[] = [
  { value: "all", label: "All" },
  { value: "booked", label: "Booked" },
  { value: "answered", label: "Questions" },
  { value: "lost", label: "Missed" },
  { value: "message", label: "Voicemail" },
];

export function CallsListView() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("all");
  const [selectedCall, setSelectedCall] = useState<CallSession | null>(null);
  const [limit, setLimit] = useState(25);

  // Handle URL params for direct call opening
  useEffect(() => {
    const callId = searchParams.get("call");
    if (callId && !selectedCall) {
      // Will be handled after data loads
    }
  }, [searchParams]);

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

  // Filter and group calls
  const { filteredCalls, groupedCalls, outcomeCounts } = useMemo(() => {
    if (!calls) return { filteredCalls: [], groupedCalls: [], outcomeCounts: {} as Record<string, number> };
    
    // Count outcomes
    const counts: Record<string, number> = { all: calls.length };
    calls.forEach(call => {
      const outcome = call.outcome || "pending";
      counts[outcome] = (counts[outcome] || 0) + 1;
    });

    // Filter
    let filtered = calls;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(call =>
        call.caller_phone?.toLowerCase().includes(query) ||
        call.summary?.toLowerCase().includes(query) ||
        getCustomerName(call).toLowerCase().includes(query)
      );
    }
    if (outcomeFilter !== "all") {
      filtered = filtered.filter(call => call.outcome === outcomeFilter);
    }

    // Group by date
    const groups: Record<string, CallSession[]> = {};
    filtered.forEach(call => {
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
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    return { filteredCalls: filtered, groupedCalls: grouped, outcomeCounts: counts };
  }, [calls, searchQuery, outcomeFilter]);

  const handleSelectCall = useCallback((call: CallSession) => {
    setSelectedCall(call);
    setSearchParams({ call: call.id }, { replace: true });
  }, [setSearchParams]);

  const handleCloseDetail = useCallback(() => {
    setSelectedCall(null);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const loadMore = useCallback(() => {
    setLimit(prev => prev + 25);
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
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Outcome tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 -mb-1">
          {OUTCOME_FILTERS.map(filter => (
            <Button
              key={filter.value}
              variant={outcomeFilter === filter.value ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-8 shrink-0",
                outcomeFilter === filter.value ? "" : "text-muted-foreground"
              )}
              onClick={() => setOutcomeFilter(filter.value)}
            >
              {filter.label}
              {outcomeCounts[filter.value] !== undefined && outcomeCounts[filter.value] > 0 && (
                <Badge variant="secondary" size="sm" className="ml-1.5">
                  {outcomeCounts[filter.value]}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search calls..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
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
          title="No calls yet"
          description="When your AI handles calls, they'll appear here with full transcripts and extracted data."
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
