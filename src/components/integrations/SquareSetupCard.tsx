import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Unplug, CheckCircle2, Users, Calendar } from "lucide-react";
import { useSquareIntegration } from "@/hooks/useSquareIntegration";
import { formatDistanceToNow } from "date-fns";

export function SquareSetupCard() {
  const {
    integration,
    isLoading,
    isConnected,
    syncCustomers,
    syncAvailability,
    disconnect,
  } = useSquareIntegration();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isConnected || !integration) {
    return null;
  }

  const isSyncing = syncCustomers.isPending || syncAvailability.isPending;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://cdn.brandfetch.io/idH3E_aos0/w/400/h/400/theme/dark/icon.png"
              alt="Square"
              className="w-8 h-8 rounded-lg"
            />
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Connected to Square
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </CardTitle>
              {integration.config_json?.location_name && (
                <CardDescription>
                  Location: {integration.config_json.location_name}
                </CardDescription>
              )}
            </div>
          </div>
          <Badge variant="default">Active</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {integration.last_tested_at && (
          <p className="text-xs text-muted-foreground">
            Last verified {formatDistanceToNow(new Date(integration.last_tested_at), { addSuffix: true })}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncCustomers.mutate()}
            disabled={isSyncing}
          >
            {syncCustomers.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <Users className="h-3.5 w-3.5 mr-1" />
            )}
            Sync Customers
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncAvailability.mutate()}
            disabled={isSyncing}
          >
            {syncAvailability.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <Calendar className="h-3.5 w-3.5 mr-1" />
            )}
            Sync Availability
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => disconnect.mutate()}
            className="text-destructive hover:text-destructive"
          >
            <Unplug className="h-3.5 w-3.5 mr-1" />
            Disconnect
          </Button>
        </div>

        <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
          <p><strong>How sync works:</strong></p>
          <p>Bookings created by AI are pushed to Square Appointments</p>
          <p>Square bookings block availability in Flux automatically</p>
          <p>Customer records sync both ways</p>
        </div>
      </CardContent>
    </Card>
  );
}
