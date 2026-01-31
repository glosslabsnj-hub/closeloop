import { useCalendarConnections, CALENDAR_PROVIDERS } from "@/hooks/useCalendarConnections";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  RefreshCw,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useState } from "react";
import { CalendarConnectionWizard } from "@/components/settings/CalendarConnectionWizard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function CalendarConnectionStatus() {
  const { connections, hasConnectedCalendar, isLoading, refetch } = useCalendarConnections();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const activeConnection = connections.find((c) => c.status === "connected");
  const errorConnection = connections.find((c) => c.status === "error");
  const provider = activeConnection 
    ? CALENDAR_PROVIDERS.find((p) => p.id === activeConnection.provider)
    : null;

  const handleSyncNow = async () => {
    if (!activeConnection) return;
    
    setIsSyncing(true);
    try {
      const response = await supabase.functions.invoke("sync-availability", {
        body: { connection_id: activeConnection.id, days: 30 },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Calendar synced",
        description: `${response.data?.synced_count || 0} events synced`,
      });
      refetch();
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Could not sync calendar",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Loading calendar status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not connected - show prominent CTA
  if (!hasConnectedCalendar) {
    return (
      <>
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-warning/10">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">Calendar not connected</h3>
                  <p className="text-muted-foreground">
                    Your AI only knows your basic business hours. Connect your calendar 
                    so it can see your meetings, appointments, and busy times in real-time.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setWizardOpen(true)}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Connect Calendar
                  </Button>
                  <Button variant="ghost" onClick={() => setWizardOpen(true)}>
                    I'll manage manually
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <CalendarConnectionWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      </>
    );
  }

  // Connected with error
  if (errorConnection) {
    return (
      <>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">Calendar sync issue</h3>
                  <p className="text-muted-foreground">
                    {errorConnection.sync_error || "There was a problem syncing your calendar. Your AI may have outdated availability."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={() => setWizardOpen(true)}>
                    Reconnect Calendar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <CalendarConnectionWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      </>
    );
  }

  // Connected successfully
  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">
                    Connected to {provider?.name || activeConnection?.provider}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {activeConnection?.last_sync_at
                      ? `Synced ${formatDistanceToNow(parseISO(activeConnection.last_sync_at), { addSuffix: true })}`
                      : "Never synced"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your AI automatically sees your meetings and blocks those times.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSyncNow}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Sync Now</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setWizardOpen(true)}
              >
                <ExternalLink className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Manage</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <CalendarConnectionWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </>
  );
}
