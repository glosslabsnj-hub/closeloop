/**
 * Sanitize customer names to prevent placeholder pollution.
 * 
 * Detects common AI placeholders and normalizes them to a canonical "Unknown" value.
 */

const PLACEHOLDER_PATTERNS = [
  /^unknown$/i,
  /^not provided$/i,
  /^not specified$/i,
  /^n\/a$/i,
  /^na$/i,
  /^none$/i,
  /^caller$/i,
  /^customer$/i,
  /^anonymous$/i,
  /^guest$/i,
  /^user$/i,
  /^phone customer$/i,
  /^no name$/i,
  /^-$/,
  /^\?+$/,
  /^\.+$/,
];

/**
 * Returns true if the name appears to be a placeholder/garbage value
 */
export function isPlaceholderName(name: string | null | undefined): boolean {
  if (!name) return true;
  
  const trimmed = name.trim();
  if (trimmed.length === 0) return true;
  if (trimmed.length < 2) return true; // Single character names are suspicious
  
  return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Sanitize a customer name:
 * - If it's a placeholder, return "Unknown"
 * - Otherwise return the trimmed name
 */
export function sanitizeCustomerName(name: string | null | undefined): string {
  if (isPlaceholderName(name)) {
    return "Unknown";
  }
  return name!.trim();
}

/**
 * Check if we should update an existing customer's name with a new value.
 * Only update if:
 * - New name is NOT a placeholder
 * - Existing name IS a placeholder (or empty)
 */
export function shouldUpdateCustomerName(
  existingName: string | null | undefined,
  newName: string | null | undefined
): boolean {
  // Don't update with a placeholder
  if (isPlaceholderName(newName)) return false;
  
  // Only update if existing name is a placeholder
  return isPlaceholderName(existingName);
}
