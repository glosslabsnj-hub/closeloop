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
      .select("voice_ai_enabled, voice_mode, connect_status")
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

    // TODO: Implement busy_mode and after_hours logic based on hours_json

    // Get tenant business context for ElevenLabs
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("name, tagline, hours_json, website_url")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error("Error fetching tenant:", tenantError);
      return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
    }

    // Get booking URL from assistant settings
    const { data: fullSettings } = await supabase
      .from("assistant_settings")
      .select("booking_url")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    // Build dynamic variables for ElevenLabs agent
    const businessHoursToday = getTodayHours(tenant.hours_json as Record<string, unknown> | null);
    const dynamicVariables = {
      business_name: tenant.name || "Our Business",
      business_hours_today: businessHoursToday,
      booking_link: fullSettings?.booking_url || tenant.website_url || "",
      tenant_id: tenantId,
      caller_number: fromNumber,
    };

    console.log(`Calling ElevenLabs register-call for agent ${ELEVENLABS_AGENT_ID} with context:`, dynamicVariables);

    // Create call session record
    const { data: callSession, error: sessionError } = await supabase
      .from("ai_call_sessions")
      .insert({
        tenant_id: tenantId,
        call_direction: "inbound",
        twilio_call_sid: callSid,
        caller_phone: fromNumber,
        started_at: new Date().toISOString(),
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
    // Documentation: https://elevenlabs.io/docs/conversational-ai/guides/twilio-integration
    const registerCallPayload = {
      agent_id: ELEVENLABS_AGENT_ID,
      from_number: fromNumber,  // The caller's phone number
      to_number: toNumber,      // The Twilio number that received the call
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

    // Update call session with ElevenLabs conversation ID if available in response
    // The TwiML might contain it as a parameter

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
