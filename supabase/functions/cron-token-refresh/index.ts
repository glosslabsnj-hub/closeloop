/**
 * cron-token-refresh: Proactively refresh OAuth tokens before they expire.
 *
 * Runs daily. Checks all connected integrations across all tenants.
 * Refreshes any token expiring within 7 days. Alerts on failures.
 *
 * This prevents the silent-break scenario where a business owner's
 * Square/Google/Jobber connection dies because a token expired overnight.
 *
 * Works for ALL providers: Square, Google Calendar, Jobber, Housecall Pro,
 * QuickBooks, HubSpot, Stripe Connect, Microsoft Calendar.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { refreshOAuthToken } from "../_shared/oauthHelpers.ts";
import { OAUTH_PROVIDERS } from "../_shared/oauthProviders.ts";
import { sendTenantSms } from "../_shared/sms-sender.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Refresh tokens expiring within this window
const REFRESH_WINDOW_DAYS = 7;

serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();
    const refreshBefore = new Date(now.getTime() + REFRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const results = {
      checked: 0,
      refreshed: 0,
      already_fresh: 0,
      no_expiry: 0,
      no_refresh_token: 0,
      errors: 0,
      error_details: [] as { tenant_id: string; provider: string; error: string }[],
    };

    // Find all connected tokens that expire within the refresh window
    const { data: tokens, error: fetchErr } = await supabase
      .from("integration_oauth_tokens")
      .select("id, tenant_id, provider, expires_at, refresh_token, status")
      .eq("status", "connected");

    if (fetchErr) {
      console.error("[cron-token-refresh] Failed to fetch tokens:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 });
    }

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: "No connected integrations found", ...results }));
    }

    results.checked = tokens.length;

    for (const token of tokens) {
      try {
        // Skip providers we don't have config for
        if (!OAUTH_PROVIDERS[token.provider]) {
          continue;
        }

        // No expiry date — some providers have long-lived tokens
        if (!token.expires_at) {
          results.no_expiry++;
          continue;
        }

        const expiresAt = new Date(token.expires_at);

        // Token doesn't expire within our window — skip
        if (expiresAt > refreshBefore) {
          results.already_fresh++;
          continue;
        }

        // No refresh token available — can't refresh, mark as warning
        if (!token.refresh_token) {
          results.no_refresh_token++;

          // If it's expiring within 24h and we can't refresh, mark as error
          const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
          if (hoursUntilExpiry < 24) {
            await supabase
              .from("integration_oauth_tokens")
              .update({
                status: "error",
                error_message: "Token expiring soon and no refresh token available. Reconnect required.",
                updated_at: now.toISOString(),
              })
              .eq("id", token.id);

            results.error_details.push({
              tenant_id: token.tenant_id,
              provider: token.provider,
              error: `Expiring in ${hoursUntilExpiry.toFixed(1)}h, no refresh token`,
            });
          }
          continue;
        }

        // Refresh the token
        console.log(`[cron-token-refresh] Refreshing ${token.provider} for tenant ${token.tenant_id} (expires ${token.expires_at})`);

        await refreshOAuthToken(token.provider, token.tenant_id);
        results.refreshed++;

        console.log(`[cron-token-refresh] Successfully refreshed ${token.provider} for tenant ${token.tenant_id}`);
      } catch (err) {
        results.errors++;
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[cron-token-refresh] Failed to refresh ${token.provider} for tenant ${token.tenant_id}:`, errorMsg);

        results.error_details.push({
          tenant_id: token.tenant_id,
          provider: token.provider,
          error: errorMsg,
        });

        // Don't double-mark as error — refreshOAuthToken already does this on failure
      }
    }

    // Also check calendar_tokens table for legacy tokens
    try {
      const { data: calendarTokens } = await supabase
        .from("calendar_tokens")
        .select("id, connection_id, provider, expires_at, refresh_token")
        .not("refresh_token", "is", null);

      if (calendarTokens && calendarTokens.length > 0) {
        for (const ct of calendarTokens) {
          if (!ct.expires_at) continue;
          const expiresAt = new Date(ct.expires_at);
          if (expiresAt > refreshBefore) continue;

          // Legacy calendar tokens — log for awareness but don't try to refresh
          // (they should be migrated to integration_oauth_tokens)
          console.warn(`[cron-token-refresh] Legacy calendar_token expiring soon: ${ct.provider} (connection ${ct.connection_id})`);
        }
      }
    } catch {
      // calendar_tokens may not exist in all deployments
    }

    // Notify business owners about token failures that need reconnection
    if (results.error_details.length > 0) {
      // Group errors by tenant
      const errorsByTenant = new Map<string, string[]>();
      for (const err of results.error_details) {
        const existing = errorsByTenant.get(err.tenant_id) || [];
        const providerName = OAUTH_PROVIDERS[err.provider]?.displayName || err.provider;
        existing.push(providerName);
        errorsByTenant.set(err.tenant_id, existing);
      }

      for (const [tenantId, providers] of errorsByTenant) {
        try {
          // Get owner notification phone
          const { data: deliverySettings } = await supabase
            .from("booking_delivery_settings")
            .select("notify_phone")
            .eq("tenant_id", tenantId)
            .maybeSingle();

          if (deliverySettings?.notify_phone) {
            const { data: tenant } = await supabase
              .from("tenants")
              .select("name")
              .eq("id", tenantId)
              .single();

            const providerList = providers.join(", ");
            await sendTenantSms({
              tenantId,
              to: deliverySettings.notify_phone,
              body: `Action needed for ${tenant?.name || "your business"}: Your ${providerList} connection needs to be reconnected. Log into your dashboard to fix it. Reply STOP to opt out.`,
            });
          }
        } catch (notifyErr) {
          console.error(`[cron-token-refresh] Failed to notify tenant ${tenantId}:`, notifyErr);
        }
      }
    }

    // Send Telegram alert to Jack on any token refresh errors
    if (results.errors > 0 || results.no_refresh_token > 0) {
      try {
        const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "8429513226:AAGnt47zIkkUIAyFB4Mb4_fYdptaV2iKnt0";
        const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") || "6841391368";
        const errorLines = results.error_details.map(
          (e: { tenant_id: string; provider: string; error: string }) => `  ${e.provider} (tenant ${e.tenant_id.substring(0, 8)}): ${e.error}`
        ).join("\n");
        const msg = [
          `TOKEN REFRESH ALERT`,
          `Checked: ${results.checked} | Refreshed: ${results.refreshed} | Errors: ${results.errors} | No refresh token: ${results.no_refresh_token}`,
          results.error_details.length > 0 ? `\nFailures:\n${errorLines}` : "",
          results.no_refresh_token > 0 ? `\n${results.no_refresh_token} token(s) have no refresh_token. Manual reconnect needed.` : "",
        ].filter(Boolean).join("\n");

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg }),
        });
      } catch (tgErr) {
        console.error("[cron-token-refresh] Telegram alert failed:", tgErr);
      }
    }

    console.log(`[cron-token-refresh] Done:`, results);
    return new Response(JSON.stringify(results));
  } catch (error) {
    console.error("[cron-token-refresh] Fatal error:", error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
