import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALL_INDUSTRIES = [
  "towing", "plumber", "hvac", "electrician", "locksmith",
  "auto repair", "dental", "med spa", "salon", "pest control",
  "landscaping", "roofing", "mobile detailing", "cleaning service",
  "restaurant", "veterinary", "real estate", "insurance agency",
  "law firm", "fitness studio",
];

/**
 * Search a single industry+location via Perplexity.
 * Returns parsed leads array.
 */
async function searchBatch(
  apiKey: string,
  industry: string,
  location: string,
  count: number
): Promise<any[]> {
  const prompt = `Find exactly ${count} real ${industry} businesses in ${location} that would benefit from an AI phone receptionist service.

For each business, provide:
- Business name (real, verifiable)
- Phone number in format +1XXXXXXXXXX (if findable)
- Website URL (if findable)
- Physical address (if findable)
- Google rating (number) and review count (if findable)
- Estimated employee count or team size description
- Business hours summary (if findable)
- A specific 2-3 sentence explanation of why they need an AI receptionist, based on observable evidence like review complaints, no online booking, small staff, etc.
- Friction signals from this list: no_online_booking, small_team, high_volume, after_hours_demand, growth_signals, poor_responsiveness

Focus on businesses showing:
1. Owner-operated or small team (1-15 employees)
2. Good reviews but complaints about phone responsiveness or wait times
3. No online booking or scheduling visible on website
4. High call-volume niche
5. Growth signals (expanding, new services, recent positive reviews)

Return ONLY real businesses you can verify. Do not fabricate.`;

  const body = {
    model: "sonar-pro",
    messages: [
      {
        role: "system",
        content: `You are a B2B lead researcher. Find real local businesses matching the criteria. Return valid JSON array only, no markdown. Each object:
{
  "name": "string",
  "phone": "+1XXXXXXXXXX or null",
  "website": "https://... or null",
  "address": "Full address or null",
  "rating": 4.5,
  "review_count": 123,
  "employee_estimate": "2-5 employees" or null,
  "hours": "Mon-Fri 8am-5pm" or null,
  "reason": "2-3 sentence specific reason",
  "friction_signals": ["no_online_booking","small_team"],
  "confidence": "high"|"medium"|"low",
  "industry": "${industry}"
}`,
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
  };

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error(`[agency-lead-search] Perplexity ${res.status}:`, txt);
    if (res.status === 429) throw new Error("RATE_LIMITED");
    return [];
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "[]";

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("[agency-lead-search] Parse error:", e);
  }
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { industry, location, count = 50 } = await req.json();

    if (!industry || !location) {
      return new Response(JSON.stringify({ error: "industry and location are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Server-side rate limit: 3 searches per day ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: searchCount } = await supabase
      .from("agency_lead_searches")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agency.id)
      .gte("searched_at", todayStart.toISOString());

    if ((searchCount ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Daily search limit reached (3/3). Try again tomorrow." }), {
        status: 429,
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

    let allLeads: any[] = [];

    if (industry === "all") {
      // Search top 10 high-value industries in parallel, ~5 leads each
      const topIndustries = ALL_INDUSTRIES.slice(0, 10);
      const perIndustry = Math.max(3, Math.ceil(count / topIndustries.length));
      const results = await Promise.allSettled(
        topIndustries.map((ind) => searchBatch(PERPLEXITY_API_KEY, ind, location, perIndustry))
      );
      for (const r of results) {
        if (r.status === "fulfilled") allLeads.push(...r.value);
      }
    } else {
      // Single industry — do 3 parallel batches to maximize results
      const perBatch = Math.ceil(count / 3);
      const batchPrompts = [
        searchBatch(PERPLEXITY_API_KEY, industry, location, perBatch),
        searchBatch(PERPLEXITY_API_KEY, `${industry} service`, location, perBatch),
        searchBatch(PERPLEXITY_API_KEY, `local ${industry}`, location, perBatch),
      ];
      const results = await Promise.allSettled(batchPrompts);
      for (const r of results) {
        if (r.status === "fulfilled") allLeads.push(...r.value);
      }
    }

    // Deduplicate by name (case-insensitive)
    const seen = new Set<string>();
    const uniqueLeads = allLeads.filter((lead) => {
      const key = lead.name?.toLowerCase()?.trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`[agency-lead-search] Found ${uniqueLeads.length} unique leads for ${industry} in ${location}`);

    // Log the search for rate limiting
    await supabase.from("agency_lead_searches").insert({
      agency_id: agency.id,
      industry,
      location,
      result_count: uniqueLeads.length,
    });

    return new Response(
      JSON.stringify({ leads: uniqueLeads, query: { industry, location } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[agency-lead-search] Error:", error);

    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
