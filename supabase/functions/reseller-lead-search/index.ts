import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function searchResellerBatch(
  apiKey: string,
  companyType: string,
  location: string,
  count: number
): Promise<any[]> {
  const prompt = `Find exactly ${count} real ${companyType} companies in ${location} that would be ideal channel partners for reselling an AI phone receptionist SaaS product to their SMB clients.

CRITICAL: For EVERY company, you MUST provide ALL of the following fields. Do not leave fields as null unless truly unfindable:

1. **Company name** — real, verifiable
2. **Phone number** — +1XXXXXXXXXX format
3. **Website URL** — search thoroughly
4. **Physical address** — full street address
5. **Email** — business contact email
6. **Google Maps URL** — direct link
7. **Google rating** and **review count**
8. **Employee estimate** — e.g. "5-10 employees"
9. **Owner/founder name** — from website, LinkedIn
10. **Years in business** — from website or Google listing
11. **Social media** — Facebook, Instagram, LinkedIn URLs
12. **Services offered** — list of primary services
13. **Client base size** — e.g. "50+ clients", "10-20 clients"
14. **Partnership signals** from: existing_smb_clients, digital_services, recurring_revenue, local_focus, tech_savvy, growth_stage, complementary_services, active_referral_program
15. **A 2-3 sentence reason** explaining why they'd be a good reseller/channel partner
16. **Best contact method** — "phone", "email", "linkedin", "social_dm"
17. **Best contact time** — e.g. "Tuesday-Thursday 10am-2pm"

Focus on companies that:
1. Already serve small/local businesses (restaurants, salons, dentists, towing, HVAC, etc.)
2. Offer digital services (websites, marketing, CRM, phones, IT)
3. Have a recurring revenue model (monthly retainers, subscriptions)
4. Are growth-oriented and looking for new revenue streams
5. Have an established client base they could upsell to

Return ONLY real, verifiable companies. Do not fabricate.`;

  const body = {
    model: "sonar-pro",
    messages: [
      {
        role: "system",
        content: `You are an elite B2B partner researcher. Find real companies that could be channel partners for an AI phone receptionist SaaS. You MUST return COMPLETE data — leaving fields null is a failure.

Return valid JSON array only, no markdown. Each object MUST follow this schema:
{
  "name": "string",
  "phone": "+1XXXXXXXXXX",
  "website": "https://...",
  "address": "Full address",
  "email": "contact@company.com or null",
  "google_maps_url": "https://maps.google.com/... or null",
  "rating": 4.5,
  "review_count": 123,
  "employee_estimate": "5-10 employees",
  "owner_name": "Jane Doe or null",
  "years_in_business": 5,
  "social_media": {"facebook": "url or null", "instagram": "url or null", "linkedin": "url or null"},
  "reason": "2-3 sentence partnership reason",
  "company_type": "${companyType}",
  "services_offered": ["web design", "SEO", "social media"],
  "client_base_size": "50+ SMB clients",
  "partnership_signals": ["existing_smb_clients", "digital_services", "recurring_revenue"],
  "best_contact_method": "email",
  "best_contact_time": "Tuesday-Thursday 10am-2pm",
  "confidence": "high"
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
    console.error(`[reseller-lead-search] Perplexity ${res.status}:`, txt);
    if (res.status === 429) throw new Error("RATE_LIMITED");
    return [];
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "[]";

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("[reseller-lead-search] Parse error:", e);
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

    // Verify super_admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden — super_admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company_type, location, count = 30 } = await req.json();

    if (!company_type || !location) {
      return new Response(JSON.stringify({ error: "company_type and location are required" }), {
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

    const perBatch = Math.ceil(count / 2);
    const results = await Promise.allSettled([
      searchResellerBatch(PERPLEXITY_API_KEY, company_type, location, perBatch),
      searchResellerBatch(PERPLEXITY_API_KEY, `${company_type} agency`, location, perBatch),
    ]);

    let allLeads: any[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") allLeads.push(...r.value);
    }

    // Deduplicate
    const seen = new Set<string>();
    const uniqueLeads = allLeads.filter((lead) => {
      const key = lead.name?.toLowerCase()?.trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`[reseller-lead-search] Found ${uniqueLeads.length} unique leads for ${company_type} in ${location}`);

    return new Response(
      JSON.stringify({ leads: uniqueLeads, query: { company_type, location } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[reseller-lead-search] Error:", error);

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
