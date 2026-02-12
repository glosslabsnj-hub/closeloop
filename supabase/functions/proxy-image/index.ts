import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get("url");

    if (!imageUrl) {
      return new Response("Missing url param", { status: 400, headers: corsHeaders });
    }

    // Only allow proxying from known CDN domains
    const allowed = ["cdn05.carsforsale.com", "cdn04.carsforsale.com", "cdn03.carsforsale.com", "cdn02.carsforsale.com", "cdn01.carsforsale.com"];
    const parsed = new URL(imageUrl);
    if (!allowed.some(d => parsed.hostname === d)) {
      return new Response("Domain not allowed", { status: 403, headers: corsHeaders });
    }

    const response = await fetch(imageUrl, {
      headers: {
        "Referer": "https://www.carsforsale.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return new Response("Image fetch failed", { status: response.status, headers: corsHeaders });
    }

    const body = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return new Response(body, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    return new Response("Error", { status: 500, headers: corsHeaders });
  }
});
