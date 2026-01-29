/**
 * GET-BUSINESS-CONTEXT
 * Debug endpoint to inspect what context the AI will receive for a given tenant.
 * Uses the canonical buildBusinessContext() to ensure consistency with voice/SMS channels.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  buildBusinessContext, 
  storeContextSnapshot, 
  buildDynamicVariables,
  type BusinessContext 
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
    const { tenantId, locationId, customerId, includeIntelligence = true, storeSnapshot = true } = await req.json();
    
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "Tenant ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use the canonical context builder (same as twilio-inbound and elevenlabs-conversation-token)
    const sessionId = `debug_${Date.now()}`;
    const { context, systemPrompt } = await buildBusinessContext(supabase, {
      tenantId,
      locationId: locationId || null,
      customerId: customerId || null,
      channel: "browser_test",
      sessionId,
      callerPhone: null,
      includeIntelligence,
    });

    // Store snapshot for debugging (if requested)
    if (storeSnapshot) {
      await storeContextSnapshot(supabase, context);
    }

    // Build dynamic variables (what ElevenLabs receives)
    const dynamicVariables = buildDynamicVariables(context, "", customerId || null);

    // Log context summary for debugging
    console.log(`Context built for tenant ${tenantId}:`, {
      business_name: context.tenant.business_name,
      business_mode: context.tenant.business_mode,
      hours_today: context.tenant.hours_today,
      services_count: context.offerings.services.length,
      menu_count: context.offerings.menu.length,
      faqs_count: context.knowledge.faqs.length,
      has_policies: !!context.policies.cancellation,
      missing_sections: context._meta.missing_sections,
    });

    return new Response(
      JSON.stringify({ 
        context, 
        systemPrompt,
        dynamicVariables,
        // Summary for quick verification
        summary: {
          business_name: context.tenant.business_name,
          business_mode: context.tenant.business_mode,
          hours_today: context.tenant.hours_today,
          services_count: context.offerings.services.length,
          menu_count: context.offerings.menu.length,
          menu_summary_preview: context.offerings.menu_summary.slice(0, 200),
          faqs_count: context.knowledge.faqs.length,
          missing_sections: context._meta.missing_sections,
          context_has_hours: dynamicVariables.context_has_hours,
          context_has_menu: dynamicVariables.context_has_menu,
          context_has_services: dynamicVariables.context_has_services,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-business-context:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
