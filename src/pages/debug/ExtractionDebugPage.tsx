import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowRight,
  Database,
  Wand2,
  FileCheck,
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

const intentColors: Record<string, string> = {
  order: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  reservation: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  booking: "bg-green-500/10 text-green-700 dark:text-green-300",
  dispatch: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  callback: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  faq: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
  other: "bg-muted text-muted-foreground",
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
  const extractedPayload = selectedSessionData?.extracted_payload as Record<string, unknown> | null;

  // Get raw data collection keys from _meta
  const rawDataCollectionKeys = (extractedPayload?._meta as Record<string, unknown>)?.raw_data_collection_keys as string[] || [];
  const extractionSource = String((extractedPayload?._meta as Record<string, unknown>)?.extraction_source || "unknown");
  const normalizedAt = (extractedPayload?._meta as Record<string, unknown>)?.normalized_at;
  const tenantTimezone = (extractedPayload?._meta as Record<string, unknown>)?.tenant_timezone;

  // Get specific logs for pipeline stages
  const getLogForStage = (stage: string) => eventLogs?.find(l => l.stage === stage);
  const _canonicalizedLog = getLogForStage("extraction_canonicalized");
  const normalizedLog = getLogForStage("normalization_applied");
  const extractionNormalizedLog = getLogForStage("extraction_normalized");
  const entityCreatedLog = getLogForStage("derived_entity_created");
  const entitySkippedLog = getLogForStage("derived_entity_skipped");
  const entityFailedLog = getLogForStage("entity_insert_failed");

  // Get routing decision from extraction_normalized log
  const routingData = extractionNormalizedLog?.event_data as Record<string, unknown> | undefined;
  const routingTarget = routingData?.routing_target as string | undefined;
  const routingReason = routingData?.routing_reason as string | undefined;
  const enabledModules = routingData?.enabled_modules as string[] | undefined;

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
        <p className="page-subtitle">View call extraction pipeline: Raw → Canonical → Normalized → Entity</p>
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
                    <TableHead>Intent</TableHead>
                    <TableHead>Entity</TableHead>
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
                      const payload = session.extracted_payload as Record<string, unknown> | null;
                      const intent = payload?.intent as string || "unknown";
                      const hasExtraction = !!payload && Object.keys(payload).length > 0;
                      
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
                            <Badge className={intentColors[intent] || "bg-muted"}>
                              {intent}
                            </Badge>
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

        {/* Selected Session Details - 4-Panel View */}
        <div className="space-y-4">
          {selectedSession && selectedSessionData ? (
            <>
              {/* Quick Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileJson className="h-5 w-5" />
                    Call Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                      <p className="text-muted-foreground">Intent</p>
                      <Badge className={intentColors[(extractedPayload?.intent as string) || "other"] || "bg-muted"}>
                        {(extractedPayload?.intent as string) || "Unknown"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Outcome</p>
                      <Badge className={outcomeColors[selectedSessionData.outcome || ""] || "bg-muted"}>
                        {selectedSessionData.outcome || "Unknown"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 4-Panel Extraction Pipeline */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Extraction Pipeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="canonical" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="raw" className="text-xs">
                        <Database className="h-3 w-3 mr-1" />
                        Raw
                      </TabsTrigger>
                      <TabsTrigger value="canonical" className="text-xs">
                        <FileJson className="h-3 w-3 mr-1" />
                        Canonical
                      </TabsTrigger>
                      <TabsTrigger value="normalized" className="text-xs">
                        <Wand2 className="h-3 w-3 mr-1" />
                        Normalized
                      </TabsTrigger>
                      <TabsTrigger value="entity" className="text-xs">
                        <FileCheck className="h-3 w-3 mr-1" />
                        Entity
                      </TabsTrigger>
                    </TabsList>

                    {/* Raw Data Collection */}
                    <TabsContent value="raw" className="mt-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Source: {extractionSource}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {rawDataCollectionKeys.length} keys
                          </Badge>
                        </div>
                        {rawDataCollectionKeys.length > 0 ? (
                          <ScrollArea className="h-[200px]">
                            <div className="space-y-2">
                              {rawDataCollectionKeys.map((key) => (
                                <div key={key} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                                  <span className="font-mono text-xs text-muted-foreground">{key}</span>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground py-4">
                            <AlertTriangle className="h-4 w-4" />
                            <span>No raw data collection keys (server-side extraction used)</span>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* Canonical Payload */}
                    <TabsContent value="canonical" className="mt-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {extractedPayload?.intent && (
                            <Badge variant="outline" className="bg-primary/10">
                              Intent: {String(extractedPayload.intent)}
                            </Badge>
                          )}
                          {(extractedPayload?.customer as Record<string, unknown>)?.name && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-700">
                              Customer: {String((extractedPayload.customer as Record<string, unknown>).name)}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Show relevant section based on intent */}
                        <ScrollArea className="h-[200px]">
                          <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                            {JSON.stringify(extractedPayload, null, 2)}
                          </pre>
                        </ScrollArea>
                      </div>
                    </TabsContent>

                    {/* Normalized Values */}
                    <TabsContent value="normalized" className="mt-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {tenantTimezone && (
                            <Badge variant="outline" className="text-xs">
                              Timezone: {String(tenantTimezone)}
                            </Badge>
                          )}
                          {normalizedAt && (
                            <Badge variant="outline" className="text-xs">
                              Normalized: {format(new Date(String(normalizedAt)), "HH:mm:ss")}
                            </Badge>
                          )}
                        </div>

                        {/* Reservation normalization details */}
                        {(extractedPayload?.reservation as Record<string, unknown>) && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Reservation Normalization</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="p-2 bg-muted rounded">
                                <p className="text-xs text-muted-foreground">Original Date</p>
                                <p className="font-mono">
                                  {String((extractedPayload.reservation as Record<string, unknown>).original_date_phrase || "(already ISO)")}
                                </p>
                                <ArrowRight className="h-3 w-3 my-1 text-muted-foreground" />
                                <p className="font-mono text-primary">
                                  {String((extractedPayload.reservation as Record<string, unknown>).date || "null")}
                                </p>
                              </div>
                              <div className="p-2 bg-muted rounded">
                                <p className="text-xs text-muted-foreground">Original Time</p>
                                <p className="font-mono">
                                  {String((extractedPayload.reservation as Record<string, unknown>).original_time_phrase || "(already 24h)")}
                                </p>
                                <ArrowRight className="h-3 w-3 my-1 text-muted-foreground" />
                                <p className="font-mono text-primary">
                                  {String((extractedPayload.reservation as Record<string, unknown>).time || "null")}
                                </p>
                              </div>
                              <div className="p-2 bg-muted rounded col-span-2">
                                <p className="text-xs text-muted-foreground">Party Size</p>
                                <p className="font-mono text-primary">
                                  {String((extractedPayload.reservation as Record<string, unknown>).party_size ?? "null")} 
                                  <span className="text-muted-foreground ml-2">
                                    (type: {typeof (extractedPayload.reservation as Record<string, unknown>).party_size})
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Show normalization event log data if available */}
                        {normalizedLog?.event_data && (
                          <div className="mt-4">
                            <p className="text-sm font-medium mb-2">Event Log Data</p>
                            <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                              {JSON.stringify(normalizedLog.event_data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* Derived Entity */}
                    <TabsContent value="entity" className="mt-4">
                      <div className="space-y-3">
                        {/* Routing Decision */}
                        {routingData && (
                          <div className="p-3 bg-muted rounded-lg space-y-2">
                            <p className="text-sm font-medium">Routing Decision</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Target Table</p>
                                <Badge className={
                                  routingTarget === "food_orders" ? "bg-blue-500/10 text-blue-700" :
                                  routingTarget === "reservations" ? "bg-purple-500/10 text-purple-700" :
                                  routingTarget === "bookings" ? "bg-green-500/10 text-green-700" :
                                  routingTarget === "dispatch_jobs" ? "bg-orange-500/10 text-orange-700" :
                                  "bg-muted"
                                }>
                                  {routingTarget || "none"}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Intent</p>
                                <Badge className={intentColors[(extractedPayload?.intent as string) || "other"]}>
                                  {(extractedPayload?.intent as string) || "unknown"}
                                </Badge>
                              </div>
                            </div>
                            {routingReason && (
                              <div className="text-xs text-muted-foreground">
                                <p className="font-medium">Reason:</p>
                                <p>{routingReason}</p>
                              </div>
                            )}
                            {enabledModules && enabledModules.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                <span className="text-xs text-muted-foreground">Enabled modules:</span>
                                {enabledModules.map(mod => (
                                  <Badge key={mod} variant="outline" className="text-xs">
                                    {mod}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {derivedEntities && derivedEntities.length > 0 ? (
                          <div className="space-y-2">
                            {derivedEntities.map((entity) => (
                              <div 
                                key={entity.id}
                                className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                                    {entityIcons[entity.type]}
                                  </div>
                                  <div>
                                    <p className="font-medium capitalize flex items-center gap-2">
                                      {entity.type}
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    </p>
                                    <p className="text-sm text-muted-foreground">{entity.display}</p>
                                    <p className="text-xs font-mono text-muted-foreground">{entity.id.slice(0, 8)}...</p>
                                  </div>
                                </div>
                                <Badge variant="outline">{entity.status}</Badge>
                              </div>
                            ))}
                          </div>
                        ) : entitySkippedLog ? (
                          <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            <div>
                              <p className="font-medium">Entity Skipped</p>
                              <p className="text-sm text-muted-foreground">
                                {String((entitySkippedLog.event_data as Record<string, unknown>)?.reason || routingReason || "No entity created for this intent")}
                              </p>
                            </div>
                          </div>
                        ) : entityFailedLog ? (
                          <div className="flex items-center gap-2 p-4 bg-destructive/10 rounded-lg">
                            <XCircle className="h-5 w-5 text-destructive" />
                            <div>
                              <p className="font-medium">Entity Insert Failed</p>
                              <p className="text-sm text-muted-foreground">
                                {entityFailedLog.error_message || "Unknown error during entity creation"}
                              </p>
                              <pre className="text-xs mt-2 overflow-auto">
                                {JSON.stringify(entityFailedLog.event_data, null, 2)}
                              </pre>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground py-4">
                            <XCircle className="h-4 w-4" />
                            <span>No derived entities created</span>
                          </div>
                        )}

                        {/* Entity creation log details */}
                        {entityCreatedLog?.event_data && (
                          <div className="mt-4 p-3 bg-muted rounded">
                            <p className="text-sm font-medium mb-2">Entity Creation Log</p>
                            <pre className="text-xs overflow-auto">
                              {JSON.stringify(entityCreatedLog.event_data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Event Logs Timeline */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Event Log Timeline
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
                                <Badge variant="outline" className={
                                  log.stage.includes("canonical") ? "bg-blue-500/10" :
                                  log.stage.includes("normal") ? "bg-purple-500/10" :
                                  log.stage.includes("entity_created") ? "bg-green-500/10" :
                                  log.stage.includes("error") || log.stage.includes("failed") ? "bg-destructive/10" :
                                  ""
                                }>
                                  {log.stage.replace(/_/g, " ")}
                                </Badge>
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
                <p>Select a call to view extraction pipeline details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
