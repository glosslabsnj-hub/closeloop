// DEPLOYMENT TIMESTAMP: 2026-02-02T12:00:00Z - CONTRACT-WIREUP
// If you see this comment, the new version is deployed
import { serve } from "https://deno.land/std@0.191.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildBusinessContext,
  storeContextSnapshot,
  buildDynamicVariables
} from "../_shared/buildBusinessContext.ts";
import { getAllVariableKeys } from "../_shared/voiceContextContract.ts";

// Convert all dynamic variable values to strings (ElevenLabs requires string-only)
function toStringOnlyVars(vars: Record<string, string | number | boolean>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(vars)) {
    if (value === null || value === undefined) {
      result[key] = "";
    } else if (typeof value === "boolean") {
      result[key] = value ? "true" : "false";
    } else if (typeof value === "number") {
      result[key] = String(value);
    } else {
      result[key] = String(value);
    }
  }
  return result;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // VERSION STAMP - This proves new code is deployed
  console.log("🚀 [ElevenLabs Token] DYNAMIC-VARS-FIX - Deployment: 2026-02-01T21:00:00Z");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use global agent ID from environment - shared across all tenants
    const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID");
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY_2") || Deno.env.get("ELEVENLABS_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!ELEVENLABS_AGENT_ID) {
      console.error("ELEVENLABS_AGENT_ID not configured");
      return new Response(
        JSON.stringify({ error: "ElevenLabs Agent ID not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!ELEVENLABS_API_KEY) {
      console.error("ELEVENLABS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "ElevenLabs API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log every endpoint hit for debugging (no PII)
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabaseForLog = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabaseForLog.from("ai_event_logs").insert({
          tenant_id: null,
          stage: "voice_endpoint_hit",
          event_data: {
            endpoint: "elevenlabs-conversation-token",
            timestamp: new Date().toISOString(),
          },
        });
      } catch (logError) {
        console.error("[elevenlabs-token] Failed to log endpoint hit:", logError);
      }
    }

    // Parse request body to get tenantId, locationId, and connectionType
    let tenantId: string | null = null;
    let locationId: string | null = null;
    let connectionType: "webrtc" | "websocket" = "webrtc"; // Default to WebRTC
    let resolutionSource: "explicit" | "lookup_failed" = "lookup_failed";

    try {
      const body = await req.json();
      tenantId = body.tenantId;
      locationId = body.locationId || null;
      connectionType = body.connectionType || "webrtc";

      if (tenantId) {
        resolutionSource = "explicit";
      }
    } catch {
      // No body or invalid JSON - continue without tenant context
    }

    // CRITICAL: Require explicit tenant_id - no fallbacks allowed
    if (!tenantId) {
      console.error("[elevenlabs-token] Missing tenant_id - no fallback allowed");
      
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const supabaseForLog = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          await supabaseForLog.from("ai_event_logs").insert({
            tenant_id: null,
            stage: "voice_tenant_missing",
            error_message: "tenant_id required for voice session",
            event_data: {
              endpoint: "elevenlabs-conversation-token",
              connection_type: connectionType,
            },
          });
        } catch (logError) {
          console.error("[elevenlabs-token] Failed to log missing tenant:", logError);
        }
      }

      return new Response(
        JSON.stringify({
          error: "tenant_id required for voice session",
          _debug: {
            endpoint: "elevenlabs-conversation-token",
            reason: "no_tenant_id_provided",
          },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate tenantId exists in database
    let tenantValidated = false;
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseForValidation = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      try {
        const { data: tenant, error } = await supabaseForValidation
          .from("tenants")
          .select("id, name")
          .eq("id", tenantId)
          .maybeSingle();

        if (error || !tenant) {
          console.error(`[elevenlabs-token] Invalid tenantId: ${tenantId}`);
          return new Response(
            JSON.stringify({
              error: "Invalid tenant_id - tenant not found",
              _debug: {
                endpoint: "elevenlabs-conversation-token",
                tenant_id: tenantId,
              },
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        tenantValidated = true;
        console.log(`[elevenlabs-token] Validated tenant: ${tenant.name} (${tenantId})`);

        // Log tenant resolution for browser tests (HIPAA-safe)
        await supabaseForValidation.from("ai_event_logs").insert({
          tenant_id: tenantId,
          stage: "voice_tenant_resolved",
          event_data: {
            tenant_id: tenantId,
            tenant_name: tenant.name,
            source: resolutionSource,
            has_location_id: !!locationId,
            channel: "browser_test",
            connection_type: connectionType,
          },
        });
      } catch (validationError) {
        console.error("[elevenlabs-token] Tenant validation failed:", validationError);
        return new Response(
          JSON.stringify({
            error: "Tenant validation failed",
            _debug: { endpoint: "elevenlabs-conversation-token" },
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Initialize dynamic variables with safe defaults (all strings for ElevenLabs)
    let dynamicVariables: Record<string, string | number | boolean> = {
      business_name: "our business",
      businessname: "our business", // Alias for ElevenLabs compatibility
      business_mode: "general",
      enabled_modules: "",
      hipaa_mode: "false",
      timezone: "America/New_York",
      caller_phone: "browser_test",
      customer_id: "",
      hours_today: "Hours not available",
      calendar_connected: "false",
      booking_link: "",
      service_summary: "",
      services_pricing: "No services configured yet.",
      menu_summary: "",
      policies_summary: "",
      faqs_summary: "",
      greeting_script: "",
      fallback_script: "",
      tone: "friendly",
      intent_rules_summary: "",
      memory_hints_summary: "",
      memory_enabled: "false",
      tenant_id: "",
      location_id: "",
      // Speech-ready summaries (empty when not available - never invent)
      location_summary: "",
      service_area_summary: "",
      out_of_area_message: "",
      business_address: "",
      // Debug routing vars (spoken only when caller says "debug routing")
      debug_tenant_id: tenantId || "",
      debug_tenant_source: resolutionSource,
      debug_tenant_endpoint: "elevenlabs-conversation-token",
      debug_tenant_field: tenantId ? "tenantId" : "none",
      // Contract meta fields (for deploy verification)
      business_brain_json_compact: "",
      business_brain_json_hash: "",
      business_brain_json_truncated: "false",
      context_contract_version: "v1",
      dynamic_variables_keys: getAllVariableKeys().join(","),
    };

    // If tenantId provided, build FULL business context using canonical builder
    let systemPrompt = "";
    let precomputedSlots: string[] = [];
    
    if (tenantId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const sessionId = `browser_test_${Date.now()}`;

        console.log(`Building full business context for browser test: tenant=${tenantId}, location=${locationId}`);

        // Use the SAME canonical builder that twilio-inbound uses
        const { context, systemPrompt: prompt } = await buildBusinessContext(supabase, {
          tenantId,
          locationId,
          customerId: null,
          channel: "browser_test",
          sessionId,
          callerPhone: null,
          includeIntelligence: true,
        });

        systemPrompt = prompt;

        // Store snapshot for debugging (viewable at /debug/ai-context)
        await storeContextSnapshot(supabase, context);

        // Build flattened dynamic variables using shared helper
        dynamicVariables = buildDynamicVariables(context, "browser_test", null);

        // Re-add debug routing vars after buildDynamicVariables overwrites
        dynamicVariables.debug_tenant_id = tenantId || "";
        dynamicVariables.debug_tenant_source = resolutionSource;
        dynamicVariables.debug_tenant_endpoint = "elevenlabs-conversation-token";
        dynamicVariables.debug_tenant_field = "tenantId";

        // Precompute tomorrow's slots for strict enforcement
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];
        
        const { data: tenantHours } = await supabase
          .from("tenants")
          .select("hours_json")
          .eq("id", tenantId)
          .single();
        
        const { data: slots } = await supabase.rpc("fn_compute_available_slots", {
          _tenant_id: tenantId,
          _start_date: tomorrowStr,
          _end_date: tomorrowStr,
          _duration_minutes: 60,
          _buffer_minutes: 15,
          _business_hours: tenantHours?.hours_json || null,
        });
        
        if (slots && Array.isArray(slots)) {
          precomputedSlots = slots.slice(0, 6).map((s: { slot_time_local: string }) => s.slot_time_local);
        }
        
        // Log comprehensive context summary for debugging
        console.log("Browser test context built successfully:", {
          tenant_id: tenantId,
          business_name: context.tenant.business_name,
          business_mode: context.tenant.business_mode,
          hours_today: context.tenant.hours_today,
          services_count: context.offerings.services.length,
          precomputed_slots: precomputedSlots.length,
          missing_sections: context._meta.missing_sections,
        });
      } catch (dbError) {
        console.error("Error building business context for browser test:", dbError);
        // Continue with defaults if context build fails
      }
    } else {
      console.log("No tenantId provided for browser test - using minimal defaults");
    }

    const DEPLOYED_VERSION = "2026-02-02T12:00:00Z";

    // Log deployment version for verification
    console.log(`✅ ELEV_TOKEN_VERSION=${DEPLOYED_VERSION} | MODE=${connectionType} | VARS=${Object.keys(dynamicVariables).length}`);

    // DUAL PATH: WebRTC (default) or WebSocket
    if (connectionType === "webrtc") {
      // WebRTC PATH: fetch a short-lived conversation token.
      // IMPORTANT: Do NOT POST to the WebSocket conversation endpoint.
      console.log("Getting WebRTC conversation token for agent:", {
        agent_id: ELEVENLABS_AGENT_ID,
        tenantId,
        flow: "webrtc-token",
      });

      const tokenResponse = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${ELEVENLABS_AGENT_ID}`,
        {
          method: "GET",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
          },
        }
      );

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("ElevenLabs conversation token error:", tokenResponse.status, errorText);
        return new Response(
          JSON.stringify({ error: "Failed to get conversation token", details: errorText }),
          { status: tokenResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokenData = await tokenResponse.json().catch(() => ({} as any));
      const token = (tokenData as any)?.token as string | undefined;

      if (!token) {
        console.error("ElevenLabs conversation token missing in response", tokenData);
        return new Response(
          JSON.stringify({ error: "Conversation token missing from ElevenLabs response" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("WebRTC token received:", { tokenPrefix: token.slice(0, 12) });

      // Convert all values to strings for ElevenLabs compatibility
      const stringOnlyVars = toStringOnlyVars(dynamicVariables);

      return new Response(
        JSON.stringify({
          token,
          dynamicVariables: stringOnlyVars,
          precomputedSlots: precomputedSlots,
          deployedVersion: DEPLOYED_VERSION,
          connectionType: "webrtc",
          _debug: {
            deployedVersion: DEPLOYED_VERSION,
            flow: "webrtc-token",
            agentId: ELEVENLABS_AGENT_ID,
            tokenPrefix: token.slice(0, 12),
            denoStdVersion: "0.191.0",
            dynamicVarsCount: Object.keys(stringOnlyVars).length,
            hasContractFields: Boolean(stringOnlyVars.dynamic_variables_keys && stringOnlyVars.business_brain_json_hash),
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // WEBSOCKET PATH: Get signed URL directly (original flow)
      console.log("Getting WebSocket signed URL directly for agent:", {
        agent_id: ELEVENLABS_AGENT_ID,
        tenantId,
        flow: "websocket-signed-url",
      });

      const signedUrlResponse = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${ELEVENLABS_AGENT_ID}`,
        {
          method: "GET",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
          },
        }
      );

      if (!signedUrlResponse.ok) {
        const errorText = await signedUrlResponse.text();
        console.error("ElevenLabs signed URL error:", signedUrlResponse.status, errorText);
        return new Response(
          JSON.stringify({ error: "Failed to get signed URL", details: errorText }),
          { status: signedUrlResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const signedUrlData = await signedUrlResponse.json();

      // Convert all values to strings for ElevenLabs compatibility
      const stringOnlyVarsWs = toStringOnlyVars(dynamicVariables);

      return new Response(
        JSON.stringify({
          signedUrl: signedUrlData.signed_url,
          dynamicVariables: stringOnlyVarsWs,
          precomputedSlots: precomputedSlots,
          deployedVersion: DEPLOYED_VERSION,
          connectionType: "websocket",
          _debug: {
            deployedVersion: DEPLOYED_VERSION,
            flow: "websocket-signed-url",
            agentId: ELEVENLABS_AGENT_ID,
            denoStdVersion: "0.191.0",
            dynamicVarsCount: Object.keys(stringOnlyVarsWs).length,
            hasContractFields: Boolean(stringOnlyVarsWs.dynamic_variables_keys && stringOnlyVarsWs.business_brain_json_hash),
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in elevenlabs-conversation-token:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
