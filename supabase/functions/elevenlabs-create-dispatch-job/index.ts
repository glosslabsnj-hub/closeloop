/**
 * elevenlabs-create-dispatch-job: ElevenLabs tool endpoint for creating dispatch jobs
 * during voice calls.
 * 
 * Called by ElevenLabs agent when it has collected enough dispatch intake info:
 * - customer_name, customer_phone
 * - pickup_address, dropoff_address (optional)
 * - vehicle_info, service_type, urgency
 * - notes
 * 
 * ENHANCED: Now calculates and stores distance & pricing data by calling check_service_area
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeCustomerName, isPlaceholderName, shouldUpdateCustomerName } from "../_shared/sanitizeName.ts";
import { normalizePhoneE164 } from "../_shared/phoneNormalize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateDispatchJobRequest {
  // Required
  pickup_address: string;
  service_type: string;
  // Dispatch mode specific
  vehicle_info?: string;
  dropoff_address?: string;
  drivable?: boolean | string;
  // Common
  customer_name?: string;
  customer_phone?: string;
  urgency?: "emergency" | "urgent" | "standard" | "same_day" | "scheduled";
  notes?: string;
  // ElevenLabs context
  tenant_id?: string;
  conversation_id?: string;
}

interface CreateDispatchJobResponse {
  success: boolean;
  job_number?: string;
  dispatch_id?: string;
  message: string;
  error?: string;
}

interface ServiceAreaResponse {
  in_area: boolean;
  distance_miles: number | null;
  tow_distance_miles: number | null;
  eta_minutes: number | null;
  eta_range: string;
  service_tier: string;
  pricing_note: string;
  distance_basis_used: string;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  price_breakdown: {
    base_price?: number;
    per_mile_rate?: number;
    distance_charge?: number;
    vehicle_modifier?: number;
    urgency_modifier?: number;
    total_estimate?: number;
    total?: number;
    description?: string;
  } | null;
}

// Use shared phone normalization
const normalizePhone = normalizePhoneE164;

// Generate job number
function generateJobNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DSP-${dateStr}-${random}`;
}

// Map urgency to priority
function urgencyToPriority(urgency?: string): "low" | "normal" | "high" | "urgent" {
  switch (urgency) {
    case "emergency": return "urgent";
    case "urgent": return "high";
    case "same_day": 
    case "standard": return "normal";
    case "scheduled": return "low";
    default: return "normal";
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body: CreateDispatchJobRequest = await req.json();
    console.log("[elevenlabs-create-dispatch-job] Request:", JSON.stringify({
      ...body,
      customer_phone: body.customer_phone ? "[REDACTED]" : undefined,
    }));

    const {
      pickup_address,
      service_type,
      vehicle_info,
      dropoff_address,
      drivable,
      customer_name,
      customer_phone,
      urgency,
      notes,
      tenant_id,
      conversation_id
    } = body;

    // Validate required fields
    if (!pickup_address) {
      console.error("[elevenlabs-create-dispatch-job] Missing pickup_address");
      return new Response(
        JSON.stringify({
          success: false,
          message: "I need your pickup location to send help. What's the address or cross streets where you need us?",
          error: "pickup_address is required"
        } as CreateDispatchJobResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!service_type) {
      console.error("[elevenlabs-create-dispatch-job] Missing service_type");
      return new Response(
        JSON.stringify({
          success: false,
          message: "What type of service do you need? Tow, jumpstart, lockout, tire change, or something else?",
          error: "service_type is required"
        } as CreateDispatchJobResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve tenant_id
    let resolvedTenantId: string | null = tenant_id || null;
    let sessionId: string | null = null;
    let sessionCallerPhone: string | null = null;
    
    // Try to get tenant from conversation_id if not provided
    if (!resolvedTenantId && conversation_id) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id, id, caller_phone")
        .eq("elevenlabs_conversation_id", conversation_id)
        .maybeSingle();
      
      resolvedTenantId = session?.tenant_id || null;
      sessionId = session?.id || null;
      sessionCallerPhone = session?.caller_phone || null;
      console.log(`[elevenlabs-create-dispatch-job] Resolved tenant from conversation: ${resolvedTenantId?.substring(0, 8)}...`);
    }

    // Get session ID if we have tenant but not session
    if (resolvedTenantId && !sessionId && conversation_id) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("id")
        .eq("tenant_id", resolvedTenantId)
        .eq("elevenlabs_conversation_id", conversation_id)
        .maybeSingle();
      sessionId = session?.id || null;
    }

    // Fallback: try to get from most recent active session for this tenant
    if (resolvedTenantId && !sessionId) {
      const { data: recentSession } = await supabase
        .from("ai_call_sessions")
        .select("id")
        .eq("tenant_id", resolvedTenantId)
        .is("ended_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      sessionId = recentSession?.id || null;
    }

    // P0-2: Removed cross-tenant fallback that queried most recent session
    // across ALL tenants. This was a tenant isolation risk.

    if (!resolvedTenantId) {
      console.error("[elevenlabs-create-dispatch-job] Could not resolve tenant_id");
      return new Response(
        JSON.stringify({
          success: false,
          message: "I'm having trouble connecting to the dispatch system. Let me take your information and have someone call you right back.",
          error: "No active voice session found - could not determine tenant"
        } as CreateDispatchJobResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Module gating: never create entities for disabled modules
    const { data: tenantRow } = await supabase
      .from("tenants")
      .select("enabled_modules")
      .eq("id", resolvedTenantId)
      .maybeSingle();

    const enabledModules: string[] = tenantRow?.enabled_modules || [];
    if (!enabledModules.includes("dispatch_queue")) {
      console.warn(`[elevenlabs-create-dispatch-job] dispatch_queue not enabled for tenant ${resolvedTenantId.substring(0, 8)}...`);
      return new Response(
        JSON.stringify({
          success: false,
          message: "I'm sorry, dispatch isn't available right now. Let me take your info and have someone call you back to help.",
          error: "dispatch_queue module not enabled for this tenant"
        } as CreateDispatchJobResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone (prefer caller_id from the active session if the tool didn't send customer_phone)
    const effectivePhoneRaw = (customer_phone || sessionCallerPhone || "").trim();
    const phoneE164 = normalizePhone(effectivePhoneRaw);

    // Sanitize customer name - detect and normalize placeholders
    const rawCustomerName = (customer_name || "").trim();
    const sanitizedName = sanitizeCustomerName(rawCustomerName);

    // Log if placeholder name was detected
    if (isPlaceholderName(rawCustomerName)) {
      console.log(`[elevenlabs-create-dispatch-job] Placeholder name detected: "${rawCustomerName}" - storing as "Unknown"`);
      // Log to ai_event_logs for tracking
      try {
        await supabase.from("ai_event_logs").insert({
          tenant_id: resolvedTenantId,
          session_id: sessionId,
          stage: "dispatch_identity_missing",
          event_data: {
            tool: "elevenlabs-create-dispatch-job",
            placeholder_detected: rawCustomerName || null,
            has_caller_phone: !!phoneE164,
          },
        });
      } catch (e) {
        // Don't block on logging errors
      }
    }

    // Find or create customer
    let customerId: string | null = null;
    if (phoneE164) {
      try {
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("id, full_name")
          .eq("tenant_id", resolvedTenantId)
          .eq("phone_e164", phoneE164)
          .maybeSingle();

        if (existingCustomer) {
          customerId = existingCustomer.id;
          // Only update name if new name is better than existing
          if (shouldUpdateCustomerName(existingCustomer.full_name, rawCustomerName)) {
            await supabase
              .from("customers")
              .update({ full_name: sanitizedName, updated_at: new Date().toISOString() })
              .eq("id", customerId);
          }
        } else {
          // Create new customer (name is sanitized)
          const { data: newCustomer, error: newCustomerError } = await supabase
            .from("customers")
            .insert({
              tenant_id: resolvedTenantId,
              full_name: sanitizedName,
              phone_e164: phoneE164,
              phone_raw: customer_phone || null,
              source: "voice_ai"
            })
            .select("id")
            .single();

          if (newCustomerError) {
            console.error("[elevenlabs-create-dispatch-job] Failed to create customer:", newCustomerError);
          } else if (newCustomer) {
            customerId = newCustomer.id;
          }
        }
      } catch (e) {
        console.error("[elevenlabs-create-dispatch-job] Customer lookup/create error:", e);
        // Continue without customer record
      }
    }

    if (!customerId) {
      console.error("[elevenlabs-create-dispatch-job] Missing customerId (cannot create dispatch job)");
      return new Response(
        JSON.stringify({
          success: false,
          message: "I can still get this dispatched — what's the best callback number for you?",
          error: "Unable to resolve or create customer"
        } as CreateDispatchJobResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate job number
    const jobNumber = generateJobNumber();

    // Build description from vehicle_info, service_type, and drivable status
    const descriptionParts: string[] = [];
    if (service_type) descriptionParts.push(`Service: ${service_type}`);
    if (vehicle_info) descriptionParts.push(`Vehicle: ${vehicle_info}`);
    if (drivable !== undefined && drivable !== null) {
      const isDrivable = drivable === true || drivable === "true" || drivable === "yes";
      descriptionParts.push(`Drivable: ${isDrivable ? "Yes" : "No"}`);
    }
    const description = descriptionParts.join(". ") || null;

    // === NEW: Calculate distance & pricing by calling check_service_area ===
    let dispatchDistanceMiles: number | null = null;
    let towDistanceMiles: number | null = null;
    let totalDistanceMiles: number | null = null;
    let serviceTier: string | null = null;
    let pricingNote: string | null = null;
    let priceBreakdown: Record<string, unknown> | null = null;
    let etaRange: string | null = null;
    let priceCents: number | null = null;
    let pickupLat: number | null = null;
    let pickupLng: number | null = null;
    let dropoffLat: number | null = null;
    let dropoffLng: number | null = null;

    try {
      const checkServiceAreaUrl = `${supabaseUrl}/functions/v1/elevenlabs-check-service-area`;
      const checkResponse = await fetch(checkServiceAreaUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          tenant_id: resolvedTenantId,
          address: pickup_address,
          dropoff_address: dropoff_address || "",
          vehicle_type: vehicle_info || "",
        }),
      });

      if (checkResponse.ok) {
        const areaData: ServiceAreaResponse = await checkResponse.json();

        dispatchDistanceMiles = areaData.distance_miles;
        towDistanceMiles = areaData.tow_distance_miles;
        totalDistanceMiles = (dispatchDistanceMiles || 0) + (towDistanceMiles || 0);
        serviceTier = areaData.service_tier || null;
        pricingNote = areaData.pricing_note || null;
        etaRange = areaData.eta_range || null;

        // Extract coordinates if available
        pickupLat = areaData.pickup_lat ?? null;
        pickupLng = areaData.pickup_lng ?? null;
        dropoffLat = areaData.dropoff_lat ?? null;
        dropoffLng = areaData.dropoff_lng ?? null;

        // Format price_breakdown for storage and extract price_cents
        if (areaData.price_breakdown) {
          const pb = areaData.price_breakdown;
          const totalEstimate = pb.total_estimate || pb.total || null;
          priceBreakdown = {
            base_price: pb.base_price || null,
            per_mile_rate: pb.per_mile_rate || null,
            distance_charge: pb.distance_charge || null,
            vehicle_modifier: pb.vehicle_modifier || null,
            urgency_modifier: pb.urgency_modifier || null,
            total: totalEstimate,
            description: pb.description || null,
          };
          // Convert dollars to cents for price_cents column (revenue attribution reads this)
          if (totalEstimate && typeof totalEstimate === "number" && totalEstimate > 0) {
            priceCents = Math.round(totalEstimate * 100);
          }
        }

        console.log(`[elevenlabs-create-dispatch-job] Distance/pricing: dispatch=${dispatchDistanceMiles?.toFixed(1) || 'null'}mi, tow=${towDistanceMiles?.toFixed(1) || 'null'}mi, tier=${serviceTier}, price_cents=${priceCents || 'null'}, pricing="${pricingNote?.substring(0, 50) || 'null'}..."`);
      } else {
        console.warn("[elevenlabs-create-dispatch-job] check_service_area returned non-OK status:", checkResponse.status);
      }
    } catch (e) {
      console.warn("[elevenlabs-create-dispatch-job] Failed to get distance/pricing data:", e);
      // Continue without distance data - job can still be created
    }

    // Create dispatch job with distance & pricing data
    const { data: dispatch, error: dispatchError } = await supabase
      .from("dispatch_jobs")
      .insert({
        tenant_id: resolvedTenantId,
        job_number: jobNumber,
        customer_id: customerId,
        customer_name: sanitizedName,
        customer_phone: phoneE164 || customer_phone || null,
        pickup_address: pickup_address,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        dropoff_address: dropoff_address || null,
        dropoff_lat: dropoffLat,
        dropoff_lng: dropoffLng,
        job_type: service_type || "Tow",
        priority: urgencyToPriority(urgency),
        status: "pending",
        description: description,
        notes: notes || null,
        session_id: sessionId,
        requested_at: new Date().toISOString(),
        // Revenue attribution reads price_cents
        price_cents: priceCents,
        // Distance & pricing fields
        dispatch_distance_miles: dispatchDistanceMiles,
        tow_distance_miles: towDistanceMiles,
        total_distance_miles: totalDistanceMiles,
        service_tier: serviceTier,
        pricing_note: pricingNote,
        price_breakdown: priceBreakdown,
      })
      .select("id, job_number")
      .single();

    if (dispatchError) {
      console.error("[elevenlabs-create-dispatch-job] Error creating dispatch:", dispatchError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "I'm having trouble submitting the dispatch. Let me take your information and have our dispatcher call you right back to confirm.",
          error: dispatchError.message
        } as CreateDispatchJobResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Trigger dispatch handoff to notify the business
    try {
      await fetch(`${supabaseUrl}/functions/v1/dispatch-handoff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          dispatch_id: dispatch.id,
          tenant_id: resolvedTenantId,
        }),
      });
    } catch (e) {
      console.error("[elevenlabs-create-dispatch-job] Failed to trigger handoff:", e);
      // Don't fail the whole request if handoff fails
    }

    // Update session with dispatch outcome
    if (sessionId) {
      try {
        await supabase
          .from("ai_call_sessions")
          .update({
            outcome: "dispatched",
            extracted_payload: {
              dispatch_id: dispatch.id,
              job_number: dispatch.job_number,
              customer_name,
              customer_phone: phoneE164,
              pickup_address,
              dropoff_address,
              vehicle_info,
              service_type,
              urgency,
              notes,
              // Include pricing data in payload
              dispatch_distance_miles: dispatchDistanceMiles,
              tow_distance_miles: towDistanceMiles,
              service_tier: serviceTier,
              pricing_note: pricingNote,
            }
          })
          .eq("id", sessionId);
      } catch (e) {
        console.error("[elevenlabs-create-dispatch-job] Failed to update session:", e);
      }
    }

    console.log(`[elevenlabs-create-dispatch-job] Created dispatch ${dispatch.job_number} for tenant ${resolvedTenantId.substring(0, 8)}... with pricing: ${pricingNote?.substring(0, 50) || 'none'}`);

    // Build realistic confirmation message - NOT "driver is on the way"
    // The job is PENDING assignment by a dispatcher
    const etaMessage = etaRange ? ` We'll have someone there in about ${etaRange}.` : "";
    
    const response: CreateDispatchJobResponse = {
      success: true,
      job_number: dispatch.job_number,
      dispatch_id: dispatch.id,
      message: `Got it — we've got you in the system and our dispatch team is assigning a driver now.${etaMessage} You'll get a call or text when they're on the way.`
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[elevenlabs-create-dispatch-job] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "I apologize, I'm having some technical difficulties. Let me take your number and have dispatch call you right back.",
        error: error instanceof Error ? error.message : "Unknown error"
      } as CreateDispatchJobResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
