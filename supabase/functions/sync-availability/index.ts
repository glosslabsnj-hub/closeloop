import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// OAuth credentials for token refresh
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET");
const MS_CLIENT_ID = Deno.env.get("MS_CALENDAR_CLIENT_ID");
const MS_CLIENT_SECRET = Deno.env.get("MS_CALENDAR_CLIENT_SECRET");

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body first to check for cron mode
    const body = await req.json();
    const { connection_id, days = 30, _cron_tenant_id } = body;

    let tenantId: string | null = null;

    // Check if this is a cron call (service role with explicit tenant_id)
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY;

    if (isServiceRole && _cron_tenant_id) {
      // Cron mode: trust the tenant_id from the cron job
      tenantId = _cron_tenant_id;
      console.log("[sync-availability] Cron mode for tenant:", tenantId);
    } else {
      // User mode: verify user and get tenant
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user has an active tenant override (for multi-tenant users/admins)
      const { data: adminSettings } = await userClient
        .from("admin_settings")
        .select("admin_active_tenant_id")
        .eq("user_id", user.id)
        .maybeSingle();

      tenantId = adminSettings?.admin_active_tenant_id || null;

      // If no active tenant override, get the first tenant the user belongs to
      if (!tenantId) {
        const { data: tenantUser } = await userClient
          .from("tenant_users")
          .select("tenant_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (!tenantUser) {
          return new Response(JSON.stringify({ error: "No tenant" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        tenantId = tenantUser.tenant_id;
      }
    }

    if (!tenantId) {
      return new Response(JSON.stringify({ error: "No tenant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for token access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("id", connection_id)
      .eq("tenant_id", tenantId)
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: "Connection not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get tokens
    const { data: tokens, error: tokenError } = await supabase
      .from("calendar_tokens")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("provider", connection.provider)
      .single();

    if (tokenError || !tokens) {
      // Mark connection as error
      await supabase
        .from("calendar_connections")
        .update({ status: "error", sync_error: "No tokens found" })
        .eq("id", connection_id);

      return new Response(JSON.stringify({ error: "No tokens found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = tokens.access_token;

    // Check if token is expired and refresh if needed
    if (tokens.expires_at && new Date(tokens.expires_at) < new Date()) {
      accessToken = await refreshToken(supabase, tokens);
      if (!accessToken) {
        await supabase
          .from("calendar_connections")
          .update({ status: "error", sync_error: "Token refresh failed" })
          .eq("id", connection_id);

        return new Response(JSON.stringify({ error: "Token refresh failed" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Calculate date range
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    // Fetch busy times based on provider
    let events: { start_at: string; end_at: string; external_event_id: string; summary?: string }[] = [];
    const selectedCalendarIds = (connection.config_json as any)?.selected_calendar_ids || [];

    console.log("=== SYNC-AVAILABILITY DEBUG ===");
    console.log("Tenant ID:", tenantId);
    console.log("Connection ID:", connection_id);
    console.log("Provider:", connection.provider);
    console.log("Selected Calendar IDs:", JSON.stringify(selectedCalendarIds));
    console.log("Date Range:", startDate.toISOString(), "to", endDate.toISOString());

    if (connection.provider === "google") {
      events = await fetchGoogleBusyTimes(accessToken, selectedCalendarIds, startDate, endDate);
    } else if (connection.provider === "microsoft") {
      events = await fetchMicrosoftBusyTimes(accessToken, selectedCalendarIds, startDate, endDate);
    }

    console.log("=== EVENTS FETCHED FROM API ===");
    console.log("Total events found:", events.length);
    for (const evt of events) {
      console.log(`  Event: ${evt.start_at} -> ${evt.end_at} (ID: ${evt.external_event_id})`);
    }

    // Update last_sync_at on the connection
    await supabase
      .from("calendar_connections")
      .update({ 
        last_sync_at: new Date().toISOString(),
        sync_error: null,
        status: "connected"
      })
      .eq("id", connection_id);

    // Sync to busy_blocks
    const { data: syncResult, error: syncError } = await supabase.rpc("fn_sync_busy_blocks", {
      _tenant_id: tenantId,
      _connection_id: connection_id,
      _events: events,
    });

    if (syncError) {
      console.error("Sync error:", syncError);
      
      // Update connection with error
      await supabase
        .from("calendar_connections")
        .update({ sync_error: syncError.message })
        .eq("id", connection_id);
        
      return new Response(JSON.stringify({ error: syncError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("=== SYNC COMPLETE ===");
    console.log("Events synced to busy_blocks:", syncResult);

    return new Response(
      JSON.stringify({
        success: true,
        synced_count: syncResult,
        events_found: events.length,
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        calendar_ids: selectedCalendarIds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in sync-availability:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function timeZoneOffsetForDate(timeZone: string, yyyyMmDd: string): string {
  // Use noon UTC to avoid DST edge cases that can occur around midnight.
  const [y, m, d] = yyyyMmDd.split("-").map((n) => Number(n));
  const probe = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
    }).formatToParts(probe);

    const tz = parts.find((p) => p.type === "timeZoneName")?.value || "GMT";
    // e.g. "GMT-5" or "GMT+5:30"
    const match = tz.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
    if (!match) return "+00:00";

    const minutes = match[2] || "00";

    // match[1] already includes sign.
    const sign = match[1].startsWith("-") ? "-" : "+";
    const absHours = String(Math.abs(Number(match[1]))).padStart(2, "0");

    return `${sign}${absHours}:${minutes}`;
  } catch {
    return "+00:00";
  }
}

async function refreshToken(supabase: any, tokens: any): Promise<string | null> {
  if (!tokens.refresh_token) return null;

  try {
    let response;

    if (tokens.provider === "google") {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;

      response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: tokens.refresh_token,
          grant_type: "refresh_token",
        }),
      });
    } else if (tokens.provider === "microsoft") {
      if (!MS_CLIENT_ID || !MS_CLIENT_SECRET) return null;

      response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: MS_CLIENT_ID,
          client_secret: MS_CLIENT_SECRET,
          refresh_token: tokens.refresh_token,
          grant_type: "refresh_token",
        }),
      });
    } else {
      return null;
    }

    if (!response.ok) return null;

    const newTokens = await response.json();
    const expiresAt = newTokens.expires_in
      ? new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
      : null;

    // Update stored tokens
    await supabase
      .from("calendar_tokens")
      .update({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || tokens.refresh_token,
        expires_at: expiresAt,
      })
      .eq("tenant_id", tokens.tenant_id)
      .eq("provider", tokens.provider);

    return newTokens.access_token;
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
}

async function fetchGoogleBusyTimes(
  accessToken: string,
  calendarIds: string[],
  startDate: Date,
  endDate: Date
): Promise<{ start_at: string; end_at: string; external_event_id: string; summary?: string; location?: string; description?: string }[]> {
  const events: { start_at: string; end_at: string; external_event_id: string; summary?: string; location?: string; description?: string }[] = [];

  if (calendarIds.length === 0) {
    calendarIds = ["primary"];
  }

  console.log("=== GOOGLE CALENDAR EVENTS REQUEST ===");
  console.log("Calendar IDs requested:", JSON.stringify(calendarIds));
  console.log("Time range:", startDate.toISOString(), "to", endDate.toISOString());

  // Use Events API to get full event details (title, location, description)
  for (const calendarId of calendarIds) {
    try {
      const eventsUrl = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
      eventsUrl.searchParams.set("timeMin", startDate.toISOString());
      eventsUrl.searchParams.set("timeMax", endDate.toISOString());
      eventsUrl.searchParams.set("singleEvents", "true");
      eventsUrl.searchParams.set("orderBy", "startTime");
      eventsUrl.searchParams.set("maxResults", "250");

      const eventsResponse = await fetch(eventsUrl.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!eventsResponse.ok) {
        const errorText = await eventsResponse.text();
        console.error(`Google Events API error for ${calendarId}:`, errorText);
        continue;
      }

      const eventsData = await eventsResponse.json();
      console.log(`=== GOOGLE EVENTS for ${calendarId} ===`);
      console.log(`Found ${eventsData.items?.length || 0} events`);

      for (const event of eventsData.items || []) {
        // Skip cancelled events
        if (event.status === "cancelled") continue;

        // Respect transparency ("transparent" means it shouldn't block availability)
        if (event.transparency === "transparent") {
          console.log(`  -> Skipping transparent event: "${event.summary}"`);
          continue;
        }

        const calendarTimeZone = eventsData.timeZone || event.start?.timeZone || "UTC";

        // Get start/end times
        let startAt: string | undefined = event.start?.dateTime || event.start?.date;
        let endAt: string | undefined = event.end?.dateTime || event.end?.date;

        console.log(
          `  Raw event: "${event.summary}" | start=${JSON.stringify(event.start)} | end=${JSON.stringify(event.end)}`
        );

        if (!startAt || !endAt) {
          console.log(`  -> Skipping: missing start or end time`);
          continue;
        }

        // All-day events: Google returns date-only (end is exclusive). Convert to a block.
        const isAllDay = !event.start?.dateTime && !!event.start?.date;
        if (isAllDay) {
          const startOffset = timeZoneOffsetForDate(calendarTimeZone, startAt);
          const endOffset = timeZoneOffsetForDate(calendarTimeZone, endAt);

          startAt = `${startAt}T00:00:00${startOffset}`;
          endAt = `${endAt}T00:00:00${endOffset}`;

          console.log(`  All-day event normalized (${calendarTimeZone}): ${startAt} -> ${endAt}`);
        }

        // Zero-duration events: treat as a small busy block to prevent double-booking
        if (startAt === endAt) {
          const DEFAULT_ZERO_DURATION_MINUTES = 15;
          const startMs = new Date(startAt).getTime();
          const endMs = startMs + DEFAULT_ZERO_DURATION_MINUTES * 60 * 1000;
          const normalizedEnd = new Date(endMs).toISOString();

          console.log(
            `  -> Zero-duration event normalized to ${DEFAULT_ZERO_DURATION_MINUTES}m: startAt=${startAt}, endAt=${normalizedEnd}`
          );

          endAt = normalizedEnd;
        }

        // Guard against invalid ranges after normalization
        if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
          console.log(`  -> Skipping: end <= start after normalization`);
          continue;
        }

        console.log(`  Event: "${event.summary}" | ${startAt} -> ${endAt}`);

        events.push({
          start_at: startAt,
          end_at: endAt,
          external_event_id: event.id || `google_${calendarId}_${startAt}`,
          summary: event.summary || "Busy",
          location: event.location || undefined,
          description: event.description ? event.description.substring(0, 500) : undefined,
        });
      }
    } catch (error) {
      console.error(`Error fetching events for calendar ${calendarId}:`, error);
    }
  }

  console.log(`=== TOTAL EVENTS FETCHED: ${events.length} ===`);
  return events;
}

async function fetchMicrosoftBusyTimes(
  accessToken: string,
  calendarIds: string[],
  startDate: Date,
  endDate: Date
): Promise<{ start_at: string; end_at: string; external_event_id: string; summary?: string }[]> {
  const events: { start_at: string; end_at: string; external_event_id: string; summary?: string }[] = [];

  try {
    // Get user email for schedule request
    const meResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!meResponse.ok) {
      console.error("Microsoft me error:", await meResponse.text());
      return events;
    }

    const meData = await meResponse.json();
    const userEmail = meData.mail || meData.userPrincipalName;

    // Use getSchedule API
    const scheduleResponse = await fetch(
      "https://graph.microsoft.com/v1.0/me/calendar/getSchedule",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schedules: [userEmail],
          startTime: {
            dateTime: startDate.toISOString(),
            timeZone: "UTC",
          },
          endTime: {
            dateTime: endDate.toISOString(),
            timeZone: "UTC",
          },
          availabilityViewInterval: 30,
        }),
      }
    );

    if (!scheduleResponse.ok) {
      // Fallback to calendarView
      const viewResponse = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${startDate.toISOString()}&endDateTime=${endDate.toISOString()}&$select=id,subject,start,end,showAs`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (viewResponse.ok) {
        const viewData = await viewResponse.json();
        for (const event of viewData.value || []) {
          if (event.showAs === "busy" || event.showAs === "tentative" || event.showAs === "oof") {
            const startAt = event.start?.dateTime + "Z";
            const endAt = event.end?.dateTime + "Z";
            // Skip zero-duration events
            if (startAt === endAt) continue;
            events.push({
              start_at: startAt,
              end_at: endAt,
              external_event_id: event.id,
              summary: "Busy",
            });
          }
        }
      }
      return events;
    }

    const scheduleData = await scheduleResponse.json();
    for (const schedule of scheduleData.value || []) {
      for (const item of schedule.scheduleItems || []) {
        if (item.status !== "free") {
          const startAt = item.start?.dateTime + "Z";
          const endAt = item.end?.dateTime + "Z";
          // Skip zero-duration events
          if (startAt === endAt) continue;
          events.push({
            start_at: startAt,
            end_at: endAt,
            external_event_id: `ms_${schedule.scheduleId}_${item.start?.dateTime}`,
            summary: "Busy",
          });
        }
      }
    }
  } catch (error) {
    console.error("Error fetching Microsoft busy times:", error);
  }

  return events;
}
