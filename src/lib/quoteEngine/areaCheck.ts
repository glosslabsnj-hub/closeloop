/**
 * Area Check Module for Quote Engine
 *
 * Determines if a customer location is serviceable based on the tenant's
 * service area configuration. Returns both boolean result and human-readable reason.
 *
 * @see src/hooks/useServiceArea.ts for the core isLocationServiceable logic
 */

import {
  ServiceAreaConfig,
  isLocationServiceable as checkServiceable,
} from "@/hooks/useServiceArea";

export interface CustomerLocation {
  state?: string;
  zip?: string;
  county?: string;
  countyState?: string;
  distanceMiles?: number;
}

export interface AreaCheckResult {
  serviceable: boolean;
  reason: string;
  missingInfo?: {
    key: string;
    label: string;
    askPrompt: string;
  }[];
}

/**
 * Check if a customer location is within the serviceable area.
 *
 * @param serviceArea - The tenant's service area configuration
 * @param location - The customer's location (may be partial)
 * @returns AreaCheckResult with serviceable status and reason
 *
 * Fallback Hierarchy:
 * 1. If we have full address with distance → use distance check
 * 2. If we have ZIP code → use ZIP check
 * 3. If we have county → use county check
 * 4. If we have state → use state restriction check
 * 5. If nothing usable → return unknown with required info list
 */
export function checkArea(
  serviceArea: ServiceAreaConfig | null,
  location: CustomerLocation
): AreaCheckResult {
  // If no service area config, assume everywhere is serviceable
  if (!serviceArea) {
    return {
      serviceable: true,
      reason: "No service area restrictions configured",
    };
  }

  // Check if we have enough information to determine serviceability
  const hasUsableInfo = determineIfHasUsableInfo(serviceArea, location);

  if (!hasUsableInfo.hasEnough) {
    return {
      serviceable: true, // Assume serviceable until proven otherwise
      reason: "Insufficient location information for area check",
      missingInfo: hasUsableInfo.missingFields,
    };
  }

  // Run the core serviceability check
  const isServiceable = checkServiceable(serviceArea, location);

  if (isServiceable) {
    return {
      serviceable: true,
      reason: generateServiceableReason(serviceArea, location),
    };
  }

  // Not serviceable - generate helpful reason
  return {
    serviceable: false,
    reason: generateNotServiceableReason(serviceArea, location),
  };
}

/**
 * Check what information we have and what we need
 */
function determineIfHasUsableInfo(
  config: ServiceAreaConfig,
  location: CustomerLocation
): {
  hasEnough: boolean;
  missingFields: { key: string; label: string; askPrompt: string }[];
} {
  const missingFields: { key: string; label: string; askPrompt: string }[] = [];

  switch (config.mode) {
    case "radius":
      // For radius mode, we need distance (or address to calculate it)
      if (location.distanceMiles === undefined) {
        missingFields.push({
          key: "address",
          label: "Address",
          askPrompt: "What is your address or the service location?",
        });
      }
      break;

    case "zips":
      // For ZIP mode, we need ZIP code
      if (!location.zip && config.include.zips.length > 0) {
        missingFields.push({
          key: "zip",
          label: "ZIP Code",
          askPrompt: "What is your ZIP code?",
        });
      }
      break;

    case "counties":
      // For county mode, we need county
      if ((!location.county || !location.countyState) && config.include.counties.length > 0) {
        missingFields.push({
          key: "county",
          label: "County",
          askPrompt: "What county are you located in?",
        });
      }
      break;

    case "hybrid":
      // Hybrid mode - we might be able to check with partial info
      // Try to find ANY criteria we can check
      const canCheckRadius = config.radius_miles !== null && location.distanceMiles !== undefined;
      const canCheckZip = config.include.zips.length > 0 && location.zip;
      const canCheckCounty = config.include.counties.length > 0 && location.county && location.countyState;
      const canCheckState = config.include.states.length > 0 && location.state;

      // If we can check at least one criterion, we have enough
      if (canCheckRadius || canCheckZip || canCheckCounty || canCheckState) {
        return { hasEnough: true, missingFields: [] };
      }

      // Otherwise, collect what's missing for each configured criterion
      if (config.radius_miles !== null && !location.distanceMiles) {
        missingFields.push({
          key: "address",
          label: "Address",
          askPrompt: "What is your address or the service location?",
        });
      }
      if (config.include.zips.length > 0 && !location.zip) {
        missingFields.push({
          key: "zip",
          label: "ZIP Code",
          askPrompt: "What is your ZIP code?",
        });
      }
      break;
  }

  // For state line restrictions, we always need state
  if (config.restrictions.no_cross_state_lines && !location.state) {
    missingFields.push({
      key: "state",
      label: "State",
      askPrompt: "What state are you located in?",
    });
  }

  // If no missing fields, we have enough info
  return {
    hasEnough: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Generate a reason why the location IS serviceable
 */
function generateServiceableReason(
  config: ServiceAreaConfig,
  location: CustomerLocation
): string {
  switch (config.mode) {
    case "radius":
      if (location.distanceMiles !== undefined && config.radius_miles) {
        return `Location is ${location.distanceMiles.toFixed(1)} miles away (within ${config.radius_miles} mile service radius)`;
      }
      return "Location is within service radius";

    case "zips":
      if (location.zip) {
        return `ZIP code ${location.zip} is in our service area`;
      }
      return "Location is in service area";

    case "counties":
      if (location.county) {
        return `${location.county} County is in our service area`;
      }
      return "Location is in service area";

    case "hybrid":
      return "Location meets service area criteria";

    default:
      return "Location is serviceable";
  }
}

/**
 * Generate a reason why the location is NOT serviceable
 */
function generateNotServiceableReason(
  config: ServiceAreaConfig,
  location: CustomerLocation
): string {
  // Check specific exclusions first
  if (location.state && config.exclude.states.includes(location.state)) {
    return `We do not service ${location.state}`;
  }

  if (location.zip && config.exclude.zips.includes(location.zip)) {
    return `ZIP code ${location.zip} is outside our service area`;
  }

  if (location.county && location.countyState) {
    const isExcluded = config.exclude.counties.some(
      (c) =>
        c.name.toLowerCase() === location.county!.toLowerCase() &&
        c.state.toLowerCase() === location.countyState!.toLowerCase()
    );
    if (isExcluded) {
      return `${location.county} County is outside our service area`;
    }
  }

  // State line restriction
  if (config.restrictions.no_cross_state_lines && location.state && config.base_address.state) {
    if (location.state.toUpperCase() !== config.base_address.state.toUpperCase()) {
      return `We only service ${config.base_address.state} and do not cross state lines`;
    }
  }

  // Mode-specific reasons
  switch (config.mode) {
    case "radius":
      if (location.distanceMiles !== undefined && config.radius_miles) {
        return `Location is ${location.distanceMiles.toFixed(1)} miles away (outside ${config.radius_miles} mile service radius)`;
      }
      return "Location is outside our service radius";

    case "zips":
      if (location.zip) {
        return `ZIP code ${location.zip} is outside our service area`;
      }
      return "Location is outside our service area";

    case "counties":
      if (location.county) {
        return `${location.county} County is outside our service area`;
      }
      return "Location is outside our service area";

    case "hybrid":
      return "Location does not meet any of our service area criteria";

    default:
      return "Location is outside our service area";
  }
}

/**
 * Format the area check result for AI voice response
 */
export function formatAreaCheckForVoice(result: AreaCheckResult): string {
  if (result.serviceable) {
    return ""; // Don't say anything if serviceable
  }

  if (result.missingInfo && result.missingInfo.length > 0) {
    return result.missingInfo[0].askPrompt;
  }

  return `I'm sorry, but ${result.reason.toLowerCase()}. Would you like me to suggest an alternative?`;
}
