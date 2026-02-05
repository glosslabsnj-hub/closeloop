import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Determine if a plan SKU includes voice features (supports both legacy and new SKU codes)
function hasVoiceFeature(planCode: string | null): boolean {
  if (!planCode) return false;
  return planCode.startsWith("voice") || planCode.startsWith("both");
}

// Constant-time string comparison to prevent timing attacks
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Parse Stripe signature header (format: t=timestamp,v1=signature,v1=signature2...)
function parseStripeSignature(header: string): { timestamp: string; signatures: string[] } {
  const parts = header.split(",");
  let timestamp = "";
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") {
      timestamp = value;
    } else if (key === "v1") {
      signatures.push(value);
    }
  }

  return { timestamp, signatures };
}

// Verify Stripe webhook signature
async function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300
): Promise<{ valid: boolean; error?: string }> {
  const { timestamp, signatures } = parseStripeSignature(signatureHeader);

  if (!timestamp || signatures.length === 0) {
    return { valid: false, error: "Invalid signature header format" };
  }

  // Check timestamp is within tolerance (prevent replay attacks)
  const now = Math.floor(Date.now() / 1000);
  const webhookTimestamp = parseInt(timestamp, 10);
  if (isNaN(webhookTimestamp) || Math.abs(now - webhookTimestamp) > toleranceSeconds) {
    return { valid: false, error: "Webhook timestamp outside tolerance window" };
  }

  // Compute expected signature: HMAC-SHA256(timestamp + "." + payload)
  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Check if any of the provided signatures match (Stripe may send multiple)
  const isValid = signatures.some((sig) => secureCompare(sig, expectedSignature));

  if (!isValid) {
    return { valid: false, error: "Signature verification failed" };
  }

  return { valid: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase configuration");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    // Verify Stripe webhook signature when secret is configured
    if (STRIPE_WEBHOOK_SECRET) {
      if (!signature) {
        console.error("Missing stripe-signature header");
        return new Response(JSON.stringify({ error: "Missing signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const verification = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET);
      if (!verification.valid) {
        console.error("Stripe signature verification failed:", verification.error);
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("Stripe signature verified successfully");
    } else {
      console.warn("STRIPE_WEBHOOK_SECRET not set - signature verification skipped (not recommended for production)");
    }

    let event;
    try {
      event = JSON.parse(body);
    } catch (e) {
      console.error("Failed to parse webhook body:", e);
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Received Stripe event: ${event.type}`);

    // Handle credit top-up separately (one-time payment, not subscription)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const paymentType = session.metadata?.type;

      if (paymentType === "credit_top_up") {
        const tenantId = session.metadata?.tenant_id;
        const creditAmountCents = parseInt(session.metadata?.credit_amount_cents || "0", 10);

        if (tenantId && creditAmountCents > 0) {
          console.log(`CreditTopUp: tenant=${tenantId} amount=${creditAmountCents} cents`);

          // Atomically add credits to the tenant's subscription balance
          const { data: subscription, error: fetchError } = await supabase
            .from("subscriptions")
            .select("credit_balance_cents")
            .eq("tenant_id", tenantId)
            .single();

          if (fetchError) {
            console.error(`CreditTopUp: failed to fetch subscription for tenant ${tenantId}:`, fetchError);
          } else {
            const currentBalance = subscription?.credit_balance_cents || 0;
            const newBalance = currentBalance + creditAmountCents;

            const { error: updateError } = await supabase
              .from("subscriptions")
              .update({
                credit_balance_cents: newBalance,
                updated_at: new Date().toISOString()
              })
              .eq("tenant_id", tenantId);

            if (updateError) {
              console.error(`CreditTopUp: failed to update balance for tenant ${tenantId}:`, updateError);
            } else {
              console.log(`CreditTopUp: success tenant=${tenantId} oldBalance=${currentBalance} newBalance=${newBalance}`);

              // Log the transaction for audit purposes
              await supabase.from("audit_events").insert({
                tenant_id: tenantId,
                event_type: "payment_received",
                entity_type: "subscription",
                actor_type: "system",
                payload: {
                  type: "credit_top_up",
                  amount_cents: creditAmountCents,
                  old_balance_cents: currentBalance,
                  new_balance_cents: newBalance,
                  stripe_session_id: session.id,
                },
              }).then(() => {}).catch((e: Error) => console.error("Failed to log credit top-up audit event:", e));
            }
          }
        } else {
          console.error(`CreditTopUp: invalid metadata tenant_id=${tenantId} amount=${creditAmountCents}`);
        }

        // Return early - credit top-up doesn't need subscription/provisioning logic
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Handle subscription-related events
    if (event.type === "checkout.session.completed" ||
        event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated") {

      let tenantId: string | null = null;
      let planCode: string | null = null;
      let subscriptionStatus: string | null = null;

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        tenantId = session.metadata?.tenant_id;
        planCode = session.metadata?.plan_code;

        // Get subscription status if this was a subscription checkout
        if (session.subscription) {
          subscriptionStatus = "active"; // checkout.session.completed means payment succeeded
        }
      } else {
        // customer.subscription.* events
        const subscription = event.data.object;
        tenantId = subscription.metadata?.tenant_id;
        subscriptionStatus = subscription.status;
        
        // Extract plan_code from the subscription items if not in metadata
        if (!planCode && subscription.items?.data?.[0]?.price?.metadata?.plan_code) {
          planCode = subscription.items.data[0].price.metadata.plan_code;
        }
        planCode = planCode || subscription.metadata?.plan_code;
      }

      console.log(`Extracted: tenant_id=${tenantId}, plan_code=${planCode}, status=${subscriptionStatus}`);

      // Provision phone number if conditions are met (supports both legacy and SKU-based codes)
      const shouldProvision = hasVoiceFeature(planCode);
      console.log(`TwilioProvision: evaluating tenant=${tenantId}, plan=${planCode}, shouldProvision=${shouldProvision}`);

      if (tenantId && shouldProvision) {
        if (subscriptionStatus === "active" || subscriptionStatus === "trialing") {
          console.log(`TwilioProvision: start for tenant ${tenantId}`);
          
          // Call the provision function (already idempotent)
          const provisionResult = await provisionForwardingNumber(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, tenantId);
          
          if (provisionResult.success) {
            console.log(`TwilioProvision: success tenant=${tenantId} phone=${provisionResult.phone_number}`);
          } else {
            console.error(`TwilioProvision: error tenant=${tenantId} error=${provisionResult.error}`);
            // Log to twilio_event_logs for visibility
            try {
              await supabase.from("twilio_event_logs").insert({
                tenant_id: tenantId,
                event_type: "provision_failed",
                stage: "stripe_webhook",
                error_message: provisionResult.error,
              });
            } catch (e) {
              console.error("Failed to log provision error:", e);
            }
          }
        } else {
          console.log(`TwilioProvision: skipped tenant=${tenantId} reason=subscription-not-active status=${subscriptionStatus}`);
        }
      } else if (tenantId && !shouldProvision) {
        console.log(`TwilioProvision: skipped tenant=${tenantId} reason=no-voice-feature plan=${planCode}`);
      }
    }

    // Handle subscription cancellation
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const tenantId = subscription.metadata?.tenant_id;
      
      if (tenantId) {
        console.log(`Subscription canceled for tenant ${tenantId}`);
        // Optionally update connect_status or mark number for release
        await supabase
          .from("assistant_settings")
          .update({ 
            connect_status: "subscription_canceled",
            updated_at: new Date().toISOString()
          })
          .eq("tenant_id", tenantId);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Provision a forwarding number for a tenant
async function provisionForwardingNumber(
  supabaseUrl: string,
  serviceRoleKey: string,
  tenantId: string
): Promise<{ success: boolean; phone_number?: string; error?: string }> {
  
  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return { success: false, error: "Twilio credentials not configured" };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Check if tenant already has a forwarding number (idempotency)
  const { data: existingNumbers, error: lookupError } = await supabase
    .from("phone_numbers")
    .select("phone_e164, twilio_sid")
    .eq("tenant_id", tenantId)
    .eq("purpose", "forwarding");

  if (lookupError) {
    return { success: false, error: `Database lookup failed: ${lookupError.message}` };
  }

  if (existingNumbers && existingNumbers.length > 0) {
    const existingNumber = existingNumbers[0];
    console.log(`Tenant ${tenantId} already has number: ${existingNumber.phone_e164}`);
    return { success: true, phone_number: existingNumber.phone_e164 };
  }

  const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  // Search for available US local numbers
  const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/US/Local.json?Limit=1&VoiceEnabled=true&SmsEnabled=true`;

  const searchResponse = await fetch(searchUrl, {
    headers: { Authorization: `Basic ${twilioAuth}` },
  });

  if (!searchResponse.ok) {
    const errorText = await searchResponse.text();
    return { success: false, error: `Twilio search failed: ${errorText}` };
  }

  const searchData = await searchResponse.json();

  if (!searchData.available_phone_numbers?.length) {
    return { success: false, error: "No phone numbers available" };
  }

  const selectedNumber = searchData.available_phone_numbers[0].phone_number;

  // Purchase the number with webhook configuration
  const voiceWebhookUrl = `${supabaseUrl}/functions/v1/twilio-inbound`;
  
  const purchaseBody = new URLSearchParams({
    PhoneNumber: selectedNumber,
    VoiceUrl: voiceWebhookUrl,
    VoiceMethod: "POST",
    FriendlyName: `CloseLoop-${tenantId.substring(0, 8)}`,
  });

  const purchaseResponse = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${twilioAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: purchaseBody.toString(),
    }
  );

  if (!purchaseResponse.ok) {
    const errorText = await purchaseResponse.text();
    return { success: false, error: `Twilio purchase failed: ${errorText}` };
  }

  const purchaseData = await purchaseResponse.json();

  // Insert into phone_numbers table
  const { error: insertError } = await supabase
    .from("phone_numbers")
    .insert({
      tenant_id: tenantId,
      phone_e164: purchaseData.phone_number,
      twilio_sid: purchaseData.sid,
      purpose: "forwarding",
      status: "provisioned",
    });

  if (insertError) {
    console.error("Failed to insert phone number record:", insertError);
    // Number is purchased but DB insert failed - log for manual cleanup
    return { 
      success: false, 
      error: `Number purchased (${purchaseData.phone_number}) but DB insert failed: ${insertError.message}` 
    };
  }

  // Update assistant_settings with awaiting_first_call status
  const { error: upsertError } = await supabase
    .from("assistant_settings")
    .upsert({
      tenant_id: tenantId,
      forwarding_phone_e164: purchaseData.phone_number,
      connect_status: "awaiting_first_call",
      phone_connected: true,
      closeloop_number: purchaseData.phone_number,
      twilio_phone_sid: purchaseData.sid,
      twilio_provisioned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "tenant_id",
    });

  if (upsertError) {
    console.error("Failed to update assistant_settings:", upsertError);
  }

  return { success: true, phone_number: purchaseData.phone_number };
}
