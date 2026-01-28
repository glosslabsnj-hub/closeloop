import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { tenantId, phoneNumber, agentId } = await req.json();
    
    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // In production, this would integrate with Twilio to place an outbound call
    // connecting the user's phone to the ElevenLabs agent
    
    // For now, return mock response indicating the call would be placed
    console.log(`Mock: Would call ${phoneNumber} for tenant ${tenantId} with agent ${agentId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Test call initiated (mock mode)",
        phoneNumber,
        agentId,
        // In production, this would include:
        // callSid: "CA...",
        // status: "queued"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in test-call-phone:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
