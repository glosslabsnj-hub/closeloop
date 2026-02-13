import { corsHeaders } from "../_shared/cors.ts";

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * sync-fieldedge: Bidirectional sync between CloseLoop and FieldEdge.
 * 
 * Outbound: Push CloseLoop bookings → FieldEdge work orders
 * Inbound: Pull FieldEdge dispatches → CloseLoop active_jobs
 * 
 * NOTE: FieldEdge API is partner-only. The endpoints below are placeholders.
 * Update the actual endpoint URLs and field mappings once you have access
 * to the FieldEdge developer portal.
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

    const body = await req.json();
    const { tenant_id } = body;

    if (!tenant_id) return jsonResponse({ error: "Missing tenant_id" }, 400);

    // Get integration credentials
    const { data: integration, error: intError } = await supabase
      .from("tenant_integrations")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("provider", "fieldedge")
      .eq("is_active", true)
      .maybeSingle();

    if (intError) throw intError;
    if (!integration) return jsonResponse({ error: "FieldEdge integration not found or inactive" }, 404);

    const credentials = integration.credentials_json as { api_key: string; base_url: string };
    const baseUrl = credentials.base_url || "https://api.fieldedge.com/v1";
    const headers = {
      "Authorization": `Bearer ${credentials.api_key}`,
      "Content-Type": "application/json",
    };

    const results = { created: 0, updated: 0, outbound_pushed: 0, errors: [] as string[] };

    // --- OUTBOUND: Push pending/confirmed bookings to FieldEdge ---
    try {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("*, leads!bookings_lead_id_fkey(full_name, phone_e164, email)")
        .eq("tenant_id", tenant_id)
        .in("status", ["pending_approval", "confirmed"])
        .is("external_event_id", null);

      if (bookings && bookings.length > 0) {
        for (const booking of bookings) {
          try {
            // POST to FieldEdge — placeholder endpoint
            const resp = await fetch(`${baseUrl}/work-orders`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                customer_name: booking.leads?.full_name || "",
                customer_phone: booking.leads?.phone_e164 || "",
                scheduled_start: booking.start_at,
                scheduled_end: booking.end_at,
                notes: booking.notes || "",
                source: "closeloop",
              }),
            });

            if (resp.ok) {
              const feData = await resp.json();
              const externalId = feData?.id || feData?.work_order_id;
              if (externalId) {
                await supabase
                  .from("bookings")
                  .update({ external_event_id: `fieldedge:${externalId}` })
                  .eq("id", booking.id);
                results.outbound_pushed++;
              }
            } else {
              results.errors.push(`Outbound failed for booking ${booking.id}: ${resp.status}`);
            }
          } catch (e) {
            results.errors.push(`Outbound error for booking ${booking.id}: ${e.message}`);
          }
        }
      }
    } catch (e) {
      results.errors.push(`Outbound query error: ${e.message}`);
    }

    // --- INBOUND: Pull FieldEdge dispatches into active_jobs ---
    try {
      const resp = await fetch(`${baseUrl}/dispatches?status=scheduled,in_progress`, { headers });

      if (resp.ok) {
        const dispatches = await resp.json();
        const items = Array.isArray(dispatches) ? dispatches : dispatches?.data || [];

        for (const dispatch of items) {
          const externalId = `fieldedge:${dispatch.id}`;

          // Check if already exists
          const { data: existing } = await supabase
            .from("active_jobs")
            .select("id, status")
            .eq("tenant_id", tenant_id)
            .eq("external_id", externalId)
            .maybeSingle();

          // Map FieldEdge status to internal status
          const statusMap: Record<string, string> = {
            scheduled: "intake",
            dispatched: "in_progress",
            in_progress: "in_progress",
            completed: "completed",
            cancelled: "cancelled",
          };
          const mappedStatus = statusMap[dispatch.status] || "intake";

          if (existing) {
            if (existing.status !== mappedStatus) {
              await supabase
                .from("active_jobs")
                .update({ status: mappedStatus })
                .eq("id", existing.id);
              results.updated++;
            }
          } else {
            // Generate job number
            const { data: jobNum } = await supabase.rpc("generate_job_number", { p_tenant_id: tenant_id });

            await supabase.from("active_jobs").insert({
              tenant_id,
              job_number: jobNum || `FE-${dispatch.id}`,
              title: dispatch.description || dispatch.work_type || "FieldEdge Job",
              status: mappedStatus,
              customer_name: dispatch.customer_name || null,
              customer_phone: dispatch.customer_phone || null,
              external_id: externalId,
              intake_method: "fieldedge",
              metadata_json: {
                fieldedge_dispatch_id: dispatch.id,
                fieldedge_technician: dispatch.technician_name || null,
              },
            });
            results.created++;
          }
        }
      } else {
        results.errors.push(`Inbound fetch failed: ${resp.status}`);
      }
    } catch (e) {
      results.errors.push(`Inbound error: ${e.message}`);
    }

    // Update last_synced_at
    await supabase
      .from("tenant_integrations")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("tenant_id", tenant_id)
      .eq("provider", "fieldedge");

    console.log(`[sync-fieldedge] tenant=${tenant_id} results=`, results);

    return jsonResponse({ success: true, results });
  } catch (err) {
    console.error("[sync-fieldedge] Error:", err);
    return jsonResponse({ error: err.message || "Internal error" }, 500);
  }
});
