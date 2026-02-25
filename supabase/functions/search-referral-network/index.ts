/**
 * search-referral-network: Core matching engine for the referral network.
 *
 * Finds the best matching business on the Flux Receptionist platform when the
 * current business can't help a caller (out of area, wrong service, etc.).
 *
 * Auth: requireInternalSecret (called by elevenlabs-search-referral-network proxy)
 *
 * Algorithm (target: <2s):
 *  1. Resolve caller location → lat/lng (area code fallback)
 *  2. Match service_requested against industry catalog tags
 *  3. Query opted-in candidates with geographic bounding box
 *  4. Score & rank candidates (geo + service + availability + quality)
 *  5. Create referral_transfers audit record
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-closeloop-secret",
};

// ── Area code → approximate lat/lng for fallback geocoding ──
// Top 50 US area codes (enough for MVP)
const AREA_CODE_GEO: Record<string, [number, number]> = {
  "201": [40.88, -74.16], "212": [40.78, -73.97], "213": [34.05, -118.24],
  "214": [32.78, -96.80], "215": [39.95, -75.17], "216": [41.50, -81.69],
  "224": [42.18, -87.80], "240": [39.14, -77.22], "248": [42.60, -83.36],
  "301": [39.00, -76.95], "302": [39.16, -75.52], "303": [39.74, -104.99],
  "305": [25.76, -80.19], "310": [33.94, -118.40], "312": [41.88, -87.63],
  "313": [42.33, -83.05], "314": [38.63, -90.20], "315": [43.05, -76.15],
  "321": [28.54, -80.67], "323": [34.05, -118.25], "347": [40.65, -73.95],
  "404": [33.75, -84.39], "408": [37.34, -121.89], "410": [39.28, -76.62],
  "412": [40.44, -79.98], "414": [43.04, -87.91], "415": [37.77, -122.42],
  "469": [32.78, -96.80], "480": [33.42, -111.82], "484": [40.05, -75.47],
  "501": [34.75, -92.29], "502": [38.25, -85.76], "503": [45.52, -122.68],
  "504": [29.95, -90.07], "508": [42.27, -71.80], "510": [37.80, -122.27],
  "512": [30.27, -97.74], "516": [40.74, -73.59], "551": [40.74, -74.07],
  "562": [33.77, -118.19], "571": [38.88, -77.17], "602": [33.45, -112.07],
  "609": [40.22, -74.76], "610": [40.01, -75.46], "617": [42.36, -71.06],
  "619": [32.72, -117.16], "626": [34.14, -118.13], "630": [41.79, -88.07],
  "631": [40.79, -73.03], "646": [40.75, -73.98], "650": [37.49, -122.23],
  "678": [33.75, -84.39], "702": [36.17, -115.14], "703": [38.87, -77.23],
  "704": [35.23, -80.84], "706": [33.47, -82.01], "707": [38.44, -122.71],
  "713": [29.76, -95.37], "714": [33.84, -117.86], "718": [40.65, -73.95],
  "720": [39.74, -104.99], "732": [40.44, -74.37], "734": [42.28, -83.74],
  "737": [30.27, -97.74], "747": [34.18, -118.31], "754": [26.12, -80.14],
  "757": [36.85, -76.29], "760": [33.12, -117.08], "770": [33.98, -84.09],
  "773": [41.88, -87.63], "786": [25.76, -80.19], "801": [40.76, -111.89],
  "802": [44.26, -72.58], "803": [34.00, -81.03], "804": [37.54, -77.44],
  "805": [34.27, -119.23], "808": [21.31, -157.86], "813": [27.95, -82.46],
  "814": [40.80, -78.79], "815": [41.53, -88.10], "816": [39.10, -94.58],
  "818": [34.18, -118.31], "832": [29.76, -95.37], "843": [32.78, -79.93],
  "847": [42.17, -87.84], "848": [40.44, -74.37], "856": [39.90, -75.04],
  "858": [32.90, -117.20], "860": [41.76, -72.68], "862": [40.74, -74.17],
  "901": [35.15, -90.05], "903": [32.35, -95.30], "904": [30.33, -81.66],
  "908": [40.64, -74.41], "909": [34.06, -117.59], "910": [34.23, -78.00],
  "913": [38.95, -94.68], "914": [41.03, -73.76], "916": [38.58, -121.49],
  "917": [40.75, -73.97], "918": [36.15, -95.99], "919": [35.79, -78.64],
  "920": [44.02, -88.54], "925": [37.90, -122.06], "929": [40.65, -73.95],
  "936": [30.72, -95.55], "940": [33.21, -97.13], "941": [27.34, -82.53],
  "949": [33.68, -117.83], "951": [33.95, -117.40], "954": [26.12, -80.14],
  "956": [27.51, -99.51], "972": [32.78, -96.80], "973": [40.79, -74.23],
  "978": [42.53, -71.14], "980": [35.23, -80.84],
};

// ── ZIP code prefix → approximate lat/lng (3-digit prefix regions) ──
const ZIP_PREFIX_GEO: Record<string, [number, number]> = {
  "070": [40.86, -74.16], "071": [40.74, -74.17], "072": [40.85, -74.23],
  "073": [40.83, -74.38], "074": [41.00, -74.31], "075": [40.98, -74.12],
  "076": [40.88, -74.05], "077": [40.57, -74.28], "078": [40.63, -74.41],
  "079": [40.86, -74.56], "080": [39.95, -74.90], "081": [39.94, -75.04],
  "082": [39.70, -75.10], "083": [39.37, -74.44], "084": [39.79, -75.11],
  "085": [40.22, -74.76], "086": [40.35, -74.65], "087": [40.44, -74.37],
  "088": [40.53, -74.47], "089": [40.48, -74.28],
  "100": [40.78, -73.97], "101": [40.75, -73.99], "104": [40.84, -73.94],
  "110": [40.75, -73.62], "112": [40.68, -73.94], "113": [40.67, -73.94],
  "117": [40.79, -73.03], "119": [40.62, -73.74],
};

interface SearchRequest {
  source_tenant_id: string;
  caller_location: string;
  service_needed: string;
  reason: string;
  urgency?: string;
  caller_name?: string;
  caller_phone_e164?: string;
  source_session_id?: string;
  twilio_call_sid?: string;
}

interface ScoredCandidate {
  tenant_id: string;
  business_name: string;
  geo_score: number;
  service_score: number;
  availability_score: number;
  quality_score: number;
  partner_bonus: number;
  total_score: number;
  distance_miles: number;
  network_services: string[];
  intro_style: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: internal secret only
    const secret = req.headers.get("x-closeloop-secret");
    const expected = Deno.env.get("CLOSELOOP_INTERNAL_SECRET");
    if (!secret || secret !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SearchRequest = await req.json();
    const {
      source_tenant_id,
      caller_location,
      service_needed,
      reason,
      urgency,
      caller_name,
      caller_phone_e164,
      source_session_id,
      twilio_call_sid,
    } = body;

    console.log(
      `[search-referral-network] source=${source_tenant_id?.slice(0, 8)}, ` +
        `service="${service_needed}", location="${caller_location}", reason=${reason}`
    );

    if (!source_tenant_id || !caller_location || !service_needed) {
      return new Response(
        JSON.stringify({
          found: false,
          message:
            "I need more information to find someone nearby. Could you tell me what service you need and your location?",
          candidates: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Step 1: Geocode caller location ──
    const callerGeo = geocodeLocation(caller_location);
    console.log(
      `[search-referral-network] Geocoded: lat=${callerGeo?.lat}, lng=${callerGeo?.lng}, method=${callerGeo?.method}`
    );

    // ── Step 2: Fetch source tenant info (for filters) ──
    const [sourceSettingsResult, sourceTenantResult] = await Promise.all([
      supabase
        .from("referral_network_settings")
        .select("blocked_tenant_ids, preferred_partners, same_industry_ok")
        .eq("tenant_id", source_tenant_id)
        .maybeSingle(),
      supabase
        .from("tenants")
        .select("business_mode, industry, timezone")
        .eq("id", source_tenant_id)
        .single(),
    ]);

    const sourceSettings = sourceSettingsResult.data;
    const sourceTenant = sourceTenantResult.data;
    const blockedIds: string[] = (sourceSettings?.blocked_tenant_ids as string[]) || [];
    const preferredPartners: string[] =
      (sourceSettings?.preferred_partners as string[]) || [];
    const sameIndustryOk = sourceSettings?.same_industry_ok ?? false;

    // ── Step 3: Query candidates ──
    // Bounding box filter: ~1.5° lat (~103mi) and ~2° lng (~variable by lat)
    let query = supabase
      .from("referral_network_settings")
      .select(
        "tenant_id, network_services, network_categories, network_tags, " +
          "network_lat, network_lng, network_radius_miles, quality_score, " +
          "intro_style, max_referrals_per_day, referrals_today, " +
          "preferred_partners, hipaa_compliant, same_industry_ok"
      )
      .eq("enabled", true)
      .eq("accept_referrals", true)
      .eq("go_live_ready", true)
      .eq("voice_ai_active", true)
      .neq("tenant_id", source_tenant_id);

    // Geographic bounding box (if we have caller coordinates)
    if (callerGeo) {
      query = query
        .gte("network_lat", callerGeo.lat - 1.5)
        .lte("network_lat", callerGeo.lat + 1.5)
        .gte("network_lng", callerGeo.lng - 2.0)
        .lte("network_lng", callerGeo.lng + 2.0);
    }

    const { data: candidates, error: candidatesError } = await query.limit(50);

    if (candidatesError) {
      console.error("[search-referral-network] Query error:", candidatesError);
    }

    if (!candidates || candidates.length === 0) {
      // Create a no-match record
      await supabase.from("referral_transfers").insert({
        source_tenant_id,
        source_session_id: source_session_id || null,
        caller_phone_e164: caller_phone_e164 || "unknown",
        caller_name: caller_name || null,
        twilio_call_sid: twilio_call_sid || null,
        service_requested: service_needed,
        caller_location,
        caller_lat: callerGeo?.lat || null,
        caller_lng: callerGeo?.lng || null,
        referral_reason: reason,
        candidates_found: 0,
        status: "no_match",
      });

      return new Response(
        JSON.stringify({
          found: false,
          message:
            "I wasn't able to find anyone nearby who can help right now. Can I take your info and have someone follow up?",
          candidates: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 4: Fetch tenant names for candidates ──
    const candidateTenantIds = candidates.map((c) => c.tenant_id);
    const { data: tenantNames } = await supabase
      .from("tenants")
      .select("id, business_name, business_mode, industry, timezone, hours_json")
      .in("id", candidateTenantIds);

    const tenantMap = new Map(
      (tenantNames || []).map((t) => [t.id, t])
    );

    // ── Step 5: Score & rank ──
    const serviceNeedLower = service_needed.toLowerCase();
    const scored: ScoredCandidate[] = [];

    for (const candidate of candidates) {
      const tenant = tenantMap.get(candidate.tenant_id);
      if (!tenant) continue;

      // Filter: blocked tenants
      if (blockedIds.includes(candidate.tenant_id)) continue;

      // Filter: daily limit
      if (
        candidate.referrals_today >= candidate.max_referrals_per_day
      )
        continue;

      // Filter: same industry (unless allowed)
      if (
        !sameIndustryOk &&
        !candidate.same_industry_ok &&
        sourceTenant?.industry &&
        tenant.industry === sourceTenant.industry_slug
      )
        continue;

      // Filter: HIPAA — medical sources require HIPAA-compliant targets
      if (sourceTenant?.business_mode === "medical" && !candidate.hipaa_compliant)
        continue;

      // Geographic score (0-30)
      let geoScore = 10; // Default if no coordinates
      let distanceMiles = 50; // Default

      if (callerGeo && candidate.network_lat && candidate.network_lng) {
        distanceMiles = haversineDistance(
          callerGeo.lat,
          callerGeo.lng,
          candidate.network_lat,
          candidate.network_lng
        );

        // Hard cutoff at target's radius
        if (distanceMiles > (candidate.network_radius_miles || 50)) continue;

        if (distanceMiles <= 5) geoScore = 30;
        else if (distanceMiles <= 15) geoScore = 25;
        else if (distanceMiles <= 30) geoScore = 20;
        else if (distanceMiles <= 50) geoScore = 15;
        else geoScore = 10;
      }

      // Service score (0-35)
      let serviceScore = 0;
      const networkServices = (candidate.network_services || []) as string[];
      const networkCategories = (candidate.network_categories || []) as string[];
      const networkTags = (candidate.network_tags || []) as string[];

      // Direct service name match
      if (
        networkServices.some(
          (s: string) =>
            s.toLowerCase().includes(serviceNeedLower) ||
            serviceNeedLower.includes(s.toLowerCase())
        )
      ) {
        serviceScore = 35;
      }
      // Category match
      else if (
        networkCategories.some(
          (c: string) =>
            c.toLowerCase().includes(serviceNeedLower) ||
            serviceNeedLower.includes(c.toLowerCase())
        )
      ) {
        serviceScore = 25;
      }
      // Tag match
      else if (
        networkTags.some(
          (t: string) =>
            t.toLowerCase().includes(serviceNeedLower) ||
            serviceNeedLower.includes(t.toLowerCase())
        )
      ) {
        serviceScore = 15;
      }
      // Business mode match (broad)
      else if (
        tenant.business_mode === sourceTenant?.business_mode
      ) {
        serviceScore = 10;
      }

      if (serviceScore === 0) continue; // No service relevance at all

      // Availability score (0-15)
      let availabilityScore = 3; // Default: after-hours with AI
      if (tenant.hours_json) {
        const tz = tenant.timezone || "America/New_York";
        if (isBusinessOpenNow(tenant.hours_json, tz)) {
          availabilityScore = 15;
        }
      }

      // Quality score (0-20)
      const qualityScore = Math.min(20, ((candidate.quality_score || 0) / 100) * 20);

      // Partner bonus (+10)
      const partnerBonus = preferredPartners.includes(candidate.tenant_id) ? 10 : 0;

      const totalScore =
        geoScore + serviceScore + availabilityScore + qualityScore + partnerBonus;

      scored.push({
        tenant_id: candidate.tenant_id,
        business_name: tenant.business_name || "A nearby business",
        geo_score: geoScore,
        service_score: serviceScore,
        availability_score: availabilityScore,
        quality_score: qualityScore,
        partner_bonus: partnerBonus,
        total_score: totalScore,
        distance_miles: Math.round(distanceMiles * 10) / 10,
        network_services: networkServices,
        intro_style: candidate.intro_style || "enthusiastic",
      });
    }

    // Sort by total score descending
    scored.sort((a, b) => b.total_score - a.total_score);
    const topCandidates = scored.slice(0, 3);

    if (topCandidates.length === 0) {
      await supabase.from("referral_transfers").insert({
        source_tenant_id,
        source_session_id: source_session_id || null,
        caller_phone_e164: caller_phone_e164 || "unknown",
        caller_name: caller_name || null,
        twilio_call_sid: twilio_call_sid || null,
        service_requested: service_needed,
        caller_location,
        caller_lat: callerGeo?.lat || null,
        caller_lng: callerGeo?.lng || null,
        referral_reason: reason,
        candidates_found: 0,
        status: "no_match",
      });

      return new Response(
        JSON.stringify({
          found: false,
          message:
            "I couldn't find someone nearby right now. Can I take your info and have someone call you back?",
          candidates: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 6: Create referral_transfers record ──
    const best = topCandidates[0];
    const { data: transferRecord } = await supabase
      .from("referral_transfers")
      .insert({
        source_tenant_id,
        source_session_id: source_session_id || null,
        target_tenant_id: best.tenant_id,
        target_business_name: best.business_name,
        caller_phone_e164: caller_phone_e164 || "unknown",
        caller_name: caller_name || null,
        twilio_call_sid: twilio_call_sid || null,
        service_requested: service_needed,
        caller_location,
        caller_lat: callerGeo?.lat || null,
        caller_lng: callerGeo?.lng || null,
        referral_reason: reason,
        candidates_found: topCandidates.length,
        match_scores_json: topCandidates.map((c) => ({
          tenant_id: c.tenant_id,
          name: c.business_name,
          score: c.total_score,
          distance: c.distance_miles,
        })),
        status: "matched",
      })
      .select("id")
      .single();

    // Build speech-ready introduction
    const distanceStr =
      best.distance_miles <= 1
        ? "right near you"
        : best.distance_miles <= 5
          ? `about ${Math.round(best.distance_miles)} miles from you`
          : `about ${Math.round(best.distance_miles)} miles away`;

    const availStr =
      best.availability_score >= 15
        ? " and they're open right now"
        : "";

    let introMessage: string;
    switch (best.intro_style) {
      case "minimal":
        introMessage = `${best.business_name} is nearby and can help. Should I connect you?`;
        break;
      case "neutral":
        introMessage = `I found ${best.business_name}, ${distanceStr}. They handle ${service_needed}${availStr}. Want me to transfer you?`;
        break;
      case "enthusiastic":
      default:
        introMessage = `Great news! I found ${best.business_name} — they're ${distanceStr}${availStr}. They do excellent work with ${service_needed}. Would you like me to connect you?`;
        break;
    }

    console.log(
      `[search-referral-network] Match found: ${best.business_name} ` +
        `(score=${best.total_score}, dist=${best.distance_miles}mi)`
    );

    return new Response(
      JSON.stringify({
        found: true,
        message: introMessage,
        business_name: best.business_name,
        target_tenant_id: best.tenant_id,
        transfer_id: transferRecord?.id || "",
        distance_miles: best.distance_miles,
        total_score: best.total_score,
        candidates_count: topCandidates.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[search-referral-network] Error:", error);
    return new Response(
      JSON.stringify({
        found: false,
        message:
          "I had trouble searching right now. Can I take your info and have someone follow up?",
        candidates: [],
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Helper: Geocode from text (ZIP, area code, city) ──
function geocodeLocation(
  location: string
): { lat: number; lng: number; method: string } | null {
  // Try ZIP code
  const zipMatch = location.match(/\b(\d{5})(-\d{4})?\b/);
  if (zipMatch) {
    const prefix = zipMatch[1].substring(0, 3);
    const geo = ZIP_PREFIX_GEO[prefix];
    if (geo) return { lat: geo[0], lng: geo[1], method: "zip_prefix" };
  }

  // Try area code from phone number
  const phoneMatch = location.match(/\(?(\d{3})\)?/);
  if (phoneMatch) {
    const geo = AREA_CODE_GEO[phoneMatch[1]];
    if (geo) return { lat: geo[0], lng: geo[1], method: "area_code" };
  }

  // Try well-known city names (basic list)
  const cityLower = location.toLowerCase().trim();
  const CITY_GEO: Record<string, [number, number]> = {
    "new york": [40.71, -74.01], "los angeles": [34.05, -118.24],
    "chicago": [41.88, -87.63], "houston": [29.76, -95.37],
    "phoenix": [33.45, -112.07], "philadelphia": [39.95, -75.17],
    "san antonio": [29.42, -98.49], "san diego": [32.72, -117.16],
    "dallas": [32.78, -96.80], "san jose": [37.34, -121.89],
    "austin": [30.27, -97.74], "jacksonville": [30.33, -81.66],
    "san francisco": [37.77, -122.42], "seattle": [47.61, -122.33],
    "denver": [39.74, -104.99], "nashville": [36.16, -86.78],
    "miami": [25.76, -80.19], "atlanta": [33.75, -84.39],
    "boston": [42.36, -71.06], "newark": [40.74, -74.17],
    "jersey city": [40.73, -74.08], "paterson": [40.92, -74.17],
    "trenton": [40.22, -74.76], "camden": [39.94, -75.12],
    "portland": [45.52, -122.68], "las vegas": [36.17, -115.14],
    "detroit": [42.33, -83.05], "minneapolis": [44.98, -93.27],
    "tampa": [27.95, -82.46], "orlando": [28.54, -81.38],
    "charlotte": [35.23, -80.84], "raleigh": [35.79, -78.64],
    "pittsburgh": [40.44, -79.98], "cincinnati": [39.10, -84.51],
    "cleveland": [41.50, -81.69], "indianapolis": [39.77, -86.16],
    "columbus": [39.96, -82.99], "st louis": [38.63, -90.20],
    "kansas city": [39.10, -94.58], "milwaukee": [43.04, -87.91],
    "sacramento": [38.58, -121.49], "baltimore": [39.28, -76.62],
    "washington": [38.91, -77.04], "dc": [38.91, -77.04],
  };

  for (const [city, geo] of Object.entries(CITY_GEO)) {
    if (cityLower.includes(city)) {
      return { lat: geo[0], lng: geo[1], method: "city_name" };
    }
  }

  return null;
}

// ── Helper: Haversine distance in miles ──
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ── Helper: Check if business is open now ──
function isBusinessOpenNow(
  hoursJson: Record<string, unknown>,
  timezone: string
): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
    });
    const dayName = formatter.format(now).toLowerCase();

    const dayHours = hoursJson[dayName] as
      | { is_open?: boolean; open?: string; close?: string }
      | undefined;
    if (!dayHours || dayHours.is_open === false) return false;

    if (!dayHours.open || !dayHours.close) return true; // Open but no specific hours

    const timeFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const currentTime = timeFormatter.format(now);
    return currentTime >= dayHours.open && currentTime <= dayHours.close;
  } catch {
    return false;
  }
}
