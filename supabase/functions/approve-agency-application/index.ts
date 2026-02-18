/**
 * approve-agency-application
 *
 * Approves a pending agency application:
 * 1. Creates an agency_accounts row for the applicant
 * 2. Updates the application status to "approved"
 *
 * Auth: requires super_admin role.
 */

import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/tenant.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    // Auth: verify caller is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Unauthorized", 401);

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );
    const { data: userRes, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !userRes?.user?.id) return errorResponse("Unauthorized", 401);

    const adminUserId = userRes.user.id;

    const svc = serviceClient();

    // Check super_admin role
    const { data: roleRow } = await svc
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUserId)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleRow) return errorResponse("Forbidden: super_admin required", 403);

    // Parse body
    const body = await req.json();
    const { application_id, admin_notes } = body;

    if (!application_id) return errorResponse("application_id is required", 400);

    // Fetch the application
    const { data: app, error: appErr } = await svc
      .from("agency_applications")
      .select("*")
      .eq("id", application_id)
      .single();

    if (appErr || !app) return errorResponse("Application not found", 404);

    if (app.status !== "new" && app.status !== "reviewing") {
      return errorResponse(`Application is already ${app.status}`, 409);
    }

    if (!app.user_id) {
      return errorResponse("Application has no linked user account. Cannot approve.", 400);
    }

    // Create agency_accounts row
    const agencySlug = slugify(app.company_name) + "-" + Date.now().toString(36).slice(-4);

    const { data: agencyRow, error: agencyErr } = await svc
      .from("agency_accounts")
      .insert({
        user_id: app.user_id,
        agency_name: app.company_name,
        agency_slug: agencySlug,
        billing_config_json: { commission_rate: 0.20 },
      })
      .select("id")
      .single();

    if (agencyErr) {
      console.error("[approve-agency-application] agency insert error:", agencyErr);
      return errorResponse(`Failed to create agency account: ${agencyErr.message}`, 500);
    }

    // Update the application
    const updateFields: Record<string, unknown> = {
      status: "approved",
      approved_agency_id: agencyRow.id,
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (admin_notes !== undefined) updateFields.admin_notes = admin_notes;

    const { error: updateErr } = await svc
      .from("agency_applications")
      .update(updateFields)
      .eq("id", application_id);

    if (updateErr) {
      console.error("[approve-agency-application] update error:", updateErr);
      return errorResponse(`Failed to update application: ${updateErr.message}`, 500);
    }

    console.log(`[approve-agency-application] Approved: app=${application_id} agency=${agencyRow.id}`);

    return jsonResponse({ success: true, agency_id: agencyRow.id });
  } catch (err) {
    console.error("[approve-agency-application] Error:", err);
    return errorResponse(err instanceof Error ? err.message : "Internal server error", 500);
  }
});
