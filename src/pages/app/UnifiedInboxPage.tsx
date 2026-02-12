import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { useCapabilities } from "@/hooks/useCapabilities";
import { computeCallPriority } from "@/lib/priorityScoring";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, Users, Search, Loader2 } from "lucide-react";
import { useTerminology } from "@/hooks/useTerminology";
import { InboxCallCard } from "@/components/calls/InboxCallCard";
import { CallDetailPanel } from "@/components/calls/CallDetailPanel";

type TabValue = "calls" | "leads";

/** Outcomes that represent an actual lead / opportunity */
const LEAD_OUTCOMES = new Set(["followup", "lead_captured", "dispatch", "escalated", "booked", "order", "message"]);

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

export default function UnifiedInboxPage() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const { config } = useIndustryContext();
  const terms = useTerminology();
  const caps = useCapabilities();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  // Tab state
  const isValidTab = (t: string | null): t is TabValue =>
    t === "calls" || t === "leads";
  const defaultTab: TabValue = caps.isDispatchBusiness ? "calls" : "leads";
  const [activeTab, setActiveTab] = useState<TabValue>(
    isValidTab(tabParam) ? tabParam : defaultTab
  );

  // Search and filter
  const [searchQuery, setSearchQuery] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("all");

  // Selected call for detail panel
  const [selectedCall, setSelectedCall] = useState<CallSession | null>(null);

  // Sync URL with tab state
  useEffect(() => {
    if (tabParam !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [activeTab, tabParam, setSearchParams]);

  useEffect(() => {
    if (isValidTab(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Realtime subscription for calls
  useEffect(() => {
    if (!tenant?.id) return;
    const channel = supabase
      .channel("inbox-calls-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ai_call_sessions", filter: `tenant_id=eq.${tenant.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["inbox_calls", tenant.id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenant?.id, queryClient]);

  // Fetch calls
  const { data: calls, isLoading: callsLoading } = useQuery({
    queryKey: ["inbox_calls", tenant?.id],
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
        .limit(200);
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

  // Helper: compute priority for a call
  const getCallPriority = (call: CallSession) => {
    const callbackRequested = !!(
      call.extracted_payload &&
      typeof call.extracted_payload === "object" &&
      (call.extracted_payload as Record<string, unknown>).callback &&
      typeof (call.extracted_payload as Record<string, unknown>).callback === "object" &&
      ((call.extracted_payload as Record<string, unknown>).callback as Record<string, unknown>)?.requested
    );
    return computeCallPriority(
      { outcome: call.outcome, started_at: call.started_at, callbackRequested },
      config.priority,
    );
  };

  // ---- LEADS: call sessions with lead-worthy outcomes, priority-sorted ----
  const filteredLeads = useMemo(() => {
    if (!calls) return [];
    return calls
      .filter((call) => {
        // Must have a lead-worthy outcome
        if (!call.outcome || !LEAD_OUTCOMES.has(call.outcome)) return false;

        const query = searchQuery.toLowerCase();
        if (!query) return true;
        return (
          call.caller_phone?.toLowerCase().includes(query) ||
          call.summary?.toLowerCase().includes(query) ||
          getCustomerName(call).toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const aPriority = getCallPriority(a);
        const bPriority = getCallPriority(b);
        if (bPriority.score !== aPriority.score) return bPriority.score - aPriority.score;
        return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
      });
  }, [calls, searchQuery, config.priority]);

  // ---- CALLS: simple chronological log, optional outcome filter ----
  const filteredCalls = useMemo(() => {
    if (!calls) return [];
    return calls.filter((call) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = !query ||
        call.caller_phone?.toLowerCase().includes(query) ||
        call.summary?.toLowerCase().includes(query) ||
        getCustomerName(call).toLowerCase().includes(query);

      let matchesOutcome = true;
      if (outcomeFilter !== "all") {
        matchesOutcome = call.outcome === outcomeFilter;
      }

      return matchesSearch && matchesOutcome;
    });
    // Already sorted by started_at DESC from the query
  }, [calls, searchQuery, outcomeFilter]);

  // Counts
  const leadsCount = calls?.filter((c) => c.outcome && LEAD_OUTCOMES.has(c.outcome)).length || 0;
  const totalCallsCount = calls?.length || 0;

  const handleTabChange = (value: string) => {
    if (isValidTab(value)) {
      setActiveTab(value);
      setSearchQuery("");
      setOutcomeFilter("all");
    }
  };

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        icon={terms.inboxPageTitle === "Call Log" ? <Phone className="h-5 w-5" /> : <Users className="h-5 w-5" />}
        title={terms.inboxPageTitle}
        description={terms.inboxPageSubtitle}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList>
            <TabsTrigger value="leads" className="gap-2">
              <Users className="h-4 w-4" />
              Leads
              {leadsCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {leadsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="calls" className="gap-2">
              <Phone className="h-4 w-4" />
              Calls
              {totalCallsCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {totalCallsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {activeTab === "calls" && (
              <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="followup">Follow-up</SelectItem>
                  <SelectItem value="lead_captured">Lead</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* LEADS TAB: lead-worthy calls, priority-sorted */}
        <TabsContent value="leads" className="mt-6">
          {callsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No leads yet"
              description="When callers express interest or request follow-ups, they'll appear here prioritized."
            />
          ) : (
            <div className="divide-y divide-border/20 rounded-2xl bg-card">
              {filteredLeads.map((call) => (
                <InboxCallCard
                  key={call.id}
                  call={call}
                  customerName={getCustomerName(call)}
                  onClick={() => setSelectedCall(call)}
                  priorityConfig={config.priority}
                  inboxConfig={config.inbox}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* CALLS TAB: simple chronological call log */}
        <TabsContent value="calls" className="mt-6">
          {callsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCalls.length === 0 ? (
            <EmptyState
              icon={Phone}
              title="No calls yet"
              description="All incoming and outgoing calls will appear here."
            />
          ) : (
            <div className="divide-y divide-border/20 rounded-2xl bg-card">
              {filteredCalls.map((call) => (
                <InboxCallCard
                  key={call.id}
                  call={call}
                  customerName={getCustomerName(call)}
                  onClick={() => setSelectedCall(call)}
                  priorityConfig={config.priority}
                  inboxConfig={config.inbox}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Call Detail Slide-over */}
      <CallDetailPanel
        call={selectedCall}
        onClose={() => setSelectedCall(null)}
        customerName={selectedCall ? getCustomerName(selectedCall) : undefined}
      />
    </PageContainer>
  );
}
