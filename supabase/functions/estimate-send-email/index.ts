import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EstimateLineItem {
  name: string;
  description?: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function generateEmailHtml(
  estimate: {
    estimate_number: string;
    title: string | null;
    line_items: EstimateLineItem[];
    total_cents: number;
    valid_until: string | null;
  },
  tenant: { business_name: string | null; phone: string | null; email: string | null },
  customerName: string,
  viewUrl: string
): string {
  const lineItemsHtml = estimate.line_items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.total_cents)}</td>
      </tr>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Estimate from ${tenant.business_name || "Our Company"}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${tenant.business_name || "Your Estimate"}</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${customerName},</p>

    <p style="margin-bottom: 20px;">Thank you for your interest! Here's your estimate for <strong>${estimate.title || "our services"}</strong>.</p>

    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Estimate #${estimate.estimate_number}</p>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left; font-weight: 600;">Item</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Qty</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 16px 12px; text-align: right; font-weight: 700; font-size: 18px;">Total:</td>
            <td style="padding: 16px 12px; text-align: right; font-weight: 700; font-size: 18px; color: #059669;">${formatCurrency(estimate.total_cents)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    ${estimate.valid_until ? `<p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">This estimate is valid until ${new Date(estimate.valid_until).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.</p>` : ""}

    <div style="text-align: center; margin: 30px 0;">
      <a href="${viewUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">View & Accept Estimate</a>
    </div>

    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you have any questions, feel free to reach out:</p>
    <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
      ${tenant.phone ? `📞 ${tenant.phone}` : ""}
      ${tenant.phone && tenant.email ? " | " : ""}
      ${tenant.email ? `✉️ ${tenant.email}` : ""}
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
      This estimate was sent by ${tenant.business_name || "our company"}.
      <br>If you didn't request this estimate, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
  `;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { estimate_id } = await req.json();

    if (!estimate_id) {
      return new Response(
        JSON.stringify({ error: "estimate_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch estimate with tenant and customer info
    const { data: estimate, error: fetchError } = await supabase
      .from("estimates")
      .select(`
        id,
        estimate_number,
        title,
        status,
        line_items,
        total_cents,
        valid_until,
        tenant_id,
        tenant:tenants(business_name, phone, email),
        customer:customers(full_name, email, phone_e164)
      `)
      .eq("id", estimate_id)
      .single();

    if (fetchError || !estimate) {
      console.error("Error fetching estimate:", fetchError);
      return new Response(
        JSON.stringify({ error: "Estimate not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if customer has email
    const customerEmail = estimate.customer?.email;
    if (!customerEmail) {
      return new Response(
        JSON.stringify({ error: "Customer does not have an email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the app URL from environment or use default
    const appUrl = Deno.env.get("APP_URL") || "https://closeloop.lovable.app";
    const viewUrl = `${appUrl}/estimate/${estimate.id}`;

    // Generate email HTML
    const emailHtml = generateEmailHtml(
      {
        estimate_number: estimate.estimate_number,
        title: estimate.title,
        line_items: estimate.line_items as EstimateLineItem[],
        total_cents: estimate.total_cents || 0,
        valid_until: estimate.valid_until,
      },
      estimate.tenant || { business_name: null, phone: null, email: null },
      estimate.customer?.full_name || "Valued Customer",
      viewUrl
    );

    // Send email using Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not set, logging email instead of sending");
      console.log("Would send email to:", customerEmail);
      console.log("Subject:", `Your Estimate from ${estimate.tenant?.business_name || "Our Company"}`);

      // Still update the estimate status even without sending
      await supabase
        .from("estimates")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", estimate_id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Email logged (RESEND_API_KEY not configured)",
          view_url: viewUrl
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send via Resend
    const fromEmail = estimate.tenant?.email || "noreply@closeloop.ai";
    const fromName = estimate.tenant?.business_name || "CloseLoop";

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [customerEmail],
        subject: `Your Estimate from ${estimate.tenant?.business_name || "Our Company"} - ${estimate.estimate_number}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errorData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update estimate status to sent
    await supabase
      .from("estimates")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", estimate_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Estimate sent successfully",
        view_url: viewUrl
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in estimate-send-email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
