import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/tenant.ts";

const supabase = serviceClient();

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    if (req.method !== "POST") return errorResponse("POST only", 405);
    const b = await req.json();

    const tenant_id = String(b.tenant_id || "");
    const event_type = String(b.event_type || "");
    if (!tenant_id || !event_type) return errorResponse("Missing tenant_id/event_type", 400);

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

    return jsonResponse({ ok: true });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e), 500);
  }
});
