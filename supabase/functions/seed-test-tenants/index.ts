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
    // Optional business details
    hours_json?: Record<string, unknown>;
    phone_public?: string;
    website_url?: string;
    tagline?: string;
    cancellation_policy?: string;
    service_area_json?: Record<string, unknown>;
    // Optional standalone login credentials
    owner_email?: string;
    owner_password?: string;
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
      customServices?: {
        name: string;
        description?: string;
        duration_minutes: number;
        price_amount: number;
        price_type?: string;
        booking_type?: string;
        service_category?: string;
        display_order?: number;
      }[];
      customFaqs?: {
        question: string;
        answer: string;
        priority_weight?: number;
      }[];
      customObjections?: {
        objection: string;
        response: string;
        priority_weight?: number;
      }[];
      customInventory?: {
        year: number;
        make: string;
        model: string;
        trim?: string;
        body_style?: string;
        condition: "new" | "used" | "certified";
        exterior_color?: string;
        mileage?: number;
        asking_price_cents: number;
        internet_price_cents?: number;
        stock_number?: string;
        features?: string[];
        description?: string;
      }[];
      customSalesLeads?: {
        customer_name?: string;
        customer_phone?: string;
        status?: string;
        priority?: string;
        vehicle_interest?: string;
        interest_type?: string;
        budget_range?: string;
        has_trade_in?: boolean;
        trade_in_details?: string | null;
        financing_preapproved?: boolean;
        timeline?: string;
        source?: string;
        notes?: string;
        lead_number?: string;
      }[];
      customCallSessions?: {
        caller_phone: string;
        outcome: "booked" | "followup" | "lost" | "escalated" | "message";
        summary: string;
        lead_score?: "hot" | "warm" | "cool" | null;
        followup_status?: "new" | "called_back" | "no_answer" | "completed" | "lost" | null;
        hours_ago: number;
        duration_seconds?: number;
      }[];
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
    const adminSecret = Deno.env.get("ADMIN_CLEANUP_SECRET");

    // Allow admin secret as alternative to user JWT (for server-side seeding)
    const adminSecretHeader = req.headers.get("x-admin-secret");
    const isAdminSecretAuth = adminSecret && adminSecretHeader === adminSecret;

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Declare user at function scope so it's available for tenant_users insert
    let authenticatedUserId: string | null = null;

    if (!isAdminSecretAuth) {
      // Verify the user is a super_admin via JWT
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

      const { data: roleRow } = await serviceClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();

      if (!roleRow) {
        return new Response(JSON.stringify({ error: "Forbidden: super_admin required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      authenticatedUserId = user.id;
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
      await serviceClient.from("leads").delete().eq("tenant_id", tenantId);
      await serviceClient.from("sales_leads").delete().eq("tenant_id", tenantId);
      await serviceClient.from("test_drives").delete().eq("tenant_id", tenantId);
      await serviceClient.from("sales_inventory").delete().eq("tenant_id", tenantId);
      await serviceClient.from("services").delete().eq("tenant_id", tenantId);
      await serviceClient.from("business_faqs").delete().eq("tenant_id", tenantId);
      await serviceClient.from("objection_responses").delete().eq("tenant_id", tenantId);
      await serviceClient.from("automations").delete().eq("tenant_id", tenantId);
      await serviceClient.from("assistant_settings").delete().eq("tenant_id", tenantId);
      await serviceClient.from("subscriptions").delete().eq("tenant_id", tenantId);
      await serviceClient.from("food_order_settings").delete().eq("tenant_id", tenantId);
      await serviceClient.from("customers").delete().eq("tenant_id", tenantId);
      await serviceClient.from("tenant_users").delete().eq("tenant_id", tenantId);
      await serviceClient.from("tenants").delete().eq("id", tenantId);

      return new Response(JSON.stringify({ tenant_id: tenantId, status: "deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle RESEED action
    if (action === "reseed" && existingTenant) {
      const tenantId = existingTenant.id;

      // Clear seed-able data (including leads to prevent duplicate key on re-run)
      await serviceClient.from("ai_call_sessions").delete().eq("tenant_id", tenantId);
      await serviceClient.from("bookings").delete().eq("tenant_id", tenantId);
      await serviceClient.from("dispatch_jobs").delete().eq("tenant_id", tenantId);
      await serviceClient.from("food_orders").delete().eq("tenant_id", tenantId);
      await serviceClient.from("medical_intakes").delete().eq("tenant_id", tenantId);
      await serviceClient.from("leads").delete().eq("tenant_id", tenantId);
      await serviceClient.from("sales_leads").delete().eq("tenant_id", tenantId);
      await serviceClient.from("test_drives").delete().eq("tenant_id", tenantId);
      await serviceClient.from("sales_inventory").delete().eq("tenant_id", tenantId);
      await serviceClient.from("services").delete().eq("tenant_id", tenantId);
      await serviceClient.from("business_faqs").delete().eq("tenant_id", tenantId);
      await serviceClient.from("objection_responses").delete().eq("tenant_id", tenantId);

      // Ensure standalone owner login exists if credentials provided
      if (config.owner_email && config.owner_password) {
        let ownerId: string | null = null;

        const { data: newUser, error: createErr } =
          await serviceClient.auth.admin.createUser({
            email: config.owner_email,
            password: config.owner_password,
            email_confirm: true,
          });

        if (newUser?.user) {
          ownerId = newUser.user.id;
        } else if (
          createErr &&
          (createErr.message?.includes("already been registered") ||
            createErr.message?.includes("already exists"))
        ) {
          const { data: listData } =
            await serviceClient.auth.admin.listUsers();
          const existing = listData?.users?.find(
            (u: { email?: string }) => u.email === config.owner_email
          );
          if (existing) ownerId = existing.id;
        } else if (createErr) {
          console.error("Failed to create owner auth user:", createErr.message);
        }

        if (ownerId) {
          await serviceClient
            .from("profiles")
            .upsert({ id: ownerId, role: "user" }, { onConflict: "id" });

          await serviceClient.from("tenant_users").upsert(
            { tenant_id: tenantId, user_id: ownerId, role: "owner" },
            { onConflict: "tenant_id,user_id" }
          );
        }
      }

      // Re-seed
      await seedTenantData(serviceClient, tenantId, config);

      // Fix greeting script to match current business name
      await serviceClient
        .from("ai_assistants")
        .update({ greeting_script: `Thanks for calling ${config.name}! How can I help you today?` })
        .eq("tenant_id", tenantId);

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
      const defaultHours = {
        monday: { closed: false, windows: [{ open: "09:00", close: "17:00" }] },
        tuesday: { closed: false, windows: [{ open: "09:00", close: "17:00" }] },
        wednesday: { closed: false, windows: [{ open: "09:00", close: "17:00" }] },
        thursday: { closed: false, windows: [{ open: "09:00", close: "17:00" }] },
        friday: { closed: false, windows: [{ open: "09:00", close: "17:00" }] },
        saturday: { closed: false, windows: [{ open: "10:00", close: "15:00" }] },
        sunday: { closed: true, windows: [] },
      };

      const tenantInsert: Record<string, unknown> = {
        name: config.name,
        address: config.address,
        timezone: config.timezone,
        business_mode: config.business_mode,
        industry: config.industry,
        enabled_modules: config.enabled_modules,
        capabilities_json: config.capabilities_json,
        hipaa_mode: config.hipaa_mode,
        hours_json: config.hours_json ?? defaultHours,
        onboarding_completed_at: new Date().toISOString(),
        // Test tenants have AI enabled by default so Brain Debugger shows correct state
        ai_enabled: true,
      };

      if (config.phone_public) tenantInsert.phone_public = config.phone_public;
      if (config.website_url) tenantInsert.website_url = config.website_url;
      if (config.tagline) tenantInsert.tagline = config.tagline;
      if (config.cancellation_policy) tenantInsert.cancellation_policy = config.cancellation_policy;
      if (config.service_area_json) tenantInsert.service_area_json = config.service_area_json;

      const { data: newTenant, error: tenantError } = await serviceClient
        .from("tenants")
        .insert(tenantInsert)
        .select("id")
        .single();

      if (tenantError || !newTenant) {
        throw new Error(`Tenant creation failed: ${tenantError?.message}`);
      }

      const tenantId = newTenant.id;

      // Create membership for the admin user (so they can Switch to this tenant)
      if (authenticatedUserId) {
        await serviceClient.from("tenant_users").insert({
          tenant_id: tenantId,
          user_id: authenticatedUserId,
          role: "owner",
        });
      }

      // Create standalone owner login if credentials provided
      if (config.owner_email && config.owner_password) {
        let ownerId: string | null = null;

        // Try to create the auth user
        const { data: newUser, error: createErr } =
          await serviceClient.auth.admin.createUser({
            email: config.owner_email,
            password: config.owner_password,
            email_confirm: true,
          });

        if (newUser?.user) {
          ownerId = newUser.user.id;
        } else if (
          createErr &&
          (createErr.message?.includes("already been registered") ||
            createErr.message?.includes("already exists"))
        ) {
          // User already exists (re-seed scenario) — look them up
          const { data: listData } =
            await serviceClient.auth.admin.listUsers();
          const existing = listData?.users?.find(
            (u: { email?: string }) => u.email === config.owner_email
          );
          if (existing) ownerId = existing.id;
        } else if (createErr) {
          console.error("Failed to create owner auth user:", createErr.message);
        }

        if (ownerId) {
          // Ensure a profile row exists so role checks work
          await serviceClient
            .from("profiles")
            .upsert({ id: ownerId, role: "user" }, { onConflict: "id" });

          // Add owner membership (ignore conflict if already exists)
          await serviceClient.from("tenant_users").upsert(
            { tenant_id: tenantId, user_id: ownerId, role: "owner" },
            { onConflict: "tenant_id,user_id" }
          );
        }
      }

      // Create subscription (trialing on base plan — gives full access for testing)
      await serviceClient.from("subscriptions").insert({
        tenant_id: tenantId,
        plan_code: "base-200",
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

      // Create booking_delivery_settings for modes that book (required for booking-handoff to run)
      if (["service", "medical", "sales", "general"].includes(config.business_mode)) {
        await serviceClient.from("booking_delivery_settings").insert({
          tenant_id: tenantId,
          enabled: true,
          handoff_methods: { email: true, sms: true, push: false, calendar_sync: false },
        });
      }

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

// Helper: seed services, FAQs, objections, and sample data
// deno-lint-ignore no-explicit-any
async function seedTenantData(
  client: any,
  tenantId: string,
  config: SeedRequest["config"]
) {
  const { seedData } = config;

  // Seed services — use custom if provided, otherwise generate generic
  if (seedData.customServices && seedData.customServices.length > 0) {
    const services = seedData.customServices.map((s) => ({
      tenant_id: tenantId,
      name: s.name,
      description: s.description ?? "",
      duration_minutes: s.duration_minutes,
      price_amount: s.price_amount,
      price_type: s.price_type ?? "fixed",
      booking_type: s.booking_type ?? "direct_book",
      service_category: s.service_category ?? null,
      display_order: s.display_order ?? 0,
      is_active: true,
    }));
    await client.from("services").insert(services);
  } else {
    // Generate mode-aware service names instead of generic "Service N"
    const modeServiceNames: Record<string, string[]> = {
      service: ["Consultation", "Standard Service", "Premium Service", "Emergency Service", "Inspection", "Maintenance", "Repair", "Installation"],
      dispatch: ["Standard Pickup", "Express Pickup", "Scheduled Delivery", "Emergency Dispatch", "Long Distance", "After-Hours Service"],
      food: ["Lunch Special", "Dinner Special", "Catering Package", "Family Meal", "Party Platter"],
      medical: ["New Patient Visit", "Follow-Up Visit", "Wellness Check", "Screening", "Consultation", "Procedure"],
      sales: ["Initial Consultation", "Product Demo", "Custom Quote", "Priority Service", "Premium Package"],
      general: ["Phone Consultation", "In-Person Meeting", "Priority Support", "Standard Service"],
    };
    const names = modeServiceNames[config.business_mode] ?? modeServiceNames.general!;
    const services = Array.from({ length: seedData.serviceCount }, (_, i) => ({
      tenant_id: tenantId,
      name: names[i % names.length]!,
      description: `Professional ${names[i % names.length]!.toLowerCase()} provided by ${config.name}`,
      duration_minutes: [30, 45, 60, 90][i % 4],
      price_amount: [50, 75, 100, 150, 200][i % 5],
      price_type: "fixed" as const,
      is_active: true,
    }));
    if (services.length > 0) {
      await client.from("services").insert(services);
    }
  }

  // Seed FAQs — use custom if provided, otherwise generate generic
  if (seedData.customFaqs && seedData.customFaqs.length > 0) {
    const faqs = seedData.customFaqs.map((f, i) => ({
      tenant_id: tenantId,
      question: f.question,
      answer: f.answer,
      priority_weight: f.priority_weight ?? i,
    }));
    await client.from("business_faqs").insert(faqs);
  } else {
    // Generate realistic FAQs instead of generic "Sample question N"
    const defaultFaqs = [
      { question: "What are your hours?", answer: `Our hours are listed on our website. Please call ${config.name} and we'll let you know our current availability.` },
      { question: "What forms of payment do you accept?", answer: "We accept all major credit cards, debit cards, and cash." },
      { question: "Are you licensed and insured?", answer: `Yes, ${config.name} is fully licensed and insured.` },
      { question: "What is your cancellation policy?", answer: "We ask for at least 24 hours notice for cancellations. Late cancellations may incur a fee." },
      { question: "Do you offer free estimates?", answer: "We provide free estimates for most services. Contact us to schedule one." },
      { question: "How do I schedule an appointment?", answer: "You can call us directly or use our online booking system." },
      { question: "Do you offer emergency service?", answer: "Please call us directly for urgent requests and we will do our best to accommodate you." },
      { question: "What areas do you serve?", answer: `Please contact ${config.name} for our current service area.` },
    ];
    const faqs = defaultFaqs.slice(0, seedData.faqCount).map((f, i) => ({
      tenant_id: tenantId,
      question: f.question,
      answer: f.answer,
      priority_weight: seedData.faqCount - i,
    }));
    if (faqs.length > 0) {
      await client.from("business_faqs").insert(faqs);
    }
  }

  // Seed objection responses — only if custom data provided
  if (seedData.customObjections && seedData.customObjections.length > 0) {
    const objections = seedData.customObjections.map((o, i) => ({
      tenant_id: tenantId,
      objection: o.objection,
      response: o.response,
      priority_weight: o.priority_weight ?? i,
    }));
    await client.from("objection_responses").insert(objections);
  }

  // Seed inventory (sales mode only)
  if (seedData.customInventory && seedData.customInventory.length > 0) {
    const inventory = seedData.customInventory.map((v) => ({
      tenant_id: tenantId,
      year: v.year,
      make: v.make,
      model: v.model,
      trim: v.trim ?? null,
      body_style: v.body_style ?? null,
      condition: v.condition,
      color_exterior: v.exterior_color ?? null,
      mileage: v.mileage ?? null,
      asking_price_cents: v.asking_price_cents,
      internet_price_cents: v.internet_price_cents ?? v.asking_price_cents,
      stock_number: v.stock_number ?? null,
      features: v.features ?? [],
      description: v.description ?? null,
      status: "available",
    }));
    await client.from("sales_inventory").insert(inventory);
  }

  // Seed sales leads (sales mode only)
  if (seedData.customSalesLeads && seedData.customSalesLeads.length > 0) {
    // Create customers for leads that have a customer_name and customer_phone
    const leadsWithCustomers = await Promise.all(
      seedData.customSalesLeads.map(async (l) => {
        let customerId: string | null = null;
        if (l.customer_name && l.customer_phone) {
          // Upsert customer by phone (unique per tenant)
          const { data: existing } = await client
            .from("customers")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("phone_e164", l.customer_phone)
            .maybeSingle();
          if (existing) {
            customerId = existing.id;
          } else {
            const { data: newCustomer } = await client
              .from("customers")
              .insert({ tenant_id: tenantId, full_name: l.customer_name, phone_e164: l.customer_phone, source: "seeded" })
              .select("id")
              .single();
            customerId = newCustomer?.id ?? null;
          }
        }
        return {
          tenant_id: tenantId,
          customer_id: customerId,
          status: l.status ?? "new",
          priority: l.priority ?? "normal",
          vehicle_interest: l.vehicle_interest ?? null,
          interest_type: l.interest_type ?? null,
          budget_range: l.budget_range ?? null,
          has_trade_in: l.has_trade_in ?? false,
          trade_in_details: l.trade_in_details ?? null,
          financing_preapproved: l.financing_preapproved ?? false,
          timeline: l.timeline ?? null,
          source: l.source ?? "ai_call",
          notes: l.notes ?? null,
          lead_number: l.lead_number ?? null,
        };
      })
    );
    await client.from("sales_leads").insert(leadsWithCustomers);
  }

  // Seed sample call sessions — use custom if provided, otherwise generate generic
  let calls;
  if (seedData.customCallSessions && seedData.customCallSessions.length > 0) {
    calls = seedData.customCallSessions.map((c) => {
      const startedAt = new Date(Date.now() - c.hours_ago * 60 * 60 * 1000);
      return {
        tenant_id: tenantId,
        call_direction: "inbound" as const,
        started_at: startedAt.toISOString(),
        ended_at: new Date(startedAt.getTime() + (c.duration_seconds ?? 180) * 1000).toISOString(),
        outcome: c.outcome,
        caller_phone: c.caller_phone,
        summary: c.summary,
        lead_score: c.lead_score ?? null,
        followup_status: c.followup_status ?? null,
      };
    });
  } else {
    const outcomes: ("booked" | "followup" | "lost" | "escalated" | "message")[] =
      ["booked", "booked", "lost", "followup", "message"];
    calls = Array.from({ length: seedData.callCount }, (_, i) => {
      const hoursAgo = i * 2 + 1;
      const startedAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
      return {
        tenant_id: tenantId,
        call_direction: "inbound" as const,
        started_at: startedAt.toISOString(),
        ended_at: new Date(startedAt.getTime() + (60 + i * 30) * 1000).toISOString(),
        outcome: outcomes[i % outcomes.length],
        caller_phone: `+1555000${String(i).padStart(4, "0")}`,
        summary: `${outcomes[i % outcomes.length].charAt(0).toUpperCase() + outcomes[i % outcomes.length].slice(1)} call — customer inquired about services`,
        lead_score: (["hot", "warm", "cool"] as const)[i % 3],
        followup_status: (["new", "completed", "new", "completed", "new"] as const)[i % 5],
      };
    });
  }

  if (calls.length > 0) {
    await client.from("ai_call_sessions").insert(calls);
  }
}
