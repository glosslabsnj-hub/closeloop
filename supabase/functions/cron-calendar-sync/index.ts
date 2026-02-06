/**
 * cron-calendar-sync: Periodic sync of all active calendar connections
 * 
 * Called by pg_cron every 5 minutes to ensure calendar data stays fresh
 * and prevents double-booking.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  // This function is called by pg_cron, no CORS needed
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all active calendar connections that need syncing
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: connections, error: connError } = await supabase
      .from("calendar_connections")
      .select("id, tenant_id, provider, last_sync_at")
      .eq("status", "connected")
      .or(`last_sync_at.is.null,last_sync_at.lt.${fiveMinutesAgo}`);

    if (connError) {
      console.error("[cron-calendar-sync] Error fetching connections:", connError);
      return new Response(JSON.stringify({ error: connError.message }), { status: 500 });
    }

    console.log(`[cron-calendar-sync] Found ${connections?.length || 0} connections to sync`);

    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ message: "No connections need syncing", synced: 0 }));
    }

    // Sync each connection
    const results: { connection_id: string; success: boolean; error?: string }[] = [];

    for (const conn of connections) {
      try {
        // Call sync-availability for each connection
        const syncResponse = await fetch(`${SUPABASE_URL}/functions/v1/sync-availability`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            connection_id: conn.id,
            days: 30,
            // Pass tenant context for the sync function
            _cron_tenant_id: conn.tenant_id,
          }),
        });

        if (syncResponse.ok) {
          const syncData = await syncResponse.json();
          console.log(`[cron-calendar-sync] Synced ${conn.id}: ${syncData.synced_count || 0} events`);
          results.push({ connection_id: conn.id, success: true });
        } else {
          const errorText = await syncResponse.text();
          console.error(`[cron-calendar-sync] Failed to sync ${conn.id}:`, errorText);
          results.push({ connection_id: conn.id, success: false, error: errorText });
        }
      } catch (error) {
        console.error(`[cron-calendar-sync] Error syncing ${conn.id}:`, error);
        results.push({ 
          connection_id: conn.id, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[cron-calendar-sync] Complete: ${successCount}/${results.length} successful`);

    return new Response(
      JSON.stringify({
        message: `Synced ${successCount}/${results.length} connections`,
        results,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[cron-calendar-sync] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500 }
    );
  }
});
