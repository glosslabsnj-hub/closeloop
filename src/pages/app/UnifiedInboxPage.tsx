import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLeads } from "@/hooks/useLeads";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { computeCallPriority } from "@/lib/priorityScoring";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Phone, Users, Search, Loader2, Plus } from "lucide-react";
import { InboxCallCard } from "@/components/calls/InboxCallCard";
import { CallDetailPanel } from "@/components/calls/CallDetailPanel";
import { LeadCard } from "@/components/leads/LeadCard";
import { LeadDetailPanel } from "@/components/leads/LeadDetailPanel";
import { CreateLeadDialog } from "@/components/leads/CreateLeadDialog";
import { CreateBookingDialog } from "@/components/calendar/CreateBookingDialog";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

type TabValue = "calls" | "leads";
type LeadSubFilter = "hot" | "followup" | "closed";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  // Tab state
  const isValidTab = (t: string | null): t is TabValue =>
    t === "calls" || t === "leads";
  const [activeTab, setActiveTab] = useState<TabValue>(
    isValidTab(tabParam) ? tabParam : "leads"
  );

  // Lead sub-filter
  const [leadSubFilter, setLeadSubFilter] = useState<LeadSubFilter>("hot");

  // Search and filter
  const [searchQuery, setSearchQuery] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("all");

  // Selected call/lead for detail panels
  const [selectedCall, setSelectedCall] = useState<CallSession | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Lead action dialogs
  const [createLeadDialogOpen, setCreateLeadDialogOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [bookingLeadName, setBookingLeadName] = useState("");
  const [bookingLeadPhone, setBookingLeadPhone] = useState("");

  // Leads hook with mutations
  const { leads, isLoading: leadsLoading, stats: leadStats, convertToCustomer, markAsLost } = useLeads();

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
        .limit(100);
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

  // Filter and sort calls
  const filteredCalls = useMemo(() => {
    if (!calls) return [];
    return calls
      .filter((call) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = !query ||
          call.caller_phone?.toLowerCase().includes(query) ||
          call.summary?.toLowerCase().includes(query) ||
          getCustomerName(call).toLowerCase().includes(query);

        let matchesOutcome = true;
        if (outcomeFilter === "high_priority") {
          matchesOutcome = getCallPriority(call).level === "high";
        } else if (outcomeFilter !== "all") {
          matchesOutcome = call.outcome === outcomeFilter;
        }

        return matchesSearch && matchesOutcome;
      })
      .sort((a, b) => {
        const aPriority = getCallPriority(a);
        const bPriority = getCallPriority(b);
        if (bPriority.score !== aPriority.score) return bPriority.score - aPriority.score;
        return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
      });
  }, [calls, searchQuery, outcomeFilter, config.priority]);

  // Sub-filtered leads
  const { hotLeads, followUpLeads, closedLeads } = useMemo(() => {
    const hot = leads.filter((l) => l.status === "new" && l.phone);
    const followUp = leads.filter((l) => l.status === "contacted" || l.status === "qualified");
    const closed = leads.filter((l) => l.status === "won" || l.status === "lost" || l.status === "booked");
    return { hotLeads: hot, followUpLeads: followUp, closedLeads: closed };
  }, [leads]);

  const activeLeadsList = useMemo(() => {
    const list = leadSubFilter === "hot" ? hotLeads : leadSubFilter === "followup" ? followUpLeads : closedLeads;
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((lead) =>
      lead.full_name.toLowerCase().includes(q) ||
      lead.phone?.includes(q) ||
      lead.email?.toLowerCase().includes(q)
    );
  }, [leadSubFilter, hotLeads, followUpLeads, closedLeads, searchQuery]);

  // Count unread/new items
  const newCallsCount = calls?.filter((c) => !c.outcome || c.outcome === "followup").length || 0;
  const newLeadsCount = leadStats?.new || 0;

  const handleTabChange = (value: string) => {
    if (isValidTab(value)) {
      setActiveTab(value);
      setSearchQuery("");
      setOutcomeFilter("all");
    }
  };

  const handleBookAppointment = (lead: { full_name: string; phone: string | null }) => {
    setBookingLeadName(lead.full_name);
    setBookingLeadPhone(lead.phone || "");
    setBookingDialogOpen(true);
  };

  const handleSendMessage = () => {
    toast.info("SMS messaging coming soon");
  };

  const handleConvertToCustomer = (lead: Lead) => {
    convertToCustomer.mutate(lead, {
      onSuccess: () => setSelectedLead(null),
    });
  };

  const handleMarkAsLost = (lead: Lead) => {
    markAsLost.mutate(lead.id, {
      onSuccess: () => setSelectedLead(null),
    });
  };

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        icon={<Users className="h-5 w-5" />}
        title="Leads"
        description="Every customer interaction, organized."
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList>
            <TabsTrigger value="leads" className="gap-2">
              <Users className="h-4 w-4" />
              Leads
              {newLeadsCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {newLeadsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="calls" className="gap-2">
              <Phone className="h-4 w-4" />
              Calls
              {newCallsCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {newCallsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {activeTab === "leads" && (
              <Button size="sm" variant="outline" onClick={() => setCreateLeadDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Lead
              </Button>
            )}
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
                  <SelectItem value="high_priority">High Priority</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="followup">Follow-up</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <TabsContent value="calls" className="mt-6">
          {callsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCalls.length === 0 ? (
            <EmptyState
              icon={Phone}
              title="No messages yet"
              description="When customers text or call, their conversations will appear here."
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

        <TabsContent value="leads" className="mt-6 space-y-4">
          {/* Lead sub-filter tabs */}
          <div className="flex gap-2">
            {([
              { key: "hot" as const, label: "Hot", count: hotLeads.length },
              { key: "followup" as const, label: "Follow-up", count: followUpLeads.length },
              { key: "closed" as const, label: "Closed", count: closedLeads.length },
            ]).map((tab) => (
              <Button
                key={tab.key}
                variant={leadSubFilter === tab.key ? "default" : "outline"}
                size="sm"
                onClick={() => setLeadSubFilter(tab.key)}
                className="gap-1.5"
              >
                {tab.label}
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 text-xs"
                >
                  {tab.count}
                </Badge>
              </Button>
            ))}
          </div>

          {leadsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : activeLeadsList.length === 0 ? (
            <EmptyState
              icon={Users}
              title={leadSubFilter === "hot" ? "No hot leads" : leadSubFilter === "followup" ? "No follow-ups" : "No closed leads"}
              description={
                leadSubFilter === "hot"
                  ? "New leads with contact info will appear here."
                  : leadSubFilter === "followup"
                  ? "Leads you've contacted or qualified show up here."
                  : "Won and lost leads are archived here."
              }
              action={leadSubFilter === "hot" ? {
                label: "Add Lead",
                onClick: () => setCreateLeadDialogOpen(true),
              } : undefined}
            />
          ) : (
            <div className="space-y-3">
              {activeLeadsList.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onClick={() => setSelectedLead(lead)}
                  onBookAppointment={handleBookAppointment}
                  onSendMessage={handleSendMessage}
                  onConvertToCustomer={handleConvertToCustomer}
                  onMarkAsLost={handleMarkAsLost}
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

      {/* Lead Detail Slide-over */}
      <LeadDetailPanel
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onBookAppointment={(lead) => {
          setSelectedLead(null);
          handleBookAppointment({ full_name: lead.full_name, phone: lead.phone });
        }}
        onConvertToCustomer={handleConvertToCustomer}
        onMarkAsLost={handleMarkAsLost}
      />

      {/* Lead action dialogs */}
      <CreateLeadDialog
        open={createLeadDialogOpen}
        onOpenChange={setCreateLeadDialogOpen}
      />
      <CreateBookingDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        initialCustomerName={bookingLeadName}
        initialCustomerPhone={bookingLeadPhone}
      />
    </PageContainer>
  );
}
