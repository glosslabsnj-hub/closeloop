import { corsHeaders } from "../_shared/cors.ts";

/**
 * cron-fieldedge-sync: Triggered every 5 minutes to run bidirectional sync
 * for all active FieldEdge integrations.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all active FieldEdge integrations
    const { data: integrations, error } = await supabase
      .from("tenant_integrations")
      .select("tenant_id")
      .eq("provider", "fieldedge")
      .eq("is_active", true);

    if (error) throw error;

    const results: { tenant_id: string; status: string; error?: string }[] = [];

    for (const integration of integrations || []) {
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/sync-fieldedge`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ tenant_id: integration.tenant_id }),
        });

        if (resp.ok) {
          results.push({ tenant_id: integration.tenant_id, status: "success" });
        } else {
          const err = await resp.text();
          results.push({ tenant_id: integration.tenant_id, status: "failed", error: err });
        }
      } catch (e) {
        results.push({ tenant_id: integration.tenant_id, status: "failed", error: e.message });
      }
    }

    console.log(`[cron-fieldedge-sync] Processed ${results.length} tenants`, results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[cron-fieldedge-sync] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
