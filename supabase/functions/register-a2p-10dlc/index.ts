import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, errorResponse, corsResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/tenant.ts";

/**
 * register-a2p-10dlc
 * 
 * Orchestrates the full Twilio A2P 10DLC registration pipeline for a tenant.
 * Called automatically after number provisioning succeeds.
 * 
 * Steps:
 * 1. Create Secondary Customer Profile (TrustHub)
 * 2. Create Brand Registration
 * 3. Create Messaging Service + link phone number
 * 4. Create Campaign (UsAppToPerson)
 * 
 * Each step updates the a2p_registrations table with SIDs and status.
 */

interface A2PRequest {
  tenant_id: string;
  phone_number_sid?: string; // Twilio phone number SID to add to messaging service
  phone_e164?: string; // The actual phone number
}

// Map our entity types to Twilio's expected values
const ENTITY_TYPE_MAP: Record<string, string> = {
  sole_proprietorship: "Sole Proprietorship",
  llc: "Limited Liability Corporation",
  corporation: "Corporation",
  partnership: "Partnership",
  non_profit: "Non-profit Corporation",
};

// Map industry to Twilio vertical
function mapIndustryToVertical(industrySlug: string): string {
  const verticalMap: Record<string, string> = {
    // Service
    "plumber": "PROFESSIONAL",
    "electrician": "PROFESSIONAL",
    "hvac": "PROFESSIONAL",
    "landscaping": "PROFESSIONAL",
    "cleaning": "PROFESSIONAL",
    "auto-repair": "AUTOMOTIVE",
    "auto-detailing": "AUTOMOTIVE",
    // Medical
    "dental": "HEALTHCARE",
    "medical-clinic": "HEALTHCARE",
    "veterinary": "HEALTHCARE",
    "chiropractor": "HEALTHCARE",
    // Food
    "restaurant": "FOOD_AND_BEVERAGE",
    "pizza": "FOOD_AND_BEVERAGE",
    "catering": "FOOD_AND_BEVERAGE",
    // Dispatch
    "towing": "TRANSPORTATION",
    "moving": "TRANSPORTATION",
    "courier": "TRANSPORTATION",
  };
  return verticalMap[industrySlug] || "PROFESSIONAL";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_ISV_PROFILE_SID = Deno.env.get("TWILIO_ISV_PROFILE_SID"); // Primary ISV Business Profile SID
  const TWILIO_A2P_POLICY_SID = Deno.env.get("TWILIO_A2P_POLICY_SID"); // A2P TrustHub policy SID
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return errorResponse("Twilio credentials not configured", 500);
  }

  const supabase = serviceClient();
  const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  try {
    const { tenant_id, phone_number_sid, phone_e164 }: A2PRequest = await req.json();
    if (!tenant_id) return errorResponse("tenant_id is required");

    console.log(`[register-a2p] Starting A2P registration for tenant ${tenant_id}`);

    // Fetch A2P registration data
    const { data: a2p, error: a2pError } = await supabase
      .from("a2p_registrations")
      .select("*")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (a2pError || !a2p) {
      console.error("[register-a2p] No A2P registration found:", a2pError);
      return errorResponse("No A2P registration data found for tenant");
    }

    // Fetch tenant for industry info
    const { data: tenant } = await supabase
      .from("tenants")
      .select("industry, business_name")
      .eq("id", tenant_id)
      .single();

    // ========== STEP 1: Create Secondary Customer Profile ==========
    if (!a2p.customer_profile_sid) {
      console.log("[register-a2p] Step 1: Creating Customer Profile...");

      await updateStatus(supabase, tenant_id, "pending_profile");

      // 1a. Create the Customer Profile
      const profileRes = await twilioPost(
        `https://trusthub.twilio.com/v1/CustomerProfiles`,
        {
          FriendlyName: `${a2p.legal_business_name || tenant?.business_name} - A2P`,
          Email: a2p.contact_email || "",
          PolicySid: TWILIO_A2P_POLICY_SID || "RNdfbf3fae0e1107f8aded0e7cead80bf5", // Default A2P Messaging policy
          StatusCallback: `${SUPABASE_URL}/functions/v1/a2p-status-webhook`,
        },
        twilioAuth
      );

      if (!profileRes.ok) {
        const err = await profileRes.text();
        console.error("[register-a2p] Customer Profile creation failed:", err);
        await updateStatus(supabase, tenant_id, "failed", `Customer Profile failed: ${err}`);
        return errorResponse(`Customer Profile creation failed: ${err}`, 500);
      }

      const profileData = await profileRes.json();
      const customerProfileSid = profileData.sid;
      console.log(`[register-a2p] Customer Profile created: ${customerProfileSid}`);

      // 1b. Create EndUser resource with business info
      const endUserRes = await twilioPost(
        `https://trusthub.twilio.com/v1/EndUsers`,
        {
          FriendlyName: a2p.legal_business_name || tenant?.business_name || "",
          Type: "customer_profile_business_information",
          "Attributes": JSON.stringify({
            business_name: a2p.legal_business_name || tenant?.business_name,
            business_identity: ENTITY_TYPE_MAP[a2p.entity_type || "llc"] || "Limited Liability Corporation",
            business_type: mapIndustryToVertical(tenant?.industry || ""),
            business_registration_identifier: (a2p.ein || "").replace(/-/g, ""),
            business_registration_number: (a2p.ein || "").replace(/-/g, ""),
            business_regions_of_operation: "US",
            website_url: a2p.website_url || "",
            social_media_profile_urls: "",
            business_industry: mapIndustryToVertical(tenant?.industry || ""),
          }),
        },
        twilioAuth
      );

      if (endUserRes.ok) {
        const endUserData = await endUserRes.json();
        // 1c. Attach EndUser to Customer Profile
        await twilioPost(
          `https://trusthub.twilio.com/v1/CustomerProfiles/${customerProfileSid}/EntityAssignments`,
          { ObjectSid: endUserData.sid },
          twilioAuth
        );
      }

      // 1d. Create address and attach
      const addressRes = await twilioPost(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Addresses.json`,
        {
          FriendlyName: a2p.legal_business_name || "",
          CustomerName: a2p.legal_business_name || "",
          Street: a2p.street_address || "",
          City: a2p.city || "",
          Region: a2p.state || "",
          PostalCode: a2p.zip_code || "",
          IsoCountry: "US",
        },
        twilioAuth
      );

      if (addressRes.ok) {
        const addressData = await addressRes.json();
        // Create supporting doc for address
        const docRes = await twilioPost(
          `https://trusthub.twilio.com/v1/SupportingDocuments`,
          {
            FriendlyName: "Business Address",
            Type: "customer_profile_address",
            "Attributes": JSON.stringify({
              address_sids: addressData.sid,
            }),
          },
          twilioAuth
        );
        if (docRes.ok) {
          const docData = await docRes.json();
          await twilioPost(
            `https://trusthub.twilio.com/v1/CustomerProfiles/${customerProfileSid}/EntityAssignments`,
            { ObjectSid: docData.sid },
            twilioAuth
          );
        }
      }

      // 1e. Create authorized representative
      const repRes = await twilioPost(
        `https://trusthub.twilio.com/v1/EndUsers`,
        {
          FriendlyName: `${a2p.contact_first_name || ""} ${a2p.contact_last_name || ""}`.trim(),
          Type: "authorized_representative_1",
          "Attributes": JSON.stringify({
            first_name: a2p.contact_first_name || "",
            last_name: a2p.contact_last_name || "",
            email: a2p.contact_email || "",
            phone_number: a2p.contact_phone || "",
            business_title: "Owner",
            job_position: "Owner",
          }),
        },
        twilioAuth
      );

      if (repRes.ok) {
        const repData = await repRes.json();
        await twilioPost(
          `https://trusthub.twilio.com/v1/CustomerProfiles/${customerProfileSid}/EntityAssignments`,
          { ObjectSid: repData.sid },
          twilioAuth
        );
      }

      // 1f. Submit Customer Profile for evaluation
      await twilioPost(
        `https://trusthub.twilio.com/v1/CustomerProfiles/${customerProfileSid}/Evaluations`,
        { PolicySid: TWILIO_A2P_POLICY_SID || "RNdfbf3fae0e1107f8aded0e7cead80bf5" },
        twilioAuth
      );

      // Save profile SID
      await supabase
        .from("a2p_registrations")
        .update({ customer_profile_sid: customerProfileSid })
        .eq("tenant_id", tenant_id);
    }

    // ========== STEP 2: Create Brand Registration ==========
    const { data: refreshedA2p } = await supabase
      .from("a2p_registrations")
      .select("*")
      .eq("tenant_id", tenant_id)
      .single();

    if (refreshedA2p?.customer_profile_sid && !refreshedA2p.brand_sid) {
      console.log("[register-a2p] Step 2: Creating Brand Registration...");
      await updateStatus(supabase, tenant_id, "pending_brand");

      const brandRes = await twilioPost(
        `https://messaging.twilio.com/v1/a2p/BrandRegistrations`,
        {
          CustomerProfileBundleSid: refreshedA2p.customer_profile_sid,
          A2PProfileBundleSid: TWILIO_ISV_PROFILE_SID || refreshedA2p.customer_profile_sid,
        },
        twilioAuth
      );

      if (!brandRes.ok) {
        const err = await brandRes.text();
        console.error("[register-a2p] Brand Registration failed:", err);
        await updateStatus(supabase, tenant_id, "failed", `Brand Registration failed: ${err}`);
        return errorResponse(`Brand Registration failed: ${err}`, 500);
      }

      const brandData = await brandRes.json();
      console.log(`[register-a2p] Brand Registration created: ${brandData.sid}, status: ${brandData.status}`);

      await supabase
        .from("a2p_registrations")
        .update({
          brand_sid: brandData.sid,
          brand_score: brandData.brand_score || null,
        })
        .eq("tenant_id", tenant_id);
    }

    // ========== STEP 3: Create Messaging Service ==========
    const { data: a2pStep3 } = await supabase
      .from("a2p_registrations")
      .select("*")
      .eq("tenant_id", tenant_id)
      .single();

    if (a2pStep3?.brand_sid && !a2pStep3.messaging_service_sid) {
      console.log("[register-a2p] Step 3: Creating Messaging Service...");

      const msgSvcRes = await twilioPost(
        `https://messaging.twilio.com/v1/Services`,
        {
          FriendlyName: `CloseLoop - ${a2p.legal_business_name || tenant?.business_name || tenant_id.substring(0, 8)}`,
          InboundRequestUrl: `${SUPABASE_URL}/functions/v1/twilio-sms-webhook`,
          InboundMethod: "POST",
          UseInboundWebhookOnNumber: "false",
          FallbackToLongCode: "true",
          StickySender: "true",
        },
        twilioAuth
      );

      if (!msgSvcRes.ok) {
        const err = await msgSvcRes.text();
        console.error("[register-a2p] Messaging Service creation failed:", err);
        await updateStatus(supabase, tenant_id, "failed", `Messaging Service failed: ${err}`);
        return errorResponse(`Messaging Service failed: ${err}`, 500);
      }

      const msgSvcData = await msgSvcRes.json();
      console.log(`[register-a2p] Messaging Service created: ${msgSvcData.sid}`);

      // Add the phone number to the messaging service
      const phoneSid = phone_number_sid || a2pStep3.contact_phone;
      if (phoneSid) {
        // Look up the phone number SID from assistant_settings if not provided
        let actualPhoneSid = phone_number_sid;
        if (!actualPhoneSid) {
          const { data: settings } = await supabase
            .from("assistant_settings")
            .select("twilio_phone_sid")
            .eq("tenant_id", tenant_id)
            .maybeSingle();
          actualPhoneSid = settings?.twilio_phone_sid || undefined;
        }

        if (actualPhoneSid) {
          const addPhoneRes = await twilioPost(
            `https://messaging.twilio.com/v1/Services/${msgSvcData.sid}/PhoneNumbers`,
            { PhoneNumberSid: actualPhoneSid },
            twilioAuth
          );
          if (!addPhoneRes.ok) {
            console.error("[register-a2p] Failed to add phone to messaging service:", await addPhoneRes.text());
          } else {
            console.log(`[register-a2p] Phone ${actualPhoneSid} added to messaging service`);
          }
        }
      }

      await supabase
        .from("a2p_registrations")
        .update({ messaging_service_sid: msgSvcData.sid })
        .eq("tenant_id", tenant_id);
    }

    // ========== STEP 4: Create Campaign ==========
    const { data: a2pStep4 } = await supabase
      .from("a2p_registrations")
      .select("*")
      .eq("tenant_id", tenant_id)
      .single();

    if (a2pStep4?.messaging_service_sid && a2pStep4?.brand_sid && !a2pStep4.campaign_sid) {
      console.log("[register-a2p] Step 4: Creating Campaign...");
      await updateStatus(supabase, tenant_id, "pending_campaign");

      const businessName = a2p.legal_business_name || tenant?.business_name || "Business";

      const campaignRes = await twilioPost(
        `https://messaging.twilio.com/v1/Services/${a2pStep4.messaging_service_sid}/UsAppToPerson`,
        {
          BrandRegistrationSid: a2pStep4.brand_sid,
          Description: `${businessName} sends appointment confirmations, reminders, and follow-ups to customers who have booked services or made inquiries.`,
          MessageFlow: `Customers provide their phone number when booking an appointment or calling ${businessName}. They receive automated appointment confirmations, reminders, and follow-up messages. Customers can reply STOP to opt out at any time.`,
          // Use MIXED for the broadest use case coverage
          UsAppToPersonUsecase: "MIXED",
          HasEmbeddedLinks: "true",
          HasEmbeddedPhone: "true",
          // Sample messages that represent actual use
          MessageSamples: JSON.stringify([
            `Hi! Your appointment with ${businessName} is confirmed for tomorrow at 2:00 PM. Reply STOP to opt out.`,
            `Reminder: You have an appointment with ${businessName} in 1 hour. See you soon! Reply STOP to unsubscribe.`,
            `Thank you for visiting ${businessName}! We'd love your feedback. Reply STOP to opt out.`,
          ]),
          OptInMessage: `By providing your phone number, you agree to receive appointment-related text messages from ${businessName}. Message and data rates may apply. Reply STOP to opt out.`,
          OptOutMessage: `You have been unsubscribed from ${businessName} messages. You will no longer receive texts. Reply START to re-subscribe.`,
          HelpMessage: `For help, contact ${businessName} directly or reply HELP for more info. Message and data rates may apply.`,
          OptInKeywords: "START,YES,SUBSCRIBE",
          OptOutKeywords: "STOP,CANCEL,UNSUBSCRIBE,END,QUIT",
          HelpKeywords: "HELP,INFO",
        },
        twilioAuth
      );

      if (!campaignRes.ok) {
        const err = await campaignRes.text();
        console.error("[register-a2p] Campaign creation failed:", err);
        await updateStatus(supabase, tenant_id, "failed", `Campaign registration failed: ${err}`);
        return errorResponse(`Campaign registration failed: ${err}`, 500);
      }

      const campaignData = await campaignRes.json();
      console.log(`[register-a2p] Campaign created: ${campaignData.sid}, status: ${campaignData.campaign_status}`);

      await supabase
        .from("a2p_registrations")
        .update({ campaign_sid: campaignData.sid })
        .eq("tenant_id", tenant_id);

      // If campaign is immediately approved (rare but possible for high-trust brands)
      if (campaignData.campaign_status === "VERIFIED") {
        await updateStatus(supabase, tenant_id, "approved");
      } else {
        await updateStatus(supabase, tenant_id, "pending_campaign");
      }
    }

    console.log(`[register-a2p] Registration pipeline completed for tenant ${tenant_id}`);
    
    // Return current state
    const { data: finalState } = await supabase
      .from("a2p_registrations")
      .select("status, brand_sid, campaign_sid, messaging_service_sid")
      .eq("tenant_id", tenant_id)
      .single();

    return jsonResponse({
      success: true,
      status: finalState?.status,
      brand_sid: finalState?.brand_sid,
      campaign_sid: finalState?.campaign_sid,
      messaging_service_sid: finalState?.messaging_service_sid,
    });
  } catch (error) {
    console.error("[register-a2p] Error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error", 500);
  }
});

// Helper: POST to Twilio API with Basic Auth
async function twilioPost(url: string, params: Record<string, string>, auth: string): Promise<Response> {
  const body = new URLSearchParams(params);
  return await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
}

// Helper: Update a2p_registrations status
async function updateStatus(supabase: ReturnType<typeof serviceClient>, tenantId: string, status: string, failureReason?: string) {
  const update: Record<string, unknown> = { status };
  if (failureReason) update.failure_reason = failureReason;
  
  await supabase
    .from("a2p_registrations")
    .update(update)
    .eq("tenant_id", tenantId);
}
