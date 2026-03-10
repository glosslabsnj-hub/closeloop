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
import { getSquareConfig } from "../_shared/squareToken.ts";

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

    // Resolve tenant_id if called with integration_id
    let effectiveTenantId = tenantId;
    if (integrationId && !effectiveTenantId) {
      const { data: intRow } = await supabase
        .from("integrations")
        .select("tenant_id")
        .eq("id", integrationId)
        .single();
      effectiveTenantId = intRow?.tenant_id;
    }

    if (!effectiveTenantId) {
      return jsonResponse({ success: false, error: "Could not resolve tenant_id" }, 400);
    }

    // Get valid Square config (auto-refreshes expired tokens)
    const squareConfig = await getSquareConfig(effectiveTenantId);
    if (!squareConfig) {
      return jsonResponse({ success: false, skipped: true, message: "No connected Square integration or token expired" });
    }

    const { accessToken, locationId } = squareConfig;

    // Get integration ID for status updates
    const { data: integrationRow } = await supabase
      .from("integrations")
      .select("id")
      .eq("tenant_id", effectiveTenantId)
      .eq("provider", "square_pos")
      .eq("status", "connected")
      .maybeSingle();
    const integrationId_ = integrationRow?.id;

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

    // Map Square status to Flux booking status
    function mapSquareStatus(squareStatus: string): string {
      switch (squareStatus) {
        case "ACCEPTED": return "confirmed";
        case "PENDING": return "pending";
        case "NO_SHOW": return "no_show";
        case "CANCELLED_BY_CUSTOMER":
        case "CANCELLED_BY_SELLER": return "cancelled";
        default: return "confirmed"; // Default to confirmed for unknown active statuses
      }
    }

    // Active (non-cancelled) Square bookings not created by Flux
    const activeExternalBookings = squareBookings.filter((b: any) => {
      if (b.status === "CANCELLED_BY_CUSTOMER" || b.status === "CANCELLED_BY_SELLER") return false;
      if (fluxSyncedIds.has(b.id)) return false;
      return true;
    });

    // Split into: need busy_blocks vs need Flux booking records
    const needBusyBlock = activeExternalBookings.filter((b: any) => !existingBlockIds.has(`square_${b.id}`));

    // Check which bookings already have Flux booking records
    const { data: existingFluxBookings } = await supabase
      .from("bookings")
      .select("external_event_id")
      .eq("tenant_id", effectiveTenantId)
      .eq("external_provider", "square")
      .not("external_event_id", "is", null);

    const existingFluxBookingIds = new Set(
      (existingFluxBookings || []).map((b: { external_event_id: string }) => b.external_event_id),
    );

    const needFluxBooking = activeExternalBookings.filter((b: any) => !existingFluxBookingIds.has(b.id));

    console.log(`[sync-square-avail] ${activeExternalBookings.length} active external, ${needBusyBlock.length} need busy_blocks, ${needFluxBooking.length} need Flux bookings`);

    let syncedCount = 0;

    // Combine all bookings that need any work (dedup by id, not by reference)
    const seenIds = new Set<string>();
    const allBookingsNeedingWork: any[] = [];
    for (const b of [...needBusyBlock, ...needFluxBooking]) {
      if (!seenIds.has(b.id)) {
        seenIds.add(b.id);
        allBookingsNeedingWork.push(b);
      }
    }
    const customerIds = [...new Set(allBookingsNeedingWork.map((b: any) => b.customer_id).filter(Boolean))];
    const customerMap = new Map<string, { name: string; phone: string; email: string | null }>();

    for (let i = 0; i < customerIds.length; i += 10) {
      const batch = customerIds.slice(i, i + 10);
      for (const cid of batch) {
        const custRes = await squareFetch(`/customers/${cid}`, accessToken, "GET");
        if (custRes.ok && custRes.data.customer) {
          const c = custRes.data.customer;
          customerMap.set(cid, {
            name: [c.given_name, c.family_name].filter(Boolean).join(" ") || "Square Customer",
            phone: c.phone_number || "",
            email: c.email_address || null,
          });
        }
      }
    }

    // Create busy_blocks for bookings that don't have them yet
    for (const booking of needBusyBlock) {
      const startAt = booking.start_at;
      if (!startAt) continue;

      let durationMinutes = 60;
      if (booking.appointment_segments?.length > 0) {
        durationMinutes = booking.appointment_segments.reduce(
          (sum: number, seg: any) => sum + (seg.duration_minutes || 0),
          0,
        );
      }

      const startDate = new Date(startAt);
      const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
      const customer = customerMap.get(booking.customer_id) || { name: "Square Customer", phone: "", email: null };

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
          summary: customer.name,
        },
      });

      if (insertError) {
        console.error(`[sync-square-avail] Failed to insert busy_block for ${booking.id}:`, insertError);
      } else {
        syncedCount++;
      }
    }

    // Load tenant services so we can resolve Square variation IDs to Flux services
    const { data: tenantServices } = await supabase
      .from("services")
      .select("id, name, duration_minutes, price_amount, pricing_config_json")
      .eq("tenant_id", effectiveTenantId)
      .eq("is_active", true);

    // Build a map: square_variation_id -> Flux service
    const variationToService = new Map<string, { id: string; name: string; duration_minutes: number; price_cents: number | null }>();
    for (const svc of (tenantServices || [])) {
      const config = svc.pricing_config_json as any;
      if (config?.tiers) {
        for (const tier of config.tiers) {
          if (tier.square_variation_id) {
            variationToService.set(tier.square_variation_id, {
              id: svc.id,
              name: svc.name,
              duration_minutes: svc.duration_minutes,
              price_cents: tier.price_cents || (svc.price_amount ? svc.price_amount * 100 : null),
            });
          }
        }
      }
      // Also check for direct square_variation_id on the service config
      if (config?.square_variation_id) {
        variationToService.set(config.square_variation_id, {
          id: svc.id,
          name: svc.name,
          duration_minutes: svc.duration_minutes,
          price_cents: svc.price_amount ? svc.price_amount * 100 : null,
        });
      }
    }

    // Create Flux booking records for bookings that don't have them yet
    let bookingsCreated = 0;
    for (const booking of needFluxBooking) {
      const startAt = booking.start_at;
      if (!startAt) continue;

      let durationMinutes = 60;
      if (booking.appointment_segments?.length > 0) {
        durationMinutes = booking.appointment_segments.reduce(
          (sum: number, seg: any) => sum + (seg.duration_minutes || 0),
          0,
        );
      }

      const startDate = new Date(startAt);
      const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
      const customer = customerMap.get(booking.customer_id) || { name: "Square Customer", phone: "", email: null };

      // Resolve Square service variation to Flux service
      let serviceId: string | null = null;
      let priceCents: number | null = null;
      let serviceName: string | null = null;
      if (booking.appointment_segments?.length > 0) {
        const variationId = booking.appointment_segments[0].service_variation_id;
        if (variationId) {
          const matched = variationToService.get(variationId);
          if (matched) {
            serviceId = matched.id;
            priceCents = matched.price_cents;
            serviceName = matched.name;
            console.log(`[sync-square-avail] Resolved service: ${variationId} -> ${matched.name}`);
          }
        }
      }

      // Find-or-create a lead for this Square customer
      let leadId: string | null = null;
      if (customer.phone) {
        const { data: existingLead } = await supabase
          .from("leads")
          .select("id")
          .eq("tenant_id", effectiveTenantId)
          .eq("phone", customer.phone)
          .limit(1)
          .maybeSingle();

        if (existingLead) {
          leadId = existingLead.id;
        }
      }

      if (!leadId) {
        const { data: newLead, error: leadErr } = await supabase
          .from("leads")
          .insert({
            tenant_id: effectiveTenantId,
            full_name: customer.name,
            phone: customer.phone || null,
            email: customer.email,
            source: "square_import",
          })
          .select("id")
          .single();

        if (newLead) {
          leadId = newLead.id;
        } else {
          console.error(`[sync-square-avail] Failed to create lead for ${booking.id}:`, leadErr);
        }
      }

      if (!leadId) continue;

      const notes = [
        booking.customer_note,
        serviceName ? `Service: ${serviceName}` : null,
        customer.name !== "Square Customer" ? `Customer: ${customer.name}` : null,
      ].filter(Boolean).join(". ") || "Imported from Square";

      const bookingInsert: Record<string, unknown> = {
        tenant_id: effectiveTenantId,
        lead_id: leadId,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        status: mapSquareStatus(booking.status),
        notes,
        external_event_id: booking.id,
        external_provider: "square",
      };
      if (serviceId) bookingInsert.service_id = serviceId;
      if (priceCents) bookingInsert.price_cents = priceCents;

      const { data: createdBooking, error: bookingErr } = await supabase
        .from("bookings")
        .insert(bookingInsert)
        .select("id")
        .single();

      if (bookingErr) {
        console.error(`[sync-square-avail] Failed to create booking for ${booking.id}:`, bookingErr);
      } else {
        bookingsCreated++;
        console.log(`[sync-square-avail] Created Flux booking for Square ${booking.id} (${customer.name}${serviceName ? ` - ${serviceName}` : ""}) [${mapSquareStatus(booking.status)}]`);

        // Link the busy_block to this booking
        if (createdBooking?.id) {
          await supabase
            .from("busy_blocks")
            .update({ booking_id: createdBooking.id })
            .eq("tenant_id", effectiveTenantId)
            .eq("external_event_id", `square_${booking.id}`);
        }
      }
    }

    // Also update status on existing Flux bookings that may have changed in Square
    for (const booking of activeExternalBookings) {
      if (existingFluxBookingIds.has(booking.id)) {
        const newStatus = mapSquareStatus(booking.status);
        await supabase
          .from("bookings")
          .update({ status: newStatus })
          .eq("tenant_id", effectiveTenantId)
          .eq("external_event_id", booking.id)
          .eq("external_provider", "square")
          .neq("status", newStatus);
      }
    }

    // Clean up cancelled bookings: deactivate busy_blocks for Square bookings
    // that are now cancelled
    const cancelledBookings = squareBookings.filter(
      (b: any) => b.status === "CANCELLED_BY_CUSTOMER" || b.status === "CANCELLED_BY_SELLER",
    );

    let deactivatedCount = 0;
    for (const cancelled of cancelledBookings) {
      // Deactivate the busy_block
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

      // Also cancel the Flux booking if one was created from this Square booking
      await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("tenant_id", effectiveTenantId)
        .eq("external_event_id", cancelled.id)
        .eq("external_provider", "square")
        .neq("status", "cancelled")
        .neq("status", "canceled");
    }

    // Update integration last_tested_at as a sync timestamp
    if (integrationId_) {
      await supabase
        .from("integrations")
        .update({
          last_tested_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", integrationId_);
    }

    console.log(
      `[sync-square-avail] Done: ${syncedCount} busy_blocks, ${bookingsCreated} bookings created, ${deactivatedCount} deactivated`,
    );

    return jsonResponse({
      success: true,
      synced_count: syncedCount,
      bookings_created: bookingsCreated,
      deactivated_count: deactivatedCount,
      total_square_bookings: squareBookings.length,
      active_external: activeExternalBookings.length,
    });
  } catch (error) {
    console.error("[sync-square-avail] Error:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});
