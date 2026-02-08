import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCapabilities, MODULE_TO_CAP, type Capabilities } from "./useCapabilities";

export type BusinessMode = "service" | "dispatch" | "food" | "medical" | "general";

export interface TenantConfig {
  businessMode: BusinessMode;
  enabledModules: string[];
  hipaaMode: boolean;
  capabilities: Capabilities;
}

const defaultModulesByMode: Record<BusinessMode, string[]> = {
  service: ["ai_voice", "instant_text_back", "booking"],
  dispatch: ["ai_voice", "instant_text_back", "dispatch_queue"],
  food: ["ai_voice", "instant_text_back", "food_orders", "menu_knowledge", "reservations", "catering"],
  medical: ["ai_voice", "instant_text_back", "booking", "medical_intake"],
  general: ["ai_voice", "instant_text_back"],
};

export function useTenantConfig(): TenantConfig {
  const { tenant } = useAuth();
  const capabilities = useCapabilities();

  return useMemo(() => {
    if (!tenant) {
      return {
        businessMode: "service" as BusinessMode,
        enabledModules: defaultModulesByMode.service,
        hipaaMode: false,
        capabilities,
      };
    }

    const businessMode = tenant.business_mode as BusinessMode || "service";

    // When capabilities_json is populated, derive enabledModules from it
    // so existing enabledModules.includes() checks work automatically.
    const hasExplicitCaps = (() => {
      try {
        const raw = (tenant as Record<string, unknown>).capabilities_json;
        return raw && typeof raw === "object" && !Array.isArray(raw) && Object.keys(raw).length > 0;
      } catch {
        return false;
      }
    })();

    let enabledModules: string[];

    if (hasExplicitCaps) {
      // Derive enabledModules from capabilities so downstream .includes() checks stay correct
      enabledModules = Object.entries(MODULE_TO_CAP)
        .filter(([, capKey]) => capabilities[capKey] as boolean)
        .map(([moduleId]) => moduleId);
    } else {
      // Parse enabled_modules from tenant (original logic)
      enabledModules = [];
      try {
        const modules = tenant.enabled_modules;
        if (Array.isArray(modules)) {
          enabledModules = modules.filter((m): m is string => typeof m === "string");
        } else if (typeof modules === "string") {
          const parsed = JSON.parse(modules);
          enabledModules = Array.isArray(parsed)
            ? parsed.filter((m): m is string => typeof m === "string")
            : [];
        } else if (modules && typeof modules === "object") {
          enabledModules = Object.keys(modules as Record<string, unknown>).filter(
            k => (modules as Record<string, unknown>)[k]
          );
        }
      } catch {
        enabledModules = defaultModulesByMode[businessMode] || defaultModulesByMode.service;
      }

      // Use defaults if empty
      if (enabledModules.length === 0) {
        enabledModules = defaultModulesByMode[businessMode] || defaultModulesByMode.service;
      }
    }

    const hipaaMode = businessMode === "medical" || tenant.hipaa_mode === true;

    return {
      businessMode,
      enabledModules,
      hipaaMode,
      capabilities,
    };
  }, [tenant, capabilities]);
}

export function useModuleEnabled(moduleId: string): boolean {
  const { enabledModules } = useTenantConfig();
  return enabledModules.includes(moduleId);
}

export function useMultipleModulesEnabled(moduleIds: string[]): boolean {
  const { enabledModules } = useTenantConfig();
  return moduleIds.some(id => enabledModules.includes(id));
}

export { defaultModulesByMode };
