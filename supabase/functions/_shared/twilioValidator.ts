/**
 * Twilio request signature validation for webhook security.
 *
 * Validates that incoming requests genuinely originate from Twilio by checking
 * the X-Twilio-Signature header against an HMAC-SHA1 of the request URL + params.
 *
 * Reference: https://www.twilio.com/docs/usage/security#validating-requests
 */

import { timingSafeEqual } from "./crypto.ts";

/**
 * Compute the expected Twilio signature for a given URL and POST parameters.
 *
 * Algorithm (from Twilio docs):
 * 1. Take the full URL of the request (including scheme, host, path, and query string)
 * 2. If the request is a POST, sort all POST parameters alphabetically by key
 * 3. Append each parameter's key and value (no delimiter) to the URL string
 * 4. HMAC-SHA1 the resulting string with your AuthToken as the key
 * 5. Base64-encode the hash
 */
async function computeTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
): Promise<string> {
  // Build the data string: URL + sorted params concatenated
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  // HMAC-SHA1
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));

  // Base64-encode
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Parse a URL-encoded form body string into a Record<string, string>.
 * Handles the standard application/x-www-form-urlencoded format that Twilio sends.
 */
export function parseFormBody(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(body);
  for (const [key, value] of searchParams) {
    params[key] = value;
  }
  return params;
}

export interface TwilioValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate an incoming Twilio webhook request.
 *
 * @param request - The incoming Request object
 * @param body - The raw request body string (already consumed from the request)
 * @param params - The parsed form parameters from the body
 * @returns TwilioValidationResult indicating whether the request is authentic
 *
 * Skips validation if SKIP_TWILIO_VALIDATION env var is set to "true" (for dev/testing).
 */
export async function validateTwilioRequest(
  request: Request,
  body: string,
  params: Record<string, string>,
): Promise<TwilioValidationResult> {
  // Allow bypassing in development/testing
  if (Deno.env.get("SKIP_TWILIO_VALIDATION") === "true") {
    console.log("[twilio-validator] Validation skipped (SKIP_TWILIO_VALIDATION=true)");
    return { valid: true };
  }

  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!authToken) {
    console.error("[twilio-validator] TWILIO_AUTH_TOKEN not set, cannot validate");
    // Fail open with a warning — if the token isn't configured, we can't validate.
    // This prevents breaking existing deployments that haven't set the secret yet.
    return { valid: true, error: "TWILIO_AUTH_TOKEN not configured" };
  }

  const twilioSignature = request.headers.get("X-Twilio-Signature");
  if (!twilioSignature) {
    return { valid: false, error: "Missing X-Twilio-Signature header" };
  }

  // Reconstruct the full request URL as Twilio sees it.
  // Twilio uses the URL it was configured with (the webhook URL).
  // We use the request URL from the incoming request.
  const requestUrl = new URL(request.url);
  // Ensure the URL uses https (Supabase edge functions are always behind TLS,
  // but the request object may show http internally)
  requestUrl.protocol = "https:";
  const fullUrl = requestUrl.toString();

  const expectedSignature = await computeTwilioSignature(authToken, fullUrl, params);

  if (!timingSafeEqual(expectedSignature, twilioSignature)) {
    console.warn(`[twilio-validator] Signature mismatch. URL: ${fullUrl}`);
    return { valid: false, error: "Invalid Twilio signature" };
  }

  return { valid: true };
}

/**
 * Convenience: returns a 403 Response for rejected requests.
 */
export function forbiddenResponse(message = "Forbidden: invalid request signature"): Response {
  return new Response(message, { status: 403 });
}
