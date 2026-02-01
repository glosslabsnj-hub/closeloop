// DEPLOYMENT TIMESTAMP: 2026-02-01T20:15:00Z - WEBRTC-ENABLED
// If you see this comment, the new version is deployed
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildBusinessContext,
  storeContextSnapshot,
  buildDynamicVariables
} from "../_shared/buildBusinessContext.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // VERSION STAMP - This proves new code is deployed
  console.log("🚀 [ElevenLabs Token] WEBRTC-ENABLED - Deployment: 2026-02-01T20:15:00Z");

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

    // Parse request body to get tenantId, locationId, and connectionType
    let tenantId: string | null = null;
    let locationId: string | null = null;
    let connectionType: "webrtc" | "websocket" = "webrtc"; // Default to WebRTC

    try {
      const body = await req.json();
      tenantId = body.tenantId;
      locationId = body.locationId || null;
      connectionType = body.connectionType || "webrtc";
    } catch {
      // No body or invalid JSON - continue without tenant context
    }

    // Initialize dynamic variables with safe defaults
    let dynamicVariables: Record<string, string | number | boolean> = {
      business_name: "our business",
      business_mode: "general",
      enabled_modules: "",
      hipaa_mode: false,
      timezone: "America/New_York",
      caller_phone: "browser_test",
      customer_id: "",
      hours_today: "Hours not available",
      calendar_connected: false,
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
      memory_enabled: false,
      tenant_id: "",
      location_id: "",
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

    const DEPLOYED_VERSION = "2026-02-01T20:15:00Z";

    // Log deployment version for verification
    console.log(`✅ ELEV_TOKEN_VERSION=${DEPLOYED_VERSION} | MODE=${connectionType}`);

    // DUAL PATH: WebRTC (default) or WebSocket
    if (connectionType === "webrtc") {
      // WebRTC PATH: Create conversation with dynamic variables, returns conversationId
      console.log("Creating WebRTC conversation with agent:", {
        agent_id: ELEVENLABS_AGENT_ID,
        tenantId,
        flow: "webrtc-conversation",
      });

      const conversationResponse = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation?agent_id=${ELEVENLABS_AGENT_ID}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // Pass dynamic variables directly in conversation creation
            // ElevenLabs will inject these into the agent's context
          }),
        }
      );

      if (!conversationResponse.ok) {
        const errorText = await conversationResponse.text();
        console.error("ElevenLabs conversation creation error:", conversationResponse.status, errorText);
        return new Response(
          JSON.stringify({ error: "Failed to create conversation", details: errorText }),
          { status: conversationResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const conversationData = await conversationResponse.json();
      const conversationId = conversationData.conversation_id;

      console.log("WebRTC conversation created:", { conversationId });

      return new Response(
        JSON.stringify({
          conversationId: conversationId,
          dynamicVariables: dynamicVariables,
          precomputedSlots: precomputedSlots,
          deployedVersion: DEPLOYED_VERSION,
          connectionType: "webrtc",
          _debug: {
            deployedVersion: DEPLOYED_VERSION,
            flow: "webrtc-conversation",
            agentId: ELEVENLABS_AGENT_ID,
            conversationId: conversationId,
            denoStdVersion: "0.190.0",
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

      return new Response(
        JSON.stringify({
          signedUrl: signedUrlData.signed_url,
          dynamicVariables: dynamicVariables,
          precomputedSlots: precomputedSlots,
          deployedVersion: DEPLOYED_VERSION,
          connectionType: "websocket",
          _debug: {
            deployedVersion: DEPLOYED_VERSION,
            flow: "websocket-signed-url",
            agentId: ELEVENLABS_AGENT_ID,
            denoStdVersion: "0.190.0",
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
