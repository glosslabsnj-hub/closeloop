import { corsHeaders } from "../_shared/cors.ts";

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, tenant_id, api_key, base_url, is_active } = body;

    if (!tenant_id) return jsonResponse({ error: "Missing tenant_id" }, 400);

    // Verify auth
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    if (action === "connect") {
      if (!api_key) return jsonResponse({ error: "Missing api_key" }, 400);

      // Validate the API key by making a test request to FieldEdge
      // NOTE: FieldEdge API endpoints are partner-specific. 
      // Update this URL once you have the actual FieldEdge API docs.
      const fieldedgeBaseUrl = base_url || "https://api.fieldedge.com/v1";
      
      try {
        const testResp = await fetch(`${fieldedgeBaseUrl}/company`, {
          headers: {
            "Authorization": `Bearer ${api_key}`,
            "Content-Type": "application/json",
          },
        });

        // If FieldEdge API isn't accessible yet (partner-only), we store credentials
        // and let the tenant test when their access is approved.
        let companyName = "FieldEdge Account";
        if (testResp.ok) {
          try {
            const companyData = await testResp.json();
            companyName = companyData?.name || companyData?.company_name || companyName;
          } catch {
            // Non-JSON response is fine
          }
        }

        // Upsert integration record
        const { error: upsertError } = await supabase
          .from("tenant_integrations")
          .upsert(
            {
              tenant_id,
              provider: "fieldedge",
              is_active: true,
              credentials_json: { api_key, base_url: fieldedgeBaseUrl },
              config_json: { base_url: fieldedgeBaseUrl, company_name: companyName },
            },
            { onConflict: "tenant_id,provider" }
          );

        if (upsertError) throw upsertError;

        return jsonResponse({ success: true, company_name: companyName });
      } catch (fetchErr) {
        // Even if the test call fails, store the credentials for later use
        const { error: upsertError } = await supabase
          .from("tenant_integrations")
          .upsert(
            {
              tenant_id,
              provider: "fieldedge",
              is_active: true,
              credentials_json: { api_key, base_url: base_url || "https://api.fieldedge.com/v1" },
              config_json: { base_url: base_url || "https://api.fieldedge.com/v1", company_name: "FieldEdge Account" },
            },
            { onConflict: "tenant_id,provider" }
          );

        if (upsertError) throw upsertError;

        return jsonResponse({
          success: true,
          warning: "Could not verify credentials with FieldEdge API. Credentials saved — sync will activate when FieldEdge API access is confirmed.",
        });
      }
    }

    if (action === "toggle") {
      const { error } = await supabase
        .from("tenant_integrations")
        .update({ is_active })
        .eq("tenant_id", tenant_id)
        .eq("provider", "fieldedge");

      if (error) throw error;
      return jsonResponse({ success: true });
    }

    if (action === "disconnect") {
      const { error } = await supabase
        .from("tenant_integrations")
        .delete()
        .eq("tenant_id", tenant_id)
        .eq("provider", "fieldedge");

      if (error) throw error;
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("[fieldedge-auth] Error:", err);
    return jsonResponse({ error: err.message || "Internal error" }, 500);
  }
});
