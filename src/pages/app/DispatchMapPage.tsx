import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  MapPin,
  Navigation,
  Loader2,
  RefreshCw,
  User,
  Clock,
  Signal,
  ExternalLink,
  Locate,
  Map,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTechnicianLocations, useAutoLocationReporting } from "@/hooks/useTechnicianLocations";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { DispatchMapView } from "@/components/dispatch/DispatchMapView";
import ErrorBoundary from "@/components/ErrorBoundary";

function formatCoordinate(value: number, isLat: boolean): string {
  const direction = isLat ? (value >= 0 ? "N" : "S") : (value >= 0 ? "E" : "W");
  return `${Math.abs(value).toFixed(6)}° ${direction}`;
}

function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function getAccuracyBadge(accuracy: number | null) {
  if (accuracy === null) return null;
  if (accuracy < 10) return <Badge className="bg-green-100 text-green-700">High accuracy</Badge>;
  if (accuracy < 50) return <Badge className="bg-yellow-100 text-yellow-700">Medium</Badge>;
  return <Badge className="bg-red-100 text-red-700">Low accuracy</Badge>;
}

export default function DispatchMapPage() {
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["dispatch_queue"]);
  const { locations, isLoading, refetch } = useTechnicianLocations();
  const { token: mapboxToken, isLoading: tokenLoading } = useMapboxToken();
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Enable auto location reporting when toggle is on
  useAutoLocationReporting(trackingEnabled, 60000);

  const handleRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      setLastRefresh(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  if (moduleLoading || !isAllowed) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLoading || tokenLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="Dispatch Map"
        description="Real-time driver locations and tracking"
        action={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="tracking"
                checked={trackingEnabled}
                onCheckedChange={setTrackingEnabled}
              />
              <Label htmlFor="tracking" className="text-sm">
                Share my location
              </Label>
            </div>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Live Map */}
      {mapboxToken ? (
        <div className="mb-6">
          <ErrorBoundary>
            <DispatchMapView token={mapboxToken} locations={locations} />
          </ErrorBoundary>
          {locations.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {locations.length} driver{locations.length !== 1 ? "s" : ""} online · Last updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
            </p>
          )}
        </div>
      ) : (
        <Card className="mb-6">
          <CardContent className="py-12">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Map className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Map Unavailable</h3>
                <p className="text-sm text-muted-foreground max-w-md mt-1">
                  The map could not be loaded. Please contact support.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Driver List */}
      <Card>
        <CardHeader>
          <CardTitle>Driver Locations</CardTitle>
          <CardDescription>
            Live location data from your drivers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Signal className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No location data available</p>
              <p className="text-sm">Enable location sharing to see driver positions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {locations.map((location) => (
                <div
                  key={location.user_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center relative">
                      <User className="h-6 w-6 text-primary" />
                      <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Driver</p>
                        {getAccuracyBadge(location.accuracy_meters)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Navigation className="h-3 w-3" />
                          {formatCoordinate(location.latitude, true)}, {formatCoordinate(location.longitude, false)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Updated {formatDistanceToNow(new Date(location.recorded_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {location.speed_mph !== null && location.speed_mph > 0 && (
                      <Badge variant="outline">
                        {Math.round(location.speed_mph)} mph
                      </Badge>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={getGoogleMapsUrl(location.latitude, location.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in Maps
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Sharing Info */}
      {trackingEnabled && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Locate className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">Location sharing is active</h4>
                <p className="text-sm text-muted-foreground">
                  Your location is being shared with dispatchers every 60 seconds.
                  Turn off the toggle above to stop sharing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
