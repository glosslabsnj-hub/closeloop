import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Phone, Clock, Shield, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface CallContext {
  id: string;
  started_at: string;
  caller_phone: string | null;
  twilio_call_sid: string | null;
  context_json: Record<string, unknown> | null;
}

interface CallContextDebuggerProps {
  tenantId: string;
}

export function CallContextDebugger({ tenantId }: CallContextDebuggerProps) {
  const [lastCall, setLastCall] = useState<CallContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLastCall = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from("ai_call_sessions")
        .select("id, started_at, caller_phone, twilio_call_sid, context_json")
        .eq("tenant_id", tenantId)
        .eq("call_direction", "inbound")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setLastCall(data as CallContext | null);
    } catch (err) {
      console.error("Error fetching call context:", err);
      setError("Failed to load call context");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLastCall();
  }, [tenantId]);

  const context = lastCall?.context_json;
  const isHipaaRedacted = context?.hipaa_mode === true && context?.caller_phone === "[REDACTED]";

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Last Call Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Last Call Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!lastCall) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Last Call Context
          </CardTitle>
          <CardDescription>Debug the dynamic variables sent to ElevenLabs</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No inbound calls recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Last Call Context
            </CardTitle>
            <CardDescription>
              Debug the dynamic variables sent to ElevenLabs
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLastCall}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Call metadata */}
        <div className="flex flex-wrap gap-2 items-center text-sm">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(lastCall.started_at), "MMM d, h:mm a")}
          </Badge>
          {lastCall.caller_phone && (
            <Badge variant="secondary">
              From: {lastCall.caller_phone}
            </Badge>
          )}
          {isHipaaRedacted && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              HIPAA Redacted
            </Badge>
          )}
        </div>

        {/* Context variables */}
        {context ? (
          <div className="space-y-3">
            {/* Core variables */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="space-y-1">
                <span className="text-muted-foreground">Business Name</span>
                <p className="font-medium">{String(context.business_name || "—")}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Business Mode</span>
                <p className="font-medium capitalize">{String(context.business_mode || "—")}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Hours Today</span>
                <p className="font-medium">{String(context.hours_today || "—")}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">HIPAA Mode</span>
                <p className="font-medium">{context.hipaa_mode ? "Yes" : "No"}</p>
              </div>
            </div>

            {/* Enabled modules */}
            {Array.isArray(context.enabled_modules) && context.enabled_modules.length > 0 && (
              <div className="space-y-1">
                <span className="text-muted-foreground text-sm">Enabled Modules</span>
                <div className="flex flex-wrap gap-1">
                  {(context.enabled_modules as string[]).map((mod) => (
                    <Badge key={mod} variant="outline" className="text-xs">
                      {mod.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Summaries */}
            {context.service_summary && (
              <div className="space-y-1">
                <span className="text-muted-foreground text-sm">Service Summary</span>
                <p className="text-sm bg-muted p-2 rounded text-muted-foreground">
                  {String(context.service_summary)}
                </p>
              </div>
            )}

            {context.menu_summary && (
              <div className="space-y-1">
                <span className="text-muted-foreground text-sm">Menu Summary</span>
                <p className="text-sm bg-muted p-2 rounded text-muted-foreground">
                  {String(context.menu_summary)}
                </p>
              </div>
            )}

            {context.policies_summary && (
              <div className="space-y-1">
                <span className="text-muted-foreground text-sm">Policies Summary</span>
                <p className="text-sm bg-muted p-2 rounded text-muted-foreground">
                  {String(context.policies_summary)}
                </p>
              </div>
            )}

            {context.booking_link && (
              <div className="space-y-1">
                <span className="text-muted-foreground text-sm">Booking Link</span>
                <p className="text-sm font-mono bg-muted p-2 rounded">
                  {String(context.booking_link)}
                </p>
              </div>
            )}

            {/* Raw JSON (collapsible) */}
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                View Raw JSON
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-64">
                {JSON.stringify(context, null, 2)}
              </pre>
            </details>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No context data stored for this call.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
