/**
 * elevenlabs-create-callback: ElevenLabs tool endpoint for scheduling
 * callback requests during voice calls.
 * 
 * Called by ElevenLabs agent when:
 * - Customer needs a quote
 * - Customer wants to speak with owner/manager
 * - Customer has complex questions AI can't answer
 * - Customer requests a follow-up call
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizePhoneE164 } from "../_shared/phoneNormalize.ts";
import { sendTenantSms } from "../_shared/sms-sender.ts";

const VERSION = "1.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ElevenLabsCallbackRequest {
  reason: string;
  customer_name?: string;
  customer_phone?: string;
  department?: string;
  preferred_time?: string;
  urgency?: string;
  notes?: string;
  tenant_id?: string;
  tenantId?: string;
  conversation_id?: string;
  call_id?: string;
  params?: {
    reason?: string;
    customer_name?: string;
    customer_phone?: string;
    department?: string;
    preferred_time?: string;
    urgency?: string;
    notes?: string;
    tenant_id?: string;
  };
}

interface CreateCallbackResponse {
  success: boolean;
  callback_id?: string;
  message: string;
  preferred_time?: string;
  department?: string;
  error?: string;
  _version?: string;
}

// Use shared phone normalization
const normalizePhone = normalizePhoneE164;

serve(async (req: Request) => {
  console.log(`[create-callback] v${VERSION} - Request received`);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ElevenLabsCallbackRequest = await req.json();
    
    console.log(`[create-callback] Full request:`, JSON.stringify(body));
    
    // Parse request params (handle nested params from ElevenLabs)
    const reason = body.reason || body.params?.reason || "callback requested";
    const customerName = body.customer_name || body.params?.customer_name || "";
    const customerPhone = body.customer_phone || body.params?.customer_phone || "";
    const department = body.department || body.params?.department || "general";
    const preferredTime = body.preferred_time || body.params?.preferred_time || "ASAP";
    const notes = body.notes || body.params?.notes || "";
    const rawUrgency = body.urgency || body.params?.urgency || "normal";
    const urgency = ["urgent", "high", "normal"].includes(rawUrgency) ? rawUrgency : "normal";
    const directTenantId = body.tenant_id || body.tenantId || body.params?.tenant_id || "";
    const conversationId = body.conversation_id || body.call_id || "";

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
      console.error("[create-callback] No tenant_id found");
      return new Response(
        JSON.stringify({
          success: false,
          message: "I'll make sure someone calls you back. Can I get your number to confirm?",
          error: "No active session found",
          _version: VERSION,
        } as CreateCallbackResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use caller phone from session if not provided
    const phoneE164 = normalizePhone(customerPhone) || callerPhone || "";
    
    console.log(`[create-callback] Tenant: ${tenantId.substring(0, 8)}..., Reason: ${reason}, Phone: ${phoneE164}`);

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
            full_name: customerName || "Callback Request",
            phone_e164: phoneE164,
            phone_raw: customerPhone || phoneE164,
            source: "voice_ai",
          })
          .select("id")
          .single();
        customerId = newCustomer?.id || null;
      }
    }

    // Create opportunity for callback (only if we have a customer_id — NOT NULL in schema)
    let opportunity: { id: string } | null = null;
    let phonelessCallbackId: string | null = null;
    if (!customerId) {
      // No phone/customer resolved — still create callback_requests row so
      // the dashboard NeedsAttentionBanner picks it up and owner gets notified.
      console.log("[create-callback] No customer_id resolved — creating phone-less callback_request");
      if (sessionId) {
        await supabase
          .from("ai_call_sessions")
          .update({
            outcome: "callback",
            extracted_payload: {
              intent: "callback",
              callback_reason: reason,
              customer_name: customerName,
              department: department,
              preferred_time: preferredTime,
              notes: notes,
              phone_missing: true,
            },
          })
          .eq("id", sessionId);
      }

      // Always create a callback_requests row, even without a customer
      const { data: cbRow, error: cbError } = await supabase
        .from("callback_requests")
        .insert({
          tenant_id: tenantId,
          session_id: sessionId,
          customer_id: null,
          customer_name: customerName || null,
          customer_phone: null,
          best_time: preferredTime || null,
          message: `[PHONE MISSING] ${reason} — Check call transcript for caller details.`,
          reason: reason,
          urgency: urgency,
          status: "new",
        })
        .select("id")
        .single();

      if (cbError) {
        console.error("[create-callback] callback_requests insert failed (phone-less):", cbError.message);
      } else {
        phonelessCallbackId = cbRow?.id || null;
        console.log(`[create-callback] Phone-less callback_request created: ${phonelessCallbackId}`);
      }

      // Notify owner even without an opportunity — use callback_requests entity
      if (phonelessCallbackId) {
        try {
          const deliveryRes = await fetch(`${supabaseUrl}/functions/v1/universal-delivery`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              tenant_id: tenantId,
              entity_type: "callback",
              entity_id: phonelessCallbackId,
            }),
          });
          if (deliveryRes.ok) {
            console.log(`[create-callback] Triggered universal-delivery for phone-less callback ${phonelessCallbackId}`);
          } else {
            const errText = await deliveryRes.text();
            console.error(`[create-callback] Delivery failed (phone-less): ${errText}`);
          }
        } catch (notifyErr) {
          console.error("[create-callback] Notification error (phone-less):", notifyErr);
        }
      }
    } else {
      const { data: opp, error: opportunityError } = await supabase
        .from("opportunities")
        .insert({
          tenant_id: tenantId,
          customer_id: customerId,
          source: "voice_callback",
          status: "new",
          notes: `📞 CALLBACK REQUESTED: ${reason}\n\nDepartment: ${department}\nPreferred time: ${preferredTime}\nPhone: ${phoneE164}${notes ? `\nNotes: ${notes}` : ""}`.trim(),
          context_json: {
            type: "callback",
            reason: reason,
            department: department,
            preferred_time: preferredTime,
            urgency: urgency,
            caller_phone: phoneE164,
            customer_name: customerName,
            session_id: sessionId,
            created_via: "voice_ai",
          },
        })
        .select("id")
        .single();

      if (opportunityError) {
        console.error("[create-callback] CRITICAL: Opportunity insert failed:", JSON.stringify(opportunityError));

        // Still capture the intent on the session so it's not completely lost
        if (sessionId) {
          await supabase
            .from("ai_call_sessions")
            .update({
              outcome: "callback",
              extracted_payload: {
                intent: "callback",
                callback_reason: reason,
                customer_name: customerName,
                customer_phone: phoneE164,
                department: department,
                preferred_time: preferredTime,
                notes: notes,
                _error: "opportunity_insert_failed",
              },
            })
            .eq("id", sessionId);
        }

        return new Response(
          JSON.stringify({
            success: false,
            message: "I'll make sure someone calls you back soon.",
            error: "Failed to save callback request",
            _version: VERSION,
          } as CreateCallbackResponse),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      opportunity = opp;

      // Also write to callback_requests for unified dashboard view
      if (opportunity?.id) {
        const { error: cbError } = await supabase
          .from("callback_requests")
          .insert({
            tenant_id: tenantId,
            session_id: sessionId,
            customer_id: customerId,
            customer_name: customerName || null,
            customer_phone: phoneE164 || null,
            best_time: preferredTime || null,
            message: reason,
            reason: reason,
            urgency: urgency,
            status: "new",
          });
        if (cbError) {
          console.warn("[create-callback] callback_requests insert failed (non-fatal):", cbError.message);
        }
      }
    }

    // Update session with callback outcome (only when we created an opportunity)
    if (customerId && sessionId) {
      await supabase
        .from("ai_call_sessions")
        .update({
          opportunity_id: opportunity?.id,
          outcome: "callback",
          extracted_payload: {
            intent: "callback",
            callback_reason: reason,
            customer_name: customerName,
            customer_phone: phoneE164,
            department: department,
            preferred_time: preferredTime,
            notes: notes,
          },
        })
        .eq("id", sessionId);
    }

    // Trigger notification to business owner via universal-delivery
    if (opportunity?.id) {
      try {
        const deliveryRes = await fetch(`${supabaseUrl}/functions/v1/universal-delivery`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            entity_type: "callback",
            entity_id: opportunity.id,
          }),
        });
        if (deliveryRes.ok) {
          console.log(`[create-callback] Triggered universal-delivery for callback ${opportunity.id}`);
        } else {
          const errText = await deliveryRes.text();
          console.error(`[create-callback] Delivery failed: ${errText}`);
        }
      } catch (notifyErr) {
        console.error("[create-callback] Notification error:", notifyErr);
        // Non-fatal
      }
    }

    // Send customer confirmation SMS (if we have their phone)
    if (phoneE164 && customerId) {
      try {
        const { data: tenantData } = await supabase
          .from("tenants")
          .select("name")
          .eq("id", tenantId)
          .single();

        const businessName = tenantData?.name || "us";
        const timePhrase = preferredTime?.toLowerCase() === "asap" || preferredTime?.toLowerCase() === "now"
          ? "as soon as possible"
          : preferredTime || "shortly";

        const customerSmsBody = `Thanks for calling ${businessName}! We've noted your request and someone will get back to you ${timePhrase}. Reply STOP to opt out.`;

        const smsResult = await sendTenantSms({
          tenantId,
          to: phoneE164,
          body: customerSmsBody,
          entityType: "callback",
          entityId: opportunity?.id || phonelessCallbackId || undefined,
        });

        if (smsResult.success) {
          console.log(`[create-callback] Customer confirmation SMS sent to ${phoneE164}`);
        } else if (!smsResult.skipped) {
          console.error(`[create-callback] Customer SMS failed: ${smsResult.error}`);
        }
      } catch (smsErr) {
        console.error("[create-callback] Customer SMS error:", smsErr);
        // Non-fatal — callback was still created
      }
    }

    // Build response message based on preferred time
    let responseMessage = "Got it! Someone will call you back";
    if (preferredTime?.toLowerCase() === "asap" || preferredTime?.toLowerCase() === "now") {
      responseMessage = "Got it! Someone will call you back as soon as possible";
    } else if (preferredTime?.toLowerCase().includes("morning")) {
      responseMessage = "Got it! Someone will call you back this morning";
    } else if (preferredTime?.toLowerCase().includes("afternoon")) {
      responseMessage = "Got it! Someone will call you back this afternoon";
    } else if (preferredTime) {
      responseMessage = `Got it! Someone will call you back ${preferredTime}`;
    }

    console.log(`[create-callback] Success - Opportunity: ${opportunity?.id || 'none'}, PhonelessCB: ${phonelessCallbackId || 'none'}`);

    return new Response(
      JSON.stringify({
        success: true,
        callback_id: opportunity?.id || phonelessCallbackId || sessionId,
        message: responseMessage,
        preferred_time: preferredTime,
        department: department,
        _version: VERSION,
      } as CreateCallbackResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[create-callback] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "I'll make sure someone calls you back soon.",
        error: error instanceof Error ? error.message : "Unknown error",
        _version: VERSION,
      } as CreateCallbackResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
