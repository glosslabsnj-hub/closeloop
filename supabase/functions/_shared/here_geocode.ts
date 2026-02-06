/**
 * HERE Geocoding API integration
 *
 * HERE provides superior geocoding for:
 * - Cross streets (e.g., "Main St and Oak Ave")
 * - Highway routes with mile markers (e.g., "Route 539, mile marker 15")
 * - Intersections and landmarks
 * - Dispatch/towing use cases
 *
 * Requires HERE_API_KEY environment variable.
 */

export interface HereGeocodeResult {
  ok: boolean;
  lat: number | null;
  lng: number | null;
  place_name: string | null;
  relevance: number;
  match_level: string | null;
  error: string | null;
  // For debugging
  raw_result_type: string | null;
}

interface HereGeocodeResponse {
  items?: Array<{
    title: string;
    position: {
      lat: number;
      lng: number;
    };
    scoring?: {
      queryScore: number;
      fieldScore?: {
        streets?: number[];
        houseNumber?: number;
      };
    };
    resultType?: string;
    address?: {
      label?: string;
      countryCode?: string;
      countryName?: string;
      state?: string;
      county?: string;
      city?: string;
      district?: string;
      street?: string;
      postalCode?: string;
      houseNumber?: string;
    };
  }>;
  error?: string;
  error_description?: string;
}

/**
 * Geocode an address using HERE Geocoding & Search API
 *
 * @param address - The address to geocode
 * @param options - Optional parameters
 * @returns Geocoding result with coordinates and confidence
 */
export async function geocodeWithHere(
  address: string,
  options?: {
    /** State hint to improve accuracy (e.g., "NJ", "New Jersey") */
    stateHint?: string;
    /** Country code for regional bias (default: "USA") */
    countryCode?: string;
    /** Optional lat/lng to bias results toward */
    proximityLat?: number;
    proximityLng?: number;
    /** Radius for proximity bias in meters (default: 50000 = 50km) */
    proximityRadius?: number;
  }
): Promise<HereGeocodeResult> {
  const apiKey = Deno.env.get("HERE_API_KEY");

  if (!apiKey) {
    console.error("[here_geocode] HERE_API_KEY not configured");
    return {
      ok: false,
      lat: null,
      lng: null,
      place_name: null,
      relevance: 0,
      match_level: null,
      error: "HERE API key not configured",
      raw_result_type: null,
    };
  }

  try {
    // Build the query with optional state hint
    let queryAddress = address.trim();
    const stateHint = options?.stateHint;

    // Check if address already has a state
    const hasState =
      /,\s*[A-Z]{2}\b/.test(queryAddress) ||
      /\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/i.test(
        queryAddress
      );

    if (!hasState && stateHint) {
      queryAddress = `${queryAddress}, ${stateHint}`;
    }

    // Build URL with parameters
    const url = new URL("https://geocode.search.hereapi.com/v1/geocode");
    url.searchParams.set("q", queryAddress);
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("limit", "1");

    // Country filter
    if (options?.countryCode) {
      url.searchParams.set("in", `countryCode:${options.countryCode}`);
    } else {
      url.searchParams.set("in", "countryCode:USA");
    }

    // Proximity bias - helps with vague addresses near business location
    if (options?.proximityLat !== undefined && options?.proximityLng !== undefined) {
      const radius = options?.proximityRadius || 50000;
      url.searchParams.set("at", `${options.proximityLat},${options.proximityLng}`);
    }

    console.log(`[here_geocode] Geocoding: "${queryAddress.substring(0, 50)}..."`);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.error(`[here_geocode] HTTP error: ${response.status}`);
      return {
        ok: false,
        lat: null,
        lng: null,
        place_name: null,
        relevance: 0,
        match_level: null,
        error: `HERE API returned HTTP ${response.status}`,
        raw_result_type: null,
      };
    }

    const data: HereGeocodeResponse = await response.json();

    if (data.error) {
      console.error(`[here_geocode] API error: ${data.error_description || data.error}`);
      return {
        ok: false,
        lat: null,
        lng: null,
        place_name: null,
        relevance: 0,
        match_level: null,
        error: data.error_description || data.error,
        raw_result_type: null,
      };
    }

    if (!data.items || data.items.length === 0) {
      console.log(`[here_geocode] No results found for: "${queryAddress.substring(0, 50)}..."`);
      return {
        ok: false,
        lat: null,
        lng: null,
        place_name: null,
        relevance: 0,
        match_level: null,
        error: "Address not found",
        raw_result_type: null,
      };
    }

    const item = data.items[0];
    const { lat, lng } = item.position;
    const placeName = item.address?.label || item.title;
    const relevance = item.scoring?.queryScore || 0.5;
    const matchLevel = item.resultType || null;

    console.log(
      `[here_geocode] Result: lat=${lat.toFixed(5)}, lng=${lng.toFixed(5)}, relevance=${relevance.toFixed(2)}, type=${matchLevel}`
    );

    return {
      ok: true,
      lat,
      lng,
      place_name: placeName,
      relevance,
      match_level: matchLevel,
      error: null,
      raw_result_type: matchLevel,
    };
  } catch (error) {
    console.error("[here_geocode] Error:", error);
    return {
      ok: false,
      lat: null,
      lng: null,
      place_name: null,
      relevance: 0,
      match_level: null,
      error: error instanceof Error ? error.message : "HERE geocoding failed",
      raw_result_type: null,
    };
  }
}

/**
 * Special handling for cross-street queries
 * HERE is better at parsing "Main St and Oak Ave" or "Route 9 at Mile Marker 15"
 */
export function isCrossStreetOrRouteQuery(address: string): boolean {
  const lowerAddr = address.toLowerCase();

  // Cross street patterns
  const crossStreetPatterns = [
    / and /,
    / & /,
    / at /,
    /\//, // "Main St / Oak Ave"
    / corner of /,
    / intersection of /,
    / near /,
  ];

  // Route/highway patterns
  const routePatterns = [
    /\broute\s+\d+/i,
    /\brt\.?\s*\d+/i,
    /\bhwy\.?\s*\d+/i,
    /\bhighway\s+\d+/i,
    /\bi-\d+/i, // Interstate
    /\bus-\d+/i, // US route
    /\bmile\s*marker/i,
    /\bmm\s*\d+/i,
    /\bexit\s+\d+/i,
  ];

  const hasCrossStreet = crossStreetPatterns.some((p) => p.test(lowerAddr));
  const hasRoute = routePatterns.some((p) => p.test(lowerAddr));

  return hasCrossStreet || hasRoute;
}
