import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { 
    status, 
    headers: { ...corsHeaders, "content-type": "application/json" } 
  });
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return json(405, { error: "POST only" });
    const b = await req.json();

    const tenant_id = String(b.tenant_id || "");
    const event_type = String(b.event_type || "");
    if (!tenant_id || !event_type) return json(400, { error: "Missing tenant_id/event_type" });

    await supabase.from("audit_events").insert({
      tenant_id,
      location_id: b.location_id ?? null,
      event_type,
      entity_type: b.entity_type ?? null,
      entity_id: b.entity_id ?? null,
      actor_type: b.actor_type ?? "system",
      actor_id: b.actor_id ?? null,
      payload: b.payload ?? {},
    });

    // Optional: create dispute-safe receipt for confirmations
    if (String(event_type).endsWith(".confirmed") && b.confirmation_summary) {
      const summary = String(b.confirmation_summary);
      const keyFields = JSON.stringify(b.payload?.key_fields ?? {});
      const confirmation_hash = await sha256Hex(summary + "|" + keyFields);

      await supabase.from("confirmation_receipts").insert({
        tenant_id,
        entity_type: b.entity_type,
        entity_id: b.entity_id,
        confirmed_by: b.confirmed_by ?? "ai",
        confirmation_summary: summary,
        confirmation_hash,
      });
    }

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});
