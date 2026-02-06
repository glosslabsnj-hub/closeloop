import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { requireAuthedTenant, serviceClient } from "../_shared/tenant.ts";

interface NavigationItem {
  path: string;
  label: string;
  enabled: boolean;
}

interface CopilotContext {
  tenant: {
    id: string;
    business_name: string;
    industry: string;
    business_mode: string;
    timezone: string;
  };
  enabled_modules: string[];
  setup: {
    readiness_score: number;
    missing_critical_fields: string[];
  };
  phone: {
    assigned_number: string;
    connect_status: string;
    forwarding_phone: string;
    last_test_call_at: string;
    is_connected: boolean;
  };
  handoff: {
    booking: {
      enabled: boolean;
      methods: string[];
      has_email: boolean;
      has_sms: boolean;
      has_webhook: boolean;
    };
    orders: {
      enabled: boolean;
      methods: string[];
      has_email: boolean;
      has_sms: boolean;
      has_webhook: boolean;
      auto_print: boolean;
    };
    dispatch: {
      enabled: boolean;
      methods: string[];
      has_email: boolean;
      has_sms: boolean;
      has_webhook: boolean;
      has_urgent_sms: boolean;
    };
  };
  knowledge_status: {
    pending_suggestions_count: number;
    unresolved_conflicts_count: number;
    processing_uploads_count: number;
    last_upload_status: string | null;
  };
  navigation_map: NavigationItem[];
  recent_activity: {
    calls: Array<{ id: string; started_at: string; outcome: string; summary: string }>;
    bookings: Array<{ id: string; start_at: string; status: string; service_name: string }>;
    orders: Array<{ id: string; created_at: string; status: string; order_number: string }>;
    dispatch_jobs: Array<{ id: string; created_at: string; status: string; job_number: string; priority: string }>;
  };
  hipaa_mode: boolean;
}

function computeReadinessScore(
  businessMode: string,
  tenant: any,
  services: any[],
  menuItems: any[],
  assistantSettings: any,
  medicalSettings: any,
  faqs: any[],
  hours: any
): { score: number; missing: string[] } {
  const missing: string[] = [];
  let score = 0;
  const maxScore = 100;

  // Common fields (30 points)
  if (tenant.name) score += 10; else missing.push("Business name");
  if (tenant.phone_public) score += 5; else missing.push("Public phone number");
  if (hours && Object.keys(hours).length > 0) score += 10; else missing.push("Business hours");
  if (tenant.timezone) score += 5; else missing.push("Timezone");

  // Mode-specific fields
  switch (businessMode) {
    case "service":
      // Services (25 points)
      if (services.length >= 1) score += 15; else missing.push("At least 1 service");
      if (services.length >= 3) score += 10;
      // Booking settings (15 points)
      if (assistantSettings?.booking_url) score += 10; else missing.push("Booking URL");
      if (assistantSettings?.ai_booking_mode) score += 5;
      // Policies (15 points)
      if (tenant.cancellation_policy) score += 5; else missing.push("Cancellation policy");
      if (tenant.deposit_policy) score += 5; else missing.push("Deposit policy");
      if (tenant.payment_methods?.length > 0) score += 5; else missing.push("Payment methods");
      // Intake (10 points)
      if (tenant.context_fields_json?.length > 0) score += 10; else missing.push("Intake questions");
      // FAQs (5 points)
      if (faqs.length >= 3) score += 5; else missing.push("At least 3 FAQs");
      break;

    case "dispatch":
      // Services/job types (20 points)
      if (services.length >= 1) score += 15; else missing.push("At least 1 service/job type");
      if (services.length >= 3) score += 5;
      // Dispatch settings (20 points)
      if (tenant.service_area_json) score += 10; else missing.push("Service area");
      // Intake (15 points)
      if (tenant.context_fields_json?.length > 0) score += 15; else missing.push("Intake questions (location, situation)");
      // Escalation (15 points)
      if (tenant.ai_never_promise?.length > 0) score += 15; else missing.push("AI guardrails/escalation rules");
      break;

    case "food":
      // Menu (35 points)
      if (menuItems.length >= 1) score += 20; else missing.push("Menu items");
      if (menuItems.length >= 10) score += 15;
      // Order delivery (15 points)
      // (checked via handoff settings externally)
      score += 15; // Assume delivery configured if they're using food mode
      // Policies (10 points)
      if (tenant.cancellation_policy) score += 5;
      if (tenant.payment_methods?.length > 0) score += 5; else missing.push("Payment methods");
      // Hours already counted (10 points)
      break;

    case "medical":
      // Intake fields (25 points)
      if (medicalSettings?.intake_fields_json?.length > 0) score += 25; else missing.push("Medical intake fields");
      // Scheduling rules (15 points)
      if (medicalSettings?.scheduling_rules_json) score += 15; else missing.push("Scheduling rules");
      // HIPAA settings (15 points)
      if (medicalSettings?.id) score += 15; else missing.push("HIPAA settings configured");
      // Services (10 points)
      if (services.length >= 1) score += 10; else missing.push("Appointment types");
      break;

    default: // general
      if (services.length >= 1) score += 20;
      if (faqs.length >= 3) score += 15;
      if (tenant.cancellation_policy) score += 10;
      break;
  }

  return { score: Math.min(score, maxScore), missing };
}

function buildNavigationMap(businessMode: string, enabledModules: string[]): NavigationItem[] {
  const baseNav: NavigationItem[] = [
    { path: "/app", label: "Dashboard", enabled: true },
    { path: "/app/inbox", label: "Inbox", enabled: true },
    { path: "/app/calls", label: "Calls", enabled: true },
    { path: "/app/leads", label: "Leads", enabled: true },
    { path: "/app/brain", label: "Business Brain", enabled: true },
    { path: "/app/simulator", label: "Simulator", enabled: true },
    { path: "/app/settings", label: "Settings", enabled: true },
    { path: "/app/usage", label: "Usage", enabled: true },
  ];

  // Mode-specific and module-specific navigation
  const conditionalNav: NavigationItem[] = [
    { 
      path: "/app/bookings", 
      label: "Bookings", 
      enabled: enabledModules.includes("booking") || businessMode === "service" || businessMode === "medical"
    },
    { 
      path: "/app/services", 
      label: "Services", 
      enabled: businessMode === "service" || businessMode === "dispatch" || businessMode === "medical" || businessMode === "general"
    },
    { 
      path: "/app/orders", 
      label: "Orders", 
      enabled: enabledModules.includes("food_orders") || businessMode === "food"
    },
    { 
      path: "/app/menu", 
      label: "Menu Center", 
      enabled: enabledModules.includes("menu_knowledge") || businessMode === "food"
    },
    { 
      path: "/app/reservations", 
      label: "Reservations", 
      enabled: enabledModules.includes("reservations") || businessMode === "food"
    },
    { 
      path: "/app/catering", 
      label: "Catering", 
      enabled: enabledModules.includes("catering") || businessMode === "food"
    },
    { 
      path: "/app/dispatch", 
      label: "Dispatch", 
      enabled: enabledModules.includes("dispatch_queue") || businessMode === "dispatch"
    },
    { 
      path: "/app/medical-intake", 
      label: "Medical Intake", 
      enabled: enabledModules.includes("medical_intake") || businessMode === "medical"
    },
  ];

  return [...baseNav, ...conditionalNav.filter(n => n.enabled)];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    const { tenantId } = await requireAuthedTenant(req);
    const supabase = serviceClient();

    // Fetch all needed data in parallel
    const [
      tenantResult,
      assistantResult,
      servicesResult,
      menuItemsResult,
      faqsResult,
      bookingDeliveryResult,
      orderDeliveryResult,
      dispatchDeliveryResult,
      medicalSettingsResult,
      phoneNumbersResult,
      recentCallsResult,
      recentBookingsResult,
      recentOrdersResult,
      recentDispatchResult,
      knowledgeSourcesResult,
      suggestionsResult,
      conflictsResult,
    ] = await Promise.all([
      supabase.from("tenants").select("*").eq("id", tenantId).single(),
      supabase.from("assistant_settings").select("*").eq("tenant_id", tenantId).single(),
      supabase.from("services").select("*").eq("tenant_id", tenantId).eq("is_active", true),
      supabase.from("menu_items").select("*").eq("tenant_id", tenantId).eq("is_available", true),
      supabase.from("business_faqs").select("*").eq("tenant_id", tenantId),
      supabase.from("booking_delivery_settings").select("*").eq("tenant_id", tenantId).single(),
      supabase.from("order_delivery_settings").select("*").eq("tenant_id", tenantId).single(),
      supabase.from("dispatch_delivery_settings").select("*").eq("tenant_id", tenantId).single(),
      supabase.from("medical_settings").select("*").eq("tenant_id", tenantId).single(),
      supabase.from("phone_numbers").select("*").eq("tenant_id", tenantId).eq("purpose", "forwarding").single(),
      supabase.from("ai_call_sessions").select("id, started_at, outcome, summary").eq("tenant_id", tenantId).order("started_at", { ascending: false }).limit(10),
      supabase.from("bookings").select("id, start_at, status, service_id, services(name)").eq("tenant_id", tenantId).order("start_at", { ascending: false }).limit(10),
      supabase.from("food_orders").select("id, created_at, status, order_number").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(10),
      supabase.from("dispatch_jobs").select("id, created_at, status, job_number, priority").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(10),
      supabase.from("knowledge_sources").select("id, status").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(1),
      supabase.from("extracted_knowledge_suggestions").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "pending_review"),
      supabase.from("knowledge_conflicts").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "unresolved"),
    ]);

    const tenant = tenantResult.data;
    const assistantSettings = assistantResult.data;
    const services = servicesResult.data || [];
    const menuItems = menuItemsResult.data || [];
    const faqs = faqsResult.data || [];
    const bookingDelivery = bookingDeliveryResult.data;
    const orderDelivery = orderDeliveryResult.data;
    const dispatchDelivery = dispatchDeliveryResult.data;
    const medicalSettings = medicalSettingsResult.data;
    const phoneNumber = phoneNumbersResult.data;

    if (!tenant) {
      return errorResponse("Tenant not found", 404);
    }

    const businessMode = tenant.business_mode || "service";
    const enabledModules = tenant.enabled_modules || [];
    const hipaaMode = businessMode === "medical" || tenant.hipaa_mode === true;

    // Compute readiness
    const { score: readinessScore, missing: missingFields } = computeReadinessScore(
      businessMode,
      tenant,
      services,
      menuItems,
      assistantSettings,
      medicalSettings,
      faqs,
      tenant.hours_json
    );

    // Build navigation map
    const navigationMap = buildNavigationMap(businessMode, enabledModules);

    // Parse handoff methods safely
    const parseHandoffMethods = (methods: any): string[] => {
      if (!methods) return [];
      if (Array.isArray(methods)) return methods;
      if (typeof methods === "object") return Object.keys(methods).filter(k => methods[k]);
      return [];
    };

    // Build recent activity (PHI-minimized for medical)
    const recentCalls = (recentCallsResult.data || []).map((c: any) => ({
      id: c.id,
      started_at: c.started_at || "",
      outcome: c.outcome || "unknown",
      summary: hipaaMode ? (c.summary ? "Summary available" : "") : (c.summary || ""),
    }));

    const recentBookings = (recentBookingsResult.data || []).map((b: any) => ({
      id: b.id,
      start_at: b.start_at || "",
      status: b.status || "pending",
      service_name: b.services?.name || "Service",
    }));

    const recentOrders = (recentOrdersResult.data || []).map((o: any) => ({
      id: o.id,
      created_at: o.created_at || "",
      status: o.status || "pending",
      order_number: o.order_number || "",
    }));

    const recentDispatch = (recentDispatchResult.data || []).map((d: any) => ({
      id: d.id,
      created_at: d.created_at || "",
      status: d.status || "pending",
      job_number: d.job_number || "",
      priority: d.priority || "normal",
    }));

    // Build context object
    const copilotContext: CopilotContext = {
      tenant: {
        id: tenant.id,
        business_name: tenant.name || "",
        industry: tenant.industry || "",
        business_mode: businessMode,
        timezone: tenant.timezone || "America/New_York",
      },
      enabled_modules: enabledModules,
      setup: {
        readiness_score: readinessScore,
        missing_critical_fields: missingFields,
      },
      phone: {
        assigned_number: phoneNumber?.phone_e164 || assistantSettings?.closeloop_number || "",
        connect_status: assistantSettings?.connect_status || "not_connected",
        forwarding_phone: assistantSettings?.forwarding_phone_e164 || "",
        last_test_call_at: recentCalls.length > 0 ? recentCalls[0].started_at : "",
        is_connected: assistantSettings?.phone_connected === true,
      },
      handoff: {
        booking: {
          enabled: bookingDelivery?.enabled === true,
          methods: parseHandoffMethods(bookingDelivery?.handoff_methods),
          has_email: !!bookingDelivery?.notify_email,
          has_sms: !!bookingDelivery?.notify_phone,
          has_webhook: !!bookingDelivery?.webhook_url,
        },
        orders: {
          enabled: orderDelivery?.enabled === true,
          methods: parseHandoffMethods(orderDelivery?.handoff_methods),
          has_email: !!orderDelivery?.notify_email,
          has_sms: !!orderDelivery?.notify_phone,
          has_webhook: !!orderDelivery?.webhook_url,
          auto_print: orderDelivery?.auto_print === true,
        },
        dispatch: {
          enabled: dispatchDelivery?.enabled === true,
          methods: parseHandoffMethods(dispatchDelivery?.handoff_methods),
          has_email: !!dispatchDelivery?.notify_email,
          has_sms: !!dispatchDelivery?.notify_phone,
          has_webhook: !!dispatchDelivery?.webhook_url,
          has_urgent_sms: !!dispatchDelivery?.urgent_sms_phone,
        },
      },
      knowledge_status: {
        pending_suggestions_count: suggestionsResult.count || 0,
        unresolved_conflicts_count: conflictsResult.count || 0,
        processing_uploads_count: (knowledgeSourcesResult.data || []).filter((s: any) => s.status === 'processing' || s.status === 'uploading').length,
        last_upload_status: knowledgeSourcesResult.data?.[0]?.status || null,
      },
      navigation_map: navigationMap,
      recent_activity: {
        calls: recentCalls,
        bookings: recentBookings,
        orders: recentOrders,
        dispatch_jobs: recentDispatch,
      },
      hipaa_mode: hipaaMode,
    };

    return jsonResponse({ copilot_context: copilotContext });
  } catch (error) {
    console.error("Error in copilot-context:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
