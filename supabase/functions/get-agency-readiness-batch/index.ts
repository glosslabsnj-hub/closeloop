/**
 * get-agency-readiness-batch
 *
 * Returns onboarding readiness status for a batch of tenant IDs.
 * Auth: JWT + verify caller has membership on each requested tenant (via agency).
 *
 * Input: { tenant_ids: string[] }
 * Returns: { readiness: Record<string, { has_brain_content, subscription_status, has_stripe_customer, onboarding_step }> }
 */

import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { requireAuthedTenant, serviceClient } from "../_shared/tenant.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const { tenant_ids } = await req.json();

    if (!Array.isArray(tenant_ids) || tenant_ids.length === 0) {
      return errorResponse("Missing or empty tenant_ids array");
    }

    // Limit batch size
    if (tenant_ids.length > 50) {
      return errorResponse("Too many tenant_ids (max 50)");
    }

    // Auth: verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Unauthorized", 401);

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );
    const { data: userRes, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !userRes?.user?.id) return errorResponse("Unauthorized", 401);

    const userId = userRes.user.id;
    const svc = serviceClient();

    // Verify user is an agency owner that manages these tenants
    const { data: agencyAccount } = await svc
      .from("agency_accounts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!agencyAccount) return errorResponse("Not an agency user", 403);

    const { data: agencyTenants } = await svc
      .from("agency_tenants")
      .select("tenant_id")
      .eq("agency_id", agencyAccount.id)
      .in("tenant_id", tenant_ids);

    const allowedIds = new Set((agencyTenants || []).map((t: any) => t.tenant_id));

    // Fetch data for all allowed tenants
    const allowedList = tenant_ids.filter((id: string) => allowedIds.has(id));

    if (allowedList.length === 0) {
      return jsonResponse({ readiness: {} });
    }

    // Fetch assistant_settings (brain content proxy)
    const { data: settings } = await svc
      .from("assistant_settings")
      .select("tenant_id, voice_ai_enabled, greeting_script")
      .in("tenant_id", allowedList);

    // Fetch subscriptions
    const { data: subscriptions } = await svc
      .from("subscriptions")
      .select("tenant_id, status, stripe_customer_id")
      .in("tenant_id", allowedList);

    // Fetch FAQs count (brain content indicator)
    const { data: faqCounts } = await svc
      .from("business_faqs")
      .select("tenant_id")
      .in("tenant_id", allowedList);

    // Fetch services count (brain content indicator)
    const { data: serviceCounts } = await svc
      .from("services")
      .select("tenant_id")
      .in("tenant_id", allowedList);

    const settingsMap = new Map((settings || []).map((s: any) => [s.tenant_id, s]));
    const subMap = new Map((subscriptions || []).map((s: any) => [s.tenant_id, s]));

    // Count FAQs and services per tenant
    const faqCountMap = new Map<string, number>();
    for (const f of faqCounts || []) {
      faqCountMap.set((f as any).tenant_id, (faqCountMap.get((f as any).tenant_id) || 0) + 1);
    }
    const svcCountMap = new Map<string, number>();
    for (const s of serviceCounts || []) {
      svcCountMap.set((s as any).tenant_id, (svcCountMap.get((s as any).tenant_id) || 0) + 1);
    }

    const readiness: Record<string, unknown> = {};

    for (const tenantId of allowedList) {
      const s = settingsMap.get(tenantId);
      const sub = subMap.get(tenantId);
      const faqCount = faqCountMap.get(tenantId) || 0;
      const svcCount = svcCountMap.get(tenantId) || 0;

      const hasBrainContent = faqCount > 0 || svcCount > 0 || !!(s?.greeting_script);
      const subscriptionStatus = sub?.status || null;
      const hasStripeCustomer = !!sub?.stripe_customer_id;

      // Compute step
      let onboardingStep: string;
      if (subscriptionStatus === "active") {
        onboardingStep = "live";
      } else if (hasStripeCustomer || subscriptionStatus === "trialing") {
        onboardingStep = "plan_selected";
      } else if (hasBrainContent) {
        onboardingStep = "ai_ready";
      } else if (s) {
        onboardingStep = "brain_setup";
      } else {
        onboardingStep = "provisioned";
      }

      readiness[tenantId] = {
        has_brain_content: hasBrainContent,
        subscription_status: subscriptionStatus,
        has_stripe_customer: hasStripeCustomer,
        onboarding_step: onboardingStep,
      };
    }

    return jsonResponse({ readiness });
  } catch (err) {
    console.error("get-agency-readiness-batch error:", err);
    if (err instanceof Error && (err.message === "Unauthorized" || err.message.includes("Forbidden"))) {
      return errorResponse(err.message, 401);
    }
    return errorResponse("Internal error", 500);
  }
});
