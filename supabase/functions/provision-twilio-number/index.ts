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

interface ProvisionLog {
  tenant_id: string;
  action: string;
  phone_e164?: string;
  twilio_sid?: string;
  error?: string;
  details?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Initialize Supabase client with service role
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  // Helper to log provisioning events for debugging
  async function logProvision(log: ProvisionLog) {
    console.log("[provision-twilio-number]", JSON.stringify(log));
    try {
      await supabase.from("audit_logs").insert({
        tenant_id: log.tenant_id,
        action: `twilio_provision.${log.action}`,
        meta_json: {
          phone_e164: log.phone_e164,
          twilio_sid: log.twilio_sid,
          error: log.error,
          ...log.details,
        },
      });
    } catch (e) {
      console.error("Failed to write provision audit log:", e);
    }
  }

  try {
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

    await logProvision({ tenant_id, action: "started", details: { area_code, number_type } });

    // ========== IDEMPOTENCY CHECK: Does THIS tenant already have a number? ==========
    // Check phone_numbers table FIRST (source of truth)
    // Only consider "provisioned" status as active - "replaced" numbers should be ignored
    const { data: existingPhoneNumber, error: phoneNumberError } = await supabase
      .from("phone_numbers")
      .select("id, phone_e164, twilio_sid, status")
      .eq("tenant_id", tenant_id)
      .eq("purpose", "forwarding")
      .eq("status", "provisioned")
      .maybeSingle();

    if (phoneNumberError) {
      console.error("Error checking phone_numbers:", phoneNumberError);
      await logProvision({ tenant_id, action: "db_error", error: phoneNumberError.message });
    }

    if (existingPhoneNumber?.twilio_sid) {
      console.log(`[provision] Tenant ${tenant_id} already has a number: ${existingPhoneNumber.phone_e164}`);
      await logProvision({ 
        tenant_id, 
        action: "already_provisioned", 
        phone_e164: existingPhoneNumber.phone_e164,
        twilio_sid: existingPhoneNumber.twilio_sid,
      });
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

    // Also check assistant_settings for legacy data (but ONLY for this tenant)
    const { data: existingSettings, error: settingsError } = await supabase
      .from("assistant_settings")
      .select("closeloop_number, twilio_phone_sid")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching assistant settings:", settingsError);
    }

    if (existingSettings?.twilio_phone_sid) {
      console.log(`[provision] Tenant ${tenant_id} has legacy number: ${existingSettings.closeloop_number}`);
      await logProvision({ 
        tenant_id, 
        action: "already_provisioned_legacy",
        phone_e164: existingSettings.closeloop_number ?? undefined,
        twilio_sid: existingSettings.twilio_phone_sid,
      });
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

    // ========== SUBSCRIPTION CHECK ==========
    const { data: hasSubscription } = await supabase
      .rpc("has_active_subscription", { _tenant_id: tenant_id });

    if (!hasSubscription) {
      await logProvision({ tenant_id, action: "no_subscription" });
      return new Response(
        JSON.stringify({ error: "Active subscription required to provision a phone number" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== CRITICAL: Check if the phone number is ALREADY assigned to another tenant ==========
    // This prevents reassigning an existing Twilio number to a new tenant
    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    // Check if we already have this Twilio number assigned to ANY tenant
    const existingNumbersUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json?Limit=10`;
    console.log("[provision] Checking existing Twilio numbers in account...");
    
    const existingResponse = await fetch(existingNumbersUrl, {
      headers: { Authorization: `Basic ${twilioAuth}` },
    });
    
    if (existingResponse.ok) {
      const existingData = await existingResponse.json();
      const existingNumbers = existingData.incoming_phone_numbers || [];
      
      console.log(`[provision] Found ${existingNumbers.length} Twilio numbers in account`);
      
      for (const number of existingNumbers) {
        // Check if this Twilio number is already assigned to a DIFFERENT tenant
        const { data: assignedNumber } = await supabase
          .from("phone_numbers")
          .select("id, tenant_id")
          .eq("twilio_sid", number.sid)
          .maybeSingle();
        
        if (assignedNumber && assignedNumber.tenant_id !== tenant_id) {
          console.log(`[provision] Twilio number ${number.phone_number} (${number.sid}) is already assigned to tenant ${assignedNumber.tenant_id}`);
          // Skip this number - it belongs to another tenant
          continue;
        }
        
        // If this number has no assignment OR is assigned to this tenant, we can use it
        if (!assignedNumber) {
          // This is an unassigned Twilio number in the account - could be from a pool or previous deletion
          // In production with multiple numbers, we'd want a pool management system
          // For now, skip unassigned numbers to force new purchase per tenant
          console.log(`[provision] Twilio number ${number.phone_number} is unassigned - skipping to purchase new`);
          // In a pool scenario, you could assign it here
        }
      }
    }
    
    // ========== PURCHASE A NEW NUMBER ==========
    console.log(`[provision] Searching for available numbers for tenant ${tenant_id}...`);

    // Search for available phone numbers
    let searchUrl: string;
    if (number_type === "toll_free") {
      searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/US/TollFree.json?Limit=1`;
    } else {
      const areaCodeParam = area_code ? `&AreaCode=${area_code}` : "";
      searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/US/Local.json?Limit=1&VoiceEnabled=true&SmsEnabled=true${areaCodeParam}`;
    }

    console.log(`[provision] Searching: ${searchUrl}`);

    const searchResponse = await fetch(searchUrl, {
      headers: { Authorization: `Basic ${twilioAuth}` },
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("[provision] Twilio search error:", searchResponse.status, errorText);
      await logProvision({ tenant_id, action: "search_failed", error: errorText });
      return new Response(
        JSON.stringify({ error: "Failed to search for available numbers", details: errorText }),
        { status: searchResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchData = await searchResponse.json();

    if (!searchData.available_phone_numbers || searchData.available_phone_numbers.length === 0) {
      console.log("[provision] No numbers available with specified criteria");
      await logProvision({ tenant_id, action: "no_numbers_available" });
      return new Response(
        JSON.stringify({ error: "No phone numbers available in the requested area" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const selectedNumber = searchData.available_phone_numbers[0];
    console.log(`[provision] Selected number: ${selectedNumber.phone_number} for tenant ${tenant_id}`);

    // Purchase the number
    const purchaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`;
    
    // Configure webhook URL to point to twilio-inbound edge function
    const voiceUrl = `${SUPABASE_URL}/functions/v1/twilio-inbound`;

    const purchaseBody = new URLSearchParams({
      PhoneNumber: selectedNumber.phone_number,
      VoiceUrl: voiceUrl,
      VoiceMethod: "POST",
      FriendlyName: `Flux - ${tenant_id.substring(0, 8)}`,
    });

    console.log(`[provision] Purchasing number: ${selectedNumber.phone_number} for tenant ${tenant_id}`);

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
      console.error("[provision] Twilio purchase error:", purchaseResponse.status, errorText);
      await logProvision({ tenant_id, action: "purchase_failed", error: errorText });
      return new Response(
        JSON.stringify({ error: "Failed to purchase phone number", details: errorText }),
        { status: purchaseResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const purchaseData = await purchaseResponse.json();
    console.log(`[provision] SUCCESS: Purchased ${purchaseData.phone_number} (SID: ${purchaseData.sid}) for tenant ${tenant_id}`);

    // Format friendly name
    const friendlyNumber = formatPhoneNumber(purchaseData.phone_number);

    // ========== WRITE TO DATABASE (TENANT-SCOPED) ==========
    
    // 1. Insert into phone_numbers table - use INSERT (not upsert on phone_e164 which could overwrite another tenant!)
    const { error: insertError } = await supabase
      .from("phone_numbers")
      .insert({
        tenant_id: tenant_id,  // CRITICAL: Always include tenant_id
        phone_e164: purchaseData.phone_number,
        twilio_sid: purchaseData.sid,
        purpose: "forwarding",
        status: "provisioned",
      });

    if (insertError) {
      console.error("[provision] Error inserting into phone_numbers:", insertError);
      await logProvision({ 
        tenant_id, 
        action: "db_insert_failed", 
        phone_e164: purchaseData.phone_number,
        twilio_sid: purchaseData.sid,
        error: insertError.message,
      });
      // Continue - we still want to update assistant_settings
    } else {
      console.log(`[provision] Inserted phone_numbers record for tenant ${tenant_id}`);
    }

    // 2. Update assistant_settings - use UPDATE with WHERE tenant_id (not upsert that could create issues)
    // First check if row exists
    const { data: existingRow } = await supabase
      .from("assistant_settings")
      .select("tenant_id")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (existingRow) {
      // UPDATE existing row
      const { error: updateError } = await supabase
        .from("assistant_settings")
        .update({
          closeloop_number: purchaseData.phone_number,
          twilio_phone_sid: purchaseData.sid,
          twilio_provisioned_at: new Date().toISOString(),
          phone_connected: true,
          connect_status: "awaiting_first_call",
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenant_id);  // CRITICAL: Always scope by tenant_id

      if (updateError) {
        console.error("[provision] Error updating assistant_settings:", updateError);
        await logProvision({ 
          tenant_id, 
          action: "settings_update_failed", 
          phone_e164: purchaseData.phone_number,
          error: updateError.message,
        });
      } else {
        console.log(`[provision] Updated assistant_settings for tenant ${tenant_id}`);
      }
    } else {
      // INSERT new row (should not normally happen as onboarding creates this)
      const { error: insertSettingsError } = await supabase
        .from("assistant_settings")
        .insert({
          tenant_id: tenant_id,
          closeloop_number: purchaseData.phone_number,
          twilio_phone_sid: purchaseData.sid,
          twilio_provisioned_at: new Date().toISOString(),
          phone_connected: true,
          connect_status: "awaiting_first_call",
        });

      if (insertSettingsError) {
        console.error("[provision] Error inserting assistant_settings:", insertSettingsError);
        await logProvision({ 
          tenant_id, 
          action: "settings_insert_failed", 
          phone_e164: purchaseData.phone_number,
          error: insertSettingsError.message,
        });
      } else {
        console.log(`[provision] Inserted assistant_settings for tenant ${tenant_id}`);
      }
    }

    await logProvision({ 
      tenant_id, 
      action: "local_completed",
      phone_e164: purchaseData.phone_number,
      twilio_sid: purchaseData.sid,
    });

    // ========== TOLL-FREE FALLBACK: Purchase + Verify ==========
    let tollFreeNumber: string | null = null;
    let tollFreeSid: string | null = null;
    try {
      console.log(`[provision] Purchasing toll-free number for SMS fallback...`);

      // Search for toll-free number
      const tfSearchUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/US/TollFree.json?Limit=1`;
      const tfSearchRes = await fetch(tfSearchUrl, {
        headers: { Authorization: `Basic ${twilioAuth}` },
      });

      if (tfSearchRes.ok) {
        const tfSearchData = await tfSearchRes.json();
        if (tfSearchData.available_phone_numbers?.length > 0) {
          const tfSelected = tfSearchData.available_phone_numbers[0];

          // Purchase toll-free number (no voice URL needed — SMS only)
          const tfPurchaseRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${twilioAuth}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                PhoneNumber: tfSelected.phone_number,
                FriendlyName: `Flux TF - ${tenant_id.substring(0, 8)}`,
              }).toString(),
            }
          );

          if (tfPurchaseRes.ok) {
            const tfData = await tfPurchaseRes.json();
            tollFreeNumber = tfData.phone_number;
            tollFreeSid = tfData.sid;
            console.log(`[provision] Toll-free purchased: ${tollFreeNumber}`);

            // Create Messaging Service for toll-free
            const tfMsgSvcRes = await fetch(
              `https://messaging.twilio.com/v1/Services`,
              {
                method: "POST",
                headers: {
                  Authorization: `Basic ${twilioAuth}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                  FriendlyName: `Flux TF - ${tenant_id.substring(0, 8)}`,
                  FallbackToLongCode: "false",
                  StickySender: "true",
                }).toString(),
              }
            );

            let tfMsgSvcSid: string | null = null;
            if (tfMsgSvcRes.ok) {
              const tfMsgSvcData = await tfMsgSvcRes.json();
              tfMsgSvcSid = tfMsgSvcData.sid;

              // Add toll-free number to messaging service
              await fetch(
                `https://messaging.twilio.com/v1/Services/${tfMsgSvcSid}/PhoneNumbers`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Basic ${twilioAuth}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                  body: new URLSearchParams({ PhoneNumberSid: tollFreeSid! }).toString(),
                }
              );
            }

            // Fetch tenant info for TF verification
            const { data: tenantInfo } = await supabase
              .from("tenants")
              .select("name, website_url")
              .eq("id", tenant_id)
              .single();

            const { data: a2pInfo } = await supabase
              .from("a2p_registrations")
              .select("legal_business_name, street_address, city, state, zip_code, contact_email, website_url")
              .eq("tenant_id", tenant_id)
              .maybeSingle();

            // Submit toll-free verification
            let tfVerifSid: string | null = null;
            const bizName = a2pInfo?.legal_business_name || tenantInfo?.name || "Business";
            const bizWebsite = a2pInfo?.website_url || tenantInfo?.website_url || "https://example.com";
            const contactFirstName = a2pInfo?.contact_first_name || "Owner";
            const contactLastName = a2pInfo?.contact_last_name || "Contact";
            const contactEmail = a2pInfo?.contact_email || "support@getfluxdata.com";
            const contactPhone = a2pInfo?.contact_phone || "";

            const tfVerifBody = [
              `TollfreePhoneNumberSid=${encodeURIComponent(tollFreeSid!)}`,
              `BusinessName=${encodeURIComponent(bizName)}`,
              `BusinessWebsite=${encodeURIComponent(bizWebsite)}`,
              `BusinessStreetAddress=${encodeURIComponent(a2pInfo?.street_address || "123 Main St")}`,
              `BusinessCity=${encodeURIComponent(a2pInfo?.city || "New York")}`,
              `BusinessStateProvinceRegion=${encodeURIComponent(a2pInfo?.state || "NY")}`,
              `BusinessPostalCode=${encodeURIComponent(a2pInfo?.zip_code || "10001")}`,
              `BusinessCountry=US`,
              `BusinessContactFirstName=${encodeURIComponent(contactFirstName)}`,
              `BusinessContactLastName=${encodeURIComponent(contactLastName)}`,
              `BusinessContactEmail=${encodeURIComponent(contactEmail)}`,
              contactPhone ? `BusinessContactPhone=${encodeURIComponent(contactPhone)}` : "",
              `NotificationEmail=${encodeURIComponent(contactEmail)}`,
              `UseCaseCategories=${encodeURIComponent("CUSTOMER_CARE")}`,
              `UseCaseSummary=${encodeURIComponent(`${bizName} sends appointment confirmations, reminders, and follow-up messages to customers who have booked services.`)}`,
              `ProductionMessageSample=${encodeURIComponent(`Hi! Your appointment with ${bizName} is confirmed for tomorrow at 2:00 PM. Reply STOP to opt out.`)}`,
              `OptInType=VERBAL`,
              `OptInImageUrls=${encodeURIComponent(bizWebsite)}`,
              `MessageVolume=100`,
            ].filter(Boolean).join("&");

            const tfVerifRes = await fetch(
              `https://messaging.twilio.com/v1/Tollfree/Verifications`,
              {
                method: "POST",
                headers: {
                  Authorization: `Basic ${twilioAuth}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: tfVerifBody,
              }
            );

            if (tfVerifRes.ok) {
              const tfVerifData = await tfVerifRes.json();
              tfVerifSid = tfVerifData.sid;
              console.log(`[provision] Toll-free verification submitted: ${tfVerifSid}`);
            } else {
              console.error(`[provision] TF verification failed:`, await tfVerifRes.text());
            }

            // Save toll-free data to a2p_registrations
            await supabase
              .from("a2p_registrations")
              .update({
                toll_free_phone_e164: tollFreeNumber,
                toll_free_phone_sid: tollFreeSid,
                toll_free_messaging_service_sid: tfMsgSvcSid,
                toll_free_verification_sid: tfVerifSid,
              })
              .eq("tenant_id", tenant_id);

            await logProvision({
              tenant_id,
              action: "toll_free_completed",
              phone_e164: tollFreeNumber!,
              twilio_sid: tollFreeSid!,
              details: { messaging_service_sid: tfMsgSvcSid, verification_sid: tfVerifSid },
            });
          }
        }
      }
    } catch (tfErr) {
      console.error("[provision] Toll-free provisioning error (non-fatal):", tfErr);
      await logProvision({ tenant_id, action: "toll_free_error", error: String(tfErr) });
    }

    // ========== SERVER-SIDE A2P REGISTRATION ==========
    try {
      console.log(`[provision] Triggering server-side A2P registration for tenant ${tenant_id}...`);
      await fetch(`${SUPABASE_URL}/functions/v1/register-a2p-10dlc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          tenant_id,
          phone_number_sid: purchaseData.sid,
          phone_e164: purchaseData.phone_number,
        }),
      });
      console.log(`[provision] A2P registration triggered for tenant ${tenant_id}`);
    } catch (a2pErr) {
      console.error("[provision] A2P registration trigger error (non-fatal):", a2pErr);
      await logProvision({ tenant_id, action: "a2p_trigger_error", error: String(a2pErr) });
    }

    console.log(`[provision] COMPLETE: Provisioned ${purchaseData.phone_number} + TF fallback for tenant ${tenant_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        phone_number: purchaseData.phone_number,
        phone_sid: purchaseData.sid,
        friendly_name: friendlyNumber,
        toll_free_number: tollFreeNumber,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[provision] Error:", error);
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
