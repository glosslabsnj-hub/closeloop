import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

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

    // In production, verify Stripe signature
    // For now, we'll parse the event directly
    // TODO: Add proper Stripe signature verification when STRIPE_WEBHOOK_SECRET is set
    
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

    // Handle relevant events
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

      // Provision phone number if conditions are met
      if (tenantId && planCode && ["voice", "both"].includes(planCode)) {
        if (subscriptionStatus === "active" || subscriptionStatus === "trialing") {
          console.log(`Triggering phone provisioning for tenant ${tenantId}`);
          
          // Call the provision function
          const provisionResult = await provisionForwardingNumber(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, tenantId);
          
          if (provisionResult.success) {
            console.log(`Successfully provisioned number for tenant ${tenantId}: ${provisionResult.phone_number}`);
          } else {
            console.error(`Failed to provision number for tenant ${tenantId}: ${provisionResult.error}`);
          }
        }
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

  // Update assistant_settings
  const { error: upsertError } = await supabase
    .from("assistant_settings")
    .upsert({
      tenant_id: tenantId,
      forwarding_phone_e164: purchaseData.phone_number,
      connect_status: "provisioned",
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
