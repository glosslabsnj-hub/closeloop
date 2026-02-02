import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdminSecret, isProduction } from "../_shared/tenant.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Block in production environment
    if (isProduction()) {
      return new Response(JSON.stringify({ error: "This endpoint is disabled in production" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // SECURITY: Require admin secret for this destructive operation
    requireAdminSecret(req);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { preserveEmail } = await req.json();

    if (!preserveEmail) {
      return new Response(JSON.stringify({ error: "preserveEmail required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Step 1: Get all users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      return new Response(JSON.stringify({ error: listError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Find the preserved user
    const preservedUser = users.find(u => u.email === preserveEmail);

    if (!preservedUser) {
      return new Response(JSON.stringify({ error: "Preserved user not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get the tenant ID for the preserved user
    const { data: preservedTenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', preservedUser.id)
      .single();

    const preservedTenantId = preservedTenantUser?.tenant_id;

    // Step 2: Delete orphan tenants (not the preserved one)
    if (preservedTenantId) {
      const { error: tenantDeleteError } = await supabase
        .from('tenants')
        .delete()
        .neq('id', preservedTenantId);

      if (tenantDeleteError) {
        console.error("Error deleting orphan tenants:", tenantDeleteError);
      }
    }

    // Step 3: Delete each user except the preserved one
    const usersToDelete = users.filter(u => u.email !== preserveEmail);
    const results = [];

    for (const user of usersToDelete) {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      results.push({
        email: user.email,
        deleted: !error,
        error: error?.message
      });
    }

    return new Response(JSON.stringify({
      preserved: preserveEmail,
      preservedTenantId,
      deleted: results.filter(r => r.deleted).length,
      failed: results.filter(r => !r.deleted).length,
      details: results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error in cleanup-test-users:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
