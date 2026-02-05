// SAFE MODE - Minimal twilio-inbound to restore service
// v3.0.0 - Stripped imports to fix bundle timeout

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function twimlResponse(twiml: string): Response {
  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function hangupTwiml(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(message)}</Say>
  <Hangup/>
</Response>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY_2") || Deno.env.get("ELEVENLABS_API_KEY");
  const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID_DISPATCH") || Deno.env.get("ELEVENLABS_AGENT_ID");

  // Parse Twilio form data
  let fromNumber = "";
  let toNumber = "";

  try {
    const body = await req.text();
    const formData = new URLSearchParams(body);
    toNumber = formData.get("To") || "";
    fromNumber = formData.get("From") || "";
    console.log(`[twilio-inbound] Call from ${fromNumber} to ${toNumber}`);
  } catch (error) {
    console.error("[twilio-inbound] Failed to parse request:", error);
    return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
  }

  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
    console.error("[twilio-inbound] Missing ElevenLabs config");
    return twimlResponse(hangupTwiml("Our voice assistant is currently unavailable. Please try again later."));
  }

  try {
    // Register call with ElevenLabs
    const registerResponse = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/register-call",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: ELEVENLABS_AGENT_ID,
          from_number: fromNumber,
          to_number: toNumber,
        }),
      }
    );

    if (!registerResponse.ok) {
      const errorText = await registerResponse.text();
      console.error(`[twilio-inbound] ElevenLabs error [${registerResponse.status}]:`, errorText);
      return twimlResponse(hangupTwiml("Our voice assistant is temporarily unavailable. Please try again later."));
    }

    const twiml = await registerResponse.text();
    console.log(`[twilio-inbound] ElevenLabs returned TwiML (${twiml.length} chars)`);
    
    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });

  } catch (error) {
    console.error("[twilio-inbound] Error:", error);
    return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
  }
});
