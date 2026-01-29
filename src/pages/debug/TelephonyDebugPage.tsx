import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Phone, 
  Webhook, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  ArrowLeft,
  ExternalLink,
  Copy,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Top 5 failure reasons and fixes
const TROUBLESHOOTING_GUIDE = [
  {
    issue: "No tenant found for number",
    cause: "Twilio 'To' number not in phone_numbers table",
    fix: "Add the Twilio number to phone_numbers table with correct tenant_id",
    severity: "critical",
  },
  {
    issue: "ElevenLabs register-call failed [401]",
    cause: "Missing or invalid ELEVENLABS_API_KEY",
    fix: "Verify ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID secrets are set correctly",
    severity: "critical",
  },
  {
    issue: "Missing Supabase configuration",
    cause: "Edge function missing SUPABASE_URL or SERVICE_ROLE_KEY",
    fix: "These are auto-injected by Cloud - redeploy the edge function",
    severity: "critical",
  },
  {
    issue: "Database error looking up phone number",
    cause: "Schema mismatch or RLS blocking service role",
    fix: "Check phone_numbers table exists and has location_id column",
    severity: "high",
  },
  {
    issue: "Voice AI disabled for tenant",
    cause: "voice_ai_enabled = false in assistant_settings",
    fix: "Enable Voice AI in Settings or via assistant_settings.voice_ai_enabled = true",
    severity: "medium",
  },
];

export default function TelephonyDebugPage() {
  const { tenant, user, isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  // Only allow super admins or dev mode
  const isDev = import.meta.env.DEV;
  const canAccess = isSuperAdmin || isDev;

  useEffect(() => {
    if (!authLoading && !canAccess) {
      navigate("/app/dashboard");
    }
  }, [authLoading, canAccess, navigate]);

  // Fetch tenant phone number config
  const { data: phoneConfig, isLoading: phoneLoading, refetch: refetchPhone } = useQuery({
    queryKey: ["debug-phone-config", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data, error } = await supabase
        .from("phone_numbers")
        .select("*")
        .eq("tenant_id", tenant.id);
      return data || [];
    },
    enabled: !!tenant?.id && canAccess,
  });

  // Fetch assistant settings
  const { data: assistantSettings, refetch: refetchSettings } = useQuery({
    queryKey: ["debug-assistant-settings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data } = await supabase
        .from("assistant_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      return data;
    },
    enabled: !!tenant?.id && canAccess,
  });

  // Fetch Twilio event logs
  const { data: twilioLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["debug-twilio-logs", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("twilio_event_logs")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!tenant?.id && canAccess,
  });

  // Fetch ai_call_sessions
  const { data: callSessions, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ["debug-call-sessions", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data } = await supabase
        .from("ai_call_sessions")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!tenant?.id && canAccess,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchPhone(), refetchSettings(), refetchLogs(), refetchSessions()]);
    setRefreshing(false);
    toast({ title: "Refreshed", description: "Debug data updated" });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Value copied to clipboard" });
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccess) {
    return null;
  }

  const webhookBaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://zsqfzluyylzmmjtfxwgr.supabase.co";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Telephony Debug Pack</h1>
              <p className="text-xs text-muted-foreground">Dev/Admin Only</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      <main className="container max-w-6xl py-6 space-y-6">
        {/* Troubleshooting Guide */}
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Top 5 Failure Reasons & Fixes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {TROUBLESHOOTING_GUIDE.map((item, i) => (
                <div key={i} className="border rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Badge variant={item.severity === "critical" ? "destructive" : item.severity === "high" ? "default" : "secondary"} className="shrink-0">
                      {item.severity.toUpperCase()}
                    </Badge>
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{item.issue}</p>
                      <p className="text-xs text-muted-foreground">Cause: {item.cause}</p>
                      <p className="text-xs text-primary">Fix: {item.fix}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Phone & Webhook Status */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Twilio Number */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="h-4 w-4" />
                Assigned Twilio Number
              </CardTitle>
            </CardHeader>
            <CardContent>
              {phoneLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : phoneConfig && phoneConfig.length > 0 ? (
                <div className="space-y-2">
                  {phoneConfig.map((phone: any) => (
                    <div key={phone.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <p className="font-mono font-medium">{phone.phone_e164}</p>
                        <p className="text-xs text-muted-foreground">
                          Status: <Badge variant={phone.status === "active" ? "default" : "secondary"}>{phone.status || "unknown"}</Badge>
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => copyToClipboard(phone.phone_e164)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>No Twilio number assigned</AlertTitle>
                  <AlertDescription>
                    Add a phone_numbers record with tenant_id = {tenant?.id}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Webhook URLs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Webhook className="h-4 w-4" />
                Webhook URLs
              </CardTitle>
              <CardDescription>Configure these in Twilio console</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Voice Webhook (POST)</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted p-2 rounded font-mono break-all">
                    {webhookBaseUrl}/functions/v1/twilio-inbound
                  </code>
                  <Button size="icon" variant="ghost" onClick={() => copyToClipboard(`${webhookBaseUrl}/functions/v1/twilio-inbound`)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">ElevenLabs Webhook</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted p-2 rounded font-mono break-all">
                    {webhookBaseUrl}/functions/v1/elevenlabs-webhook
                  </code>
                  <Button size="icon" variant="ghost" onClick={() => copyToClipboard(`${webhookBaseUrl}/functions/v1/elevenlabs-webhook`)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">
                  Voice AI: <Badge variant={assistantSettings?.voice_ai_enabled ? "default" : "secondary"}>{assistantSettings?.voice_ai_enabled ? "Enabled" : "Disabled"}</Badge>
                  {" • "}
                  Connect Status: <Badge variant="outline">{assistantSettings?.connect_status || "unknown"}</Badge>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logs Tabs */}
        <Tabs defaultValue="twilio-events" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="twilio-events">Twilio Events</TabsTrigger>
            <TabsTrigger value="elevenlabs">ElevenLabs Attempts</TabsTrigger>
            <TabsTrigger value="sessions">Call Sessions</TabsTrigger>
          </TabsList>

          {/* Twilio Event Logs */}
          <TabsContent value="twilio-events">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Last 20 Twilio Inbound Events</CardTitle>
                <CardDescription>Logged from twilio-inbound edge function</CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : twilioLogs && twilioLogs.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Stage</TableHead>
                          <TableHead>From → To</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {twilioLogs.map((log: any) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.stage}</Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {log.from_number} → {log.to_number}
                            </TableCell>
                            <TableCell>
                              {log.http_status ? (
                                <Badge variant={log.http_status >= 200 && log.http_status < 300 ? "default" : "destructive"}>
                                  {log.http_status}
                                </Badge>
                              ) : "-"}
                            </TableCell>
                            <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                              {log.error_message || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No Twilio events logged yet. Events will appear after inbound calls are processed.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ElevenLabs Attempts (from twilio_event_logs where stage = elevenlabs_*) */}
          <TabsContent value="elevenlabs">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ElevenLabs Register-Call Attempts</CardTitle>
                <CardDescription>Results from calling ElevenLabs API</CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : (() => {
                  const elevenLabsLogs = twilioLogs?.filter((l: any) => l.stage?.includes("elevenlabs")) || [];
                  return elevenLabsLogs.length > 0 ? (
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Call SID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Error</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {elevenLabsLogs.map((log: any) => (
                            <TableRow key={log.id}>
                              <TableCell className="text-xs whitespace-nowrap">
                                {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                              </TableCell>
                              <TableCell className="text-xs font-mono">{log.twilio_call_sid}</TableCell>
                              <TableCell>
                                <Badge variant={log.http_status >= 200 && log.http_status < 300 ? "default" : "destructive"}>
                                  {log.http_status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-destructive max-w-[300px] truncate">
                                {log.error_message || "Success"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No ElevenLabs API calls logged yet.
                    </p>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Call Sessions */}
          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Last 20 AI Call Sessions</CardTitle>
                <CardDescription>From ai_call_sessions table</CardDescription>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : callSessions && callSessions.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Started</TableHead>
                          <TableHead>Direction</TableHead>
                          <TableHead>Caller</TableHead>
                          <TableHead>Outcome</TableHead>
                          <TableHead>EL Conv ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {callSessions.map((session: any) => (
                          <TableRow key={session.id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              {format(new Date(session.started_at), "MMM d, HH:mm")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{session.call_direction}</Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono">{session.caller_phone || "-"}</TableCell>
                            <TableCell>
                              {session.outcome ? (
                                <Badge variant={session.outcome === "completed" ? "default" : "secondary"}>
                                  {session.outcome}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs font-mono max-w-[100px] truncate">
                              {session.elevenlabs_conversation_id || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No call sessions yet. Sessions are created when calls are received.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
