/**
 * Consolidated assistant configuration reader.
 *
 * Merges settings from two sources with clear precedence:
 *   1. `assistant_settings` table (wins) — explicit per-tenant AI config
 *   2. `tenants.context_fields_json` — fallback for older or generic fields
 *
 * This avoids scattered, inconsistent reads of both tables across edge functions.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AssistantConfig {
  // AI behaviour
  voice_ai_enabled: boolean;
  tone: string;
  greeting_script: string;
  fallback_script: string;
  unknown_question_behavior: string;

  // Booking policies
  same_day_enabled: boolean;
  waitlist_enabled: boolean;
  deposit_required: boolean;
  deposit_amount: number | null;
  service_default_flow: string;

  // Extras from context_fields_json
  tax_rate_percent: number;
  out_of_area_message: string;
}

const DEFAULTS: AssistantConfig = {
  voice_ai_enabled: true,
  tone: "professional",
  greeting_script: "",
  fallback_script: "",
  unknown_question_behavior: "polite_deflect",
  same_day_enabled: true,
  waitlist_enabled: false,
  deposit_required: false,
  deposit_amount: null,
  service_default_flow: "schedule_first",
  tax_rate_percent: 0,
  out_of_area_message: "",
};

/**
 * Fetch and merge assistant config for a tenant.
 * Queries `assistant_settings` and `tenants.context_fields_json` in parallel.
 */
export async function getAssistantConfig(
  supabase: SupabaseClient,
  tenantId: string
): Promise<AssistantConfig> {
  const [settingsResult, tenantResult] = await Promise.all([
    supabase
      .from("assistant_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .from("tenants")
      .select("context_fields_json")
      .eq("id", tenantId)
      .single(),
  ]);

  const settings = settingsResult.data as Record<string, unknown> | null;
  const contextFields =
    ((tenantResult.data as any)?.context_fields_json as Record<string, unknown>) || {};

  // Merge: assistant_settings wins, context_fields_json is fallback, DEFAULTS last
  return {
    voice_ai_enabled:
      (settings?.voice_ai_enabled as boolean) ??
      (contextFields.voice_ai_enabled as boolean) ??
      DEFAULTS.voice_ai_enabled,
    tone:
      (settings?.tone as string) ||
      (contextFields.tone as string) ||
      DEFAULTS.tone,
    greeting_script:
      (settings?.greeting_script as string) ||
      (contextFields.greeting_script as string) ||
      DEFAULTS.greeting_script,
    fallback_script:
      (settings?.fallback_script as string) ||
      (contextFields.fallback_script as string) ||
      DEFAULTS.fallback_script,
    unknown_question_behavior:
      (settings?.unknown_question_behavior as string) ||
      (contextFields.unknown_question_behavior as string) ||
      DEFAULTS.unknown_question_behavior,
    same_day_enabled:
      (settings?.same_day_enabled as boolean) ??
      (contextFields.same_day_enabled as boolean) ??
      DEFAULTS.same_day_enabled,
    waitlist_enabled:
      (settings?.waitlist_enabled as boolean) ??
      (contextFields.waitlist_enabled as boolean) ??
      DEFAULTS.waitlist_enabled,
    deposit_required:
      (settings?.deposit_required as boolean) ??
      (contextFields.deposit_required as boolean) ??
      DEFAULTS.deposit_required,
    deposit_amount:
      (settings?.deposit_amount as number) ??
      (contextFields.deposit_amount as number) ??
      DEFAULTS.deposit_amount,
    service_default_flow:
      (settings?.service_default_flow as string) ||
      (contextFields.service_default_flow as string) ||
      DEFAULTS.service_default_flow,
    tax_rate_percent:
      (contextFields.tax_rate_percent as number) ?? DEFAULTS.tax_rate_percent,
    out_of_area_message:
      (contextFields.out_of_area_message as string) ||
      DEFAULTS.out_of_area_message,
  };
}
