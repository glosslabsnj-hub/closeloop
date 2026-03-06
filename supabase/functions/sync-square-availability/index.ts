/**
 * sync-square-availability: Pull Square Appointments bookings into busy_blocks.
 *
 * Prevents double-booking when customers book directly through Square
 * (website widget, in-person, Square app) rather than through the AI receptionist.
 *
 * Called by cron-calendar-sync or manually.
 * POST body: { tenant_id } or { integration_id }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-closeloop-secret",
};

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const tenantId = body.tenant_id;
    const integrationId = body.integration_id;

    if (!tenantId && !integrationId) {
      return jsonResponse({ error: "tenant_id or integration_id required" }, 400);
    }

    // Find the Square integration
    let query = supabase
      .from("integrations")
      .select("id, tenant_id, config_json, status")
      .eq("provider", "square_pos")
      .eq("status", "connected");

    if (integrationId) {
      query = query.eq("id", integrationId);
    } else {
      query = query.eq("tenant_id", tenantId);
    }

    const { data: integration, error: intError } = await query.maybeSingle();

    if (intError || !integration) {
      return jsonResponse({ success: false, skipped: true, message: "No connected Square integration" });
    }

    const config = integration.config_json as Record<string, string>;
    const accessToken = config.access_token;
    const locationId = config.location_id;
    const effectiveTenantId = integration.tenant_id;

    if (!accessToken || !locationId) {
      return jsonResponse({ success: false, error: "Square config incomplete" }, 500);
    }

    console.log(`[sync-square-avail] Syncing Square bookings for tenant ${effectiveTenantId.substring(0, 8)}...`);

    // Fetch Square bookings for the next 30 days
    const now = new Date();
    const startAtMin = now.toISOString();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const startAtMax = endDate.toISOString();

    const listRes = await squareFetch("/bookings", accessToken, "POST", {
      query: {
        filter: {
          location_id: locationId,
          start_at_filter: {
            start_at: startAtMin,
            end_at: startAtMax,
          },
        },
      },
      limit: 100,
    });

    // Square list bookings uses GET with query params, not POST
    // Let me use the correct endpoint
    const bookingsRes = await squareFetch(
      `/bookings?location_id=${locationId}&start_at_min=${encodeURIComponent(startAtMin)}&start_at_max=${encodeURIComponent(startAtMax)}&limit=100`,
      accessToken,
      "GET",
    );

    if (!bookingsRes.ok) {
      console.error("[sync-square-avail] Failed to list Square bookings:", bookingsRes.data);
      return jsonResponse({
        success: false,
        error: "Failed to fetch Square bookings",
        details: bookingsRes.data,
      }, 500);
    }

    const squareBookings = bookingsRes.data.bookings || [];
    console.log(`[sync-square-avail] Found ${squareBookings.length} Square bookings in next 30 days`);

    // Get existing Flux bookings with Square external_event_id to skip those
    // (they were created by us and already have busy_blocks)
    const { data: fluxBookings } = await supabase
      .from("bookings")
      .select("external_event_id")
      .eq("tenant_id", effectiveTenantId)
      .eq("external_provider", "square")
      .not("external_event_id", "is", null);

    const fluxSyncedIds = new Set(
      (fluxBookings || []).map((b: { external_event_id: string }) => b.external_event_id),
    );

    // Get existing Square-sourced busy_blocks to avoid duplicates
    const { data: existingBlocks } = await supabase
      .from("busy_blocks")
      .select("external_event_id")
      .eq("tenant_id", effectiveTenantId)
      .eq("block_type", "external_busy")
      .gte("start_at", startAtMin)
      .not("external_event_id", "is", null);

    const existingBlockIds = new Set(
      (existingBlocks || []).map((b: { external_event_id: string }) => b.external_event_id),
    );

    // Filter to only Square bookings NOT created by Flux and NOT already in busy_blocks
    const newExternalBookings = squareBookings.filter((b: any) => {
      if (b.status === "CANCELLED_BY_CUSTOMER" || b.status === "CANCELLED_BY_SELLER") return false;
      if (fluxSyncedIds.has(b.id)) return false;
      if (existingBlockIds.has(`square_${b.id}`)) return false;
      return true;
    });

    console.log(`[sync-square-avail] ${newExternalBookings.length} new external bookings to sync`);

    let syncedCount = 0;

    for (const booking of newExternalBookings) {
      const startAt = booking.start_at;
      if (!startAt) continue;

      // Calculate end time from appointment segments
      let durationMinutes = 60; // default
      if (booking.appointment_segments?.length > 0) {
        durationMinutes = booking.appointment_segments.reduce(
          (sum: number, seg: any) => sum + (seg.duration_minutes || 0),
          0,
        );
      }

      const startDate = new Date(startAt);
      const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

      const customerName = booking.customer_note || "Square booking";

      const { error: insertError } = await supabase.from("busy_blocks").insert({
        tenant_id: effectiveTenantId,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        block_type: "external_busy",
        external_event_id: `square_${booking.id}`,
        is_active: true,
        metadata_json: {
          source: "square_appointments",
          square_booking_id: booking.id,
          square_status: booking.status,
          customer_id: booking.customer_id,
          summary: customerName,
        },
      });

      if (insertError) {
        console.error(`[sync-square-avail] Failed to insert busy_block for ${booking.id}:`, insertError);
      } else {
        syncedCount++;
      }
    }

    // Clean up cancelled bookings: deactivate busy_blocks for Square bookings
    // that are now cancelled
    const cancelledBookings = squareBookings.filter(
      (b: any) => b.status === "CANCELLED_BY_CUSTOMER" || b.status === "CANCELLED_BY_SELLER",
    );

    let deactivatedCount = 0;
    for (const cancelled of cancelledBookings) {
      const { data: updated } = await supabase
        .from("busy_blocks")
        .update({ is_active: false })
        .eq("tenant_id", effectiveTenantId)
        .eq("external_event_id", `square_${cancelled.id}`)
        .eq("is_active", true)
        .select("id");

      if (updated && updated.length > 0) {
        deactivatedCount++;
      }
    }

    // Update integration last_tested_at as a sync timestamp
    await supabase
      .from("integrations")
      .update({
        last_tested_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", integration.id);

    console.log(
      `[sync-square-avail] Done: ${syncedCount} synced, ${deactivatedCount} deactivated`,
    );

    return jsonResponse({
      success: true,
      synced_count: syncedCount,
      deactivated_count: deactivatedCount,
      total_square_bookings: squareBookings.length,
      new_external: newExternalBookings.length,
    });
  } catch (error) {
    console.error("[sync-square-avail] Error:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});
