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
    console.error(`[admin-lead-search] Perplexity ${res.status}:`, txt);
    if (res.status === 429) throw new Error("RATE_LIMITED");
    return [];
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "[]";

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("[admin-lead-search] Parse error:", e);
  }
  return [];
}

/**
 * Search for potential agencies/resellers who could sell CloseLoop
 */
async function searchResellers(
  apiKey: string,
  location: string,
  count: number,
  searchType: string
): Promise<any[]> {
  const prompts: Record<string, string> = {
    marketing_agencies: `Find ${count} marketing agencies, digital marketing firms, and advertising agencies in ${location} that serve small local businesses. These would be ideal partners to resell an AI phone receptionist SaaS product. Look for agencies that:
- Specialize in local business marketing (SEO, Google Ads, social media)
- Work with service-based businesses (plumbers, HVAC, dental, etc.)
- Offer website/tech solutions to small businesses
- Have 2-20 employees
- Are actively looking for new service offerings to add to their portfolio`,
    
    it_consultants: `Find ${count} IT consultants, tech solution providers, and business technology advisors in ${location} that serve small businesses. They could resell AI phone receptionist technology. Look for:
- Managed IT service providers serving small businesses
- VoIP and phone system providers
- Business automation consultants
- CRM implementation specialists`,
    
    business_coaches: `Find ${count} business coaches, consultants, and fractional CMOs in ${location} who work with small local businesses. They could recommend or resell AI phone receptionist solutions. Look for:
- Business growth coaches
- Small business consultants
- Sales coaches and trainers
- Fractional CMO / marketing consultants
- Chamber of commerce connected individuals`,

    freelancers: `Find ${count} freelance web developers, social media managers, and virtual assistants in ${location} who serve multiple small business clients. They could earn referral commissions selling AI phone receptionist subscriptions. Look for:
- Freelance web developers building sites for local businesses
- Social media managers handling multiple small business accounts
- Virtual assistants serving business owners
- Freelance marketing professionals`,
  };

  const prompt = prompts[searchType] || prompts.marketing_agencies;

  const body = {
    model: "sonar-pro",
    messages: [
      {
        role: "system",
        content: `You are a partner recruitment researcher for CloseLoop, an AI phone receptionist platform. Find real potential reseller partners. Return valid JSON array only, no markdown. Each object:
{
  "name": "string (person or company name)",
  "phone": "+1XXXXXXXXXX or null",
  "website": "https://... or null",
  "address": "Location or null",
  "email": "email or null",
  "linkedin": "LinkedIn URL or null",
  "type": "${searchType}",
  "client_count_estimate": "10-50 clients" or null,
  "specialties": ["local SEO", "Google Ads"],
  "reason": "2-3 sentence why they'd be a good reseller partner",
  "fit_signals": ["serves_smb", "tech_savvy", "needs_new_revenue"],
  "confidence": "high"|"medium"|"low"
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
    console.error(`[admin-lead-search] Perplexity reseller ${res.status}:`, txt);
    if (res.status === 429) throw new Error("RATE_LIMITED");
    return [];
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "[]";

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("[admin-lead-search] Reseller parse error:", e);
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

    // Verify super_admin
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

    // Check super_admin role
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!tenantUser) {
      return new Response(JSON.stringify({ error: "Super admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { industry, location, count = 50, mode = "business", searchType = "marketing_agencies" } = await req.json();

    if (!location) {
      return new Response(JSON.stringify({ error: "location is required" }), {
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

    // NO RATE LIMIT FOR ADMIN

    let allLeads: any[] = [];

    if (mode === "reseller") {
      // Search for potential resellers/agencies
      const results = await searchResellers(PERPLEXITY_API_KEY, location, count, searchType);
      allLeads = results;
    } else {
      // Business lead search (same as agency but no rate limit)
      if (!industry) {
        return new Response(JSON.stringify({ error: "industry is required for business search" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
        const results = await Promise.allSettled([
          searchBatch(PERPLEXITY_API_KEY, industry, location, perBatch),
          searchBatch(PERPLEXITY_API_KEY, `${industry} service`, location, perBatch),
          searchBatch(PERPLEXITY_API_KEY, `local ${industry}`, location, perBatch),
        ]);
        for (const r of results) {
          if (r.status === "fulfilled") allLeads.push(...r.value);
        }
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

    console.log(`[admin-lead-search] Found ${uniqueLeads.length} unique leads (mode=${mode})`);

    return new Response(
      JSON.stringify({ leads: uniqueLeads, query: { industry, location, mode, searchType } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[admin-lead-search] Error:", error);

    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return new Response(JSON.stringify({ error: "Perplexity rate limited. Please try again in a moment." }), {
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
