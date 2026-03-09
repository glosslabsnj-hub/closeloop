/**
 * sync-square-booking: Push a Flux booking to Square Appointments.
 *
 * Called by booking-handoff when a tenant has a connected square_pos integration.
 * Creates/finds the Square customer, then creates a Square Appointments booking.
 *
 * POST body: { booking_id, tenant_id }
 * Auth: x-closeloop-secret (internal) or service-role Bearer
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSquareConfig } from "../_shared/squareToken.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-closeloop-secret",
};

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Square API helper */
async function squareFetch(
  path: string,
  accessToken: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(`https://connect.squareup.com/v2${path}`, {
    method,
    headers: {
      "Square-Version": "2024-11-20",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** Find or create a Square customer by phone */
async function findOrCreateSquareCustomer(
  accessToken: string,
  name: string,
  phone: string,
  email?: string | null,
): Promise<string | null> {
  // Search by phone first
  if (phone) {
    const searchRes = await squareFetch("/customers/search", accessToken, "POST", {
      query: {
        filter: {
          phone_number: { exact: phone },
        },
      },
      limit: 1,
    });
    if (searchRes.ok && searchRes.data.customers?.length > 0) {
      return searchRes.data.customers[0].id;
    }
  }

  // Create new customer
  const nameParts = name.trim().split(/\s+/);
  const givenName = nameParts[0] || "Customer";
  const familyName = nameParts.slice(1).join(" ") || "";

  const createRes = await squareFetch("/customers", accessToken, "POST", {
    idempotency_key: crypto.randomUUID(),
    given_name: givenName,
    family_name: familyName,
    phone_number: phone || undefined,
    email_address: email || undefined,
  });

  if (createRes.ok && createRes.data.customer?.id) {
    return createRes.data.customer.id;
  }

  console.error("[sync-square] Failed to create customer:", createRes.data);
  return null;
}

/** Map Flux service name to Square catalog service variation ID.
 * Square search doesn't return nested variations, so we search first
 * then retrieve the full item to get variation IDs. */
async function findSquareServiceVariation(
  accessToken: string,
  locationId: string,
  serviceName: string,
): Promise<{ serviceVariationId: string; serviceVariationVersion: number } | null> {
  // Search catalog for matching appointment services
  const listRes = await squareFetch(
    `/catalog/search`,
    accessToken,
    "POST",
    {
      object_types: ["ITEM"],
      query: {
        text_query: { keywords: [serviceName] },
      },
      limit: 20,
    },
  );

  if (!listRes.ok || !listRes.data.objects) {
    console.log("[sync-square] Catalog search returned no results for:", serviceName);
    return null;
  }

  // Find matching appointment service item
  const searchName = serviceName.toLowerCase();
  for (const item of listRes.data.objects) {
    if (item.type !== "ITEM") continue;
    const itemData = item.item_data;
    if (itemData?.product_type !== "APPOINTMENTS_SERVICE") continue;

    const itemName = (itemData.name || "").toLowerCase();
    if (itemName.includes(searchName) || searchName.includes(itemName)) {
      // Retrieve full item to get variations (search doesn't return them)
      const fullRes = await squareFetch(
        `/catalog/object/${item.id}?include_related_objects=true`,
        accessToken,
        "GET",
      );

      if (fullRes.ok && fullRes.data.object?.item_data?.variations?.length > 0) {
        // Use the first variation (typically "Sedan" or default)
        const v = fullRes.data.object.item_data.variations[0];
        return {
          serviceVariationId: v.id,
          serviceVariationVersion: v.version || 0,
        };
      }
    }
  }

  // Fallback: list all catalog items and match
  const allRes = await squareFetch(`/catalog/list?types=ITEM`, accessToken, "GET");
  if (allRes.ok && allRes.data.objects) {
    for (const item of allRes.data.objects) {
      const itemData = item.item_data;
      if (itemData?.product_type !== "APPOINTMENTS_SERVICE") continue;
      const itemName = (itemData.name || "").toLowerCase();
      if (itemName.includes(searchName) || searchName.includes(itemName)) {
        // Retrieve full item for variations
        const fullRes = await squareFetch(
          `/catalog/object/${item.id}?include_related_objects=true`,
          accessToken,
          "GET",
        );
        if (fullRes.ok && fullRes.data.object?.item_data?.variations?.length > 0) {
          const v = fullRes.data.object.item_data.variations[0];
          return {
            serviceVariationId: v.id,
            serviceVariationVersion: v.version || 0,
          };
        }
      }
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { booking_id, tenant_id } = await req.json();
    if (!booking_id || !tenant_id) {
      return jsonResponse({ error: "booking_id and tenant_id required" }, 400);
    }

    console.log(`[sync-square] Syncing booking ${booking_id} for tenant ${tenant_id.substring(0, 8)}...`);

    // 1. Get valid Square config (auto-refreshes expired tokens)
    const squareConfig = await getSquareConfig(tenant_id);
    if (!squareConfig) {
      console.log("[sync-square] No connected Square integration or token expired for tenant");
      return jsonResponse({ success: false, skipped: true, message: "No Square integration or token expired" });
    }

    const { accessToken, locationId, teamMemberId } = squareConfig;

    // 2. Get the booking with related data (include pricing_config_json for vehicle-specific variation)
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        lead:leads(full_name, phone, email),
        service:services(name, duration_minutes, pricing_config_json)
      `)
      .eq("id", booking_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (bookingError || !booking) {
      console.error("[sync-square] Booking not found:", bookingError);
      return jsonResponse({ success: false, error: "Booking not found" }, 404);
    }

    // Skip if already synced
    if (booking.external_event_id) {
      console.log("[sync-square] Already synced:", booking.external_event_id);
      return jsonResponse({ success: true, already_synced: true, square_booking_id: booking.external_event_id });
    }

    const customerName = booking.lead?.full_name || "Customer";
    const customerPhone = booking.lead?.phone || "";
    const customerEmail = booking.lead?.email || null;
    const serviceName = booking.service?.name || "Appointment";
    const durationMinutes = booking.service?.duration_minutes || 60;

    // 3. Find or create Square customer
    const squareCustomerId = await findOrCreateSquareCustomer(
      accessToken,
      customerName,
      customerPhone,
      customerEmail,
    );

    if (!squareCustomerId) {
      console.error("[sync-square] Failed to find/create Square customer");
      return jsonResponse({ success: false, error: "Failed to create Square customer" }, 500);
    }

    console.log(`[sync-square] Square customer: ${squareCustomerId}`);

    // 4. Find matching Square service variation
    // First: check if booking notes contain vehicle type + pricing_config_json has a matching variation ID
    let directVariationId: string | null = null;
    const pricingConfig = booking.service?.pricing_config_json as Record<string, unknown> | null;
    if (pricingConfig?.model === "vehicle_tiered" && Array.isArray(pricingConfig.tiers)) {
      // Extract vehicle type from booking notes (format: "Vehicle: sedan")
      const vehicleMatch = (booking.notes || "").match(/Vehicle:\s*(\w+)/i);
      const vehicleType = vehicleMatch ? vehicleMatch[1].toLowerCase() : "";
      if (vehicleType) {
        const isTruck = vehicleType.includes("truck") || vehicleType.includes("xxl") || vehicleType.includes("van");
        const isSuv = vehicleType.includes("suv") || vehicleType.includes("crossover");
        const tier = (pricingConfig.tiers as Array<Record<string, unknown>>).find(t => {
          const tLower = (String(t.vehicle_type) || "").toLowerCase();
          if (isTruck) return tLower.includes("truck") || tLower.includes("xxl");
          if (isSuv) return tLower.includes("suv") || tLower.includes("crossover");
          return tLower.includes("sedan") || tLower.includes("car");
        });
        if (tier?.square_variation_id) {
          directVariationId = String(tier.square_variation_id);
          console.log(`[sync-square] Vehicle-tiered match: ${vehicleType} -> ${directVariationId}`);
        }
      }
    } else if (pricingConfig?.model === "package" && Array.isArray(pricingConfig.packages)) {
      // For packages, try matching against booking notes or service name
      const svcLower = (serviceName || "").toLowerCase();
      const notesPkg = (pricingConfig.packages as Array<Record<string, unknown>>).find(p =>
        svcLower.includes(String(p.name || "").toLowerCase())
      );
      if (notesPkg?.square_variation_id) {
        directVariationId = String(notesPkg.square_variation_id);
        console.log(`[sync-square] Package match: ${notesPkg.name} -> ${directVariationId}`);
      }
    }

    // Fallback to catalog search if no direct variation ID
    const serviceMatch = directVariationId ? null : await findSquareServiceVariation(accessToken, locationId, serviceName);

    // 5. Create Square Appointments booking
    const startAt = booking.start_at; // Already ISO string
    const appointmentSegment: Record<string, unknown> = {
      duration_minutes: durationMinutes,
      team_member_id: teamMemberId || undefined,
    };

    if (directVariationId) {
      appointmentSegment.service_variation_id = directVariationId;
      appointmentSegment.service_variation_version = 0;
      console.log(`[sync-square] Using direct variation ID: ${directVariationId}`);
    } else if (serviceMatch) {
      appointmentSegment.service_variation_id = serviceMatch.serviceVariationId;
      appointmentSegment.service_variation_version = serviceMatch.serviceVariationVersion;
      console.log(`[sync-square] Catalog matched service: ${serviceName} -> ${serviceMatch.serviceVariationId}`);
    } else {
      console.log(`[sync-square] No matching Square service for: ${serviceName}. Creating without service link.`);
    }

    const squareBookingPayload: Record<string, unknown> = {
      idempotency_key: crypto.randomUUID(),
      booking: {
        version: 0,
        location_id: locationId,
        customer_id: squareCustomerId,
        start_at: startAt,
        appointment_segments: [appointmentSegment],
        customer_note: booking.notes || `Booked via AI receptionist: ${serviceName}`,
        location_type: "BUSINESS_LOCATION",
      },
    };

    const createRes = await squareFetch("/bookings", accessToken, "POST", squareBookingPayload);

    if (!createRes.ok) {
      console.error("[sync-square] Failed to create Square booking:", JSON.stringify(createRes.data));

      // Update integration with error
      await supabase
        .from("integrations")
        .update({
          error_message: `Booking sync failed: ${JSON.stringify(createRes.data.errors?.[0]?.detail || createRes.data)}`.substring(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);

      return jsonResponse({
        success: false,
        error: "Square booking creation failed",
        details: createRes.data.errors || createRes.data,
      }, 500);
    }

    const squareBookingId = createRes.data.booking?.id;
    console.log(`[sync-square] Created Square booking: ${squareBookingId}`);

    // 6. Update Flux booking with Square reference
    await supabase
      .from("bookings")
      .update({
        external_event_id: squareBookingId,
        external_provider: "square",
      })
      .eq("id", booking_id);

    // Clear any previous error
    await supabase
      .from("integrations")
      .update({
        error_message: null,
        last_tested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    return jsonResponse({
      success: true,
      square_booking_id: squareBookingId,
      square_customer_id: squareCustomerId,
      service_matched: !!serviceMatch,
    });
  } catch (error) {
    console.error("[sync-square] Error:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});
