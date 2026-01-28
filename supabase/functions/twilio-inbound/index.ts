import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to create TwiML response
function twimlResponse(twiml: string): Response {
  return new Response(twiml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml",
    },
  });
}

// Helper to create a polite hangup TwiML
function hangupTwiml(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(message)}</Say>
  <Hangup/>
</Response>`;
}

// Escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Get current day's hours from hours_json
function getTodayHours(hoursJson: Record<string, unknown> | null): string {
  if (!hoursJson) return "Hours not available";
  
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const today = days[new Date().getDay()];
  const todayHours = hoursJson[today] as { open?: string; close?: string; closed?: boolean } | undefined;
  
  if (!todayHours || todayHours.closed) return "Closed today";
  if (todayHours.open && todayHours.close) {
    return `${todayHours.open} - ${todayHours.close}`;
  }
  return "Hours not available";
}

// Truncate text to max length with ellipsis
function truncate(text: string | null, maxLength: number): string | null {
  if (!text) return null;
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

// Build service summary from services array
function buildServiceSummary(services: Array<{ name: string; description?: string | null; price_amount?: number | null; duration_minutes?: number }> | null): string | null {
  if (!services || services.length === 0) return null;
  
  const summaries = services.slice(0, 5).map(s => {
    let line = s.name;
    if (s.price_amount) line += ` ($${s.price_amount})`;
    if (s.duration_minutes) line += ` - ${s.duration_minutes}min`;
    return line;
  });
  
  let result = summaries.join("; ");
  if (services.length > 5) result += `; and ${services.length - 5} more services`;
  
  return truncate(result, 600);
}

// Build menu summary from menu items
function buildMenuSummary(menuItems: Array<{ name: string; category?: string | null; price_cents?: number | null }> | null): string | null {
  if (!menuItems || menuItems.length === 0) return null;
  
  // Group by category
  const byCategory: Record<string, string[]> = {};
  for (const item of menuItems.slice(0, 20)) {
    const cat = item.category || "Menu";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item.name);
  }
  
  const parts = Object.entries(byCategory).map(([cat, items]) => {
    return `${cat}: ${items.slice(0, 4).join(", ")}${items.length > 4 ? "..." : ""}`;
  });
  
  let result = parts.join(". ");
  if (menuItems.length > 20) result += `. Plus ${menuItems.length - 20} more items.`;
  
  return truncate(result, 600);
}

// Build policies summary
function buildPoliciesSummary(tenant: {
  cancellation_policy?: string | null;
  deposit_policy?: string | null;
  refund_policy?: string | null;
  payment_methods?: string[] | null;
}): string | null {
  const parts: string[] = [];
  
  if (tenant.cancellation_policy) {
    parts.push(`Cancellation: ${truncate(tenant.cancellation_policy, 150)}`);
  }
  if (tenant.deposit_policy) {
    parts.push(`Deposit: ${truncate(tenant.deposit_policy, 150)}`);
  }
  if (tenant.payment_methods && tenant.payment_methods.length > 0) {
    parts.push(`Payment: ${tenant.payment_methods.join(", ")}`);
  }
  
  if (parts.length === 0) return null;
  return truncate(parts.join(". "), 600);
}

// Check if module is enabled
function hasModule(enabledModules: string[] | null, moduleName: string): boolean {
  if (!enabledModules) return false;
  return enabledModules.includes(moduleName);
}

// Redact context for HIPAA mode
function redactForHipaa(context: Record<string, unknown>): Record<string, unknown> {
  return {
    tenant_id: context.tenant_id,
    business_mode: context.business_mode,
    enabled_modules: context.enabled_modules,
    hipaa_mode: context.hipaa_mode,
    caller_phone: "[REDACTED]",
    // Keep non-PHI fields
    hours_today: context.hours_today,
    booking_link: context.booking_link,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY_2") || Deno.env.get("ELEVENLABS_API_KEY");
  const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID");

  // Parse Twilio's form data
  let formData: URLSearchParams;
  try {
    const body = await req.text();
    formData = new URLSearchParams(body);
  } catch (error) {
    console.error("Failed to parse request body:", error);
    return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
  }

  const toNumber = formData.get("To") || "";
  const fromNumber = formData.get("From") || "";
  const callSid = formData.get("CallSid") || "";

  console.log(`Inbound call: From=${fromNumber}, To=${toNumber}, CallSid=${callSid}`);

  // Validate required environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase configuration");
    return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
  }

  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
    console.error("Missing ElevenLabs configuration");
    return twimlResponse(hangupTwiml("Our voice assistant is currently unavailable. Please leave a message or try again later."));
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Lookup tenant by the "To" number
    const { data: phoneRecord, error: phoneError } = await supabase
      .from("phone_numbers")
      .select("tenant_id, status")
      .eq("phone_e164", toNumber)
      .maybeSingle();

    if (phoneError) {
      console.error("Database error looking up phone number:", phoneError);
      return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
    }

    if (!phoneRecord) {
      console.error(`No tenant found for number: ${toNumber}`);
      return twimlResponse(hangupTwiml("This number is not currently in service. Please check the number and try again."));
    }

    const tenantId = phoneRecord.tenant_id;
    console.log(`Resolved tenant: ${tenantId}`);

    // Get assistant settings for this tenant
    const { data: settings, error: settingsError } = await supabase
      .from("assistant_settings")
      .select("voice_ai_enabled, voice_mode, connect_status, booking_url")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching assistant settings:", settingsError);
    }

    // Update connect_status to forwarding_verified on first real call
    if (settings?.connect_status !== "forwarding_verified") {
      await supabase
        .from("assistant_settings")
        .update({ connect_status: "forwarding_verified", updated_at: new Date().toISOString() })
        .eq("tenant_id", tenantId);
      console.log(`Updated connect_status to forwarding_verified for tenant ${tenantId}`);
    }

    // Check if voice AI is enabled
    if (settings && settings.voice_ai_enabled === false) {
      console.log(`Voice AI disabled for tenant ${tenantId}`);
      return twimlResponse(hangupTwiml("Thank you for calling. We're currently unavailable. Please try again later or visit our website."));
    }

    // Check voice_mode (implement business logic)
    const voiceMode = settings?.voice_mode || "always_on";
    if (voiceMode === "off") {
      console.log(`Voice mode is off for tenant ${tenantId}`);
      return twimlResponse(hangupTwiml("Thank you for calling. We're currently unavailable. Please try again later."));
    }

    // Fetch all required data in parallel
    const [tenantResult, assistantResult, servicesResult, menuItemsResult] = await Promise.all([
      supabase
        .from("tenants")
        .select("name, tagline, hours_json, website_url, business_mode, enabled_modules, hipaa_mode, cancellation_policy, deposit_policy, refund_policy, payment_methods")
        .eq("id", tenantId)
        .single(),
      supabase
        .from("ai_assistants")
        .select("greeting_script, fallback_script")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      supabase
        .from("services")
        .select("name, description, price_amount, duration_minutes")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .limit(10),
      supabase
        .from("menu_items")
        .select("name, category, price_cents")
        .eq("tenant_id", tenantId)
        .eq("is_available", true)
        .limit(30),
    ]);

    const { data: tenant, error: tenantError } = tenantResult;
    const { data: assistant } = assistantResult;
    const { data: services } = servicesResult;
    const { data: menuItems } = menuItemsResult;

    if (tenantError || !tenant) {
      console.error("Error fetching tenant:", tenantError);
      return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
    }

    // Parse enabled_modules
    const enabledModules: string[] = Array.isArray(tenant.enabled_modules) 
      ? tenant.enabled_modules as string[]
      : [];
    
    const businessMode = tenant.business_mode || "general";
    const hipaaMode = tenant.hipaa_mode === true;

    // Build summaries based on business mode
    let serviceSummary: string | null = null;
    let menuSummary: string | null = null;
    let policiesSummary: string | null = null;

    // Include service_summary for service/dispatch/general modes
    if (["service", "dispatch", "general"].includes(businessMode)) {
      serviceSummary = buildServiceSummary(services);
    }

    // Include menu_summary for food mode
    if (businessMode === "food") {
      menuSummary = buildMenuSummary(menuItems);
    }

    // Build policies summary
    policiesSummary = buildPoliciesSummary(tenant);

    // Determine booking_link based on enabled modules
    let bookingLink: string | null = null;
    if (hasModule(enabledModules, "booking") || hasModule(enabledModules, "reservations")) {
      bookingLink = settings?.booking_url || tenant.website_url || null;
    }

    // Build dynamic variables according to contract
    const hoursToday = getTodayHours(tenant.hours_json as Record<string, unknown> | null);
    
    const dynamicVariables: Record<string, unknown> = {
      // Required fields
      tenant_id: tenantId,
      business_name: tenant.name || "Our Business",
      business_mode: businessMode,
      enabled_modules: enabledModules,
      hipaa_mode: hipaaMode,
      caller_phone: fromNumber,
      hours_today: hoursToday,
      
      // Conditional fields
      booking_link: bookingLink,
      service_summary: serviceSummary,
      menu_summary: menuSummary,
      policies_summary: policiesSummary,
      
      // Scripts from ai_assistants table
      greeting_script: assistant?.greeting_script || "",
      fallback_script: assistant?.fallback_script || "",
    };

    console.log(`Building context for tenant ${tenantId}:`, {
      business_mode: businessMode,
      enabled_modules: enabledModules,
      hipaa_mode: hipaaMode,
      has_service_summary: !!serviceSummary,
      has_menu_summary: !!menuSummary,
      has_policies_summary: !!policiesSummary,
    });

    // Prepare context for storage (redact if HIPAA mode)
    const contextForStorage = hipaaMode 
      ? redactForHipaa(dynamicVariables)
      : dynamicVariables;

    // Create call session record with context
    const { data: callSession, error: sessionError } = await supabase
      .from("ai_call_sessions")
      .insert({
        tenant_id: tenantId,
        call_direction: "inbound",
        twilio_call_sid: callSid,
        caller_phone: fromNumber,
        started_at: new Date().toISOString(),
        context_json: contextForStorage,
      })
      .select("id")
      .single();

    if (sessionError) {
      console.error("Error creating call session:", sessionError);
      // Continue anyway - call tracking is not critical
    } else {
      console.log(`Created call session: ${callSession?.id}`);
    }

    // Call ElevenLabs register-call API
    const registerCallPayload = {
      agent_id: ELEVENLABS_AGENT_ID,
      from_number: fromNumber,
      to_number: toNumber,
      conversation_initiation_client_data: {
        dynamic_variables: dynamicVariables,
      },
    };
    
    console.log("Sending to ElevenLabs:", JSON.stringify(registerCallPayload, null, 2));
    
    const registerCallResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/twilio/register-call`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerCallPayload),
      }
    );

    if (!registerCallResponse.ok) {
      const errorText = await registerCallResponse.text();
      console.error(`ElevenLabs register-call failed [${registerCallResponse.status}]:`, errorText);
      return twimlResponse(hangupTwiml("Our voice assistant is temporarily unavailable. Please try again later."));
    }

    // ElevenLabs returns TwiML directly
    const twimlFromElevenLabs = await registerCallResponse.text();
    console.log(`ElevenLabs returned TwiML (${twimlFromElevenLabs.length} chars)`);

    return new Response(twimlFromElevenLabs, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });

  } catch (error) {
    console.error("Error handling inbound call:", error);
    return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
  }
});
