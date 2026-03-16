/**
 * Recursively strips null/undefined values from objects before returning to ElevenLabs.
 *
 * Why: ElevenLabs tool responses that contain null values get stringified and the
 * literal word "null" is spoken aloud by the AI. This affects every tool endpoint.
 *
 * Usage: Wrap any JSON.stringify(response) with JSON.stringify(stripNulls(response))
 * in all elevenlabs-* edge functions before returning the Response object.
 */
export function stripNulls(obj: unknown): unknown {
  if (obj === null || obj === undefined) return "";
  if (typeof obj === "string") return obj;
  if (typeof obj === "number" || typeof obj === "boolean") return obj;
  if (Array.isArray(obj)) return obj.map(stripNulls);
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value === null || value === undefined) {
        // Replace null with empty string for string-like fields, omit objects
        result[key] = "";
      } else if (typeof value === "object" && !Array.isArray(value)) {
        result[key] = stripNulls(value);
      } else if (Array.isArray(value)) {
        result[key] = value.map(stripNulls);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  return obj;
}
