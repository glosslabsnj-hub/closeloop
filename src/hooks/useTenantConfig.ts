import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

export type BusinessMode = "service" | "dispatch" | "food" | "medical" | "general";

export interface TenantConfig {
  businessMode: BusinessMode;
  enabledModules: string[];
  hipaaMode: boolean;
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

  return useMemo(() => {
    if (!tenant) {
      return {
        businessMode: "service" as BusinessMode,
        enabledModules: defaultModulesByMode.service,
        hipaaMode: false,
      };
    }

    const businessMode = tenant.business_mode as BusinessMode || "service";

    // Parse enabled_modules from tenant
    let enabledModules: string[] = [];
    try {
      const modules = tenant.enabled_modules;
      if (Array.isArray(modules)) {
        enabledModules = modules;
      } else if (typeof modules === "string") {
        enabledModules = JSON.parse(modules);
      } else if (modules && typeof modules === "object") {
        enabledModules = Object.keys(modules).filter(k => modules[k]);
      }
    } catch {
      enabledModules = defaultModulesByMode[businessMode] || defaultModulesByMode.service;
    }

    // Use defaults if empty
    if (enabledModules.length === 0) {
      enabledModules = defaultModulesByMode[businessMode] || defaultModulesByMode.service;
    }

    const hipaaMode = businessMode === "medical" || tenant.hipaa_mode === true;

    return {
      businessMode,
      enabledModules,
      hipaaMode,
    };
  }, [tenant]);
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
