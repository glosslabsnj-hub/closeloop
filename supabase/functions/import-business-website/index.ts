import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireAuthedTenant, requireAuthedUser } from "../_shared/tenant.ts";

/**
 * import-business-website
 *
 * Accepts a URL, fetches the page, extracts text, sends it to Claude for
 * structured business-data extraction, and returns a preview payload for
 * the user to confirm before anything is written to the database.
 *
 * POST { url: string, tenant_id: string }
 * Auth: JWT via requireAuthedTenant
 */

interface ExtractedService {
  name: string;
  description: string;
  price_amount: number | null;
  duration_minutes: number | null;
}

interface ExtractedFAQ {
  question: string;
  answer: string;
}

interface DayHours {
  open: string;
  close: string;
  is_open: boolean;
}

interface ExtractedHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

interface ExtractionResult {
  business_name: string;
  phone: string | null;
  address: string | null;
  hours: ExtractedHours | null;
  services: ExtractedService[];
  faqs: ExtractedFAQ[];
  description: string;
  suggested_industry: string;
  suggested_business_mode: string;
}

/** Basic URL validation — must start with http(s):// and have a domain. */
function isValidUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Strip HTML tags, collapse whitespace, decode common entities. */
function htmlToPlainText(html: string): string {
  // Remove script and style blocks entirely
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, " ");
  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, " ");
  // Replace block-level tags with newlines for readability
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, " ");
  // Decode common HTML entities
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&#\d+;/g, " ");
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

const EXTRACTION_PROMPT = `You are a business information extraction assistant. Analyze the following website text and extract structured business information.

Return a single JSON object with these fields:
{
  "business_name": "string — the business name",
  "phone": "string or null — primary phone number if found",
  "address": "string or null — full street address if found",
  "hours": {
    "monday":    { "open": "09:00", "close": "17:00", "is_open": true },
    "tuesday":   { "open": "09:00", "close": "17:00", "is_open": true },
    "wednesday": { "open": "09:00", "close": "17:00", "is_open": true },
    "thursday":  { "open": "09:00", "close": "17:00", "is_open": true },
    "friday":    { "open": "09:00", "close": "17:00", "is_open": true },
    "saturday":  { "open": "10:00", "close": "14:00", "is_open": true },
    "sunday":    { "open": "00:00", "close": "00:00", "is_open": false }
  },
  "services": [
    {
      "name": "string — service name",
      "description": "string — brief description",
      "price_amount": null,
      "duration_minutes": null
    }
  ],
  "faqs": [
    { "question": "string", "answer": "string" }
  ],
  "description": "string — a 1-3 sentence summary of what this business does",
  "suggested_industry": "string — closest slug from: plumbing, hvac, electrical, roofing, painting, flooring, cleaning, landscaping, pest_control, pool_service, auto_detailing, tire_shop, auto_repair, towing, salon, barbershop, spa, massage, medspa, dental, chiropractor, optometry, physical_therapy, restaurant, pizza, bakery, coffee_shop, catering, personal_training, photography, accounting, law_firm, real_estate, veterinary, pet_grooming, car_wash, locksmith, moving, gym, yoga_studio, martial_arts, tattoo, other",
  "suggested_business_mode": "string — one of: service, dispatch, food, medical, general"
}

Rules:
- Use 24-hour time format for hours (e.g. "09:00", "17:00").
- If hours are not found on the page, set "hours" to null.
- If a specific day's hours are unknown, set is_open to true with reasonable defaults (09:00-17:00).
- For services, extract every distinct service or offering you can identify. Set price_amount to a number (dollars, not cents) if listed, otherwise null. Set duration_minutes if listed, otherwise null.
- For FAQs, generate useful Q&A pairs from the website content — things a caller might ask. Include at least 3 if there is enough information.
- For phone and address, extract if clearly present; otherwise null.
- For "suggested_industry", pick the closest slug from the list. Use "other" if nothing fits.
- For "suggested_business_mode": "service" for appointment/booking businesses, "dispatch" for delivery/towing/logistics, "food" for restaurants/cafes/bakeries, "medical" for healthcare, "general" otherwise.
- Return ONLY the JSON object, no markdown fences, no extra text.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    // Parse and validate body
    const body = await req.json();
    const { url, tenant_id } = body as { url?: string; tenant_id?: string };

    if (!url || typeof url !== "string") {
      return errorResponse("Missing required field: url");
    }
    if (!isValidUrl(url)) {
      return errorResponse("Invalid URL — must start with http:// or https://");
    }

    // Authenticate caller — tenant_id optional (onboarding flow has no tenant yet)
    if (tenant_id) {
      await requireAuthedTenant(req, tenant_id);
    } else {
      await requireAuthedUser(req);
    }

    // ---- Step 1: Fetch the website ----
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    let htmlContent: string;
    try {
      const siteResponse = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; CloseLoopBot/1.0; +https://closeloop.ai)",
          Accept: "text/html,application/xhtml+xml,*/*",
        },
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeout);

      if (!siteResponse.ok) {
        return errorResponse(
          `Failed to fetch URL (HTTP ${siteResponse.status}): ${siteResponse.statusText}`,
          422,
        );
      }

      htmlContent = await siteResponse.text();
    } catch (fetchErr: unknown) {
      clearTimeout(timeout);
      const msg =
        fetchErr instanceof DOMException && fetchErr.name === "AbortError"
          ? "Request timed out after 10 seconds"
          : fetchErr instanceof Error
            ? fetchErr.message
            : "Unknown fetch error";
      return errorResponse(`Could not fetch URL: ${msg}`, 422);
    }

    // ---- Step 2: Convert HTML to plain text and truncate ----
    let plainText = htmlToPlainText(htmlContent);
    if (plainText.length > 15_000) {
      plainText = plainText.substring(0, 15_000) + "\n[...truncated]";
    }

    if (plainText.length < 50) {
      return errorResponse(
        "The page returned very little readable text. It may be a single-page app that requires JavaScript rendering.",
        422,
      );
    }

    // ---- Step 3: Call Anthropic Claude for extraction ----
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return errorResponse("ANTHROPIC_API_KEY is not configured", 500);
    }

    const claudeResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: `${EXTRACTION_PROMPT}\n\n--- WEBSITE TEXT ---\n${plainText}`,
            },
          ],
        }),
      },
    );

    if (!claudeResponse.ok) {
      const errBody = await claudeResponse.text();
      console.error(
        "Anthropic API error:",
        claudeResponse.status,
        errBody,
      );
      return errorResponse(
        `AI extraction failed (HTTP ${claudeResponse.status})`,
        502,
      );
    }

    const claudeData = await claudeResponse.json();
    const assistantText: string =
      claudeData?.content?.[0]?.text ?? "";

    if (!assistantText) {
      return errorResponse("AI returned an empty response", 502);
    }

    // ---- Step 4: Parse the JSON from Claude's response ----
    let extracted: ExtractionResult;
    try {
      // Strip possible markdown fences just in case
      const jsonString = assistantText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      extracted = JSON.parse(jsonString);
    } catch {
      console.error("Failed to parse Claude response as JSON:", assistantText.substring(0, 500));
      return errorResponse(
        "AI returned data that could not be parsed. Please try a different URL.",
        422,
      );
    }

    // Ensure required fields have sane defaults
    const result: ExtractionResult = {
      business_name: extracted.business_name || "Unknown Business",
      phone: extracted.phone || null,
      address: extracted.address || null,
      hours: extracted.hours || null,
      services: Array.isArray(extracted.services) ? extracted.services : [],
      faqs: Array.isArray(extracted.faqs) ? extracted.faqs : [],
      description: extracted.description || "",
      suggested_industry: extracted.suggested_industry || "other",
      suggested_business_mode: extracted.suggested_business_mode || "service",
    };

    return jsonResponse({
      success: true,
      source_url: url,
      extracted: result,
    });
  } catch (err: unknown) {
    console.error("import-business-website error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";

    // Auth errors → 401
    if (
      message.includes("Unauthorized") ||
      message.includes("Missing Authorization")
    ) {
      return errorResponse(message, 401);
    }
    if (message.includes("Forbidden")) {
      return errorResponse(message, 403);
    }

    return errorResponse(message, 500);
  }
});
