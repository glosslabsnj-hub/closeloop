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
        accent: "text-blue-400",
        accentForeground: "text-blue-300",
        accentMuted: "text-blue-400/70",
        border: "border-blue-500/30",
        background: "bg-blue-500/10",
        ring: "ring-blue-500/30",
      };
    case "food":
      return {
        accent: "text-red-400",
        accentForeground: "text-red-300",
        accentMuted: "text-red-400/70",
        border: "border-red-500/30",
        background: "bg-red-500/10",
        ring: "ring-red-500/30",
      };
    case "medical":
      return {
        accent: "text-emerald-400",
        accentForeground: "text-emerald-300",
        accentMuted: "text-emerald-400/70",
        border: "border-emerald-500/30",
        background: "bg-emerald-500/10",
        ring: "ring-emerald-500/30",
      };
    case "service":
      return {
        accent: "text-amber-400",
        accentForeground: "text-amber-300",
        accentMuted: "text-amber-400/70",
        border: "border-amber-500/30",
        background: "bg-amber-500/10",
        ring: "ring-amber-500/30",
      };
    case "sales":
      return {
        accent: "text-violet-400",
        accentForeground: "text-violet-300",
        accentMuted: "text-violet-400/70",
        border: "border-violet-500/30",
        background: "bg-violet-500/10",
        ring: "ring-violet-500/30",
      };
    case "general":
    default:
      return {
        accent: "text-indigo-400",
        accentForeground: "text-indigo-300",
        accentMuted: "text-indigo-400/70",
        border: "border-indigo-500/30",
        background: "bg-indigo-500/10",
        ring: "ring-indigo-500/30",
      };
  }
}

/**
 * Get a subtle background gradient for the mode
 */
export function getModeGradient(mode: BusinessMode): string {
  switch (mode) {
    case "dispatch":
      return "bg-gradient-to-br from-blue-950/30 via-background to-blue-950/10";
    case "food":
      return "bg-gradient-to-br from-red-950/30 via-background to-red-950/10";
    case "medical":
      return "bg-gradient-to-br from-emerald-950/30 via-background to-emerald-950/10";
    case "service":
      return "bg-gradient-to-br from-amber-950/30 via-background to-amber-950/10";
    case "sales":
      return "bg-gradient-to-br from-violet-950/30 via-background to-violet-950/10";
    case "general":
    default:
      return "bg-gradient-to-br from-indigo-950/30 via-background to-indigo-950/10";
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
    case "sales":
      return "Sales Business";
    case "general":
    default:
      return "Business";
  }
}
