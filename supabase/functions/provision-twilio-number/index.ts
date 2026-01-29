import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ProvisionRequest {
  tenant_id: string;
  area_code?: string;
  number_type?: "local" | "toll_free";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.error("Twilio credentials not configured");
      return new Response(
        JSON.stringify({ error: "Twilio credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Supabase credentials not configured");
      return new Response(
        JSON.stringify({ error: "Supabase credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { tenant_id, area_code, number_type = "local" }: ProvisionRequest = await req.json();

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "tenant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if tenant already has a number in phone_numbers table (idempotency)
    const { data: existingPhoneNumber, error: phoneNumberError } = await supabase
      .from("phone_numbers")
      .select("phone_e164, twilio_sid")
      .eq("tenant_id", tenant_id)
      .eq("purpose", "forwarding")
      .maybeSingle();

    if (phoneNumberError) {
      console.error("Error checking phone_numbers:", phoneNumberError);
    }

    if (existingPhoneNumber?.twilio_sid) {
      console.log(`Tenant ${tenant_id} already has a Twilio number: ${existingPhoneNumber.phone_e164}`);
      return new Response(
        JSON.stringify({
          success: true,
          phone_number: existingPhoneNumber.phone_e164,
          phone_sid: existingPhoneNumber.twilio_sid,
          friendly_name: formatPhoneNumber(existingPhoneNumber.phone_e164),
          already_provisioned: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also check assistant_settings for legacy data
    const { data: existingSettings, error: settingsError } = await supabase
      .from("assistant_settings")
      .select("closeloop_number, twilio_phone_sid")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching assistant settings:", settingsError);
    }

    if (existingSettings?.twilio_phone_sid) {
      console.log(`Tenant ${tenant_id} already has a Twilio number (legacy): ${existingSettings.closeloop_number}`);
      return new Response(
        JSON.stringify({
          success: true,
          phone_number: existingSettings.closeloop_number,
          phone_sid: existingSettings.twilio_phone_sid,
          friendly_name: formatPhoneNumber(existingSettings.closeloop_number || ""),
          already_provisioned: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify tenant has an active subscription
    const { data: hasSubscription } = await supabase
      .rpc("has_active_subscription", { _tenant_id: tenant_id });

    if (!hasSubscription) {
      return new Response(
        JSON.stringify({ error: "Active subscription required to provision a phone number" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    // FIRST: Check if there's an existing number in the Twilio account we can reuse
    // This is critical for trial accounts that only allow one number
    const existingNumbersUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json?Limit=1`;
    console.log("Checking for existing Twilio numbers in account...");
    
    const existingResponse = await fetch(existingNumbersUrl, {
      headers: { Authorization: `Basic ${twilioAuth}` },
    });
    
    if (existingResponse.ok) {
      const existingData = await existingResponse.json();
      if (existingData.incoming_phone_numbers?.length > 0) {
        const existingNumber = existingData.incoming_phone_numbers[0];
        console.log(`Found existing Twilio number: ${existingNumber.phone_number}, assigning to tenant ${tenant_id}`);
        
        // Update the webhook URL on the existing number
        const updateUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers/${existingNumber.sid}.json`;
        const updateResponse = await fetch(updateUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${twilioAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            VoiceUrl: `${SUPABASE_URL}/functions/v1/twilio-inbound`,
            VoiceMethod: "POST",
            FriendlyName: `CloseLoop - ${tenant_id.substring(0, 8)}`,
          }).toString(),
        });
        
        if (updateResponse.ok) {
          console.log("Updated webhook URL on existing number");
        } else {
          console.error("Failed to update webhook URL:", await updateResponse.text());
        }
        
        const friendlyNumber = formatPhoneNumber(existingNumber.phone_number);
        
        // Insert into phone_numbers table (upsert on phone_e164 if it exists)
        const { error: insertError } = await supabase.from("phone_numbers").upsert({
          tenant_id: tenant_id,
          phone_e164: existingNumber.phone_number,
          twilio_sid: existingNumber.sid,
          purpose: "forwarding",
          status: "provisioned",
        }, { onConflict: "phone_e164" });
        
        if (insertError) {
          console.error("Error inserting into phone_numbers:", insertError);
        }
        
        // Update assistant_settings with awaiting_first_call status
        const { error: settingsUpdateError } = await supabase.from("assistant_settings").upsert({
          tenant_id: tenant_id,
          closeloop_number: existingNumber.phone_number,
          twilio_phone_sid: existingNumber.sid,
          twilio_provisioned_at: new Date().toISOString(),
          forwarding_phone_e164: existingNumber.phone_number,
          phone_connected: true,
          connect_status: "awaiting_first_call",
          updated_at: new Date().toISOString(),
        }, { onConflict: "tenant_id" });
        
        if (settingsUpdateError) {
          console.error("Error updating assistant_settings:", settingsUpdateError);
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            phone_number: existingNumber.phone_number,
            phone_sid: existingNumber.sid,
            friendly_name: friendlyNumber,
            reused_existing: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    console.log("No existing numbers found in account, searching for available numbers...");

    // Search for available phone numbers
    let searchUrl: string;
    if (number_type === "toll_free") {
      searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/US/TollFree.json?Limit=1`;
    } else {
      const areaCodeParam = area_code ? `&AreaCode=${area_code}` : "";
      searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/US/Local.json?Limit=1&VoiceEnabled=true&SmsEnabled=true${areaCodeParam}`;
    }

    console.log(`Searching for available numbers: ${searchUrl}`);

    const searchResponse = await fetch(searchUrl, {
      headers: {
        Authorization: `Basic ${twilioAuth}`,
      },
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("Twilio search error:", searchResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to search for available numbers", details: errorText }),
        { status: searchResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchData = await searchResponse.json();

    if (!searchData.available_phone_numbers || searchData.available_phone_numbers.length === 0) {
      console.log("No numbers available with specified criteria");
      return new Response(
        JSON.stringify({ error: "No phone numbers available in the requested area" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const selectedNumber = searchData.available_phone_numbers[0];
    console.log(`Selected number: ${selectedNumber.phone_number}`);

    // Purchase the number
    const purchaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`;
    
    // Configure webhook URL to point to twilio-inbound edge function
    const voiceUrl = `${SUPABASE_URL}/functions/v1/twilio-inbound`;

    const purchaseBody = new URLSearchParams({
      PhoneNumber: selectedNumber.phone_number,
      VoiceUrl: voiceUrl,
      VoiceMethod: "POST",
      FriendlyName: `CloseLoop - ${tenant_id.substring(0, 8)}`,
    });

    console.log(`Purchasing number: ${selectedNumber.phone_number}`);

    const purchaseResponse = await fetch(purchaseUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${twilioAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: purchaseBody.toString(),
    });

    if (!purchaseResponse.ok) {
      const errorText = await purchaseResponse.text();
      console.error("Twilio purchase error:", purchaseResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to purchase phone number", details: errorText }),
        { status: purchaseResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const purchaseData = await purchaseResponse.json();
    console.log(`Successfully purchased: ${purchaseData.phone_number} (SID: ${purchaseData.sid})`);

    // Format friendly name
    const friendlyNumber = formatPhoneNumber(purchaseData.phone_number);

    // Insert into phone_numbers table
    const { error: insertError } = await supabase
      .from("phone_numbers")
      .insert({
        tenant_id: tenant_id,
        phone_e164: purchaseData.phone_number,
        twilio_sid: purchaseData.sid,
        purpose: "forwarding",
        status: "provisioned",
      });

    if (insertError) {
      console.error("Error inserting into phone_numbers:", insertError);
      // Continue - we still want to update assistant_settings
    }

    // Update assistant_settings with the new number and awaiting_first_call status
    const { error: updateError } = await supabase
      .from("assistant_settings")
      .upsert({
        tenant_id: tenant_id,
        closeloop_number: purchaseData.phone_number,
        twilio_phone_sid: purchaseData.sid,
        twilio_provisioned_at: new Date().toISOString(),
        forwarding_phone_e164: purchaseData.phone_number,
        phone_connected: true,
        connect_status: "awaiting_first_call",
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "tenant_id",
      });

    if (updateError) {
      console.error("Error updating assistant settings:", updateError);
      return new Response(
        JSON.stringify({ 
          error: "Number purchased but failed to save to database", 
          phone_number: purchaseData.phone_number,
          phone_sid: purchaseData.sid,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully provisioned ${purchaseData.phone_number} for tenant ${tenant_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        phone_number: purchaseData.phone_number,
        phone_sid: purchaseData.sid,
        friendly_name: friendlyNumber,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in provision-twilio-number:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    const areaCode = cleaned.substring(1, 4);
    const prefix = cleaned.substring(4, 7);
    const line = cleaned.substring(7, 11);
    return `(${areaCode}) ${prefix}-${line}`;
  }
  return phone;
}
