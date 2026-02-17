/**
 * elevenlabs-search-referral-network: ElevenLabs tool proxy for the referral network search.
 *
 * Thin proxy following the same pattern as elevenlabs-check-service-area:
 * - Parses ElevenLabs tool request (handles nested `params`)
 * - Resolves tenant_id from params or conversation_id lookup
 * - Calls internal search-referral-network with x-closeloop-secret
 * - Returns speech-ready JSON for the AI
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ElevenLabsToolRequest {
  caller_location?: string;
  service_needed?: string;
  reason?: string;
  urgency?: string;
  caller_name?: string;
  caller_phone?: string;
  tenant_id?: string;
  conversation_id?: string;
  params?: {
    caller_location?: string;
    service_needed?: string;
    reason?: string;
    urgency?: string;
    caller_name?: string;
    caller_phone?: string;
    tenant_id?: string;
    conversation_id?: string;
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ElevenLabsToolRequest = await req.json();
    console.log("[elevenlabs-search-referral-network] Request:", JSON.stringify(body));

    // Handle nested params from ElevenLabs
    const callerLocation = body.caller_location || body.params?.caller_location || "";
    const serviceNeeded = body.service_needed || body.params?.service_needed || "";
    const reason = body.reason || body.params?.reason || "service_not_offered";
    const urgency = body.urgency || body.params?.urgency || "normal";
    const callerName = body.caller_name || body.params?.caller_name || "";
    const callerPhone = body.caller_phone || body.params?.caller_phone || "";
    const directTenantId = body.tenant_id || body.params?.tenant_id || "";
    const conversationId = body.conversation_id || body.params?.conversation_id || "";

    if (!callerLocation || !serviceNeeded) {
      return new Response(
        JSON.stringify({
          found: false,
          message: "I need to know what service you need and your location to check for someone nearby.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve tenant_id
    let tenantId = directTenantId;
    let sessionId: string | null = null;
    let twilioCallSid: string | null = null;

    if (!tenantId && conversationId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceKey);

      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id, id, twilio_call_sid")
        .eq("elevenlabs_conversation_id", conversationId)
        .maybeSingle();

      if (session) {
        tenantId = session.tenant_id;
        sessionId = session.id;
        twilioCallSid = session.twilio_call_sid;
      }
    }

    if (!tenantId) {
      return new Response(
        JSON.stringify({
          found: false,
          message: "I'm having trouble looking that up right now. Can I take your info instead?",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call internal search-referral-network
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const internalSecret = Deno.env.get("CLOSELOOP_INTERNAL_SECRET");

    const searchRes = await fetch(`${supabaseUrl}/functions/v1/search-referral-network`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-closeloop-secret": internalSecret || "",
      },
      body: JSON.stringify({
        source_tenant_id: tenantId,
        caller_location: callerLocation,
        service_needed: serviceNeeded,
        reason,
        urgency,
        caller_name: callerName,
        caller_phone_e164: callerPhone,
        source_session_id: sessionId,
        twilio_call_sid: twilioCallSid,
      }),
    });

    const result = await searchRes.json();

    console.log(
      `[elevenlabs-search-referral-network] Result: found=${result.found}, ` +
        `name=${result.business_name || "none"}, score=${result.total_score || 0}`
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[elevenlabs-search-referral-network] Error:", error);
    return new Response(
      JSON.stringify({
        found: false,
        message: "I had trouble checking right now. Can I take your info and have someone follow up?",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
