/**
 * Shared SMS sender with intelligent routing.
 *
 * Routing priority:
 *   1. 10DLC approved → send via 10DLC Messaging Service
 *   2. Toll-free verified → send via toll-free Messaging Service
 *   3. Neither → skip (no verified channel)
 *
 * All SMS-sending edge functions should use this helper instead of
 * calling the Twilio Messages API directly.
 */

import { serviceClient } from "./tenant.ts";

export interface SendSmsRequest {
  tenantId: string;
  to: string;
  body: string;
  /** Optional context for delivery_attempts logging when SMS is skipped */
  entityType?: "order" | "booking" | "dispatch" | "reservation" | "catering" | "intake" | "callback" | "job_update" | "transfer";
  entityId?: string;
}

export interface SendSmsResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  twilioSid?: string;
  channel?: "10dlc" | "toll_free";
  error?: string;
}

export async function sendTenantSms(req: SendSmsRequest): Promise<SendSmsResult> {
  const { tenantId, to, body } = req;

  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");

  if (!twilioAccountSid || !twilioAuthToken) {
    return { success: false, error: "Twilio credentials not configured" };
  }

  const supabase = serviceClient();

  // Fetch A2P registration for this tenant
  const { data: a2p } = await supabase
    .from("a2p_registrations")
    .select("status, messaging_service_sid, toll_free_verified, toll_free_messaging_service_sid, toll_free_phone_e164, toll_free_verification_sid")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  // Determine which Messaging Service to use
  let messagingServiceSid: string | null = null;
  let fromNumber: string | null = null;
  let channel: "10dlc" | "toll_free" | null = null;

  if (a2p?.status === "approved" && a2p.messaging_service_sid) {
    messagingServiceSid = a2p.messaging_service_sid;
    channel = "10dlc";
  } else if (a2p?.toll_free_verified && a2p.toll_free_messaging_service_sid) {
    messagingServiceSid = a2p.toll_free_messaging_service_sid;
    channel = "toll_free";
  } else if (a2p?.toll_free_verified && a2p.toll_free_phone_e164) {
    fromNumber = a2p.toll_free_phone_e164;
    channel = "toll_free";
  }
  // Skip unverified toll-free numbers — they get carrier-level "(AI automated)" labels
  // The primary phone number fallback below handles that case

  if (!messagingServiceSid && !fromNumber) {
    // Only use primary phone if tenant has approved 10DLC (otherwise carrier-blocks with error 30034)
    if (a2p?.status === "approved") {
      const { data: primaryPhone } = await supabase
        .from("phone_numbers")
        .select("phone_e164")
        .eq("tenant_id", tenantId)
        .eq("status", "provisioned")
        .eq("purpose", "primary")
        .maybeSingle();

      if (primaryPhone?.phone_e164) {
        fromNumber = primaryPhone.phone_e164;
        channel = "10dlc";
        console.log(`[sms-sender] Using 10DLC-approved primary phone ${fromNumber} for tenant ${tenantId}`);
      }
    }

    if (!fromNumber) {
      // Last resort: use global TWILIO_FROM_NUMBER (system-level fallback for test/unregistered tenants)
      const globalFromNumber = Deno.env.get("TWILIO_FROM_NUMBER");
      if (globalFromNumber) {
        fromNumber = globalFromNumber;
        channel = "10dlc";
        console.log(`[sms-sender] Using global TWILIO_FROM_NUMBER fallback for tenant ${tenantId} (no A2P)`);
      } else {
        console.log(`[sms-sender] No verified SMS channel for tenant ${tenantId} (need A2P approval or toll-free verification)`);

        // Log the skip to delivery_attempts so owners can see SMS isn't going out
        try {
          await supabase.from("delivery_attempts").insert({
            tenant_id: tenantId,
            entity_type: req.entityType ?? "booking",
            entity_id: req.entityId ?? crypto.randomUUID(),
            method: "sms",
            status: "skipped",
            error_message: "no_verified_channel",
            request_payload: { to, body_length: body.length },
          });
        } catch (e) {
          console.error(`[sms-sender] Failed to log skipped SMS to delivery_attempts:`, e);
        }

        return { success: false, skipped: true, reason: "no_verified_channel" };
      }
    }
  }

  // Send via Messaging Service or direct From number
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
  const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

  const smsParams: Record<string, string> = { To: to, Body: body };
  if (messagingServiceSid) {
    smsParams.MessagingServiceSid = messagingServiceSid;
  } else if (fromNumber) {
    smsParams.From = fromNumber;
  }

  const smsResponse = await fetch(twilioUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${twilioAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(smsParams),
  });

  // If Messaging Service failed, retry with direct From number
  if (!smsResponse.ok && messagingServiceSid && fromNumber) {
    console.log(`[sms-sender] Messaging Service failed, falling back to direct From for tenant ${tenantId}`);
    const retryResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${twilioAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: fromNumber, Body: body }),
    });

    if (!retryResponse.ok) {
      const errText = await retryResponse.text();
      console.error(`[sms-sender] Twilio fallback error for tenant ${tenantId}:`, errText);
      return { success: false, error: errText, channel };
    }

    const retryResult = await retryResponse.json();
    console.log(`[sms-sender] SMS sent via ${channel} (direct) for tenant ${tenantId}: ${retryResult.sid}`);
    return { success: true, twilioSid: retryResult.sid, channel };
  }

  if (!smsResponse.ok) {
    const errText = await smsResponse.text();
    console.error(`[sms-sender] Twilio error for tenant ${tenantId}:`, errText);
    return { success: false, error: errText, channel };
  }

  const result = await smsResponse.json();
  const actualFrom = messagingServiceSid ? null : fromNumber;
  const isGlobalFallback = actualFrom === Deno.env.get("TWILIO_FROM_NUMBER");
  console.log(`[sms-sender] SMS sent via ${channel} for tenant ${tenantId}: ${result.sid}${isGlobalFallback ? " (global fallback)" : ""}`);

  // If we used the global fallback number, record the routing so inbound replies
  // to the fallback can be matched back to this tenant.
  if (isGlobalFallback) {
    try {
      await supabase.from("sms_fallback_routes").upsert(
        {
          fallback_number: actualFrom!,
          customer_phone: to,
          tenant_id: tenantId,
          last_sent_at: new Date().toISOString(),
        },
        { onConflict: "fallback_number,customer_phone" }
      );
    } catch (e) {
      console.error(`[sms-sender] Failed to record fallback route:`, e);
    }
  }

  return { success: true, twilioSid: result.sid, channel };
}
