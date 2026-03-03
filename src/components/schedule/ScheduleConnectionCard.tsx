import { useNavigate } from "react-router-dom";
import { Calendar, CheckCircle2, AlertTriangle, ChevronRight, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";
import { useIndustryContext } from "@/hooks/useIndustryContext";

interface ScheduleConnectionCardProps {
  variant?: "compact" | "full";
  showIfConnected?: boolean;
}

export function ScheduleConnectionCard({ variant = "full", showIfConnected = true }: ScheduleConnectionCardProps) {
  const navigate = useNavigate();
  const { connections, hasConnectedCalendar, isLoading } = useCalendarConnections();
  const { terms } = useIndustryContext();

  const connectedCalendar = connections.find(c => c.status === "connected");
  const lastSync = connectedCalendar?.last_sync_at 
    ? new Date(connectedCalendar.last_sync_at).toLocaleDateString()
    : null;

  // Don't show if connected and showIfConnected is false
  if (hasConnectedCalendar && !showIfConnected) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4 h-24" />
      </Card>
    );
  }

  if (variant === "compact") {
    return (
      <Card 
        className={`cursor-pointer transition-all hover:shadow-md ${
          hasConnectedCalendar ? "border-primary/30" : "border-accent bg-accent/5"
        }`}
        onClick={() => navigate("/app/integrations/schedule")}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${hasConnectedCalendar ? "bg-primary/10" : "bg-accent"}`}>
                {hasConnectedCalendar ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Calendar className="h-5 w-5 text-accent-foreground" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">
                  {hasConnectedCalendar ? "Schedule Connected" : "Connect Schedule"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hasConnectedCalendar 
                    ? `Synced${lastSync ? ` ${lastSync}` : ""}`
                    : "Prevent double-bookings"
                  }
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={hasConnectedCalendar ? "border-primary/30" : "border-accent"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${hasConnectedCalendar ? "bg-primary/10" : "bg-accent"}`}>
              <Calendar className={`h-5 w-5 ${hasConnectedCalendar ? "text-primary" : "text-accent-foreground"}`} />
            </div>
            <CardTitle className="text-lg">Schedule</CardTitle>
          </div>
          {hasConnectedCalendar ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Not Connected
            </Badge>
          )}
        </div>
        <CardDescription>
          {hasConnectedCalendar
            ? "Your calendar is synced. The AI won't double-book."
            : `Connect your calendar so AI never books over real ${terms.bookings}.`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasConnectedCalendar ? (
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p className="text-muted-foreground">
                Provider: <span className="font-medium text-foreground capitalize">{connectedCalendar?.provider}</span>
              </p>
              {lastSync && (
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  Last synced: {lastSync}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/app/integrations/schedule")}>
              Manage
            </Button>
          </div>
        ) : (
          <Button onClick={() => navigate("/app/integrations/schedule")} className="w-full">
            Connect Schedule
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
