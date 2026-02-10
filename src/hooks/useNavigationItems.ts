import { useMemo } from "react";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities, type Capabilities } from "@/hooks/useCapabilities";
import { useTerminology } from "@/hooks/useTerminology";
import { useKnowledgeConflicts } from "@/hooks/useKnowledgeConflicts";
import {
  NAV_CONFIG,
  BOTTOM_NAV_CONFIG,
  MOBILE_NAV_CONFIG,
  type NavItemConfig,
} from "@/config/navigationConfig";
import { Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface NavigationResult {
  /** Primary sidebar items (5-7 per mode) */
  primaryItems: NavItem[];
  /** Bottom-pinned items (Settings) */
  bottomPinnedItems: NavItem[];
  /** Mobile bottom nav items (exactly 5) */
  mobileBottomItems: NavItem[];
}

function resolveLabel(
  config: NavItemConfig,
  terms: { bookingsPageTitle: string; navPrimaryLabel?: string },
): string {
  if (config.useDynamicLabel) {
    // Use terminology system for mode-specific labels
    if (config.id === "bookings") return terms.bookingsPageTitle || config.label;
    if (config.id === "dispatch") return "Jobs";
    if (config.id === "orders") return "Orders";
  }
  return config.label;
}

function configToNavItem(
  config: NavItemConfig,
  terms: { bookingsPageTitle: string },
  badge?: number,
): NavItem {
  return {
    href: config.route,
    label: resolveLabel(config, terms),
    icon: config.icon,
    badge,
  };
}

/**
 * Centralized navigation hook.
 * Returns mode-aware nav items for sidebar, bottom-pinned, and mobile bottom nav.
 */
export function useNavigationItems(): NavigationResult {
  const { businessMode } = useTenantConfig();
  const caps = useCapabilities();
  const terms = useTerminology();
  const { unresolvedCount: conflictsCount } = useKnowledgeConflicts();

  return useMemo(() => {
    const mode = businessMode || "service";
    const modeConfig = NAV_CONFIG[mode] || NAV_CONFIG.service;

    // Filter items by capability requirements
    const primaryItems: NavItem[] = modeConfig
      .filter((item) => {
        if (!item.requiresCap) return true;
        return caps[item.requiresCap] as boolean;
      })
      .map((item) => {
        const badge = item.id === "setup" ? (conflictsCount || undefined) : undefined;
        return configToNavItem(item, terms, badge);
      });

    // Bottom-pinned (Settings)
    const bottomPinnedItems: NavItem[] = BOTTOM_NAV_CONFIG.map((item) =>
      configToNavItem(item, terms)
    );

    // Mobile: resolve IDs to nav items, falling back to primary list
    const mobileIds = MOBILE_NAV_CONFIG[mode] || MOBILE_NAV_CONFIG.service;
    const allItems = [...modeConfig, ...BOTTOM_NAV_CONFIG];
    const mobileBottomItems: NavItem[] = mobileIds
      .map((id) => {
        const config = allItems.find((item) => item.id === id);
        if (!config) return null;
        // Skip if capability required but not present
        if (config.requiresCap && !(caps[config.requiresCap] as boolean)) return null;
        const badge = config.id === "setup" ? (conflictsCount || undefined) : undefined;
        return configToNavItem(config, terms, badge);
      })
      .filter((item): item is NavItem => item !== null)
      .slice(0, 5);

    return { primaryItems, bottomPinnedItems, mobileBottomItems };
  }, [businessMode, caps, terms, conflictsCount]);
}
