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
    const { estimate_id } = await req.json();

    if (!estimate_id) {
      return new Response(
        JSON.stringify({ error: "estimate_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for public access
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
        subtotal_cents,
        tax_rate_percent,
        tax_cents,
        discount_cents,
        total_cents,
        valid_until,
        customer_notes,
        terms_and_conditions,
        created_at,
        viewed_at,
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

    // Mark as viewed if status is "sent" and not yet viewed
    if (estimate.status === "sent" && !estimate.viewed_at) {
      await supabase
        .from("estimates")
        .update({
          status: "viewed",
          viewed_at: new Date().toISOString(),
        })
        .eq("id", estimate_id);

      estimate.status = "viewed";
      estimate.viewed_at = new Date().toISOString();
    }

    return new Response(
      JSON.stringify({ estimate }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in estimate-public-view:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
