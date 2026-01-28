import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Phone, 
  PhoneIncoming, 
  PhoneOutgoing, 
  Clock, 
  Calendar, 
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  Search,
  Filter
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface CallSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  caller_phone: string | null;
  call_direction: "inbound" | "outbound";
  outcome: string | null;
  summary: string | null;
  context_json: Record<string, any> | null;
  customer_id: string | null;
  lead_id: string | null;
  booking_id: string | null;
}

export default function CallsPage() {
  const { tenant } = useAuth();
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredCalls = calls?.filter(call => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      call.caller_phone?.toLowerCase().includes(query) ||
      call.summary?.toLowerCase().includes(query) ||
      call.outcome?.toLowerCase().includes(query)
    );
  });

  const getOutcomeBadge = (outcome: string | null) => {
    switch (outcome) {
      case "booked":
        return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Booked</Badge>;
      case "lead_captured":
        return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">Lead Captured</Badge>;
      case "info_provided":
        return <Badge className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20">Info Provided</Badge>;
      case "escalated":
        return <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20">Escalated</Badge>;
      case "abandoned":
        return <Badge className="bg-gray-500/10 text-gray-600 hover:bg-gray-500/20">Abandoned</Badge>;
      default:
        return <Badge variant="secondary">{outcome || "Unknown"}</Badge>;
    }
  };

  const getDuration = (started: string, ended: string | null) => {
    if (!ended) return "In progress";
    const start = new Date(started);
    const end = new Date(ended);
    const seconds = Math.round((end.getTime() - start.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const extractStructuredData = (contextJson: Record<string, any> | null) => {
    if (!contextJson) return null;
    
    // Extract commonly captured fields
    const fields: { label: string; value: string }[] = [];
    
    if (contextJson.customer_name) {
      fields.push({ label: "Customer Name", value: contextJson.customer_name });
    }
    if (contextJson.service_requested) {
      fields.push({ label: "Service Requested", value: contextJson.service_requested });
    }
    if (contextJson.preferred_date) {
      fields.push({ label: "Preferred Date", value: contextJson.preferred_date });
    }
    if (contextJson.preferred_time) {
      fields.push({ label: "Preferred Time", value: contextJson.preferred_time });
    }
    if (contextJson.notes) {
      fields.push({ label: "Notes", value: contextJson.notes });
    }
    if (contextJson.booking_confirmed !== undefined) {
      fields.push({ label: "Booking Confirmed", value: contextJson.booking_confirmed ? "Yes" : "No" });
    }
    
    return fields.length > 0 ? fields : null;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Call History</h1>
          <p className="text-muted-foreground">View all AI-handled calls and collected information</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-lg px-3 py-1">
            {calls?.length || 0} Calls
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by phone, summary, or outcome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Calls List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCalls && filteredCalls.length > 0 ? (
        <div className="space-y-3">
          {filteredCalls.map((call) => {
            const isExpanded = expandedCall === call.id;
            const structuredData = extractStructuredData(call.context_json);
            
            return (
              <Card key={call.id} className="overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedCall(isExpanded ? null : call.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Call info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-2 rounded-full shrink-0 ${
                        call.call_direction === "inbound" 
                          ? "bg-blue-500/10 text-blue-600" 
                          : "bg-green-500/10 text-green-600"
                      }`}>
                        {call.call_direction === "inbound" ? (
                          <PhoneIncoming className="h-4 w-4" />
                        ) : (
                          <PhoneOutgoing className="h-4 w-4" />
                        )}
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {call.caller_phone || "Unknown Caller"}
                          </span>
                          {getOutcomeBadge(call.outcome)}
                        </div>
                        
                        {call.summary && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {call.summary}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(call.started_at), "MMM d, yyyy h:mm a")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getDuration(call.started_at, call.ended_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Expand button */}
                    <Button variant="ghost" size="sm" className="shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t bg-muted/30 p-4 space-y-4">
                    {/* Structured Data */}
                    {structuredData && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Collected Information
                        </h4>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {structuredData.map((field, idx) => (
                            <div key={idx} className="bg-background rounded-lg p-3 border">
                              <span className="text-xs text-muted-foreground block">
                                {field.label}
                              </span>
                              <span className="font-medium">{field.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    {call.summary && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Call Summary</h4>
                        <p className="text-sm text-muted-foreground bg-background rounded-lg p-3 border">
                          {call.summary}
                        </p>
                      </div>
                    )}

                    {/* Related Records */}
                    <div className="flex gap-2 flex-wrap">
                      {call.booking_id && (
                        <Badge variant="outline" className="gap-1">
                          <Calendar className="h-3 w-3" />
                          Booking Created
                        </Badge>
                      )}
                      {call.lead_id && (
                        <Badge variant="outline" className="gap-1">
                          <User className="h-3 w-3" />
                          Lead Created
                        </Badge>
                      )}
                      {call.customer_id && (
                        <Badge variant="outline" className="gap-1">
                          <User className="h-3 w-3" />
                          Customer Linked
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Phone className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No Calls Yet</h3>
            <p className="text-muted-foreground max-w-sm mt-1">
              When your AI assistant handles calls, they'll appear here with all the collected information.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
