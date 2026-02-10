 import { useState, useEffect, useMemo } from "react";
 import { useSearchParams } from "react-router-dom";
 import { useQuery, useQueryClient } from "@tanstack/react-query";
 import { useAuth } from "@/contexts/AuthContext";
 import { supabase } from "@/integrations/supabase/client";
 import { useLeads } from "@/hooks/useLeads";
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
 import { Phone, Users, Search, Inbox, Loader2 } from "lucide-react";
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
 
       <Tabs value={activeTab} onValueChange={handleTabChange}>
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
           <TabsList>
             <TabsTrigger value="calls" className="gap-2">
               <Phone className="h-4 w-4" />
               Calls
               {newCallsCount > 0 && (
                 <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                   {newCallsCount}
                 </Badge>
               )}
             </TabsTrigger>
             <TabsTrigger value="leads" className="gap-2">
               <Users className="h-4 w-4" />
               Leads
               {newLeadsCount > 0 && (
                 <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                   {newLeadsCount}
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
                 <SelectTrigger className="w-32">
                   <SelectValue placeholder="Outcome" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All</SelectItem>
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
           )}
         </TabsContent>
 
         <TabsContent value="leads" className="mt-6">
           {leadsLoading ? (
             <div className="flex items-center justify-center py-12">
               <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
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
