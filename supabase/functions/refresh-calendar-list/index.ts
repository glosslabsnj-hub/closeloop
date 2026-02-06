import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { requireAuthedTenant, serviceClient } from "../_shared/tenant.ts";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET");
const MS_CLIENT_ID = Deno.env.get("MS_CALENDAR_CLIENT_ID");
const MS_CLIENT_SECRET = Deno.env.get("MS_CALENDAR_CLIENT_SECRET");

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    const { tenantId } = await requireAuthedTenant(req);
    const supabase = serviceClient();

    const { connection_id } = await req.json();
    if (!connection_id) {
      return errorResponse("connection_id required", 400);
    }

    // Get the connection
    const { data: connection } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("id", connection_id)
      .eq("tenant_id", tenantId)
      .single();

    if (!connection) {
      return errorResponse("Connection not found", 404);
    }

    // Get stored token
    const { data: tokenData } = await supabase
      .from("calendar_tokens")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("provider", connection.provider)
      .single();

    if (!tokenData) {
      return errorResponse("No token found - please reconnect", 400);
    }

    let accessToken = tokenData.access_token;

    // Check if token needs refresh
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      // Refresh the token
      if (connection.provider === "google" && tokenData.refresh_token) {
        const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID!,
            client_secret: GOOGLE_CLIENT_SECRET!,
            refresh_token: tokenData.refresh_token,
            grant_type: "refresh_token",
          }),
        });

        if (refreshResponse.ok) {
          const newTokens = await refreshResponse.json();
          accessToken = newTokens.access_token;

          await supabase
            .from("calendar_tokens")
            .update({
              access_token: newTokens.access_token,
              expires_at: new Date(Date.now() + (newTokens.expires_in || 3600) * 1000).toISOString(),
            })
            .eq("id", tokenData.id);
        } else {
          return errorResponse("Token expired - please reconnect", 400);
        }
      } else if (connection.provider === "microsoft" && tokenData.refresh_token) {
        const refreshResponse = await fetch(
          "https://login.microsoftonline.com/common/oauth2/v2.0/token",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: MS_CLIENT_ID!,
              client_secret: MS_CLIENT_SECRET!,
              refresh_token: tokenData.refresh_token,
              grant_type: "refresh_token",
            }),
          }
        );

        if (refreshResponse.ok) {
          const newTokens = await refreshResponse.json();
          accessToken = newTokens.access_token;

          await supabase
            .from("calendar_tokens")
            .update({
              access_token: newTokens.access_token,
              expires_at: new Date(Date.now() + (newTokens.expires_in || 3600) * 1000).toISOString(),
            })
            .eq("id", tokenData.id);
        } else {
          return errorResponse("Token expired - please reconnect", 400);
        }
      } else {
        return errorResponse("Token expired - please reconnect", 400);
      }
    }

    // Fetch fresh calendar list
    let calendars: { id: string; name: string; primary?: boolean }[] = [];

    if (connection.provider === "google") {
      const calendarResponse = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json();
        calendars = (calendarData.items || []).map((cal: Record<string, unknown>) => ({
          id: cal.id,
          name: cal.summary || cal.id,
          primary: cal.primary || false,
        }));
      } else {
        const errorText = await calendarResponse.text();
        console.error("Google calendar list error:", errorText);
        return errorResponse("Failed to fetch calendars", 500);
      }
    } else if (connection.provider === "microsoft") {
      const calendarResponse = await fetch(
        "https://graph.microsoft.com/v1.0/me/calendars",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json();
        calendars = (calendarData.value || []).map((cal: Record<string, unknown>) => ({
          id: cal.id,
          name: cal.name || cal.id,
          primary: cal.isDefaultCalendar || false,
        }));
      } else {
        const errorText = await calendarResponse.text();
        console.error("Microsoft calendar list error:", errorText);
        return errorResponse("Failed to fetch calendars", 500);
      }
    }

    // Update connection with fresh calendar list
    const existingConfig = (connection.config_json as Record<string, unknown>) || {};
    await supabase
      .from("calendar_connections")
      .update({
        config_json: {
          ...existingConfig,
          available_calendars: calendars,
        },
      })
      .eq("id", connection_id);

    return jsonResponse({ calendars });
  } catch (error: unknown) {
    console.error("Error in refresh-calendar-list:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
