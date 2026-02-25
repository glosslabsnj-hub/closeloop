import { useCalendarConnections, useCalendarSync, CALENDAR_PROVIDERS } from "@/hooks/useCalendarConnections";
import { useAuth } from "@/contexts/AuthContext";
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
import { useToast } from "@/hooks/use-toast";

// Helper to get contextual sync status messaging
function getSyncStatus(lastSyncAt: string | null) {
  if (!lastSyncAt) return { status: "never" as const, message: "Never synced", icon: "warning" };

  const syncDate = parseISO(lastSyncAt);
  const minutesAgo = Math.max(0, Math.round((Date.now() - syncDate.getTime()) / (60 * 1000)));

  if (minutesAgo <= 10) {
    return { status: "fresh" as const, message: "Up to date", icon: "success" };
  } else if (minutesAgo <= 60) {
    return {
      status: "recent" as const,
      message: `Updated ${formatDistanceToNow(syncDate, { addSuffix: true })}`,
      icon: "clock",
    };
  }

  return {
    status: "stale" as const,
    message: `Last sync: ${formatDistanceToNow(syncDate, { addSuffix: true })}`,
    icon: "warning",
  };
}

export function CalendarConnectionStatus() {
  const { connections, hasConnectedCalendar, isLoading, refetch } = useCalendarConnections();
  const { assistantSettings } = useAuth();
  const { sync, isSyncing } = useCalendarSync();
  const [wizardOpen, setWizardOpen] = useState(false);
  const { toast } = useToast();

  const isInternalCalendar = assistantSettings?.calendar_provider === 'closeloop';

  const activeConnection = connections.find((c) => c.status === "connected");
  const errorConnection = connections.find((c) => c.status === "error");
  const provider = activeConnection
    ? CALENDAR_PROVIDERS.find((p) => p.id === activeConnection.provider)
    : null;

  // Get selected calendar names from config_json
  const getSelectedCalendarNames = (): string[] => {
    if (!activeConnection?.config_json) return [];
    const config = activeConnection.config_json as {
      available_calendars?: Array<{ id: string; name: string; primary?: boolean }>;
      selected_calendar_ids?: string[];
    };
    const availableCalendars = config.available_calendars || [];
    const selectedIds = config.selected_calendar_ids || [];
    
    if (selectedIds.length === 0) return [];
    
    return selectedIds
      .map((id) => availableCalendars.find((c) => c.id === id)?.name)
      .filter((name): name is string => !!name);
  };

  const selectedCalendarNames = getSelectedCalendarNames();

  const handleSyncNow = async () => {
    if (!activeConnection) return;
    try {
      const result = await sync(activeConnection.id);
      toast({
        title: "Calendar synced",
        description: `${result.syncedCount} events synced`,
      });
      refetch();
    } catch {
      // Error already toasted by useCalendarSync
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
  if (!hasConnectedCalendar && !isInternalCalendar) {
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

  // Internal calendar (closeloop) - show simple connected state
  if (isInternalCalendar && !hasConnectedCalendar) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-full bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 space-y-1.5">
              <h3 className="font-semibold">Using Flux Receptionist Calendar</h3>
              <p className="text-sm text-muted-foreground">
                Your AI books appointments based on your configured business hours and availability slots.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
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
  const syncStatus = getSyncStatus(activeConnection?.last_sync_at || null);
  const isStale = syncStatus.status === "stale" || syncStatus.status === "never";

  return (
    <>
      <Card className={isStale ? "border-warning/30 bg-warning/5" : "border-primary/20 bg-primary/5"}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-full ${isStale ? "bg-warning/10" : "bg-primary/10"}`}>
                {isStale ? (
                  <AlertTriangle className="h-6 w-6 text-warning" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                )}
              </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">
                      Connected to {provider?.name || activeConnection?.provider}
                    </h3>
                    <Badge
                      variant={isStale ? "outline" : "secondary"}
                      className={`text-xs ${isStale ? "border-warning text-warning" : syncStatus.status === "fresh" ? "text-primary" : ""}`}
                    >
                      {syncStatus.icon === "success" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {syncStatus.icon === "clock" && <Clock className="h-3 w-3 mr-1" />}
                      {syncStatus.icon === "warning" && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {syncStatus.message}
                    </Badge>
                  </div>
                  {selectedCalendarNames.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">Syncing from:</span>
                      {selectedCalendarNames.map((name, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs font-normal">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {isStale
                      ? "Your calendar looks out of date — sync now to refresh right away."
                      : "Your schedule auto-syncs every ~5 minutes to prevent double bookings."}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    You can still hit Sync Now anytime for an instant refresh.
                  </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isStale ? "default" : "outline"}
                size="sm"
                onClick={handleSyncNow}
                disabled={isSyncing}
                className={isStale ? "bg-warning hover:bg-warning/90 text-warning-foreground" : ""}
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Sync Now</span>
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
