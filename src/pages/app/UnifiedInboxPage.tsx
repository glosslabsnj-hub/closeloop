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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Users, Search, Loader2, MoreHorizontal, Flame, Thermometer, Snowflake, AlertTriangle } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useTerminology } from "@/hooks/useTerminology";
import { InboxCallCard } from "@/components/calls/InboxCallCard";
import { CallDetailPanel } from "@/components/calls/CallDetailPanel";
import { PipelineSummaryBar, type PipelineStage } from "@/components/leads/PipelineSummaryBar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

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
  followup_status?: string | null;
  customer?: {
    id: string;
    full_name: string;
    phone_e164: string;
  } | null;
}

// Helper to extract customer name from call data
// Priority: per-call extracted name > customer record > context fallback
function getCustomerName(call: CallSession): string {
  // 1. Best source: extracted_payload.customer.name (per-call, from AI extraction)
  const payload = call.extracted_payload;
  if (payload) {
    const customer = payload.customer as Record<string, unknown> | undefined;
    if (customer && typeof customer.name === "string" && customer.name && customer.name !== "Unknown") {
      return customer.name;
    }
    // Flat fallback
    const flatName = payload.customer_name || payload.name;
    if (typeof flatName === "string" && flatName && flatName !== "Unknown") return flatName;
  }

  // 2. context_json.customer_name — may be a string or an object with .value
  const ctx = call.context_json;
  if (ctx) {
    const raw = ctx.customer_name;
    if (typeof raw === "string" && raw && raw !== "Unknown") return raw;
    if (raw && typeof raw === "object" && (raw as Record<string, unknown>).value) {
      const val = (raw as Record<string, unknown>).value;
      if (typeof val === "string" && val && val !== "Unknown") return val;
    }
    const fallback = ctx.name || ctx.caller_name;
    if (typeof fallback === "string" && fallback && fallback !== "Unknown") return fallback;
  }

  // 3. Customer record from DB (may be stale for shared phone numbers)
  if (call.customer?.full_name && call.customer.full_name !== "Unknown") {
    return call.customer.full_name;
  }

  return "Unknown Caller";
}

function getLeadStage(call: CallSession): PipelineStage {
  if (call.outcome === "booked") return "won";
  if (call.outcome === "lost") return "lost";
  const status = call.followup_status;
  if (status === "contacted") return "contacted";
  if (status === "quoted") return "quoted";
  if (status === "won") return "won";
  if (status === "lost") return "lost";
  return "new";
}

function getLeadTemperature(call: CallSession): "hot" | "warm" | "cold" {
  const hoursSince = (Date.now() - new Date(call.started_at).getTime()) / (1000 * 60 * 60);
  if (call.outcome === "booked" || call.outcome === "dispatch") return "hot";
  if (hoursSince <= 24 && call.outcome !== "lost") return "hot";
  if (call.outcome === "followup" || call.outcome === "lead_captured") {
    return hoursSince <= 72 ? "warm" : "cold";
  }
  if (hoursSince <= 72) return "warm";
  return "cold";
}

const tempConfig = {
  hot: { icon: Flame, color: "text-red-500", bg: "bg-red-500/10" },
  warm: { icon: Thermometer, color: "text-amber-500", bg: "bg-amber-500/10" },
  cold: { icon: Snowflake, color: "text-sky-500", bg: "bg-sky-500/10" },
};

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
  const [pipelineStage, setPipelineStage] = useState<PipelineStage | "all">("all");
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
          customer_id, followup_status, customer:customers!ai_call_sessions_customer_id_fkey (id, full_name, phone_e164)
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

  // Leads: lead-worthy outcomes
  const allLeads = useMemo(() => {
    if (!calls) return [];
    return calls.filter((call) => call.outcome && LEAD_OUTCOMES.has(call.outcome));
  }, [calls]);

  // Pipeline counts
  const pipelineCounts = useMemo(() => {
    const counts: Record<PipelineStage, number> = { new: 0, contacted: 0, quoted: 0, won: 0, lost: 0 };
    for (const lead of allLeads) {
      counts[getLeadStage(lead)]++;
    }
    return counts;
  }, [allLeads]);

  // Filtered leads with pipeline + search
  const filteredLeads = useMemo(() => {
    return allLeads
      .filter((call) => {
        if (pipelineStage !== "all" && getLeadStage(call) !== pipelineStage) return false;
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
  }, [allLeads, pipelineStage, searchQuery, config.priority]);

  // Calls: chronological log
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
  }, [calls, searchQuery, outcomeFilter]);

  // Counts
  const leadsCount = allLeads.length;
  const totalCallsCount = calls?.length || 0;

  const handleTabChange = (value: string) => {
    if (isValidTab(value)) {
      setActiveTab(value);
      setSearchQuery("");
      setOutcomeFilter("all");
      setPipelineStage("all");
    }
  };

  const handleStageChange = async (callId: string, newStage: PipelineStage) => {
    let followup_status: string | null = newStage;
    let outcome: string | undefined;

    if (newStage === "won") { outcome = "booked"; followup_status = "won"; }
    else if (newStage === "lost") { outcome = "lost"; followup_status = "lost"; }
    else if (newStage === "new") { followup_status = null; }

    const updateData: Record<string, unknown> = { followup_status };
    if (outcome) updateData.outcome = outcome;

    const { error } = await supabase
      .from("ai_call_sessions")
      .update(updateData)
      .eq("id", callId);

    if (error) {
      toast.error("Failed to update lead stage");
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["inbox_calls", tenant?.id] });
    toast.success(`Lead moved to ${newStage}`);
  };

  if (!callsLoading && !calls) {
    return (
      <PageContainer maxWidth="xl">
        <PageHeader title={terms.inboxPageTitle} description={terms.inboxPageSubtitle} />
        <div className="mx-auto max-w-lg py-16">
          <Card className="border-border/30">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold">Something went wrong</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                We couldn't load your inbox. Please refresh the page or try again later.
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>Refresh Page</Button>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title={terms.inboxPageTitle}
        description={terms.inboxPageSubtitle}
      />

      <ErrorBoundary>
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

        {/* LEADS TAB: Pipeline summary bar + professional table */}
        <TabsContent value="leads" className="mt-6 space-y-4">
          {callsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : allLeads.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No leads yet"
              description="When callers express interest or request follow-ups, they'll appear here in your pipeline."
            />
          ) : (
            <>
              {/* Pipeline summary bar */}
              <div className="overflow-x-auto">
                <PipelineSummaryBar
                  counts={pipelineCounts}
                  activeStage={pipelineStage}
                  onStageClick={setPipelineStage}
                />
              </div>

              {/* Professional leads table */}
              {filteredLeads.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No leads in this stage"
                  description="Try selecting a different pipeline stage."
                  compact
                />
              ) : (
                <div className="rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm overflow-hidden card-interactive">
                  <Table>
                    <TableHeader className="bg-card/80">
                      <TableRow>
                        <TableHead>Contact</TableHead>
                        <TableHead>Temperature</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead className="hidden md:table-cell">Summary</TableHead>
                        <TableHead className="hidden sm:table-cell">Last Activity</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((call) => {
                        const name = getCustomerName(call);
                        const temp = getLeadTemperature(call);
                        const TempIcon = tempConfig[temp].icon;
                        const stage = getLeadStage(call);

                        return (
                          <TableRow
                            key={call.id}
                            className="cursor-pointer hover:bg-card/90 hover:shadow-sm transition-all"
                            onClick={() => setSelectedCall(call)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
                                  tempConfig[temp].bg, tempConfig[temp].color
                                )}>
                                  {name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{name}</p>
                                  <p className="text-xs text-muted-foreground">{call.caller_phone || "No phone"}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("gap-1 text-xs", tempConfig[temp].bg, tempConfig[temp].color)}>
                                <TempIcon className="h-3 w-3" />
                                {temp.charAt(0).toUpperCase() + temp.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={stage}
                                onValueChange={(val) => {
                                  handleStageChange(call.id, val as PipelineStage);
                                }}
                              >
                                <SelectTrigger className="h-7 w-28 text-xs border-border/30" onClick={(e) => e.stopPropagation()}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="new">New</SelectItem>
                                  <SelectItem value="contacted">Contacted</SelectItem>
                                  <SelectItem value="quoted">Quoted</SelectItem>
                                  <SelectItem value="won">Won</SelectItem>
                                  <SelectItem value="lost">Lost</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="hidden md:table-cell max-w-[250px]">
                              <p className="text-sm text-muted-foreground truncate">
                                {call.summary || "No summary"}
                              </p>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon-sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {call.caller_phone && (
                                    <DropdownMenuItem onClick={() => window.open(`tel:${call.caller_phone}`, "_self")}>
                                      <Phone className="mr-2 h-4 w-4" /> Call
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => setSelectedCall(call)}>
                                    <Users className="mr-2 h-4 w-4" /> View Details
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center">
                {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""}
              </p>
            </>
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
            <div className="divide-y divide-border/20 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30">
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
      </ErrorBoundary>

      {/* Call Detail Slide-over */}
      <CallDetailPanel
        call={selectedCall}
        onClose={() => setSelectedCall(null)}
        customerName={selectedCall ? getCustomerName(selectedCall) : undefined}
      />
    </PageContainer>
  );
}
