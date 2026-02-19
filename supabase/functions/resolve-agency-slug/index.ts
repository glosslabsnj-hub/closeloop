/**
 * resolve-agency-slug
 *
 * Public endpoint — no auth required.
 * Resolves an agency slug to public-safe agency info for referral signup pages.
 *
 * Input: { slug: string }
 * Returns: { agency_id, agency_name, branding_json } or 404
 */

import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/tenant.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const { slug } = await req.json();

    if (!slug || typeof slug !== "string") {
      return errorResponse("Missing slug");
    }

    const svc = serviceClient();

    const { data, error } = await svc
      .from("agency_accounts")
      .select("id, agency_name, branding_json")
      .eq("agency_slug", slug.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      console.error("resolve-agency-slug error:", error);
      return errorResponse("Internal error", 500);
    }

    if (!data) {
      return errorResponse("Agency not found", 404);
    }

    return jsonResponse({
      agency_id: data.id,
      agency_name: data.agency_name,
      branding_json: data.branding_json || {},
    });
  } catch (err) {
    console.error("resolve-agency-slug error:", err);
    return errorResponse("Internal error", 500);
  }
});
