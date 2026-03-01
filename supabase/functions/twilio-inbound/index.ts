// twilio-inbound - telephony entrypoint (safe-mode)
// Update this string when you want to verify a fresh deploy is running
const VERSION = "twilio-inbound@2026-02-12.1";
const DEPLOYED_AT = new Date().toISOString();

// Agent resolution uses getAgentIdForCapabilities() from agentResolver.ts (capabilities-based, replaces legacy mode-based routing)
import { isHybridCapabilitySet, getAgentIdForCapabilities, derivePrimaryModeFromCapabilities } from "../_shared/agentResolver.ts";
import { resolveCapabilities } from "../_shared/resolveCapabilities.ts";
// Business context builder — same pipeline used by elevenlabs-init / get-business-context
import { buildBusinessContext, buildDynamicVariables } from "../_shared/buildBusinessContext.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// CALLBACK_ONLY_OVERRIDE removed - conversation_config_override breaks register-call API
// Callback-only behavior is driven by ai_behavior_mode dynamic variable read by the ElevenLabs agent prompt

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

// Forward call to owner's phone via <Dial>
function forwardTwiml(forwardNumber: string, businessName: string, callerId: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${escapeXml(callerId)}" timeout="25">
    <Number>${escapeXml(forwardNumber)}</Number>
  </Dial>
  <Say voice="Polly.Joanna">Sorry, no one is available at ${escapeXml(businessName)} right now. Please try again later.</Say>
  <Hangup/>
</Response>`;
}

// Voicemail TwiML — say message + record
function voicemailTwiml(businessName: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thanks for calling ${escapeXml(businessName)}. We're not available right now. Please leave a message after the tone and we'll get back to you.</Say>
  <Record maxLength="120" playBeep="true" />
  <Say voice="Polly.Joanna">Thank you. Goodbye.</Say>
  <Hangup/>
</Response>`;
}

// Callback capture TwiML — acknowledge and hang up
function callbackCaptureTwiml(businessName: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thanks for calling ${escapeXml(businessName)}. We have your number and someone will call you back shortly.</Say>
  <Hangup/>
</Response>`;
}

// Check if current time is outside business hours
function isAfterHours(hoursJson: Record<string, unknown> | null, timezone: string | null): boolean {
  if (!hoursJson || !timezone) return false; // Assume open if no hours configured

  try {
    // Get current day-of-week in the business timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const weekday = parts.find(p => p.type === "weekday")?.value?.toLowerCase() || "";
    const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10);
    const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0", 10);
    const currentMinutes = hour * 60 + minute;

    // Look up today's hours — hoursJson can be keyed by full name or abbreviation
    const dayKeys = [weekday, weekday.slice(0, 3)]; // "monday", "mon"
    let todayHours: any = null;
    for (const key of dayKeys) {
      if (hoursJson[key] !== undefined) {
        todayHours = hoursJson[key];
        break;
      }
    }

    // No entry for today → closed today → after hours
    if (todayHours === null || todayHours === undefined) return true;

    // Explicitly closed
    if (todayHours === false || todayHours?.closed === true || todayHours?.is_closed === true) return true;

    // Parse open/close times (supports "09:00"/"17:00" or {open: "09:00", close: "17:00"})
    let openTime: string | null = null;
    let closeTime: string | null = null;

    if (typeof todayHours === "object") {
      openTime = todayHours.open || todayHours.start || null;
      closeTime = todayHours.close || todayHours.end || null;
    }

    if (!openTime || !closeTime) return false; // Can't determine, assume open

    const [openH, openM] = openTime.split(":").map(Number);
    const [closeH, closeM] = closeTime.split(":").map(Number);
    const openMinutes = openH * 60 + (openM || 0);
    const closeMinutes = closeH * 60 + (closeM || 0);

    // Current time is before open or after close → after hours
    return currentMinutes < openMinutes || currentMinutes >= closeMinutes;
  } catch (e) {
    console.warn("[twilio-inbound] isAfterHours() error:", e);
    return false; // On error, assume open (don't block calls)
  }
}

// IVR menu TwiML - asks caller to press 1 or 2 (dispatch-specific: towing vs impound)
function ivrGatherTwiml(businessName: string, webhookUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${escapeXml(webhookUrl)}" method="POST" timeout="5">
    <Say voice="Polly.Joanna">Thanks for calling ${escapeXml(businessName)}. Press 1 for towing and roadside assistance, or press 2 to check on an impounded vehicle.</Say>
  </Gather>
  <Say voice="Polly.Joanna">We didn't receive your selection. Connecting you to dispatch.</Say>
</Response>`;
}

// Hybrid IVR TwiML - asks caller to press 1 for scheduling or 2 for immediate assistance
function hybridIvrTwiml(businessName: string, webhookUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${escapeXml(webhookUrl)}" method="POST" timeout="5">
    <Say voice="Polly.Joanna">Thanks for calling ${escapeXml(businessName)}. 
      Press 1 to schedule an appointment, or press 2 for immediate assistance.</Say>
  </Gather>
  <Say voice="Polly.Joanna">We didn't receive your selection. Connecting you to our team.</Say>
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

// Inline "safe-mode" helpers (avoid heavy imports + prevent hanging requests)
function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(input, {
    ...init,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
}

async function logTwilioEvent(
  supabaseUrl: string,
  serviceRoleKey: string,
  data: {
    tenant_id?: string | null;
    twilio_call_sid: string;
    to_number: string;
    from_number: string;
    stage: string;
    http_status?: number | null;
    error_message?: string | null;
    raw_payload?: Record<string, unknown> | null;
  }
) {
  try {
    // Keep this fast: don't let logging block the call path.
    await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/twilio_event_logs`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          tenant_id: data.tenant_id ?? null,
          twilio_call_sid: data.twilio_call_sid,
          to_number: data.to_number,
          from_number: data.from_number,
          stage: data.stage,
          http_status: data.http_status ?? null,
          error_message: data.error_message ?? null,
          raw_payload: data.raw_payload ?? null,
        }),
      },
      1200
    );
  } catch {
    // swallow
  }
}

// Inline DB read (REST) with timeout
async function querySupabase(
  url: string,
  key: string,
  table: string,
  query: Record<string, string>,
  timeoutMs = 2500
): Promise<any[]> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    params.append(k, `eq.${v}`);
  }
  params.append("limit", "1");

  const response = await fetchWithTimeout(
    `${url}/rest/v1/${table}?${params.toString()}`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
    },
    timeoutMs
  );

  if (!response.ok) {
    console.error(`[querySupabase] ${table} query failed:`, response.status);
    return [];
  }

  return await response.json();
}

async function updateSupabase(
  url: string,
  key: string,
  table: string,
  match: Record<string, string>,
  data: Record<string, any>,
  timeoutMs = 2500
): Promise<boolean> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(match)) {
    params.append(k, `eq.${v}`);
  }

  const response = await fetchWithTimeout(
    `${url}/rest/v1/${table}?${params.toString()}`,
    {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(data),
    },
    timeoutMs
  );

  return response.ok;
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
    console.log(`[${VERSION}] [twilio-inbound] Call from ${fromNumber} to ${toNumber}, CallSid=${callSid}, Digits=${digits}`);
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

  // Hard deadline to avoid Twilio timeouts ("application error")
  const startedMs = Date.now();
  const hardDeadlineMs = 9500;
  const timeLeft = () => Math.max(800, hardDeadlineMs - (Date.now() - startedMs));

  const callSidSafe = callSid || `missing_${Date.now()}`;
  const callerPhoneE164 = normalizeToE164(fromNumber);
  const toPhoneE164 = normalizeToE164(toNumber) || toNumber;

  void logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    tenant_id: null,
    twilio_call_sid: callSidSafe,
    to_number: toPhoneE164,
    from_number: callerPhoneE164 || fromNumber,
    stage: "request_received",
    raw_payload: { has_digits: !!digits, digits: digits || null },
  });

  try {
    // Step 1: Lookup phone number -> tenant (only active numbers)
    const phoneRecords = await querySupabase(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      "phone_numbers",
      {
        phone_e164: toPhoneE164,
        status: "provisioned",
      },
      Math.min(2500, timeLeft())
    );

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

    // Get capabilities from tenant
    const capabilities = (tenant.capabilities_json as Record<string, boolean>) || {};
    const isHybrid = isHybridCapabilitySet(capabilities);

    // Step 4: Get assistant settings
    const settingsRecords = await querySupabase(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, "assistant_settings", {
      tenant_id: tenantId,
    });
    const settings = settingsRecords[0] || {};

    // ===== TRIAL MINUTE CAP ENFORCEMENT =====
    // Check if tenant is on trial and has exceeded their minute limit
    const subscriptionRecords = await querySupabase(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      "subscriptions",
      { tenant_id: tenantId },
      Math.min(2000, timeLeft())
    );
    const subscription = subscriptionRecords[0];

    if (subscription?.status === "trialing" && subscription?.trial_minutes_limit) {
      const usageRecords = await querySupabase(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        "subscription_usage",
        { tenant_id: tenantId },
        Math.min(2000, timeLeft())
      );
      const usage = usageRecords[0];

      if (usage && usage.voice_minutes_used >= subscription.trial_minutes_limit) {
        console.log(`[twilio-inbound] Trial minutes exhausted for tenant ${tenantId}: ${usage.voice_minutes_used}/${subscription.trial_minutes_limit}`);

        void logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          tenant_id: tenantId,
          twilio_call_sid: callSidSafe,
          to_number: toPhoneE164,
          from_number: callerPhoneE164,
          stage: "trial_minutes_exhausted",
        });

        return twimlResponse(hangupTwiml(
          "Thank you for calling. This business is currently setting up their AI assistant. Please call back later or visit their website."
        ));
      }
    }

    // ===== VOICE MODE ROUTING =====
    // Determines WHEN AI answers: always, after hours only, etc.
    // And WHAT happens when AI doesn't answer: forward, voicemail, callback capture
    const voiceMode = settings.voice_mode || "always_on";
    const offBehavior = settings.off_behavior || "FORWARD_OWNER";
    const ownerForwardNumber = settings.owner_forward_number || "";

    // Helper: execute off-behavior (forward/voicemail/callback) and log
    const handleOffBehavior = (reason: string): Response => {
      console.log(`[twilio-inbound] Off-behavior triggered (${reason}): ${offBehavior} for tenant ${tenantId}`);

      // Fire-and-forget: create a minimal session for lead tracking
      void (async () => {
        try {
          await fetchWithTimeout(
            `${SUPABASE_URL}/rest/v1/ai_call_sessions`,
            {
              method: "POST",
              headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json",
                Prefer: "return=minimal",
              },
              body: JSON.stringify({
                tenant_id: tenantId,
                twilio_call_sid: callSidSafe,
                caller_phone: callerPhoneE164,
                call_direction: "inbound",
                started_at: new Date().toISOString(),
                ended_at: new Date().toISOString(),
                outcome: offBehavior === "FORWARD_OWNER" ? "escalated"
                  : offBehavior === "VOICEMAIL" ? "message"
                  : offBehavior === "CALLBACK_ONLY" ? "followup"
                  : "lost",
                summary: `Call handled via ${offBehavior} (${reason})`,
              }),
            },
            2000
          );
        } catch { /* swallow */ }
      })();

      void logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        tenant_id: tenantId,
        twilio_call_sid: callSidSafe,
        to_number: toPhoneE164,
        from_number: callerPhoneE164,
        stage: `off_behavior_${offBehavior.toLowerCase()}`,
        raw_payload: { reason, voice_mode: voiceMode, off_behavior: offBehavior },
      });

      switch (offBehavior) {
        case "FORWARD_OWNER":
          if (ownerForwardNumber) {
            return twimlResponse(forwardTwiml(ownerForwardNumber, businessName, toPhoneE164));
          }
          // No forward number configured — fall back to voicemail
          console.warn(`[twilio-inbound] FORWARD_OWNER but no number configured, falling back to voicemail`);
          return twimlResponse(voicemailTwiml(businessName));
        case "VOICEMAIL":
          return twimlResponse(voicemailTwiml(businessName));
        case "CALLBACK_ONLY":
          return twimlResponse(callbackCaptureTwiml(businessName));
        default:
          return twimlResponse(hangupTwiml(`Thank you for calling ${escapeXml(businessName)}. We're currently unavailable. Please try again later.`));
      }
    };

    // 1. If voice AI is fully disabled → off-behavior
    if (settings.voice_ai_enabled === false || voiceMode === "off") {
      console.log(`[twilio-inbound] Voice AI disabled for tenant ${tenantId}`);
      return handleOffBehavior("voice_ai_disabled");
    }

    // 2. If after_hours_only → check business hours
    if (voiceMode === "after_hours_only") {
      const afterHours = isAfterHours(tenant.hours_json as Record<string, unknown> | null, tenant.timezone);
      if (!afterHours) {
        // During business hours → don't use AI, apply off-behavior
        console.log(`[twilio-inbound] after_hours_only mode: currently during business hours, using off-behavior`);
        return handleOffBehavior("during_business_hours");
      }
      // After hours → fall through to AI
      console.log(`[twilio-inbound] after_hours_only mode: after hours, proceeding to AI`);
    }

    // 3. always_on (default) or after_hours_only after hours → proceed to AI below

    // Step 5: Handle hybrid IVR routing (businesses with both booking + dispatch)
    if (isHybrid && !digits) {
      console.log(`[twilio-inbound] Showing hybrid IVR for business with booking + dispatch`);
      const webhookUrl = `${SUPABASE_URL}/functions/v1/twilio-inbound`;
      return twimlResponse(hybridIvrTwiml(businessName, webhookUrl));
    }

    // Step 5b: Handle dispatch-specific IVR routing (towing vs impound)
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
      } else if (dispatchIvrMode === "ivr_routing" && digits === "2") {
        ivrSelection = "2"; // Impound agent
      } else if (dispatchIvrMode === "ivr_routing" && digits === "1") {
        // Dispatch IVR "1" = towing/roadside → let capability-based resolution pick dispatch agent
        ivrSelection = undefined;
      }
      // towing_only or no selection defaults to dispatch agent
    } else if (isHybrid && digits) {
      // Hybrid routing: digits from hybrid IVR menu
      ivrSelection = digits;
    }

    // Step 6: Resolve agent ID using capabilities-based resolution
    const agentResolution = getAgentIdForCapabilities(capabilities, ivrSelection);
    const agentId = agentResolution.agentId;
    
    if (!agentId) {
      console.error(`[twilio-inbound] No agent configured. Resolution:`, agentResolution);
      return twimlResponse(hangupTwiml("Our voice assistant is temporarily unavailable. Please try again later."));
    }
    
    console.log(`[twilio-inbound] Agent resolved: ${agentId.slice(0, 12)}... (source: ${agentResolution.source})`);

    // Step 7: Build dynamic variables for ElevenLabs
    const callerPhoneLast4 = callerPhoneE164.length >= 4
      ? callerPhoneE164.slice(-4)
      : "";

    // Resolve capabilities for flag injection
    const caps = resolveCapabilities(
      tenant.business_mode,
      tenant.enabled_modules,
      tenant.capabilities_json
    );

    // Build full business context (same pipeline as elevenlabs-init / get-business-context)
    // Wrapped in 4-second timeout to stay within Twilio's response deadline
    let richDynamicVars: Record<string, string> = {};
    try {
      const contextResult = await Promise.race([
        (async () => {
          const supabaseClient = createClient(
            SUPABASE_URL!,
            SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
          );
          const { context } = await buildBusinessContext(supabaseClient, {
            tenantId,
            locationId: null,
            customerId: null,
            channel: "voice",
            sessionId: null,
            callerPhone: callerPhoneE164,
            includeIntelligence: false, // Keep it fast for telephony
          });
          return buildDynamicVariables(context, callerPhoneE164, null);
        })(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
      ]);

      if (contextResult) {
        richDynamicVars = contextResult;
        console.log(`[twilio-inbound] Business context loaded (${Object.keys(richDynamicVars).length} vars)`);
      } else {
        console.warn("[twilio-inbound] Business context timed out after 4s, using minimal vars");
      }
    } catch (err) {
      console.warn("[twilio-inbound] Business context build failed, using minimal vars:", err);
    }

    // Merge: rich context first, then call-specific overrides on top
    const dynamicVariables: Record<string, string> = {
      ...richDynamicVars,
      // Call-specific fields (always override context values)
      tenant_id: tenantId,
      business_name: businessName,
      business_mode: businessMode,
      caller_phone: callerPhoneE164,
      caller_phone_last4: callerPhoneLast4,
      twilio_call_sid: callSidSafe,
      // Capability flags
      has_booking: caps.hasBooking ? "true" : "false",
      has_dispatch: caps.hasDispatchQueue ? "true" : "false",
      has_impound: caps.hasImpoundLot ? "true" : "false",
      has_fleet: caps.hasFleetManagement ? "true" : "false",
      has_food_orders: caps.hasFoodOrders ? "true" : "false",
      has_reservations: caps.hasReservations ? "true" : "false",
      has_catering: caps.hasCatering ? "true" : "false",
      has_medical_intake: caps.hasMedicalIntake ? "true" : "false",
      has_estimates: caps.hasEstimates ? "true" : "false",
      has_eta_tracking: caps.hasEtaTracking ? "true" : "false",
      has_emergency_dispatch: caps.hasDispatchQueue ? "true" : "false",
      has_calendar_sync: caps.hasCalendarSync ? "true" : "false",
      hipaa_mode: caps.hasMedicalIntake ? "true" : "false",
      // Derived business type flags
      is_scheduling_business: caps.isSchedulingBusiness ? "true" : "false",
      is_dispatch_business: caps.isDispatchBusiness ? "true" : "false",
      is_food_business: caps.isFoodBusiness ? "true" : "false",
      is_medical_business: caps.isMedicalBusiness ? "true" : "false",
      is_service_business: caps.isServiceBusiness ? "true" : "false",
      // Capabilities list
      capabilities_list: Object.entries(capabilities)
        .filter(([_, v]) => v === true)
        .map(([k]) => k)
        .join(","),
      // AI behavior mode
      ai_behavior_mode: settings.ai_behavior_mode || "full_service",
    };

    // 2.4: Greeting A/B testing — randomly assign variant if test is enabled
    let greetingVariant: string | null = null;
    if (settings.greeting_test_enabled && settings.greeting_variant_b) {
      greetingVariant = Math.random() < 0.5 ? "A" : "B";
      if (greetingVariant === "B") {
        dynamicVariables.greeting_script = settings.greeting_variant_b;
      }
      console.log(`[twilio-inbound] Greeting A/B test: assigned variant ${greetingVariant}`);
    }

    // Step 8: Register call with ElevenLabs (timeout to avoid Twilio hanging)
    // Callback-only behavior is driven by the ai_behavior_mode dynamic variable (line 589)
    // which the ElevenLabs agent prompt reads to decide whether to book or just collect info.
    // DO NOT add conversation_config_override here — it breaks the register-call API and causes instant hangups.
    console.log(`[twilio-inbound] Registering with agent ${agentId.slice(0, 12)}... (callback_only=${settings.ai_behavior_mode === "callback_only"})`);

    // conversation_config_override BREAKS register-call API (causes instant hangups).
    // Greeting script is delivered via dynamic_variables.greeting_script instead.
    // The ElevenLabs dashboard agent's first_message must use {{greeting_script}} handlebars.
    const registerPayload: Record<string, unknown> = {
      agent_id: agentId,
      from_number: callerPhoneE164 || fromNumber,
      to_number: toPhoneE164,
      conversation_initiation_client_data: {
        dynamic_variables: dynamicVariables,
      },
    };

    const registerResponse = await fetchWithTimeout(
      "https://api.elevenlabs.io/v1/convai/twilio/register-call",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerPayload),
      },
      Math.min(7000, timeLeft())
    );

    if (!registerResponse.ok) {
      const errorText = await registerResponse.text();
      console.error(`[twilio-inbound] ElevenLabs error [${registerResponse.status}]:`, errorText);
      return twimlResponse(hangupTwiml("Our voice assistant is temporarily unavailable. Please try again later."));
    }

    const twiml = await registerResponse.text();
    console.log(`[twilio-inbound] ElevenLabs returned TwiML (${twiml.length} chars)`);

    // Step 9: Extract conversation_id from TwiML and create ai_call_sessions record
    // ElevenLabs TwiML contains the conversation ID in the Stream URL or as a parameter
    let conversationId: string | null = null;
    
    // Try multiple extraction patterns (ElevenLabs may change format)
    const streamUrlMatch = twiml.match(/wss:\/\/[^"<>\s]+/);
    if (streamUrlMatch) {
      const streamUrl = streamUrlMatch[0];
      console.log(`[twilio-inbound] Stream URL found: ${streamUrl.substring(0, 80)}...`);
      
      // Pattern 1: /conversation/conv_xxx in path
      let convMatch = streamUrl.match(/conversation\/(conv_[a-zA-Z0-9_-]+)/);
      if (convMatch) {
        conversationId = convMatch[1];
      }
      
      // Pattern 2: conversation_id=xxx as query param
      if (!conversationId) {
        convMatch = streamUrl.match(/conversation_id=([a-zA-Z0-9_-]+)/);
        if (convMatch) {
          conversationId = convMatch[1];
        }
      }
      
      // Pattern 3: conv_xxx anywhere in URL
      if (!conversationId) {
        convMatch = streamUrl.match(/(conv_[a-zA-Z0-9_-]+)/);
        if (convMatch) {
          conversationId = convMatch[1];
        }
      }
    }
    
    // Also try extracting from anywhere in TwiML if stream URL didn't work
    if (!conversationId) {
      const anyConvMatch = twiml.match(/(conv_[a-zA-Z0-9_-]+)/);
      if (anyConvMatch) {
        conversationId = anyConvMatch[1];
        console.log(`[twilio-inbound] Found conversation_id in TwiML body: ${conversationId}`);
      }
    }
    
    if (conversationId) {
      console.log(`[twilio-inbound] Extracted conversation_id: ${conversationId}`);
    } else {
      // Log the TwiML to debug the format
      console.warn(`[twilio-inbound] Could not extract conversation_id. TwiML sample: ${twiml.substring(0, 200)}`);
    }

    // Create ai_call_sessions record - ALWAYS create it, even without conversation_id
    // The webhook can fall back to matching by twilio_call_sid
    try {
      const insertResponse = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/ai_call_sessions`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            elevenlabs_conversation_id: conversationId, // May be null
            twilio_call_sid: callSidSafe,
            caller_phone: callerPhoneE164,
            call_direction: "inbound",
            started_at: new Date().toISOString(),
            ...(greetingVariant ? { greeting_variant: greetingVariant } : {}),
          }),
        },
        Math.min(2500, timeLeft())
      );
      
      if (insertResponse.ok) {
        console.log(`[twilio-inbound] Created ai_call_sessions (conv_id=${conversationId || 'null'}, call_sid=${callSidSafe})`);
        
        // Log success event (fire-and-forget to avoid blocking the critical path)
        void logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          tenant_id: tenantId,
          twilio_call_sid: callSidSafe,
          to_number: toPhoneE164,
          from_number: callerPhoneE164,
          stage: "elevenlabs_register_success",
          http_status: 200,
        });
      } else {
        const errText = await insertResponse.text().catch(() => "");
        console.error(`[twilio-inbound] Failed to create session: ${insertResponse.status} - ${errText}`);
      }
    } catch (e) {
      console.error(`[twilio-inbound] Session insert error:`, e);
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
