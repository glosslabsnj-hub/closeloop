import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// OAuth configuration
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET");
const GOOGLE_REDIRECT_URI = Deno.env.get("GOOGLE_CALENDAR_REDIRECT_URI");

const MS_CLIENT_ID = Deno.env.get("MS_CALENDAR_CLIENT_ID");
const MS_CLIENT_SECRET = Deno.env.get("MS_CALENDAR_CLIENT_SECRET");
const MS_REDIRECT_URI = Deno.env.get("MS_CALENDAR_REDIRECT_URI");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JWT_SECRET = Deno.env.get("SUPABASE_JWT_SECRET") || Deno.env.get("CLOSELOOP_OAUTH_STATE_SECRET") || "closeloop-state-secret";

// Verify signed state
async function verifyState(state: string): Promise<Record<string, string> | null> {
  try {
    const [payloadB64, signatureB64] = state.split(".");
    const payload = atob(payloadB64);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signature = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(payload));
    if (!valid) return null;
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(renderHTML("error", `OAuth error: ${error}`), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!code || !state) {
      return new Response(renderHTML("error", "Missing code or state"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Verify state
    const stateData = await verifyState(state);
    if (!stateData || !stateData.tenant_id || !stateData.provider) {
      return new Response(renderHTML("error", "Invalid state"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const { tenant_id, provider } = stateData;

    // Exchange code for tokens
    let tokens: {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
    };
    let calendars: { id: string; name: string; primary?: boolean }[] = [];

    if (provider === "google") {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
        return new Response(renderHTML("error", "Google not configured"), {
          headers: { "Content-Type": "text/html" },
        });
      }

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Google token error:", errorText);
        return new Response(renderHTML("error", "Failed to exchange code for tokens"), {
          headers: { "Content-Type": "text/html" },
        });
      }

      tokens = await tokenResponse.json();

      // Fetch calendar list
      const calendarResponse = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        }
      );

      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json();
        calendars = (calendarData.items || []).map((cal: any) => ({
          id: cal.id,
          name: cal.summary || cal.id,
          primary: cal.primary || false,
        }));
      }
    } else if (provider === "microsoft") {
      if (!MS_CLIENT_ID || !MS_CLIENT_SECRET || !MS_REDIRECT_URI) {
        return new Response(renderHTML("error", "Microsoft not configured"), {
          headers: { "Content-Type": "text/html" },
        });
      }

      // Exchange code for tokens
      const tokenResponse = await fetch(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: MS_CLIENT_ID,
            client_secret: MS_CLIENT_SECRET,
            redirect_uri: MS_REDIRECT_URI,
            grant_type: "authorization_code",
          }),
        }
      );

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Microsoft token error:", errorText);
        return new Response(renderHTML("error", "Failed to exchange code for tokens"), {
          headers: { "Content-Type": "text/html" },
        });
      }

      tokens = await tokenResponse.json();

      // Fetch calendar list
      const calendarResponse = await fetch(
        "https://graph.microsoft.com/v1.0/me/calendars",
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        }
      );

      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json();
        calendars = (calendarData.value || []).map((cal: any) => ({
          id: cal.id,
          name: cal.name || cal.id,
          primary: cal.isDefaultCalendar || false,
        }));
      }
    } else {
      return new Response(renderHTML("error", "Unknown provider"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Store tokens securely using service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Upsert token
    const { error: tokenError } = await supabase
      .from("calendar_tokens")
      .upsert({
        tenant_id,
        provider,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_type: tokens.token_type || "Bearer",
        scope: tokens.scope || null,
        expires_at: expiresAt,
      }, {
        onConflict: "tenant_id,provider",
      });

    if (tokenError) {
      console.error("Token storage error:", tokenError);
      return new Response(renderHTML("error", "Failed to store tokens"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Create or update calendar connection
    const { data: existingConn } = await supabase
      .from("calendar_connections")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("provider", provider)
      .single();

    if (existingConn) {
      await supabase
        .from("calendar_connections")
        .update({
          status: "connected",
          config_json: {
            available_calendars: calendars,
            selected_calendar_ids: calendars.filter(c => c.primary).map(c => c.id),
          },
          scopes_json: tokens.scope ? tokens.scope.split(" ") : [],
        })
        .eq("id", existingConn.id);
    } else {
      await supabase.from("calendar_connections").insert({
        tenant_id,
        provider,
        status: "connected",
        auth_type: "oauth",
        display_name: provider === "google" ? "Google Calendar" : "Microsoft Outlook",
        config_json: {
          available_calendars: calendars,
          selected_calendar_ids: calendars.filter(c => c.primary).map(c => c.id),
        },
        scopes_json: tokens.scope ? tokens.scope.split(" ") : [],
      });
    }

    // Return success page that closes popup
    return new Response(renderHTML("success", null, calendars), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error: unknown) {
    console.error("Error in calendar-oauth-callback:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(renderHTML("error", message), {
      headers: { "Content-Type": "text/html" },
    });
  }
});

function renderHTML(
  status: "success" | "error",
  errorMessage?: string | null,
  calendars?: { id: string; name: string; primary?: boolean }[]
): string {
  if (status === "error") {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Calendar Connection Failed</title>
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
    <div class="icon">❌</div>
    <h1>Connection Failed</h1>
    <p>${errorMessage || "Something went wrong"}</p>
    <p style="margin-top: 1rem;"><a href="#" onclick="window.close()">Close this window</a></p>
  </div>
  <script>
    setTimeout(() => { window.opener?.postMessage({ type: 'calendar-oauth-error', error: '${errorMessage}' }, '*'); }, 500);
  </script>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <title>Calendar Connected!</title>
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
    <div class="icon">✅</div>
    <h1>Calendar Connected!</h1>
    <p>Found ${calendars?.length || 0} calendar(s). This window will close automatically.</p>
  </div>
  <script>
    const calendars = ${JSON.stringify(calendars || [])};
    setTimeout(() => {
      window.opener?.postMessage({ type: 'calendar-oauth-success', calendars }, '*');
      window.close();
    }, 1500);
  </script>
</body>
</html>`;
}
