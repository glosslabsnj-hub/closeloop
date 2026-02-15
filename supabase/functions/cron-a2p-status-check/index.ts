import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, errorResponse, corsResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/tenant.ts";

/**
 * cron-a2p-status-check
 * 
 * Runs on a schedule (every 30 minutes) to poll Twilio for A2P brand
 * and campaign approval status. Updates a2p_registrations accordingly.
 * 
 * When a campaign is approved, SMS capabilities become available for that tenant.
 */

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return errorResponse("Twilio credentials not configured", 500);
  }

  const supabase = serviceClient();
  const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  try {
    // ========== TOLL-FREE VERIFICATION CHECK ==========
    const { data: pendingTF } = await supabase
      .from("a2p_registrations")
      .select("id, tenant_id, toll_free_verification_sid")
      .eq("toll_free_verified", false)
      .not("toll_free_verification_sid", "is", null);

    let tfUpdated = 0;
    if (pendingTF?.length) {
      console.log(`[cron-a2p] Checking ${pendingTF.length} pending toll-free verifications`);
      for (const reg of pendingTF) {
        try {
          const tfRes = await fetch(
            `https://messaging.twilio.com/v1/Tollfree/Verifications/${reg.toll_free_verification_sid}`,
            { headers: { Authorization: `Basic ${twilioAuth}` } }
          );
          if (tfRes.ok) {
            const tfData = await tfRes.json();
            console.log(`[cron-a2p] TF verification ${reg.toll_free_verification_sid} status: ${tfData.status}`);
            if (tfData.status === "TWILIO_APPROVED" || tfData.status === "APPROVED") {
              await supabase
                .from("a2p_registrations")
                .update({ toll_free_verified: true })
                .eq("id", reg.id);
              console.log(`[cron-a2p] ✅ Toll-free verified for tenant ${reg.tenant_id}`);
              tfUpdated++;
            }
          }
        } catch (e) {
          console.error(`[cron-a2p] Error checking TF verification ${reg.id}:`, e);
        }
      }
    }

    // ========== 10DLC STATUS CHECK (existing logic) ==========
    const { data: pendingRegs, error: fetchError } = await supabase
      .from("a2p_registrations")
      .select("*")
      .in("status", ["pending_profile", "pending_brand", "pending_campaign"]);

    if (fetchError) {
      console.error("[cron-a2p] Failed to fetch pending registrations:", fetchError);
      return errorResponse("Failed to fetch pending registrations", 500);
    }

    if (!pendingRegs || pendingRegs.length === 0) {
      console.log("[cron-a2p] No pending A2P registrations to check");
      return jsonResponse({ checked: 0, tf_updated: tfUpdated });
    }

    console.log(`[cron-a2p] Checking ${pendingRegs.length} pending A2P registrations`);

    let updated = 0;

    for (const reg of pendingRegs) {
      try {
        // Check Brand Registration status
        if (reg.status === "pending_brand" && reg.brand_sid) {
          const brandRes = await fetch(
            `https://messaging.twilio.com/v1/a2p/BrandRegistrations/${reg.brand_sid}`,
            { headers: { Authorization: `Basic ${twilioAuth}` } }
          );

          if (brandRes.ok) {
            const brandData = await brandRes.json();
            console.log(`[cron-a2p] Brand ${reg.brand_sid} status: ${brandData.status}, score: ${brandData.brand_score}`);

            if (brandData.status === "APPROVED") {
              await supabase.from("a2p_registrations").update({
                brand_score: brandData.brand_score,
                status: reg.campaign_sid ? "pending_campaign" : "pending_brand",
              }).eq("id", reg.id);

              if (!reg.messaging_service_sid || !reg.campaign_sid) {
                console.log(`[cron-a2p] Brand approved for tenant ${reg.tenant_id}, triggering next registration steps`);
                const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
                await fetch(`${SUPABASE_URL}/functions/v1/register-a2p-10dlc`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                  },
                  body: JSON.stringify({ tenant_id: reg.tenant_id }),
                });
              }
              updated++;
            } else if (brandData.status === "FAILED") {
              await supabase.from("a2p_registrations").update({
                status: "failed",
                failure_reason: `Brand registration failed: ${brandData.failure_reason || "Unknown reason"}`,
                brand_score: brandData.brand_score,
              }).eq("id", reg.id);
              updated++;
            }
          }
        }

        // Check Campaign status
        if (reg.status === "pending_campaign" && reg.campaign_sid && reg.messaging_service_sid) {
          const campaignRes = await fetch(
            `https://messaging.twilio.com/v1/Services/${reg.messaging_service_sid}/UsAppToPerson/${reg.campaign_sid}`,
            { headers: { Authorization: `Basic ${twilioAuth}` } }
          );

          if (campaignRes.ok) {
            const campaignData = await campaignRes.json();
            console.log(`[cron-a2p] Campaign ${reg.campaign_sid} status: ${campaignData.campaign_status}`);

            if (campaignData.campaign_status === "VERIFIED") {
              console.log(`[cron-a2p] 🎉 Campaign APPROVED for tenant ${reg.tenant_id}! SMS is now active.`);
              await supabase.from("a2p_registrations").update({
                status: "approved",
                failure_reason: null,
              }).eq("id", reg.id);
              updated++;
            } else if (campaignData.campaign_status === "FAILED") {
              await supabase.from("a2p_registrations").update({
                status: "failed",
                failure_reason: `Campaign failed: ${campaignData.failure_reason || "Rejected by carrier"}`,
              }).eq("id", reg.id);
              updated++;
            }
          }
        }

        // Check Customer Profile status (for pending_profile)
        if (reg.status === "pending_profile" && reg.customer_profile_sid) {
          const profileRes = await fetch(
            `https://trusthub.twilio.com/v1/CustomerProfiles/${reg.customer_profile_sid}`,
            { headers: { Authorization: `Basic ${twilioAuth}` } }
          );

          if (profileRes.ok) {
            const profileData = await profileRes.json();
            console.log(`[cron-a2p] Profile ${reg.customer_profile_sid} status: ${profileData.status}`);

            if (profileData.status === "twilio-approved") {
              const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
              await fetch(`${SUPABASE_URL}/functions/v1/register-a2p-10dlc`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({ tenant_id: reg.tenant_id }),
              });
              updated++;
            } else if (profileData.status === "twilio-rejected") {
              await supabase.from("a2p_registrations").update({
                status: "failed",
                failure_reason: `Customer Profile rejected: ${profileData.failure_reason || "Review failed"}`,
              }).eq("id", reg.id);
              updated++;
            }
          }
        }
      } catch (regErr) {
        console.error(`[cron-a2p] Error checking registration ${reg.id}:`, regErr);
      }
    }

    console.log(`[cron-a2p] Checked ${pendingRegs.length} registrations, updated ${updated}, TF updated ${tfUpdated}`);
    return jsonResponse({ checked: pendingRegs.length, updated, tf_updated: tfUpdated });
  } catch (error) {
    console.error("[cron-a2p] Error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error", 500);
  }
});
