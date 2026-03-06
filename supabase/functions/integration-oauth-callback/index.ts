/**
 * Universal OAuth Callback — handles the redirect from any OAuth provider.
 *
 * Query params: code, state, error
 * Returns: HTML page that postMessages to opener and auto-closes.
 *
 * Flow:
 * 1. Verify signed state (HMAC-SHA256)
 * 2. Exchange code for tokens
 * 3. Store tokens in integration_oauth_tokens table
 * 4. Upsert record in integrations or calendar_connections (per provider config)
 * 5. Return HTML success/error page with postMessage to opener
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getOAuthProvider } from "../_shared/oauthProviders.ts";
import { verifyState, exchangeCodeForTokens, getRedirectUri } from "../_shared/oauthHelpers.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return htmlResponse("error", `OAuth error: ${error}`);
    }

    if (!code || !stateParam) {
      return htmlResponse("error", "Missing code or state");
    }

    // Verify state
    const stateData = await verifyState(stateParam);
    if (!stateData || !stateData.tenant_id || !stateData.provider) {
      return htmlResponse("error", "Invalid or expired state");
    }

    const { tenant_id, provider: providerId } = stateData;

    let providerConfig;
    try {
      providerConfig = getOAuthProvider(providerId);
    } catch {
      return htmlResponse("error", `Unknown provider: ${providerId}`);
    }

    // Exchange code for tokens
    const redirectUri = getRedirectUri(providerId);
    let tokens;
    try {
      tokens = await exchangeCodeForTokens(providerConfig, code, redirectUri);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Token exchange failed";
      return htmlResponse("error", msg);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Store tokens in unified table
    const { error: tokenError } = await supabase
      .from("integration_oauth_tokens")
      .upsert(
        {
          tenant_id,
          provider: providerId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_type: tokens.token_type || "Bearer",
          scope: tokens.scope || providerConfig.scopes.join(" "),
          expires_at: expiresAt,
          status: "connected",
          error_message: null,
          extra_data: extractExtraData(providerId, tokens),
        },
        { onConflict: "tenant_id,provider" },
      );

    if (tokenError) {
      console.error("Token storage error:", tokenError);
      return htmlResponse("error", "Failed to store tokens");
    }

    // Upsert into appropriate storage target
    if (providerConfig.storageTarget === "calendar_connections") {
      await upsertCalendarConnection(supabase, tenant_id, providerId, providerConfig, tokens);
    } else {
      await upsertIntegration(supabase, tenant_id, providerId, providerConfig, tokens);
    }

    // Trigger initial sync for Square integrations (customers + availability)
    if (providerId === "square_pos") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const syncHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      };
      // Fire-and-forget: don't block the OAuth callback on sync completion
      fetch(`${supabaseUrl}/functions/v1/sync-square-customers`, {
        method: "POST",
        headers: syncHeaders,
        body: JSON.stringify({ tenant_id }),
      }).catch((e) => console.error("[oauth-callback] Square customer sync trigger error:", e));

      fetch(`${supabaseUrl}/functions/v1/sync-square-availability`, {
        method: "POST",
        headers: syncHeaders,
        body: JSON.stringify({ tenant_id }),
      }).catch((e) => console.error("[oauth-callback] Square availability sync trigger error:", e));

      console.log(`[oauth-callback] Triggered initial Square sync for tenant ${tenant_id.substring(0, 8)}`);
    }

    // Return success page
    return htmlResponse("success", null, {
      provider: providerId,
      displayName: providerConfig.displayName,
    });
  } catch (error: unknown) {
    console.error("Error in integration-oauth-callback:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return htmlResponse("error", message);
  }
});

// ─── Storage Helpers ────────────────────────────────────────────────────────

async function upsertCalendarConnection(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  providerId: string,
  providerConfig: ReturnType<typeof getOAuthProvider>,
  tokens: Record<string, unknown>,
) {
  // Map provider ID to calendar provider name
  const calendarProvider = providerId === "google_calendar" ? "google" : providerId === "microsoft_calendar" ? "microsoft" : providerId;

  // Fetch calendars if this is a calendar provider
  let calendars: { id: string; name: string; primary?: boolean }[] = [];

  if (providerId === "google_calendar" && tokens.access_token) {
    try {
      const resp = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
      if (resp.ok) {
        const data = await resp.json();
        calendars = (data.items || []).map((cal: Record<string, unknown>) => ({
          id: cal.id as string,
          name: (cal.summary as string) || (cal.id as string),
          primary: (cal.primary as boolean) || false,
        }));
      }
    } catch (e) {
      console.error("Failed to fetch Google calendars:", e);
    }
  } else if (providerId === "microsoft_calendar" && tokens.access_token) {
    try {
      const resp = await fetch(
        "https://graph.microsoft.com/v1.0/me/calendars",
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
      if (resp.ok) {
        const data = await resp.json();
        calendars = (data.value || []).map((cal: Record<string, unknown>) => ({
          id: cal.id as string,
          name: (cal.name as string) || (cal.id as string),
          primary: (cal.isDefaultCalendar as boolean) || false,
        }));
      }
    } catch (e) {
      console.error("Failed to fetch Microsoft calendars:", e);
    }
  }

  const { data: existing } = await supabase
    .from("calendar_connections")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("provider", calendarProvider)
    .single();

  if (existing) {
    await supabase
      .from("calendar_connections")
      .update({
        status: "connected",
        config_json: {
          available_calendars: calendars,
          selected_calendar_ids: calendars.filter((c) => c.primary).map((c) => c.id),
        },
        scopes_json: providerConfig.scopes,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("calendar_connections").insert({
      tenant_id: tenantId,
      provider: calendarProvider,
      status: "connected",
      auth_type: "oauth",
      display_name: providerConfig.displayName,
      config_json: {
        available_calendars: calendars,
        selected_calendar_ids: calendars.filter((c) => c.primary).map((c) => c.id),
      },
      scopes_json: providerConfig.scopes,
    });
  }

  // Also store in calendar_tokens for backward compat with existing sync logic
  await supabase
    .from("calendar_tokens")
    .upsert(
      {
        tenant_id: tenantId,
        provider: calendarProvider,
        access_token: tokens.access_token as string,
        refresh_token: (tokens.refresh_token as string) || null,
        token_type: (tokens.token_type as string) || "Bearer",
        scope: (tokens.scope as string) || providerConfig.scopes.join(" "),
        expires_at: tokens.expires_in
          ? new Date(Date.now() + (tokens.expires_in as number) * 1000).toISOString()
          : null,
      },
      { onConflict: "tenant_id,provider" },
    );
}

async function upsertIntegration(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  providerId: string,
  providerConfig: ReturnType<typeof getOAuthProvider>,
  tokens: Record<string, unknown>,
) {
  const { data: existing } = await supabase
    .from("integrations")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("provider", providerId)
    .single();

  const extraData = extractExtraData(providerId, tokens);

  if (existing) {
    await supabase
      .from("integrations")
      .update({
        status: "connected",
        auth_type: "oauth",
        config_json: { oauth_connected: true, ...extraData },
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("integrations").insert({
      tenant_id: tenantId,
      provider: providerId,
      display_name: providerConfig.displayName,
      status: "connected",
      auth_type: "oauth",
      config_json: { oauth_connected: true, ...extraData },
      scopes_json: providerConfig.scopes,
    });
  }
}

/**
 * Extract provider-specific extra data from token response.
 * E.g., Stripe returns stripe_user_id, QuickBooks returns realmId.
 */
function extractExtraData(
  providerId: string,
  tokens: Record<string, unknown>,
): Record<string, unknown> {
  const extra: Record<string, unknown> = {};

  if (providerId === "stripe_connect") {
    if (tokens.stripe_user_id) extra.stripe_user_id = tokens.stripe_user_id;
    if (tokens.stripe_publishable_key) extra.stripe_publishable_key = tokens.stripe_publishable_key;
  }

  if (providerId === "quickbooks") {
    // QuickBooks realm ID is in the URL params, may also be in response
    if (tokens.realmId) extra.realm_id = tokens.realmId;
  }

  if (providerId === "square_pos") {
    if (tokens.merchant_id) extra.merchant_id = tokens.merchant_id;
  }

  return extra;
}

// ─── HTML Response ──────────────────────────────────────────────────────────

function htmlResponse(
  status: "success" | "error",
  errorMessage?: string | null,
  successData?: { provider: string; displayName: string },
): Response {
  if (status === "error") {
    return new Response(
      `<!DOCTYPE html>
<html>
<head>
  <title>Connection Failed</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fef2f2; }
    .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
    .icon { font-size: 48px; margin-bottom: 1rem; }
    h1 { color: #dc2626; margin: 0 0 0.5rem; font-size: 1.25rem; }
    p { color: #6b7280; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#10060;</div>
    <h1>Connection Failed</h1>
    <p>${escapeHtml(errorMessage || "Something went wrong")}</p>
    <p style="margin-top: 1rem;"><a href="#" onclick="window.close()">Close this window</a></p>
  </div>
  <script>
    setTimeout(function() {
      try {
        if (window.opener) {
          window.opener.postMessage({ type: 'integration-oauth-error', error: ${JSON.stringify(errorMessage || "Unknown error")} }, '*');
        }
      } catch(e) {}
    }, 500);
  </script>
</body>
</html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  }

  const provider = successData?.provider || "";
  const displayName = successData?.displayName || "Integration";

  return new Response(
    `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(displayName)} Connected!</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f0fdf4; }
    .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
    .icon { font-size: 48px; margin-bottom: 1rem; }
    h1 { color: #16a34a; margin: 0 0 0.5rem; font-size: 1.25rem; }
    p { color: #6b7280; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#9989;</div>
    <h1>${escapeHtml(displayName)} connected!</h1>
    <p>This window will close automatically.</p>
  </div>
  <script>
    (function() {
      try {
        if (window.opener) {
          window.opener.postMessage({
            type: 'integration-oauth-success',
            provider: ${JSON.stringify(provider)}
          }, '*');
        }
      } catch (e) {
        console.error('postMessage failed:', e);
      }
      setTimeout(function() { window.close(); }, 1500);
    })();
  </script>
</body>
</html>`,
    { headers: { "Content-Type": "text/html" } },
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
