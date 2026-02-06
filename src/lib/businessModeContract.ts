/**
 * Business Mode Contract
 *
 * Defines which offering fields are valid/visible for each business mode.
 * This prevents inappropriate UI fields (e.g., "duration" for food orders).
 *
 * Usage:
 * - Use in onboarding Step 5 to conditionally render fields
 * - Use in validation to prevent invalid data structure
 */

import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

export interface ModeFieldContract {
  /** Field is visible and editable */
  showDuration: boolean;
  /** Field is visible and editable */
  showDepositRequired: boolean;
  /** Field is visible and editable */
  showPreparationInstructions: boolean;
  /** Field is visible and editable */
  showUpsellSuggestions: boolean;
  /** Allowed price types for this mode */
  allowedPriceTypes: Array<"fixed" | "starting_at" | "quote_only">;
  /** Field label overrides (mode-specific terminology) */
  labels: {
    offeringName: string;        // "Service Name" vs "Menu Item"
    offeringDescription: string; // "Service Description" vs "Item Description"
    priceLabel: string;          // "Price" vs "Base Price"
  };
}

/**
 * Mode contracts by business mode
 */
export const MODE_CONTRACTS: Record<BusinessMode, ModeFieldContract> = {
  service: {
    showDuration: true,
    showDepositRequired: true,
    showPreparationInstructions: true,
    showUpsellSuggestions: true,
    allowedPriceTypes: ["fixed", "starting_at", "quote_only"],
    labels: {
      offeringName: "Service Name",
      offeringDescription: "Service Description",
      priceLabel: "Price",
    },
  },

  food: {
    showDuration: false,              // ✗ Food orders don't have appointment duration
    showDepositRequired: false,       // ✗ Food typically doesn't require deposits
    showPreparationInstructions: true, // ✓ Kitchen prep notes
    showUpsellSuggestions: true,      // ✓ Combos, sides, drinks
    allowedPriceTypes: ["fixed"],     // Food is typically fixed price
    labels: {
      offeringName: "Menu Item",
      offeringDescription: "Item Description",
      priceLabel: "Price",
    },
  },

  dispatch: {
    showDuration: true,               // ✓ Estimated job duration
    showDepositRequired: true,        // ✓ Deposits common for towing/locksmith
    showPreparationInstructions: true, // ✓ Job preparation notes
    showUpsellSuggestions: true,      // ✓ Additional services
    allowedPriceTypes: ["fixed", "starting_at", "quote_only"],
    labels: {
      offeringName: "Service Name",
      offeringDescription: "Service Description",
      priceLabel: "Base Rate",
    },
  },

  medical: {
    showDuration: true,               // ✓ Appointment duration
    showDepositRequired: true,        // ✓ Some medical services require deposits
    showPreparationInstructions: true, // ✓ Pre-visit instructions (fasting, etc.)
    showUpsellSuggestions: false,     // ✗ Inappropriate to upsell medical services
    allowedPriceTypes: ["fixed", "starting_at", "quote_only"],
    labels: {
      offeringName: "Service Name",
      offeringDescription: "Service Description",
      priceLabel: "Price",
    },
  },

  general: {
    showDuration: true,
    showDepositRequired: true,
    showPreparationInstructions: true,
    showUpsellSuggestions: true,
    allowedPriceTypes: ["fixed", "starting_at", "quote_only"],
    labels: {
      offeringName: "Offering Name",
      offeringDescription: "Description",
      priceLabel: "Price",
    },
  },
};

/**
 * Get the field contract for a given business mode
 */
export function getModeContract(mode: BusinessMode): ModeFieldContract {
  return MODE_CONTRACTS[mode];
}

/**
 * Validate that an offering's data structure is valid for the business mode
 */
export function validateOfferingForMode(
  offering: {
    duration?: number;
    depositRequired?: boolean;
    priceType?: string;
  },
  mode: BusinessMode
): { valid: boolean; errors: string[] } {
  const contract = getModeContract(mode);
  const errors: string[] = [];

  // Check duration field
  if (!contract.showDuration && offering.duration && offering.duration > 0) {
    errors.push(`Duration field not allowed for ${mode} mode`);
  }

  // Check deposit field
  if (!contract.showDepositRequired && offering.depositRequired) {
    errors.push(`Deposit requirement not allowed for ${mode} mode`);
  }

  // Check price type
  const priceType = offering.priceType as "fixed" | "starting_at" | "quote_only" | undefined;
  if (priceType && !contract.allowedPriceTypes.includes(priceType)) {
    errors.push(`Price type "${offering.priceType}" not allowed for ${mode} mode (allowed: ${contract.allowedPriceTypes.join(", ")})`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize an offering to remove invalid fields for the given mode
 */
export function sanitizeOfferingForMode<T extends { duration?: number; depositRequired?: boolean; priceType?: string }>(
  offering: T,
  mode: BusinessMode
): T {
  const contract = getModeContract(mode);
  const sanitized = { ...offering };

  // Remove duration if not allowed
  if (!contract.showDuration) {
    delete sanitized.duration;
  }

  // Remove deposit if not allowed
  if (!contract.showDepositRequired) {
    delete sanitized.depositRequired;
  }

  // Reset price type if not allowed
  const sanitizedPriceType = sanitized.priceType as "fixed" | "starting_at" | "quote_only" | undefined;
  if (sanitizedPriceType && !contract.allowedPriceTypes.includes(sanitizedPriceType)) {
    sanitized.priceType = contract.allowedPriceTypes[0];
  }

  return sanitized;
}
