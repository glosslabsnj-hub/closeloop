import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user has agency account
    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: agency } = await supabase
      .from("agency_accounts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!agency) {
      return new Response(JSON.stringify({ error: "No agency account found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { industry, location, count = 5 } = await req.json();

    if (!industry || !location) {
      return new Response(JSON.stringify({ error: "industry and location are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) {
      return new Response(JSON.stringify({ error: "PERPLEXITY_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Find ${count} real ${industry} businesses in ${location} that would benefit from an AI phone receptionist service. 

For each business, I need:
- Business name
- Phone number (if available)
- Website (if available)  
- Google rating and review count (if available)
- Why they specifically need an AI receptionist (focus on friction signals like: small team likely missing calls, no online booking system, high call volume industry, after-hours demand, rapid growth signs from reviews)

Focus on businesses that show signs of:
1. Being owner-operated or having a small team (1-15 employees)
2. Getting good reviews but complaints about responsiveness or availability
3. No online booking or scheduling system visible on their website
4. Operating in a high-call-volume niche
5. Recent growth signals (new reviews, expanding services)

Return ONLY real businesses you can verify exist. Do not fabricate any business names or details.`;

    const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: `You are a B2B lead researcher for an AI receptionist company. You find real local businesses that are likely missing calls and losing revenue because they lack proper phone handling. Return results as a JSON array with this exact structure:
[{
  "name": "Business Name",
  "phone": "+1XXXXXXXXXX or null",
  "website": "https://... or null",
  "rating": 4.5,
  "review_count": 123,
  "reason": "Specific 1-2 sentence reason why they need an AI receptionist based on observable evidence",
  "friction_signals": ["no_online_booking", "small_team", "high_volume", "after_hours_demand", "growth_signals"],
  "confidence": "high" | "medium" | "low"
}]
Only include businesses you are confident actually exist. Return valid JSON only, no markdown fences.`,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error("[agency-lead-search] Perplexity error:", perplexityResponse.status, errorText);

      if (perplexityResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Search failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await perplexityResponse.json();
    const content = result.choices?.[0]?.message?.content || "[]";
    const citations = result.citations || [];

    // Parse the JSON from the response
    let leads = [];
    try {
      // Try to extract JSON from the response (handle markdown fences if present)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        leads = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("[agency-lead-search] Failed to parse leads:", parseError);
      console.error("[agency-lead-search] Raw content:", content);
    }

    return new Response(
      JSON.stringify({
        leads,
        citations,
        query: { industry, location },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[agency-lead-search] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
