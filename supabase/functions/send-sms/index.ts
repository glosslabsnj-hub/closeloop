import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuthedTenant, serviceClient } from "../_shared/tenant.ts";
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { captureException } from "../_shared/sentry.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const { to, body, tenant_id, conversation_id, customer_id } = await req.json();

    if (!to || !body) {
      return errorResponse("Missing required fields: to, body");
    }

    // Auth: require JWT + tenant membership
    const { tenantId } = await requireAuthedTenant(req, tenant_id);

    const supabase = serviceClient();

    // Lookup tenant's Twilio phone number
    const { data: phoneNumber } = await supabase
      .from("phone_numbers")
      .select("phone_e164")
      .eq("tenant_id", tenantId)
      .in("purpose", ["forwarding", "primary"])
      .limit(1)
      .single();

    if (!phoneNumber?.phone_e164) {
      return errorResponse("No Twilio phone number configured for this tenant", 422);
    }

    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");

    if (!twilioSid || !twilioAuth) {
      return errorResponse("Twilio not configured", 500);
    }

    // Send SMS via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    const smsResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${twilioSid}:${twilioAuth}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: phoneNumber.phone_e164,
        Body: body,
      }),
    });

    if (!smsResponse.ok) {
      const errText = await smsResponse.text();
      console.error("Twilio SMS error:", errText);
      return errorResponse(`SMS delivery failed: ${errText}`, 502);
    }

    const twilioResult = await smsResponse.json();

    // Log to messages table if we have a conversation_id
    if (conversation_id) {
      await supabase.from("messages").insert({
        tenant_id: tenantId,
        conversation_id,
        direction: "outbound",
        body,
        status: "sent",
        meta_json: { twilio_sid: twilioResult.sid, from: phoneNumber.phone_e164 },
      });
    } else if (customer_id) {
      // Create or find conversation for this customer, then log
      const { data: existingConvo } = await supabase
        .from("conversations")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("customer_id", customer_id)
        .eq("channel", "sms")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const convoId = existingConvo?.id;

      if (convoId) {
        await supabase.from("messages").insert({
          tenant_id: tenantId,
          conversation_id: convoId,
          direction: "outbound",
          body,
          status: "sent",
          meta_json: { twilio_sid: twilioResult.sid, from: phoneNumber.phone_e164 },
        });
      }
    }

    return jsonResponse({
      success: true,
      twilio_sid: twilioResult.sid,
    });
  } catch (error) {
    console.error("send-sms error:", error);
    await captureException(error, { tags: { function: "send-sms" } });
    return errorResponse(
      error instanceof Error ? error.message : "Unknown error",
      500,
    );
  }
});
