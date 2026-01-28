import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenant_id, event_type, quantity = 1 } = await req.json();
    
    if (!tenant_id || !event_type) {
      return new Response(
        JSON.stringify({ error: "tenant_id and event_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["voice_minute", "sms_segment"].includes(event_type)) {
      return new Response(
        JSON.stringify({ error: "event_type must be 'voice_minute' or 'sms_segment'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();

    // Find current billing period
    const { data: usageRecord, error: lookupError } = await supabase
      .from("subscription_usage")
      .select("*")
      .eq("tenant_id", tenant_id)
      .lte("billing_period_start", now)
      .gte("billing_period_end", now)
      .maybeSingle();

    if (lookupError) {
      console.error("Error looking up usage:", lookupError);
      throw lookupError;
    }

    let recordId: string;

    if (!usageRecord) {
      // No current period - create one (30 day period)
      const periodStart = new Date();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      const { data: newRecord, error: insertError } = await supabase
        .from("subscription_usage")
        .insert({
          tenant_id,
          billing_period_start: periodStart.toISOString(),
          billing_period_end: periodEnd.toISOString(),
          voice_minutes_used: event_type === "voice_minute" ? quantity : 0,
          sms_segments_used: event_type === "sms_segment" ? quantity : 0,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating usage record:", insertError);
        throw insertError;
      }

      recordId = newRecord.id;
      console.log(`Created new usage record for tenant ${tenant_id}`);
    } else {
      // Update existing record
      const updateField = event_type === "voice_minute" 
        ? { voice_minutes_used: usageRecord.voice_minutes_used + quantity }
        : { sms_segments_used: usageRecord.sms_segments_used + quantity };

      const { error: updateError } = await supabase
        .from("subscription_usage")
        .update({
          ...updateField,
          updated_at: now,
        })
        .eq("id", usageRecord.id);

      if (updateError) {
        console.error("Error updating usage:", updateError);
        throw updateError;
      }

      recordId = usageRecord.id;
      console.log(`Updated usage for tenant ${tenant_id}: ${event_type} +${quantity}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        record_id: recordId,
        event_type,
        quantity,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in track-usage:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
