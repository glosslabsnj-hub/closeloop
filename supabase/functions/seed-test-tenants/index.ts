import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SeedRequest {
  action: "create_and_seed" | "reseed" | "delete";
  config: {
    slug: string;
    name: string;
    address: string;
    timezone: string;
    business_mode: string;
    industry: string;
    enabled_modules: string[];
    capabilities_json: Record<string, boolean>;
    hipaa_mode: boolean;
    communicationPrefs: {
      aiBookingMode: string;
      missedCallBehavior: string;
      unknownQuestionBehavior: string;
    };
    seedData: {
      callCount: number;
      faqCount: number;
      serviceCount: number;
      bookingCount?: number;
      orderCount?: number;
      dispatchJobCount?: number;
      intakeCount?: number;
    };
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify auth
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

    // Verify the user is a super_admin
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
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile } = await serviceClient
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

    const body: SeedRequest = await req.json();
    const { action, config } = body;

    if (!action || !config) {
      return new Response(JSON.stringify({ error: "Missing action or config" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if tenant already exists
    const { data: existingTenant } = await serviceClient
      .from("tenants")
      .select("id")
      .eq("name", config.name)
      .maybeSingle();

    // Handle DELETE action
    if (action === "delete") {
      if (!existingTenant) {
        return new Response(JSON.stringify({ status: "skipped", message: "Tenant not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tenantId = existingTenant.id;

      // Delete in order (respecting FK constraints)
      await serviceClient.from("ai_call_sessions").delete().eq("tenant_id", tenantId);
      await serviceClient.from("bookings").delete().eq("tenant_id", tenantId);
      await serviceClient.from("dispatch_jobs").delete().eq("tenant_id", tenantId);
      await serviceClient.from("food_orders").delete().eq("tenant_id", tenantId);
      await serviceClient.from("medical_intakes").delete().eq("tenant_id", tenantId);
      await serviceClient.from("services").delete().eq("tenant_id", tenantId);
      await serviceClient.from("business_faqs").delete().eq("tenant_id", tenantId);
      await serviceClient.from("objection_responses").delete().eq("tenant_id", tenantId);
      await serviceClient.from("automations").delete().eq("tenant_id", tenantId);
      await serviceClient.from("assistant_settings").delete().eq("tenant_id", tenantId);
      await serviceClient.from("subscriptions").delete().eq("tenant_id", tenantId);
      await serviceClient.from("food_order_settings").delete().eq("tenant_id", tenantId);
      await serviceClient.from("customers").delete().eq("tenant_id", tenantId);
      await serviceClient.from("tenant_memberships").delete().eq("tenant_id", tenantId);
      await serviceClient.from("tenants").delete().eq("id", tenantId);

      return new Response(JSON.stringify({ tenant_id: tenantId, status: "deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle RESEED action
    if (action === "reseed" && existingTenant) {
      const tenantId = existingTenant.id;

      // Clear seed-able data
      await serviceClient.from("ai_call_sessions").delete().eq("tenant_id", tenantId);
      await serviceClient.from("bookings").delete().eq("tenant_id", tenantId);
      await serviceClient.from("dispatch_jobs").delete().eq("tenant_id", tenantId);
      await serviceClient.from("food_orders").delete().eq("tenant_id", tenantId);
      await serviceClient.from("medical_intakes").delete().eq("tenant_id", tenantId);
      await serviceClient.from("services").delete().eq("tenant_id", tenantId);
      await serviceClient.from("business_faqs").delete().eq("tenant_id", tenantId);
      await serviceClient.from("objection_responses").delete().eq("tenant_id", tenantId);

      // Re-seed
      await seedTenantData(serviceClient, tenantId, config);

      return new Response(JSON.stringify({ tenant_id: tenantId, status: "reseeded" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle CREATE_AND_SEED action
    if (action === "create_and_seed") {
      if (existingTenant) {
        return new Response(
          JSON.stringify({ tenant_id: existingTenant.id, status: "skipped", message: "Already exists" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create tenant
      const { data: newTenant, error: tenantError } = await serviceClient
        .from("tenants")
        .insert({
          name: config.name,
          address: config.address,
          timezone: config.timezone,
          business_mode: config.business_mode,
          industry: config.industry,
          enabled_modules: config.enabled_modules,
          capabilities_json: config.capabilities_json,
          hipaa_mode: config.hipaa_mode,
          hours_json: {
            monday: { closed: false, windows: [{ open: "09:00", close: "17:00" }] },
            tuesday: { closed: false, windows: [{ open: "09:00", close: "17:00" }] },
            wednesday: { closed: false, windows: [{ open: "09:00", close: "17:00" }] },
            thursday: { closed: false, windows: [{ open: "09:00", close: "17:00" }] },
            friday: { closed: false, windows: [{ open: "09:00", close: "17:00" }] },
            saturday: { closed: false, windows: [{ open: "10:00", close: "15:00" }] },
            sunday: { closed: true, windows: [] },
          },
          onboarding_completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (tenantError || !newTenant) {
        throw new Error(`Tenant creation failed: ${tenantError?.message}`);
      }

      const tenantId = newTenant.id;

      // Create membership
      await serviceClient.from("tenant_memberships").insert({
        tenant_id: tenantId,
        user_id: user.id,
        role: "owner",
      });

      // Create subscription
      await serviceClient.from("subscriptions").insert({
        tenant_id: tenantId,
        plan_code: "voice",
        status: "trialing",
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Create assistant settings
      await serviceClient.from("assistant_settings").insert({
        tenant_id: tenantId,
        voice_ai_enabled: true,
        instant_text_enabled: true,
        ai_booking_mode: config.communicationPrefs.aiBookingMode,
        missed_call_behavior: config.communicationPrefs.missedCallBehavior,
        unknown_question_behavior: config.communicationPrefs.unknownQuestionBehavior,
      });

      // Create food order settings for food mode
      if (config.business_mode === "food") {
        await serviceClient.from("food_order_settings").insert({
          tenant_id: tenantId,
          accepts_pickup: true,
          accepts_delivery: config.capabilities_json.offersDelivery ?? false,
          accepts_dine_in: true,
          accepts_catering: config.capabilities_json.offersCatering ?? false,
          order_confirmation_mode: "auto_confirm",
        });
      }

      // Seed data
      await seedTenantData(serviceClient, tenantId, config);

      // Save scenario flags
      await serviceClient
        .from("tenants")
        .update({
          context_fields_json: { capabilities: config.capabilities_json },
        })
        .eq("id", tenantId);

      return new Response(JSON.stringify({ tenant_id: tenantId, status: "created" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("seed-test-tenants error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper: seed services, FAQs, and sample data
async function seedTenantData(
  client: ReturnType<typeof createClient>,
  tenantId: string,
  config: SeedRequest["config"]
) {
  const { seedData } = config;

  // Seed services
  const services = Array.from({ length: seedData.serviceCount }, (_, i) => ({
    tenant_id: tenantId,
    name: `${config.name} Service ${i + 1}`,
    description: `Sample service #${i + 1}`,
    duration_minutes: [30, 45, 60, 90][i % 4],
    price_amount: [50, 75, 100, 150, 200][i % 5],
    price_type: "fixed" as const,
    is_active: true,
  }));

  if (services.length > 0) {
    await client.from("services").insert(services);
  }

  // Seed FAQs
  const faqs = Array.from({ length: seedData.faqCount }, (_, i) => ({
    tenant_id: tenantId,
    question: `Sample question ${i + 1} for ${config.name}?`,
    answer: `This is the answer to sample question ${i + 1}.`,
    priority_weight: i,
  }));

  if (faqs.length > 0) {
    await client.from("business_faqs").insert(faqs);
  }

  // Seed sample call sessions
  const calls = Array.from({ length: seedData.callCount }, (_, i) => {
    const hoursAgo = i * 2 + 1;
    const startedAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    return {
      tenant_id: tenantId,
      started_at: startedAt.toISOString(),
      ended_at: new Date(startedAt.getTime() + (60 + i * 30) * 1000).toISOString(),
      status: ["completed", "completed", "missed", "completed", "voicemail"][i % 5],
      caller_phone: `+1555000${String(i).padStart(4, "0")}`,
      duration_seconds: 60 + i * 30,
    };
  });

  if (calls.length > 0) {
    await client.from("ai_call_sessions").insert(calls);
  }
}
