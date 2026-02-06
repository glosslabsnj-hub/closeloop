import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CheckImpoundRequest {
  tenant_id: string;
  license_plate?: string;
  license_plate_state?: string;
  vin?: string;
  vehicle_description?: string;
  towed_date?: string;
}

interface VehicleResult {
  id: string;
  license_plate: string | null;
  license_plate_state: string | null;
  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  towed_from: string | null;
  towed_at: string;
  days_in_lot: number;
  status: string;
}

interface LotResult {
  name: string;
  address: string;
  phone: string | null;
}

// Normalize license plate: remove spaces, dashes, convert to uppercase
function normalizePlate(plate: string): string {
  return plate.replace(/[\s\-\.]/g, "").toUpperCase();
}

// Format date for speaking
function formatDateForSpeech(dateStr: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  return date.toLocaleDateString("en-US", options);
}

// Calculate days between two dates
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor(Math.abs((date2.getTime() - date1.getTime()) / oneDay));
}

// Parse vehicle description for fuzzy matching
function parseVehicleDescription(desc: string): {
  color?: string;
  make?: string;
  model?: string;
  year?: string;
} {
  const words = desc.toLowerCase().split(/\s+/);
  const colors = [
    "red", "blue", "green", "black", "white", "silver", "gray", "grey",
    "gold", "brown", "tan", "beige", "orange", "yellow", "purple", "maroon",
  ];
  const makes = [
    "honda", "toyota", "ford", "chevrolet", "chevy", "nissan", "bmw",
    "mercedes", "audi", "volkswagen", "vw", "hyundai", "kia", "mazda",
    "subaru", "lexus", "acura", "infiniti", "jeep", "dodge", "ram",
    "chrysler", "buick", "cadillac", "gmc", "lincoln", "tesla", "volvo",
  ];

  const result: { color?: string; make?: string; model?: string; year?: string } = {};

  for (const word of words) {
    if (colors.includes(word)) {
      result.color = word;
    } else if (makes.includes(word)) {
      result.make = word;
    } else if (/^\d{4}$/.test(word)) {
      result.year = word;
    }
  }

  // Model could be remaining words after color and make are extracted
  const remainingWords = words.filter(
    (w) => w !== result.color && w !== result.make && w !== result.year
  );
  if (remainingWords.length > 0) {
    result.model = remainingWords.join(" ");
  }

  return result;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CheckImpoundRequest = await req.json();
    const { tenant_id, license_plate, license_plate_state, vin, vehicle_description, towed_date } = body;

    // Validate required tenant_id
    if (!tenant_id) {
      return new Response(
        JSON.stringify({
          found: false,
          error: "tenant_id is required",
          message: "I'm having trouble looking that up right now. Let me get someone to help you.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate at least one search param
    if (!license_plate && !vin && !vehicle_description) {
      return new Response(
        JSON.stringify({
          found: false,
          error: "At least one of license_plate, vin, or vehicle_description is required",
          message: "To look up your vehicle, I'll need either the license plate number, VIN, or a description of your car. Which would you like to provide?",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve tenant_id - it could be a UUID or a business name
    let resolvedTenantId = tenant_id;
    
    // Check if tenant_id is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenant_id)) {
      // Not a UUID - try to look up by business name
      console.log(`[check-impound] tenant_id "${tenant_id}" is not UUID, looking up by name`);
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .select("id")
        .ilike("name", `%${tenant_id}%`)
        .limit(1)
        .maybeSingle();
      
      if (tenantError || !tenant) {
        console.error("[check-impound] Could not resolve tenant by name:", tenantError);
        return new Response(
          JSON.stringify({
            found: false,
            error: "Could not identify business",
            message: "I'm having trouble accessing our system. Let me connect you with someone who can help.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      resolvedTenantId = tenant.id;
      console.log(`[check-impound] Resolved "${tenant_id}" to tenant ${resolvedTenantId}`);
    }

    // Build query
    let query = supabase
      .from("impound_vehicles")
      .select(`
        id,
        license_plate,
        license_plate_state,
        vehicle_year,
        vehicle_make,
        vehicle_model,
        vehicle_color,
        towed_from_address,
        towed_at,
        status,
        lot_id,
        impound_lots (
          id,
          name,
          address,
          city,
          state,
          zip,
          phone
        )
      `)
      .eq("tenant_id", resolvedTenantId)
      .in("status", ["in_lot", "pending_release"]);

    // Add date filter if provided
    if (towed_date) {
      const startOfDay = `${towed_date}T00:00:00Z`;
      const endOfDay = `${towed_date}T23:59:59Z`;
      query = query.gte("towed_at", startOfDay).lte("towed_at", endOfDay);
    }

    const { data: vehicles, error: queryError } = await query;

    if (queryError) {
      console.error("[check-impound] Query error:", queryError);
      return new Response(
        JSON.stringify({
          found: false,
          error: queryError.message,
          message: "I'm having trouble searching our system right now. Please hold while I connect you with someone who can help.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!vehicles || vehicles.length === 0) {
      return new Response(
        JSON.stringify({
          found: false,
          message: "I couldn't find any vehicles matching that description in our system. It's possible it was towed by a different company, or the information might be different than what we have on file. Would you like me to try a different search, or would you prefer to speak with someone directly?",
          suggestions: [
            "Try searching by VIN number",
            "Check with local police for tow company info",
            "Verify the license plate number",
          ],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter and score results based on search criteria
    const scoredResults: { vehicle: any; score: number }[] = [];
    const normalizedSearchPlate = license_plate ? normalizePlate(license_plate) : null;
    const normalizedVin = vin ? vin.toUpperCase().replace(/\s/g, "") : null;
    const parsedDesc = vehicle_description ? parseVehicleDescription(vehicle_description) : null;

    for (const v of vehicles) {
      let score = 0;

      // Priority 1: Exact license plate match
      if (normalizedSearchPlate && v.license_plate) {
        const vehiclePlate = normalizePlate(v.license_plate);
        if (vehiclePlate === normalizedSearchPlate) {
          score += 100;
          // Bonus for matching state
          if (license_plate_state && v.license_plate_state) {
            if (v.license_plate_state.toUpperCase() === license_plate_state.toUpperCase()) {
              score += 20;
            }
          }
        } else if (vehiclePlate.includes(normalizedSearchPlate) || normalizedSearchPlate.includes(vehiclePlate)) {
          // Partial plate match
          score += 30;
        }
      }

      // Priority 2: VIN match
      if (normalizedVin && v.vin) {
        const vehicleVin = v.vin.toUpperCase().replace(/\s/g, "");
        if (vehicleVin === normalizedVin) {
          score += 90;
        } else if (vehicleVin.includes(normalizedVin) || normalizedVin.includes(vehicleVin)) {
          score += 25;
        }
      }

      // Priority 3: Description match (fuzzy)
      if (parsedDesc) {
        if (parsedDesc.color && v.vehicle_color) {
          if (v.vehicle_color.toLowerCase().includes(parsedDesc.color)) {
            score += 15;
          }
        }
        if (parsedDesc.make && v.vehicle_make) {
          const vehicleMake = v.vehicle_make.toLowerCase();
          if (vehicleMake.includes(parsedDesc.make) || parsedDesc.make.includes(vehicleMake)) {
            score += 20;
          }
        }
        if (parsedDesc.model && v.vehicle_model) {
          const vehicleModel = v.vehicle_model.toLowerCase();
          if (vehicleModel.includes(parsedDesc.model) || parsedDesc.model.includes(vehicleModel)) {
            score += 15;
          }
        }
        if (parsedDesc.year && v.vehicle_year) {
          if (v.vehicle_year === parsedDesc.year) {
            score += 10;
          }
        }
      }

      if (score > 0) {
        scoredResults.push({ vehicle: v, score });
      }
    }

    // Sort by score descending
    scoredResults.sort((a, b) => b.score - a.score);

    // No matches found
    if (scoredResults.length === 0) {
      return new Response(
        JSON.stringify({
          found: false,
          message: "I couldn't find a vehicle matching that information in our impound lot. It's possible it was towed by a different company, or the plate number might be different. Would you like me to try searching by VIN instead?",
          suggestions: [
            "Try searching by VIN number",
            "Check with local police for tow company info",
            "Verify the license plate number",
          ],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format results
    const formatVehicle = (v: any): VehicleResult => {
      const towedAt = new Date(v.towed_at);
      const now = new Date();
      return {
        id: v.id,
        license_plate: v.license_plate,
        license_plate_state: v.license_plate_state,
        vehicle_year: v.vehicle_year,
        vehicle_make: v.vehicle_make,
        vehicle_model: v.vehicle_model,
        vehicle_color: v.vehicle_color,
        towed_from: v.towed_from_address,
        towed_at: v.towed_at,
        days_in_lot: daysBetween(towedAt, now),
        status: v.status,
      };
    };

    const formatLot = (lot: any): LotResult | null => {
      if (!lot) return null;
      const addressParts = [lot.address, lot.city, lot.state, lot.zip].filter(Boolean);
      return {
        name: lot.name,
        address: addressParts.join(", "),
        phone: lot.phone,
      };
    };

    const buildVehicleDescription = (v: VehicleResult): string => {
      const parts = [v.vehicle_year, v.vehicle_color, v.vehicle_make, v.vehicle_model].filter(Boolean);
      return parts.join(" ") || "your vehicle";
    };

    // Single match with high confidence
    if (scoredResults.length === 1 || scoredResults[0].score >= 90) {
      const topMatch = scoredResults[0].vehicle;
      const vehicle = formatVehicle(topMatch);
      const lot = formatLot(topMatch.impound_lots);
      const vehicleDesc = buildVehicleDescription(vehicle);
      const towedDate = formatDateForSpeech(vehicle.towed_at);

      let message = `Found your ${vehicleDesc}.`;
      if (vehicle.towed_from) {
        message += ` It was towed from ${vehicle.towed_from} on ${towedDate}`;
      } else {
        message += ` It was towed on ${towedDate}`;
      }
      if (lot) {
        message += ` and is currently at our ${lot.name} location.`;
        if (lot.phone) {
          message += ` You can reach us at ${lot.phone} to arrange pickup.`;
        }
      } else {
        message += ` and is currently in our impound lot.`;
      }

      if (vehicle.days_in_lot > 0) {
        message += ` It has been here for ${vehicle.days_in_lot} day${vehicle.days_in_lot > 1 ? "s" : ""}.`;
      }

      return new Response(
        JSON.stringify({
          found: true,
          vehicle,
          lot,
          message,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Multiple matches - need clarification
    const topResults = scoredResults.slice(0, 5).map((r) => ({
      vehicle: formatVehicle(r.vehicle),
      lot: formatLot(r.vehicle.impound_lots),
    }));

    // Build clarification message
    const descriptions = topResults.map((r) => buildVehicleDescription(r.vehicle));
    const uniqueColors = [...new Set(topResults.map((r) => r.vehicle.vehicle_color).filter(Boolean))];

    let message = `I found ${scoredResults.length} vehicle${scoredResults.length > 1 ? "s" : ""} that could be yours.`;
    if (uniqueColors.length > 1) {
      message += " Can you tell me what color your car is to help narrow it down?";
    } else {
      message += " Can you give me more details like the year or color to help identify your vehicle?";
    }

    return new Response(
      JSON.stringify({
        found: true,
        multiple: true,
        count: scoredResults.length,
        vehicles: topResults,
        message,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[check-impound] Error:", error);
    return new Response(
      JSON.stringify({
        found: false,
        error: error.message,
        message: "I'm having trouble with our system right now. Let me connect you with someone who can help look that up.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
