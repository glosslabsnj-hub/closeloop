import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Phone, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Clock,
  FileJson,
  Loader2,
  ShoppingBag,
  Calendar,
  Truck,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface CallSession {
  id: string;
  tenant_id: string;
  caller_phone: string | null;
  started_at: string;
  ended_at: string | null;
  outcome: string | null;
  summary: string | null;
  extracted_payload: Record<string, unknown> | null;
  customer_id: string | null;
  elevenlabs_conversation_id: string | null;
  context_json: Record<string, unknown> | null;
}

interface EventLog {
  id: string;
  stage: string;
  event_data: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
}

interface DerivedEntity {
  type: "order" | "reservation" | "booking" | "dispatch";
  id: string;
  status: string;
  created_at: string;
  display: string;
}

const outcomeColors: Record<string, string> = {
  booked: "bg-green-500/10 text-green-700 dark:text-green-300",
  order: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  dispatch: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  followup: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  lost: "bg-destructive/10 text-destructive",
  lead_captured: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const entityIcons: Record<string, React.ReactNode> = {
  order: <ShoppingBag className="h-4 w-4" />,
  reservation: <Users className="h-4 w-4" />,
  booking: <Calendar className="h-4 w-4" />,
  dispatch: <Truck className="h-4 w-4" />,
};

export default function ExtractionDebugPage() {
  const { tenant } = useAuth();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  // Fetch last 20 call sessions with extracted data
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["extraction-debug-sessions", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("ai_call_sessions")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as CallSession[];
    },
    enabled: !!tenant?.id,
    refetchInterval: 10000,
  });

  // Fetch event logs for selected session
  const { data: eventLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["extraction-debug-logs", selectedSession],
    queryFn: async () => {
      if (!selectedSession) return [];
      const { data, error } = await supabase
        .from("ai_event_logs")
        .select("*")
        .eq("session_id", selectedSession)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as EventLog[];
    },
    enabled: !!selectedSession,
  });

  // Fetch derived entities for selected session
  const { data: derivedEntities } = useQuery({
    queryKey: ["extraction-debug-entities", selectedSession],
    queryFn: async () => {
      if (!selectedSession) return [];
      const entities: DerivedEntity[] = [];

      // Check food_orders
      const { data: orders } = await supabase
        .from("food_orders")
        .select("id, order_number, status, created_at")
        .eq("session_id", selectedSession);
      if (orders) {
        entities.push(...orders.map(o => ({
          type: "order" as const,
          id: o.id,
          status: o.status,
          created_at: o.created_at,
          display: o.order_number,
        })));
      }

      // Check reservations
      const { data: reservations } = await supabase
        .from("reservations")
        .select("id, party_size, reservation_date, status, created_at")
        .eq("session_id", selectedSession);
      if (reservations) {
        entities.push(...reservations.map(r => ({
          type: "reservation" as const,
          id: r.id,
          status: r.status,
          created_at: r.created_at,
          display: `${r.party_size} guests - ${r.reservation_date}`,
        })));
      }

      // Check bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, start_at, status, created_at")
        .eq("session_id", selectedSession);
      if (bookings) {
        entities.push(...bookings.map(b => ({
          type: "booking" as const,
          id: b.id,
          status: b.status,
          created_at: b.created_at,
          display: format(new Date(b.start_at), "MMM d, h:mm a"),
        })));
      }

      // Check dispatch_jobs
      const { data: jobs } = await supabase
        .from("dispatch_jobs")
        .select("id, job_number, status, created_at")
        .eq("session_id", selectedSession);
      if (jobs) {
        entities.push(...jobs.map(j => ({
          type: "dispatch" as const,
          id: j.id,
          status: j.status,
          created_at: j.created_at,
          display: j.job_number,
        })));
      }

      return entities;
    },
    enabled: !!selectedSession,
  });

  const selectedSessionData = sessions?.find(s => s.id === selectedSession);

  if (sessionsLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="page-header">
        <h1 className="page-title">Extraction Debug</h1>
        <p className="page-subtitle">View call extraction data, event logs, and derived entities</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Recent Calls (Last 20)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Caller</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Extracted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No calls found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessions?.map((session) => {
                      const hasExtraction = !!session.extracted_payload && 
                        Object.keys(session.extracted_payload).length > 0;
                      
                      return (
                        <TableRow 
                          key={session.id}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50",
                            selectedSession === session.id && "bg-muted"
                          )}
                          onClick={() => setSelectedSession(session.id)}
                        >
                          <TableCell className="font-mono text-xs">
                            {format(new Date(session.started_at), "MMM d, HH:mm")}
                          </TableCell>
                          <TableCell className="text-sm">
                            {session.caller_phone || "Unknown"}
                          </TableCell>
                          <TableCell>
                            {session.outcome && (
                              <Badge className={outcomeColors[session.outcome] || "bg-muted"}>
                                {session.outcome}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {hasExtraction ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Selected Session Details */}
        <div className="space-y-4">
          {selectedSession && selectedSessionData ? (
            <>
              {/* Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileJson className="h-5 w-5" />
                    Call Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Session ID</p>
                      <p className="font-mono text-xs">{selectedSessionData.id.slice(0, 8)}...</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Caller</p>
                      <p>{selectedSessionData.caller_phone || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Outcome</p>
                      <Badge className={outcomeColors[selectedSessionData.outcome || ""] || "bg-muted"}>
                        {selectedSessionData.outcome || "Unknown"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Customer ID</p>
                      <p className="font-mono text-xs">
                        {selectedSessionData.customer_id?.slice(0, 8) || "None"}
                      </p>
                    </div>
                  </div>

                  {selectedSessionData.summary && (
                    <div>
                      <p className="text-muted-foreground text-sm mb-1">Summary</p>
                      <p className="text-sm bg-muted p-2 rounded">{selectedSessionData.summary}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Extracted Payload */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Extracted Payload</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedSessionData.extracted_payload && 
                   Object.keys(selectedSessionData.extracted_payload).length > 0 ? (
                    <ScrollArea className="h-[200px]">
                      <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                        {JSON.stringify(selectedSessionData.extracted_payload, null, 2)}
                      </pre>
                    </ScrollArea>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground py-4">
                      <AlertTriangle className="h-4 w-4" />
                      <span>No extracted payload</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Derived Entities */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Derived Entities</CardTitle>
                </CardHeader>
                <CardContent>
                  {derivedEntities && derivedEntities.length > 0 ? (
                    <div className="space-y-2">
                      {derivedEntities.map((entity) => (
                        <div 
                          key={entity.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              {entityIcons[entity.type]}
                            </div>
                            <div>
                              <p className="font-medium capitalize">{entity.type}</p>
                              <p className="text-sm text-muted-foreground">{entity.display}</p>
                            </div>
                          </div>
                          <Badge variant="outline">{entity.status}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground py-4">
                      <XCircle className="h-4 w-4" />
                      <span>No derived entities created</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Event Logs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Event Log
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {logsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : eventLogs && eventLogs.length > 0 ? (
                    <ScrollArea className="h-[200px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Stage</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {eventLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="font-mono text-xs">
                                {format(new Date(log.created_at), "HH:mm:ss")}
                              </TableCell>
                              <TableCell className="text-sm">
                                {log.stage.replace(/_/g, " ")}
                              </TableCell>
                              <TableCell>
                                {log.error_message ? (
                                  <Badge variant="destructive" className="text-xs">
                                    Error
                                  </Badge>
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground py-4 px-4">
                      <AlertTriangle className="h-4 w-4" />
                      <span>No event logs found</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileJson className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a call to view extraction details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
