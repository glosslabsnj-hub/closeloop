/**
 * Shared OAuth helpers — state signing/verification and token refresh.
 *
 * Used by both integration-oauth-start and integration-oauth-callback.
 * Mirrors the HMAC-SHA256 pattern from calendar-oauth-start/callback.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getOAuthProvider, type OAuthProviderConfig } from "./oauthProviders.ts";

const JWT_SECRET =
  Deno.env.get("SUPABASE_JWT_SECRET") ||
  Deno.env.get("CLOSELOOP_OAUTH_STATE_SECRET") ||
  "closeloop-state-secret";

// ─── State Signing / Verification ───────────────────────────────────────────

export interface OAuthState {
  tenant_id: string;
  provider: string;
  timestamp: string;
}

/**
 * Sign state payload with HMAC-SHA256. Returns base64(payload).base64(sig).
 */
export async function signState(data: OAuthState): Promise<string> {
  const payload = JSON.stringify(data);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return btoa(payload) + "." + signatureB64;
}

/**
 * Verify HMAC-signed state. Returns parsed state or null if invalid.
 * Rejects states older than 10 minutes.
 */
export async function verifyState(state: string): Promise<OAuthState | null> {
  try {
    const [payloadB64, signatureB64] = state.split(".");
    if (!payloadB64 || !signatureB64) return null;

    const payload = atob(payloadB64);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signature = Uint8Array.from(atob(signatureB64), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(payload));
    if (!valid) return null;

    const parsed = JSON.parse(payload) as OAuthState;

    // Reject states older than 10 minutes
    const age = Date.now() - Number(parsed.timestamp);
    if (age > 10 * 60 * 1000) return null;

    return parsed;
  } catch {
    return null;
  }
}

// ─── Token Exchange ─────────────────────────────────────────────────────────

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  // Provider-specific extras (e.g. Stripe's stripe_user_id, QuickBooks' realmId)
  [key: string]: unknown;
}

/**
 * Exchange authorization code for tokens using provider config.
 */
export async function exchangeCodeForTokens(
  provider: OAuthProviderConfig,
  code: string,
  redirectUri: string,
): Promise<OAuthTokens> {
  const clientId = Deno.env.get(provider.clientIdEnv);
  const clientSecret = Deno.env.get(provider.clientSecretEnv);

  if (!clientId || !clientSecret) {
    throw new Error(`${provider.name} not configured — missing ${provider.clientIdEnv} or ${provider.clientSecretEnv}`);
  }

  const body: Record<string, string> = {
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    ...(provider.extraTokenParams || {}),
  };

  const response = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`${provider.name} token exchange error:`, errorText);
    throw new Error(`Failed to exchange code for tokens with ${provider.name}`);
  }

  return await response.json() as OAuthTokens;
}

// ─── Token Refresh ──────────────────────────────────────────────────────────

/**
 * Refresh an OAuth token using the refresh_token grant.
 * Returns new tokens. Stores updated tokens in the DB.
 */
export async function refreshOAuthToken(
  providerId: string,
  tenantId: string,
): Promise<OAuthTokens> {
  const provider = getOAuthProvider(providerId);
  const supabase = serviceClient();

  // Fetch stored tokens
  const { data: tokenRow, error: fetchErr } = await supabase
    .from("integration_oauth_tokens")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("provider", providerId)
    .single();

  if (fetchErr || !tokenRow) {
    throw new Error(`No stored tokens for ${providerId}`);
  }

  if (!tokenRow.refresh_token) {
    throw new Error(`No refresh token available for ${providerId}`);
  }

  const clientId = Deno.env.get(provider.clientIdEnv);
  const clientSecret = Deno.env.get(provider.clientSecretEnv);

  if (!clientId || !clientSecret) {
    throw new Error(`${provider.name} not configured for refresh`);
  }

  const response = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokenRow.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`${provider.name} token refresh error:`, errorText);

    // Mark integration as errored
    await supabase
      .from("integration_oauth_tokens")
      .update({ status: "error", error_message: "Token refresh failed" })
      .eq("id", tokenRow.id);

    throw new Error(`Failed to refresh token for ${provider.name}`);
  }

  const newTokens = (await response.json()) as OAuthTokens;
  const expiresAt = newTokens.expires_in
    ? new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
    : null;

  // Update stored tokens (some providers don't return a new refresh_token)
  await supabase
    .from("integration_oauth_tokens")
    .update({
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token || tokenRow.refresh_token,
      expires_at: expiresAt,
      status: "connected",
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tokenRow.id);

  return newTokens;
}

/**
 * Get a valid access token for a provider, refreshing if expired.
 */
export async function getValidAccessToken(
  providerId: string,
  tenantId: string,
): Promise<string> {
  const supabase = serviceClient();

  const { data: tokenRow, error } = await supabase
    .from("integration_oauth_tokens")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("provider", providerId)
    .single();

  if (error || !tokenRow) {
    throw new Error(`No OAuth tokens for ${providerId}`);
  }

  // Check if token is expired (with 5-min buffer)
  if (tokenRow.expires_at) {
    const expiresAt = new Date(tokenRow.expires_at).getTime();
    const bufferMs = 5 * 60 * 1000;
    if (Date.now() > expiresAt - bufferMs) {
      const refreshed = await refreshOAuthToken(providerId, tenantId);
      return refreshed.access_token;
    }
  }

  return tokenRow.access_token;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function serviceClient() {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}

/**
 * Compute the redirect URI for a provider.
 * Uses provider-specific env var if set, otherwise constructs from SUPABASE_URL.
 */
export function getRedirectUri(providerId: string): string {
  const provider = getOAuthProvider(providerId);

  // Check for provider-specific redirect URI env var
  if (provider.redirectUriEnv) {
    const envVal = Deno.env.get(provider.redirectUriEnv);
    if (envVal) return envVal;
  }

  // Construct from SUPABASE_URL — points to the universal callback
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  return `${supabaseUrl}/functions/v1/integration-oauth-callback`;
}
