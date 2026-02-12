import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/tenant.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const { token, tenant_id } = await req.json();

    if (!token || !tenant_id) {
      return jsonResponse({ valid: false, error: "token and tenant_id are required" });
    }

    const secret = Deno.env.get("PORTAL_TOKEN_SECRET");
    if (!secret) {
      return errorResponse("PORTAL_TOKEN_SECRET not configured", 500);
    }

    // Split token
    const parts = token.split(".");
    if (parts.length !== 2) {
      return jsonResponse({ valid: false, error: "Invalid token format" });
    }

    const [payloadB64, signatureB64] = parts;

    // Recompute HMAC
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );

    const expectedSigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
    const expectedSigArray = Array.from(new Uint8Array(expectedSigBuffer));
    const expectedSigB64 = btoa(String.fromCharCode(...expectedSigArray));

    // Timing-safe compare
    if (signatureB64.length !== expectedSigB64.length) {
      return jsonResponse({ valid: false, error: "Invalid token" });
    }
    let mismatch = 0;
    for (let i = 0; i < signatureB64.length; i++) {
      mismatch |= signatureB64.charCodeAt(i) ^ expectedSigB64.charCodeAt(i);
    }
    if (mismatch !== 0) {
      return jsonResponse({ valid: false, error: "Invalid token" });
    }

    // Decode payload
    let payload: { customer_id: string; tenant_id: string; iat: number; exp: number };
    try {
      payload = JSON.parse(atob(payloadB64));
    } catch {
      return jsonResponse({ valid: false, error: "Malformed token payload" });
    }

    // Verify expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return jsonResponse({ valid: false, error: "Token expired" });
    }

    // Verify tenant matches
    if (payload.tenant_id !== tenant_id) {
      return jsonResponse({ valid: false, error: "Token tenant mismatch" });
    }

    // Load customer data using service client (bypasses RLS)
    const svc = serviceClient();
    const { data: customer, error: custErr } = await svc
      .from("customers")
      .select("id, full_name, email, phone_e164")
      .eq("id", payload.customer_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (custErr || !customer) {
      return jsonResponse({ valid: false, error: "Customer not found" });
    }

    return jsonResponse({
      valid: true,
      customer_id: customer.id,
      customer: {
        id: customer.id,
        full_name: customer.full_name,
        email: customer.email,
        phone_e164: customer.phone_e164,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return errorResponse(message, 500);
  }
});
