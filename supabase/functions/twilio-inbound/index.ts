// v3.2.0 - Added IVR routing for dispatch businesses
// Lightweight version to avoid bundle timeout

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

// IVR menu TwiML - asks caller to press 1 or 2
function ivrGatherTwiml(businessName: string, webhookUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${escapeXml(webhookUrl)}" method="POST" timeout="5">
    <Say voice="Polly.Joanna">Thanks for calling ${escapeXml(businessName)}. Press 1 for towing and roadside assistance, or press 2 to check on an impounded vehicle.</Say>
  </Gather>
  <Say voice="Polly.Joanna">We didn't receive your selection. Connecting you to dispatch.</Say>
</Response>`;
}

function normalizeToE164(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (phone.startsWith("+")) return phone;
  return digits.length > 0 ? `+${digits}` : "";
}

// Inline Supabase client creation (avoid esm.sh import issues)
async function querySupabase(url: string, key: string, table: string, query: Record<string, string>): Promise<any[]> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    params.append(k, `eq.${v}`);
  }
  params.append("limit", "1");
  
  const response = await fetch(`${url}/rest/v1/${table}?${params.toString()}`, {
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  });
  
  if (!response.ok) {
    console.error(`[querySupabase] ${table} query failed:`, response.status);
    return [];
  }
  
  return await response.json();
}

async function updateSupabase(url: string, key: string, table: string, match: Record<string, string>, data: Record<string, any>): Promise<boolean> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(match)) {
    params.append(k, `eq.${v}`);
  }
  
  const response = await fetch(`${url}/rest/v1/${table}?${params.toString()}`, {
    method: "PATCH",
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(data),
  });
  
  return response.ok;
}

// Get agent ID based on business mode and IVR selection
function getAgentIdForMode(mode: string, ivrSelection?: string): string | null {
  // Handle IVR selection for dispatch mode
  if (ivrSelection === "2") {
    // User pressed 2 for impound
    const impoundAgentId = Deno.env.get("ELEVENLABS_AGENT_ID_IMPOUND");
    if (impoundAgentId) {
      console.log(`[getAgentIdForMode] IVR selection=2, using impound agent`);
      return impoundAgentId;
    }
  }
  
  const modeEnvMap: Record<string, string> = {
    service: "ELEVENLABS_AGENT_ID_SERVICE",
    dispatch: "ELEVENLABS_AGENT_ID_DISPATCH",
    food: "ELEVENLABS_AGENT_ID_FOOD",
    medical: "ELEVENLABS_AGENT_ID_MEDICAL",
    general: "ELEVENLABS_AGENT_ID_GENERAL",
  };
  
  const envKey = modeEnvMap[mode] || modeEnvMap.general;
  const agentId = Deno.env.get(envKey) || Deno.env.get("ELEVENLABS_AGENT_ID");
  
  console.log(`[getAgentIdForMode] mode=${mode}, ivrSelection=${ivrSelection}, envKey=${envKey}, found=${!!agentId}`);
  return agentId || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY_2") || Deno.env.get("ELEVENLABS_API_KEY");

  // Parse Twilio form data
  let fromNumber = "";
  let toNumber = "";
  let callSid = "";
  let digits = ""; // DTMF digits from IVR selection

  try {
    const body = await req.text();
    const formData = new URLSearchParams(body);
    toNumber = formData.get("To") || "";
    fromNumber = formData.get("From") || "";
    callSid = formData.get("CallSid") || "";
    digits = formData.get("Digits") || ""; // Capture IVR selection
    console.log(`[twilio-inbound] Call from ${fromNumber} to ${toNumber}, CallSid=${callSid}, Digits=${digits}`);
  } catch (error) {
    console.error("[twilio-inbound] Failed to parse request:", error);
    return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[twilio-inbound] Missing Supabase config");
    return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
  }

  if (!ELEVENLABS_API_KEY) {
    console.error("[twilio-inbound] Missing ElevenLabs API key");
    return twimlResponse(hangupTwiml("Our voice assistant is currently unavailable. Please try again later."));
  }

  const callerPhoneE164 = normalizeToE164(fromNumber);

  try {
    // Step 1: Lookup phone number -> tenant
    const phoneRecords = await querySupabase(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, "phone_numbers", {
      phone_e164: toNumber,
    });

    if (!phoneRecords.length) {
      console.error(`[twilio-inbound] No tenant for number: ${toNumber}`);
      return twimlResponse(hangupTwiml("This number is not currently in service. Please check the number and try again."));
    }

    const phoneRecord = phoneRecords[0];
    let tenantId = phoneRecord.tenant_id;
    const isAdminTestLine = phoneRecord.is_admin_test_line;

    // Step 2: Admin test line routing
    if (isAdminTestLine && callerPhoneE164) {
      console.log("[twilio-inbound] Admin test line, checking caller");
      const adminRecords = await querySupabase(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, "admin_settings", {
        admin_phone_e164: callerPhoneE164,
      });
      
      if (adminRecords.length && adminRecords[0].admin_active_tenant_id) {
        tenantId = adminRecords[0].admin_active_tenant_id;
        console.log(`[twilio-inbound] Admin routing to tenant: ${tenantId}`);
      } else if (phoneRecord.fallback_tenant_id) {
        tenantId = phoneRecord.fallback_tenant_id;
        console.log(`[twilio-inbound] Fallback tenant: ${tenantId}`);
      }
    }

    // Step 3: Get tenant info
    const tenantRecords = await querySupabase(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, "tenants", {
      id: tenantId,
    });

    if (!tenantRecords.length) {
      console.error(`[twilio-inbound] Tenant not found: ${tenantId}`);
      return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
    }

    const tenant = tenantRecords[0];
    const businessMode = tenant.business_mode || "general";
    const businessName = tenant.name || "our business";

    console.log(`[twilio-inbound] Tenant: ${businessName}, mode: ${businessMode}`);

    // Step 4: Get assistant settings
    const settingsRecords = await querySupabase(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, "assistant_settings", {
      tenant_id: tenantId,
    });
    const settings = settingsRecords[0] || {};

    // Check if voice AI is enabled
    if (settings.voice_ai_enabled === false || settings.voice_mode === "off") {
      console.log(`[twilio-inbound] Voice AI disabled for tenant ${tenantId}`);
      return twimlResponse(hangupTwiml(`Thank you for calling ${escapeXml(businessName)}. We're currently unavailable. Please leave a message or try again later.`));
    }

    // Step 5: Handle IVR routing for dispatch businesses
    const dispatchIvrMode = settings.dispatch_ivr_mode || "towing_only";
    
    // If dispatch mode with IVR routing enabled and no digits yet, show IVR menu
    if (businessMode === "dispatch" && dispatchIvrMode === "ivr_routing" && !digits) {
      console.log(`[twilio-inbound] Showing IVR menu for dispatch tenant`);
      const webhookUrl = `${SUPABASE_URL}/functions/v1/twilio-inbound`;
      return twimlResponse(ivrGatherTwiml(businessName, webhookUrl));
    }
    
    // Determine which agent to use based on IVR mode and selection
    let ivrSelection: string | undefined;
    if (businessMode === "dispatch") {
      if (dispatchIvrMode === "impound_only") {
        ivrSelection = "2"; // Force impound agent
      } else if (dispatchIvrMode === "ivr_routing" && digits) {
        ivrSelection = digits; // Use caller's selection
      }
      // towing_only or no selection defaults to dispatch agent
    }

    // Step 6: Resolve agent ID for business mode
    const agentId = getAgentIdForMode(businessMode, ivrSelection);
    if (!agentId) {
      console.error(`[twilio-inbound] No agent configured for mode: ${businessMode}`);
      return twimlResponse(hangupTwiml("Our voice assistant is temporarily unavailable. Please try again later."));
    }

    // Step 7: Build dynamic variables for ElevenLabs
    const dynamicVariables: Record<string, string> = {
      tenant_id: tenantId,
      business_name: businessName,
      business_mode: businessMode,
      caller_phone: callerPhoneE164,
      hours_today: tenant.hours_json ? "See business hours" : "Contact us for hours",
      booking_link: settings.booking_url || "",
      service_summary: "",
      menu_summary: "",
      policies_summary: "",
      hipaa_mode: businessMode === "medical" ? "true" : "false",
    };

    // Step 8: Register call with ElevenLabs
    console.log(`[twilio-inbound] Registering with agent ${agentId.slice(0, 12)}...`);
    
    const registerResponse = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/register-call",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agentId,
          from_number: fromNumber,
          to_number: toNumber,
          conversation_initiation_client_data: {
            dynamic_variables: dynamicVariables,
          },
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

    // Step 9: Extract conversation_id from TwiML and create ai_call_sessions record
    // ElevenLabs TwiML contains the conversation ID in the Stream URL
    let conversationId: string | null = null;
    const streamUrlMatch = twiml.match(/wss:\/\/[^"]+/);
    if (streamUrlMatch) {
      const streamUrl = streamUrlMatch[0];
      // Extract conversation_id from URL path like /convai/.../conversation/conv_xxx
      const convMatch = streamUrl.match(/conversation\/(conv_[a-zA-Z0-9]+)/);
      if (convMatch) {
        conversationId = convMatch[1];
        console.log(`[twilio-inbound] Extracted conversation_id: ${conversationId}`);
      }
    }

    // Create ai_call_sessions record so webhook can find it later
    if (conversationId) {
      try {
        const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/ai_call_sessions`, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            elevenlabs_conversation_id: conversationId,
            twilio_call_sid: callSid,
            caller_phone: callerPhoneE164,
            call_direction: "inbound",
            started_at: new Date().toISOString(),
          }),
        });
        
        if (insertResponse.ok) {
          console.log(`[twilio-inbound] Created ai_call_sessions for ${conversationId}`);
        } else {
          console.error(`[twilio-inbound] Failed to create session: ${insertResponse.status}`);
        }
      } catch (e) {
        console.error(`[twilio-inbound] Session insert error:`, e);
      }
    } else {
      console.warn(`[twilio-inbound] Could not extract conversation_id from TwiML`);
    }

    // Update connect_status if needed
    if (settings.connect_status !== "forwarding_verified") {
      await updateSupabase(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, "assistant_settings", 
        { tenant_id: tenantId }, 
        { connect_status: "forwarding_verified", updated_at: new Date().toISOString() }
      );
    }

    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });

  } catch (error) {
    console.error("[twilio-inbound] Error:", error);
    return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
  }
});
