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
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "POST only" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const body: GeocodeRequest = await req.json();
    const { tenant_id, address_text } = body;

    if (!tenant_id || !address_text?.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing tenant_id or address_text" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has access to tenant
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Check tenant membership using tenant_users table
    const { data: membership, error: memberError } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (memberError || !membership) {
      console.error("[mapbox-geocode] Tenant access denied:", memberError?.message || "No membership found");
      return new Response(
        JSON.stringify({ error: "Tenant access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Mapbox token
    const accessToken = Deno.env.get("MAPBOX_ACCESS_TOKEN");
    if (!accessToken) {
      console.error("[mapbox-geocode] MAPBOX_ACCESS_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Geocoding service not configured" } as GeocodeResponse),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ lat: null, lng: null, place_name: null, error: "Geocoding service error" } as GeocodeResponse),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return new Response(
        JSON.stringify({ lat: null, lng: null, place_name: null, error: "Address not found" } as GeocodeResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[mapbox-geocode] Error:", error);
    return new Response(
      JSON.stringify({
        lat: null,
        lng: null,
        place_name: null,
        error: error instanceof Error ? error.message : "Unknown error",
      } as GeocodeResponse),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
