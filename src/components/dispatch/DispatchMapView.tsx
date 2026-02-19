/**
 * DispatchMapView — Renders technician locations on a Mapbox GL map.
 */
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Loader2 } from "lucide-react";

interface TechLocation {
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  speed_mph: number | null;
  recorded_at: string;
}

interface DispatchMapViewProps {
  token: string;
  locations: TechLocation[];
}

export function DispatchMapView({ token, locations }: DispatchMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = token;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-98.5, 39.8], // center of US
      zoom: 4,
    });

    m.addControl(new mapboxgl.NavigationControl(), "top-right");

    m.on("load", () => {
      setMapReady(true);
    });

    map.current = m;

    return () => {
      m.remove();
      map.current = null;
    };
  }, [token]);

  // Update markers when locations change
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (locations.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();

    locations.forEach((loc) => {
      // Create custom marker element
      const el = document.createElement("div");
      el.className = "dispatch-marker";
      el.style.width = "36px";
      el.style.height = "36px";
      el.style.borderRadius = "50%";
      el.style.background = "hsl(230 70% 62%)";
      el.style.border = "3px solid hsl(230 70% 80%)";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.4)";
      el.style.cursor = "pointer";

      // Inner dot
      const dot = document.createElement("div");
      dot.style.width = "10px";
      dot.style.height = "10px";
      dot.style.borderRadius = "50%";
      dot.style.background = "white";
      el.appendChild(dot);

      // Popup
      const speedText = loc.speed_mph && loc.speed_mph > 0
        ? `<br/><strong>Speed:</strong> ${Math.round(loc.speed_mph)} mph`
        : "";
      const timeAgo = getTimeAgo(loc.recorded_at);

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div style="font-family: system-ui; font-size: 13px; line-height: 1.5; color: #e5e5e5;">
          <strong style="color: white;">Technician</strong>
          <br/><strong>Updated:</strong> ${timeAgo}
          ${speedText}
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([loc.longitude, loc.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
      bounds.extend([loc.longitude, loc.latitude]);
    });

    // Fit bounds with padding
    if (locations.length === 1) {
      map.current.flyTo({ center: [locations[0].longitude, locations[0].latitude], zoom: 13 });
    } else {
      map.current.fitBounds(bounds, { padding: 80, maxZoom: 14 });
    }
  }, [locations, mapReady]);

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-border" style={{ height: 480 }}>
      <div ref={mapContainer} className="w-full h-full" />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
