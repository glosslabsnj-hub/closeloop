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

const INDUSTRY_CALL_BENCHMARKS: Record<string, { monthly: string; missed_pct: string }> = {
  towing: { monthly: "300-600", missed_pct: "25-40%" },
  plumber: { monthly: "150-400", missed_pct: "20-35%" },
  hvac: { monthly: "200-500", missed_pct: "20-30%" },
  electrician: { monthly: "100-300", missed_pct: "15-25%" },
  locksmith: { monthly: "200-500", missed_pct: "30-45%" },
  "auto repair": { monthly: "200-400", missed_pct: "15-25%" },
  dental: { monthly: "300-600", missed_pct: "10-20%" },
  "med spa": { monthly: "150-400", missed_pct: "15-25%" },
  salon: { monthly: "200-500", missed_pct: "15-25%" },
  "pest control": { monthly: "150-350", missed_pct: "20-30%" },
  restaurant: { monthly: "400-1000", missed_pct: "30-50%" },
  veterinary: { monthly: "250-500", missed_pct: "15-25%" },
};

async function searchBatch(
  apiKey: string,
  industry: string,
  location: string,
  count: number
): Promise<any[]> {
  const benchmarks = INDUSTRY_CALL_BENCHMARKS[industry] || { monthly: "100-300", missed_pct: "15-30%" };

  const prompt = `Find exactly ${count} real ${industry} businesses in ${location} that would benefit from an AI phone receptionist service.

CRITICAL: For EVERY business, you MUST provide ALL of the following. Do not leave fields as null unless truly unfindable after thorough research:

1. **Business name** — real, verifiable business
2. **Phone number** — in +1XXXXXXXXXX format. Search Google Maps, Yelp, their website, Yellow Pages. This is critical.
3. **Website URL** — search thoroughly. Check Google Business Profile, Yelp, Facebook.
4. **Physical address** — full street address from Google Maps or their website
5. **Google Maps URL** — direct link to their Google Maps listing
6. **Email** — business contact email from their website, Google listing, or social profiles
7. **Google rating** (decimal) and **review count** (integer)
8. **Employee estimate** — e.g. "2-5 employees", "owner-operated", "10-15 staff"
9. **Business hours** — e.g. "Mon-Fri 8am-6pm, Sat 9am-2pm"
10. **Owner name** — if findable from website "About" page, LinkedIn, or Google listing
11. **Years in business** — estimated from Google listing age, website archive, or reviews
12. **Social media** — Facebook, Instagram, and Yelp URLs if available
13. **Estimated monthly calls** — based on industry benchmarks (${industry} typically receives ${benchmarks.monthly} calls/month)
14. **Estimated missed call percentage** — based on team size and hours (${industry} businesses with small teams miss ${benchmarks.missed_pct} of calls)
15. **Pain points** — 2-3 SPECIFIC pain points based on actual Google review analysis
16. **Tech stack signals** — observable from their website/online presence: no_crm, no_online_booking, no_voicemail_transcription, uses_answering_service, manual_scheduling, no_mobile_app, outdated_website, no_text_messaging
17. **Best contact method** — "phone", "email", "walk_in", or "social_dm"
18. **Best contact time** — e.g. "Tuesday-Thursday 10am-2pm"
19. **Friction signals** from this list: no_online_booking, small_team, high_volume, after_hours_demand, growth_signals, poor_responsiveness, no_website, outdated_website

Focus on businesses showing:
1. Owner-operated or small team (1-15 employees)
2. Google reviews mentioning phone issues, wait times, missed calls, or going to voicemail
3. No online booking or scheduling visible on website
4. High call-volume niche
5. Growth signals (expanding, new services, increasing review velocity)

Return ONLY real businesses you can verify. Do not fabricate any data.`;

  const body = {
    model: "sonar-pro",
    messages: [
      {
        role: "system",
        content: `You are an elite B2B lead researcher specializing in finding small businesses that miss phone calls. You must return COMPLETE data for every business — leaving fields null is a failure. Search Google Maps, Yelp, Facebook, LinkedIn, and business websites thoroughly.

Return valid JSON array only, no markdown, no explanation. Each object MUST follow this exact schema:
{
  "name": "string",
  "phone": "+1XXXXXXXXXX",
  "website": "https://...",
  "address": "123 Main St, City, ST 12345",
  "google_maps_url": "https://maps.google.com/...",
  "email": "contact@business.com or null",
  "rating": 4.5,
  "review_count": 123,
  "employee_estimate": "2-5 employees",
  "hours": "Mon-Fri 8am-6pm, Sat 9am-2pm",
  "owner_name": "John Smith or null",
  "years_in_business": 8,
  "social_media": {"facebook": "url or null", "instagram": "url or null", "yelp": "url or null"},
  "estimated_monthly_calls": 250,
  "estimated_missed_call_pct": 25,
  "pain_points": ["Specific pain point from reviews", "Another specific observation"],
  "tech_stack_signals": ["no_online_booking", "manual_scheduling"],
  "best_contact_method": "phone",
  "best_contact_time": "Tuesday-Thursday 10am-2pm",
  "reason": "2-3 sentence specific reason referencing actual review complaints or observable issues",
  "friction_signals": ["no_online_booking", "small_team"],
  "confidence": "high",
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

    const allLeads: any[] = [];

    if (industry === "all") {
      const topIndustries = ALL_INDUSTRIES.slice(0, 10);
      const perIndustry = Math.max(3, Math.ceil(count / topIndustries.length));
      const results = await Promise.allSettled(
        topIndustries.map((ind) => searchBatch(PERPLEXITY_API_KEY, ind, location, perIndustry))
      );
      for (const r of results) {
        if (r.status === "fulfilled") allLeads.push(...r.value);
      }
    } else {
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

    // Deduplicate by name
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
