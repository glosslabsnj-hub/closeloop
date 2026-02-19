/**
 * process-commission-payout
 *
 * Marks pending commissions as paid. Admin-only (super_admin JWT).
 *
 * Input: { commission_ids: string[], payout_method: string, payout_reference?: string, notes?: string }
 */

import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/tenant.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Parse input
    const { commission_ids, payout_method, payout_reference, notes } = await req.json();

    if (!Array.isArray(commission_ids) || commission_ids.length === 0) {
      return errorResponse("Missing or empty commission_ids array");
    }
    if (!payout_method || typeof payout_method !== "string") {
      return errorResponse("Missing payout_method");
    }

    // Verify all commissions are pending and belong to the same agency
    const { data: commissions, error: fetchErr } = await svc
      .from("agency_commissions")
      .select("id, agency_id, status")
      .in("id", commission_ids);

    if (fetchErr) return errorResponse("Failed to fetch commissions", 500);
    if (!commissions || commissions.length !== commission_ids.length) {
      return errorResponse("Some commission IDs not found");
    }

    const nonPending = commissions.filter((c: any) => c.status !== "pending");
    if (nonPending.length > 0) {
      return errorResponse(`${nonPending.length} commission(s) are not in 'pending' status`);
    }

    const agencyIds = [...new Set(commissions.map((c: any) => c.agency_id))];
    if (agencyIds.length > 1) {
      return errorResponse("All commissions must belong to the same agency");
    }

    // Update commissions
    const now = new Date().toISOString();
    const { error: updateErr } = await svc
      .from("agency_commissions")
      .update({
        status: "paid",
        paid_at: now,
        payout_method,
        payout_reference: payout_reference || null,
        payout_notes: notes || null,
        approved_by: adminUserId,
      })
      .in("id", commission_ids);

    if (updateErr) {
      console.error("Commission update error:", updateErr);
      return errorResponse("Failed to update commissions", 500);
    }

    // Record audit event
    try {
      await svc.from("audit_events").insert({
        event_type: "commission_paid",
        actor_id: adminUserId,
        metadata: {
          commission_ids,
          agency_id: agencyIds[0],
          payout_method,
          payout_reference: payout_reference || null,
          total_commissions: commissions.length,
        },
      });
    } catch (auditErr) {
      console.error("Audit event error:", auditErr);
    }

    return jsonResponse({
      success: true,
      paid_count: commission_ids.length,
      agency_id: agencyIds[0],
    });
  } catch (err) {
    console.error("process-commission-payout error:", err);
    return errorResponse("Internal error", 500);
  }
});
