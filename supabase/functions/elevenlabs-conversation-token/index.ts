import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    // Parse request body to get tenantId
    let tenantId: string | null = null;
    try {
      const body = await req.json();
      tenantId = body.tenantId;
    } catch {
      // No body or invalid JSON - continue without tenant context
    }

    // Initialize dynamic variables with defaults
    let dynamicVariables: Record<string, string> = {
      business_name: "our business",
      business_hours_today: "our regular hours",
      booking_link: "",
      tenant_id: "",
      caller_number: "browser_test",
    };

    // If tenantId provided, fetch business context from database
    if (tenantId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Fetch tenant info and AI assistant settings in parallel
        const [tenantResult, settingsResult, assistantResult] = await Promise.all([
          supabase
            .from("tenants")
            .select("name, hours_json, website_url")
            .eq("id", tenantId)
            .single(),
          supabase
            .from("assistant_settings")
            .select("booking_url")
            .eq("tenant_id", tenantId)
            .maybeSingle(),
          supabase
            .from("ai_assistants")
            .select("greeting_script, fallback_script")
            .eq("tenant_id", tenantId)
            .maybeSingle(),
        ]);

        const { data: tenant, error: tenantError } = tenantResult;
        const { data: settings } = settingsResult;
        const { data: assistant } = assistantResult;

        if (tenantError) {
          console.error("Error fetching tenant:", tenantError);
        } else if (tenant) {

          const businessHoursToday = getTodayHours(tenant.hours_json as Record<string, unknown> | null);
          
          dynamicVariables = {
            business_name: tenant.name || "our business",
            business_hours_today: businessHoursToday,
            booking_link: settings?.booking_url || tenant.website_url || "",
            greeting_script: assistant?.greeting_script || "",
            fallback_script: assistant?.fallback_script || "",
            tenant_id: tenantId,
            caller_number: "browser_test",
          };
          
          console.log("Injecting business context for browser test:", dynamicVariables);
        }
      } catch (dbError) {
        console.error("Database error fetching tenant context:", dbError);
        // Continue with defaults if DB fetch fails
      }
    }

    // Get a conversation token for WebRTC connection
    // Use the conversation/get-signed-url endpoint which supports overrides
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

    // Return the signed URL along with dynamic variables for the client to use
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
