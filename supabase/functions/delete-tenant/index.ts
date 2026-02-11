import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check super_admin role
    const svc = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile } = await svc
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Forbidden: super_admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tenant_id } = await req.json();
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "Missing tenant_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Safety: prevent deleting admin's own tenant
    const { data: ownMembership } = await svc
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    // Check if admin is the ONLY member — if so, allow. If others exist too, still allow.
    // But check admin_settings to prevent deleting the primary tenant
    const { data: adminSettings } = await svc
      .from("admin_settings")
      .select("admin_active_tenant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    // Get admin's primary (first) tenant to protect it
    const { data: primaryMembership } = await svc
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (primaryMembership?.tenant_id === tenant_id) {
      return new Response(JSON.stringify({ error: "Cannot delete your own primary tenant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify tenant exists
    const { data: tenantExists } = await svc
      .from("tenants")
      .select("id")
      .eq("id", tenant_id)
      .maybeSingle();

    if (!tenantExists) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[delete-tenant] Deleting tenant ${tenant_id} by admin ${user.id}`);

    // Cascading delete in FK order (proven sequence from seed-test-tenants)
    await svc.from("ai_call_sessions").delete().eq("tenant_id", tenant_id);
    await svc.from("bookings").delete().eq("tenant_id", tenant_id);
    await svc.from("dispatch_jobs").delete().eq("tenant_id", tenant_id);
    await svc.from("food_orders").delete().eq("tenant_id", tenant_id);
    await svc.from("medical_intakes").delete().eq("tenant_id", tenant_id);
    await svc.from("services").delete().eq("tenant_id", tenant_id);
    await svc.from("business_faqs").delete().eq("tenant_id", tenant_id);
    await svc.from("objection_responses").delete().eq("tenant_id", tenant_id);
    await svc.from("automations").delete().eq("tenant_id", tenant_id);
    await svc.from("assistant_settings").delete().eq("tenant_id", tenant_id);
    await svc.from("subscriptions").delete().eq("tenant_id", tenant_id);
    await svc.from("food_order_settings").delete().eq("tenant_id", tenant_id);
    await svc.from("customers").delete().eq("tenant_id", tenant_id);
    await svc.from("tenant_memberships").delete().eq("tenant_id", tenant_id);
    await svc.from("tenant_users").delete().eq("tenant_id", tenant_id);
    await svc.from("tenants").delete().eq("id", tenant_id);

    // If admin had this tenant active, clear it
    if (adminSettings?.admin_active_tenant_id === tenant_id) {
      await svc
        .from("admin_settings")
        .update({ admin_active_tenant_id: null })
        .eq("user_id", user.id);
    }

    console.log(`[delete-tenant] Successfully deleted tenant ${tenant_id}`);

    return new Response(JSON.stringify({ tenant_id, status: "deleted" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[delete-tenant] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
