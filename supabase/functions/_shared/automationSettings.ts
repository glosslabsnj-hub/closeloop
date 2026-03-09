/**
 * Unified Automation Settings Resolver
 *
 * Resolves automation config from TWO sources:
 * 1. messaging_automations table (NEW — primary, takes priority)
 * 2. assistant_settings.settings_json.sms_templates (LEGACY — fallback)
 *
 * This ensures that regardless of which UI a business owner used to configure
 * their settings, the cron functions get the correct config.
 *
 * Priority: messaging_automations > settings_json
 * If messaging_automations has a row for this trigger, use it.
 * Otherwise, fall back to the legacy settings_json.
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AutomationConfig {
  enabled: boolean;
  delayMinutes: number;
  template: string;
  /** Extra settings (varies per trigger type) */
  settings: Record<string, unknown>;
}

type TriggerType =
  | "appointment_reminder"
  | "review_request"
  | "booking_confirmed"
  | "appointment_confirmation"
  | "appointment_cancellation"
  | "service_completed"
  | "re_engagement"
  | "customer_reactivation";

// Map between legacy settings_json keys and messaging_automations trigger_types
const LEGACY_KEY_MAP: Record<TriggerType, string> = {
  appointment_reminder: "appointment_reminder",
  review_request: "review_request",
  booking_confirmed: "appointment_confirmation",
  appointment_confirmation: "appointment_confirmation",
  appointment_cancellation: "appointment_cancellation",
  service_completed: "service_completed",
  re_engagement: "re_engagement",
  customer_reactivation: "customer_reactivation",
};

/**
 * Get automation config for a specific trigger type and tenant.
 * Checks messaging_automations first, falls back to settings_json.
 */
export async function getAutomationConfig(
  supabase: SupabaseClient,
  tenantId: string,
  triggerType: TriggerType,
  legacySettings?: Record<string, any> | null,
): Promise<AutomationConfig> {
  // Default config (disabled)
  const defaults: AutomationConfig = {
    enabled: false,
    delayMinutes: getDefaultDelay(triggerType),
    template: "",
    settings: {},
  };

  // 1. Check messaging_automations table (primary source)
  try {
    const { data: automation } = await supabase
      .from("messaging_automations")
      .select("enabled, delay_minutes, custom_body, settings_json, template_id, messaging_templates(body)")
      .eq("tenant_id", tenantId)
      .eq("trigger_type", triggerType)
      .maybeSingle();

    if (automation) {
      // Get template body from linked template or custom_body
      let templateBody = "";
      if (automation.custom_body) {
        templateBody = automation.custom_body;
      } else if (automation.messaging_templates) {
        templateBody = (automation.messaging_templates as any).body || "";
      }

      return {
        enabled: automation.enabled ?? false,
        delayMinutes: automation.delay_minutes ?? defaults.delayMinutes,
        template: templateBody,
        settings: (automation.settings_json as Record<string, unknown>) || {},
      };
    }
  } catch {
    // Table might not exist in all deployments — fall through to legacy
  }

  // 2. Fall back to legacy settings_json
  if (legacySettings) {
    const smsTemplates = legacySettings.sms_templates || {};
    const legacyKey = LEGACY_KEY_MAP[triggerType] || triggerType;

    // Check sms_templates first
    const templateConfig = smsTemplates[legacyKey];
    if (templateConfig) {
      return {
        enabled: templateConfig.enabled ?? false,
        delayMinutes: templateConfig.delayMinutes ?? defaults.delayMinutes,
        template: templateConfig.message || templateConfig.template || "",
        settings: {},
      };
    }

    // Special case: customer_reactivation lives at top level in settings_json
    if (triggerType === "customer_reactivation" || triggerType === "re_engagement") {
      const reactivationConfig = legacySettings.customer_reactivation;
      if (reactivationConfig) {
        return {
          enabled: reactivationConfig.enabled !== false, // default true
          delayMinutes: 0,
          template: smsTemplates.reactivation?.template || "",
          settings: {
            inactive_days: reactivationConfig.inactive_days || 60,
          },
        };
      }
    }
  }

  return defaults;
}

/**
 * Get automation configs for ALL triggers for a tenant in one call.
 * More efficient than calling getAutomationConfig multiple times.
 */
export async function getAllAutomationConfigs(
  supabase: SupabaseClient,
  tenantId: string,
  legacySettings?: Record<string, any> | null,
): Promise<Record<string, AutomationConfig>> {
  const configs: Record<string, AutomationConfig> = {};
  const triggers: TriggerType[] = [
    "appointment_reminder",
    "review_request",
    "booking_confirmed",
    "appointment_confirmation",
    "appointment_cancellation",
    "service_completed",
    "re_engagement",
    "customer_reactivation",
  ];

  // Batch fetch all messaging_automations for this tenant
  let automations: any[] = [];
  try {
    const { data } = await supabase
      .from("messaging_automations")
      .select("trigger_type, enabled, delay_minutes, custom_body, settings_json, template_id, messaging_templates(body)")
      .eq("tenant_id", tenantId);
    automations = data || [];
  } catch {
    // Table might not exist
  }

  const automationMap = new Map(automations.map((a: any) => [a.trigger_type, a]));

  for (const trigger of triggers) {
    const automation = automationMap.get(trigger);
    if (automation) {
      let templateBody = "";
      if (automation.custom_body) {
        templateBody = automation.custom_body;
      } else if (automation.messaging_templates) {
        templateBody = (automation.messaging_templates as any).body || "";
      }

      configs[trigger] = {
        enabled: automation.enabled ?? false,
        delayMinutes: automation.delay_minutes ?? getDefaultDelay(trigger),
        template: templateBody,
        settings: (automation.settings_json as Record<string, unknown>) || {},
      };
    } else {
      // Fall back to legacy
      configs[trigger] = getLegacyConfig(trigger, legacySettings);
    }
  }

  return configs;
}

function getLegacyConfig(
  triggerType: TriggerType,
  legacySettings?: Record<string, any> | null,
): AutomationConfig {
  const defaults: AutomationConfig = {
    enabled: false,
    delayMinutes: getDefaultDelay(triggerType),
    template: "",
    settings: {},
  };

  if (!legacySettings) return defaults;

  const smsTemplates = legacySettings.sms_templates || {};
  const legacyKey = LEGACY_KEY_MAP[triggerType] || triggerType;
  const templateConfig = smsTemplates[legacyKey];

  if (templateConfig) {
    return {
      enabled: templateConfig.enabled ?? false,
      delayMinutes: templateConfig.delayMinutes ?? defaults.delayMinutes,
      template: templateConfig.message || templateConfig.template || "",
      settings: {},
    };
  }

  if (triggerType === "customer_reactivation" || triggerType === "re_engagement") {
    const reactivationConfig = legacySettings.customer_reactivation;
    if (reactivationConfig) {
      return {
        enabled: reactivationConfig.enabled !== false,
        delayMinutes: 0,
        template: smsTemplates.reactivation?.template || "",
        settings: { inactive_days: reactivationConfig.inactive_days || 60 },
      };
    }
  }

  return defaults;
}

function getDefaultDelay(triggerType: TriggerType): number {
  switch (triggerType) {
    case "appointment_reminder": return 1440; // 24 hours
    case "review_request": return 60; // 1 hour after completion
    case "service_completed": return 5; // 5 min after marked complete
    case "booking_confirmed": return 0; // immediate
    case "appointment_confirmation": return 0; // immediate
    case "appointment_cancellation": return 0; // immediate
    case "re_engagement": return 0;
    case "customer_reactivation": return 0;
    default: return 0;
  }
}
