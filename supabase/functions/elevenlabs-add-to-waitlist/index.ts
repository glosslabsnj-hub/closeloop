/**
 * elevenlabs-add-to-waitlist: ElevenLabs tool endpoint for adding
 * callers to the waitlist when preferred times are unavailable.
 * 
 * Called by ElevenLabs agent when:
 * - Requested time slot is fully booked
 * - Customer wants to be notified if something opens up
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION = "1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AddToWaitlistRequest {
  customer_name: string;
  customer_phone?: string;
  preferred_date?: string;
  preferred_time?: string;
  service_name?: string;
  service_id?: string;
  notes?: string;
  // Tenant identification
  tenant_id?: string;
  tenantId?: string;
  // ElevenLabs context
  conversation_id?: string;
  call_id?: string;
  // Nested params from ElevenLabs
  params?: {
    customer_name?: string;
    customer_phone?: string;
    preferred_date?: string;
    preferred_time?: string;
    service_name?: string;
    service_id?: string;
    notes?: string;
    tenant_id?: string;
  };
}

interface AddToWaitlistResponse {
  success: boolean;
  waitlist_id?: string;
  position?: number;
  message: string;
  error?: string;
  _version?: string;
}

// Normalize phone to E.164
function normalizePhone(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+")) return phone;
  return `+${digits}`;
}

// Parse date to YYYY-MM-DD
function parseDate(input: string, timezone: string): string | null {
  if (!input) return null;
  
  const lower = input.toLowerCase().trim();
  const now = new Date();
  
  if (lower === "today" || lower === "now") {
    return formatDateLocal(now, timezone);
  }
  if (lower === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateLocal(tomorrow, timezone);
  }
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }
  
  return formatDateLocal(now, timezone);
}

function formatDateLocal(date: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

// Parse time preference to time windows
function parseTimePreference(input: string): { start: string; end: string } | null {
  if (!input) return null;
  
  const lower = input.toLowerCase().trim();
  
  if (lower.includes("morning")) {
    return { start: "08:00", end: "12:00" };
  }
  if (lower.includes("afternoon")) {
    return { start: "12:00", end: "17:00" };
  }
  if (lower.includes("evening")) {
    return { start: "17:00", end: "21:00" };
  }
  
  // Try to parse specific time
  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] || "00";
    const period = timeMatch[3];
    
    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
    
    const start = `${String(hour).padStart(2, "0")}:${minutes}`;
    // Give a 2-hour window
    const endHour = Math.min(hour + 2, 23);
    const end = `${String(endHour).padStart(2, "0")}:${minutes}`;
    return { start, end };
  }
  
  return null;
}

serve(async (req: Request) => {
  console.log(`[add-to-waitlist] v${VERSION} - Request received`);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: AddToWaitlistRequest = await req.json();
    
    console.log(`[add-to-waitlist] Full request:`, JSON.stringify(body));
    
    // Parse request params
    const customerName = body.customer_name || body.params?.customer_name || "";
    const customerPhone = body.customer_phone || body.params?.customer_phone || "";
    const preferredDate = body.preferred_date || body.params?.preferred_date || "";
    const preferredTime = body.preferred_time || body.params?.preferred_time || "";
    const serviceName = body.service_name || body.params?.service_name || "";
    const serviceId = body.service_id || body.params?.service_id || "";
    const notes = body.notes || body.params?.notes || "";
    const directTenantId = body.tenant_id || body.tenantId || body.params?.tenant_id || "";
    const conversationId = body.conversation_id || body.call_id || "";

    // Validate required fields
    if (!customerName) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "I need your name to add you to the waitlist.",
          error: "customer_name is required",
          _version: VERSION,
        } as AddToWaitlistResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve tenant_id from conversation or use direct
    let tenantId: string | null = directTenantId || null;
    let sessionId: string | null = null;
    let callerPhone: string | null = null;
    
    if (conversationId) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id, id, caller_phone")
        .eq("elevenlabs_conversation_id", conversationId)
        .maybeSingle();
      
      if (session) {
        tenantId = session.tenant_id || tenantId;
        sessionId = session.id || null;
        callerPhone = session.caller_phone || null;
      }
    }

    if (!tenantId) {
      console.error("[add-to-waitlist] No tenant_id found");
      return new Response(
        JSON.stringify({
          success: false,
          message: "I'll take your info and have someone reach out when something opens up.",
          error: "No active session found",
          _version: VERSION,
        } as AddToWaitlistResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if waitlist is enabled
    const { data: assistantSettings } = await supabase
      .from("assistant_settings")
      .select("waitlist_enabled")
      .eq("tenant_id", tenantId)
      .single();

    if (!assistantSettings?.waitlist_enabled) {
      // Fallback: create a callback instead
      console.log(`[add-to-waitlist] Waitlist not enabled, creating callback instead`);
      
      return new Response(
        JSON.stringify({
          success: false,
          message: "I'll take your info and have someone call you when something opens up.",
          error: "Waitlist not enabled for this business",
          _version: VERSION,
        } as AddToWaitlistResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tenant timezone
    const { data: tenant } = await supabase
      .from("tenants")
      .select("timezone")
      .eq("id", tenantId)
      .single();

    const timezone = tenant?.timezone || "America/New_York";

    // Parse date and time
    const parsedDate = parseDate(preferredDate, timezone);
    const timeWindow = parseTimePreference(preferredTime);

    // Use caller phone from session if not provided
    const phoneE164 = normalizePhone(customerPhone) || callerPhone || "";
    
    console.log(`[add-to-waitlist] Tenant: ${tenantId.substring(0, 8)}..., Date: ${parsedDate}, Time: ${preferredTime}`);

    // Find or create customer
    let customerId: string | null = null;
    
    if (phoneE164) {
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("phone_e164", phoneE164)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        // Update name if provided
        if (customerName) {
          await supabase
            .from("customers")
            .update({ full_name: customerName, updated_at: new Date().toISOString() })
            .eq("id", customerId);
        }
      } else {
        // Create new customer
        const { data: newCustomer } = await supabase
          .from("customers")
          .insert({
            tenant_id: tenantId,
            full_name: customerName,
            phone_e164: phoneE164,
            phone_raw: customerPhone || phoneE164,
            source: "voice_ai",
          })
          .select("id")
          .single();
        customerId = newCustomer?.id || null;
      }
    }

    // Resolve service if provided
    let resolvedServiceId: string | null = null;
    
    if (serviceId) {
      const { data: service } = await supabase
        .from("services")
        .select("id")
        .eq("id", serviceId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      resolvedServiceId = service?.id || null;
    } else if (serviceName) {
      const { data: service } = await supabase
        .from("services")
        .select("id")
        .eq("tenant_id", tenantId)
        .ilike("name", `%${serviceName}%`)
        .limit(1)
        .maybeSingle();
      resolvedServiceId = service?.id || null;
    }

    // Create waitlist entry
    const { data: waitlistEntry, error: waitlistError } = await supabase
      .from("waitlist")
      .insert({
        tenant_id: tenantId,
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: phoneE164 || customerPhone,
        preferred_date: parsedDate,
        preferred_time_start: timeWindow?.start || null,
        preferred_time_end: timeWindow?.end || null,
        service_name: serviceName || null,
        service_id: resolvedServiceId,
        notes: notes || null,
        session_id: sessionId,
        status: "waiting",
        // Expire waitlist entry after 7 days
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    if (waitlistError) {
      console.error("[add-to-waitlist] Insert error:", waitlistError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "I had trouble adding you to the waitlist. Let me take your info for a callback instead.",
          error: waitlistError.message,
          _version: VERSION,
        } as AddToWaitlistResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get position in waitlist
    const { count: position } = await supabase
      .from("waitlist")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "waiting")
      .lte("created_at", new Date().toISOString());

    // Update session if we have one
    if (sessionId) {
      await supabase
        .from("ai_call_sessions")
        .update({
          outcome: "waitlist",
          extracted_payload: {
            waitlist_id: waitlistEntry?.id,
            customer_name: customerName,
            customer_phone: phoneE164,
            preferred_date: parsedDate,
            preferred_time: preferredTime,
            service_name: serviceName,
          },
        })
        .eq("id", sessionId);
    }

    console.log(`[add-to-waitlist] Success - Waitlist ID: ${waitlistEntry?.id}, Position: ${position}`);

    // Build response message
    let message = "You're on the waitlist. We'll call you as soon as something opens up.";
    if (parsedDate) {
      message = `You're on the waitlist for ${parsedDate}. We'll call you if something opens up.`;
    }
    if (position && position > 1) {
      message += ` You're number ${position} on the list.`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        waitlist_id: waitlistEntry?.id,
        position: position || 1,
        message: message,
        _version: VERSION,
      } as AddToWaitlistResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[add-to-waitlist] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "I had trouble with that. Let me take a note and have someone call you.",
        error: error instanceof Error ? error.message : "Unknown error",
        _version: VERSION,
      } as AddToWaitlistResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
