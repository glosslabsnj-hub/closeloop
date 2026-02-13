import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/tenant.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const svc = serviceClient();

    // Fetch all active Tekmetric integrations
    const { data: integrations, error } = await svc
      .from("tenant_integrations")
      .select("tenant_id")
      .eq("provider", "tekmetric")
      .eq("is_active", true);

    if (error) {
      console.error("[cron-tekmetric-sync] Failed to fetch integrations:", error);
      return errorResponse("Failed to fetch integrations");
    }

    if (!integrations || integrations.length === 0) {
      return jsonResponse({ message: "No active Tekmetric integrations", synced: 0 });
    }

    console.log(`[cron-tekmetric-sync] Found ${integrations.length} active integration(s)`);

    // Call sync-tekmetric for each tenant
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const results = await Promise.allSettled(
      integrations.map(async (i) => {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-tekmetric`, {
          method: "POST",
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({ tenant_id: i.tenant_id }),
        });
        const data = await res.json();
        return { tenant_id: i.tenant_id, ...data };
      })
    );

    return jsonResponse({
      synced: results.length,
      results: results.map((r) =>
        r.status === "fulfilled" ? r.value : { error: (r as PromiseRejectedResult).reason?.message }
      ),
    });
  } catch (err) {
    console.error("[cron-tekmetric-sync] Error:", err);
    return errorResponse(err.message || "Internal error", 500);
  }
});
