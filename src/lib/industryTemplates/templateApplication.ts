/**
 * Template Application Logic
 *
 * Functions for previewing and applying industry templates to Business Brain.
 * Supports two modes:
 * - merge: Non-destructive, only adds new items, creates conflicts for duplicates
 * - replace: Overwrites existing data with template defaults
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  IndustryTemplate,
  CurrentBrainState,
  TemplatePreviewResult,
  ApplyMode,
  ServiceTemplateItem,
  RequiredQuestionItem,
  PolicyItem,
  FAQItem,
  ObjectionItem,
} from "./types";
import {
  createService,
  createFAQ,
  createObjectionResponse,
  updateBusinessPolicies,
  updateServiceArea,
} from "@/lib/brain/writeBrainFact";

// ============================================================================
// PREVIEW LOGIC
// ============================================================================

/**
 * Preview what will change when a template is applied.
 *
 * @param currentState - Current Brain state
 * @param template - Template to apply
 * @param mode - "merge" or "replace"
 * @returns Preview of changes including items to add and conflicts
 */
export function previewTemplateApplication(
  currentState: CurrentBrainState,
  template: IndustryTemplate,
  mode: ApplyMode
): TemplatePreviewResult {
  const result: TemplatePreviewResult = {
    services: { toAdd: [], conflicts: [] },
    required_questions: { toAdd: [], conflicts: [] },
    policies: { toAdd: [], conflicts: [] },
    faqs: { toAdd: [], conflicts: [] },
    objections: { toAdd: [], conflicts: [] },
    service_area: {
      willConfigure: !currentState.service_area_configured || mode === "replace",
      defaults: template.defaults.service_area_defaults,
    },
    totals: { itemsToAdd: 0, conflictCount: 0 },
  };

  if (mode === "replace") {
    // In replace mode, all template items are added (existing data will be removed)
    result.services.toAdd = template.defaults.services;
    result.required_questions.toAdd = template.defaults.required_questions;
    result.policies.toAdd = template.defaults.policies;
    result.faqs.toAdd = template.defaults.faqs;
    result.objections.toAdd = template.defaults.objections;
  } else {
    // In merge mode, check for conflicts
    result.services = previewServices(currentState.services, template.defaults.services);
    result.required_questions = previewRequiredQuestions(
      currentState.required_questions,
      template.defaults.required_questions
    );
    result.policies = previewPolicies(currentState.policies, template.defaults.policies);
    result.faqs = previewFAQs(currentState.faqs, template.defaults.faqs);
    result.objections = previewObjections(
      currentState.objections,
      template.defaults.objections
    );
  }

  // Calculate totals
  result.totals.itemsToAdd =
    result.services.toAdd.length +
    result.required_questions.toAdd.length +
    result.policies.toAdd.length +
    result.faqs.toAdd.length +
    result.objections.toAdd.length;

  result.totals.conflictCount =
    result.services.conflicts.length +
    result.required_questions.conflicts.length +
    result.policies.conflicts.length +
    result.faqs.conflicts.length +
    result.objections.conflicts.length;

  return result;
}

function previewServices(
  existing: CurrentBrainState["services"],
  template: ServiceTemplateItem[]
): TemplatePreviewResult["services"] {
  const result: TemplatePreviewResult["services"] = { toAdd: [], conflicts: [] };
  const existingNames = new Set(existing.map((s) => s.name.toLowerCase()));

  for (const item of template) {
    const normalizedName = item.name.toLowerCase();
    if (existingNames.has(normalizedName)) {
      const match = existing.find((s) => s.name.toLowerCase() === normalizedName);
      result.conflicts.push({
        templateItem: item,
        existingName: match?.name || item.name,
      });
    } else {
      result.toAdd.push(item);
    }
  }

  return result;
}

function previewRequiredQuestions(
  existing: CurrentBrainState["required_questions"],
  template: RequiredQuestionItem[]
): TemplatePreviewResult["required_questions"] {
  const result: TemplatePreviewResult["required_questions"] = { toAdd: [], conflicts: [] };
  const existingKeys = new Set(existing.map((q) => `${q.intent}:${q.key}`));

  for (const item of template) {
    const key = `${item.intent}:${item.key}`;
    if (existingKeys.has(key)) {
      result.conflicts.push({
        templateItem: item,
        existingKey: item.key,
      });
    } else {
      result.toAdd.push(item);
    }
  }

  return result;
}

function previewPolicies(
  existing: CurrentBrainState["policies"],
  template: PolicyItem[]
): TemplatePreviewResult["policies"] {
  const result: TemplatePreviewResult["policies"] = { toAdd: [], conflicts: [] };

  for (const item of template) {
    let existingText: string | undefined;
    switch (item.type) {
      case "cancellation":
        existingText = existing.cancellation_policy;
        break;
      case "deposit":
        existingText = existing.deposit_policy;
        break;
      case "refund":
        existingText = existing.refund_policy;
        break;
    }

    if (existingText && existingText.trim().length > 0) {
      result.conflicts.push({
        templateItem: item,
        existingText,
      });
    } else {
      result.toAdd.push(item);
    }
  }

  return result;
}

function previewFAQs(
  existing: CurrentBrainState["faqs"],
  template: FAQItem[]
): TemplatePreviewResult["faqs"] {
  const result: TemplatePreviewResult["faqs"] = { toAdd: [], conflicts: [] };
  const existingQuestions = new Set(
    existing.map((f) => f.question.toLowerCase().replace(/[?.,!]/g, ""))
  );

  for (const item of template) {
    const normalizedQuestion = item.question.toLowerCase().replace(/[?.,!]/g, "");
    // Check for fuzzy match (>80% similarity would be ideal, but we'll use contains for simplicity)
    const hasConflict = Array.from(existingQuestions).some(
      (eq) => eq.includes(normalizedQuestion) || normalizedQuestion.includes(eq)
    );

    if (hasConflict) {
      const match = existing.find(
        (f) =>
          f.question.toLowerCase().replace(/[?.,!]/g, "").includes(normalizedQuestion) ||
          normalizedQuestion.includes(f.question.toLowerCase().replace(/[?.,!]/g, ""))
      );
      result.conflicts.push({
        templateItem: item,
        existingQuestion: match?.question || item.question,
      });
    } else {
      result.toAdd.push(item);
    }
  }

  return result;
}

function previewObjections(
  existing: CurrentBrainState["objections"],
  template: ObjectionItem[]
): TemplatePreviewResult["objections"] {
  const result: TemplatePreviewResult["objections"] = { toAdd: [], conflicts: [] };
  const existingObjections = new Set(
    existing.map((o) => o.objection.toLowerCase().replace(/[?.,!'"]/g, ""))
  );

  for (const item of template) {
    const normalizedObjection = item.objection.toLowerCase().replace(/[?.,!'"]/g, "");
    const hasConflict = Array.from(existingObjections).some(
      (eo) => eo.includes(normalizedObjection) || normalizedObjection.includes(eo)
    );

    if (hasConflict) {
      const match = existing.find(
        (o) =>
          o.objection.toLowerCase().replace(/[?.,!'"]/g, "").includes(normalizedObjection) ||
          normalizedObjection.includes(o.objection.toLowerCase().replace(/[?.,!'"]/g, ""))
      );
      result.conflicts.push({
        templateItem: item,
        existingObjection: match?.objection || item.objection,
      });
    } else {
      result.toAdd.push(item);
    }
  }

  return result;
}

// ============================================================================
// APPLY LOGIC
// ============================================================================

export interface ApplyTemplateResult {
  success: boolean;
  servicesAdded: number;
  faqsAdded: number;
  objectionsAdded: number;
  policiesUpdated: boolean;
  serviceAreaUpdated: boolean;
  conflictsCreated: number;
  errors: string[];
}

/**
 * Apply a template to Business Brain.
 *
 * @param tenantId - Tenant to apply template to
 * @param template - Template to apply
 * @param mode - "merge" or "replace"
 * @param preview - Preview result (to know what to add vs conflict)
 * @returns Result of the application
 */
export async function applyTemplate(
  tenantId: string,
  template: IndustryTemplate,
  mode: ApplyMode,
  preview: TemplatePreviewResult
): Promise<ApplyTemplateResult> {
  const result: ApplyTemplateResult = {
    success: true,
    servicesAdded: 0,
    faqsAdded: 0,
    objectionsAdded: 0,
    policiesUpdated: false,
    serviceAreaUpdated: false,
    conflictsCreated: 0,
    errors: [],
  };

  try {
    // If replace mode, delete existing data first
    if (mode === "replace") {
      await clearExistingData(tenantId);
    }

    // Add services
    for (const service of preview.services.toAdd) {
      try {
        await createService(tenantId, {
          name: service.name,
          description: service.description,
          price_type: service.base_price_model,
          price_amount: service.fixed_price_cents || service.starting_price_cents || null,
          duration_minutes: service.duration_minutes,
          deposit_required: service.deposit_required,
          deposit_amount: service.deposit_amount_cents,
          is_active: true,
        });
        result.servicesAdded++;
      } catch (error) {
        result.errors.push(`Failed to add service "${service.name}": ${error}`);
      }
    }

    // Add FAQs
    for (const faq of preview.faqs.toAdd) {
      try {
        await createFAQ(tenantId, {
          question: faq.question,
          answer: faq.answer,
        });
        result.faqsAdded++;
      } catch (error) {
        result.errors.push(`Failed to add FAQ: ${error}`);
      }
    }

    // Add objection responses
    for (const objection of preview.objections.toAdd) {
      try {
        await createObjectionResponse(tenantId, {
          objection: objection.objection,
          response: objection.response,
        });
        result.objectionsAdded++;
      } catch (error) {
        result.errors.push(`Failed to add objection response: ${error}`);
      }
    }

    // Update policies
    if (preview.policies.toAdd.length > 0 || mode === "replace") {
      const policiesToApply =
        mode === "replace" ? template.defaults.policies : preview.policies.toAdd;
      const policyUpdates: Parameters<typeof updateBusinessPolicies>[1] = {};

      for (const policy of policiesToApply) {
        switch (policy.type) {
          case "cancellation":
            policyUpdates.cancellation_policy = policy.text;
            break;
          case "deposit":
            policyUpdates.deposit_policy = policy.text;
            break;
          case "refund":
            policyUpdates.refund_policy = policy.text;
            break;
        }
      }

      if (Object.keys(policyUpdates).length > 0) {
        try {
          await updateBusinessPolicies(tenantId, policyUpdates);
          result.policiesUpdated = true;
        } catch (error) {
          result.errors.push(`Failed to update policies: ${error}`);
        }
      }
    }

    // Update service area (only if not configured or replace mode)
    if (preview.service_area.willConfigure) {
      try {
        const areaDefaults = template.defaults.service_area_defaults;
        await updateServiceArea(tenantId, {
          mode: areaDefaults.mode,
          base_address: { line1: "", city: "", state: "", zip: "", lat: null, lng: null },
          radius_miles: areaDefaults.radius_miles || null,
          include: { counties: [], zips: [], states: [] },
          exclude: { counties: [], zips: [], states: [] },
          restrictions: areaDefaults.restrictions,
          notes: areaDefaults.notes,
        });
        result.serviceAreaUpdated = true;
      } catch (error) {
        result.errors.push(`Failed to update service area: ${error}`);
      }
    }

    // Create conflicts in review queue for merge mode
    if (mode === "merge") {
      const totalConflicts =
        preview.services.conflicts.length +
        preview.faqs.conflicts.length +
        preview.objections.conflicts.length +
        preview.policies.conflicts.length;

      if (totalConflicts > 0) {
        try {
          await createTemplateConflicts(tenantId, template, preview);
          result.conflictsCreated = totalConflicts;
        } catch (error) {
          result.errors.push(`Failed to create some conflicts: ${error}`);
        }
      }
    }

    // Update tenant industry field
    try {
      await supabase
        .from("tenants")
        .update({
          industry: template.industry_key,
          business_mode: template.business_mode,
        })
        .eq("id", tenantId);
    } catch (error) {
      result.errors.push(`Failed to update tenant industry: ${error}`);
    }

    result.success = result.errors.length === 0;
  } catch (error) {
    result.success = false;
    result.errors.push(`Unexpected error: ${error}`);
  }

  return result;
}

/**
 * Clear existing data for replace mode
 */
async function clearExistingData(tenantId: string): Promise<void> {
  // Delete services
  await supabase.from("services").delete().eq("tenant_id", tenantId);

  // Delete FAQs
  await supabase.from("business_faqs").delete().eq("tenant_id", tenantId);

  // Delete objection responses
  await supabase.from("objection_responses").delete().eq("tenant_id", tenantId);

  // Clear policies (set to null)
  await supabase
    .from("tenants")
    .update({
      cancellation_policy: null,
      deposit_policy: null,
      refund_policy: null,
    })
    .eq("id", tenantId);
}

/**
 * Create conflicts in the review queue for merge mode
 */
async function createTemplateConflicts(
  tenantId: string,
  template: IndustryTemplate,
  preview: TemplatePreviewResult
): Promise<void> {
  // For each conflict, we create a knowledge_suggestion that the owner can review
  // This reuses the existing Review Queue infrastructure from Step 3

  const suggestions: Array<{
    tenant_id: string;
    source_type: string;
    entity_type: string;
    suggested_data: Record<string, unknown>;
    status: string;
  }> = [];

  // Service conflicts
  for (const conflict of preview.services.conflicts) {
    suggestions.push({
      tenant_id: tenantId,
      source_type: "template",
      entity_type: "service",
      suggested_data: {
        name: conflict.templateItem.name,
        description: conflict.templateItem.description,
        price_type: conflict.templateItem.base_price_model,
        price_amount:
          conflict.templateItem.fixed_price_cents ||
          conflict.templateItem.starting_price_cents,
        duration_minutes: conflict.templateItem.duration_minutes,
        _conflict_note: `Service "${conflict.existingName}" already exists. Template suggests different values.`,
        _template_source: template.industry_key,
      },
      status: "pending",
    });
  }

  // FAQ conflicts
  for (const conflict of preview.faqs.conflicts) {
    suggestions.push({
      tenant_id: tenantId,
      source_type: "template",
      entity_type: "faq",
      suggested_data: {
        question: conflict.templateItem.question,
        answer: conflict.templateItem.answer,
        _conflict_note: `Similar FAQ "${conflict.existingQuestion}" already exists.`,
        _template_source: template.industry_key,
      },
      status: "pending",
    });
  }

  // Objection conflicts
  for (const conflict of preview.objections.conflicts) {
    suggestions.push({
      tenant_id: tenantId,
      source_type: "template",
      entity_type: "objection",
      suggested_data: {
        objection: conflict.templateItem.objection,
        response: conflict.templateItem.response,
        _conflict_note: `Similar objection "${conflict.existingObjection}" already exists.`,
        _template_source: template.industry_key,
      },
      status: "pending",
    });
  }

  // Insert all suggestions
  if (suggestions.length > 0) {
    await supabase.from("extracted_knowledge_suggestions").insert(suggestions);
  }
}

// ============================================================================
// FETCH CURRENT STATE
// ============================================================================

/**
 * Fetch current Brain state for a tenant.
 * Used to generate preview.
 */
export async function fetchCurrentBrainState(
  tenantId: string
): Promise<CurrentBrainState> {
  // Fetch services
  const { data: services } = await supabase
    .from("services")
    .select("id, name, description, price_type, price_amount, duration_minutes")
    .eq("tenant_id", tenantId);

  // Fetch FAQs
  const { data: faqs } = await supabase
    .from("business_faqs")
    .select("id, question, answer")
    .eq("tenant_id", tenantId);

  // Fetch objection responses
  const { data: objections } = await supabase
    .from("objection_responses")
    .select("id, objection, response")
    .eq("tenant_id", tenantId);

  // Fetch tenant policies and service area
  const { data: tenant } = await supabase
    .from("tenants")
    .select(
      "cancellation_policy, deposit_policy, refund_policy, payment_methods, service_area_json"
    )
    .eq("id", tenantId)
    .single();

  // Fetch required questions from business_intent_rules
  const { data: intentRules } = await supabase
    .from("business_intent_rules")
    .select("id, rule_type, action_json")
    .eq("tenant_id", tenantId)
    .eq("rule_type", "required_inputs");

  // Parse required questions from intent rules
  const requiredQuestions: CurrentBrainState["required_questions"] = [];
  if (intentRules) {
    for (const rule of intentRules) {
      const actionJson = rule.action_json as {
        intent?: string;
        required_inputs?: Array<{ key: string; label: string }>;
      } | null;
      if (actionJson?.intent && actionJson?.required_inputs) {
        for (const input of actionJson.required_inputs) {
          requiredQuestions.push({
            id: rule.id,
            intent: actionJson.intent as CurrentBrainState["required_questions"][0]["intent"],
            key: input.key,
            label: input.label,
          });
        }
      }
    }
  }

  // Check if service area is configured
  const serviceAreaJson = tenant?.service_area_json as Record<string, unknown> | null;
  const serviceAreaConfigured = Boolean(
    serviceAreaJson &&
      (serviceAreaJson.radius_miles ||
        (serviceAreaJson.include as Record<string, unknown[]>)?.zips?.length ||
        (serviceAreaJson.include as Record<string, unknown[]>)?.counties?.length)
  );

  return {
    services: (services || []).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description || undefined,
      price_type: s.price_type as "fixed" | "starting_at" | "quote_only",
      price_amount: s.price_amount,
      duration_minutes: s.duration_minutes,
    })),
    required_questions: requiredQuestions,
    policies: {
      cancellation_policy: tenant?.cancellation_policy || undefined,
      deposit_policy: tenant?.deposit_policy || undefined,
      refund_policy: tenant?.refund_policy || undefined,
      payment_methods: tenant?.payment_methods || undefined,
    },
    faqs: (faqs || []).map((f) => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
    })),
    objections: (objections || []).map((o) => ({
      id: o.id,
      objection: o.objection,
      response: o.response,
    })),
    service_area_configured: serviceAreaConfigured,
  };
}
