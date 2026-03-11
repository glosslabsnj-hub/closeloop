/**
 * elevenlabs-create-medical-intake: ElevenLabs tool endpoint for creating
 * medical intake records during voice calls.
 *
 * Called by ElevenLabs agent when a patient calls to:
 * - Request a new patient appointment (captures intake info)
 * - Schedule a follow-up with intake details
 * - Request a prescription refill
 * - General appointment request with medical context
 *
 * HIPAA: Only captures structured fields, never full transcript.
 * Verbal consent is tracked with timestamp.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizePhoneE164 } from "../_shared/phoneNormalize.ts";
import { sendTenantSms } from "../_shared/sms-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateMedicalIntakeRequest {
  tenant_id?: string;
  conversation_id?: string;
  customer_name: string;
  customer_phone?: string;
  intake_type?: "new_patient" | "follow_up" | "prescription_refill" | "appointment_request";
  urgency_level?: "routine" | "soon" | "urgent";
  reason_for_visit?: string;
  preferred_date?: string;
  preferred_time_range?: string;
  insurance_provider?: string;
  date_of_birth?: string;
  patient_address?: string;
  insurance_member_id?: string;
  pharmacy_name?: string;
  pharmacy_phone?: string;
  allergies?: string;
  current_medications?: string;
  referring_provider?: string;
  verbal_consent_given?: boolean;
  notes?: string;
  params?: Record<string, unknown>;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CreateMedicalIntakeRequest = await req.json();
    console.log("[create-medical-intake] Request:", JSON.stringify(body));

    const p = body.params ?? {};
    const tenantId = body.tenant_id || (p.tenant_id as string) || "";
    const conversationId = body.conversation_id || (p.conversation_id as string) || "";
    const customerName = body.customer_name || (p.customer_name as string) || "";
    const customerPhone = body.customer_phone || (p.customer_phone as string) || "";
    const intakeType = body.intake_type || (p.intake_type as string) || "appointment_request";
    const urgencyLevel = body.urgency_level || (p.urgency_level as string) || "routine";
    const reasonForVisit = body.reason_for_visit || (p.reason_for_visit as string) || "";
    const preferredDate = body.preferred_date || (p.preferred_date as string) || "";
    const preferredTimeRange = body.preferred_time_range || (p.preferred_time_range as string) || "";
    const insuranceProvider = body.insurance_provider || (p.insurance_provider as string) || "";
    const verbalConsent = body.verbal_consent_given ?? (p.verbal_consent_given as boolean) ?? false;
    const notes = body.notes || (p.notes as string) || "";
    const dateOfBirth = body.date_of_birth || (p.date_of_birth as string) || "";
    const patientAddress = body.patient_address || (p.patient_address as string) || "";
    const insuranceMemberId = body.insurance_member_id || (p.insurance_member_id as string) || "";
    const pharmacyName = body.pharmacy_name || (p.pharmacy_name as string) || "";
    const pharmacyPhone = body.pharmacy_phone || (p.pharmacy_phone as string) || "";
    const allergies = body.allergies || (p.allergies as string) || "";
    const currentMedications = body.current_medications || (p.current_medications as string) || "";
    const referringProvider = body.referring_provider || (p.referring_provider as string) || "";

    if (!customerName) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "I need your name to get started. May I have your name please?",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve tenant from conversation
    let resolvedTenantId = tenantId;
    let sessionId: string | null = null;

    if (conversationId) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id, id")
        .eq("elevenlabs_conversation_id", conversationId)
        .maybeSingle();
      resolvedTenantId = session?.tenant_id || resolvedTenantId;
      sessionId = session?.id || null;
    }

    if (!resolvedTenantId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "I'm having trouble processing your request right now. Let me transfer you.",
          error: "No tenant context",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find or create customer
    const phoneE164 = normalizePhoneE164(customerPhone);
    let customerId: string | null = null;

    if (phoneE164) {
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("tenant_id", resolvedTenantId)
        .eq("phone_e164", phoneE164)
        .maybeSingle();

      if (existing) {
        customerId = existing.id;
      } else {
        const { data: newCust } = await supabase
          .from("customers")
          .insert({
            tenant_id: resolvedTenantId,
            full_name: customerName,
            phone_e164: phoneE164,
            phone_raw: customerPhone,
            source: "ai_call",
          })
          .select("id")
          .single();
        customerId = newCust?.id || null;
      }
    }

    // Validate intake_type against CHECK constraint
    const validIntakeTypes = ["new_patient", "follow_up", "prescription_refill", "appointment_request"];
    const safeIntakeType = validIntakeTypes.includes(intakeType) ? intakeType : "appointment_request";

    const validUrgency = ["routine", "soon", "urgent"];
    const safeUrgency = validUrgency.includes(urgencyLevel) ? urgencyLevel : "routine";

    // Parse preferred_date — AI may send natural language ("next Monday", "tomorrow")
    // The DB column is `date` type, so we need YYYY-MM-DD format
    let parsedPreferredDate: string | null = null;
    if (preferredDate) {
      const lower = preferredDate.toLowerCase().trim();
      const now = new Date();

      // ISO date already?
      if (/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
        parsedPreferredDate = preferredDate;
      } else if (lower === "today" || lower === "now") {
        parsedPreferredDate = now.toISOString().slice(0, 10);
      } else if (lower === "tomorrow") {
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        parsedPreferredDate = d.toISOString().slice(0, 10);
      } else if (lower.startsWith("next ")) {
        // "next Monday", "next Tuesday", etc.
        const dayNames: Record<string, number> = {
          sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
          thursday: 4, friday: 5, saturday: 6,
        };
        const dayName = lower.replace("next ", "").trim();
        const targetDay = dayNames[dayName];
        if (targetDay !== undefined) {
          const d = new Date(now);
          d.setDate(d.getDate() + 1);
          while (d.getDay() !== targetDay) d.setDate(d.getDate() + 1);
          parsedPreferredDate = d.toISOString().slice(0, 10);
        } else {
          // Unknown day name — store as text in notes instead
          parsedPreferredDate = null;
        }
      } else {
        // Try native Date parsing as fallback
        const parsed = new Date(preferredDate);
        if (!isNaN(parsed.getTime())) {
          parsedPreferredDate = parsed.toISOString().slice(0, 10);
        }
        // If all parsing fails, leave null (avoid DB error)
      }
    }

    // Parse date_of_birth — AI may send various date formats
    let parsedDateOfBirth: string | null = null;
    if (dateOfBirth) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
        parsedDateOfBirth = dateOfBirth;
      } else {
        const parsed = new Date(dateOfBirth);
        if (!isNaN(parsed.getTime())) {
          parsedDateOfBirth = parsed.toISOString().slice(0, 10);
        }
      }
    }

    // Create medical intake record
    const { data: intake, error: intakeError } = await supabase
      .from("medical_intakes")
      .insert({
        tenant_id: resolvedTenantId,
        customer_id: customerId,
        call_session_id: sessionId,
        intake_type: safeIntakeType,
        urgency_level: safeUrgency,
        reason_for_visit: reasonForVisit || null,
        preferred_date: parsedPreferredDate,
        preferred_time_range: preferredTimeRange || null,
        insurance_provider: insuranceProvider || null,
        date_of_birth: parsedDateOfBirth,
        patient_address: patientAddress || null,
        insurance_member_id: insuranceMemberId || null,
        pharmacy_name: pharmacyName || null,
        pharmacy_phone: pharmacyPhone || null,
        allergies: allergies || null,
        current_medications: currentMedications || null,
        referring_provider: referringProvider || null,
        verbal_consent_given: verbalConsent,
        consent_timestamp: verbalConsent ? new Date().toISOString() : null,
        status: "pending",
        ai_summary: notes || null,
      })
      .select("id")
      .single();

    if (intakeError || !intake) {
      console.error("[create-medical-intake] Insert error:", intakeError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "I wasn't able to complete the intake. Let me have someone call you back.",
          error: intakeError?.message,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update call session outcome
    if (sessionId) {
      await supabase
        .from("ai_call_sessions")
        .update({
          outcome: "medical_intake",
          extracted_payload: {
            intake_id: intake.id,
            intake_type: safeIntakeType,
            urgency_level: safeUrgency,
            reason_for_visit: reasonForVisit,
            customer_name: customerName,
          },
        })
        .eq("id", sessionId);
    }

    // Trigger universal delivery for intake notifications
    try {
      await fetch(`${supabaseUrl}/functions/v1/universal-delivery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          tenant_id: resolvedTenantId,
          entity_type: "intake",
          entity_id: intake.id,
        }),
      });
    } catch (e) {
      console.error("[create-medical-intake] Delivery trigger failed:", e);
    }

    // Send patient confirmation SMS
    if (phoneE164) {
      try {
        const { data: tenantRow } = await supabase
          .from("tenants")
          .select("name")
          .eq("id", resolvedTenantId)
          .maybeSingle();

        const bizName = (tenantRow && tenantRow.name) ? tenantRow.name : "Our office";
        const smsBody = bizName + ": Thank you for calling! We've received your intake information and our office will follow up to confirm your appointment. Reply STOP to opt out.";

        const smsResult = await sendTenantSms({
          tenantId: resolvedTenantId,
          to: phoneE164,
          body: smsBody,
          entityType: "intake",
          entityId: intake.id,
        });
        console.log("[create-medical-intake] Patient SMS result:", JSON.stringify(smsResult));
      } catch (smsErr) {
        console.error("[create-medical-intake] Patient SMS failed:", smsErr);
      }
    }

    console.log(`[create-medical-intake] Created intake ${intake.id} for tenant ${resolvedTenantId}`);

    // Build response message based on intake type
    // Use the original human-readable date for the spoken response
    const displayDate = preferredDate || "";
    let message = "";
    if (safeIntakeType === "new_patient") {
      message = `Thank you ${customerName}. I've started your new patient intake. `;
      if (displayDate) message += `We'll look at getting you in on ${displayDate}. `;
      message += "Our office will follow up with you to confirm your appointment and any additional forms needed.";
    } else if (safeIntakeType === "prescription_refill") {
      message = `I've submitted your refill request, ${customerName}. Our office will review it and get back to you.`;
    } else if (safeIntakeType === "follow_up") {
      message = `I've noted your follow-up request, ${customerName}. `;
      if (displayDate) message += `We'll try to schedule you for ${displayDate}. `;
      message += "Someone from our office will reach out to confirm.";
    } else {
      message = `Thank you ${customerName}. I've submitted your request and our office will follow up with you shortly.`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        intake_id: intake.id,
        message,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[create-medical-intake] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "I'm having trouble right now. Let me have someone call you back.",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
