import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET");
const MS_CLIENT_ID = Deno.env.get("MS_CALENDAR_CLIENT_ID");
const MS_CLIENT_SECRET = Deno.env.get("MS_CALENDAR_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const anonClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user and their tenant
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!tenant) {
      return new Response(JSON.stringify({ error: "No tenant found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { connection_id } = await req.json();
    if (!connection_id) {
      return new Response(JSON.stringify({ error: "connection_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the connection
    const { data: connection } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("id", connection_id)
      .eq("tenant_id", tenant.id)
      .single();

    if (!connection) {
      return new Response(JSON.stringify({ error: "Connection not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get stored token
    const { data: tokenData } = await supabase
      .from("calendar_tokens")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("provider", connection.provider)
      .single();

    if (!tokenData) {
      return new Response(JSON.stringify({ error: "No token found - please reconnect" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
          return new Response(JSON.stringify({ error: "Token expired - please reconnect" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
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
          return new Response(JSON.stringify({ error: "Token expired - please reconnect" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        return new Response(JSON.stringify({ error: "Token expired - please reconnect" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
        return new Response(JSON.stringify({ error: "Failed to fetch calendars" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
        return new Response(JSON.stringify({ error: "Failed to fetch calendars" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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

    return new Response(JSON.stringify({ calendars }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in refresh-calendar-list:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
