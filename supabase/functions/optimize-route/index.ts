import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JobLocation {
  id: string;
  name?: string;
  latitude: number;
  longitude: number;
  duration_minutes?: number; // Estimated time at stop
  time_window?: {
    start: string; // ISO timestamp
    end: string;
  };
}

interface OptimizeRouteRequest {
  technician_id: string;
  start_location?: {
    latitude: number;
    longitude: number;
  };
  end_location?: {
    latitude: number;
    longitude: number;
  };
  jobs: JobLocation[];
  profile?: "driving" | "driving-traffic" | "walking" | "cycling";
  roundtrip?: boolean;
}

interface OptimizedStop {
  job_id: string;
  name?: string;
  latitude: number;
  longitude: number;
  sequence: number;
  arrival_time?: string;
  departure_time?: string;
  distance_meters: number;
  duration_seconds: number;
}

interface OptimizeRouteResponse {
  success: boolean;
  optimized_route: OptimizedStop[];
  total_distance_meters: number;
  total_duration_seconds: number;
  waypoints_order: string[];
  geometry?: string; // Encoded polyline
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: OptimizeRouteRequest = await req.json();
    const { jobs, start_location, end_location, profile = "driving", roundtrip = false } = payload;

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ error: "No jobs provided for optimization" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mapboxToken = Deno.env.get("MAPBOX_ACCESS_TOKEN");
    if (!mapboxToken) {
      return new Response(
        JSON.stringify({ error: "Mapbox access token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build coordinates string for Mapbox API
    // Format: lon1,lat1;lon2,lat2;...
    const coordinates: string[] = [];
    const distributionIndices: number[] = [];

    // Add start location (depot)
    if (start_location) {
      coordinates.push(`${start_location.longitude},${start_location.latitude}`);
    } else if (jobs.length > 0) {
      // Use first job as start if no start specified
      coordinates.push(`${jobs[0].longitude},${jobs[0].latitude}`);
    }

    // Add job locations
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      coordinates.push(`${job.longitude},${job.latitude}`);
      distributionIndices.push(coordinates.length - 1);
    }

    // Add end location if different from start and roundtrip is false
    if (end_location && !roundtrip) {
      coordinates.push(`${end_location.longitude},${end_location.latitude}`);
    }

    // If only 1-2 jobs, no optimization needed
    if (jobs.length <= 2) {
      const optimizedRoute: OptimizedStop[] = jobs.map((job, index) => ({
        job_id: job.id,
        name: job.name,
        latitude: job.latitude,
        longitude: job.longitude,
        sequence: index + 1,
        distance_meters: 0,
        duration_seconds: 0,
      }));

      return new Response(
        JSON.stringify({
          success: true,
          optimized_route: optimizedRoute,
          total_distance_meters: 0,
          total_duration_seconds: 0,
          waypoints_order: jobs.map((j) => j.id),
          message: "Route has 2 or fewer stops, no optimization needed",
        } as OptimizeRouteResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Mapbox Optimization API
    const mapboxProfile = profile === "driving-traffic" ? "mapbox/driving-traffic" : `mapbox/${profile}`;
    const coordinatesStr = coordinates.join(";");

    // Build distributions parameter (which jobs to visit)
    // Format: pickup_index,delivery_index;... but for simple stops: 0,1;0,2;0,3 (depot to each stop)
    const distributions = distributionIndices.map((idx) => `0,${idx}`).join(";");

    // Use the Optimization API v1
    const optimizationUrl = `https://api.mapbox.com/optimized-trips/v1/${mapboxProfile}/${coordinatesStr}?` +
      new URLSearchParams({
        access_token: mapboxToken,
        roundtrip: roundtrip.toString(),
        source: "first",
        destination: roundtrip ? "last" : (end_location ? "last" : "any"),
        geometries: "polyline",
        overview: "full",
      });

    console.log("Calling Mapbox Optimization API...");

    const response = await fetch(optimizationUrl);
    const data = await response.json();

    if (data.code !== "Ok") {
      console.error("Mapbox API error:", data);
      return new Response(
        JSON.stringify({
          error: "Route optimization failed",
          details: data.message || data.code
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract the optimized trip
    const trip = data.trips?.[0];
    if (!trip) {
      return new Response(
        JSON.stringify({ error: "No optimized trip returned" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map waypoints back to jobs
    const waypoints = data.waypoints || [];
    const optimizedRoute: OptimizedStop[] = [];
    const waypointsOrder: string[] = [];

    // The waypoints are returned in input order, but with waypoint_index showing optimized order
    const sortedWaypoints = [...waypoints]
      .filter((wp: any) => wp.waypoint_index !== undefined)
      .sort((a: any, b: any) => a.waypoint_index - b.waypoint_index);

    let cumulativeDistance = 0;
    let cumulativeDuration = 0;

    for (const wp of sortedWaypoints) {
      // Skip start/end depot
      const originalIndex = waypoints.indexOf(wp);
      if (start_location && originalIndex === 0) continue;
      if (end_location && !roundtrip && originalIndex === waypoints.length - 1) continue;

      // Find corresponding job
      const jobIndex = start_location ? originalIndex - 1 : originalIndex;
      if (jobIndex < 0 || jobIndex >= jobs.length) continue;

      const job = jobs[jobIndex];

      // Get leg info if available
      const legIndex = wp.waypoint_index > 0 ? wp.waypoint_index - 1 : 0;
      const leg = trip.legs?.[legIndex];

      if (leg) {
        cumulativeDistance += leg.distance || 0;
        cumulativeDuration += leg.duration || 0;
      }

      optimizedRoute.push({
        job_id: job.id,
        name: job.name,
        latitude: job.latitude,
        longitude: job.longitude,
        sequence: optimizedRoute.length + 1,
        distance_meters: Math.round(cumulativeDistance),
        duration_seconds: Math.round(cumulativeDuration),
      });

      waypointsOrder.push(job.id);
    }

    // If optimized route is empty, fall back to original order
    if (optimizedRoute.length === 0) {
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        optimizedRoute.push({
          job_id: job.id,
          name: job.name,
          latitude: job.latitude,
          longitude: job.longitude,
          sequence: i + 1,
          distance_meters: 0,
          duration_seconds: 0,
        });
        waypointsOrder.push(job.id);
      }
    }

    const result: OptimizeRouteResponse = {
      success: true,
      optimized_route: optimizedRoute,
      total_distance_meters: Math.round(trip.distance || 0),
      total_duration_seconds: Math.round(trip.duration || 0),
      waypoints_order: waypointsOrder,
      geometry: trip.geometry,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error optimizing route:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
