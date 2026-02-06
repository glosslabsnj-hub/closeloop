/**
 * mapbox-geocode: Server-side geocoding endpoint
 *
 * Geocodes addresses using Mapbox without exposing the API token.
 * Used by Business Brain UI to set base locations.
 *
 * POST /functions/v1/mapbox-geocode
 * Body: { tenant_id: string, address_text: string }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { requireAuthedTenant } from "../_shared/tenant.ts";

interface GeocodeRequest {
  tenant_id: string;
  address_text: string;
}

interface GeocodeResponse {
  lat: number | null;
  lng: number | null;
  place_name: string | null;
  error: string | null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    if (req.method !== "POST") {
      return errorResponse("POST only", 405);
    }

    // Parse request
    const body: GeocodeRequest = await req.json();
    const { tenant_id, address_text } = body;

    if (!tenant_id || !address_text?.trim()) {
      return errorResponse("Missing tenant_id or address_text", 400);
    }

    // Verify user has access to the requested tenant
    await requireAuthedTenant(req, tenant_id);

    // Get Mapbox token
    const accessToken = Deno.env.get("MAPBOX_ACCESS_TOKEN");
    if (!accessToken) {
      console.error("[mapbox-geocode] MAPBOX_ACCESS_TOKEN not configured");
      return errorResponse("Geocoding service not configured", 503);
    }

    // Call Mapbox Geocoding API
    const encodedAddress = encodeURIComponent(address_text.trim());
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${accessToken}&limit=1&types=address,poi,place,locality`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.error(`[mapbox-geocode] Mapbox API error: ${response.status}`);
      return jsonResponse({ lat: null, lng: null, place_name: null, error: "Geocoding service error" } as GeocodeResponse, 502);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return jsonResponse({ lat: null, lng: null, place_name: null, error: "Address not found" } as GeocodeResponse);
    }

    const feature = data.features[0];
    const [lng, lat] = feature.center;
    const placeName = feature.place_name;

    // Log geocode (no PII - just tenant)
    console.log(`[mapbox-geocode] Geocoded address for tenant ${tenant_id.substring(0, 8)}...`);

    const result: GeocodeResponse = {
      lat,
      lng,
      place_name: placeName,
      error: null,
    };

    return jsonResponse(result);
  } catch (error) {
    console.error("[mapbox-geocode] Error:", error);
    return jsonResponse({
      lat: null,
      lng: null,
      place_name: null,
      error: error instanceof Error ? error.message : "Unknown error",
    } as GeocodeResponse, 500);
  }
});
