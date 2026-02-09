/**
 * Cryptographic utilities for edge functions.
 *
 * timingSafeEqual() prevents timing attacks on secret comparison.
 * Always use this instead of === or !== for secret/token comparison.
 */

/**
 * Constant-time string comparison to prevent timing attacks.
 * Returns true only if both strings are identical.
 *
 * Uses bitwise XOR accumulation — never short-circuits on mismatch,
 * so the comparison time is independent of the input content.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
