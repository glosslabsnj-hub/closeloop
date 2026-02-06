/**
 * Shared CORS headers for all edge functions.
 *
 * Usage:
 *   import { corsHeaders, jsonHeaders, corsResponse, errorResponse } from "../_shared/cors.ts";
 *
 * For functions that need extra headers (e.g. x-closeloop-secret):
 *   const headers = { ...corsHeaders, "Access-Control-Allow-Headers": corsHeaders["Access-Control-Allow-Headers"] + ", x-closeloop-secret" };
 */

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export const jsonHeaders: Record<string, string> = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

/** Standard OPTIONS preflight response. */
export function corsResponse(): Response {
  return new Response(null, { headers: corsHeaders });
}

/** Standardised JSON error response. */
export function errorResponse(
  message: string,
  status = 400,
): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: jsonHeaders },
  );
}

/** Standardised JSON success response. */
export function jsonResponse(
  data: unknown,
  status = 200,
): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: jsonHeaders },
  );
}
