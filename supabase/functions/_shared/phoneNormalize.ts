/**
 * Centralized phone normalization for all edge functions.
 *
 * IMPORTANT: This is the SINGLE source of truth for phone normalization.
 * Do NOT create inline normalizePhone() functions in edge functions.
 * Import this instead: import { normalizePhoneE164 } from "../_shared/phoneNormalize.ts";
 *
 * Rules:
 * - Output is always E.164 format: +<country><number> (e.g. +14155551234)
 * - 10-digit US numbers get +1 prefix
 * - 11-digit starting with 1 get + prefix
 * - Numbers already starting with + are kept as-is (after digit extraction)
 * - Extensions are stripped
 * - Invalid/empty input returns ""
 */

/**
 * Normalize a phone number to E.164 format.
 * Returns "" for invalid or empty input.
 */
export function normalizePhoneE164(phone: string | undefined | null): string {
  if (!phone || typeof phone !== "string") return "";

  // Strip extensions (e.g. "x123", "ext 456", "extension 789")
  const withoutExtension = phone.replace(/\s*(x|ext\.?|extension)\s*\d+$/i, "");

  // Extract only digits and leading +
  const hasPlus = withoutExtension.trim().startsWith("+");
  const digits = withoutExtension.replace(/\D/g, "");

  if (digits.length === 0) return "";

  // US 10-digit: add +1
  if (digits.length === 10) return `+1${digits}`;

  // US 11-digit starting with 1: add +
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  // Already has + prefix (international): preserve
  if (hasPlus) return `+${digits}`;

  // Fallback: add + if we have enough digits for a valid number
  if (digits.length >= 7) return `+${digits}`;

  return "";
}

/**
 * Check if a string looks like a valid E.164 phone number.
 */
export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}
