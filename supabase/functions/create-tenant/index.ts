/**
 * create-tenant Edge Function
 *
 * Creates a new tenant and automatically adds the authenticated user as owner.
 * Uses service role to bypass RLS (since user has no membership before creation).
 *
 * This function ONLY creates:
 * 1. The tenant row in public.tenants
 * 2. The membership row in public.tenant_users (role='owner')
 *
 * Related records (services, settings, etc.) should be created by frontend
 * AFTER receiving the tenant_id from this function.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateTenantRequest {
  // Required
  name: string;
  business_mode: string;
  timezone: string;
  // Optional
  tagline?: string | null;
  phone_public?: string | null;
  address?: string | null;
  hours_json?: Record<string, unknown> | null;
  industry?: string | null;
  enabled_modules?: string[];
  cancellation_policy?: string | null;
  deposit_policy?: string | null;
  refund_policy?: string | null;
  payment_methods?: string[];
  ai_never_promise?: string[];
  hipaa_mode?: boolean;
  capabilities_json?: Record<string, boolean>;
  default_capacity?: number;
  // Subscription
  plan_code?: string;
  location?: string | null;
  // Agency provisioning
  agency_id?: string | null;
  agency_slug?: string | null;
  owner_email?: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // 1. Extract and validate JWT
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Invalid Authorization header format" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Verify user identity using anon client + JWT
    // DO NOT use requireAuthedTenant - it requires existing membership
    const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: userRes, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !userRes?.user?.id) {
      console.error("[create-tenant] Auth error:", userErr?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userRes.user.id;
    console.log(`[create-tenant] Authenticated user: ${userId.substring(0, 8)}...`);

    // 3. Parse request body
    const body: CreateTenantRequest = await req.json();

    // Validate required fields
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required field: name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.business_mode || typeof body.business_mode !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required field: business_mode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.timezone || typeof body.timezone !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required field: timezone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Use service role client to bypass RLS
    const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // 5. Generate tenant ID server-side (NOT from client to prevent ID injection)
    const tenantId = crypto.randomUUID();

    // 6. Build tenant data object (only whitelisted fields)
    const tenantData: Record<string, unknown> = {
      id: tenantId,
      name: body.name.trim(),
      business_mode: body.business_mode,
      timezone: body.timezone,
      // Optional fields with safe defaults
      tagline: body.tagline ?? null,
      phone_public: body.phone_public ?? null,
      address: body.address ?? null,
      hours_json: body.hours_json ?? null,
      industry: body.industry || "general", // Default to "general" if not provided
      enabled_modules: body.enabled_modules ?? [],
      cancellation_policy: body.cancellation_policy ?? null,
      deposit_policy: body.deposit_policy ?? null,
      refund_policy: body.refund_policy ?? null,
      payment_methods: body.payment_methods ?? [],
      ai_never_promise: body.ai_never_promise ?? [],
      hipaa_mode: body.hipaa_mode ?? (body.business_mode === "medical"),
      capabilities_json: body.capabilities_json ?? null,
      default_capacity: body.default_capacity ?? 1,
      // System defaults
      ai_enabled: false,
      custom_industry: null,
      website_url: null,
      years_in_business: null,
      context_fields_json: {},
    };

    // 7. Insert tenant row
    const { error: tenantError } = await serviceClient
      .from("tenants")
      .insert(tenantData);

    if (tenantError) {
      console.error("[create-tenant] Tenant insert error:", tenantError.message);
      return new Response(
        JSON.stringify({ error: `Failed to create tenant: ${tenantError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[create-tenant] Tenant created: ${tenantId.substring(0, 8)}...`);

    // 8. Insert membership row (owner role)
    // Uses ON CONFLICT DO NOTHING for idempotency (requires unique constraint)
    const { error: membershipError } = await serviceClient
      .from("tenant_users")
      .upsert(
        {
          tenant_id: tenantId,
          user_id: userId,
          role: "owner",
        },
        { onConflict: "tenant_id,user_id" }
      );

    if (membershipError) {
      // Log but don't fail - tenant was created, membership can be retried
      console.error("[create-tenant] Membership insert error:", membershipError.message);
      // Still return the tenant_id so frontend can attempt manual recovery
    } else {
      console.log(`[create-tenant] Membership created: user ${userId.substring(0, 8)}... -> tenant ${tenantId.substring(0, 8)}...`);
    }

    // 9. Create subscription (service role to bypass RLS timing issues)
    // Map legacy plan codes to new SKUs and include usage limits from pricing config
    const PLAN_DEFAULTS: Record<string, { minutes: number; overageMinuteCents: number }> = {
      "base-200": { minutes: 200, overageMinuteCents: 55 },
      "growth-2000": { minutes: 2000, overageMinuteCents: 45 },
      "scale-5000": { minutes: 5000, overageMinuteCents: 35 },
      "power-10000": { minutes: 10000, overageMinuteCents: 29 },
      "voice": { minutes: 200, overageMinuteCents: 55 },
    };
    const rawPlanCode = body.plan_code || "base-200";
    const planCode = rawPlanCode === "voice" || rawPlanCode === "text" || rawPlanCode === "both" ? "base-200" : rawPlanCode;
    const planDefaults = PLAN_DEFAULTS[planCode] || PLAN_DEFAULTS["base-200"];
    const { error: subError } = await serviceClient
      .from("subscriptions")
      .insert({
        tenant_id: tenantId,
        plan_code: planCode,
        status: "trialing",
        current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        included_minutes: planDefaults.minutes,
        overage_minute_rate_cents: planDefaults.overageMinuteCents,
        overage_sms_rate_cents: 0,
      });

    if (subError) {
      console.error("[create-tenant] Subscription insert error:", subError.message);
    } else {
      console.log(`[create-tenant] Subscription created: ${planCode} (trialing)`);
    }

    // 10. Initialize assistant settings via RPC (service role)
    const { error: settingsError } = await serviceClient.rpc("initialize_assistant_settings", {
      _tenant_id: tenantId,
      _plan_code: planCode,
    });

    if (settingsError) {
      console.error("[create-tenant] Assistant settings error:", settingsError.message);
    } else {
      console.log(`[create-tenant] Assistant settings initialized`);
    }

    // 11. Agency linkage (if provisioned by an agency)
    let agencyLinked = false;
    let ownerInvited = false;
    if (body.agency_id) {
      const { data: agency } = await serviceClient
        .from("agency_accounts")
        .select("id, user_id")
        .eq("id", body.agency_id)
        .single();

      if (agency && agency.user_id === userId) {
        const { error: linkError } = await serviceClient
          .from("agency_tenants")
          .insert({
            agency_id: body.agency_id,
            tenant_id: tenantId,
            status: "active",
          });

        if (linkError) {
          console.error("[create-tenant] Agency link error:", linkError.message);
        } else {
          agencyLinked = true;
          console.log(`[create-tenant] Agency linked: ${body.agency_id.substring(0, 8)}... -> tenant ${tenantId.substring(0, 8)}...`);
        }

        // If owner_email provided, invite them and set agency user as manager
        if (body.owner_email) {
          // Update agency user's role from owner to manager
          await serviceClient
            .from("tenant_users")
            .update({ role: "manager" })
            .eq("tenant_id", tenantId)
            .eq("user_id", userId);

          // Send invite to the business owner
          const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
            body.owner_email
          );

          if (inviteError) {
            console.error("[create-tenant] Owner invite error:", inviteError.message);
          } else {
            ownerInvited = true;
            const invitedUserId = inviteData?.user?.id;
            if (invitedUserId) {
              // Create a pending owner membership
              await serviceClient
                .from("tenant_users")
                .upsert(
                  { tenant_id: tenantId, user_id: invitedUserId, role: "owner" },
                  { onConflict: "tenant_id,user_id" }
                );
              console.log(`[create-tenant] Owner invited: ${body.owner_email} -> tenant ${tenantId.substring(0, 8)}...`);
            }
          }
        }
      } else {
        console.warn("[create-tenant] Agency ID provided but not owned by user, skipping link");
      }
    }

    // 11b. Agency linkage via referral slug (self-serve signup)
    if (!agencyLinked && !body.agency_id && body.agency_slug) {
      const { data: agencyBySlug } = await serviceClient
        .from("agency_accounts")
        .select("id")
        .eq("agency_slug", body.agency_slug.toLowerCase().trim())
        .maybeSingle();

      if (agencyBySlug) {
        const { error: slugLinkError } = await serviceClient
          .from("agency_tenants")
          .insert({
            agency_id: agencyBySlug.id,
            tenant_id: tenantId,
            status: "active",
            referral_source: "referral_link",
          });

        if (slugLinkError) {
          console.error("[create-tenant] Agency slug link error:", slugLinkError.message);
        } else {
          agencyLinked = true;
          console.log(`[create-tenant] Agency linked via slug: ${body.agency_slug} -> tenant ${tenantId.substring(0, 8)}...`);
        }
      } else {
        console.warn(`[create-tenant] Agency slug '${body.agency_slug}' not found, skipping link`);
      }
    }

    // 12. Return success with tenant_id
    return new Response(
      JSON.stringify({
        tenant_id: tenantId,
        membership_created: !membershipError,
        subscription_created: !subError,
        settings_initialized: !settingsError,
        agency_linked: agencyLinked,
        owner_invited: ownerInvited,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[create-tenant] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
