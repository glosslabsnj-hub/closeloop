/**
 * vin-ocr - Extract VIN from images using Anthropic Claude vision
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    // Parse data URL to extract media_type and base64 data for Anthropic format
    const vinPrompt = `Look at this image and find the VIN (Vehicle Identification Number).
A VIN is a 17-character code that may appear on a dashboard plate, door jamb sticker, or vehicle registration.
VINs contain letters and numbers but never I, O, or Q.

If you find a VIN, respond with ONLY the 17-character VIN code, nothing else.
If you cannot find a valid VIN, respond with exactly: NOT_FOUND

Remember: VINs are exactly 17 characters, alphanumeric, no spaces.`;

    // Build image content block - handle data URLs and regular URLs
    let imageBlock: any;
    if (image.startsWith("data:")) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        imageBlock = {
          type: "image",
          source: { type: "base64", media_type: match[1], data: match[2] },
        };
      } else {
        throw new Error("Invalid data URL format");
      }
    } else {
      imageBlock = {
        type: "image",
        source: { type: "url", url: image },
      };
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 50,
        messages: [
          {
            role: "user",
            content: [
              imageBlock,
              { type: "text", text: vinPrompt },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Anthropic API error:", errorText);
      throw new Error(`AI API failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text?.trim() || "";
    
    // Validate the response is a proper VIN
    const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
    const cleanedContent = content.toUpperCase().replace(/\s/g, "");
    
    if (vinPattern.test(cleanedContent)) {
      return new Response(
        JSON.stringify({ vin: cleanedContent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Try to extract VIN from the response if it contains extra text
    const vinMatch = cleanedContent.match(/[A-HJ-NPR-Z0-9]{17}/);
    if (vinMatch) {
      return new Response(
        JSON.stringify({ vin: vinMatch[0] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ vin: null, message: "No valid VIN detected" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("VIN OCR error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to process image" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
