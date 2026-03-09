/**
 * Square Token Helper — ensures a valid access token for Square API calls.
 *
 * All Square sync functions should use getSquareConfig() instead of
 * reading config.access_token directly. This helper:
 * 1. Checks integration_oauth_tokens for expiration
 * 2. Auto-refreshes if token expires within 10 minutes
 * 3. Syncs refreshed token back to integrations.config_json (dual storage compat)
 * 4. Returns the full config (access_token, location_id, team_member_id)
 *
 * If the token cannot be refreshed (revoked, no refresh_token), marks the
 * integration as needing reconnection and returns null.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getValidAccessToken, refreshOAuthToken } from "./oauthHelpers.ts";

export interface SquareConfig {
  accessToken: string;
  locationId: string;
  teamMemberId?: string;
  merchantId?: string;
}

function serviceClient() {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}

/**
 * Get a valid Square configuration with guaranteed-fresh access token.
 *
 * @returns SquareConfig with valid token, or null if token expired and refresh failed
 */
export async function getSquareConfig(tenantId: string): Promise<SquareConfig | null> {
  const supabase = serviceClient();

  // 1. Get the integration record (for location_id, team_member_id)
  const { data: integration, error: intError } = await supabase
    .from("integrations")
    .select("id, config_json, status")
    .eq("tenant_id", tenantId)
    .eq("provider", "square_pos")
    .eq("status", "connected")
    .maybeSingle();

  if (intError || !integration) {
    return null;
  }

  const config = integration.config_json as Record<string, string>;
  const locationId = config.location_id;

  if (!locationId) {
    console.error(`[squareToken] No location_id for tenant ${tenantId.substring(0, 8)}`);
    return null;
  }

  // 2. Try to get a valid token via the OAuth token system (with auto-refresh)
  let accessToken: string | null = null;

  try {
    accessToken = await getValidAccessToken("square_pos", tenantId);
  } catch (oauthErr) {
    // OAuth tokens table might not have this tenant's data (legacy setup or
    // token was stored only in config_json). Fall back to config_json token.
    console.warn(
      `[squareToken] OAuth token lookup failed for tenant ${tenantId.substring(0, 8)}: ${oauthErr instanceof Error ? oauthErr.message : String(oauthErr)}. Falling back to config_json.`
    );
    accessToken = config.access_token || null;
  }

  if (!accessToken) {
    console.error(`[squareToken] No valid token for tenant ${tenantId.substring(0, 8)}`);

    // Mark integration as needing reconnection
    await supabase
      .from("integrations")
      .update({
        status: "token_expired",
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    return null;
  }

  // 3. If the token was refreshed (different from what's in config_json), sync it back
  if (accessToken !== config.access_token) {
    const updatedConfig = { ...config, access_token: accessToken };
    await supabase
      .from("integrations")
      .update({
        config_json: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    console.log(`[squareToken] Synced refreshed token to config_json for tenant ${tenantId.substring(0, 8)}`);
  }

  return {
    accessToken,
    locationId,
    teamMemberId: config.team_member_id || undefined,
    merchantId: config.merchant_id || undefined,
  };
}
