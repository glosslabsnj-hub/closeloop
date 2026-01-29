/**
 * Shared helper for emitting business events across edge functions.
 * Logs to ai_event_logs and triggers automation workflows.
 */

// deno-lint-ignore no-explicit-any
export interface EventPayload {
  tenant_id: string;
  event_name: string;
  entity_type: string;
  entity_id: string;
  location_id?: string;
  customer?: {
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
  };
  summary?: string;
  // deno-lint-ignore no-explicit-any
  details?: Record<string, any>;
}

/**
 * Emits a business event by:
 * 1. Logging to ai_event_logs stage="event_emitted"
 * 2. Calling trigger-workflow to execute matching automation rules and workflows
 *
 * @param supabase - Supabase client with service role
 * @param supabaseUrl - The Supabase URL for invoking functions
 * @param supabaseKey - The service role key for auth
 * @param payload - The event payload
 * @returns The result from trigger-workflow or null if it fails
 */
// deno-lint-ignore no-explicit-any
export async function emitEvent(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  payload: EventPayload
  // deno-lint-ignore no-explicit-any
): Promise<{ ok: boolean; run_id?: string; error?: string } | null> {
  const {
    tenant_id,
    event_name,
    entity_type,
    entity_id,
    location_id,
    customer,
    summary,
    details,
  } = payload;

  // 1. Log the event emission to ai_event_logs
  try {
    await supabase.from("ai_event_logs").insert({
      tenant_id,
      stage: "event_emitted",
      event_data: {
        event_name,
        entity_type,
        entity_id,
        location_id,
        customer_id: customer?.id,
        customer_name: customer?.name,
        summary_preview: summary?.substring(0, 100),
        details_keys: details ? Object.keys(details) : [],
      },
    });
  } catch (logError) {
    console.error(`[emitEvent] Failed to log event ${event_name}:`, logError);
    // Don't fail the whole operation just for logging
  }

  // 2. Call trigger-workflow edge function
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        tenant_id,
        trigger: event_name,
        entity_type,
        entity_id,
        location_id,
        customer,
        summary,
        details,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[emitEvent] trigger-workflow failed for ${event_name}:`, response.status, errorText);
      return { ok: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = await response.json();
    console.log(`[emitEvent] ${event_name} triggered successfully:`, result.status || "ok");
    return { ok: true, run_id: result.run_id };
  } catch (error) {
    console.error(`[emitEvent] Failed to call trigger-workflow for ${event_name}:`, error);
    return { ok: false, error: String(error) };
  }
}

/**
 * Quick emit helper for common events
 */
export function createEventEmitter(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string
) {
  return {
    bookingCreated: (tenantId: string, bookingId: string, locationId?: string) =>
      emitEvent(supabase, supabaseUrl, supabaseKey, {
        tenant_id: tenantId,
        event_name: "booking.created",
        entity_type: "booking",
        entity_id: bookingId,
        location_id: locationId,
      }),

    orderCreated: (tenantId: string, orderId: string, locationId?: string) =>
      emitEvent(supabase, supabaseUrl, supabaseKey, {
        tenant_id: tenantId,
        event_name: "order.created",
        entity_type: "order",
        entity_id: orderId,
        location_id: locationId,
      }),

    dispatchCreated: (tenantId: string, dispatchId: string, locationId?: string) =>
      emitEvent(supabase, supabaseUrl, supabaseKey, {
        tenant_id: tenantId,
        event_name: "dispatch_job.created",
        entity_type: "dispatch",
        entity_id: dispatchId,
        location_id: locationId,
      }),

    callCompleted: (
      tenantId: string,
      sessionId: string,
      summary?: string,
      // deno-lint-ignore no-explicit-any
      customer?: { id?: string; name?: string; phone?: string },
      // deno-lint-ignore no-explicit-any
      details?: Record<string, any>
    ) =>
      emitEvent(supabase, supabaseUrl, supabaseKey, {
        tenant_id: tenantId,
        event_name: "call.completed",
        entity_type: "call",
        entity_id: sessionId,
        customer,
        summary,
        details,
      }),

    leadCaptured: (tenantId: string, leadId: string, customer?: { name?: string; phone?: string }) =>
      emitEvent(supabase, supabaseUrl, supabaseKey, {
        tenant_id: tenantId,
        event_name: "lead.captured",
        entity_type: "lead",
        entity_id: leadId,
        customer,
      }),
  };
}
