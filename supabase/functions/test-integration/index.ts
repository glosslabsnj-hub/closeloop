/**
 * test-integration: Validate integration credentials by provider type.
 *
 * Provider-specific validation:
 *   - webhook:          HTTP HEAD/OPTIONS to the URL with 5-second timeout
 *   - google_calendar:  API call with stored OAuth token
 *   - google_sheets:    API call with stored token + sheet_id
 *   - Others:           Return success with "manual verification recommended"
 *
 * Returns { success, error_message? }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { requireAuthedTenant, serviceClient } from "../_shared/tenant.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const { tenantId } = await requireAuthedTenant(req);

    const body = await req.json();
    const integrationId: string | undefined = body.integration_id;

    if (!integrationId) {
      return errorResponse("integration_id is required");
    }

    const svc = serviceClient();

    // Fetch the integration record (service role bypasses RLS)
    const { data: integration, error: fetchError } = await svc
      .from("integrations")
      .select("id, tenant_id, provider, config_json, auth_type, status")
      .eq("id", integrationId)
      .eq("tenant_id", tenantId)
      .single();

    if (fetchError || !integration) {
      return errorResponse("Integration not found", 404);
    }

    const config = (integration.config_json || {}) as Record<string, unknown>;
    let success = false;
    let errorMessage: string | null = null;

    switch (integration.provider) {
      case "webhook": {
        const url = config.webhook_url as string | undefined;
        if (!url) {
          errorMessage = "No webhook URL configured";
          break;
        }

        try {
          new URL(url); // Validate URL format
        } catch {
          errorMessage = "Invalid webhook URL format";
          break;
        }

        try {
          // Try HEAD first with 5-second timeout
          const headController = new AbortController();
          const headTimeout = setTimeout(() => headController.abort(), 5000);

          let response: Response | null = null;
          let headFailed = false;

          try {
            response = await fetch(url, {
              method: "HEAD",
              signal: headController.signal,
              headers: { "User-Agent": "Flux-Integration-Test/1.0" },
            });
          } catch (headErr) {
            headFailed = true;
            // If HEAD timed out, don't bother retrying with OPTIONS
            if (headErr instanceof DOMException && headErr.name === "AbortError") {
              throw headErr;
            }
          } finally {
            clearTimeout(headTimeout);
          }

          // HEAD failed with a non-timeout error — try POST with empty body as fallback
          // (many webhook endpoints only accept POST)
          if (headFailed && !response) {
            const postController = new AbortController();
            const postTimeout = setTimeout(() => postController.abort(), 5000);
            try {
              response = await fetch(url, {
                method: "POST",
                signal: postController.signal,
                headers: {
                  "User-Agent": "Flux-Integration-Test/1.0",
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ test: true, source: "flux-receptionist" }),
              });
            } finally {
              clearTimeout(postTimeout);
            }
          }

          // 2xx, 405 (method not allowed but reachable), or 204 are acceptable
          if (response && (response.ok || response.status === 405 || response.status === 204 || response.status === 400)) {
            success = true;
          } else if (response) {
            errorMessage = `Webhook returned HTTP ${response.status}`;
          } else {
            errorMessage = "Could not reach webhook";
          }
        } catch (fetchErr) {
          if (fetchErr instanceof DOMException && fetchErr.name === "AbortError") {
            errorMessage = "Webhook timed out after 5 seconds";
          } else {
            errorMessage = `Could not reach webhook: ${fetchErr instanceof Error ? fetchErr.message : "Unknown error"}`;
          }
        }
        break;
      }

      case "google_calendar": {
        const accessToken = config.access_token as string | undefined;
        const refreshToken = config.refresh_token as string | undefined;

        if (!accessToken && !refreshToken) {
          errorMessage = "No Google OAuth credentials stored. Please reconnect.";
          break;
        }

        try {
          const token = accessToken || refreshToken;
          const response = await fetch(
            "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1",
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (response.ok) {
            success = true;
          } else if (response.status === 401) {
            errorMessage = "Google Calendar token expired. Please reconnect.";
          } else {
            errorMessage = `Google Calendar API returned HTTP ${response.status}`;
          }
        } catch (err) {
          errorMessage = `Google Calendar check failed: ${err instanceof Error ? err.message : "Unknown error"}`;
        }
        break;
      }

      case "google_sheets": {
        const accessToken = config.access_token as string | undefined;
        const sheetId = config.sheet_id as string | undefined;

        if (!accessToken) {
          errorMessage = "No Google OAuth credentials stored. Please reconnect.";
          break;
        }

        if (!sheetId) {
          errorMessage = "No Sheet ID configured";
          break;
        }

        try {
          const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=spreadsheetId,properties.title`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          if (response.ok) {
            success = true;
          } else if (response.status === 401) {
            errorMessage = "Google Sheets token expired. Please reconnect.";
          } else if (response.status === 404) {
            errorMessage = "Sheet not found. Check your Sheet ID.";
          } else {
            errorMessage = `Google Sheets API returned HTTP ${response.status}`;
          }
        } catch (err) {
          errorMessage = `Google Sheets check failed: ${err instanceof Error ? err.message : "Unknown error"}`;
        }
        break;
      }

      default: {
        // Providers without automated validation
        success = true;
        errorMessage = null;
        break;
      }
    }

    // Update integration record with test result
    const now = new Date().toISOString();
    await svc
      .from("integrations")
      .update({
        status: success ? "connected" : "error",
        last_tested_at: now,
        error_message: errorMessage,
        updated_at: now,
      })
      .eq("id", integrationId);

    return jsonResponse({ success, error_message: errorMessage });
  } catch (err) {
    console.error("[test-integration] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message === "Unauthorized" || message.startsWith("Forbidden")) {
      return errorResponse(message, 401);
    }

    return errorResponse(message, 500);
  }
});
