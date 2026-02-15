import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return new Response(JSON.stringify({ error: "Twilio credentials missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { tenant_id } = await req.json();

  // Fetch A2P record
  const { data: a2p, error: a2pErr } = await supabase
    .from("a2p_registrations")
    .select("*")
    .eq("tenant_id", tenant_id)
    .single();

  if (a2pErr || !a2p) {
    return new Response(JSON.stringify({ error: "No A2P record found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!a2p.toll_free_phone_sid) {
    return new Response(JSON.stringify({ error: "No toll-free phone SID" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const bizName = a2p.legal_business_name || "Business";
  const bizWebsite = a2p.website_url || "https://example.com";

  // Build form body manually to handle array params
  const formParts = [
    `TollfreePhoneNumberSid=${encodeURIComponent(a2p.toll_free_phone_sid)}`,
    `BusinessName=${encodeURIComponent(bizName)}`,
    `BusinessWebsite=${encodeURIComponent(bizWebsite)}`,
    `BusinessStreetAddress=${encodeURIComponent(a2p.street_address || "123 Main St")}`,
    `BusinessCity=${encodeURIComponent(a2p.city || "Hamilton")}`,
    `BusinessStateProvinceRegion=${encodeURIComponent(a2p.state || "NJ")}`,
    `BusinessPostalCode=${encodeURIComponent(a2p.zip_code || "08610")}`,
    `BusinessCountry=US`,
    `BusinessContactFirstName=${encodeURIComponent(a2p.contact_first_name || "Jack")}`,
    `BusinessContactLastName=${encodeURIComponent(a2p.contact_last_name || "Angelini")}`,
    `BusinessContactEmail=${encodeURIComponent(a2p.contact_email || "support@closeloop.ai")}`,
    `BusinessContactPhone=${encodeURIComponent(a2p.contact_phone || "+16097318641")}`,
    `NotificationEmail=${encodeURIComponent(a2p.contact_email || "support@closeloop.ai")}`,
    `UseCaseCategories=${encodeURIComponent("CUSTOMER_CARE")}`,
    `UseCaseSummary=${encodeURIComponent(`${bizName} sends appointment confirmations, reminders, and follow-up messages to customers who have booked services.`)}`,
    `ProductionMessageSample=${encodeURIComponent(`Hi! Your appointment with ${bizName} is confirmed for tomorrow at 2:00 PM. Reply STOP to opt out.`)}`,
    `OptInType=VERBAL`,
    `OptInImageUrls=https://closeloop.ai/verbal-opt-in`,
    `MessageVolume=100`,
  ].join("&");

  // Submit toll-free verification
  const tfVerifRes = await fetch(
    `https://messaging.twilio.com/v1/Tollfree/Verifications`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${twilioAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formParts,
    }
  );

  const tfVerifText = await tfVerifRes.text();
  console.log(`[submit-tf-verification] Twilio response (${tfVerifRes.status}):`, tfVerifText);

  if (!tfVerifRes.ok) {
    return new Response(JSON.stringify({ error: "Twilio TF verification failed", details: tfVerifText }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tfVerifData = JSON.parse(tfVerifText);

  // Update A2P record with verification SID
  await supabase.from("a2p_registrations").update({
    toll_free_verification_sid: tfVerifData.sid,
    status: "pending_brand",
    updated_at: new Date().toISOString(),
  }).eq("tenant_id", tenant_id);

  return new Response(JSON.stringify({
    success: true,
    verification_sid: tfVerifData.sid,
    status: tfVerifData.status,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
