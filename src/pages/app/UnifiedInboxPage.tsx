 import { useState, useEffect, useMemo } from "react";
 import { useSearchParams } from "react-router-dom";
 import { useQuery, useQueryClient } from "@tanstack/react-query";
 import { useAuth } from "@/contexts/AuthContext";
 import { supabase } from "@/integrations/supabase/client";
 import { useLeads } from "@/hooks/useLeads";
 import { PageContainer } from "@/components/layout/PageContainer";
 import { PageHeader } from "@/components/layout/PageHeader";
 import { FilterBar } from "@/components/patterns/FilterBar";
 import { ContentLoadingState } from "@/components/patterns/ContentLoadingState";
 import { EmptyState } from "@/components/ui/empty-state";
 import { Phone, Users, Inbox } from "lucide-react";
 import { InboxCallCard } from "@/components/calls/InboxCallCard";
 import { CallDetailPanel } from "@/components/calls/CallDetailPanel";
 import { LeadCard } from "@/components/leads/LeadCard";

 type TabValue = "calls" | "leads";

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
   const [searchParams, setSearchParams] = useSearchParams();
   const tabParam = searchParams.get("tab");

   // Tab state
   const isValidTab = (t: string | null): t is TabValue =>
     t === "calls" || t === "leads";
   const [activeTab, setActiveTab] = useState<TabValue>(
     isValidTab(tabParam) ? tabParam : "calls"
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

   // Leads
   const { leads, isLoading: leadsLoading, stats: leadStats } = useLeads();

   // Filter calls
   const filteredCalls = useMemo(() => {
     if (!calls) return [];
     return calls.filter((call) => {
       const query = searchQuery.toLowerCase();
       const matchesSearch = !query ||
         call.caller_phone?.toLowerCase().includes(query) ||
         call.summary?.toLowerCase().includes(query) ||
         getCustomerName(call).toLowerCase().includes(query);
       const matchesOutcome = outcomeFilter === "all" || call.outcome === outcomeFilter;
       return matchesSearch && matchesOutcome;
     });
   }, [calls, searchQuery, outcomeFilter]);

   // Filter leads
   const filteredLeads = useMemo(() => {
     if (!leads) return [];
     const query = searchQuery.toLowerCase();
     return leads.filter((lead) => {
       const matchesSearch = !query ||
         lead.full_name.toLowerCase().includes(query) ||
         lead.phone?.includes(query) ||
         lead.email?.toLowerCase().includes(query);
       return matchesSearch;
     });
   }, [leads, searchQuery]);

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

   return (
     <PageContainer maxWidth="xl">
       <PageHeader
         icon={<Inbox className="h-5 w-5" />}
         title="Inbox"
         description="All your calls and leads in one place."
       />

       <div className="space-y-6 mt-6">
         <FilterBar
           tabs={[
             { value: "calls", label: "Calls", icon: Phone, count: newCallsCount || undefined },
             { value: "leads", label: "Leads", icon: Users, count: newLeadsCount || undefined },
           ]}
           activeTab={activeTab}
           onTabChange={handleTabChange}
           searchValue={searchQuery}
           onSearchChange={setSearchQuery}
           searchPlaceholder={activeTab === "calls" ? "Search calls..." : "Search leads..."}
           filters={
             activeTab === "calls"
               ? [
                   {
                     key: "outcome",
                     label: "Outcome",
                     options: [
                       { value: "all", label: "All" },
                       { value: "booked", label: "Booked" },
                       { value: "followup", label: "Follow-up" },
                       { value: "lost", label: "Lost" },
                       { value: "escalated", label: "Escalated" },
                     ],
                     value: outcomeFilter,
                     onChange: setOutcomeFilter,
                   },
                 ]
               : []
           }
         />

         {/* Content */}
         {activeTab === "calls" ? (
           callsLoading ? (
             <ContentLoadingState variant="list" count={6} />
           ) : filteredCalls.length === 0 ? (
              <EmptyState
                icon={Phone}
                title="No messages yet"
                description="When customers text or call, their conversations will appear here."
              />
           ) : (
             <div className="space-y-3">
               {filteredCalls.map((call) => (
                 <InboxCallCard
                   key={call.id}
                   call={call}
                   customerName={getCustomerName(call)}
                   onClick={() => setSelectedCall(call)}
                 />
               ))}
             </div>
           )
         ) : (
           leadsLoading ? (
             <ContentLoadingState variant="list" count={6} />
           ) : filteredLeads.length === 0 ? (
             <EmptyState
               icon={Users}
               title="No leads yet"
               description="Leads captured from calls and messages will appear here."
             />
           ) : (
             <div className="space-y-3">
               {filteredLeads.map((lead) => (
                 <LeadCard key={lead.id} lead={lead} />
               ))}
             </div>
           )
         )}
       </div>

       {/* Call Detail Slide-over */}
       <CallDetailPanel
         call={selectedCall}
         onClose={() => setSelectedCall(null)}
         customerName={selectedCall ? getCustomerName(selectedCall) : undefined}
       />
     </PageContainer>
   );
 }
