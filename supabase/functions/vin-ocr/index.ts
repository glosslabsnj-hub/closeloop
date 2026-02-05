/**
 * vin-ocr - Extract VIN from images using Lovable AI vision
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use Lovable AI vision to extract VIN
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Look at this image and find the VIN (Vehicle Identification Number). 
A VIN is a 17-character code that may appear on a dashboard plate, door jamb sticker, or vehicle registration.
VINs contain letters and numbers but never I, O, or Q.

If you find a VIN, respond with ONLY the 17-character VIN code, nothing else.
If you cannot find a valid VIN, respond with exactly: NOT_FOUND

Remember: VINs are exactly 17 characters, alphanumeric, no spaces.`
              },
              {
                type: "image_url",
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        max_tokens: 50,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    
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
      JSON.stringify({ error: error.message || "Failed to process image" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
