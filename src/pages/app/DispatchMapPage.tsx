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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTechnicianLocations, useAutoLocationReporting } from "@/hooks/useTechnicianLocations";

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
  const { locations, isLoading, refetch } = useTechnicianLocations();
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        icon={<MapPin className="h-5 w-5" />}
        title="Dispatch Map"
        description="Real-time technician locations and tracking"
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

      {/* Map Placeholder - In production, integrate mapbox-gl here */}
      <Card className="mb-6">
        <CardContent className="p-0">
          <div className="h-[400px] bg-muted/50 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Simple visual representation */}
            <div className="absolute inset-0 opacity-10">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {locations.length === 0 ? (
              <div className="text-center z-10">
                <MapPin className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No technicians online</h3>
                <p className="text-muted-foreground">
                  Technician locations will appear here when they share their location.
                </p>
              </div>
            ) : (
              <div className="text-center z-10">
                <div className="flex items-center justify-center gap-2 mb-4">
                  {locations.map((loc, i) => (
                    <div
                      key={loc.user_id}
                      className="h-4 w-4 rounded-full bg-primary animate-pulse"
                      style={{ animationDelay: `${i * 200}ms` }}
                    />
                  ))}
                </div>
                <h3 className="text-lg font-medium">{locations.length} technicians online</h3>
                <p className="text-sm text-muted-foreground">
                  Last updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Full map view requires Mapbox GL JS integration
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Technician List */}
      <Card>
        <CardHeader>
          <CardTitle>Technician Locations</CardTitle>
          <CardDescription>
            Live location data from field technicians
          </CardDescription>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Signal className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No location data available</p>
              <p className="text-sm">Enable location sharing to see technician positions</p>
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
                        <p className="font-medium">Technician</p>
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
