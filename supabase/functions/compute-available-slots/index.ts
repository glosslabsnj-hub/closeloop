import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single();

    if (!tenantUser) {
      return new Response(JSON.stringify({ error: "No tenant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      start_date,
      end_date,
      duration_minutes = 60,
      buffer_minutes = 0,
    } = await req.json();

    // Get tenant settings for business hours
    const { data: tenant } = await supabase
      .from("tenants")
      .select("hours_json, timezone, min_lead_hours, max_advance_days")
      .eq("id", tenantUser.tenant_id)
      .single();

    const businessHours = tenant?.hours_json || null;

    // Call the database function
    const { data: slots, error: slotsError } = await supabase.rpc(
      "fn_compute_available_slots",
      {
        _tenant_id: tenantUser.tenant_id,
        _start_date: start_date,
        _end_date: end_date,
        _duration_minutes: duration_minutes,
        _buffer_minutes: buffer_minutes,
        _business_hours: businessHours,
      }
    );

    if (slotsError) {
      console.error("Slots error:", slotsError);
      return new Response(JSON.stringify({ error: slotsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        slots: slots || [],
        count: slots?.length || 0,
        date_range: { start_date, end_date },
        settings: {
          duration_minutes,
          buffer_minutes,
          min_lead_hours: tenant?.min_lead_hours,
          max_advance_days: tenant?.max_advance_days,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in compute-available-slots:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
