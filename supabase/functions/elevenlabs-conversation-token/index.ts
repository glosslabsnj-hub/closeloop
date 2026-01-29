import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

    // Parse request body to get tenantId and optional locationId
    let tenantId: string | null = null;
    let locationId: string | null = null;
    
    try {
      const body = await req.json();
      tenantId = body.tenantId;
      locationId = body.locationId || null;
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
    if (tenantId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const sessionId = `browser_test_${Date.now()}`;

        console.log(`Building full business context for browser test: tenant=${tenantId}, location=${locationId}`);

        // Use the SAME canonical builder that twilio-inbound uses
        const { context } = await buildBusinessContext(supabase, {
          tenantId,
          locationId,
          customerId: null,
          channel: "browser_test",
          sessionId,
          callerPhone: null,
          includeIntelligence: true,
        });

        // Store snapshot for debugging (viewable at /debug/ai-context)
        await storeContextSnapshot(supabase, context);

        // Build flattened dynamic variables using shared helper
        dynamicVariables = buildDynamicVariables(context, "browser_test", null);
        
        // Log comprehensive context summary for debugging
        console.log("Browser test context built successfully:", {
          tenant_id: tenantId,
          business_name: context.tenant.business_name,
          business_mode: context.tenant.business_mode,
          hours_today: context.tenant.hours_today,
          services_count: context.offerings.services.length,
          has_services_pricing: !!context.offerings.services_for_prompt && context.offerings.services_for_prompt !== "No services configured yet.",
          menu_count: context.offerings.menu.length,
          has_menu_summary: !!context.offerings.menu_summary,
          faqs_count: context.knowledge.faqs.length,
          objections_count: context.knowledge.objections.length,
          has_policies: !!context.policies.cancellation || !!context.policies.deposit,
          intent_rules_count: context.intelligence.intent_rules.length,
          memory_hints_count: context.intelligence.memory_hints.length,
          missing_sections: context._meta.missing_sections,
        });
      } catch (dbError) {
        console.error("Error building business context for browser test:", dbError);
        // Continue with defaults if context build fails
      }
    } else {
      console.log("No tenantId provided for browser test - using minimal defaults");
    }

    // Get a signed URL for WebRTC connection from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${ELEVENLABS_AGENT_ID}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to get conversation token", details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // Return the signed URL along with dynamic variables for the client to inject
    return new Response(
      JSON.stringify({ 
        signedUrl: data.signed_url,
        dynamicVariables: dynamicVariables
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in elevenlabs-conversation-token:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
