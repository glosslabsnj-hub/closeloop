/**
 * calendly-proxy: Secure proxy for Calendly API calls.
 *
 * Reads the tenant's stored Calendly Personal Access Token from
 * calendar_connections.config_json.api_key and proxies requests to
 * Calendly's v2 API.
 *
 * Actions:
 *   - verify_token   : Validate PAT and return user info
 *   - get_event_types: List the tenant's Calendly event types
 *   - get_availability: Get available slots for a given event type + date range
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { requireAuthedTenant, serviceClient } from "../_shared/tenant.ts";

const CALENDLY_BASE = "https://api.calendly.com";

async function calendlyRequest(token: string, path: string, params?: Record<string, string>) {
  const url = new URL(`${CALENDLY_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendly API error ${res.status}: ${text}`);
  }
  return res.json();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const body = await req.json();
    const { action, tenant_id: bodyTenantId, event_type_uri, start_time, end_time } = body;

    const { tenantId } = await requireAuthedTenant(req, bodyTenantId || null);
    const supabase = serviceClient();

    // ── Fetch stored token ──────────────────────────────────────────────────
    const { data: connection, error: connErr } = await supabase
      .from("calendar_connections")
      .select("id, config_json, status")
      .eq("tenant_id", tenantId)
      .eq("provider", "calendly")
      .maybeSingle();

    if (connErr) throw new Error(connErr.message);

    // Special case: verify_token doesn't need an existing connection
    const token =
      action === "verify_token"
        ? body.api_key
        : (connection?.config_json as Record<string, unknown>)?.api_key as string;

    if (!token) {
      return errorResponse(
        action === "verify_token"
          ? "api_key is required"
          : "No Calendly token found. Connect Calendly first.",
        400,
      );
    }

    // ── verify_token ────────────────────────────────────────────────────────
    if (action === "verify_token") {
      const data = await calendlyRequest(token, "/users/me");
      return jsonResponse({
        valid: true,
        user: {
          name: data.resource?.name,
          email: data.resource?.email,
          scheduling_url: data.resource?.scheduling_url,
          uri: data.resource?.uri,
        },
      });
    }

    // ── get_event_types ─────────────────────────────────────────────────────
    if (action === "get_event_types") {
      // First get user URI
      const meData = await calendlyRequest(token, "/users/me");
      const userUri = meData.resource?.uri;
      if (!userUri) throw new Error("Could not get Calendly user URI");

      const data = await calendlyRequest(token, "/event_types", { user: userUri, active: "true" });
      const eventTypes = (data.collection || []).map((et: Record<string, unknown>) => ({
        uri: et.uri,
        name: et.name,
        duration: et.duration,
        scheduling_url: et.scheduling_url,
        slug: et.slug,
        color: et.color,
      }));

      return jsonResponse({ event_types: eventTypes });
    }

    // ── get_availability ────────────────────────────────────────────────────
    if (action === "get_availability") {
      if (!event_type_uri) return errorResponse("event_type_uri is required", 400);
      const startRange = start_time || new Date().toISOString();
      const endRange = end_time || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const data = await calendlyRequest(token, "/event_type_available_times", {
        event_type: event_type_uri,
        start_time: startRange,
        end_time: endRange,
      });

      const slots = (data.collection || []).map((slot: Record<string, unknown>) => ({
        start_time: slot.start_time,
        status: slot.status,
        invitees_remaining: slot.invitees_remaining,
      }));

      return jsonResponse({ slots });
    }

    return errorResponse(`Unknown action: ${action}`, 400);
  } catch (err: unknown) {
    console.error("[calendly-proxy] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    // Surface "invalid token" clearly
    if (message.includes("401") || message.includes("unauthorized")) {
      return errorResponse("Invalid Calendly token. Please reconnect.", 401);
    }
    return errorResponse(message, 500);
  }
});
