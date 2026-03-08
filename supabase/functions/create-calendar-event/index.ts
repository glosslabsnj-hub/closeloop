import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateEventRequest {
  booking_id: string;
  tenant_id: string;
}

/**
 * Refreshes an OAuth access token using the refresh token
 */
async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error("Token refresh failed:", await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleClientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID");
    const googleClientSecret = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CreateEventRequest = await req.json();
    const { booking_id, tenant_id } = body;

    if (!booking_id || !tenant_id) {
      throw new Error("booking_id and tenant_id are required");
    }

    // Fetch booking with related data
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        lead:leads(full_name, phone, email),
        service:services(name, duration_minutes)
      `)
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message}`);
    }

    // Get calendar connection
    const { data: connection, error: connError } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("provider", "google")
      .eq("status", "connected")
      .single();

    if (connError || !connection) {
      console.log("No active Google Calendar connection found for tenant:", tenant_id);
      return new Response(
        JSON.stringify({ success: false, message: "No calendar connection", skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get OAuth tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from("calendar_tokens")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("provider", "google")
      .single();

    if (tokenError || !tokenData) {
      console.log("No OAuth tokens found for tenant:", tenant_id);
      return new Response(
        JSON.stringify({ success: false, message: "No OAuth tokens", skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token needs refresh
    let accessToken = tokenData.access_token;
    const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null;
    const now = new Date();

    if (expiresAt && expiresAt <= now) {
      if (!googleClientId || !googleClientSecret || !tokenData.refresh_token) {
        console.log("Cannot refresh token - missing credentials");
        return new Response(
          JSON.stringify({ success: false, message: "Token expired, cannot refresh", skipped: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const refreshed = await refreshAccessToken(
        tokenData.refresh_token,
        googleClientId,
        googleClientSecret
      );

      if (!refreshed) {
        // Mark connection as needing reauth
        await supabase
          .from("calendar_connections")
          .update({ status: "error", sync_error: "Token refresh failed" })
          .eq("id", connection.id);

        return new Response(
          JSON.stringify({ success: false, message: "Token refresh failed", skipped: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      accessToken = refreshed.access_token;

      // Update stored token
      await supabase
        .from("calendar_tokens")
        .update({
          access_token: accessToken,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", tokenData.id);
    }

    // Get tenant timezone
    const { data: tenantData } = await supabase
      .from("tenants")
      .select("timezone")
      .eq("id", tenant_id)
      .single();
    
    const tenantTimezone = tenantData?.timezone || "America/New_York";

    // Get the calendar ID to create events in
    const config = connection.config_json as {
      available_calendars?: { id: string; name: string; primary?: boolean }[];
      selected_calendar_ids?: string[];
    } | null;
    let calendarId = config?.selected_calendar_ids?.[0];
    if (!calendarId && config?.available_calendars) {
      const primaryCal = config.available_calendars.find(c => c.primary);
      calendarId = primaryCal?.id;
    }
    if (!calendarId) calendarId = "primary";

    // Build event payload
    const customerName = booking.lead?.full_name || "Customer";
    const serviceName = booking.service?.name || "Appointment";
    const customerPhone = booking.lead?.phone || "";
    const customerEmail = booking.lead?.email || "";

    // Extract customer address from notes (stored as "Address: {addr}" by create-booking)
    let customerAddress = "";
    if (booking.notes) {
      const addrMatch = booking.notes.match(/Address:\s*([^|]+)/i);
      if (addrMatch) customerAddress = addrMatch[1].trim();
    }

    const eventPayload: Record<string, unknown> = {
      summary: `${serviceName} - ${customerName}`,
      description: [
        `Booked via Flux Receptionist AI`,
        booking.notes ? `Notes: ${booking.notes}` : "",
        customerPhone ? `Customer phone: ${customerPhone}` : "",
        customerEmail ? `Customer email: ${customerEmail}` : "",
      ].filter(Boolean).join("\n"),
      start: {
        dateTime: booking.start_at,
        timeZone: tenantTimezone,
      },
      end: {
        dateTime: booking.end_at,
        timeZone: tenantTimezone,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 30 },
        ],
      },
    };

    // Add location if customer address is available (important for field service businesses)
    if (customerAddress) {
      eventPayload.location = customerAddress;
    }

    // Create event in Google Calendar
    const createResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("Google Calendar API error:", createResponse.status, errorText);
      throw new Error(`Failed to create calendar event: ${createResponse.status}`);
    }

    const createdEvent = await createResponse.json();
    console.log("Calendar event created:", createdEvent.id);

    // Store the external event ID on the booking
    await supabase
      .from("bookings")
      .update({ external_event_id: createdEvent.id })
      .eq("id", booking_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        event_id: createdEvent.id,
        html_link: createdEvent.htmlLink 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Create calendar event error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
