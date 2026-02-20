/**
 * elevenlabs-check-calendly: Called by ElevenLabs voice agent to check
 * real-time Calendly availability and return bookable slots.
 *
 * This is a public endpoint (called by ElevenLabs, not the user browser),
 * so JWT verification is off and we trust tenant_id from the request.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/tenant.ts";

const CALENDLY_BASE = "https://api.calendly.com";

async function calendlyGet(token: string, path: string, params?: Record<string, string>) {
  const url = new URL(`${CALENDLY_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendly ${res.status}: ${text}`);
  }
  return res.json();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const body = await req.json();
    const { tenant_id, days = 7, event_type_uri } = body;

    if (!tenant_id) return errorResponse("tenant_id required", 400);

    const supabase = serviceClient();

    // Get Calendly connection for this tenant
    const { data: connection } = await supabase
      .from("calendar_connections")
      .select("config_json, status")
      .eq("tenant_id", tenant_id)
      .eq("provider", "calendly")
      .eq("status", "connected")
      .maybeSingle();

    if (!connection) {
      return jsonResponse({
        available: false,
        message: "No Calendly integration connected",
        slots: [],
      });
    }

    const token = (connection.config_json as Record<string, unknown>)?.api_key as string;
    if (!token) {
      return jsonResponse({ available: false, message: "Calendly token missing", slots: [] });
    }

    // Get user URI if no specific event type provided
    let targetEventType = event_type_uri;
    if (!targetEventType) {
      const meData = await calendlyGet(token, "/users/me");
      const userUri = meData.resource?.uri;
      const etData = await calendlyGet(token, "/event_types", { user: userUri, active: "true" });
      // Use the first active event type (usually Discovery Call / default)
      const firstEt = etData.collection?.[0];
      if (!firstEt) {
        return jsonResponse({ available: false, message: "No active event types found", slots: [] });
      }
      targetEventType = firstEt.uri;
    }

    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const data = await calendlyGet(token, "/event_type_available_times", {
      event_type: targetEventType,
      start_time: startTime,
      end_time: endTime,
    });

    const slots = (data.collection || [])
      .filter((s: Record<string, unknown>) => s.status === "available")
      .slice(0, 10) // Return top 10 slots
      .map((s: Record<string, unknown>) => {
        const dt = new Date(s.start_time as string);
        return {
          start_time: s.start_time,
          // Human-readable for the AI to speak
          readable: dt.toLocaleString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
          }),
        };
      });

    return jsonResponse({
      available: slots.length > 0,
      slots,
      booking_link: (connection.config_json as Record<string, unknown>)?.scheduling_url || "",
    });
  } catch (err: unknown) {
    console.error("[elevenlabs-check-calendly] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
