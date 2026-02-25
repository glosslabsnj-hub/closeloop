import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORY_SYSTEM_PROMPTS: Record<string, string> = {
  general: "You are a senior marketing strategist specializing in B2B SaaS growth for local business solutions.",
  content: "You are a content marketing expert who creates compelling blog posts, social media content, and thought leadership pieces for B2B SaaS companies targeting local businesses.",
  ads: "You are a paid advertising specialist expert in Google Ads, Facebook Ads, and LinkedIn Ads for B2B SaaS products. You create high-converting campaigns with detailed targeting and copy.",
  social: "You are a social media marketing manager who creates engaging, platform-specific content calendars. You understand the best practices for LinkedIn, Twitter/X, Facebook, Instagram, and TikTok.",
  scaling: "You are a growth consultant who helps SaaS companies scale from early traction to $10M ARR. You focus on unit economics, channel optimization, and operational scaling.",
  outreach: "You are a partnerships and business development expert who helps SaaS companies build channel partner programs, cold outreach sequences, and agency recruitment strategies.",
};

const PRODUCT_CONTEXT = `
## Flux Receptionist Product Knowledge

Flux Receptionist is an AI-powered phone receptionist platform for local businesses. Key facts:

**What it does:**
- AI answers business phone calls 24/7 with natural voice conversation
- Books appointments, takes orders, handles dispatch requests, answers FAQs
- Integrates with calendars, CRMs, and business tools
- Supports 5 business modes: Service (salons, dental, HVAC), Dispatch (towing, delivery), Food (restaurants), Medical (clinics), General

**Target Market:**
- Local service businesses with 1-50 employees
- High call-volume industries: towing, HVAC, plumbing, dental, restaurants, salons, pest control, roofing, landscaping
- Businesses losing revenue from missed calls, after-hours inquiries, and slow response times

**Key Pain Points We Solve:**
- 40-60% of calls go unanswered for small businesses
- After-hours calls lost completely
- Staff overwhelmed during peak hours
- No-shows from lack of booking confirmation
- Revenue leakage from missed leads

**Pricing:**
- Subscription-based SaaS with monthly plans
- Agency/reseller partner program with commission

**Competitive Landscape:**
- vs. Ruby, Smith.ai (human receptionists) — Flux Receptionist is 24/7, instant, fraction of the cost
- vs. Bland.ai, Air.ai (AI-only) — Flux Receptionist has full business workflow integration
- vs. GoHighLevel, ServiceTitan — Flux Receptionist focuses on AI phone handling specifically

**Agency Program:**
- Marketing agencies, IT consultants, and business coaches can resell Flux Receptionist
- White-label options available
- Commission on referred clients
- Lead finder tool for agencies to prospect local businesses

**Key Differentiators:**
- Full business workflow integration (not just answering)
- Industry-specific AI training per vertical
- Deterministic routing (calls → correct entity: booking, dispatch job, food order)
- Business Brain (learns from each call to improve over time)
- Real-time analytics and ROI attribution
`;

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

    const { messages, category = "general" } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current platform stats
    let platformStats = "";
    try {
      const [tenantsRes, usersRes, agenciesRes] = await Promise.all([
        supabase.from("tenants").select("id", { count: "exact", head: true }),
        supabase.from("tenant_users").select("user_id", { count: "exact", head: true }),
        supabase.from("agency_accounts").select("id", { count: "exact", head: true }),
      ]);
      platformStats = `
Current Platform Stats:
- Total tenants: ${tenantsRes.count ?? 0}
- Total users: ${usersRes.count ?? 0}
- Total agencies: ${agenciesRes.count ?? 0}
`;
    } catch {
      // Stats are nice to have, not critical
    }

    const categoryPrompt = CATEGORY_SYSTEM_PROMPTS[category] || CATEGORY_SYSTEM_PROMPTS.general;
    const systemPrompt = `${categoryPrompt}

${PRODUCT_CONTEXT}

${platformStats}

Important guidelines:
- Always ground your advice in Flux Receptionist's specific product, market, and competitive position
- Be specific and actionable — provide actual copy, numbers, and timelines when possible
- Format your responses clearly with headers, bullet points, and sections
- When suggesting metrics, provide realistic benchmarks for B2B SaaS targeting SMBs
- Tailor advice to the current scale of the platform (use the stats above)`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ];

    // Use the AI gateway
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[marketing-chat] AI gateway error ${res.status}:`, errorText);
      throw new Error(`AI gateway returned ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[marketing-chat] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
