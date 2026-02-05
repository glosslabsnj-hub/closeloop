import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // TODO: Send notification to business owner about acceptance/decline

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
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
