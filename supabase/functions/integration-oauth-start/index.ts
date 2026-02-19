/**
 * Universal OAuth Start — initiates OAuth flow for any supported provider.
 *
 * POST body: { provider: string, tenant_id?: string }
 * Returns: { auth_url: string }
 *
 * Replaces provider-specific start functions with a single, extensible endpoint.
 * The existing calendar-oauth-start is kept for backward compatibility.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { requireAuthedTenant } from "../_shared/tenant.ts";
import { getOAuthProvider, listOAuthProviderIds } from "../_shared/oauthProviders.ts";
import { signState, getRedirectUri } from "../_shared/oauthHelpers.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    const body = await req.json();
    const { provider: providerId, tenant_id: bodyTenantId } = body;

    // Authenticate
    const { tenantId } = await requireAuthedTenant(req, bodyTenantId || null);

    // Validate provider
    const supportedProviders = listOAuthProviderIds();
    if (!providerId || !supportedProviders.includes(providerId)) {
      return errorResponse(
        `Invalid provider. Supported: ${supportedProviders.join(", ")}`,
        400,
      );
    }

    const provider = getOAuthProvider(providerId);

    // Verify credentials are configured
    const clientId = Deno.env.get(provider.clientIdEnv);
    if (!clientId) {
      return errorResponse(
        `${provider.name} not configured. Please add ${provider.clientIdEnv} secret.`,
        500,
      );
    }

    // Create signed state
    const state = await signState({
      tenant_id: tenantId,
      provider: providerId,
      timestamp: Date.now().toString(),
    });

    // Build redirect URI
    const redirectUri = getRedirectUri(providerId);

    // Build auth URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: provider.scopes.join(" "),
      state,
      ...(provider.extraAuthParams || {}),
    });

    const authUrl = `${provider.authUrl}?${params.toString()}`;

    return jsonResponse({ auth_url: authUrl });
  } catch (error: unknown) {
    console.error("Error in integration-oauth-start:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
