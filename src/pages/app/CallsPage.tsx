import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Search, Pencil, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { CallEditDialog } from "@/components/calls/CallEditDialog";
import { useToast } from "@/hooks/use-toast";
import { ModuleUnavailablePage } from "@/components/shared/ModuleUnavailablePage";

interface CallSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  caller_phone: string | null;
  call_direction: "inbound" | "outbound";
  outcome: string | null;
  summary: string | null;
  context_json: Record<string, unknown> | null;
}

type CallStatus = "booked" | "thinking" | "no_book";

export default function CallsPage() {
  // P0-3: Route protection - redirect if ai_voice module not enabled
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["ai_voice"]);
  
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCall, setEditingCall] = useState<CallSession | null>(null);

  const { data: calls, isLoading } = useQuery({
    queryKey: ["ai_call_sessions", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      
      const { data, error } = await supabase
        .from("ai_call_sessions")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("started_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as CallSession[];
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
          context_json: updates.context_json as unknown as Record<string, never>,
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

  // De-duplicate by phone number - show only the latest call per phone
  const deduplicatedCalls = calls ? deduplicateByPhone(calls) : [];

  const filteredCalls = deduplicatedCalls.filter(call => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const customerName = getCustomerName(call.context_json);
    const serviceRequested = getServiceRequested(call.context_json);
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
      case "followup":
      case "lead_captured":
      case "info_provided":
        return "thinking";
      case "lost":
      case "escalated":
      case "abandoned":
      default:
        return "no_book";
    }
  };

  const getStatusBadge = (status: CallStatus) => {
    switch (status) {
      case "booked":
        return (
          <Badge variant="success">
            Booked
          </Badge>
        );
      case "thinking":
        return (
          <Badge variant="warning">
            Thinking
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

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Calls</h1>
          <p className="page-subtitle">
            All AI-handled calls with extracted information
          </p>
        </div>
        <Badge variant="muted" className="text-base px-3 py-1 w-fit">
          {deduplicatedCalls.length} Contacts
        </Badge>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, or service..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
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
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Customer Name</TableHead>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[140px]">Phone</TableHead>
                  <TableHead className="w-[200px]">Service Requested</TableHead>
                  <TableHead className="min-w-[250px]">AI Summary</TableHead>
                  <TableHead className="w-[100px] text-center">Status</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.map((call) => {
                  const status = getCallStatus(call.outcome);
                  const customerName = getCustomerName(call.context_json);
                  const serviceRequested = getServiceRequested(call.context_json);
                  
                  return (
                    <TableRow key={call.id}>
                      <TableCell className="font-medium">
                        {customerName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(call.started_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatPhone(call.caller_phone)}
                      </TableCell>
                      <TableCell>
                        {serviceRequested || (
                          <span className="text-muted-foreground italic">
                            Not specified
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        {call.summary ? (
                          <span className="line-clamp-2 text-sm">
                            {call.summary}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">
                            No summary available
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(status)}
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
    </div>
  );
}

// Helper functions

function getCustomerName(contextJson: Record<string, unknown> | null): string {
  if (!contextJson) return "Unknown";
  return (
    (contextJson.customer_name as string) ||
    (contextJson.name as string) ||
    (contextJson.caller_name as string) ||
    "Unknown"
  );
}

function getServiceRequested(contextJson: Record<string, unknown> | null): string {
  if (!contextJson) return "";
  return (
    (contextJson.service_requested as string) ||
    (contextJson.service as string) ||
    (contextJson.reason as string) ||
    (contextJson.inquiry_type as string) ||
    ""
  );
}

function formatPhone(phone: string | null): string {
  if (!phone) return "Unknown";
  // If already formatted or international, return as-is
  if (phone.includes("(") || phone.startsWith("+")) return phone;
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
