import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireAuthedTenant, serviceClient } from "../_shared/tenant.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const { tenantId } = await requireAuthedTenant(req);
    const { customer_id } = await req.json();

    if (!customer_id) {
      return errorResponse("customer_id is required");
    }

    const svc = serviceClient();

    // Verify customer belongs to this tenant
    const { data: customer, error: custErr } = await svc
      .from("customers")
      .select("id, full_name")
      .eq("id", customer_id)
      .eq("tenant_id", tenantId)
      .single();

    if (custErr || !customer) {
      return errorResponse("Customer not found", 404);
    }

    // Build token payload
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 24 * 60 * 60; // 24 hours
    const payload = { customer_id, tenant_id: tenantId, iat, exp };
    const payloadB64 = btoa(JSON.stringify(payload));

    // Sign with HMAC-SHA256
    const secret = Deno.env.get("PORTAL_TOKEN_SECRET");
    if (!secret) {
      return errorResponse("PORTAL_TOKEN_SECRET not configured", 500);
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const signatureB64 = btoa(String.fromCharCode(...signatureArray));

    const token = `${payloadB64}.${signatureB64}`;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    // Construct portal URL — assumes the frontend is hosted at the Supabase project URL or custom domain
    const portalUrl = `${SUPABASE_URL.replace(".supabase.co", "")}/portal/${tenantId}?token=${encodeURIComponent(token)}`;

    return jsonResponse({
      token,
      expires_at: new Date(exp * 1000).toISOString(),
      portal_url: portalUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return errorResponse(message, status);
  }
});
