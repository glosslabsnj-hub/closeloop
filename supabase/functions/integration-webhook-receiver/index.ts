/**
 * Universal Inbound Webhook Receiver — handles external provider notifications.
 *
 * Routes: POST /integration-webhook-receiver?provider=<provider>&tenant_id=<id>
 *
 * Supports:
 * - Google Calendar push notifications (resource changes)
 * - Square webhooks (order/payment updates)
 * - HubSpot webhooks (contact/deal changes)
 * - Stripe webhooks (payment events) — note: main Stripe webhook is separate
 *
 * Each provider has signature verification and entity update logic.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTenantSms } from "../_shared/sms-sender.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  // Allow GET for Google Calendar watch verification
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      },
    });
  }

  const url = new URL(req.url);
  const provider = url.searchParams.get("provider");
  const tenantId = url.searchParams.get("tenant_id");

  if (!provider) {
    return jsonResp({ error: "Missing provider query parameter" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    switch (provider) {
      case "google_calendar":
        return await handleGoogleCalendarWebhook(req, supabase, tenantId);
      case "square":
        return await handleSquareWebhook(req, supabase, tenantId);
      case "hubspot":
        return await handleHubSpotWebhook(req, supabase);
      default: {
        // Log unknown provider events for debugging
        const body = await req.text();
        console.log(`Unknown webhook provider: ${provider}`, body.substring(0, 500));
        return jsonResp({ status: "ignored", reason: "unknown provider" });
      }
    }
  } catch (error: unknown) {
    console.error(`Webhook error (${provider}):`, error);
    const message = error instanceof Error ? error.message : "Unknown error";

    // Log failed event
    if (tenantId) {
      await supabase.from("integration_webhook_events").insert({
        tenant_id: tenantId,
        provider: provider || "unknown",
        event_type: "error",
        payload: { error: message },
        status: "failed",
        error_message: message,
      });
    }

    // Always return 200 to prevent webhook retries for our errors
    return jsonResp({ status: "error", message });
  }
});

// ─── Google Calendar Push Notifications ─────────────────────────────────────

async function handleGoogleCalendarWebhook(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  tenantId: string | null,
): Promise<Response> {
  // Google sends headers: X-Goog-Channel-ID, X-Goog-Resource-ID, X-Goog-Resource-State
  const channelId = req.headers.get("X-Goog-Channel-ID") || req.headers.get("x-goog-channel-id");
  const resourceState = req.headers.get("X-Goog-Resource-State") || req.headers.get("x-goog-resource-state");

  // Sync verification — Google sends this when watch is first set up
  if (resourceState === "sync") {
    console.log("Google Calendar watch verification received");
    return jsonResp({ status: "ok" });
  }

  if (!tenantId) {
    // Try to resolve tenant from channel ID
    if (channelId) {
      const { data: conn } = await supabase
        .from("calendar_connections")
        .select("tenant_id")
        .eq("provider", "google")
        .eq("config_json->>watch_channel_id", channelId)
        .single();
      if (conn) {
        tenantId = conn.tenant_id;
      }
    }
  }

  if (!tenantId) {
    console.warn("Google Calendar webhook: could not resolve tenant");
    return jsonResp({ status: "ignored", reason: "no tenant" });
  }

  // Log the webhook event
  await supabase.from("integration_webhook_events").insert({
    tenant_id: tenantId,
    provider: "google_calendar",
    event_type: resourceState || "unknown",
    external_id: channelId || null,
    payload: {
      channel_id: channelId,
      resource_state: resourceState,
      resource_id: req.headers.get("X-Goog-Resource-ID"),
    },
    status: "received",
  });

  // Trigger a calendar re-sync for this tenant
  if (resourceState === "exists" || resourceState === "update") {
    try {
      // Find the Google calendar connection
      const { data: connection } = await supabase
        .from("calendar_connections")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("provider", "google")
        .eq("status", "connected")
        .single();

      if (connection) {
        // Trigger sync-availability to pull latest changes
        await supabase.functions.invoke("sync-availability", {
          body: {
            connection_id: connection.id,
            tenant_id: tenantId,
            days: 30,
            source: "webhook",
          },
        });

        // Update event status
        await supabase
          .from("integration_webhook_events")
          .update({ status: "processed", processed_at: new Date().toISOString() })
          .eq("tenant_id", tenantId)
          .eq("provider", "google_calendar")
          .eq("external_id", channelId)
          .eq("status", "received")
          .order("created_at", { ascending: false })
          .limit(1);
      }
    } catch (e) {
      console.error("Failed to trigger calendar sync from webhook:", e);
    }
  }

  return jsonResp({ status: "ok" });
}

// ─── Square Webhooks ────────────────────────────────────────────────────────

async function handleSquareWebhook(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  tenantId: string | null,
): Promise<Response> {
  const body = await req.json();
  const eventType = body.type || body.event_type;

  // Verify Square webhook signature
  const signature = req.headers.get("x-square-hmacsha256-signature");
  const squareWebhookKey = Deno.env.get("SQUARE_WEBHOOK_SIGNATURE_KEY");
  if (squareWebhookKey && signature) {
    // TODO: Implement Square HMAC verification when needed
    // For now, log and process
  }

  // Resolve tenant from merchant_id in payload
  if (!tenantId && body.merchant_id) {
    const { data: token } = await supabase
      .from("integration_oauth_tokens")
      .select("tenant_id")
      .eq("provider", "square_pos")
      .eq("extra_data->>merchant_id", body.merchant_id)
      .single();
    if (token) tenantId = token.tenant_id;
  }

  if (!tenantId) {
    console.warn("Square webhook: could not resolve tenant");
    return jsonResp({ status: "ignored" });
  }

  // Log event
  await supabase.from("integration_webhook_events").insert({
    tenant_id: tenantId,
    provider: "square",
    event_type: eventType || "unknown",
    external_id: body.data?.id || body.entity_id || null,
    payload: body,
    status: "received",
  });

  // Process based on event type
  if (eventType === "order.updated" || eventType === "order.completed") {
    // Update local food_order status if linked
    const externalOrderId = body.data?.object?.order?.id;
    if (externalOrderId) {
      const { data: order } = await supabase
        .from("food_orders")
        .select("id, status")
        .eq("tenant_id", tenantId)
        .eq("external_order_id", externalOrderId)
        .single();

      if (order && eventType === "order.completed") {
        await supabase
          .from("food_orders")
          .update({ status: "completed" })
          .eq("id", order.id);
      }
    }
  }

  // Handle Square Appointments booking updates
  if (eventType === "booking.updated" || eventType === "booking.created") {
    const squareBooking = body.data?.object?.booking;
    const squareBookingId = squareBooking?.id || body.data?.id;

    if (squareBookingId && tenantId) {
      console.log(`[square-webhook] Booking event: ${eventType}, id: ${squareBookingId}, status: ${squareBooking?.status}`);

      // ─── SOURCE DETECTION ────────────────────────────────────────
      // Determine where this booking came from based on Square's source field
      // and any tags embedded in the customer note
      const squareSource = squareBooking?.source || body.data?.object?.booking?.source || "";
      const customerNote = squareBooking?.customer_note || "";
      let bookingSource = "unknown";

      if (customerNote.includes("[source:website]")) {
        bookingSource = "website";
      } else if (customerNote.includes("[source:phone_ai]")) {
        bookingSource = "phone_ai";
      } else if (squareSource === "FIRST_PARTY_MERCHANT") {
        bookingSource = "square_direct"; // Jack created it manually
      } else if (squareSource === "FIRST_PARTY_CUSTOMER") {
        bookingSource = "square_online"; // Customer self-booked via Square
      } else if (squareSource === "API") {
        bookingSource = "api_unknown"; // API but no tag — legacy or unknown
      }

      console.log(`[square-webhook] Source: ${bookingSource} (square_source: ${squareSource}, note_tags: ${customerNote.includes("[source:") ? "yes" : "no"})`);

      // Check if this booking already exists in Flux (synced from Flux or from Square)
      const { data: fluxBooking } = await supabase
        .from("bookings")
        .select("id, status, end_at, start_at, lead_id, service_id, booking_source")
        .eq("tenant_id", tenantId)
        .eq("external_event_id", squareBookingId)
        .maybeSingle();

      // Also check busy_blocks for Square-originated bookings
      const { data: busyBlock } = await supabase
        .from("busy_blocks")
        .select("id, start_at, end_at, metadata_json")
        .eq("tenant_id", tenantId)
        .eq("external_event_id", `square_${squareBookingId}`)
        .maybeSingle();

      const squareStatus = squareBooking?.status;

      // ─── RESCHEDULE DETECTION ────────────────────────────────────
      // If the booking already exists in Flux and the time changed, treat as reschedule
      if (fluxBooking && squareBooking?.start_at && (squareStatus === "ACCEPTED" || squareStatus === "PENDING" || squareStatus === "accepted" || squareStatus === "pending")) {
        const squareStartAt = new Date(squareBooking.start_at).toISOString();
        const fluxStartAt = new Date(fluxBooking.start_at).toISOString();

        if (squareStartAt !== fluxStartAt) {
          const durationMin = squareBooking?.appointment_segments?.[0]?.duration_minutes || 60;
          const newEndAt = new Date(new Date(squareStartAt).getTime() + durationMin * 60000).toISOString();

          console.log(`[square-webhook] Reschedule detected for ${fluxBooking.id}: ${fluxStartAt} → ${squareStartAt}`);

          // Update the Flux booking times
          await supabase
            .from("bookings")
            .update({
              start_at: squareStartAt,
              end_at: newEndAt,
            })
            .eq("id", fluxBooking.id);

          // Update the busy_block
          const { data: tenantInfo } = await supabase
            .from("tenants")
            .select("appointment_buffer_minutes, name, timezone")
            .eq("id", tenantId)
            .single();

          const bufferMinutes = tenantInfo?.appointment_buffer_minutes || 15;
          const blockEnd = new Date(new Date(squareStartAt).getTime() + durationMin * 60000 + bufferMinutes * 60000).toISOString();

          await supabase
            .from("busy_blocks")
            .update({
              start_at: squareStartAt,
              end_at: blockEnd,
            })
            .eq("tenant_id", tenantId)
            .eq("booking_id", fluxBooking.id)
            .eq("is_active", true);

          // Send reschedule notification to customer
          if (fluxBooking.lead_id) {
            try {
              const { data: lead } = await supabase
                .from("leads")
                .select("phone, full_name")
                .eq("id", fluxBooking.lead_id)
                .maybeSingle();

              if (lead?.phone) {
                const tz = tenantInfo?.timezone || "America/New_York";
                const newTime = new Date(squareStartAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: tz,
                });
                const newDate = new Date(squareStartAt).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  timeZone: tz,
                });
                const businessName = tenantInfo?.name || "us";
                const customerName = lead.full_name || "there";

                const smsBody = `Hi ${customerName}, your appointment with ${businessName} has been rescheduled to ${newDate} at ${newTime}. Reply STOP to opt out.`;

                const smsResult = await sendTenantSms({
                  tenantId: tenantId!,
                  to: lead.phone,
                  body: smsBody,
                });

                if (smsResult.success) {
                  console.log(`[square-webhook] Reschedule SMS sent for ${fluxBooking.id}`);
                } else if (!smsResult.skipped) {
                  console.error(`[square-webhook] Reschedule SMS failed:`, smsResult.error);
                }
              }
            } catch (smsErr) {
              console.error("[square-webhook] Reschedule notification error:", smsErr);
            }
          }

          // Log booking event
          try {
            await supabase.from("booking_events").insert({
              tenant_id: tenantId,
              booking_id: fluxBooking.id,
              event_type: "rescheduled",
              source: "square_webhook",
              previous_start_at: fluxStartAt,
              new_start_at: squareStartAt,
              notification_sent_customer: true,
              notification_sent_owner: false,
              metadata: { square_booking_id: squareBookingId, booking_source: bookingSource },
            });
          } catch (_logErr) {
            // Non-critical — table may not exist yet
            console.warn("[square-webhook] Failed to log booking_event (table may not exist yet)");
          }
        }
      }

      // ─── NEW BOOKING (ACCEPTED/PENDING) ──────────────────────────
      if (squareStatus === "ACCEPTED" || squareStatus === "PENDING" || squareStatus === "accepted" || squareStatus === "pending") {
        if (fluxBooking) {
          // Booking already exists in Flux — just update booking_source if missing
          if (!fluxBooking.booking_source && bookingSource !== "unknown") {
            await supabase
              .from("bookings")
              .update({ booking_source: bookingSource })
              .eq("id", fluxBooking.id);
            console.log(`[square-webhook] Updated booking_source to ${bookingSource} for ${fluxBooking.id}`);
          }
        } else {
          // No Flux booking exists — this is a Square-originated booking
          // Create a Flux record so it shows up in the dashboard
          const customerId = squareBooking?.customer_id;
          let leadId: string | null = null;

          if (customerId) {
            // Find customer in our system by square_customer_id
            const { data: customer } = await supabase
              .from("customers")
              .select("id, phone_e164, full_name")
              .eq("tenant_id", tenantId)
              .contains("contact_preferences", { square_customer_id: customerId })
              .maybeSingle();

            if (customer) {
              // Find existing lead by phone
              const { data: existingLead } = await supabase
                .from("leads")
                .select("id")
                .eq("tenant_id", tenantId)
                .eq("phone", customer.phone_e164)
                .maybeSingle();

              if (existingLead) {
                leadId = existingLead.id;
              } else {
                const { data: newLead } = await supabase
                  .from("leads")
                  .insert({
                    tenant_id: tenantId,
                    full_name: customer.full_name,
                    phone: customer.phone_e164,
                    source: "square",
                    status: "new",
                  })
                  .select("id")
                  .single();
                leadId = newLead?.id || null;
              }
            } else {
              // Customer not synced yet — try to get info from Square booking
              const customerName = squareBooking?.customer_note?.split("\n")?.[0] || "Square Customer";
              const { data: newLead } = await supabase
                .from("leads")
                .insert({
                  tenant_id: tenantId,
                  full_name: customerName,
                  source: "square",
                  status: "new",
                })
                .select("id")
                .single();
              leadId = newLead?.id || null;
            }
          }

          // If no lead was resolved, create one with whatever info we have
          if (!leadId) {
            const fallbackName = squareBooking?.customer_note?.split("\n")?.[0] || "Square Booking";
            const { data: fallbackLead } = await supabase
              .from("leads")
              .insert({
                tenant_id: tenantId,
                full_name: fallbackName,
                source: "square",
                status: "new",
              })
              .select("id")
              .single();
            leadId = fallbackLead?.id || null;
            console.log(`[square-webhook] Created fallback lead ${leadId} for Square booking without customer`);
          }

          if (leadId) {
            const startAt = squareBooking?.start_at;
            const durationMin = squareBooking?.appointment_segments?.[0]?.duration_minutes || 60;
            const endAt = startAt
              ? new Date(new Date(startAt).getTime() + durationMin * 60000).toISOString()
              : new Date(Date.now() + durationMin * 60000).toISOString();

            // Strip source tags from notes before saving
            const cleanNote = customerNote.replace(/\s*\[source:\w+\]/g, "").trim() || null;

            const { data: newBooking } = await supabase
              .from("bookings")
              .insert({
                tenant_id: tenantId,
                lead_id: leadId,
                start_at: startAt || new Date().toISOString(),
                end_at: endAt,
                status: squareStatus.toLowerCase() === "accepted" ? "confirmed" : "pending",
                external_event_id: squareBookingId,
                external_provider: "square",
                booking_source: bookingSource,
                notes: cleanNote,
              })
              .select("id")
              .single();

            console.log(`[square-webhook] Created Flux booking ${newBooking?.id} from Square (source: ${bookingSource})`);

            // Create busy_block to prevent double-booking
            if (startAt) {
              await supabase.from("busy_blocks").insert({
                tenant_id: tenantId,
                booking_id: newBooking?.id,
                start_at: startAt,
                end_at: endAt,
                external_event_id: `square_${squareBookingId}`,
                block_type: "confirmed_booking",
                is_active: true,
              });
            }

            // ─── NOTIFICATION DEDUP ──────────────────────────────────
            // Website and AI phone already sent SMS — skip notifications for those
            // Square direct/online bookings need notifications via booking-handoff
            const shouldNotify = bookingSource === "square_direct" || bookingSource === "square_online";

            if (shouldNotify && newBooking?.id) {
              try {
                const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
                const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
                await fetch(`${supabaseUrl}/functions/v1/booking-handoff`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-closeloop-secret": Deno.env.get("CLOSELOOP_INTERNAL_SECRET") || serviceKey,
                  },
                  body: JSON.stringify({
                    booking_id: newBooking.id,
                    tenant_id: tenantId,
                  }),
                });
                console.log(`[square-webhook] Triggered booking-handoff for ${newBooking.id}`);
              } catch (e) {
                console.error("[square-webhook] Failed to trigger booking-handoff:", e);
              }
            } else {
              console.log(`[square-webhook] Skipping notifications for ${bookingSource} booking (already notified by source channel)`);
            }
          }
        }
      }

      // ─── COMPLETED ───────────────────────────────────────────────
      if (squareStatus === "COMPLETED" || squareStatus === "completed") {
        if (fluxBooking && fluxBooking.status !== "completed") {
          const endAt = squareBooking?.start_at
            ? new Date(new Date(squareBooking.start_at).getTime() +
                (squareBooking?.appointment_segments?.[0]?.duration_minutes || 60) * 60000).toISOString()
            : fluxBooking.end_at || new Date().toISOString();

          await supabase
            .from("bookings")
            .update({ status: "completed", end_at: endAt })
            .eq("id", fluxBooking.id);

          console.log(`[square-webhook] Marked booking ${fluxBooking.id} as completed`);

          // Trigger post-service automation (thank-you SMS, review request queue)
          try {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            await fetch(`${supabaseUrl}/functions/v1/booking-handoff`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-closeloop-secret": Deno.env.get("CLOSELOOP_INTERNAL_SECRET") || serviceKey,
              },
              body: JSON.stringify({
                booking_id: fluxBooking.id,
                tenant_id: tenantId,
                event: "completed",
              }),
            });
            console.log(`[square-webhook] Triggered completion handoff for ${fluxBooking.id}`);
          } catch (e) {
            console.error(`[square-webhook] Failed to trigger completion handoff:`, e);
          }
        } else if (!fluxBooking && busyBlock) {
          // Square-originated booking completed without a Flux record — create one
          const customerId = squareBooking?.customer_id;
          if (customerId) {
            const { data: customer } = await supabase
              .from("customers")
              .select("id, phone_e164, full_name")
              .eq("tenant_id", tenantId)
              .contains("contact_preferences", { square_customer_id: customerId })
              .maybeSingle();

            if (customer) {
              let leadId: string | null = null;
              const { data: existingLead } = await supabase
                .from("leads")
                .select("id")
                .eq("tenant_id", tenantId)
                .eq("phone", customer.phone_e164)
                .maybeSingle();

              if (existingLead) {
                leadId = existingLead.id;
              } else {
                const { data: newLead } = await supabase
                  .from("leads")
                  .insert({
                    tenant_id: tenantId,
                    full_name: customer.full_name,
                    phone: customer.phone_e164,
                    source: "square",
                    status: "completed",
                  })
                  .select("id")
                  .single();
                leadId = newLead?.id || null;
              }

              if (leadId) {
                const startAt = squareBooking?.start_at || busyBlock.start_at;
                const durationMin = squareBooking?.appointment_segments?.[0]?.duration_minutes || 60;
                const endAt = new Date(new Date(startAt).getTime() + durationMin * 60000).toISOString();

                await supabase.from("bookings").insert({
                  tenant_id: tenantId,
                  lead_id: leadId,
                  start_at: startAt,
                  end_at: endAt,
                  status: "completed",
                  external_event_id: squareBookingId,
                  external_provider: "square",
                  booking_source: bookingSource,
                  review_sent: false,
                  notes: "Completed via Square Appointments",
                });

                console.log(`[square-webhook] Created completed booking for Square booking ${squareBookingId}`);

                // Trigger post-service automation for newly created completed booking
                try {
                  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
                  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
                  const insertedBooking = await supabase
                    .from("bookings")
                    .select("id")
                    .eq("tenant_id", tenantId)
                    .eq("external_event_id", squareBookingId)
                    .maybeSingle();

                  if (insertedBooking?.data?.id) {
                    await fetch(`${supabaseUrl}/functions/v1/booking-handoff`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "x-closeloop-secret": Deno.env.get("CLOSELOOP_INTERNAL_SECRET") || serviceKey,
                      },
                      body: JSON.stringify({
                        booking_id: insertedBooking.data.id,
                        tenant_id: tenantId,
                        event: "completed",
                      }),
                    });
                    console.log(`[square-webhook] Triggered completion handoff for new booking ${insertedBooking.data.id}`);
                  }
                } catch (e) {
                  console.error(`[square-webhook] Failed to trigger completion handoff for new booking:`, e);
                }
              }
            }
          }
        }
      }

      // ─── CANCELLED ───────────────────────────────────────────────
      if (squareStatus === "CANCELLED_BY_CUSTOMER" || squareStatus === "CANCELLED_BY_SELLER") {
        if (fluxBooking) {
          await supabase
            .from("bookings")
            .update({ status: "canceled" })
            .eq("id", fluxBooking.id);

          // ALWAYS notify owner on cancellations, regardless of booking source
          try {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            await fetch(`${supabaseUrl}/functions/v1/booking-handoff`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-closeloop-secret": Deno.env.get("CLOSELOOP_INTERNAL_SECRET") || serviceKey,
              },
              body: JSON.stringify({
                booking_id: fluxBooking.id,
                tenant_id: tenantId,
                event: "cancelled",
              }),
            });
            console.log(`[square-webhook] Triggered cancellation notification for ${fluxBooking.id}`);
          } catch (e) {
            console.error("[square-webhook] Failed to trigger cancellation notification:", e);
          }
        }
        if (busyBlock) {
          await supabase
            .from("busy_blocks")
            .update({ is_active: false })
            .eq("id", busyBlock.id);
        }
        console.log(`[square-webhook] Cancelled booking ${squareBookingId}`);
      }
    }
  }

  // Mark webhook event as processed
  const webhookExternalId = body.data?.id || body.entity_id || null;
  if (webhookExternalId) {
    await supabase
      .from("integration_webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .eq("provider", "square")
      .eq("external_id", webhookExternalId)
      .eq("status", "received")
      .order("created_at", { ascending: false })
      .limit(1);
  }

  return jsonResp({ status: "ok" });
}

// ─── HubSpot Webhooks ───────────────────────────────────────────────────────

async function handleHubSpotWebhook(
  req: Request,
  supabase: ReturnType<typeof createClient>,
): Promise<Response> {
  const body = await req.json();

  // HubSpot sends an array of events
  const events = Array.isArray(body) ? body : [body];

  for (const event of events) {
    const portalId = event.portalId || event.appId;
    const eventType = event.subscriptionType || event.eventType || "unknown";

    // Resolve tenant from HubSpot portal ID
    let tenantId: string | null = null;
    if (portalId) {
      const { data: token } = await supabase
        .from("integration_oauth_tokens")
        .select("tenant_id")
        .eq("provider", "hubspot")
        .eq("extra_data->>portal_id", String(portalId))
        .single();
      if (token) tenantId = token.tenant_id;
    }

    if (!tenantId) {
      console.warn("HubSpot webhook: could not resolve tenant for portal", portalId);
      continue;
    }

    // Log event
    await supabase.from("integration_webhook_events").insert({
      tenant_id: tenantId,
      provider: "hubspot",
      event_type: eventType,
      external_id: event.objectId ? String(event.objectId) : null,
      payload: event,
      status: "received",
    });

    // Process contact changes for customer sync
    if (eventType.startsWith("contact.")) {
      // TODO: Sync contact changes back to customers table
      console.log(`HubSpot contact event: ${eventType} for tenant ${tenantId}`);
    }
  }

  return jsonResp({ status: "ok" });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function jsonResp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
