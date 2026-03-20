import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTenantSms } from "../_shared/sms-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReviewRequestPayload {
  customer_id: string;
  job_id?: string;
  booking_id?: string;
  channel?: "sms" | "email" | "both";
}

function generateReviewMessage(
  businessName: string,
  customerName: string,
  googleUrl?: string,
  yelpUrl?: string
): { sms: string; emailSubject: string; emailHtml: string } {
  const firstName = customerName?.split(" ")[0] || "there";

  const sms = `Hi ${firstName}! Thank you for choosing ${businessName}. We'd love to hear about your experience! Please leave us a review: ${googleUrl || yelpUrl || ""}`;

  const emailSubject = `How was your experience with ${businessName}?`;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #111; margin: 0;">${businessName}</h1>
  </div>

  <p>Hi ${firstName},</p>

  <p>Thank you for choosing <strong>${businessName}</strong>! We hope you had a great experience with us.</p>

  <p>Your feedback helps us improve and helps others discover our services. Would you take a moment to share your experience?</p>

  <div style="text-align: center; margin: 30px 0;">
    ${googleUrl ? `
    <a href="${googleUrl}" style="display: inline-block; background: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: 500;">
      Review on Google
    </a>
    ` : ""}
    ${yelpUrl ? `
    <a href="${yelpUrl}" style="display: inline-block; background: #d32323; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: 500;">
      Review on Yelp
    </a>
    ` : ""}
  </div>

  <p style="color: #666; font-size: 14px;">Your review means a lot to us and our team. Thank you for your support!</p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px; text-align: center;">
    ${businessName}<br>
    Thank you for being a valued customer!
  </p>
</body>
</html>
  `;

  return { sms, emailSubject, emailHtml };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: ReviewRequestPayload = await req.json();
    const { customer_id, job_id, booking_id, channel = "both" } = payload;

    if (!customer_id) {
      return new Response(
        JSON.stringify({ error: "customer_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch customer details
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("*, tenant:tenants(id, business_name, phone, email, google_review_url, yelp_review_url)")
      .eq("id", customer_id)
      .single();

    if (customerError || !customer) {
      console.error("Customer not found:", customerError);
      return new Response(
        JSON.stringify({ error: "Customer not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenant = customer.tenant;
    if (!tenant) {
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate review messages
    const { sms, emailSubject, emailHtml } = generateReviewMessage(
      tenant.business_name || "Our Business",
      customer.full_name || "",
      tenant.google_review_url,
      tenant.yelp_review_url
    );

    const results: { sms?: boolean; email?: boolean } = {};

    // Send SMS if requested and customer has phone
    if ((channel === "sms" || channel === "both") && customer.phone_e164) {
      try {
        // Use shared SMS sender which routes through A2P/toll-free/messaging service
        // This avoids sending from blocked local numbers (error 30034)
        const smsResult = await sendTenantSms({
          tenantId: tenant.id,
          to: customer.phone_e164,
          body: sms,
        });

        results.sms = smsResult.success;

        if (!smsResult.success && !smsResult.skipped) {
          console.error("SMS send error:", smsResult.error);
        } else if (smsResult.skipped) {
          console.log(`Review SMS skipped for tenant ${tenant.id}: ${smsResult.reason}`);
          results.sms = false;
        }
      } catch (err) {
        console.error("Error sending SMS:", err);
        results.sms = false;
      }
    }

    // Send email if requested and customer has email
    if ((channel === "email" || channel === "both") && customer.email) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");

      if (resendApiKey) {
        try {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `${tenant.business_name || "Flux Receptionist"} <reviews@send.getfluxdata.com>`,
              to: customer.email,
              subject: emailSubject,
              html: emailHtml,
            }),
          });

          results.email = emailResponse.ok;

          if (!emailResponse.ok) {
            const error = await emailResponse.text();
            console.error("Resend email error:", error);
          }
        } catch (err) {
          console.error("Error sending email:", err);
          results.email = false;
        }
      } else {
        console.log("Resend not configured, email skipped");
        results.email = false;
      }
    }

    // Log the review request
    try {
      await supabase.from("review_requests").insert({
        tenant_id: tenant.id,
        customer_id: customer_id,
        job_id: job_id || null,
        booking_id: booking_id || null,
        channel: channel,
        sms_sent: results.sms || false,
        email_sent: results.email || false,
        sent_at: new Date().toISOString(),
      });
    } catch {
      // Table might not exist, ignore
      console.log("Could not log review request (table may not exist)");
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Review request sent via ${Object.entries(results)
          .filter(([_, sent]) => sent)
          .map(([channel]) => channel)
          .join(" and ") || "no channels (check configuration)"
        }`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending review request:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
