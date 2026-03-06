/**
 * Twilio Incoming SMS Webhook — the SMS receptionist.
 *
 * Every inbound text gets the SAME intelligence as a voice call:
 * full business context, tool calling (book, cancel, reschedule, dispatch),
 * multi-turn stateful conversation, and personalized replies.
 *
 * Flow:
 * 1. Resolve tenant from the "To" number (phone_numbers, closeloop_number, toll-free)
 * 2. Handle opt-out keywords (STOP/START/HELP) for A2P compliance
 * 3. Find or auto-create customer + lead (never ignore unknown texters)
 * 4. Route to text-conversation for AI-powered reply with tool calling
 * 5. Return reply via TwiML (primary) or Twilio REST API (async fallback)
 * 6. Log everything in conversations + messages tables
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizePhoneE164 } from "../_shared/phoneNormalize.ts";
import { sendTenantSms } from "../_shared/sms-sender.ts";

const VERSION = "sms-webhook@2026-03-06.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// A2P compliance keywords (case-insensitive, exact match)
const OPT_OUT_KEYWORDS = ["stop", "unsubscribe", "cancel", "end", "quit"];
const OPT_IN_KEYWORDS = ["start", "unstop", "subscribe"];
const HELP_KEYWORDS = ["help", "info"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse Twilio webhook form data
    const formData = await req.formData();
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const messageBody = (formData.get("Body") as string || "").trim();
    const messageSid = formData.get("MessageSid") as string;

    console.log(`[${VERSION}] SMS from ${from} to ${to}: "${messageBody.substring(0, 80)}"`);

    if (!from || !to || !messageBody) {
      console.log("[sms-webhook] Missing required fields");
      return twilioResponse("");
    }

    const normalizedFrom = normalizePhoneE164(from) || from;
    const normalizedTo = normalizePhoneE164(to) || to;

    // ─── Step 1: Resolve tenant from the "To" number ─────────────────────
    let tenantId: string | null = null;
    let businessName = "";

    // Strategy 1: phone_numbers table (primary — same as voice calls)
    const { data: phoneRecord } = await supabase
      .from("phone_numbers")
      .select("tenant_id")
      .eq("phone_e164", normalizedTo)
      .in("status", ["provisioned", "active"])
      .maybeSingle();

    if (phoneRecord) {
      tenantId = phoneRecord.tenant_id;
    }

    // Strategy 2: closeloop_number in assistant_settings
    if (!tenantId) {
      const { data: settings } = await supabase
        .from("assistant_settings")
        .select("tenant_id")
        .eq("closeloop_number", normalizedTo)
        .maybeSingle();

      if (settings) tenantId = settings.tenant_id;
    }

    // Strategy 3: toll-free number in a2p_registrations
    if (!tenantId) {
      const { data: a2p } = await supabase
        .from("a2p_registrations")
        .select("tenant_id")
        .eq("toll_free_phone_e164", normalizedTo)
        .maybeSingle();

      if (a2p) tenantId = a2p.tenant_id;
    }

    if (!tenantId) {
      console.log(`[sms-webhook] No tenant for number ${normalizedTo}`);
      return twilioResponse("");
    }

    // Get tenant info for business name
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, business_mode")
      .eq("id", tenantId)
      .maybeSingle();

    businessName = tenant?.name || "our business";

    // ─── Step 2: A2P compliance — opt-out/opt-in/help ────────────────────
    const bodyLower = messageBody.toLowerCase().trim();

    if (OPT_OUT_KEYWORDS.includes(bodyLower)) {
      console.log(`[sms-webhook] Opt-out from ${normalizedFrom} for tenant ${tenantId}`);
      // Mark customer as do_not_contact
      await supabase
        .from("customers")
        .update({ do_not_contact: true })
        .eq("tenant_id", tenantId)
        .eq("phone_e164", normalizedFrom);

      return twilioResponse(
        `You've been unsubscribed from ${businessName} messages. Reply START to resubscribe.`
      );
    }

    if (OPT_IN_KEYWORDS.includes(bodyLower)) {
      console.log(`[sms-webhook] Opt-in from ${normalizedFrom} for tenant ${tenantId}`);
      await supabase
        .from("customers")
        .update({ do_not_contact: false })
        .eq("tenant_id", tenantId)
        .eq("phone_e164", normalizedFrom);

      return twilioResponse(
        `Welcome back! You're resubscribed to ${businessName}. Reply STOP to unsubscribe anytime.`
      );
    }

    if (HELP_KEYWORDS.includes(bodyLower)) {
      return twilioResponse(
        `${businessName}: Reply to this number to chat with us. ` +
        `You can book, cancel, or reschedule appointments by text. ` +
        `Reply STOP to unsubscribe.`
      );
    }

    // ─── Step 3: Find or create customer + lead ──────────────────────────
    let customer = await supabase
      .from("customers")
      .select("id, full_name, do_not_contact")
      .eq("tenant_id", tenantId)
      .eq("phone_e164", normalizedFrom)
      .maybeSingle()
      .then(r => r.data);

    // Auto-create customer for unknown texters
    if (!customer) {
      console.log(`[sms-webhook] New customer from ${normalizedFrom}, auto-creating`);
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({
          tenant_id: tenantId,
          phone_e164: normalizedFrom,
          full_name: null,
          source: "sms_inbound",
        })
        .select("id, full_name, do_not_contact")
        .single();

      customer = newCustomer;
    }

    if (!customer) {
      console.error("[sms-webhook] Failed to find/create customer");
      return twilioResponse("");
    }

    // Check opt-out
    if (customer.do_not_contact) {
      console.log(`[sms-webhook] Customer ${customer.id} opted out, ignoring`);
      return twilioResponse("");
    }

    // Find or create lead
    let lead = await supabase
      .from("leads")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("phone", normalizedFrom)
      .maybeSingle()
      .then(r => r.data);

    if (!lead) {
      const { data: newLead } = await supabase
        .from("leads")
        .insert({
          tenant_id: tenantId,
          phone: normalizedFrom,
          full_name: customer.full_name || null,
          source: "sms_inbound",
          status: "new",
        })
        .select("id")
        .single();
      lead = newLead;
    }

    // ─── Step 4: Conversation tracking ───────────────────────────────────
    let conversationId: string | null = null;

    const { data: existingConversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("customer_id", customer.id)
      .eq("channel", "sms")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    conversationId = existingConversation?.id || null;

    if (!conversationId && lead) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          tenant_id: tenantId,
          lead_id: lead.id,
          customer_id: customer.id,
          channel: "sms",
        })
        .select("id")
        .single();
      conversationId = newConv?.id || null;
    }

    // Log inbound message
    if (conversationId) {
      await supabase.from("messages").insert({
        tenant_id: tenantId,
        conversation_id: conversationId,
        direction: "inbound",
        channel: "sms",
        content: messageBody,
        external_id: messageSid,
        status: "delivered",
      });
    }

    // ─── Step 5: Check for active recovery campaign ──────────────────────
    const { data: activeCampaign } = await supabase
      .from("lead_recovery_campaigns")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("customer_id", customer.id)
      .in("status", ["active", "paused"])
      .maybeSingle();

    if (activeCampaign) {
      console.log(`[sms-webhook] Recovery campaign ${activeCampaign.id}, processing response`);
      try {
        await supabase.functions.invoke("process-recovery-response", {
          body: {
            tenant_id: tenantId,
            customer_id: customer.id,
            customer_phone: normalizedFrom,
            response_type: "sms_reply",
            response_content: messageBody,
          },
        });
      } catch (e) {
        console.error("[sms-webhook] Recovery response error:", e);
      }
      // Don't return — still route to AI for a reply
    }

    // ─── Step 6: Route to AI text-conversation ───────────────────────────
    // Stable session ID: tenant + customer phone = consistent multi-turn state
    const sessionId = `sms_${tenantId.substring(0, 8)}_${normalizedFrom.replace(/\D/g, "").slice(-10)}`;

    try {
      // Use AbortController for timeout — Twilio gives us ~15 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const textConvResponse = await fetch(
        `${supabaseUrl}/functions/v1/text-conversation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            tenantId,
            message: messageBody,
            callerPhone: normalizedFrom,
            customerId: customer.id,
            sessionId,
            channel: "sms",
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (textConvResponse.ok) {
        const result = await textConvResponse.json();
        const aiReply = result.reply;

        if (aiReply) {
          const elapsed = Date.now() - startTime;
          console.log(`[sms-webhook] AI reply (${aiReply.length} chars, ${elapsed}ms)`);

          // Log outbound message
          if (conversationId) {
            await supabase.from("messages").insert({
              tenant_id: tenantId,
              conversation_id: conversationId,
              direction: "outbound",
              channel: "sms",
              content: aiReply,
              status: "sent",
            });
          }

          return twilioResponse(aiReply);
        }
      } else {
        const errText = await textConvResponse.text().catch(() => "");
        console.error(`[sms-webhook] text-conversation error: ${textConvResponse.status} ${errText}`);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // AI took too long — send async reply via REST API
        console.warn("[sms-webhook] AI reply timed out, sending async");

        // Fire-and-forget: get AI reply and send via SMS sender
        (async () => {
          try {
            const asyncResponse = await fetch(
              `${supabaseUrl}/functions/v1/text-conversation`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  tenantId,
                  message: messageBody,
                  callerPhone: normalizedFrom,
                  customerId: customer.id,
                  sessionId,
                  channel: "sms",
                }),
              }
            );

            if (asyncResponse.ok) {
              const result = await asyncResponse.json();
              if (result.reply) {
                await sendTenantSms({
                  tenantId,
                  to: normalizedFrom,
                  body: result.reply,
                });

                // Log the async reply
                if (conversationId) {
                  await supabase.from("messages").insert({
                    tenant_id: tenantId,
                    conversation_id: conversationId,
                    direction: "outbound",
                    channel: "sms",
                    content: result.reply,
                    status: "sent",
                  });
                }

                console.log(`[sms-webhook] Async reply sent to ${normalizedFrom}`);
              }
            }
          } catch (asyncErr) {
            console.error("[sms-webhook] Async reply failed:", asyncErr);
          }
        })();

        // Return empty TwiML — async reply will come separately
        return twilioResponse("");
      }

      console.error("[sms-webhook] text-conversation error:", err);
    }

    // Fallback: empty TwiML (no reply)
    return twilioResponse("");

  } catch (error) {
    console.error(`[${VERSION}] Fatal error:`, error);
    return twilioResponse("");
  }
});

function twilioResponse(message: string): Response {
  const twiml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

  return new Response(twiml, {
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
