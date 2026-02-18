import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Search, Pencil, Loader2, ExternalLink, AlertTriangle, Flame, Thermometer, Snowflake, Clock } from "lucide-react";
import { format } from "date-fns";
import { CallEditDialog } from "@/components/calls/CallEditDialog";
import { CallCard } from "@/components/calls/CallCard";
import { useToast } from "@/hooks/use-toast";
import { ModuleUnavailablePage } from "@/components/shared/ModuleUnavailablePage";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "react-router-dom";
import type { Json } from "@/integrations/supabase/types";

interface CallSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  caller_phone: string | null;
  call_direction: "inbound" | "outbound";
  outcome: string | null;
  summary: string | null;
  context_json: Record<string, unknown> | null;
  extracted_payload: Record<string, unknown> | null;
  customer_id: string | null;
  lead_score: "hot" | "warm" | "cool" | null;
  followup_status: "new" | "called_back" | "no_answer" | "completed" | "lost" | null;
  customer?: {
    id: string;
    full_name: string;
    phone_e164: string;
  } | null;
}

type LeadFilter = "all" | "hot" | "needs_followup" | "completed";
type CallStatus = "booked" | "thinking" | "no_book" | "order" | "dispatch";

export default function CallsPage() {
  // P0-3: Route protection - redirect if ai_voice module not enabled
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["ai_voice"]);
  const isMobile = useIsMobile();
  
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [leadFilter, setLeadFilter] = useState<LeadFilter>("all");
  const [editingCall, setEditingCall] = useState<CallSession | null>(null);

  // Realtime subscription for instant updates when webhook processes calls
  useEffect(() => {
    if (!tenant?.id) return;
    
    const channel = supabase
      .channel('calls-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_call_sessions', filter: `tenant_id=eq.${tenant.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ai_call_sessions', tenant.id] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, queryClient]);

  const { data: calls, isLoading } = useQuery({
    queryKey: ["ai_call_sessions", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      
      // Fetch calls with linked customer data
      const { data, error } = await supabase
        .from("ai_call_sessions")
        .select(`
          id,
          started_at,
          ended_at,
          caller_phone,
          call_direction,
          outcome,
          summary,
          context_json,
          extracted_payload,
          customer_id,
          lead_score,
          followup_status,
          customer:customers!ai_call_sessions_customer_id_fkey (
            id,
            full_name,
            phone_e164
          )
        `)
        .eq("tenant_id", tenant.id)
        .order("started_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Transform the data to match our interface
      return (data || []).map(row => ({
        ...row,
        context_json: row.context_json as Record<string, unknown> | null,
        extracted_payload: row.extracted_payload as Record<string, unknown> | null,
        customer: Array.isArray(row.customer) ? row.customer[0] : row.customer,
      })) as CallSession[];
    },
    enabled: !!tenant?.id,
  });

  const updateCallMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { outcome: string | null; summary: string | null; context_json: Record<string, unknown> } }) => {
      const { error } = await supabase
        .from("ai_call_sessions")
        .update({
          outcome: updates.outcome as "booked" | "escalated" | "followup" | "lost" | null,
          summary: updates.summary,
          context_json: updates.context_json as unknown as Json,
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai_call_sessions", tenant?.id] });
      toast({ title: "Call updated", description: "Changes saved successfully." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateFollowupMutation = useMutation({
    mutationFn: async ({ id, followup_status }: { id: string; followup_status: string }) => {
      const { error } = await supabase
        .from("ai_call_sessions")
        .update({ followup_status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai_call_sessions", tenant?.id] });
      toast({ title: "Status updated" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // De-duplicate by phone number - show only the latest call per phone
  const deduplicatedCalls = calls ? deduplicateByPhone(calls) : [];

  // Sort: hot first, then warm, then cool; within each group, most recent first
  const sortedCalls = [...deduplicatedCalls].sort((a, b) => {
    const scoreOrder = { hot: 0, warm: 1, cool: 2 };
    const aScore = scoreOrder[a.lead_score || "warm"] ?? 1;
    const bScore = scoreOrder[b.lead_score || "warm"] ?? 1;
    if (aScore !== bScore) return aScore - bScore;
    return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
  });

  // Apply lead filter
  const leadFiltered = sortedCalls.filter(call => {
    if (leadFilter === "all") return true;
    if (leadFilter === "hot") return call.lead_score === "hot";
    if (leadFilter === "needs_followup") return call.followup_status === "new" || call.followup_status === "no_answer";
    if (leadFilter === "completed") return call.followup_status === "completed" || call.followup_status === "called_back";
    return true;
  });

  const filteredCalls = leadFiltered.filter(call => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const customerName = getCustomerName(call);
    const serviceRequested = getServiceRequested(call);
    return (
      call.caller_phone?.toLowerCase().includes(query) ||
      call.summary?.toLowerCase().includes(query) ||
      customerName.toLowerCase().includes(query) ||
      serviceRequested.toLowerCase().includes(query)
    );
  });

  const getCallStatus = (outcome: string | null): CallStatus => {
    switch (outcome) {
      case "booked":
        return "booked";
      case "order":
        return "order";
      case "dispatch":
        return "dispatch";
      case "followup":
      case "lead_captured":
      case "info_provided":
      case "message":
        return "thinking";
      case "lost":
      case "escalated":
      case "abandoned":
      default:
        return "no_book";
    }
  };

  const getStatusBadge = (status: CallStatus, outcome: string | null) => {
    switch (status) {
      case "booked":
        return (
          <Badge variant="success">
            Booked
          </Badge>
        );
      case "order":
        return (
          <Badge variant="success">
            Order
          </Badge>
        );
      case "dispatch":
        return (
          <Badge variant="success">
            Dispatch
          </Badge>
        );
      case "thinking":
        return (
          <Badge variant="warning">
            {outcome === "message" ? "Message" : outcome === "lead_captured" ? "Lead" : "Thinking"}
          </Badge>
        );
      case "no_book":
        return (
          <Badge variant="destructive">
            No Book
          </Badge>
        );
    }
  };

  // Module gating - show unavailable page if module not enabled
  if (moduleLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <ModuleUnavailablePage
        title="Calls Not Available"
        description="The Calls page requires Voice AI to be enabled for your account."
        moduleName="Voice AI"
      />
    );
  }

  const hotCount = deduplicatedCalls.filter(c => c.lead_score === "hot").length;
  const needsFollowupCount = deduplicatedCalls.filter(c => c.followup_status === "new" || c.followup_status === "no_answer").length;

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="Calls"
        description="All AI-handled calls with extracted information"
        badge={
          <Badge variant="muted" className="text-base px-3 py-1">
            {deduplicatedCalls.length} Contacts
          </Badge>
        }
      />

      {/* Info banner for calls awaiting data */}
      {deduplicatedCalls.some(c => !c.summary && !c.ended_at) && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-start gap-3">
          <Phone className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Some recent calls are still being processed</p>
            <p className="text-muted-foreground">
              Summaries and extracted details appear automatically after calls end.
            </p>
          </div>
        </div>
      )}

      {/* Filter tabs + search */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={leadFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setLeadFilter("all")}
          >
            All ({deduplicatedCalls.length})
          </Button>
          <Button
            variant={leadFilter === "hot" ? "default" : "outline"}
            size="sm"
            onClick={() => setLeadFilter("hot")}
            className={leadFilter !== "hot" && hotCount > 0 ? "border-destructive/50 text-destructive" : ""}
          >
            <Flame className="h-3.5 w-3.5 mr-1" />
            Hot ({hotCount})
          </Button>
          <Button
            variant={leadFilter === "needs_followup" ? "default" : "outline"}
            size="sm"
            onClick={() => setLeadFilter("needs_followup")}
          >
            Needs Follow-up ({needsFollowupCount})
          </Button>
          <Button
            variant={leadFilter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setLeadFilter("completed")}
          >
            Completed
          </Button>
        </div>
        <div className="relative max-w-md w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Calls List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredCalls && filteredCalls.length > 0 ? (
        <>
          {/* Mobile Card View */}
          {isMobile ? (
            <div className="space-y-3">
              {filteredCalls.map((call) => (
                <CallCard
                  key={call.id}
                  call={call}
                  onEdit={() => setEditingCall(call)}
                  customerName={getCustomerName(call)}
                  serviceRequested={getServiceRequested(call)}
                />
              ))}
            </div>
          ) : (
            /* Desktop Table View */
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[70px] text-center">Lead</TableHead>
                      <TableHead className="w-[160px]">Customer</TableHead>
                      <TableHead className="w-[100px]">Time</TableHead>
                      <TableHead className="w-[130px]">Phone</TableHead>
                      <TableHead className="w-[180px]">Service</TableHead>
                      <TableHead className="min-w-[200px]">AI Summary</TableHead>
                      <TableHead className="w-[120px] text-center">Follow-up</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCalls.map((call) => {
                      const customerName = getCustomerName(call);
                      const serviceRequested = getServiceRequested(call);
                      const extractedDetails = getExtractedDetails(call);
                      
                      return (
                        <TableRow key={call.id}>
                          <TableCell className="text-center">
                            {getLeadScoreBadge(call.lead_score)}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1">
                              {customerName}
                              {call.customer_id && (
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {getTimeSince(call.started_at)}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatPhone(call.caller_phone)}
                          </TableCell>
                          <TableCell>
                            {serviceRequested ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help">{serviceRequested}</span>
                                  </TooltipTrigger>
                                  {extractedDetails && (
                                    <TooltipContent className="max-w-xs">
                                      <pre className="text-xs whitespace-pre-wrap">
                                        {extractedDetails}
                                      </pre>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-muted-foreground italic">—</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[250px]">
                            {call.summary ? (
                              <span className="line-clamp-2 text-sm">{call.summary}</span>
                            ) : call.ended_at && isWebhookMissing(call.ended_at) ? (
                              <Link 
                                to={`/debug/ai-context?session=${call.id}`}
                                className="inline-flex items-center gap-1 text-warning hover:underline text-sm"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                <span>Processing delayed</span>
                              </Link>
                            ) : call.ended_at ? (
                              <span className="text-muted-foreground italic text-sm flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Processing...
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic text-sm">Awaiting...</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <select
                              value={call.followup_status || "new"}
                              onChange={(e) => updateFollowupMutation.mutate({ id: call.id, followup_status: e.target.value })}
                              className="text-xs border rounded px-2 py-1 bg-background text-foreground"
                            >
                              <option value="new">🆕 New</option>
                              <option value="called_back">📞 Called Back</option>
                              <option value="no_answer">📵 No Answer</option>
                              <option value="completed">✅ Completed</option>
                              <option value="lost">❌ Lost</option>
                            </select>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingCall(call)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Phone}
              title="No calls yet"
              description="When your AI assistant handles calls, they'll appear here with all extracted information."
              compact
            />
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      {editingCall && (
        <CallEditDialog
          open={!!editingCall}
          onOpenChange={(open) => !open && setEditingCall(null)}
          call={editingCall}
          onSave={async (updates) => {
            await updateCallMutation.mutateAsync({ id: editingCall.id, updates });
          }}
        />
      )}
    </PageContainer>
  );
}

// Helper functions

function getLeadScoreBadge(score: string | null) {
  switch (score) {
    case "hot":
      return <Badge variant="destructive" className="text-xs gap-1"><Flame className="h-3 w-3" />Hot</Badge>;
    case "cool":
      return <Badge variant="secondary" className="text-xs gap-1"><Snowflake className="h-3 w-3" />Cool</Badge>;
    case "warm":
    default:
      return <Badge variant="warning" className="text-xs gap-1"><Thermometer className="h-3 w-3" />Warm</Badge>;
  }
}

function getTimeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return format(new Date(dateStr), "MMM d");
}

function getCustomerName(call: CallSession): string {
  // Priority: linked customer record > context_json > extracted_payload > Unknown
  if (call.customer?.full_name && call.customer.full_name !== "Unknown") {
    return formatDisplayName(call.customer.full_name);
  }
  
  const contextJson = call.context_json;
  if (contextJson) {
    const nameVal = extractCleanValue(contextJson.customer_name) || 
      extractCleanValue(contextJson.name) || 
      extractCleanValue(contextJson.caller_name);
    if (nameVal && nameVal !== "Unknown" && !isGibberish(nameVal)) {
      return formatDisplayName(nameVal);
    }
  }
  
  const extractedPayload = call.extracted_payload;
  if (extractedPayload) {
    const nameVal = extractCleanValue(extractedPayload.customer_name);
    if (nameVal && !isGibberish(nameVal)) {
      return formatDisplayName(nameVal);
    }
  }
  
  return "Unknown caller";
}

// Helper to extract clean string values from potentially nested objects
// ElevenLabs may return { value: "actual", rationale: "...", ... } format
function extractCleanValue(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "string") return val || null;
  if (typeof val === "number") return String(val);
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if ("value" in obj) {
      return extractCleanValue(obj.value);
    }
  }
  return null;
}

// Clean up display name - capitalize properly, remove gibberish
function formatDisplayName(name: string): string {
  if (!name || name.length < 2) return "Unknown caller";
  // Remove common gibberish patterns
  const cleaned = name.replace(/^(a\s+)?completion.*$/i, "").trim();
  if (!cleaned) return "Unknown caller";
  // Capitalize each word
  return cleaned
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// Check if text looks like gibberish/transcription error
function isGibberish(text: string): boolean {
  if (!text) return true;
  const lower = text.toLowerCase();
  // Common transcription errors
  if (lower.includes("completion") || lower.includes("a completion")) return true;
  if (lower === "unknown" || lower === "null" || lower === "undefined") return true;
  if (text.length < 2) return true;
  return false;
}

function getServiceRequested(call: CallSession): string {
  const extractedPayload = call.extracted_payload;
  if (extractedPayload) {
    // For food orders, format items nicely
    if (Array.isArray(extractedPayload.items) && extractedPayload.items.length > 0) {
      const items = extractedPayload.items as Array<{name: string; qty?: number}>;
      return items.map(i => i.qty && i.qty > 1 ? `${i.qty}x ${i.name}` : i.name).join(", ");
    }
    
    // Check items_raw but clean it up
    const itemsRaw = extractCleanValue(extractedPayload.items_raw);
    if (itemsRaw) {
      // Skip if it's gibberish like "to place an order for pickup"
      if (!itemsRaw.toLowerCase().includes("to place an order")) {
        return itemsRaw.length > 60 ? itemsRaw.substring(0, 60) + "..." : itemsRaw;
      }
    }
    
    // Get service/job type using clean value extraction
    const serviceVal = extractCleanValue(extractedPayload.service_requested) || 
      extractCleanValue(extractedPayload.job_type) ||
      extractCleanValue(extractedPayload.appointment_type);
    if (serviceVal) {
      return serviceVal;
    }
    
    // For food mode, show order type with proper formatting
    const orderTypeVal = extractCleanValue(extractedPayload.order_type);
    if (orderTypeVal) {
      return formatOrderType(orderTypeVal);
    }
  }
  
  const contextJson = call.context_json;
  if (contextJson) {
    const serviceVal = extractCleanValue(contextJson.service_requested) || 
      extractCleanValue(contextJson.service) || 
      extractCleanValue(contextJson.reason) || 
      extractCleanValue(contextJson.inquiry_type);
    if (serviceVal) {
      return serviceVal;
    }
  }
  
  return "";
}

// Format order type to user-friendly label
function formatOrderType(orderType: string): string {
  const type = orderType.toLowerCase().trim();
  switch (type) {
    case "pickup":
    case "pick up":
    case "pick-up":
      return "Pickup Order";
    case "delivery":
    case "deliver":
      return "Delivery Order";
    case "dine-in":
    case "dine in":
    case "dinein":
      return "Dine-in Order";
    case "catering":
      return "Catering Request";
    case "reservation":
      return "Reservation";
    default:
      // Capitalize first letter
      return orderType.charAt(0).toUpperCase() + orderType.slice(1) + " Order";
  }
}

function getExtractedDetails(call: CallSession): string | null {
  const extractedPayload = call.extracted_payload;
  if (!extractedPayload || Object.keys(extractedPayload).length === 0) {
    return null;
  }
  
  // Format key fields for tooltip
  const details: string[] = [];
  
  if (extractedPayload.order_type) details.push(`Type: ${extractedPayload.order_type}`);
  if (extractedPayload.delivery_address) details.push(`Address: ${extractedPayload.delivery_address}`);
  if (extractedPayload.pickup_address) details.push(`Pickup: ${extractedPayload.pickup_address}`);
  if (extractedPayload.dropoff_address) details.push(`Dropoff: ${extractedPayload.dropoff_address}`);
  if (extractedPayload.preferred_date) details.push(`Date: ${extractedPayload.preferred_date}`);
  if (extractedPayload.preferred_time) details.push(`Time: ${extractedPayload.preferred_time}`);
  if (extractedPayload.vehicle) details.push(`Vehicle: ${extractedPayload.vehicle}`);
  if (extractedPayload.urgency) details.push(`Urgency: ${extractedPayload.urgency}`);
  if (extractedPayload.notes) details.push(`Notes: ${extractedPayload.notes}`);
  
  return details.length > 0 ? details.join("\n") : null;
}

// Check if webhook is missing (call ended more than 2 minutes ago without summary)
function isWebhookMissing(endedAt: string | null): boolean {
  if (!endedAt) return false;
  const endedTime = new Date(endedAt).getTime();
  const now = Date.now();
  const twoMinutesMs = 2 * 60 * 1000;
  return (now - endedTime) > twoMinutesMs;
}

function formatPhone(phone: string | null): string {
  if (!phone) return "Unknown";
  // If already formatted or international, return as-is
  if (phone.includes("(") || (phone.startsWith("+") && phone.length > 12)) return phone;
  // Try to format US numbers
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

// De-duplicate calls by phone number, keeping only the most recent
function deduplicateByPhone(calls: CallSession[]): CallSession[] {
  const phoneMap = new Map<string, CallSession>();
  
  // Since calls are already sorted by started_at DESC, the first occurrence is the latest
  for (const call of calls) {
    const phone = call.caller_phone || "unknown";
    if (!phoneMap.has(phone)) {
      phoneMap.set(phone, call);
    }
  }
  
  return Array.from(phoneMap.values());
}
