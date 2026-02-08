/**
 * ModeTheme - Mode-specific visual theming utilities
 * 
 * Provides consistent color coding and styling based on business mode.
 */

import type { BusinessMode } from "@/hooks/useTenantConfig";

export interface ModeThemeColors {
  accent: string;
  accentForeground: string;
  accentMuted: string;
  border: string;
  background: string;
  ring: string;
}

/**
 * Get mode-specific theme colors for consistent visual styling
 */
export function getModeTheme(mode: BusinessMode): ModeThemeColors {
  switch (mode) {
    case "dispatch":
      return {
        accent: "text-amber-600 dark:text-amber-400",
        accentForeground: "text-amber-700 dark:text-amber-300",
        accentMuted: "text-amber-600/70 dark:text-amber-400/70",
        border: "border-amber-200 dark:border-amber-900/50",
        background: "bg-amber-50/50 dark:bg-amber-950/20",
        ring: "ring-amber-500/30",
      };
    case "food":
      return {
        accent: "text-orange-600 dark:text-orange-400",
        accentForeground: "text-orange-700 dark:text-orange-300",
        accentMuted: "text-orange-600/70 dark:text-orange-400/70",
        border: "border-orange-200 dark:border-orange-900/50",
        background: "bg-orange-50/50 dark:bg-orange-950/20",
        ring: "ring-orange-500/30",
      };
    case "medical":
      return {
        accent: "text-rose-600 dark:text-rose-400",
        accentForeground: "text-rose-700 dark:text-rose-300",
        accentMuted: "text-rose-600/70 dark:text-rose-400/70",
        border: "border-rose-200 dark:border-rose-900/50",
        background: "bg-rose-50/50 dark:bg-rose-950/20",
        ring: "ring-rose-500/30",
      };
    case "service":
      return {
        accent: "text-blue-600 dark:text-blue-400",
        accentForeground: "text-blue-700 dark:text-blue-300",
        accentMuted: "text-blue-600/70 dark:text-blue-400/70",
        border: "border-blue-200 dark:border-blue-900/50",
        background: "bg-blue-50/50 dark:bg-blue-950/20",
        ring: "ring-blue-500/30",
      };
    case "general":
    default:
      return {
        accent: "text-slate-600 dark:text-slate-400",
        accentForeground: "text-slate-700 dark:text-slate-300",
        accentMuted: "text-slate-600/70 dark:text-slate-400/70",
        border: "border-slate-200 dark:border-slate-800",
        background: "bg-slate-50/50 dark:bg-slate-950/20",
        ring: "ring-slate-500/30",
      };
  }
}

/**
 * Get a subtle background gradient for the mode
 */
export function getModeGradient(mode: BusinessMode): string {
  switch (mode) {
    case "dispatch":
      return "bg-gradient-to-br from-amber-50/50 via-background to-amber-50/30 dark:from-amber-950/20 dark:via-background dark:to-amber-950/10";
    case "food":
      return "bg-gradient-to-br from-orange-50/50 via-background to-orange-50/30 dark:from-orange-950/20 dark:via-background dark:to-orange-950/10";
    case "medical":
      return "bg-gradient-to-br from-rose-50/50 via-background to-rose-50/30 dark:from-rose-950/20 dark:via-background dark:to-rose-950/10";
    case "service":
      return "bg-gradient-to-br from-blue-50/50 via-background to-blue-50/30 dark:from-blue-950/20 dark:via-background dark:to-blue-950/10";
    case "general":
    default:
      return "bg-gradient-to-br from-slate-50/50 via-background to-slate-50/30 dark:from-slate-950/20 dark:via-background dark:to-slate-950/10";
  }
}

/**
 * Get mode display name for UI
 */
export function getModeDisplayName(mode: BusinessMode): string {
  switch (mode) {
    case "dispatch":
      return "Dispatch";
    case "food":
      return "Restaurant";
    case "medical":
      return "Medical Practice";
    case "service":
      return "Service Business";
    case "general":
    default:
      return "Business";
  }
}
