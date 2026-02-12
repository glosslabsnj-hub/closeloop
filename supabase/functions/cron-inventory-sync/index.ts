import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { serviceClient } from "../_shared/tenant.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Cron function that syncs inventory for all sales tenants with configured dealer URLs.
 * Reads dealer_urls from tenants.context_fields_json and invokes scrape-carsforsale for each.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = serviceClient();

    // Find all sales tenants with dealer_urls configured
    const { data: tenants, error } = await supabase
      .from("tenants")
      .select("id, context_fields_json")
      .eq("business_mode", "sales");

    if (error) throw error;

    const results: Array<{ tenant_id: string; success: boolean; error?: string }> = [];

    for (const tenant of tenants || []) {
      const ctx = tenant.context_fields_json as Record<string, any> | null;
      const dealerUrls = ctx?.dealer_urls as string[] | undefined;

      if (!dealerUrls || dealerUrls.length === 0) {
        console.log(`[cron-inventory-sync] Skipping tenant ${tenant.id} — no dealer_urls`);
        continue;
      }

      console.log(`[cron-inventory-sync] Syncing ${dealerUrls.length} pages for tenant ${tenant.id}`);

      try {
        // Call scrape-carsforsale directly via internal fetch
        const baseUrl = Deno.env.get("SUPABASE_URL") || "";
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

        const resp = await fetch(`${baseUrl}/functions/v1/scrape-carsforsale`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            tenant_id: tenant.id,
            dealer_urls: dealerUrls,
            full_sync: true,
          }),
        });

        const data = await resp.json();
        results.push({
          tenant_id: tenant.id,
          success: data.success || false,
          error: data.error,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[cron-inventory-sync] Error for tenant ${tenant.id}:`, msg);
        results.push({ tenant_id: tenant.id, success: false, error: msg });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[cron-inventory-sync] Fatal:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
