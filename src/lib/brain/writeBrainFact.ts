/**
 * writeBrainFact - Centralized write module for ALL business knowledge
 *
 * NON-NEGOTIABLE RULES:
 * 1. This module is the ONLY place that performs business knowledge writes
 * 2. Only BusinessBrainPage.tsx is allowed to import this module
 * 3. All business knowledge mutations route through these functions
 *
 * Business Knowledge Tables (covered by this module):
 * - services
 * - business_faqs
 * - business_intent_rules (required questions, pricing rules, upsell rules)
 * - tenants (profile, settings)
 * - assistant_settings
 * - availability_slots
 * - ai_knowledge_base (policies)
 * - objection_responses
 * - menu_items
 * - menu_categories
 * - knowledge_sources (file uploads)
 * - data_retention_settings
 * - tenant_intelligence_settings
 * - universal_delivery_settings
 * - delivery_rules
 * - booking_delivery_settings
 * - dispatch_delivery_settings
 * - order_delivery_settings
 * - medical_settings (HIPAA)
 *
 * Operational Tables (NOT covered - handled elsewhere):
 * - bookings, food_orders, dispatch_requests, workflow_runs, etc.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// ============================================================================
// PROFILE SECTION (#profile)
// ============================================================================

/**
 * Update business profile (name, tagline, phone, address, timezone)
 */
export async function updateBusinessProfile(
  tenantId: string,
  updates: {
    name?: string;
    tagline?: string;
    phone_public?: string;
    address?: string;
    timezone?: string;
  }
) {
  const { data, error } = await supabase
    .from("tenants")
    .update(updates)
    .eq("id", tenantId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update business hours
 */
export async function updateBusinessHours(
  tenantId: string,
  hoursJson: Record<string, any>
) {
  const { data, error } = await supabase
    .from("tenants")
    .update({ hours_json: hoursJson })
    .eq("id", tenantId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update service area configuration
 *
 * Full structure:
 * {
 *   mode: "radius" | "counties" | "zips" | "hybrid",
 *   base_address: { line1, city, state, zip, lat, lng },
 *   radius_miles: number | null,
 *   include: { counties: [{name, state}], zips: [], states: [] },
 *   exclude: { counties: [{name, state}], zips: [], states: [] },
 *   restrictions: { no_cross_state_lines: boolean },
 *   notes: string
 * }
 */
export async function updateServiceArea(
  tenantId: string,
  serviceArea: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from("tenants")
    .update({ service_area_json: serviceArea as Json })
    .eq("id", tenantId)
    .select()
    .single();

  if (error) throw error;

  await logBrainChange(
    tenantId,
    "tenants",
    "update",
    tenantId,
    { service_area_json: serviceArea }
  );

  return data;
}

// ============================================================================
// SERVICES SECTION (#services)
// ============================================================================

/**
 * Create a new service
 */
export async function createService(
  tenantId: string,
  service: {
    name: string;
    description?: string;
    price_type?: "fixed" | "starting_at" | "quote_only";
    price_amount?: number;
    duration_minutes?: number;
    deposit_amount?: number;
    deposit_required?: boolean;
    is_active?: boolean;
    complexity?: "simple" | "complex";
    price_factors?: string;
    // Dispatch pricing fields
    service_category?: string;
    service_type?: string;
    pricing_config_json?: Record<string, unknown>;
    display_order?: number;
    // Service intelligence fields
    booking_type?: "direct_book" | "estimate_first" | "consultation";
    prerequisite_note?: string;
    duration_min_minutes?: number | null;
    duration_max_minutes?: number | null;
    payment_timing?: "at_booking" | "at_service" | "deposit_then_balance" | "quote_first";
    required_booking_fields?: string[];
  }
) {
  const { data, error } = await supabase
    .from("services")
    .insert({
      tenant_id: tenantId,
      name: service.name,
      description: service.description || null,
      price_type: service.price_type || "fixed",
      price_amount: service.price_amount || null,
      duration_minutes: service.duration_minutes || 60,
      deposit_amount: service.deposit_amount || null,
      deposit_required: service.deposit_required || false,
      is_active: service.is_active !== undefined ? service.is_active : true,
      complexity: service.complexity || "simple",
      price_factors: service.price_factors || null,
      // Dispatch pricing fields
      service_category: service.service_category || null,
      service_type: service.service_type || null,
      pricing_config_json: service.pricing_config_json as Json || null,
      display_order: service.display_order || 0,
      // Service intelligence fields
      booking_type: service.booking_type || "direct_book",
      prerequisite_note: service.prerequisite_note || null,
      duration_min_minutes: service.duration_min_minutes ?? null,
      duration_max_minutes: service.duration_max_minutes ?? null,
      payment_timing: service.payment_timing || "at_service",
      required_booking_fields: service.required_booking_fields || [],
    })
    .select()
    .single();

  if (error) throw error;

  await logBrainChange(
    tenantId,
    "services",
    "insert",
    data.id,
    service
  );

  return data;
}

/**
 * Update a service
 */
export async function updateService(
  serviceId: string,
  tenantId: string,
  updates: {
    name?: string;
    description?: string;
    price_type?: "fixed" | "starting_at" | "quote_only";
    price_amount?: number;
    duration_minutes?: number;
    deposit_amount?: number;
    deposit_required?: boolean;
    is_active?: boolean;
    complexity?: "simple" | "complex";
    price_factors?: string;
    // Dispatch pricing fields
    service_category?: string;
    service_type?: string | null;
    pricing_config_json?: Record<string, unknown>;
    display_order?: number;
    // Service intelligence fields
    booking_type?: "direct_book" | "estimate_first" | "consultation";
    prerequisite_note?: string;
    duration_min_minutes?: number | null;
    duration_max_minutes?: number | null;
    payment_timing?: "at_booking" | "at_service" | "deposit_then_balance" | "quote_first";
    required_booking_fields?: string[];
    required_intake_fields?: string[];
  }
) {
  // Transform pricing_config_json to Json type if present
  const dbUpdates = {
    ...updates,
    pricing_config_json: updates.pricing_config_json as Json | undefined,
  };

  const { data, error } = await supabase
    .from("services")
    .update(dbUpdates)
    .eq("id", serviceId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) throw error;

  await logBrainChange(
    tenantId,
    "services",
    "update",
    serviceId,
    updates
  );

  return data;
}

/**
 * Delete a service
 */
export async function deleteService(serviceId: string, tenantId: string) {
  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", serviceId)
    .eq("tenant_id", tenantId);

  if (error) throw error;

  await logBrainChange(
    tenantId,
    "services",
    "delete",
    serviceId,
    {}
  );
}

/**
 * Update pricing rules configuration (entire rules object)
 *
 * This replaces the entire pricing_rules_jsonb field in tenants table.
 * Used by PricingRulesEditor component.
 */
export async function updatePricingRules(
  tenantId: string,
  pricingRulesConfig: Record<string, any>
) {
  const { data, error } = await supabase
    .from("tenants")
    .update({ pricing_rules_jsonb: pricingRulesConfig } as any)
    .eq("id", tenantId)
    .select()
    .single();

  if (error) throw error;

  await logBrainChange(
    tenantId,
    "tenants",
    "update",
    tenantId,
    { pricing_rules_jsonb: pricingRulesConfig }
  );

  return data;
}

// ============================================================================
// SCHEDULING SECTION (#scheduling)
// ============================================================================

/**
 * Update busyness rules configuration
 *
 * This updates the busyness_rules_jsonb field in tenants table.
 * Used by BusynessRulesEditor component.
 */
export async function updateBusynessRules(
  tenantId: string,
  busynessRulesConfig: Record<string, any>
) {
  const { data, error } = await supabase
    .from("tenants")
    .update({ busyness_rules_jsonb: busynessRulesConfig } as any)
    .eq("id", tenantId)
    .select()
    .single();

  if (error) throw error;

  await logBrainChange(
    tenantId,
    "tenants",
    "update",
    tenantId,
    { busyness_rules_jsonb: busynessRulesConfig }
  );

  return data;
}

/**
 * Update availability slots
 */
export async function updateAvailabilitySlots(
  tenantId: string,
  slots: Array<any>
) {
  // TODO: Implement in Phase 3
  throw new Error("updateAvailabilitySlots not yet implemented - Phase 3");
}

// ============================================================================
// POLICIES SECTION (#policies)
// ============================================================================

/**
 * Update cancellation/deposit/payment policies
 */
export async function updateBusinessPolicies(
  tenantId: string,
  policies: {
    cancellation_policy?: string;
    deposit_policy?: string;
    refund_policy?: string;
    payment_methods?: string[];
  }
) {
  const { data, error } = await supabase
    .from("tenants")
    .update({
      cancellation_policy: policies.cancellation_policy,
      deposit_policy: policies.deposit_policy,
      refund_policy: policies.refund_policy,
      payment_methods: policies.payment_methods,
    })
    .eq("id", tenantId)
    .select()
    .single();

  if (error) throw error;

  await logBrainChange(
    tenantId,
    "tenants",
    "update",
    tenantId,
    policies
  );

  return data;
}

/**
 * Create a required question rule
 */
export async function createRequiredQuestionRule(
  tenantId: string,
  rule: {
    intent_type: string;
    action_json: Record<string, any>;
  }
) {
  // TODO: Implement in Phase 3
  throw new Error("createRequiredQuestionRule not yet implemented - Phase 3");
}

/**
 * Update HIPAA settings (medical mode only)
 */
export async function updateHIPAASettings(
  tenantId: string,
  settings: {
    store_recordings?: boolean;
    store_transcripts?: boolean;
    require_verbal_consent?: boolean;
    retention_days?: number;
  }
) {
  const { data, error } = await supabase
    .from("medical_settings")
    .upsert(
      {
        tenant_id: tenantId,
        ...settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" }
    )
    .select()
    .single();

  if (error) throw error;

  await logBrainChange(
    tenantId,
    "medical_settings",
    "upsert",
    tenantId,
    settings
  );

  return data;
}

/**
 * Update data retention settings
 */
export async function updateDataRetentionSettings(
  tenantId: string,
  settings: Record<string, any>
) {
  // TODO: Implement in Phase 3
  throw new Error("updateDataRetentionSettings not yet implemented - Phase 3");
}

/**
 * Update delivery handoff settings
 */
export async function updateDeliverySettings(
  tenantId: string,
  type: "booking" | "dispatch" | "order",
  settings: Record<string, any>
) {
  // TODO: Implement in Phase 3
  throw new Error("updateDeliverySettings not yet implemented - Phase 3");
}

// ============================================================================
// FAQs SECTION (#faqs)
// ============================================================================

/**
 * Create a FAQ
 */
export async function createFAQ(
  tenantId: string,
  faq: {
    question: string;
    answer: string;
    priority_weight?: number;
  }
) {
  const { data, error } = await supabase
    .from("business_faqs")
    .insert({
      tenant_id: tenantId,
      question: faq.question,
      answer: faq.answer,
      priority_weight: faq.priority_weight || 0,
    })
    .select()
    .single();

  if (error) throw error;

  await logBrainChange(
    tenantId,
    "business_faqs",
    "insert",
    data.id,
    faq
  );

  return data;
}

/**
 * Update a FAQ
 */
export async function updateFAQ(
  faqId: string,
  tenantId: string,
  updates: {
    question?: string;
    answer?: string;
    priority_weight?: number;
  }
) {
  const { data, error } = await supabase
    .from("business_faqs")
    .update(updates)
    .eq("id", faqId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) throw error;

  await logBrainChange(
    tenantId,
    "business_faqs",
    "update",
    faqId,
    updates
  );

  return data;
}

/**
 * Delete a FAQ
 */
export async function deleteFAQ(faqId: string, tenantId: string) {
  const { error } = await supabase
    .from("business_faqs")
    .delete()
    .eq("id", faqId)
    .eq("tenant_id", tenantId);

  if (error) throw error;

  await logBrainChange(
    tenantId,
    "business_faqs",
    "delete",
    faqId,
    {}
  );
}

/**
 * Create an objection response
 */
export async function createObjectionResponse(
  tenantId: string,
  objection: {
    objection: string;
    response: string;
    priority_weight?: number;
  }
) {
  const { data, error } = await supabase
    .from("objection_responses")
    .insert({
      tenant_id: tenantId,
      objection: objection.objection,
      response: objection.response,
      priority_weight: objection.priority_weight || 0,
    })
    .select()
    .single();

  if (error) throw error;

  await logBrainChange(
    tenantId,
    "objection_responses",
    "insert",
    data.id,
    objection
  );

  return data;
}

/**
 * Update an objection response
 */
export async function updateObjectionResponse(
  objectionId: string,
  tenantId: string,
  updates: {
    objection?: string;
    response?: string;
    priority_weight?: number;
  }
) {
  const { data, error } = await supabase
    .from("objection_responses")
    .update(updates)
    .eq("id", objectionId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) throw error;

  await logBrainChange(
    tenantId,
    "objection_responses",
    "update",
    objectionId,
    updates
  );

  return data;
}

/**
 * Delete an objection response
 */
export async function deleteObjectionResponse(objectionId: string, tenantId: string) {
  const { error } = await supabase
    .from("objection_responses")
    .delete()
    .eq("id", objectionId)
    .eq("tenant_id", tenantId);

  if (error) throw error;

  await logBrainChange(
    tenantId,
    "objection_responses",
    "delete",
    objectionId,
    {}
  );
}

// ============================================================================
// KNOWLEDGE ASSETS SECTION (#assets)
// ============================================================================

/**
 * Upload a knowledge source file
 */
export async function uploadKnowledgeSource(
  tenantId: string,
  file: {
    file_name: string;
    file_url: string;
    source_type: string;
  }
) {
  // TODO: Implement in Phase 3
  throw new Error("uploadKnowledgeSource not yet implemented - Phase 3");
}

/**
 * Update knowledge source status
 */
export async function updateKnowledgeSourceStatus(
  sourceId: string,
  status: string,
  errorMessage?: string
) {
  // TODO: Implement in Phase 3
  throw new Error("updateKnowledgeSourceStatus not yet implemented - Phase 3");
}

/**
 * Delete a knowledge source
 */
export async function deleteKnowledgeSource(sourceId: string) {
  // TODO: Implement in Phase 3
  throw new Error("deleteKnowledgeSource not yet implemented - Phase 3");
}

// ============================================================================
// REVIEW QUEUE SECTION (#review-queue)
// ============================================================================

/**
 * Approve a knowledge suggestion
 */
export async function approveKnowledgeSuggestion(
  suggestionId: string,
  type: "service" | "faq" | "menu_item" | "objection" | "policy"
) {
  // TODO: Implement in Phase 3
  throw new Error("approveKnowledgeSuggestion not yet implemented - Phase 3");
}

/**
 * Reject a knowledge suggestion
 */
export async function rejectKnowledgeSuggestion(suggestionId: string) {
  // TODO: Implement in Phase 3
  throw new Error("rejectKnowledgeSuggestion not yet implemented - Phase 3");
}

/**
 * Resolve a knowledge conflict (keep existing)
 */
export async function resolveConflictKeepExisting(conflictId: string) {
  // TODO: Implement in Phase 3
  throw new Error("resolveConflictKeepExisting not yet implemented - Phase 3");
}

/**
 * Resolve a knowledge conflict (accept upload)
 */
export async function resolveConflictAcceptUpload(
  conflictId: string,
  entityType: string,
  entityId: string,
  uploadedData: Record<string, any>
) {
  // TODO: Implement in Phase 3
  throw new Error("resolveConflictAcceptUpload not yet implemented - Phase 3");
}

/**
 * Resolve a knowledge conflict (custom merge)
 */
export async function resolveConflictCustomMerge(
  conflictId: string,
  entityType: string,
  entityId: string,
  mergedData: Record<string, any>
) {
  // TODO: Implement in Phase 3
  throw new Error("resolveConflictCustomMerge not yet implemented - Phase 3");
}

// ============================================================================
// BUSINESS MODE & INDUSTRY (SLIDER EXCEPTION)
// ============================================================================

/**
 * LOCKDOWN EXCEPTION: Update business mode only
 *
 * This is one of ONLY two fields that can be changed outside of Business Brain.
 * The homepage slider may call this method to switch business mode.
 *
 * This method MUST NOT:
 * - Write services, FAQs, policies, or any other business knowledge
 * - Trigger template application
 * - Modify enabled_modules (that's a separate concern)
 *
 * @see docs/refactors/LOCKDOWN_SLIDER_EXCEPTION.md
 */
export async function setBusinessMode(
  tenantId: string,
  businessMode: "service" | "dispatch" | "food" | "medical" | "general" | "sales"
) {
  const { data, error } = await supabase
    .from("tenants")
    .update({ business_mode: businessMode })
    .eq("id", tenantId)
    .select()
    .single();

  if (error) throw error;

  await logBrainChange(
    tenantId,
    "tenants",
    "update",
    tenantId,
    { business_mode: businessMode, _source: "slider_exception" }
  );

  return data;
}

/**
 * LOCKDOWN EXCEPTION: Update industry key only
 *
 * This is one of ONLY two fields that can be changed outside of Business Brain.
 * The homepage slider may call this method to switch industry.
 *
 * This method MUST NOT:
 * - Write services, FAQs, policies, or any other business knowledge
 * - Trigger template application (templates are applied separately in Business Brain)
 * - Modify enabled_modules (that's a separate concern)
 *
 * @see docs/refactors/LOCKDOWN_SLIDER_EXCEPTION.md
 */
export async function setIndustryKey(
  tenantId: string,
  industryKey: string
) {
  const { data, error } = await supabase
    .from("tenants")
    .update({ industry: industryKey })
    .eq("id", tenantId)
    .select()
    .single();

  if (error) throw error;

  await logBrainChange(
    tenantId,
    "tenants",
    "update",
    tenantId,
    { industry: industryKey, _source: "slider_exception" }
  );

  return data;
}

/**
 * LOCKDOWN EXCEPTION: Update business mode and industry together
 *
 * Convenience method when both need to change atomically.
 * Still subject to same constraints as individual methods.
 *
 * @see docs/refactors/LOCKDOWN_SLIDER_EXCEPTION.md
 */
export async function setBusinessModeAndIndustry(
  tenantId: string,
  businessMode: "service" | "dispatch" | "food" | "medical" | "general" | "sales",
  industryKey: string
) {
  const { data, error } = await supabase
    .from("tenants")
    .update({
      business_mode: businessMode,
      industry: industryKey,
    })
    .eq("id", tenantId)
    .select()
    .single();

  if (error) throw error;

  await logBrainChange(
    tenantId,
    "tenants",
    "update",
    tenantId,
    { business_mode: businessMode, industry: industryKey, _source: "slider_exception" }
  );

  return data;
}

// ============================================================================
// CUSTOM KNOWLEDGE SECTION (#custom-knowledge)
// Uses ai_knowledge_base table with types: policy, upsell
// ============================================================================

/**
 * Create a custom knowledge entry
 */
export async function createCustomKnowledge(
  tenantId: string,
  entry: {
    type: "policy" | "upsell";
    title: string;
    content: string;
    priority_weight?: number;
  }
) {
  const { data, error } = await supabase
    .from("ai_knowledge_base")
    .insert({
      tenant_id: tenantId,
      type: entry.type,
      title: entry.title,
      content: entry.content,
      priority_weight: entry.priority_weight || 0,
    })
    .select()
    .single();

  if (error) throw error;

  await logBrainChange(tenantId, "ai_knowledge_base", "insert", data.id, entry);

  return data;
}

/**
 * Update a custom knowledge entry
 */
export async function updateCustomKnowledge(
  id: string,
  tenantId: string,
  updates: {
    title?: string;
    content?: string;
    type?: "policy" | "upsell";
  }
) {
  const { data, error } = await supabase
    .from("ai_knowledge_base")
    .update(updates)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) throw error;

  await logBrainChange(tenantId, "ai_knowledge_base", "update", id, updates);

  return data;
}

/**
 * Delete a custom knowledge entry
 */
export async function deleteCustomKnowledge(id: string, tenantId: string) {
  const { error } = await supabase
    .from("ai_knowledge_base")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) throw error;

  await logBrainChange(tenantId, "ai_knowledge_base", "delete", id, {});
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate that caller is authorized to write business knowledge
 *
 * In production, this would check:
 * - User has owner/admin role
 * - Call originates from BusinessBrainPage.tsx
 * - Tenant is not in read-only mode
 */
function validateWritePermission(tenantId: string) {
  // TODO: Implement in Phase 3
  // For now, this is a placeholder
  return true;
}

/**
 * Log business knowledge change for audit trail
 */
async function logBrainChange(
  tenantId: string,
  table: string,
  operation: "insert" | "update" | "delete" | "upsert",
  recordId: string,
  changes: Record<string, any>
) {
  // TODO: Implement in Phase 3
  // This would write to an audit_log table
  console.log("[BRAIN_WRITE]", {
    tenantId,
    table,
    operation,
    recordId,
    changes,
    timestamp: new Date().toISOString()
  });
}
