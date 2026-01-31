import { supabase } from "@/integrations/supabase/client";
import type { CustomerResolverResult } from "@/types/database";
import type { Json } from "@/integrations/supabase/types";

/**
 * Normalizes a phone number to E.164 format (client-side version)
 */
export function normalizePhoneE164(phone: string): string | null {
  if (!phone || phone.trim() === '') {
    return null;
  }

  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^0-9+]/g, '');

  // If starts with +, keep it
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // If 10 digits, assume US and add +1
  if (cleaned.length === 10) {
    return '+1' + cleaned;
  }

  // If 11 digits starting with 1, add +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return '+' + cleaned;
  }

  // Otherwise return as-is with + prefix
  return '+' + cleaned;
}

/**
 * Resolves a customer by phone number using the database resolver function.
 * Creates a new customer if not found, or returns existing customer and flags conflicts.
 */
export async function resolveCustomer(
  tenantId: string,
  phone: string,
  name?: string,
  email?: string,
  source: string = 'manual'
): Promise<CustomerResolverResult> {
  const { data, error } = await supabase.rpc('resolve_customer', {
    _tenant_id: tenantId,
    _phone: phone,
    _name: name || null,
    _email: email || null,
    _source: source,
  });

  if (error) {
    throw new Error(`Failed to resolve customer: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Customer resolver returned no data');
  }

  const result = data[0];
  return {
    customer_id: result.customer_id,
    is_new: result.is_new,
    has_conflict: result.has_conflict,
    conflict_id: result.conflict_id,
  };
}

/**
 * Creates an opportunity for a customer
 */
export async function createOpportunity(
  tenantId: string,
  customerId: string,
  source: string,
  serviceId?: string,
  notes?: string,
  contextJson?: Record<string, unknown>
): Promise<string> {
  const { data, error } = await supabase
    .from('opportunities')
    .insert([{
      tenant_id: tenantId,
      customer_id: customerId,
      service_id: serviceId || null,
      source,
      notes: notes || null,
      context_json: (contextJson || {}) as Json,
      status: 'new',
    }])
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create opportunity: ${error.message}`);
  }

  return data.id;
}

/**
 * Logs a knowledge gap when AI couldn't answer a question
 */
export async function logKnowledgeGap(
  tenantId: string,
  gapType: string,
  description: string,
  customerQuestion?: string,
  aiSessionId?: string,
  priority: number = 1
): Promise<void> {
  // Check if similar gap already exists (to increment count instead of duplicating)
  const { data: existing } = await supabase
    .from('knowledge_gaps')
    .select('id, occurrence_count')
    .eq('tenant_id', tenantId)
    .eq('gap_type', gapType)
    .eq('description', description)
    .eq('resolved', false)
    .single();

  if (existing) {
    // Increment occurrence count
    await supabase
      .from('knowledge_gaps')
      .update({ 
        occurrence_count: existing.occurrence_count + 1,
        priority: Math.min(priority + 1, 3), // Increase priority if recurring
      })
      .eq('id', existing.id);
  } else {
    // Create new gap
    await supabase
      .from('knowledge_gaps')
      .insert({
        tenant_id: tenantId,
        gap_type: gapType as any,
        description,
        customer_question: customerQuestion || null,
        ai_session_id: aiSessionId || null,
        priority,
      });
  }
}

/**
 * Creates a sync event for external integrations (Sheets, CRM, etc.)
 */
export async function createSyncEvent(
  tenantId: string,
  eventType: string,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown>,
  syncTarget?: string
): Promise<void> {
  await supabase
    .from('sync_events')
    .insert([{
      tenant_id: tenantId,
      event_type: eventType as any,
      entity_type: entityType,
      entity_id: entityId,
      payload_json: payload as Json,
      sync_target: syncTarget || null,
    }]);
}
