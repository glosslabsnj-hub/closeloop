import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/sendEmail.ts";
import { sendTenantSms } from "../_shared/sms-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { estimate_id, action, signature_data } = await req.json();

    if (!estimate_id) {
      return new Response(
        JSON.stringify({ error: "estimate_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!action || !["accept", "decline"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "action must be 'accept' or 'decline'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the client's IP address for signature verification
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] ||
                     req.headers.get("x-real-ip") ||
                     "unknown";

    // First, fetch the estimate to check its current status
    const { data: estimate, error: fetchError } = await supabase
      .from("estimates")
      .select("id, status, valid_until")
      .eq("id", estimate_id)
      .single();

    if (fetchError || !estimate) {
      return new Response(
        JSON.stringify({ error: "Estimate not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if estimate can be acted upon
    const canRespond = estimate.status === "sent" || estimate.status === "viewed";
    if (!canRespond) {
      return new Response(
        JSON.stringify({ error: `Cannot ${action} an estimate with status '${estimate.status}'` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (estimate.valid_until && new Date(estimate.valid_until) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This estimate has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      status: action === "accept" ? "accepted" : "declined",
      updated_at: new Date().toISOString(),
    };

    // Add signature data if accepting
    if (action === "accept") {
      if (!signature_data) {
        return new Response(
          JSON.stringify({ error: "Signature is required to accept the estimate" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      updateData.signature_data = signature_data;
      updateData.signature_ip = clientIp;
      updateData.signed_at = new Date().toISOString();
      updateData.accepted_terms = true;
    }

    // Update the estimate
    const { error: updateError } = await supabase
      .from("estimates")
      .update(updateData)
      .eq("id", estimate_id);

    if (updateError) {
      console.error("Error updating estimate:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update estimate" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Notify business owner about acceptance/decline
    try {
      const { data: fullEstimate } = await supabase
        .from("estimates")
        .select("tenant_id, estimate_number, customer:customers(full_name, phone_e164, email), line_items_json, total_cents")
        .eq("id", estimate_id)
        .single();

      if (fullEstimate?.tenant_id) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("name")
          .eq("id", fullEstimate.tenant_id)
          .single();

        const { data: deliverySettings } = await supabase
          .from("booking_delivery_settings")
          .select("notify_email, notify_phone")
          .eq("tenant_id", fullEstimate.tenant_id)
          .maybeSingle();

        const customerName = fullEstimate.customer?.full_name || "A customer";
        const estNum = fullEstimate.estimate_number || estimate_id.slice(0, 8);
        const total = fullEstimate.total_cents ? `$${(fullEstimate.total_cents / 100).toFixed(2)}` : "";
        const actionLabel = action === "accept" ? "ACCEPTED" : "DECLINED";

        // Email notification
        if (deliverySettings?.notify_email) {
          await sendEmail({
            to: deliverySettings.notify_email,
            subject: `Estimate #${estNum} ${actionLabel} by ${customerName}`,
            businessName: tenant?.name || "Your Business",
            html: `<div style="font-family:sans-serif;max-width:600px;">
              <h2 style="color:${action === "accept" ? "#16a34a" : "#dc2626"};">Estimate ${actionLabel}</h2>
              <p><strong>${customerName}</strong> has ${action === "accept" ? "accepted" : "declined"} estimate #${estNum}${total ? ` (${total})` : ""}.</p>
              ${action === "accept" ? "<p>The customer has signed. You can now schedule the work.</p>" : "<p>Consider following up to address any concerns.</p>"}
              <p style="color:#666;font-size:13px;">Via Flux Receptionist</p>
            </div>`,
          });
        }

        // SMS notification
        if (deliverySettings?.notify_phone) {
          await sendTenantSms({
            tenantId: fullEstimate.tenant_id,
            to: deliverySettings.notify_phone,
            body: `Estimate #${estNum} ${actionLabel} by ${customerName}${total ? ` (${total})` : ""}. ${action === "accept" ? "Customer signed - ready to schedule." : "Follow up recommended."}`,
          });
        }
      }
    } catch (notifyErr) {
      console.error("[estimate-public-action] Notification error (non-fatal):", notifyErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: action === "accept"
          ? "Estimate accepted successfully"
          : "Estimate declined"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in estimate-public-action:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
