import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SuggestRequest {
  tenant_id: string;
  date: string; // YYYY-MM-DD in tenant's local timezone
  duration_minutes?: number;
  service_id?: string;
  preference?: "earliest" | "earlier_than" | "later_than";
  reference_time?: string; // HH:MM in 24h format
  max_results?: number;
}

interface SlotResult {
  start: string; // ISO timestamp
  end: string;
  display: string; // Human-readable like "9:00 AM"
  local_date: string;
}

/**
 * availability-suggest: Returns deterministic slot suggestions for AI agent
 * 
 * This is the canonical endpoint the voice agent uses when asking about availability.
 * It enforces timezone-correct, duration-aware slot computation.
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const body: SuggestRequest = await req.json();
    const {
      tenant_id,
      date,
      duration_minutes,
      service_id,
      preference = "earliest",
      reference_time,
      max_results = 5,
    } = body;

    if (!tenant_id || !date) {
      return new Response(
        JSON.stringify({ error: "tenant_id and date are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get tenant settings
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("timezone, hours_json, appointment_buffer_minutes, min_lead_hours, max_advance_days")
      .eq("id", tenant_id)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const timezone = tenant.timezone || "America/New_York";
    const bufferMinutes = tenant.appointment_buffer_minutes || 15;

    // Determine duration from service if provided
    let finalDuration = duration_minutes || 60;
    let serviceName: string | null = null;
    
    if (service_id) {
      const { data: service } = await supabase
        .from("services")
        .select("duration_minutes, name")
        .eq("id", service_id)
        .single();
      
      if (service) {
        finalDuration = service.duration_minutes;
        serviceName = service.name;
      }
    }

    console.log(`[availability-suggest] Tenant: ${tenant_id}, Date: ${date}, Duration: ${finalDuration}min, Preference: ${preference}`);

    // Call the timezone-aware database function
    const { data: slots, error: slotsError } = await supabase.rpc(
      "fn_compute_available_slots",
      {
        _tenant_id: tenant_id,
        _start_date: date,
        _end_date: date,
        _duration_minutes: finalDuration,
        _buffer_minutes: bufferMinutes,
        _business_hours: tenant.hours_json,
      }
    );

    if (slotsError) {
      console.error("Slots computation error:", slotsError);
      return new Response(
        JSON.stringify({ error: "Failed to compute availability", details: slotsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform and filter slots based on preference
    let filteredSlots = (slots || []) as Array<{
      slot_start: string;
      slot_end: string;
      slot_date: string;
      slot_time_local: string;
    }>;

    // Apply preference filter
    if (preference === "earlier_than" && reference_time) {
      // Filter slots that start before the reference time
      filteredSlots = filteredSlots.filter((slot) => {
        const slotTime = new Date(slot.slot_start);
        const refParts = reference_time.split(":");
        const refHour = parseInt(refParts[0], 10);
        const refMin = parseInt(refParts[1] || "0", 10);
        
        // Compare in local timezone context
        const slotLocal = new Date(slotTime.toLocaleString("en-US", { timeZone: timezone }));
        const slotHour = slotLocal.getHours();
        const slotMin = slotLocal.getMinutes();
        
        return (slotHour < refHour) || (slotHour === refHour && slotMin < refMin);
      });
    } else if (preference === "later_than" && reference_time) {
      // Filter slots that start after the reference time
      filteredSlots = filteredSlots.filter((slot) => {
        const slotTime = new Date(slot.slot_start);
        const refParts = reference_time.split(":");
        const refHour = parseInt(refParts[0], 10);
        const refMin = parseInt(refParts[1] || "0", 10);
        
        const slotLocal = new Date(slotTime.toLocaleString("en-US", { timeZone: timezone }));
        const slotHour = slotLocal.getHours();
        const slotMin = slotLocal.getMinutes();
        
        return (slotHour > refHour) || (slotHour === refHour && slotMin > refMin);
      });
    }

    // Limit results
    const limitedSlots = filteredSlots.slice(0, max_results);

    // Format slots for response
    const formattedSlots: SlotResult[] = limitedSlots.map((slot) => ({
      start: slot.slot_start,
      end: slot.slot_end,
      display: slot.slot_time_local,
      local_date: slot.slot_date,
    }));

    const elapsedMs = Date.now() - startTime;

    // Build explanation if no slots found
    let explanation: string | null = null;
    if (formattedSlots.length === 0) {
      if (preference === "earlier_than" && reference_time) {
        explanation = `No earlier openings available for a ${finalDuration}-minute ${serviceName || "appointment"} before ${reference_time}. The earliest available time has already been suggested.`;
      } else if (filteredSlots.length === 0 && slots && slots.length === 0) {
        explanation = `No availability on ${date} for a ${finalDuration}-minute ${serviceName || "appointment"}. The day may be fully booked or outside business hours.`;
      } else {
        explanation = `No slots match the requested criteria.`;
      }
    }

    console.log(`[availability-suggest] Found ${formattedSlots.length} slots in ${elapsedMs}ms`);

    return new Response(
      JSON.stringify({
        slots: formattedSlots,
        count: formattedSlots.length,
        total_available: slots?.length || 0,
        date,
        duration_minutes: finalDuration,
        service_name: serviceName,
        timezone,
        preference,
        explanation,
        computed_in_ms: elapsedMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in availability-suggest:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
