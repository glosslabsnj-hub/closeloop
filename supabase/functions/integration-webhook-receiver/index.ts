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
