import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuthedTenant, serviceClient } from "../_shared/tenant.ts";
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { captureException } from "../_shared/sentry.ts";
import { sendTenantSms } from "../_shared/sms-sender.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const { to, body, tenant_id, conversation_id, customer_id } = await req.json();

    if (!to || !body) {
      return errorResponse("Missing required fields: to, body");
    }

    // Auth: require JWT + tenant membership
    const { tenantId } = await requireAuthedTenant(req, tenant_id);

    // Send via shared helper (auto-routes 10DLC → toll-free → skip)
    const result = await sendTenantSms({ tenantId, to, body });

    if (result.skipped) {
      return errorResponse("SMS not available: registration pending. Messages will be sent once your number is verified.", 422);
    }

    if (!result.success) {
      return errorResponse(`SMS delivery failed: ${result.error}`, 502);
    }

    // Log to messages table if we have a conversation_id
    const supabase = serviceClient();

    if (conversation_id) {
      await supabase.from("messages").insert({
        tenant_id: tenantId,
        conversation_id,
        direction: "outbound",
        body,
        status: "sent",
        meta_json: { twilio_sid: result.twilioSid, channel: result.channel },
      });
    } else if (customer_id) {
      const { data: existingConvo } = await supabase
        .from("conversations")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("customer_id", customer_id)
        .eq("channel", "sms")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingConvo?.id) {
        await supabase.from("messages").insert({
          tenant_id: tenantId,
          conversation_id: existingConvo.id,
          direction: "outbound",
          body,
          status: "sent",
          meta_json: { twilio_sid: result.twilioSid, channel: result.channel },
        });
      }
    }

    return jsonResponse({
      success: true,
      twilio_sid: result.twilioSid,
      channel: result.channel,
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
