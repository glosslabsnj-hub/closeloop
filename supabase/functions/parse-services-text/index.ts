import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return jsonResponse({ error: "Text is required" }, 400);
    }

    if (text.length > 50000) {
      return jsonResponse({ error: "Text is too long (max 50,000 characters)" }, 400);
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return jsonResponse({ error: "AI service not configured" }, 500);
    }

    const systemPrompt = `You are a service/menu parser for businesses. Extract individual services from the provided text.

For each service, extract:
- name: The service name (required)
- description: A brief description if available
- duration_minutes: Estimated duration in minutes. Use context clues. Default to 60 if unknown.
- price_amount: The numeric price (no $ sign). If "starting at $X" or "from $X", use X.
- price_type: One of "fixed", "starting_at", or "quote_only"

Price type rules:
- "starting_at" if text says: "starting at", "from", "starts at", "and up", "+", "beginning at", "as low as"
- "quote_only" if text says: "quote", "call for pricing", "varies", "TBD", "custom", "contact us", or no price at all and the service sounds variable
- "fixed" for all other explicit prices

Return a JSON object with a "services" array. Each element has: name, description, duration_minutes, price_amount (number or null), price_type.

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: "user", content: text },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("[parse-services-text] AI error:", response.status, errorText);

      if (response.status === 429) {
        return jsonResponse({ error: "Rate limited — please try again in a moment" }, 429);
      }

      return jsonResponse({ error: "AI parsing failed" }, 500);
    }

    const aiResult = await response.json();
    const content = aiResult.content?.[0]?.text;

    if (!content) {
      return jsonResponse({ error: "No response from AI" }, 500);
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        parsed = JSON.parse(match[1].trim());
      } else {
        console.error("[parse-services-text] Failed to parse AI response:", content);
        return jsonResponse({ error: "Could not parse AI response" }, 500);
      }
    }

    const services = (parsed.services || []).map((s: any) => ({
      name: String(s.name || "").trim(),
      description: String(s.description || "").trim(),
      duration_minutes: typeof s.duration_minutes === "number" ? s.duration_minutes : 60,
      price_amount: typeof s.price_amount === "number" ? s.price_amount : null,
      price_type: ["fixed", "starting_at", "quote_only"].includes(s.price_type) ? s.price_type : "fixed",
    })).filter((s: any) => s.name.length > 0);

    console.log(`[parse-services-text] Extracted ${services.length} services`);

    return jsonResponse({ services });
  } catch (error) {
    console.error("[parse-services-text] Error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
