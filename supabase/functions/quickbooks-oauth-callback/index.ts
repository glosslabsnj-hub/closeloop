import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// QuickBooks OAuth configuration
const QB_CLIENT_ID = Deno.env.get("QUICKBOOKS_CLIENT_ID");
const QB_CLIENT_SECRET = Deno.env.get("QUICKBOOKS_CLIENT_SECRET");
const QB_REDIRECT_URI = Deno.env.get("QUICKBOOKS_REDIRECT_URI");

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
    const realmId = url.searchParams.get("realmId"); // QuickBooks company ID
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
    if (!stateData || !stateData.tenant_id || stateData.provider !== "quickbooks") {
      return new Response(renderHTML("error", "Invalid state"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const { tenant_id } = stateData;

    if (!QB_CLIENT_ID || !QB_CLIENT_SECRET || !QB_REDIRECT_URI) {
      return new Response(renderHTML("error", "QuickBooks not configured"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Exchange code for tokens
    // QuickBooks requires Basic auth with client_id:client_secret
    const basicAuth = btoa(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`);

    const tokenResponse = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        code,
        redirect_uri: QB_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("QuickBooks token error:", errorText);
      return new Response(renderHTML("error", "Failed to exchange code for tokens"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const tokens = await tokenResponse.json();
    /*
      tokens structure:
      {
        access_token: string,
        refresh_token: string,
        token_type: "bearer",
        expires_in: 3600 (1 hour),
        x_refresh_token_expires_in: 8726400 (101 days)
      }
    */

    // Fetch company info to verify connection and get company name
    let companyInfo: { companyName?: string; legalName?: string } | null = null;
    if (realmId) {
      try {
        const companyResponse = await fetch(
          `https://quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`,
          {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
              Accept: "application/json",
            },
          }
        );
        if (companyResponse.ok) {
          const companyData = await companyResponse.json();
          companyInfo = companyData.CompanyInfo;
        }
      } catch (e) {
        console.error("Failed to fetch company info:", e);
      }
    }

    // Store connection using service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Upsert into integration_connections table
    const { error: connectionError } = await supabase
      .from("integration_connections")
      .upsert({
        tenant_id,
        integration_type: "quickbooks",
        status: "connected",
        access_token_encrypted: tokens.access_token, // In production, encrypt this
        refresh_token_encrypted: tokens.refresh_token,
        token_expires_at: expiresAt,
        external_account_id: realmId,
        external_account_name: companyInfo?.companyName || companyInfo?.legalName || `QuickBooks Company ${realmId}`,
        scopes: ["com.intuit.quickbooks.accounting"],
        settings: {
          realm_id: realmId,
          sync_customers: true,
          sync_invoices: true,
          sync_payments: true,
          sync_direction: "bidirectional",
        },
        connected_at: new Date().toISOString(),
        last_sync_at: null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "tenant_id,integration_type",
      });

    if (connectionError) {
      console.error("Connection storage error:", connectionError);
      return new Response(renderHTML("error", "Failed to store connection"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Also create/update in the integrations table for automation compatibility
    const { data: existingIntegration } = await supabase
      .from("integrations")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("provider", "quickbooks")
      .single();

    if (existingIntegration) {
      await supabase
        .from("integrations")
        .update({
          status: "connected",
          config_json: {
            realm_id: realmId,
            company_name: companyInfo?.companyName || null,
          },
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingIntegration.id);
    } else {
      await supabase.from("integrations").insert({
        tenant_id,
        provider: "quickbooks",
        display_name: companyInfo?.companyName || "QuickBooks Online",
        auth_type: "oauth",
        status: "connected",
        config_json: {
          realm_id: realmId,
          company_name: companyInfo?.companyName || null,
        },
        scopes_json: ["com.intuit.quickbooks.accounting"],
      });
    }

    // Return success page that closes popup
    return new Response(renderHTML("success", null, companyInfo?.companyName), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error: unknown) {
    console.error("Error in quickbooks-oauth-callback:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(renderHTML("error", message), {
      headers: { "Content-Type": "text/html" },
    });
  }
});

function renderHTML(
  status: "success" | "error",
  errorMessage?: string | null,
  companyName?: string | null
): string {
  if (status === "error") {
    return `<!DOCTYPE html>
<html>
<head>
  <title>QuickBooks Connection Failed</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fef2f2; }
    .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
    .icon { font-size: 48px; margin-bottom: 1rem; }
    h1 { color: #dc2626; margin: 0 0 0.5rem; font-size: 1.25rem; }
    p { color: #6b7280; margin: 0; }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">❌</div>
    <h1>Connection Failed</h1>
    <p>${errorMessage || "Something went wrong connecting to QuickBooks"}</p>
    <p style="margin-top: 1rem;"><a href="#" onclick="window.close()">Close this window</a></p>
  </div>
  <script>
    setTimeout(() => {
      if (window.opener) {
        window.opener.postMessage({ type: 'quickbooks-oauth-error', error: '${errorMessage?.replace(/'/g, "\\'")}' }, '*');
      }
    }, 500);
  </script>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <title>QuickBooks Connected!</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f0fdf4; }
    .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
    .icon { font-size: 48px; margin-bottom: 1rem; }
    h1 { color: #16a34a; margin: 0 0 0.5rem; font-size: 1.25rem; }
    p { color: #6b7280; margin: 0; }
    .company { font-weight: 600; color: #374151; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Connected to QuickBooks!</h1>
    ${companyName ? `<p class="company">${companyName}</p>` : ''}
    <p style="margin-top: 0.5rem;">This window will close automatically.</p>
  </div>
  <script>
    (function() {
      try {
        if (window.opener) {
          window.opener.postMessage({
            type: 'quickbooks-oauth-success',
            companyName: ${JSON.stringify(companyName || null)}
          }, '*');
        }
      } catch (e) {
        console.error('postMessage failed:', e);
      }
      setTimeout(function() { window.close(); }, 1500);
    })();
  </script>
</body>
</html>`;
}
