/**
 * Industry Template Types
 *
 * Extended templates for Business Brain pre-population.
 * These types define the complete structure for industry-specific defaults.
 */

import type { CoverageMode } from "@/hooks/useServiceArea";

// ============================================================================
// SERVICE TEMPLATES
// ============================================================================

export interface ServiceTemplateItem {
  name: string;
  description?: string;
  base_price_model: "fixed" | "starting_at" | "quote_only";
  starting_price_cents?: number;
  fixed_price_cents?: number;
  duration_minutes: number;
  tags?: string[];
  deposit_required?: boolean;
  deposit_amount_cents?: number;
}

// ============================================================================
// REQUIRED QUESTIONS
// ============================================================================

export type IntentType = "booking" | "dispatch" | "order" | "reservation" | "callback";

export interface RequiredQuestionItem {
  intent: IntentType;
  service_name?: string; // Optional - if provided, question is service-scoped
  key: string;
  label: string;
  ask_prompt: string;
  why_needed: string;
  required: boolean;
}

// ============================================================================
// POLICIES
// ============================================================================

export type PolicyType = "cancellation" | "deposit" | "refund" | "payment";

export interface PolicyItem {
  type: PolicyType;
  text: string;
}

// ============================================================================
// SERVICE AREA DEFAULTS
// ============================================================================

export interface ServiceAreaDefaults {
  mode: CoverageMode;
  radius_miles?: number;
  restrictions: {
    no_cross_state_lines: boolean;
  };
  notes: string;
}

// ============================================================================
// SCHEDULING DEFAULTS
// ============================================================================

export interface SchedulingDefaults {
  lead_time_hours?: number;
  buffer_minutes?: number;
  default_slot_duration_minutes?: number;
  hours?: {
    [day: string]: { open: string; close: string } | null;
  };
}

// ============================================================================
// FAQs & OBJECTIONS
// ============================================================================

export interface FAQItem {
  question: string;
  answer: string;
}

export interface ObjectionItem {
  objection: string;
  response: string;
}

// ============================================================================
// FULL INDUSTRY TEMPLATE
// ============================================================================

export interface IndustryTemplate {
  industry_key: string;
  name: string;
  icon: string;
  business_mode: "service" | "dispatch" | "food" | "medical";
  defaults: {
    services: ServiceTemplateItem[];
    required_questions: RequiredQuestionItem[];
    policies: PolicyItem[];
    faqs: FAQItem[];
    objections: ObjectionItem[];
    service_area_defaults: ServiceAreaDefaults;
    scheduling_defaults: SchedulingDefaults;
  };
}

// ============================================================================
// CURRENT BRAIN STATE (for comparison)
// ============================================================================

export interface CurrentBrainState {
  services: Array<{
    id: string;
    name: string;
    description?: string;
    price_type: "fixed" | "starting_at" | "quote_only";
    price_amount: number | null;
    duration_minutes: number;
  }>;
  required_questions: Array<{
    id: string;
    intent: IntentType;
    key: string;
    label: string;
  }>;
  policies: {
    cancellation_policy?: string;
    deposit_policy?: string;
    refund_policy?: string;
    payment_methods?: string[];
  };
  faqs: Array<{
    id: string;
    question: string;
    answer: string;
  }>;
  objections: Array<{
    id: string;
    objection: string;
    response: string;
  }>;
  service_area_configured: boolean;
}

// ============================================================================
// PREVIEW RESULT
// ============================================================================

export interface TemplatePreviewResult {
  services: {
    toAdd: ServiceTemplateItem[];
    conflicts: Array<{
      templateItem: ServiceTemplateItem;
      existingName: string;
    }>;
  };
  required_questions: {
    toAdd: RequiredQuestionItem[];
    conflicts: Array<{
      templateItem: RequiredQuestionItem;
      existingKey: string;
    }>;
  };
  policies: {
    toAdd: PolicyItem[];
    conflicts: Array<{
      templateItem: PolicyItem;
      existingText: string;
    }>;
  };
  faqs: {
    toAdd: FAQItem[];
    conflicts: Array<{
      templateItem: FAQItem;
      existingQuestion: string;
    }>;
  };
  objections: {
    toAdd: ObjectionItem[];
    conflicts: Array<{
      templateItem: ObjectionItem;
      existingObjection: string;
    }>;
  };
  service_area: {
    willConfigure: boolean;
    defaults: ServiceAreaDefaults;
  };
  totals: {
    itemsToAdd: number;
    conflictCount: number;
  };
}

// ============================================================================
// APPLY MODE
// ============================================================================

export type ApplyMode = "merge" | "replace";
