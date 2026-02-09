import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { requireAuthedTenant } from "../_shared/tenant.ts";

// QuickBooks OAuth configuration
const QB_CLIENT_ID = Deno.env.get("QUICKBOOKS_CLIENT_ID");
const QB_REDIRECT_URI = Deno.env.get("QUICKBOOKS_REDIRECT_URI");

const JWT_SECRET = Deno.env.get("SUPABASE_JWT_SECRET") || Deno.env.get("CLOSELOOP_OAUTH_STATE_SECRET") || "closeloop-state-secret";

// Simple state signing for CSRF protection
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

    if (!QB_CLIENT_ID || !QB_REDIRECT_URI) {
      return errorResponse(
        "QuickBooks integration not configured. Please add QUICKBOOKS_CLIENT_ID and QUICKBOOKS_REDIRECT_URI to environment variables.",
        500,
      );
    }

    // Create signed state with tenant_id
    const state = await signState({
      tenant_id: tenantId,
      provider: "quickbooks",
      timestamp: Date.now().toString(),
    });

    // QuickBooks OAuth scopes for accounting data
    // See: https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0
    const scopes = [
      "com.intuit.quickbooks.accounting",  // Full accounting access
      "openid",                             // Required for OAuth
      "profile",                            // Basic profile info
      "email",                              // Email address
    ];

    // QuickBooks authorization URL
    // Sandbox: https://appcenter.intuit.com/connect/oauth2
    // Production: same URL, QB uses realm_id to distinguish
    const authUrl = new URL("https://appcenter.intuit.com/connect/oauth2");
    authUrl.searchParams.set("client_id", QB_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", QB_REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scopes.join(" "));
    authUrl.searchParams.set("state", state);

    return jsonResponse({ auth_url: authUrl.toString() });
  } catch (error: unknown) {
    console.error("Error in quickbooks-oauth-start:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
