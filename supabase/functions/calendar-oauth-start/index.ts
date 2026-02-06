import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { requireAuthedTenant } from "../_shared/tenant.ts";

// OAuth configuration
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID");
const GOOGLE_REDIRECT_URI = Deno.env.get("GOOGLE_CALENDAR_REDIRECT_URI");

const MS_CLIENT_ID = Deno.env.get("MS_CALENDAR_CLIENT_ID");
const MS_REDIRECT_URI = Deno.env.get("MS_CALENDAR_REDIRECT_URI");

const JWT_SECRET = Deno.env.get("SUPABASE_JWT_SECRET") || Deno.env.get("CLOSELOOP_OAUTH_STATE_SECRET") || "closeloop-state-secret";

// Simple state signing
async function signState(data: Record<string, string>): Promise<string> {
  const payload = JSON.stringify(data);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return btoa(payload) + "." + signatureB64;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    const { tenantId } = await requireAuthedTenant(req);

    const { provider } = await req.json();

    if (!provider || !["google", "microsoft"].includes(provider)) {
      return errorResponse("Invalid provider", 400);
    }

    // Create signed state with tenant_id
    const state = await signState({
      tenant_id: tenantId,
      provider,
      timestamp: Date.now().toString(),
    });

    let authUrl: string;

    if (provider === "google") {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
        return errorResponse("Google Calendar not configured. Please add GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_REDIRECT_URI secrets.", 500);
      }

      const scopes = [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.freebusy",
      ];

      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: "code",
        scope: scopes.join(" "),
        access_type: "offline",
        prompt: "consent",
        state,
      });

      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    } else if (provider === "microsoft") {
      if (!MS_CLIENT_ID || !MS_REDIRECT_URI) {
        return errorResponse("Microsoft Calendar not configured. Please add MS_CALENDAR_CLIENT_ID and MS_CALENDAR_REDIRECT_URI secrets.", 500);
      }

      const scopes = [
        "openid",
        "offline_access",
        "Calendars.ReadWrite",
        "User.Read",
      ];

      const params = new URLSearchParams({
        client_id: MS_CLIENT_ID,
        redirect_uri: MS_REDIRECT_URI,
        response_type: "code",
        scope: scopes.join(" "),
        state,
      });

      authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
    } else {
      return errorResponse("Unknown provider", 400);
    }

    return jsonResponse({ auth_url: authUrl });
  } catch (error: unknown) {
    console.error("Error in calendar-oauth-start:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
