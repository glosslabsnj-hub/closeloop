/**
 * send-sms-internal: Internal SMS sender for trusted server-to-server calls.
 *
 * Used by external services (Gloss Labs website, etc.) that need to send
 * SMS through the Flux Receptionist SMS routing without user JWT auth.
 *
 * Deployed with --no-verify-jwt. No custom auth check needed — only services
 * with the Supabase URL can call this, and it's not exposed publicly.
 */
import { sendTenantSms } from "../_shared/sms-sender.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type, apikey",
      },
    });
  }

  try {
    const { tenant_id, to, body } = await req.json();

    if (!tenant_id || !to || !body) {
      return jsonResp({ error: "Missing required fields: tenant_id, to, body" }, 400);
    }

    console.log(`[send-sms-internal] Sending to ${to} for tenant ${tenant_id.substring(0, 8)}...`);

    const result = await sendTenantSms({ tenantId: tenant_id, to, body });

    if (result.skipped) {
      return jsonResp({ error: "SMS not available: no verified channel", skipped: true }, 422);
    }

    if (!result.success) {
      return jsonResp({ error: `SMS failed: ${result.error}` }, 502);
    }

    console.log(`[send-sms-internal] SMS sent: ${result.twilioSid}`);
    return jsonResp({
      success: true,
      twilio_sid: result.twilioSid,
      channel: result.channel,
    });
  } catch (error) {
    console.error("send-sms-internal error:", error);
    return jsonResp({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function jsonResp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
